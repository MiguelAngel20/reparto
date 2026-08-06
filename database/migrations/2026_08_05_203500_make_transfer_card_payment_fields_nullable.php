<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (! Schema::hasTable('user_transfer_cards')) {
            return;
        }

        DB::statement('ALTER TABLE `user_transfer_cards` MODIFY `card_number` VARCHAR(32) NULL');
        DB::statement('ALTER TABLE `user_transfer_cards` MODIFY `clabe` VARCHAR(18) NULL');
    }

    public function down(): void
    {
        if (! Schema::hasTable('user_transfer_cards')) {
            return;
        }

        DB::statement("UPDATE `user_transfer_cards` SET `card_number` = '' WHERE `card_number` IS NULL");
        DB::statement("UPDATE `user_transfer_cards` SET `clabe` = '' WHERE `clabe` IS NULL");
        DB::statement('ALTER TABLE `user_transfer_cards` MODIFY `card_number` VARCHAR(32) NOT NULL');
        DB::statement('ALTER TABLE `user_transfer_cards` MODIFY `clabe` VARCHAR(18) NOT NULL');
    }
};
