<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('personal_service_items', function (Blueprint $table) {
            $table->id();
            $table->foreignId('personal_service_id')->constrained()->cascadeOnDelete();
            $table->string('description');
            $table->decimal('price', 12, 2)->default(0);
            $table->boolean('is_completed')->default(false);
            $table->unsignedInteger('sort_order')->default(0);
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('personal_service_items');
    }
};
