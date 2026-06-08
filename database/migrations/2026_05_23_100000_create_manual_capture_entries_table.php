<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('manual_capture_entries', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->date('capture_date');
            $table->string('name');
            $table->decimal('service_cost', 10, 2);
            $table->decimal('user_percentage', 5, 2);
            $table->decimal('user_commission', 10, 2);
            $table->decimal('clikio_commission', 10, 2);
            $table->decimal('user_extra', 10, 2)->nullable();
            $table->decimal('clikio_extra', 10, 2)->nullable();
            $table->decimal('discount', 10, 2)->nullable();
            $table->string('client_payment_mode', 20)->default('cash');
            $table->decimal('transfer_discount', 10, 2)->nullable();
            $table->timestamps();

            $table->index(['user_id', 'capture_date']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('manual_capture_entries');
    }
};
