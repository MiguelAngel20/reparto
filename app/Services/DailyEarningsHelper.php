<?php

namespace App\Services;

use App\Models\CashSession;
use App\Models\DailyExpense;
use App\Models\PersonalService;

class DailyEarningsHelper
{
    public static function sessionEarningsForUserOnDate(int $userId, string $date): float
    {
        $session = CashSession::sessionForUserOnDate($userId, $date);

        if (! $session) {
            return 0.0;
        }

        return (float) (CashSessionSummary::forSession($session)['user_earnings'] ?? 0);
    }

    public static function personalServicesForUserOnDate(int $userId, string $date): float
    {
        return round((float) PersonalService::query()
            ->where('user_id', $userId)
            ->whereDate('service_date', $date)
            ->sum('amount'), 2);
    }

    public static function expensesForUserOnDate(int $userId, string $date): float
    {
        return round((float) DailyExpense::query()
            ->where('user_id', $userId)
            ->whereDate('expense_date', $date)
            ->sum('amount'), 2);
    }

    public static function totalEarningsForUserOnDate(int $userId, string $date): float
    {
        return round(
            self::sessionEarningsForUserOnDate($userId, $date)
            + self::personalServicesForUserOnDate($userId, $date),
            2,
        );
    }

    public static function netEarningsForUserOnDate(int $userId, string $date): float
    {
        return round(
            self::totalEarningsForUserOnDate($userId, $date)
            - self::expensesForUserOnDate($userId, $date),
            2,
        );
    }

    /**
     * @return array{
     *     today_earnings: float,
     *     session_earnings: float,
     *     personal_services: float,
     *     total_expenses: float,
     *     net_earnings: float,
     *     completed_orders_today: int,
     *     has_open_live_session: bool,
     *     has_session_today: bool
     * }
     */
    public static function daySummaryForUser(int $userId, string $date): array
    {
        $session = CashSession::sessionForUserOnDate($userId, $date);
        $sessionEarnings = 0.0;
        $completedOrdersToday = 0;
        $hasOpenLiveSession = false;

        if ($session) {
            $summary = CashSessionSummary::forSession($session);
            $sessionEarnings = (float) ($summary['user_earnings'] ?? 0);
            $completedOrdersToday = (int) ($summary['completed_orders_count'] ?? 0);
            $hasOpenLiveSession = $session->isLive() && $session->isOpen();
        }

        $personalServices = self::personalServicesForUserOnDate($userId, $date);
        $totalExpenses = self::expensesForUserOnDate($userId, $date);
        $todayEarnings = round($sessionEarnings + $personalServices, 2);

        return [
            'today_earnings' => $todayEarnings,
            'session_earnings' => round($sessionEarnings, 2),
            'personal_services' => $personalServices,
            'total_expenses' => $totalExpenses,
            'net_earnings' => round($todayEarnings - $totalExpenses, 2),
            'completed_orders_today' => $completedOrdersToday,
            'has_open_live_session' => $hasOpenLiveSession,
            'has_session_today' => $session !== null,
        ];
    }

    /**
     * @return array<string, float>
     */
    public static function personalServicesByDateForUser(int $userId): array
    {
        return PersonalService::query()
            ->where('user_id', $userId)
            ->get()
            ->groupBy(fn (PersonalService $service) => $service->service_date->format('Y-m-d'))
            ->map(fn ($rows) => round((float) $rows->sum('amount'), 2))
            ->all();
    }

    public static function personalServicesForUserBetween(int $userId, string $start, string $end): float
    {
        return round((float) PersonalService::query()
            ->where('user_id', $userId)
            ->whereDate('service_date', '>=', $start)
            ->whereDate('service_date', '<=', $end)
            ->sum('amount'), 2);
    }
}
