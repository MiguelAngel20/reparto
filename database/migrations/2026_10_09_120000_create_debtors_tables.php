<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('debtors', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->string('name');
            $table->timestamps();

            $table->index(['user_id', 'name']);
        });

        Schema::create('debtor_movements', function (Blueprint $table) {
            $table->id();
            $table->foreignId('debtor_id')->constrained()->cascadeOnDelete();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->string('type', 20);
            $table->string('name');
            $table->decimal('amount', 12, 2);
            $table->date('movement_date');
            $table->timestamps();

            $table->index(['debtor_id', 'movement_date']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('debtor_movements');
        Schema::dropIfExists('debtors');
    }
};
