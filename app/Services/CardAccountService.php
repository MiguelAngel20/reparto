<?php

namespace App\Services;

use App\Models\CardAccount;
use App\Models\CardAccountMovement;
use App\Models\User;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;
use InvalidArgumentException;

class CardAccountService
{
    public function createAccount(User $user, array $data): CardAccount
    {
        return CardAccount::query()->create([
            'user_id' => $user->id,
            'holder_name' => trim($data['holder_name']),
            'account_holder_name' => trim($data['account_holder_name'] ?? $data['holder_name']),
            'bank_type' => trim($data['bank_type'] ?? '') ?: null,
            'account_number' => trim($data['account_number'] ?? '') ?: null,
            'initial_real_balance' => array_key_exists('initial_real_balance', $data)
                && $data['initial_real_balance'] !== null
                && $data['initial_real_balance'] !== ''
                ? round((float) $data['initial_real_balance'], 2)
                : null,
            'status' => CardAccount::STATUS_OPEN,
        ]);
    }

    public function updateAccount(CardAccount $account, array $data): CardAccount
    {
        abort_unless($account->isOpen(), 403, 'No puedes editar una cuenta liquidada.');

        $account->update([
            'holder_name' => trim($data['holder_name']),
            'account_holder_name' => trim($data['account_holder_name'] ?? $data['holder_name']),
            'bank_type' => trim($data['bank_type'] ?? '') ?: null,
            'account_number' => trim($data['account_number'] ?? '') ?: null,
            'initial_real_balance' => array_key_exists('initial_real_balance', $data)
                && $data['initial_real_balance'] !== null
                && $data['initial_real_balance'] !== ''
                ? round((float) $data['initial_real_balance'], 2)
                : null,
        ]);

        return $account->fresh();
    }

    /**
     * @return Collection<int, array<string, mixed>>
     */
    public function openAccountCards(): Collection
    {
        return CardAccount::openAccounts()->map(fn (CardAccount $account) => $this->formatAccountCard($account));
    }

    /**
     * @return array{
     *     account: CardAccount,
     *     balance: float,
     *     total_purchases: float,
     *     total_payments: float,
     *     real_balance: float|null,
     *     real_balance_configured: bool,
     *     balance_display: array{label: string, tone: string, value: string, direction: string|null}
     * }
     */
    public function summaryForAccount(CardAccount $account): array
    {
        abort_unless($account->isOpen(), 404);

        $totals = $this->totalsForAccount($account);

        return [
            'account' => $account,
            'balance' => $totals['balance'],
            'total_purchases' => $totals['total_purchases'],
            'total_payments' => $totals['total_payments'],
            'real_balance' => $this->realBalanceForAccount($account),
            'real_balance_configured' => $account->initial_real_balance !== null,
            'balance_display' => $this->formatBalanceDisplay(
                $totals['balance'],
                $account->holder_name,
            ),
        ];
    }

    public function addPurchase(CardAccount $account, User $user, array $data): CardAccountMovement
    {
        return DB::transaction(function () use ($account, $user, $data) {
            abort_unless($account->isOpen(), 403);

            return CardAccountMovement::query()->create([
                'card_account_id' => $account->id,
                'user_id' => $user->id,
                'type' => CardAccountMovement::TYPE_PURCHASE,
                'name' => trim($data['name']),
                'amount' => round((float) $data['amount'], 2),
                'description' => $data['description'] ?? null,
                'movement_date' => $data['movement_date'],
            ]);
        });
    }

    public function addPayment(CardAccount $account, User $user, array $data): CardAccountMovement
    {
        return DB::transaction(function () use ($account, $user, $data) {
            abort_unless($account->isOpen(), 403);

            $method = $data['payment_method'] ?? CardAccountMovement::PAYMENT_METHOD_CASH;

            return CardAccountMovement::query()->create([
                'card_account_id' => $account->id,
                'user_id' => $user->id,
                'type' => CardAccountMovement::TYPE_PAYMENT,
                'payment_method' => $method,
                'name' => trim($data['name']),
                'amount' => round((float) $data['amount'], 2),
                'description' => $data['description'] ?? null,
                'movement_date' => $data['movement_date'],
            ]);
        });
    }

