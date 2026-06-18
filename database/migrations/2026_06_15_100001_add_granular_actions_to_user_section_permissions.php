<?php

use App\Models\User;
use App\Models\UserSectionPermission;
use App\Services\UserSectionPermissionService;
use App\Support\UserSection;
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (! Schema::hasColumn('user_section_permissions', 'can_create')) {
            Schema::table('user_section_permissions', function (Blueprint $table) {
                $table->boolean('can_create')->default(false)->after('can_edit');
                $table->boolean('can_update')->default(false)->after('can_create');
                $table->boolean('can_delete')->default(false)->after('can_update');
                $table->boolean('can_payment')->default(false)->after('can_delete');
                $table->boolean('can_liquidate')->default(false)->after('can_payment');
            });
        }

        $service = app(UserSectionPermissionService::class);

        User::query()
            ->where('role', '!=', User::ROLE_ADMIN)
            ->each(function (User $user) use ($service) {
                if (! UserSectionPermission::query()->where('user_id', $user->id)->exists()) {
                    $service->applyDefaultPermissions($user);

                    return;
                }

                UserSectionPermission::query()
                    ->where('user_id', $user->id)
                    ->where('section', UserSection::CARD_ACCOUNT)
                    ->delete();

                $service->ensureSectionPermissionRow($user, UserSection::CARD_ACCOUNT);
            });
    }

    public function down(): void
    {
        if (Schema::hasColumn('user_section_permissions', 'can_create')) {
            Schema::table('user_section_permissions', function (Blueprint $table) {
                $table->dropColumn([
                    'can_create',
                    'can_update',
                    'can_delete',
                    'can_payment',
                    'can_liquidate',
                ]);
            });
        }
    }
};
