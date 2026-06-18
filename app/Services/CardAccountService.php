<?php

namespace App\Services;

use App\Models\CardAccount;
use App\Models\CardAccountMovement;
use App\Models\User;
use Illuminate\Support\Facades\DB;
use InvalidArgumentException;

class CardAccountService
{
    public function openAccountForUser(User $user, ?string $holderName = null): CardAccount
    {
        $existing = CardAccount::openForUser($user->id);
        if ($existing) {
            return $existing;
        }

        return CardAccount::query()->create([
            'user_id' => $user->id,
            'holder_name' => $holderName ? trim($holderName) : null,
            'status' => CardAccount::STATUS_OPEN,
        ]);
    }

    /**
     * @return array{
     *     account: CardAccount|null,
     *     balance: float,
     *     total_purchases: float,
     *     total_payments: float,
     *     balance_display: array{label: string, tone: string, value: string, direction: string|null}
     * }
     */
    public function summaryForUser(User $user): array
    {
        $account = CardAccount::openForUser($user->id);
        $totals = $this->totalsForAccount($account);

        return [
            'account' => $account,
            'balance' => $totals['balance'],
            'total_purchases' => $totals['total_purchases'],
            'total_payments' => $totals['total_payments'],
            'balance_display' => $this->formatBalanceDisplay(
                $totals['balance'],
                $account?->holder_name,
            ),
        ];
    }

    public function addPurchase(User $user, array $data, ?string $holderName = null): CardAccountMovement
    {
        return DB::transaction(function () use ($user, $data, $holderName) {
            $account = $this->openAccountForUser($user, $holderName);

            if ($holderName && ! $account->holder_name) {
                $account->update(['holder_name' => trim($holderName)]);
            }

            return CardAccountMovement::query()->create([
                'card_account_id' => $account->id,
                'user_id' => $user->id,
                'type' => CardAccountMovement::TYPE_PURCHASE,
                'name' => trim($data['name']),
                'amount' => round((float) $data['amount'], 2),
                'description' => $data['description'] ?? null,
            ]);
        });
    }

    public function addPayment(User $user, array $data): CardAccountMovement
    {
        return DB::transaction(function () use ($user, $data) {
            $account = CardAccount::openForUser($user->id);

            if (! $account) {
                throw new InvalidArgumentException('No hay una cuenta de tarjeta abierta.');
            }

            return CardAccountMovement::query()->create([
                'card_account_id' => $account->id,
                'user_id' => $user->id,
                'type' => CardAccountMovement::TYPE_PAYMENT,
                'name' => trim($data['name']),
                'amount' => round((float) $data['amount'], 2),
                'description' => $data['description'] ?? null,
            ]);
        });
    }

    public function updateMovement(User $user, CardAccountMovement $movement, array $data): CardAccountMovement
    {
        $this->assertMovementOwnership($user, $movement);

        $account = $movement->account;
        abort_unless($account && $account->isOpen(), 403, 'La cuenta ya fue liquidada.');

        $movement->update([
            'name' => trim($data['name']),
            'amount' => round((float) $data['amount'], 2),
            'description' => $data['description'] ?? null,
        ]);

        return $movement->fresh();
    }

    public function deleteMovement(User $user, CardAccountMovement $movement): void
    {
        $this->assertMovementOwnership($user, $movement);

        $account = $movement->account;
        abort_unless($account && $account->isOpen(), 403, 'La cuenta ya fue liquidada.');

        $movement->delete();
    }

    public function liquidate(User $user): CardAccount
    {
        return DB::transaction(function () use ($user) {
            $account = CardAccount::openForUser($user->id);

            if (! $account) {
                throw new InvalidArgumentException('No hay una cuenta de tarjeta abierta.');
            }

            $balance = $this->totalsForAccount($account)['balance'];

            if (abs($balance) >= 0.01) {
                throw new InvalidArgumentException(
                    'El saldo debe estar en cero antes de liquidar la cuenta.',
                );
            }

            $account->update([
                'status' => CardAccount::STATUS_CLOSED,
                'closed_at' => now(),
            ]);

            return $account->fresh();
        });
    }

    /**
     * @return array{total_purchases: float, total_payments: float, balance: float}
     */
    public function totalsForAccount(?CardAccount $account): array
    {
        if (! $account) {
            return [
                'total_purchases' => 0.0,
                'total_payments' => 0.0,
                'balance' => 0.0,
            ];
        }

        $totalPurchases = (float) $account->movements()
            ->where('type', CardAccountMovement::TYPE_PURCHASE)
            ->sum('amount');

        $totalPayments = (float) $account->movements()
            ->where('type', CardAccountMovement::TYPE_PAYMENT)
            ->sum('amount');

        return [
            'total_purchases' => round($totalPurchases, 2),
            'total_payments' => round($totalPayments, 2),
            'balance' => round($totalPurchases - $totalPayments, 2),
        ];
    }

    /**
     * @return array<string, mixed>
     */
    public function formatMovement(CardAccountMovement $movement): array
    {
        return [
            'id' => $movement->id,
            'type' => $movement->type,
            'type_label' => CardAccountMovement::typeLabels()[$movement->type] ?? $movement->type,
            'name' => $movement->name,
            'amount' => (float) $movement->amount,
            'amount_label' => '$'.number_format((float) $movement->amount, 2),
            'description' => $movement->description,
            'created_at' => $movement->created_at?->format('d/m/Y H:i'),
            'editable' => $movement->account?->isOpen() ?? false,
        ];
    }

    /**
     * @return array{label: string, tone: string, value: string, direction: string|null}
     */
    public function formatBalanceDisplay(float $balance, ?string $holderName = null): array
    {
        $holder = $holderName ? trim($holderName) : 'tu compañero';
        $abs = abs($balance);

        if ($abs < 0.01) {
            return [
                'label' => 'Cuenta al corriente',
                'tone' => 'neutral',
                'value' => '$0.00',
                'direction' => null,
            ];
        }

        if ($balance > 0) {
            return [
                'label' => "{$holder} te debe",
                'tone' => 'amber',
                'value' => '$'.number_format($abs, 2),
                'direction' => 'holder_owes',
            ];
        }

        return [
            'label' => "Tú le debes a {$holder}",
            'tone' => 'violet',
            'value' => '$'.number_format($abs, 2),
            'direction' => 'user_owes',
        ];
    }

    private function assertMovementOwnership(User $user, CardAccountMovement $movement): void
    {
        abort_unless($movement->user_id === $user->id, 403);
    }
}
