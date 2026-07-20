<?php

namespace App\Support;

use Illuminate\Http\Request;
use Illuminate\Support\Carbon;

class DateRangeQuery
{
    /**
     * @return array{0: string, 1: string}
     */
    public static function resolve(Request $request): array
    {
        $today = now()->toDateString();
        $from = (string) $request->query('from', $today);
        $to = (string) $request->query('to', $today);

        if (! self::isValidDate($from)) {
            $from = $today;
        }

        if (! self::isValidDate($to)) {
            $to = $today;
        }

        if ($from > $to) {
            [$from, $to] = [$to, $from];
        }

        return [$from, $to];
    }

    public static function isValidDate(string $value): bool
    {
        if (! preg_match('/^\d{4}-\d{2}-\d{2}$/', $value)) {
            return false;
        }

        return Carbon::hasFormat($value, 'Y-m-d');
    }

    public static function formatLabel(string $from, string $to): string
    {
        if ($from === $to) {
            return Carbon::parse($from)->format('d/m/Y');
        }

        return Carbon::parse($from)->format('d/m/Y').' – '.Carbon::parse($to)->format('d/m/Y');
    }

    public static function isSingleDay(string $from, string $to): bool
    {
        return $from === $to;
    }

    public static function isTodayRange(string $from, string $to): bool
    {
        $today = now()->toDateString();

        return $from === $today && $to === $today;
    }
}
