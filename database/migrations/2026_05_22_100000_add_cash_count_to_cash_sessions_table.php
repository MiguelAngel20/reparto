<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('cash_sessions', function (Blueprint $table) {
            $table->decimal('counted_amount', 12, 2)->nullable()->after('initial_amount');
            $table->decimal('cash_difference', 12, 2)->nullable()->after('counted_amount');
        });
    }

    public function down(): void
    {
        Schema::table('cash_sessions', function (Blueprint $table) {
            $table->dropColumn(['counted_amount', 'cash_difference']);
        });
    }
};
