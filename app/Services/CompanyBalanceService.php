<?php

namespace App\Services;

use App\Models\CashSession;
use App\Models\CompanyBalanceMovement;
use App\Models\User;
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
        $amount = round(abs($amount), 2);
        $delta = $direction === 'company_owes'
            ? -$amount
            : $amount;

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

        $sessionLabel = $session->isManual() ? 'captura manual' : 'jornada en vivo';
        $dateLabel = $session->capture_date?->format('d/m/Y') ?? now()->format('d/m/Y');

        return $this->applyMovement(
            $user,
            $settlement,
            CompanyBalanceMovement::TYPE_SESSION_SETTLEMENT,
            $session->id,
            "Cuadre de {$sessionLabel} ({$dateLabel})",
        );
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
