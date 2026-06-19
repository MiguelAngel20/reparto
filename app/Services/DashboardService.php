<?php

namespace App\Services;

use App\Models\CashSession;
use App\Models\User;
use Carbon\Carbon;

class DashboardService
{
    /**
     * @return array{
     *     orders_today: int,
     *     user_earnings: float,
     *     clikio_commission: float,
     *     clikio_settlement: float
     * }
     */
    public function todayStatsForUser(User $user): array
    {
        $today = now()->toDateString();
        $session = CashSession::sessionForUserOnDate($user->id, $today);
        $personalServices = DailyEarningsHelper::personalServicesForUserOnDate($user->id, $today);

        if (! $session) {
            return [
                'orders_today' => 0,
                'user_earnings' => $personalServices,
                'clikio_commission' => 0.0,
                'clikio_settlement' => 0.0,
            ];
        }

        $summary = CashSessionSummary::forSession($session);

        return [
            'orders_today' => $summary['completed_orders_count'],
            'user_earnings' => round($summary['user_earnings'] + $personalServices, 2),
            'clikio_commission' => $summary['total_clikio_commission'],
            'clikio_settlement' => $summary['clikio_settlement'],
        ];
    }

    /**
     * @return list<array{date: string, user_earnings: float}>
     */
    public function dailyEarningsForUser(int $userId): array
    {
        $sessions = CashSession::query()
            ->where('user_id', $userId)
            ->orderByRaw('COALESCE(capture_date, DATE(started_at)) ASC')
            ->get();

        $byDate = [];

        foreach ($sessions as $session) {
            $date = $this->sessionDateKey($session);
            if ($date === '') {
                continue;
            }

            $summary = CashSessionSummary::forSession($session);
            $byDate[$date] = ($byDate[$date] ?? 0) + $summary['user_earnings'];
        }

        foreach (DailyEarningsHelper::personalServicesByDateForUser($userId) as $date => $amount) {
            $byDate[$date] = ($byDate[$date] ?? 0) + $amount;
        }

        ksort($byDate);

        return collect($byDate)
            ->map(fn (float $earnings, string $date) => [
                'date' => $date,
                'user_earnings' => round($earnings, 2),
            ])
            ->values()
            ->all();
    }

    /**
     * @return array{
     *     range_label: string,
     *     total_earnings: float,
     *     total_expenses: float,
     *     net_earnings: float
     * }
     */
    public function weeklySummaryForUser(int $userId): array
    {
        $weekStart = now()->startOfWeek(Carbon::MONDAY)->startOfDay();
        $weekEnd = now()->endOfWeek(Carbon::SUNDAY)->startOfDay();
        $startKey = $weekStart->toDateString();
        $endKey = $weekEnd->toDateString();

        $totalEarnings = 0.0;

        foreach (CashSession::query()->where('user_id', $userId)->get() as $session) {
            $dateKey = $this->sessionDateKey($session);
            if ($dateKey === '' || $dateKey < $startKey || $dateKey > $endKey) {
                continue;
            }

            $totalEarnings += CashSessionSummary::forSession($session)['user_earnings'];
        }

        $totalEarnings += DailyEarningsHelper::personalServicesForUserBetween($userId, $startKey, $endKey);

        $totalExpenses = round((float) \App\Models\DailyExpense::query()
            ->where('user_id', $userId)
            ->whereDate('expense_date', '>=', $startKey)
            ->whereDate('expense_date', '<=', $endKey)
            ->sum('amount'), 2);

        $totalEarnings = round($totalEarnings, 2);

        return [
            'range_label' => $weekStart->format('d/m/Y').' - '.$weekEnd->format('d/m/Y'),
            'total_earnings' => $totalEarnings,
            'total_expenses' => $totalExpenses,
            'net_earnings' => round($totalEarnings - $totalExpenses, 2),
        ];
    }

    protected function sessionDateKey(CashSession $session): string
    {
        if ($session->isManual() && $session->capture_date) {
            return $session->capture_date->format('Y-m-d');
        }

        return $session->started_at?->format('Y-m-d') ?? '';
    }
}
