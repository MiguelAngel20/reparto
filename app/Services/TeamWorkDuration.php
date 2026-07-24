<?php

namespace App\Services;

use App\Models\CashSession;
use Illuminate\Support\Carbon;
use Illuminate\Support\Collection;

class TeamWorkDuration
{
    public static function totalSecondsForUserInRange(int $userId, string $from, string $to): int
    {
        $total = 0;

        foreach (self::sessionsForUserInRange($userId, $from, $to) as $session) {
            $total += self::secondsForSession($session, $to);
        }

        return $total;
    }

    public static function formattedLabel(int $seconds): string
    {
        if ($seconds <= 0) {
            return '0 minutos';
        }

        $hours = intdiv($seconds, 3600);
        $minutes = intdiv($seconds % 3600, 60);
        $parts = [];

        if ($hours > 0) {
            $parts[] = $hours === 1 ? '1 hora' : "{$hours} horas";
        }

        if ($minutes > 0 || $hours === 0) {
            $parts[] = $minutes === 1 ? '1 minuto' : "{$minutes} minutos";
        }

        return implode(' y ', $parts);
    }

    /**
     * @return Collection<int, CashSession>
     */
    private static function sessionsForUserInRange(int $userId, string $from, string $to): Collection
    {
        return CashSession::query()
            ->live()
            ->where('user_id', $userId)
            ->where(function ($query) use ($from, $to) {
                $query->whereBetween('capture_date', [$from, $to])
                    ->orWhere(function ($inner) use ($from, $to) {
                        $inner->whereDate('started_at', '>=', $from)
                            ->whereDate('started_at', '<=', $to);
                    });
            })
            ->get(['id', 'user_id', 'started_at', 'ended_at', 'status', 'capture_date']);
    }

    private static function secondsForSession(CashSession $session, string $rangeEndDate): int
    {
        if ($session->started_at === null) {
            return 0;
        }

        $started = $session->started_at->copy();
        $end = $session->ended_at?->copy();

        if ($end === null) {
            $today = now()->toDateString();

            if ($rangeEndDate >= $today) {
                $end = now();
            } else {
                $end = Carbon::parse($rangeEndDate)->endOfDay();
            }
        }

        if ($end->lte($started)) {
            return 0;
        }

        return (int) $started->diffInSeconds($end);
    }
}
