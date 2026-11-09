<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('msi_accounts', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->string('name');
            $table->timestamps();

            $table->index(['user_id', 'name']);
        });

        Schema::create('msi_purchases', function (Blueprint $table) {
            $table->id();
            $table->foreignId('msi_account_id')->constrained('msi_accounts')->cascadeOnDelete();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->string('name');
            $table->decimal('original_amount', 12, 2);
            $table->unsignedSmallInteger('months_total');
            $table->decimal('monthly_amount', 12, 2);
            $table->date('first_due_date');
            $table->date('debt_start_date')->nullable();
            $table->string('status', 20)->default('active');
            $table->text('notes')->nullable();
            $table->timestamps();

            $table->index(['msi_account_id', 'status']);
            $table->index(['user_id', 'status']);
        });

        Schema::create('msi_installments', function (Blueprint $table) {
            $table->id();
            $table->foreignId('msi_purchase_id')->constrained('msi_purchases')->cascadeOnDelete();
            $table->unsignedSmallInteger('number');
            $table->date('due_date');
            $table->decimal('amount', 12, 2);
            $table->date('paid_at')->nullable();
            $table->timestamps();

            $table->unique(['msi_purchase_id', 'number']);
            $table->index(['msi_purchase_id', 'paid_at']);
            $table->index(['due_date', 'paid_at']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('msi_installments');
        Schema::dropIfExists('msi_purchases');
        Schema::dropIfExists('msi_accounts');
    }
};
