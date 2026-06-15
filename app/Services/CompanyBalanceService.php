<?php

namespace App\Services;

use App\Models\CashSession;
use App\Models\CompanyBalanceMovement;
use App\Models\User;
use Carbon\Carbon;
use Illuminate\Support\Facades\DB;

class CompanyBalanceService
{
    /**
     * Positivo: el repartidor le debe a la empresa. Negativo: la empresa le debe al repartidor.
     */
    public function currentBalance(User $user): float
    {
        return round((float) $user->company_balance, 2);
    }

    /**
     * @return array{label: string, tone: 'amber'|'violet'|'neutral', value: string}
     */
    public function displayForBalance(float $balance, string $companyName): array
    {
        if ($balance > 0.01) {
            return [
                'label' => "Le debes a {$companyName}",
                'tone' => 'amber',
                'value' => '$'.number_format($balance, 2),
            ];
        }

        if ($balance < -0.01) {
            return [
                'label' => "{$companyName} te debe",
                'tone' => 'violet',
                'value' => '$'.number_format(abs($balance), 2),
            ];
        }

        return [
            'label' => 'Cuenta cuadrada',
            'tone' => 'neutral',
            'value' => 'Cuadrado',
        ];
    }

    public function addBalanceEntry(User $user, string $direction, float $amount, ?string $notes = null): CompanyBalanceMovement
    {
        $movement = $this->createBalanceEntry($user, $direction, $amount, $notes);
        $this->recalculateUserBalance($user);

        return $movement->refresh();
    }

    public function updateBalanceEntry(
        User $user,
        CompanyBalanceMovement $movement,
        string $direction,
        float $amount,
        ?string $notes = null,
    ): CompanyBalanceMovement {
        if ($movement->user_id !== $user->id) {
            throw new \InvalidArgumentException('No puedes editar este movimiento.');
        }

        if ($movement->type !== CompanyBalanceMovement::TYPE_BALANCE_ENTRY) {
            throw new \InvalidArgumentException('Solo puedes editar saldos registrados.');
        }

        $newDelta = $this->directionToDelta($direction, $amount);
        $autoNote = $direction === 'company_owes'
            ? 'Saldo registrado: la empresa me debe'
            : 'Saldo registrado: yo debo a la empresa';
        $newNotes = $notes ?: $autoNote;

        DB::transaction(function () use ($user, $movement, $newDelta, $newNotes) {
            $movement->update([
                'amount' => $newDelta,
                'notes' => $newNotes,
            ]);

            $this->recalculateUserBalance($user);
        });

        return $movement->refresh();
    }

    public function updateSessionSettlement(
        User $user,
        CompanyBalanceMovement $movement,
        string $direction,
        float $amount,
        ?string $notes = null,
    ): CompanyBalanceMovement {
        if ($movement->user_id !== $user->id) {
            throw new \InvalidArgumentException('No puedes editar este movimiento.');
        }

        if ($movement->type !== CompanyBalanceMovement::TYPE_SESSION_SETTLEMENT) {
            throw new \InvalidArgumentException('Solo puedes editar cuadres de jornada.');
        }

        $newDelta = $this->directionToDelta($direction, $amount);

        DB::transaction(function () use ($user, $movement, $newDelta, $notes) {
            $movement->update([
                'amount' => $newDelta,
                'notes' => $notes,
            ]);

            $this->recalculateUserBalance($user);
        });

        return $movement->refresh();
    }

    public function adjustBalanceToTarget(
        User $user,
        string $direction,
        float $amount,
        ?string $notes = null,
    ): CompanyBalanceMovement {
        $targetBalance = $this->targetBalanceFromDirection($direction, $amount);
        $currentBalance = $this->currentBalance($user);
        $delta = round($targetBalance - $currentBalance, 2);

        if (abs($delta) < 0.01) {
            throw new \InvalidArgumentException('El saldo ya coincide con el monto indicado.');
        }

        $movement = $this->applyMovement(
            $user,
            $delta,
            CompanyBalanceMovement::TYPE_ADJUSTMENT,
            null,
            $notes ?: 'Ajuste para cuadrar con la empresa',
        );

        $this->recalculateUserBalance($user);

        return $movement->refresh();
    }

