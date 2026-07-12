<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('personal_services', function (Blueprint $table) {
            $table->string('status', 20)->default('completed')->after('user_id');
            $table->decimal('spent_amount', 10, 2)->nullable()->after('amount');
            $table->timestamp('started_at')->nullable()->after('description');
        });
    }

    public function down(): void
    {
        Schema::table('personal_services', function (Blueprint $table) {
            $table->dropColumn(['status', 'spent_amount', 'started_at']);
        });
    }
};
