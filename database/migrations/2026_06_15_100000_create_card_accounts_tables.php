<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (! Schema::hasTable('card_accounts')) {
            Schema::create('card_accounts', function (Blueprint $table) {
                $table->id();
                $table->foreignId('user_id')->constrained()->cascadeOnDelete();
                $table->string('holder_name')->nullable();
                $table->string('status', 16)->default('open');
                $table->timestamp('closed_at')->nullable();
                $table->timestamps();

                $table->index(['user_id', 'status']);
            });
        }

        if (! Schema::hasTable('card_account_movements')) {
            Schema::create('card_account_movements', function (Blueprint $table) {
                $table->id();
                $table->foreignId('card_account_id')->constrained()->cascadeOnDelete();
                $table->foreignId('user_id')->constrained()->cascadeOnDelete();
                $table->string('type', 16);
                $table->string('name');
                $table->decimal('amount', 12, 2);
                $table->string('description')->nullable();
                $table->timestamps();

                $table->index(['card_account_id', 'created_at']);
            });
        }
    }

    public function down(): void
    {
        Schema::dropIfExists('card_account_movements');
        Schema::dropIfExists('card_accounts');
    }
};
