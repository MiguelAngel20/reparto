<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (! Schema::hasTable('card_account_movements')) {
            return;
        }

        if (! Schema::hasColumn('card_account_movements', 'movement_date')) {
            Schema::table('card_account_movements', function (Blueprint $table) {
                $table->date('movement_date')->nullable()->after('description');
            });
        }

        DB::table('card_account_movements')
            ->whereNull('movement_date')
            ->update(['movement_date' => DB::raw('DATE(created_at)')]);
    }

    public function down(): void
    {
        if (! Schema::hasTable('card_account_movements')) {
            return;
        }

        if (Schema::hasColumn('card_account_movements', 'movement_date')) {
            Schema::table('card_account_movements', function (Blueprint $table) {
                $table->dropColumn('movement_date');
            });
        }
    }
};
