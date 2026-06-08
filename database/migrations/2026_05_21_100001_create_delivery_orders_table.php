<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('delivery_orders', function (Blueprint $table) {
            $table->id();
            $table->foreignId('cash_session_id')->constrained()->cascadeOnDelete();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->string('name');
            $table->decimal('service_cost', 10, 2);
            $table->decimal('user_percentage', 5, 2);
            $table->decimal('user_commission', 10, 2);
            $table->decimal('clikio_commission', 10, 2);
            $table->string('order_type', 30)->default('service_only');
            $table->decimal('product_cost', 10, 2)->nullable();
            $table->decimal('cash_spent', 10, 2)->nullable();
            $table->decimal('cash_received', 10, 2)->nullable();
            $table->decimal('clikio_extra', 10, 2)->nullable();
            $table->decimal('box_adjustment', 10, 2)->nullable();
            $table->timestamp('started_at');
            $table->timestamp('completed_at')->nullable();
            $table->unsignedInteger('duration_seconds')->nullable();
            $table->string('status', 20)->default('in_progress');
            $table->text('notes')->nullable();
            $table->timestamps();

            $table->index(['cash_session_id', 'status']);
            $table->index(['user_id', 'status']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('delivery_orders');
    }
};
