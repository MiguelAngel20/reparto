<?php

namespace App\Services;

use App\Models\Debtor;
use App\Models\DebtorMovement;
use App\Models\User;
use Illuminate\Support\Facades\DB;
use InvalidArgumentException;

class DebtorService
{
    public function assertOwned(User $user, Debtor $debtor): void
    {
        abort_unless($debtor->user_id === $user->id, 404);
    }

    /**
     * @return list<array<string, mixed>>
     */
    public function listForUser(User $user): array
    {
        return Debtor::query()
            ->where('user_id', $user->id)
            ->withSum([
                'movements as total_debts' => fn ($query) => $query->where('type', DebtorMovement::TYPE_DEBT),
            ], 'amount')
            ->withSum([
                'movements as total_credits' => fn ($query) => $query->whereIn('type', [
                    DebtorMovement::TYPE_PAYMENT,
                    DebtorMovement::TYPE_SETTLEMENT,
                ]),
            ], 'amount')
            ->orderBy('name')
            ->get()
            ->map(function (Debtor $debtor) {
                $debts = round((float) ($debtor->total_debts ?? 0), 2);
                $credits = round((float) ($debtor->total_credits ?? 0), 2);
                $balance = round(max(0, $debts - $credits), 2);

                return [
                    'id' => $debtor->id,
                    'name' => $debtor->name,
                    'balance' => $balance,
                    'opened_at' => $debtor->created_at?->format('d/m/Y'),
                ];
            })
            ->values()
            ->all();
    }

    /**
     * @return array{
     *     balance: float,
     *     total_debts: float,
     *     total_payments: float
     * }
     */
    public function totals(Debtor $debtor): array
    {
        $totalDebts = round((float) $debtor->movements()
            ->where('type', DebtorMovement::TYPE_DEBT)
            ->sum('amount'), 2);

        $totalPayments = round((float) $debtor->movements()
            ->whereIn('type', [DebtorMovement::TYPE_PAYMENT, DebtorMovement::TYPE_SETTLEMENT])
            ->sum('amount'), 2);

        return [
            'total_debts' => $totalDebts,
            'total_payments' => $totalPayments,
            'balance' => round(max(0, $totalDebts - $totalPayments), 2),
        ];
    }

    public function create(User $user, string $name): Debtor
    {
        return Debtor::query()->create([
            'user_id' => $user->id,
            'name' => trim($name),
        ]);
    }

    public function rename(Debtor $debtor, string $name): Debtor
    {
        $debtor->update(['name' => trim($name)]);

        return $debtor->fresh();
    }

    public function addDebt(Debtor $debtor, User $user, array $data): DebtorMovement
    {
        return $this->createMovement($debtor, $user, DebtorMovement::TYPE_DEBT, $data);
    }

    public function addPayment(Debtor $debtor, User $user, array $data): DebtorMovement
    {
        $amount = round((float) $data['amount'], 2);
        $balance = $this->totals($debtor)['balance'];

        if ($balance < 0.01) {
            throw new InvalidArgumentException('Este deudor ya está al corriente.');
        }

        if ($amount - $balance > 0.009) {
            throw new InvalidArgumentException('El abono no puede ser mayor a lo que te deben.');
        }

        return $this->createMovement($debtor, $user, DebtorMovement::TYPE_PAYMENT, $data);
    }

    public function settle(Debtor $debtor, User $user, array $data): DebtorMovement
    {
        $balance = $this->totals($debtor)['balance'];

        if ($balance < 0.01) {
            throw new InvalidArgumentException('No hay monto pendiente por liquidar.');
        }

        $data['amount'] = $balance;

        return $this->createMovement($debtor, $user, DebtorMovement::TYPE_SETTLEMENT, $data);
    }

    public function updateMovement(Debtor $debtor, DebtorMovement $movement, array $data): DebtorMovement
    {
        abort_unless($movement->debtor_id === $debtor->id, 404);

        $updates = [
            'name' => trim($data['name']),
            'movement_date' => $data['movement_date'],
        ];

        if (! $movement->reducesBalance() || $movement->type === DebtorMovement::TYPE_PAYMENT) {
            $amount = round((float) ($data['amount'] ?? 0), 2);

            if ($movement->isDebt()) {
                $otherDebts = round((float) $debtor->movements()
                    ->where('type', DebtorMovement::TYPE_DEBT)
                    ->where('id', '!=', $movement->id)
                    ->sum('amount'), 2);
                $credits = $this->creditsExcept($debtor, 0);
                $nextBalance = round($otherDebts + $amount - $credits, 2);

                if ($nextBalance < -0.009) {
                    throw new InvalidArgumentException('El monto de la deuda no puede quedar por debajo de los abonos ya registrados.');
                }
            }

            if ($movement->type === DebtorMovement::TYPE_PAYMENT) {
                $others = $this->creditsExcept($debtor, $movement->id);
                $debts = round((float) $debtor->movements()
                    ->where('type', DebtorMovement::TYPE_DEBT)
                    ->sum('amount'), 2);
                $available = round(max(0, $debts - $others), 2);

                if ($amount - $available > 0.009) {
                    throw new InvalidArgumentException('El abono no puede ser mayor a lo que te deben.');
                }
            }

            if ($movement->type !== DebtorMovement::TYPE_SETTLEMENT) {
                $updates['amount'] = $amount;
            }
        }

        $movement->update($updates);

        return $movement->fresh();
    }

