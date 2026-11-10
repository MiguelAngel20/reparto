<?php

use App\Models\CashSession;
use App\Models\DailyExpense;
use App\Models\PersonalService;
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('daily_expenses', function (Blueprint $table) {
            $table->foreignId('cash_session_id')
                ->nullable()
                ->after('user_id')
                ->constrained('cash_sessions')
                ->nullOnDelete();

            $table->index(['cash_session_id', 'expense_date']);
        });

        Schema::table('personal_services', function (Blueprint $table) {
            $table->foreignId('cash_session_id')
                ->nullable()
                ->after('user_id')
                ->constrained('cash_sessions')
                ->nullOnDelete();

            $table->index(['cash_session_id', 'service_date']);
        });

        DailyExpense::query()
            ->whereNull('cash_session_id')
            ->orderBy('id')
            ->each(function (DailyExpense $expense): void {
                $date = $expense->expense_date?->format('Y-m-d');
                if (! $date) {
                    return;
                }

                $session = CashSession::sessionForUserOnDate((int) $expense->user_id, $date);
                if ($session) {
                    $expense->update(['cash_session_id' => $session->id]);
                }
            });

        PersonalService::query()
            ->whereNull('cash_session_id')
            ->orderBy('id')
            ->each(function (PersonalService $service): void {
                $date = $service->service_date?->format('Y-m-d');
                if (! $date) {
                    return;
                }

                $session = CashSession::sessionForUserOnDate((int) $service->user_id, $date);
                if ($session) {
                    $service->update(['cash_session_id' => $session->id]);
                }
            });
    }

    public function down(): void
    {
        Schema::table('daily_expenses', function (Blueprint $table) {
            $table->dropConstrainedForeignId('cash_session_id');
        });

        Schema::table('personal_services', function (Blueprint $table) {
            $table->dropConstrainedForeignId('cash_session_id');
        });
    }
};