    public function applySessionSettlement(CashSession $session): ?CompanyBalanceMovement
    {
        if ($session->status !== CashSession::STATUS_CLOSED) {
            return null;
        }

        if (CompanyBalanceMovement::query()
            ->where('cash_session_id', $session->id)
            ->where('type', CompanyBalanceMovement::TYPE_SESSION_SETTLEMENT)
            ->exists()) {
            return null;
        }

        $summary = CashSessionSummary::forSession($session);
        $settlement = round((float) $summary['clikio_settlement'], 2);

        if (abs($settlement) < 0.01) {
            return null;
        }

        $user = $session->user;
        if (! $user) {
            return null;
        }

        if (! $this->sessionAffectsCompanyBalance($session)) {
            return null;
        }

        $movement = $this->applyMovement(
            $user,
            $settlement,
            CompanyBalanceMovement::TYPE_SESSION_SETTLEMENT,
            $session->id,
            null,
        );

        $this->recalculateUserBalance($user);

        return $movement->refresh();
    }

    public function liquidate(User $user, ?string $notes = null): CompanyBalanceMovement
    {
        $balance = $this->currentBalance($user);

        if (abs($balance) < 0.01) {
            throw new \InvalidArgumentException('La cuenta ya está cuadrada.');
        }

        return $this->applyMovement(
            $user,
            -$balance,
            CompanyBalanceMovement::TYPE_LIQUIDATION,
            null,
            $notes ?: 'Cuenta liquidada',
        );
    }

    public function recalculateUserBalance(User $user): void
    {
        DB::transaction(function () use ($user) {
            /** @var User $lockedUser */
            $lockedUser = User::query()->lockForUpdate()->findOrFail($user->id);
            $anchorDate = $this->balanceAnchorDate($lockedUser);

            $this->syncSessionSettlementMovements($lockedUser, $anchorDate);

            CompanyBalanceMovement::query()
                ->where('user_id', $lockedUser->id)
                ->where('type', CompanyBalanceMovement::TYPE_SESSION_SETTLEMENT)
                ->with('cashSession')
                ->get()
                ->each(function (CompanyBalanceMovement $movement) use ($anchorDate) {
                    if (! $movement->cashSession) {
                        $movement->delete();

                        return;
                    }

                    if (! $this->sessionAffectsCompanyBalance($movement->cashSession, $anchorDate)) {
                        $movement->delete();
                    }
                });

            $movements = CompanyBalanceMovement::query()
                ->where('user_id', $lockedUser->id)
                ->orderBy('created_at')
                ->orderBy('id')
                ->lockForUpdate()
                ->get();

            $balance = 0.0;

            foreach ($movements as $item) {
                if ($item->type === CompanyBalanceMovement::TYPE_LIQUIDATION) {
                    $item->amount = round(-$balance, 2);
                }

                $balance = round($balance + (float) $item->amount, 2);
                $item->balance_after = $balance;
                $item->save();
            }

            $lockedUser->update(['company_balance' => $balance]);
        });
    }

    public function refreshSessionSettlement(CashSession $session): void
    {
        $user = $session->user;
        if (! $user) {
            return;
        }

        $this->recalculateUserBalance($user);
    }

    public function sessionAffectsCompanyBalance(CashSession $session, ?Carbon $anchorDate = null): bool
    {
        if ($anchorDate === null) {
            $user = $session->user;
            if (! $user) {
                return false;
            }

            $anchorDate = $this->balanceAnchorDate($user);

            if ($anchorDate === null) {
                return true;
            }
        }

        $sessionDate = $this->sessionWorkDate($session);
        if ($sessionDate === null) {
            return true;
        }

        return $sessionDate->greaterThanOrEqualTo($anchorDate);
    }

