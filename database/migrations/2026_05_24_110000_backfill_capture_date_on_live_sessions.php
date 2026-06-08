<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        DB::table('cash_sessions')
            ->where('session_type', 'live')
            ->whereNull('capture_date')
            ->update([
                'capture_date' => DB::raw('DATE(started_at)'),
            ]);
    }

    public function down(): void
    {
        // No revert: capture_date on live sessions is required for day rules.
    }
};
