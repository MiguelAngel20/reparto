<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('company_balance_movements', function (Blueprint $table) {
            $table->timestamp('amount_locked_at')->nullable()->after('notes');
        });
    }

    public function down(): void
    {
        Schema::table('company_balance_movements', function (Blueprint $table) {
            $table->dropColumn('amount_locked_at');
        });
    }
};
