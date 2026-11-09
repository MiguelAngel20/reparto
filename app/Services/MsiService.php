<?php

namespace App\Services;

use App\Models\MsiAccount;
use App\Models\MsiInstallment;
use App\Models\MsiPurchase;
use App\Models\User;
use Carbon\Carbon;
use Illuminate\Support\Facades\DB;
use InvalidArgumentException;

class MsiService
{
    public function assertOwned(User $user, MsiAccount $account): void
    {
        abort_unless($account->user_id === $user->id, 404);
    }

    public function assertPurchaseOwned(User $user, MsiPurchase $purchase): void
    {
        abort_unless($purchase->user_id === $user->id, 404);
    }

    /**
     * @return list<array<string, mixed>>
     */
    public function listAccountsForUser(User $user): array
    {
        return MsiAccount::query()
            ->where('user_id', $user->id)
            ->with(['purchases.installments'])
            ->orderBy('name')
            ->get()
            ->map(fn (MsiAccount $account) => $this->formatAccountSummary($account))
            ->values()
            ->all();
    }

    /**
     * @return array<string, mixed>
     */
    public function formatAccountSummary(MsiAccount $account): array
    {
        $purchases = $account->purchases;
        $originalTotal = 0.0;
        $remainingTotal = 0.0;
        $paidTotal = 0.0;
        $activePurchases = 0;
        $nextDue = null;

        foreach ($purchases as $purchase) {
            $stats = $this->purchaseStats($purchase);
            $originalTotal += $stats['original_amount'];
            $remainingTotal += $stats['remaining_amount'];
            $paidTotal += $stats['paid_amount'];

            if ($stats['status'] === MsiPurchase::STATUS_ACTIVE) {
                $activePurchases += 1;
            }

            if ($stats['next_due_date']) {
                $candidate = Carbon::parse($stats['next_due_date']);
                if ($nextDue === null || $candidate->lt($nextDue)) {
                    $nextDue = $candidate;
                }
            }
        }

        return [
            'id' => $account->id,
            'name' => $account->name,
            'purchases_count' => $purchases->count(),
            'active_purchases' => $activePurchases,
            'original_total' => round($originalTotal, 2),
            'remaining_total' => round($remainingTotal, 2),
            'paid_total' => round($paidTotal, 2),
            'next_due_date' => $nextDue?->format('Y-m-d'),
            'next_due_date_formatted' => $nextDue?->format('d/m/Y'),
            'opened_at' => $account->created_at?->format('d/m/Y'),
        ];
    }

    /**
     * @return array<string, mixed>
     */
    public function formatAccountDetail(MsiAccount $account): array
    {
        $summary = $this->formatAccountSummary($account);

        $summary['purchases'] = $account->purchases
            ->sortByDesc('id')
            ->values()
            ->map(fn (MsiPurchase $purchase) => $this->formatPurchase($purchase))
            ->all();

        return $summary;
    }

    /**
     * @return array<string, mixed>
     */
    public function formatPurchase(MsiPurchase $purchase): array
    {
        $stats = $this->purchaseStats($purchase);

        return [
            'id' => $purchase->id,
            'name' => $purchase->name,
            'original_amount' => $stats['original_amount'],
            'months_total' => (int) $purchase->months_total,
            'monthly_amount' => round((float) $purchase->monthly_amount, 2),
            'first_due_date' => $purchase->first_due_date?->format('Y-m-d'),
            'first_due_date_formatted' => $purchase->first_due_date?->format('d/m/Y'),
            'debt_start_date' => $purchase->debt_start_date?->format('Y-m-d'),
            'debt_start_date_formatted' => $purchase->debt_start_date?->format('d/m/Y'),
            'notes' => $purchase->notes,
            'status' => $stats['status'],
            'paid_months' => $stats['paid_months'],
            'pending_months' => $stats['pending_months'],
            'paid_amount' => $stats['paid_amount'],
            'remaining_amount' => $stats['remaining_amount'],
            'next_due_date' => $stats['next_due_date'],
            'next_due_date_formatted' => $stats['next_due_date']
                ? Carbon::parse($stats['next_due_date'])->format('d/m/Y')
                : null,
            'progress_percent' => $stats['progress_percent'],
            'installments' => $purchase->installments
                ->map(fn (MsiInstallment $installment) => [
                    'id' => $installment->id,
                    'number' => (int) $installment->number,
                    'due_date' => $installment->due_date?->format('Y-m-d'),
                    'due_date_formatted' => $installment->due_date?->format('d/m/Y'),
                    'amount' => round((float) $installment->amount, 2),
                    'paid' => $installment->isPaid(),
                    'paid_at' => $installment->paid_at?->format('Y-m-d'),
                    'paid_at_formatted' => $installment->paid_at?->format('d/m/Y'),
                ])
                ->values()
                ->all(),
        ];
    }

