<?php

use App\Models\CardAccount;
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('card_accounts', function (Blueprint $table) {
            $table->string('account_holder_name')->nullable()->after('holder_name');
            $table->string('bank_type')->nullable()->after('account_holder_name');
            $table->string('account_number')->nullable()->after('bank_type');
            $table->decimal('initial_real_balance', 12, 2)->nullable()->after('account_number');
        });

        Schema::table('card_account_movements', function (Blueprint $table) {
            $table->string('payment_method', 16)->nullable()->after('type');
        });

        CardAccount::query()
            ->whereNull('account_holder_name')
            ->whereNotNull('holder_name')
            ->each(function (CardAccount $account) {
                $account->update(['account_holder_name' => $account->holder_name]);
            });
    }

    public function down(): void
    {
        Schema::table('card_account_movements', function (Blueprint $table) {
            $table->dropColumn('payment_method');
        });

        Schema::table('card_accounts', function (Blueprint $table) {
            $table->dropColumn([
                'account_holder_name',
                'bank_type',
                'account_number',
                'initial_real_balance',
            ]);
        });
    }
};
