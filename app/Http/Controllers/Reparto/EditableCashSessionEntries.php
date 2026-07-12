<?php

namespace App\Http\Controllers\Reparto;

use App\Models\CashSession;
use App\Models\DeliveryOrder;
use App\Services\CompanyBalanceService;
use App\Services\DeliveryCommissionCalculator;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;

trait EditableCashSessionEntries
{
    abstract protected function companyBalance(): CompanyBalanceService;

    protected function assertEditableSession(Request $request, CashSession $session): void
    {
        abort_unless($session->user_id === $request->user()->id, 403);

        if ($session->isLive() && $session->isOpen()) {
            abort(403, 'Cierra la jornada en curso antes de editarla aquí.');
        }
    }

    protected function assertOrderBelongsToSession(DeliveryOrder $order, CashSession $session): void
    {
        abort_unless($order->cash_session_id === $session->id, 403);
    }

    protected function assertCanDeleteOrderInSession(CashSession $session): void
    {
        abort_unless(
            $session->isManual() || ($session->isLive() && $session->status === CashSession::STATUS_CLOSED),
            403,
            'No puedes eliminar pedidos de esta jornada.',
        );
    }

    protected function deleteCompletedOrderFromSession(CashSession $session, DeliveryOrder $order): void
    {
        abort_unless($order->status === DeliveryOrder::STATUS_COMPLETED, 403);

        $order->delete();
        $this->refreshCompanyBalanceIfNeeded($session);
    }

    /**
     * @param  array<string, mixed>  $validated
     * @return array<string, mixed>
     */
    protected function buildOrderAttributes(
        $user,
        CashSession $session,
        array $validated,
        ?DeliveryOrder $existing = null,
    ): array {
        $serviceCost = (float) $validated['service_cost'];
        $manualDiscount = $validated['discount'] ?? null;

        $percentage = (float) $user->percentage;
        if ($percentage <= 0 && $existing) {
            $percentage = (float) $existing->user_percentage;
        }

        $commissions = DeliveryCommissionCalculator::fromServiceCost(
            $serviceCost,
            $percentage,
        );

        $financial = [
            'name' => trim($validated['name']),
            'service_cost' => $serviceCost,
            'user_percentage' => $percentage,
            'user_commission' => $commissions['user_commission'],
            'clikio_commission' => $commissions['clikio_commission'],
            'user_extra' => $validated['user_extra'] ?? null,
            'clikio_extra' => $validated['clikio_extra'] ?? null,
            'discount' => $manualDiscount,
            'client_payment_mode' => DeliveryOrder::PAYMENT_CASH,
            'transfer_discount' => null,
        ];

        if ($existing && $session->isLive()) {
            return array_merge(
                $existing->only([
                    'cash_session_id',
                    'user_id',
                    'order_type',
                    'product_cost',
                    'cash_spent',
                    'cash_received',
                    'cash_collected',
                    'box_adjustment',
                    'started_at',
                    'completed_at',
                    'duration_seconds',
                    'status',
                    'notes',
                ]),
                $financial,
            );
        }

        $captureAt = Carbon::parse(
            $this->dateOnlyString($session->getRawOriginal('capture_date') ?? $session->started_at),
        )->startOfDay();

        return array_merge($financial, [
            'cash_session_id' => $session->id,
            'user_id' => $user->id,
            'order_type' => DeliveryOrder::TYPE_SERVICE_ONLY,
            'started_at' => $captureAt,
            'completed_at' => $captureAt,
            'duration_seconds' => null,
            'status' => DeliveryOrder::STATUS_COMPLETED,
        ]);
    }

    protected function refreshCompanyBalanceIfNeeded(CashSession $session): void
    {
        if ($session->status !== CashSession::STATUS_CLOSED) {
            return;
        }

        $session->refresh();
        $this->companyBalance()->refreshSessionSettlement($session);
    }

    protected function syncOrderCommissions(DeliveryOrder $order, float $profilePercentage): void
    {
        if ($profilePercentage <= 0) {
            return;
        }

        $commissions = DeliveryCommissionCalculator::fromServiceCost(
            (float) $order->service_cost,
            $profilePercentage,
        );

        $needsUpdate = round((float) $order->user_commission, 2) !== $commissions['user_commission']
            || round((float) $order->clikio_commission, 2) !== $commissions['clikio_commission']
            || round((float) $order->user_percentage, 2) !== round($profilePercentage, 2);

        if ($needsUpdate) {
            $order->update([
                'user_percentage' => $profilePercentage,
                'user_commission' => $commissions['user_commission'],
                'clikio_commission' => $commissions['clikio_commission'],
            ]);
        }
    }
}