    /**
     * @return array{
     *     original_amount: float,
     *     paid_amount: float,
     *     remaining_amount: float,
     *     paid_months: int,
     *     pending_months: int,
     *     next_due_date: ?string,
     *     progress_percent: int,
     *     status: string
     * }
     */
    public function purchaseStats(MsiPurchase $purchase): array
    {
        $installments = $purchase->relationLoaded('installments')
            ? $purchase->installments
            : $purchase->installments()->get();

        $original = round((float) $purchase->original_amount, 2);
        $paidAmount = 0.0;
        $paidMonths = 0;
        $pendingMonths = 0;
        $nextDue = null;

        foreach ($installments as $installment) {
            if ($installment->isPaid()) {
                $paidAmount += (float) $installment->amount;
                $paidMonths += 1;
                continue;
            }

            $pendingMonths += 1;
            $candidate = $installment->due_date?->format('Y-m-d');
            if ($candidate && ($nextDue === null || $candidate < $nextDue)) {
                $nextDue = $candidate;
            }
        }

        $paidAmount = round($paidAmount, 2);
        $remaining = round(max(0, $original - $paidAmount), 2);
        $status = $pendingMonths === 0 ? MsiPurchase::STATUS_PAID : MsiPurchase::STATUS_ACTIVE;
        $progress = $purchase->months_total > 0
            ? (int) round(($paidMonths / $purchase->months_total) * 100)
            : 0;

        return [
            'original_amount' => $original,
            'paid_amount' => $paidAmount,
            'remaining_amount' => $remaining,
            'paid_months' => $paidMonths,
            'pending_months' => $pendingMonths,
            'next_due_date' => $nextDue,
            'progress_percent' => $progress,
            'status' => $status,
        ];
    }

    public function createAccount(User $user, string $name): MsiAccount
    {
        return MsiAccount::query()->create([
            'user_id' => $user->id,
            'name' => trim($name),
        ]);
    }

    public function renameAccount(MsiAccount $account, string $name): void
    {
        $account->update(['name' => trim($name)]);
    }

    /**
     * @param  array{
     *     name: string,
     *     original_amount: float|int|string,
     *     months_total: int,
     *     first_due_date: string,
     *     debt_start_date?: ?string,
     *     months_already_paid?: int,
     *     notes?: ?string
     * }  $data
     */
    public function createPurchase(MsiAccount $account, User $user, array $data): MsiPurchase
    {
        $original = round((float) $data['original_amount'], 2);
        $months = (int) $data['months_total'];
        $alreadyPaid = max(0, min($months, (int) ($data['months_already_paid'] ?? 0)));

        if ($original <= 0) {
            throw new InvalidArgumentException('El monto debe ser mayor a cero.');
        }

        if ($months < 1 || $months > 48) {
            throw new InvalidArgumentException('Los meses MSI deben estar entre 1 y 48.');
        }

        $schedule = $this->buildSchedule($original, $months, $data['first_due_date']);
        $monthlyAmount = $schedule[0]['amount'];

        return DB::transaction(function () use ($account, $user, $data, $original, $months, $alreadyPaid, $schedule, $monthlyAmount) {
            $purchase = MsiPurchase::query()->create([
                'msi_account_id' => $account->id,
                'user_id' => $user->id,
                'name' => trim($data['name']),
                'original_amount' => $original,
                'months_total' => $months,
                'monthly_amount' => $monthlyAmount,
                'first_due_date' => $data['first_due_date'],
                'debt_start_date' => $data['debt_start_date'] ?: null,
                'status' => $alreadyPaid >= $months ? MsiPurchase::STATUS_PAID : MsiPurchase::STATUS_ACTIVE,
                'notes' => isset($data['notes']) && $data['notes'] !== '' ? trim((string) $data['notes']) : null,
            ]);

            foreach ($schedule as $row) {
                $paidAt = $row['number'] <= $alreadyPaid ? $row['due_date'] : null;

                MsiInstallment::query()->create([
                    'msi_purchase_id' => $purchase->id,
                    'number' => $row['number'],
                    'due_date' => $row['due_date'],
                    'amount' => $row['amount'],
                    'paid_at' => $paidAt,
                ]);
            }

            return $purchase->load('installments');
        });
    }

    /**
     * @return list<array{number: int, due_date: string, amount: float}>
     */
    public function buildSchedule(float $original, int $months, string $firstDueDate): array
    {
        $base = round($original / $months, 2);
        $allocated = round($base * ($months - 1), 2);
        $last = round($original - $allocated, 2);
        $firstDue = Carbon::parse($firstDueDate)->startOfDay();
        $rows = [];

        for ($number = 1; $number <= $months; $number++) {
            $rows[] = [
                'number' => $number,
                'due_date' => $firstDue->copy()->addMonthsNoOverflow($number - 1)->toDateString(),
                'amount' => $number === $months ? $last : $base,
            ];
        }

        return $rows;
    }

    public function markInstallmentPaid(MsiInstallment $installment, ?string $paidAt = null): void
    {
        if ($installment->isPaid()) {
            return;
        }

        $installment->update([
            'paid_at' => $paidAt ?: now()->toDateString(),
        ]);

        $this->syncPurchaseStatus($installment->purchase);
    }

    public function markInstallmentUnpaid(MsiInstallment $installment): void
    {
        if (! $installment->isPaid()) {
            return;
        }

        $installment->update(['paid_at' => null]);
        $this->syncPurchaseStatus($installment->purchase);
    }

    public function payNextMonths(MsiPurchase $purchase, int $count, ?string $paidAt = null): int
    {
        if ($count < 1) {
            throw new InvalidArgumentException('Debes adelantar al menos 1 mes.');
        }

        $pending = $purchase->installments()
            ->whereNull('paid_at')
            ->orderBy('number')
            ->limit($count)
            ->get();

        if ($pending->isEmpty()) {
            throw new InvalidArgumentException('Esta compra ya no tiene meses pendientes.');
        }

        $date = $paidAt ?: now()->toDateString();

        foreach ($pending as $installment) {
            $installment->update(['paid_at' => $date]);
        }

        $this->syncPurchaseStatus($purchase->fresh('installments') ?? $purchase);

        return $pending->count();
    }

    public function syncPurchaseStatus(MsiPurchase $purchase): void
    {
        $purchase->loadMissing('installments');
        $stats = $this->purchaseStats($purchase);
        $purchase->update(['status' => $stats['status']]);
    }
}
