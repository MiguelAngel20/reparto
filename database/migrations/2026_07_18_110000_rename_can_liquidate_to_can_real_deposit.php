<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (! Schema::hasColumn('user_section_permissions', 'can_liquidate')) {
            return;
        }

        Schema::table('user_section_permissions', function (Blueprint $table) {
            $table->renameColumn('can_liquidate', 'can_real_deposit');
        });
    }

    public function down(): void
    {
        if (! Schema::hasColumn('user_section_permissions', 'can_real_deposit')) {
            return;
        }

        Schema::table('user_section_permissions', function (Blueprint $table) {
            $table->renameColumn('can_real_deposit', 'can_liquidate');
        });
    }
};
