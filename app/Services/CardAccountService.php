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
    public function createAccount(User $creator, array $data): CardAccount
    {
        return DB::transaction(function () use ($creator, $data) {
            $account = CardAccount::query()->create([
                'user_id' => $creator->id,
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

            $assignedUser = User::query()->findOrFail((int) $data['assigned_user_id']);
            $this->assignUserToCard($account, $assignedUser);

            if (! $creator->isAdmin() && $creator->id !== $assignedUser->id) {
                $this->assignUserToCard($account, $creator);
            }

            return $account;
        });
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
    public function openAccountCardsFor(User $user): Collection
    {
        $query = CardAccount::query()
            ->where('status', CardAccount::STATUS_OPEN)
            ->orderByDesc('id');

        if (! $user->isAdmin()) {
            $query->whereHas(
                'assignedUsers',
                fn ($assigned) => $assigned->where('users.id', $user->id),
            );
        }

        return $query->get()->map(fn (CardAccount $account) => $this->formatAccountCard($account));
    }

    public function userCanAccessCard(User $user, CardAccount $account): bool
    {
        if ($user->isAdmin()) {
            return true;
        }

        return $account->assignedUsers()->where('users.id', $user->id)->exists();
    }

    public function assertUserCanAccessCard(User $user, CardAccount $account): void
    {
        abort_unless(
            $this->userCanAccessCard($user, $account),
            403,
            'No tienes acceso a esta tarjeta.',
        );
    }

    /**
     * @return array<int, array{id: int, label: string}>
     */
    public function assignableUsersForCardForm(): array
    {
        return User::query()
            ->where('role', User::ROLE_REPARTIDOR)
            ->orderBy('name')
            ->get(['id', 'name'])
            ->map(fn (User $user) => [
                'id' => $user->id,
                'label' => $user->name,
            ])
            ->values()
            ->all();
    }

    /**
     * @return array<int, array{id: int, label: string, status: string}>
     */
    public function cardOptionsForPermissionsEditor(): array
    {
        return CardAccount::query()
            ->orderByDesc('id')
            ->get(['id', 'holder_name', 'account_holder_name', 'status'])
            ->map(fn (CardAccount $account) => [
                'id' => $account->id,
                'label' => trim(($account->account_holder_name ?: $account->holder_name) ?? 'Tarjeta #'.$account->id),
                'status' => $account->status,
            ])
            ->values()
            ->all();
    }

    /**
     * @return array<int, int>
     */
    public function assignedCardIdsForUser(User $user): array
    {
        return $user->assignedCardAccounts()
            ->pluck('card_accounts.id')
            ->map(fn ($id) => (int) $id)
            ->values()
            ->all();
    }

    /**
     * @param  array<int, int|string>  $cardAccountIds
     */
    public function syncUserCardAssignments(User $user, array $cardAccountIds): void
    {
        if ($user->isAdmin()) {
            return;
        }

        $ids = collect($cardAccountIds)
            ->map(fn ($id) => (int) $id)
            ->filter(fn (int $id) => $id > 0)
            ->unique()
            ->values()
            ->all();

        $validIds = CardAccount::query()
            ->whereIn('id', $ids)
            ->pluck('id')
            ->all();

        $user->assignedCardAccounts()->sync($validIds);
    }

    private function assignUserToCard(CardAccount $account, User $user): void
    {
        if ($user->isAdmin()) {
            return;
        }

        $account->assignedUsers()->syncWithoutDetaching([$user->id]);
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
     * Marca separadores de ciclo de deuda para listado descendente.
     *
     * @return array<int, array{after?: string, cycle_start_date_formatted?: string|null}>
     */
    public function debtCycleMarkers(CardAccount $account): array
    {
        $movements = $account->movements()
            ->whereIn('type', [
                CardAccountMovement::TYPE_PURCHASE,
                CardAccountMovement::TYPE_PAYMENT,
            ])
            ->orderBy('movement_date')
            ->orderBy('id')
            ->get();

        $balance = 0.0;
        $wasSettled = true;
        $cycleStartMovementId = null;
        $cycleStartDateFormatted = null;
        $markers = [];

        foreach ($movements as $movement) {
            if ($movement->isPurchase()) {
                if ($wasSettled) {
                    $movementDate = $movement->movement_date ?? $movement->created_at;
                    $cycleStartMovementId = $movement->id;
                    $cycleStartDateFormatted = $movementDate?->format('d/m/Y');
                }

                $balance = round($balance + (float) $movement->amount, 2);
                $wasSettled = false;

                continue;
            }

            if ($movement->isPayment()) {
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
