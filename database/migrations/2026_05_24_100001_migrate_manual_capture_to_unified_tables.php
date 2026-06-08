<?php

use App\Models\DeliveryOrder;
use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (! Schema::hasTable('manual_capture_sessions')) {
            return;
        }

        $sessions = DB::table('manual_capture_sessions')->orderBy('id')->get();

        foreach ($sessions as $manualSession) {
            $cashSessionId = DB::table('cash_sessions')->insertGetId([
                'user_id' => $manualSession->user_id,
                'session_type' => 'manual',
                'capture_date' => $manualSession->capture_date,
                'initial_amount' => 0,
                'started_at' => $manualSession->started_at,
                'ended_at' => $manualSession->ended_at,
                'status' => 'closed',
                'notes' => $manualSession->notes,
                'created_at' => $manualSession->created_at,
                'updated_at' => $manualSession->updated_at,
            ]);

            $entries = DB::table('manual_capture_entries')
                ->where('manual_capture_session_id', $manualSession->id)
                ->orderBy('id')
                ->get();

            $captureAt = Carbon::parse($manualSession->capture_date)->startOfDay();

            foreach ($entries as $entry) {
                DB::table('delivery_orders')->insert([
                    'cash_session_id' => $cashSessionId,
                    'user_id' => $manualSession->user_id,
                    'name' => $entry->name,
                    'service_cost' => $entry->service_cost,
                    'user_percentage' => $entry->user_percentage,
                    'user_commission' => $entry->user_commission,
                    'clikio_commission' => $entry->clikio_commission,
                    'user_extra' => $entry->user_extra,
                    'order_type' => DeliveryOrder::TYPE_SERVICE_ONLY,
                    'clikio_extra' => $entry->clikio_extra,
                    'discount' => $entry->discount,
                    'client_payment_mode' => $entry->client_payment_mode,
                    'transfer_discount' => $entry->transfer_discount,
                    'started_at' => $captureAt,
                    'completed_at' => $captureAt,
                    'duration_seconds' => null,
                    'status' => DeliveryOrder::STATUS_COMPLETED,
                    'created_at' => $entry->created_at,
                    'updated_at' => $entry->updated_at,
                ]);
            }
        }
    }

    public function down(): void
    {
        DB::table('cash_sessions')->where('session_type', 'manual')->delete();
    }
};
