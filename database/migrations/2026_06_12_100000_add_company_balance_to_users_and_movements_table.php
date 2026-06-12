<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->decimal('company_balance', 12, 2)->default(0)->after('percentage');
        });

        Schema::create('company_balance_movements', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->string('type', 32);
            $table->decimal('amount', 12, 2);
            $table->decimal('balance_after', 12, 2);
            $table->foreignId('cash_session_id')->nullable()->constrained()->nullOnDelete();
            $table->string('notes')->nullable();
            $table->timestamps();

            $table->unique(['cash_session_id', 'type']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('company_balance_movements');

        Schema::table('users', function (Blueprint $table) {
            $table->dropColumn('company_balance');
        });
    }
};
