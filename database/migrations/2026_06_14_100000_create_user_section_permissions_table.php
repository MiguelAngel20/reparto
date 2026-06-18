<?php

use App\Models\User;
use App\Services\UserSectionPermissionService;
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('user_section_permissions', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->string('section', 32);
            $table->boolean('can_view')->default(false);
            $table->boolean('can_edit')->default(false);
            $table->timestamps();

            $table->unique(['user_id', 'section']);
        });

        $service = app(UserSectionPermissionService::class);

        User::query()
            ->where('role', '!=', User::ROLE_ADMIN)
            ->each(fn (User $user) => $service->applyDefaultPermissions($user));
    }

    public function down(): void
    {
        Schema::dropIfExists('user_section_permissions');
    }
};