    public function deleteMovement(Debtor $debtor, DebtorMovement $movement): void
    {
        abort_unless($movement->debtor_id === $debtor->id, 404);

        if ($movement->isDebt()) {
            $remainingDebts = round((float) $debtor->movements()
                ->where('type', DebtorMovement::TYPE_DEBT)
                ->where('id', '!=', $movement->id)
                ->sum('amount'), 2);
            $credits = round((float) $debtor->movements()
                ->whereIn('type', [DebtorMovement::TYPE_PAYMENT, DebtorMovement::TYPE_SETTLEMENT])
                ->sum('amount'), 2);

            if ($credits - $remainingDebts > 0.009) {
                throw new InvalidArgumentException('No se puede eliminar esta deuda porque los abonos quedarían por encima.');
            }
        }

        $movement->delete();
    }

    /**
     * @return array<int, array{after?: string, cycle_start_date_formatted?: string|null}>
     */
    public function debtCycleMarkers(Debtor $debtor): array
    {
        $movements = $debtor->movements()
            ->orderBy('movement_date')
            ->orderBy('id')
            ->get();

        $balance = 0.0;
        $wasSettled = true;
        $cycleStartMovementId = null;
        $cycleStartDateFormatted = null;
        $markers = [];

        foreach ($movements as $movement) {
            if ($movement->isDebt()) {
                if ($wasSettled) {
                    $cycleStartMovementId = $movement->id;
                    $cycleStartDateFormatted = $movement->movement_date?->format('d/m/Y');
                }

                $balance = round($balance + (float) $movement->amount, 2);
                $wasSettled = false;

                continue;
            }

            if ($movement->reducesBalance()) {
                $balance = round($balance - (float) $movement->amount, 2);

                if ($balance < 0.01) {
                    $balance = 0.0;

                    if ($cycleStartMovementId !== null) {
                        $markers[$cycleStartMovementId]['after'] = 'cycle_start';
                        $markers[$cycleStartMovementId]['cycle_start_date_formatted'] = $cycleStartDateFormatted;
                    }

                    $markers[$movement->id]['after'] = 'settled';
                    $wasSettled = true;
                    $cycleStartMovementId = null;
                    $cycleStartDateFormatted = null;
                }
            }
        }

        if ($cycleStartMovementId !== null) {
            $markers[$cycleStartMovementId]['after'] = 'cycle_start';
            $markers[$cycleStartMovementId]['cycle_start_date_formatted'] = $cycleStartDateFormatted;
        }

        return $markers;
    }

    /**
     * @return array<string, mixed>
     */
    public function formatMovement(DebtorMovement $movement): array
    {
        $sign = $movement->isDebt() ? '+' : '−';

        return [
            'id' => $movement->id,
            'type' => $movement->type,
            'type_label' => DebtorMovement::typeLabels()[$movement->type] ?? $movement->type,
            'name' => $movement->name,
            'amount' => (float) $movement->amount,
            'amount_label' => $sign.'$'.number_format((float) $movement->amount, 2),
            'movement_date' => $movement->movement_date?->format('Y-m-d'),
            'movement_date_formatted' => $movement->movement_date?->format('d/m/Y'),
        ];
    }

    private function creditsExcept(Debtor $debtor, int $movementId): float
    {
        return round((float) $debtor->movements()
            ->whereIn('type', [DebtorMovement::TYPE_PAYMENT, DebtorMovement::TYPE_SETTLEMENT])
            ->where('id', '!=', $movementId)
            ->sum('amount'), 2);
    }

    private function createMovement(Debtor $debtor, User $user, string $type, array $data): DebtorMovement
    {
        return DB::transaction(function () use ($debtor, $user, $type, $data) {
            return DebtorMovement::query()->create([
                'debtor_id' => $debtor->id,
                'user_id' => $user->id,
                'type' => $type,
                'name' => trim($data['name']),
                'amount' => round((float) $data['amount'], 2),
                'movement_date' => $data['movement_date'],
            ]);
        });
    }
}
