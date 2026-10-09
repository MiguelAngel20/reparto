<?php

use App\Models\User;
use App\Models\UserSectionPermission;
use App\Services\UserSectionPermissionService;
use App\Support\UserSection;
use Illuminate\Database\Migrations\Migration;

return new class extends Migration
{
    public function up(): void
    {
        $service = app(UserSectionPermissionService::class);

        User::query()
            ->where('role', '!=', User::ROLE_ADMIN)
            ->each(function (User $user) use ($service): void {
                $service->ensureSectionPermissionRow($user, UserSection::DEBTORS);

                UserSectionPermission::query()
                    ->where('user_id', $user->id)
                    ->where('section', UserSection::DEBTORS)
                    ->update([
                        'can_view' => true,
                        'can_edit' => true,
                    ]);
            });
    }

    public function down(): void
    {
        UserSectionPermission::query()
            ->where('section', UserSection::DEBTORS)
            ->delete();
    }
};