    public function addRealDeposit(CardAccount $account, User $user, array $data): CardAccountMovement
    {
        return DB::transaction(function () use ($account, $user, $data) {
            abort_unless($account->isOpen(), 403);

            if ($account->initial_real_balance === null) {
                throw new InvalidArgumentException(
                    'Configura el monto inicial de la tarjeta antes de registrar depósitos reales.',
                );
            }

            return CardAccountMovement::query()->create([
                'card_account_id' => $account->id,
                'user_id' => $user->id,
                'type' => CardAccountMovement::TYPE_REAL_DEPOSIT,
                'name' => trim($data['name']),
                'amount' => round((float) $data['amount'], 2),
                'description' => $data['description'] ?? null,
                'movement_date' => $data['movement_date'],
            ]);
        });
    }

    public function updateMovement(CardAccountMovement $movement, array $data): CardAccountMovement
    {
        $this->assertMovementEditable($movement);

        $updates = [
            'name' => trim($data['name']),
            'amount' => round((float) $data['amount'], 2),
            'description' => $data['description'] ?? null,
            'movement_date' => $data['movement_date'] ?? $movement->movement_date,
        ];

        if ($movement->isPayment() && array_key_exists('payment_method', $data)) {
            $updates['payment_method'] = $data['payment_method'];
        }

        $movement->update($updates);

        return $movement->fresh();
    }

    public function deleteMovement(CardAccountMovement $movement): void
    {
        $this->assertMovementEditable($movement);

        $movement->delete();
    }

    /**
     * Agrupa compras y abonos en ciclos de deuda (más reciente primero).
     *
     * @return array<int, array{
     *     cycle_start_date: string|null,
     *     cycle_start_date_formatted: string|null,
     *     purchases: array<int, array<string, mixed>>,
     *     payments: array<int, array<string, mixed>>,
     *     settled: bool
     * }>
     */
    public function debtCycleSections(CardAccount $account): array
    {
        $movements = $account->movements()
            ->with(['user:id,name', 'account:id,status'])
            ->whereIn('type', [
                CardAccountMovement::TYPE_PURCHASE,
                CardAccountMovement::TYPE_PAYMENT,
            ])
            ->orderBy('movement_date')
            ->orderBy('id')
            ->get();

        $balance = 0.0;
        $wasSettled = true;
        $sections = [];
        $currentIndex = -1;

        foreach ($movements as $movement) {
            if ($movement->isPurchase()) {
                if ($wasSettled) {
                    $movementDate = $movement->movement_date ?? $movement->created_at;

                    $sections[] = [
                        'cycle_start_date' => $movementDate?->format('Y-m-d'),
                        'cycle_start_date_formatted' => $movementDate?->format('d/m/Y'),
                        'purchases' => [],
                        'payments' => [],
                        'settled' => false,
                    ];
                    $currentIndex = count($sections) - 1;
                }

                $sections[$currentIndex]['purchases'][] = $this->formatMovement($movement);
                $balance = round($balance + (float) $movement->amount, 2);
                $wasSettled = false;

                continue;
            }

            if ($movement->isPayment() && $currentIndex >= 0) {
                $sections[$currentIndex]['payments'][] = $this->formatMovement($movement);
                $balance = round($balance - (float) $movement->amount, 2);

                if ($balance < 0.01) {
                    $balance = 0.0;
                    $sections[$currentIndex]['settled'] = true;
                    $wasSettled = true;
                }
            }
        }

        return array_reverse(array_values($sections));
    }

    /**
     * @return array<int, array<string, mixed>>
     */
    public function realDepositMovements(CardAccount $account): array
    {
        return $account->movements()
            ->with(['user:id,name', 'account:id,status'])
            ->where('type', CardAccountMovement::TYPE_REAL_DEPOSIT)
            ->orderByDesc('movement_date')
            ->orderByDesc('id')
            ->get()
            ->map(fn (CardAccountMovement $movement) => $this->formatMovement($movement))
            ->values()
            ->all();
    }

