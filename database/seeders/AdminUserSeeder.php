<?php

namespace Database\Seeders;

use App\Models\User;
use Illuminate\Database\Seeder;

class AdminUserSeeder extends Seeder
{
    /**
     * Dueño del sistema (administrador principal).
     */
    public function run(): void
    {
        User::query()->updateOrCreate(
            ['email' => 'mangel20sr@gmail.com'],
            [
                'name' => 'Miguel Angel',
                'password' => '12344321',
                'company_name' => 'Clikio',
                'percentage' => 66.70,
                'role' => 'admin',
                'email_verified_at' => now(),
            ],
        );
    }
}
