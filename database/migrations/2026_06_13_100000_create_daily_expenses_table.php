<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('daily_expenses', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->date('expense_date');
            $table->string('name');
            $table->decimal('amount', 10, 2);
            $table->string('concept')->nullable();
            $table->timestamps();

            $table->index(['user_id', 'expense_date']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('daily_expenses');
    }
};