    /**
     * @return array{total_purchases: float, total_payments: float, balance: float}
     */
    public function totalsForAccount(CardAccount $account): array
    {
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

    public function realBalanceForAccount(CardAccount $account): ?float
    {
        if ($account->initial_real_balance === null) {
            return null;
        }

        $initial = (float) $account->initial_real_balance;

        $totalPurchases = (float) $account->movements()
            ->where('type', CardAccountMovement::TYPE_PURCHASE)
            ->sum('amount');

        $transferPayments = (float) $account->movements()
            ->where('type', CardAccountMovement::TYPE_PAYMENT)
            ->where('payment_method', CardAccountMovement::PAYMENT_METHOD_TRANSFER)
            ->sum('amount');

        $realDeposits = (float) $account->movements()
            ->where('type', CardAccountMovement::TYPE_REAL_DEPOSIT)
            ->sum('amount');

        return round($initial - $totalPurchases + $transferPayments + $realDeposits, 2);
    }

    /**
     * @return array<string, mixed>
     */
    public function formatAccountCard(CardAccount $account): array
    {
        $totals = $this->totalsForAccount($account);
        $realBalance = $this->realBalanceForAccount($account);
        $holderDebt = max(0, $totals['balance']);

        return [
            'id' => $account->id,
            'holder_name' => $account->holder_name,
            'account_holder_name' => $account->account_holder_name ?? $account->holder_name,
            'bank_type' => $account->bank_type,
            'account_number' => $account->account_number,
            'account_number_masked' => $this->maskAccountNumber($account->account_number),
            'initial_real_balance' => $account->initial_real_balance !== null
                ? (float) $account->initial_real_balance
                : null,
            'initial_real_balance' => $account->initial_real_balance !== null
                ? (float) $account->initial_real_balance
                : null,
            'real_balance' => $realBalance,
            'real_balance_configured' => $account->initial_real_balance !== null,
            'holder_debt' => $holderDebt,
            'holder_debt_label' => '$'.number_format($holderDebt, 2),
            'real_balance_label' => $realBalance !== null
                ? '$'.number_format($realBalance, 2)
                : 'Sin configurar',
            'opened_at' => $account->created_at?->format('d/m/Y'),
            'balance' => $totals['balance'],
            'balance_display' => $this->formatBalanceDisplay($totals['balance'], $account->holder_name),
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
            'payment_method' => $movement->payment_method,
            'payment_method_label' => $movement->payment_method
                ? (CardAccountMovement::paymentMethodLabels()[$movement->payment_method] ?? $movement->payment_method)
                : null,
            'name' => $movement->name,
            'amount' => (float) $movement->amount,
            'amount_label' => '$'.number_format((float) $movement->amount, 2),
            'description' => $movement->description,
            'movement_date' => ($movement->movement_date ?? $movement->created_at)?->format('Y-m-d'),
            'movement_date_formatted' => ($movement->movement_date ?? $movement->created_at)?->format('d/m/Y'),
            'created_at' => $movement->created_at?->format('d/m/Y H:i'),
            'registered_by' => $movement->user?->name,
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
                'label' => "{$holder} debe a la tarjeta",
                'tone' => 'amber',
                'value' => '$'.number_format($abs, 2),
                'direction' => 'holder_owes',
            ];
        }

        return [
            'label' => "El equipo debe a {$holder}",
            'tone' => 'violet',
            'value' => '$'.number_format($abs, 2),
            'direction' => 'user_owes',
        ];
    }

    public function maskAccountNumber(?string $number): ?string
    {
        if (! $number) {
            return null;
        }

        $digits = preg_replace('/\D/', '', $number);

        if (strlen($digits) <= 4) {
            return $number;
        }

        return '**** '.substr($digits, -4);
    }

    private function assertMovementEditable(CardAccountMovement $movement): void
    {
        abort_unless(
            $movement->account?->isOpen(),
            403,
            'La cuenta ya fue liquidada o el movimiento no pertenece a la cuenta activa.',
        );
    }
}