    private function syncSessionSettlementMovements(User $user, ?Carbon $anchorDate): void
    {
        CashSession::query()
            ->where('user_id', $user->id)
            ->where('status', CashSession::STATUS_CLOSED)
            ->orderBy('id')
            ->get()
            ->each(function (CashSession $session) use ($user, $anchorDate) {
                $movement = CompanyBalanceMovement::query()
                    ->where('cash_session_id', $session->id)
                    ->where('type', CompanyBalanceMovement::TYPE_SESSION_SETTLEMENT)
                    ->first();

                if (! $this->sessionAffectsCompanyBalance($session, $anchorDate)) {
                    $movement?->delete();

                    return;
                }

                $settlement = round(
                    (float) CashSessionSummary::forSession($session)['clikio_settlement'],
                    2,
                );

                if (abs($settlement) < 0.01) {
                    $movement?->delete();

                    return;
                }

                if ($movement) {
                    if (round((float) $movement->amount, 2) !== $settlement) {
                        $movement->update(['amount' => $settlement]);
                    }

                    return;
                }

                CompanyBalanceMovement::query()->create([
                    'user_id' => $user->id,
                    'type' => CompanyBalanceMovement::TYPE_SESSION_SETTLEMENT,
                    'amount' => $settlement,
                    'balance_after' => 0,
                    'cash_session_id' => $session->id,
                    'notes' => null,
                ]);
            });
    }

    private function balanceAnchorDate(User $user): ?Carbon
    {
        $entry = CompanyBalanceMovement::query()
            ->where('user_id', $user->id)
            ->where('type', CompanyBalanceMovement::TYPE_BALANCE_ENTRY)
            ->orderBy('created_at')
            ->orderBy('id')
            ->first();

        return $entry?->created_at?->copy()->startOfDay();
    }

    private function sessionWorkDate(CashSession $session): ?Carbon
    {
        if ($session->capture_date) {
            return $session->capture_date->copy()->startOfDay();
        }

        if ($session->started_at) {
            return $session->started_at->copy()->startOfDay();
        }

        return null;
    }

    private function createBalanceEntry(User $user, string $direction, float $amount, ?string $notes = null): CompanyBalanceMovement
    {
        $delta = $this->directionToDelta($direction, $amount);

        $autoNote = $direction === 'company_owes'
            ? 'Saldo registrado: la empresa me debe'
            : 'Saldo registrado: yo debo a la empresa';

        return $this->applyMovement(
            $user,
            $delta,
            CompanyBalanceMovement::TYPE_BALANCE_ENTRY,
            null,
            $notes ?: $autoNote,
        );
    }

    private function targetBalanceFromDirection(string $direction, float $amount): float
    {
        $amount = round(abs($amount), 2);

        return $direction === 'company_owes'
            ? -$amount
            : $amount;
    }

    private function directionToDelta(string $direction, float $amount): float
    {
        $amount = round(abs($amount), 2);

        return $direction === 'company_owes'
            ? -$amount
            : $amount;
    }

    private function applyMovement(
        User $user,
        float $amount,
        string $type,
        ?int $cashSessionId = null,
        ?string $notes = null,
    ): CompanyBalanceMovement {
        return DB::transaction(function () use ($user, $amount, $type, $cashSessionId, $notes) {
            /** @var User $lockedUser */
            $lockedUser = User::query()->lockForUpdate()->findOrFail($user->id);
            $newBalance = round((float) $lockedUser->company_balance + $amount, 2);

            $lockedUser->update(['company_balance' => $newBalance]);

            return CompanyBalanceMovement::query()->create([
                'user_id' => $lockedUser->id,
                'type' => $type,
                'amount' => round($amount, 2),
                'balance_after' => $newBalance,
                'cash_session_id' => $cashSessionId,
                'notes' => $notes,
            ]);
        });
    }
}
