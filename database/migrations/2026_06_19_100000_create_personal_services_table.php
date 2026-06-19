<?php

use App\Models\User;
use App\Services\UserSectionPermissionService;
use App\Support\UserSection;
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (! Schema::hasTable('personal_services')) {
            Schema::create('personal_services', function (Blueprint $table) {
                $table->id();
                $table->foreignId('user_id')->constrained()->cascadeOnDelete();
                $table->date('service_date');
                $table->string('name');
                $table->decimal('amount', 10, 2);
                $table->string('description')->nullable();
                $table->timestamps();

                $table->index(['user_id', 'service_date']);
            });
        }

        $service = app(UserSectionPermissionService::class);

        User::query()
            ->where('role', '!=', User::ROLE_ADMIN)
            ->each(fn (User $user) => $service->ensureSectionPermissionRow($user, UserSection::PERSONAL_SERVICE));
    }

    public function down(): void
    {
        Schema::dropIfExists('personal_services');
    }
};
