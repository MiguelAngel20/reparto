<?php

namespace App\Services;

use App\Models\CashSession;
use App\Models\User;

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

        if (! $session) {
            return [
                'orders_today' => 0,
                'user_earnings' => 0.0,
                'clikio_commission' => 0.0,
                'clikio_settlement' => 0.0,
            ];
        }

        $summary = CashSessionSummary::forSession($session);

        return [
            'orders_today' => $summary['completed_orders_count'],
            'user_earnings' => $summary['user_earnings'],
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

        ksort($byDate);

        return collect($byDate)
            ->map(fn (float $earnings, string $date) => [
                'date' => $date,
                'user_earnings' => round($earnings, 2),
            ])
            ->values()
            ->all();
    }

    protected function sessionDateKey(CashSession $session): string
    {
        if ($session->isManual() && $session->capture_date) {
            return $session->capture_date->format('Y-m-d');
        }

        return $session->started_at?->format('Y-m-d') ?? '';
    }

}
