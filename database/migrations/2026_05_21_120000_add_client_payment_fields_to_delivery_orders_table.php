<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('delivery_orders', function (Blueprint $table) {
            $table->string('client_payment_mode', 20)->default('cash')->after('clikio_extra');
            $table->decimal('cash_collected', 10, 2)->nullable()->after('client_payment_mode');
            $table->decimal('transfer_discount', 10, 2)->nullable()->after('cash_collected');
        });
    }

    public function down(): void
    {
        Schema::table('delivery_orders', function (Blueprint $table) {
            $table->dropColumn(['client_payment_mode', 'cash_collected', 'transfer_discount']);
        });
    }
};
