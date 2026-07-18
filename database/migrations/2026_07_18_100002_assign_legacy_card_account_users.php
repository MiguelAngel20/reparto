<?php

use App\Models\CardAccount;
use App\Models\User;
use App\Models\UserSectionPermission;
use App\Support\UserSection;
use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        if (DB::table('card_account_user')->count() > 0) {
            return;
        }

        $repartidorIds = User::query()
            ->where('role', User::ROLE_REPARTIDOR)
            ->pluck('id');

        $userIdsWithCardSection = UserSectionPermission::query()
            ->where('section', UserSection::CARD_ACCOUNT)
            ->whereIn('user_id', $repartidorIds)
            ->pluck('user_id')
            ->unique()
            ->values();

        if ($userIdsWithCardSection->isEmpty()) {
            return;
        }

        CardAccount::query()->each(function (CardAccount $account) use ($userIdsWithCardSection) {
            $account->assignedUsers()->syncWithoutDetaching($userIdsWithCardSection->all());
        });
    }

    public function down(): void
    {
        //
    }
};
