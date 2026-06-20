<?php

use App\Models\CardAccount;
use App\Models\CardAccountMovement;
use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (! Schema::hasTable('card_accounts') || ! Schema::hasTable('card_account_movements')) {
            return;
        }

        $openAccounts = CardAccount::query()
            ->where('status', CardAccount::STATUS_OPEN)
            ->orderBy('id')
            ->get();

        if ($openAccounts->count() <= 1) {
            return;
        }

        $primary = $openAccounts->first();

        foreach ($openAccounts->skip(1) as $duplicate) {
            CardAccountMovement::query()
                ->where('card_account_id', $duplicate->id)
                ->update(['card_account_id' => $primary->id]);

            $duplicate->update([
                'status' => CardAccount::STATUS_CLOSED,
                'closed_at' => now(),
            ]);
        }
    }

    public function down(): void
    {
        // No reversible: las cuentas duplicadas ya fueron cerradas y fusionadas.
    }
};
