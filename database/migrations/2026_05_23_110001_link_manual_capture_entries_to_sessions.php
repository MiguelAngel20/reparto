<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('manual_capture_entries', function (Blueprint $table) {
            $table->foreignId('manual_capture_session_id')
                ->nullable()
                ->after('id')
                ->constrained()
                ->cascadeOnDelete();
        });

        $groups = DB::table('manual_capture_entries')
            ->select('user_id', 'capture_date')
            ->groupBy('user_id', 'capture_date')
            ->get();

        foreach ($groups as $group) {
            $sessionId = DB::table('manual_capture_sessions')->insertGetId([
                'user_id' => $group->user_id,
                'capture_date' => $group->capture_date,
                'started_at' => now(),
                'ended_at' => now(),
                'status' => 'closed',
                'created_at' => now(),
                'updated_at' => now(),
            ]);

            DB::table('manual_capture_entries')
                ->where('user_id', $group->user_id)
                ->where('capture_date', $group->capture_date)
                ->update(['manual_capture_session_id' => $sessionId]);
        }

        Schema::table('manual_capture_entries', function (Blueprint $table) {
            $table->dropForeign(['user_id']);
            $table->dropColumn(['user_id', 'capture_date']);
            $table->unsignedBigInteger('manual_capture_session_id')->nullable(false)->change();
        });
    }

    public function down(): void
    {
        Schema::table('manual_capture_entries', function (Blueprint $table) {
            $table->foreignId('user_id')->nullable()->after('id')->constrained()->cascadeOnDelete();
            $table->date('capture_date')->nullable();
        });

        $entries = DB::table('manual_capture_entries')
            ->join('manual_capture_sessions', 'manual_capture_sessions.id', '=', 'manual_capture_entries.manual_capture_session_id')
            ->select(
                'manual_capture_entries.id',
                'manual_capture_sessions.user_id',
                'manual_capture_sessions.capture_date',
            )
            ->get();

        foreach ($entries as $entry) {
            DB::table('manual_capture_entries')
                ->where('id', $entry->id)
                ->update([
                    'user_id' => $entry->user_id,
                    'capture_date' => $entry->capture_date,
                ]);
        }

        Schema::table('manual_capture_entries', function (Blueprint $table) {
            $table->dropConstrainedForeignId('manual_capture_session_id');
            $table->index(['user_id', 'capture_date']);
        });

        Schema::dropIfExists('manual_capture_sessions');
    }
};
