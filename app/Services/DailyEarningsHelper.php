<?php

namespace App\Services;

use App\Models\CashSession;
use App\Models\DailyExpense;
use App\Models\PersonalService;
use App\Support\DateRangeQuery;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Support\Carbon;

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
            ->completed()
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
        $openSession = CashSession::openLiveForUser($userId);

        if ($openSession !== null) {
            return self::daySummaryForSession($openSession);
        }

        $session = CashSession::sessionForUserOnDate($userId, $date);

        if ($session) {
            return self::daySummaryForSession($session);
        }

        $personalServices = self::personalServicesForUserOnDate($userId, $date);
        $totalExpenses = self::expensesForUserOnDate($userId, $date);
        $todayEarnings = round($personalServices, 2);
        $personalServicesCount = (int) PersonalService::query()
            ->where('user_id', $userId)
            ->whereDate('service_date', $date)
            ->completed()
            ->count();

        return [
            'today_earnings' => $todayEarnings,
            'session_earnings' => 0.0,
            'personal_services' => $personalServices,
            'personal_services_count' => $personalServicesCount,
            'total_expenses' => $totalExpenses,
            'net_earnings' => round($todayEarnings - $totalExpenses, 2),
            'completed_orders_today' => 0,
            'has_open_live_session' => false,
            'has_session_today' => false,
        ];
    }

    public static function completedPersonalServicesCountForUserBetween(
        int $userId,
        string $start,
        string $end,
    ): int {
        return (int) PersonalService::query()
            ->where('user_id', $userId)
            ->whereDate('service_date', '>=', $start)
            ->whereDate('service_date', '<=', $end)
            ->completed()
            ->count();
    }

    /**
     * @return array{
     *     today_earnings: float,
     *     session_earnings: float,
     *     personal_services: float,
     *     personal_services_count: int,
     *     total_expenses: float,
     *     net_earnings: float,
     *     completed_orders_today: int,
     *     has_open_live_session: bool,
     *     has_session_today: bool,
     *     session_date: string
     * }
     */
    public static function daySummaryForSession(CashSession $session): array
    {
        $summary = CashSessionSummary::forSession($session);
        $sessionEarnings = (float) ($summary['user_earnings'] ?? 0);
        $completedOrdersToday = (int) ($summary['completed_orders_count'] ?? 0);
        $personalServices = self::personalServicesForSession($session);
        $totalExpenses = self::expensesForSession($session);
        $todayEarnings = round($sessionEarnings + $personalServices, 2);

        return [
            'today_earnings' => $todayEarnings,
            'session_earnings' => round($sessionEarnings, 2),
            'personal_services' => $personalServices,
            'personal_services_count' => (int) self::personalServicesQueryForSession($session)->count(),
            'total_expenses' => $totalExpenses,
            'net_earnings' => round($todayEarnings - $totalExpenses, 2),
            'completed_orders_today' => $completedOrdersToday,
            'has_open_live_session' => $session->isLive() && $session->isOpen(),
            'has_session_today' => true,
            'session_date' => $session->businessDate(),
        ];
    }

    public static function personalServicesForSession(CashSession $session): float
    {
        return round((float) self::personalServicesQueryForSession($session)->sum('amount'), 2);
    }

    public static function expensesForSession(CashSession $session): float
    {
        return round((float) self::expensesQueryForSession($session)->sum('amount'), 2);
    }

    /** @return Builder<PersonalService> */
    public static function personalServicesQueryForSession(CashSession $session): Builder
    {
        [$start, $end] = $session->activityDateRange();

        return PersonalService::query()
            ->where('user_id', $session->user_id)
            ->completed()
            ->whereDate('service_date', '>=', $start)
            ->whereDate('service_date', '<=', $end);
    }

    /** @return Builder<DailyExpense> */
    public static function expensesQueryForSession(CashSession $session): Builder
    {
        [$start, $end] = $session->activityDateRange();

        return DailyExpense::query()
            ->where('user_id', $session->user_id)
            ->whereDate('expense_date', '>=', $start)
            ->whereDate('expense_date', '<=', $end);
    }

    /**
     * @return array<string, float>
     */
    public static function personalServicesByDateForUser(int $userId): array
    {
        return PersonalService::query()
            ->where('user_id', $userId)
            ->completed()
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
            ->completed()
            ->sum('amount'), 2);
    }

    public static function expensesForUserBetween(int $userId, string $start, string $end): float
    {
        return round((float) DailyExpense::query()
            ->where('user_id', $userId)
            ->whereDate('expense_date', '>=', $start)
            ->whereDate('expense_date', '<=', $end)
            ->sum('amount'), 2);
    }

    /**
     * Resumen para un rango de fechas (por defecto hoy = hoy).
     *
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
    public static function summaryForUserInRange(int $userId, string $start, string $end): array
    {
        if (DateRangeQuery::isTodayRange($start, $end)) {
            return self::daySummaryForUser($userId, $start);
        }

        if (DateRangeQuery::isSingleDay($start, $end)) {
            return self::singleDaySummaryForUser($userId, $start);
        }

        $sessionEarnings = 0.0;
        $completedOrders = 0;
        $current = Carbon::parse($start)->startOfDay();
        $endDate = Carbon::parse($end)->startOfDay();

        while ($current->lte($endDate)) {
            $date = $current->toDateString();
            $session = CashSession::sessionForUserOnDate($userId, $date);

            if ($session) {
                $summary = CashSessionSummary::forSession($session);
                $sessionEarnings += (float) ($summary['user_earnings'] ?? 0);
                $completedOrders += (int) ($summary['completed_orders_count'] ?? 0);
            }

            $current->addDay();
        }

        $personalServices = self::personalServicesForUserBetween($userId, $start, $end);
        $totalExpenses = self::expensesForUserBetween($userId, $start, $end);
        $todayEarnings = round($sessionEarnings + $personalServices, 2);

        return [
            'today_earnings' => $todayEarnings,
            'session_earnings' => round($sessionEarnings, 2),
            'personal_services' => $personalServices,
            'personal_services_count' => self::completedPersonalServicesCountForUserBetween($userId, $start, $end),
            'total_expenses' => $totalExpenses,
            'net_earnings' => round($todayEarnings - $totalExpenses, 2),
            'completed_orders_today' => $completedOrders,
            'has_open_live_session' => false,
            'has_session_today' => $completedOrders > 0,
        ];
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
    private static function singleDaySummaryForUser(int $userId, string $date): array
    {
        $session = CashSession::sessionForUserOnDate($userId, $date);

        if ($session) {
            $summary = self::daySummaryForSession($session);

            unset($summary['session_date']);

            return $summary;
        }

        $personalServices = self::personalServicesForUserOnDate($userId, $date);
        $totalExpenses = self::expensesForUserOnDate($userId, $date);
        $todayEarnings = round($personalServices, 2);
        $personalServicesCount = (int) PersonalService::query()
            ->where('user_id', $userId)
            ->whereDate('service_date', $date)
            ->completed()
            ->count();

        return [
            'today_earnings' => $todayEarnings,
            'session_earnings' => 0.0,
            'personal_services' => $personalServices,
            'personal_services_count' => $personalServicesCount,
            'total_expenses' => $totalExpenses,
            'net_earnings' => round($todayEarnings - $totalExpenses, 2),
            'completed_orders_today' => 0,
            'has_open_live_session' => false,
            'has_session_today' => false,
        ];
    }
}
