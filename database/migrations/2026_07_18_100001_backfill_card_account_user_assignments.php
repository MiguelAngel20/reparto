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
        if (DB::table('card_account_user')->exists()) {
            return;
        }

        $usersWithCardAccess = UserSectionPermission::query()
            ->where('section', UserSection::CARD_ACCOUNT)
            ->where(function ($query) {
                $query->where('can_view', true)
                    ->orWhere('can_create', true)
                    ->orWhere('can_update', true)
                    ->orWhere('can_delete', true)
                    ->orWhere('can_payment', true)
                    ->orWhere('can_liquidate', true);
            })
            ->pluck('user_id');

        CardAccount::query()->each(function (CardAccount $account) use ($usersWithCardAccess) {
            $userIds = collect([$account->user_id])
                ->merge($usersWithCardAccess)
                ->filter()
                ->unique()
                ->reject(function (int $userId) {
                    $user = User::query()->find($userId);

                    return $user === null || $user->isAdmin();
                })
                ->values()
                ->all();

            if ($userIds === []) {
                return;
            }

            $account->assignedUsers()->syncWithoutDetaching($userIds);
        });
    }

    public function down(): void
    {
        //
    }
};
