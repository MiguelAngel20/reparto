<?php

namespace App\Services;

use App\Models\CashSession;
use App\Models\DeliveryOrder;
use App\Services\DeliveryCommissionCalculator;

class CashSessionSummary
{
    /**
     * @return array{
     *     completed_orders_count: int,
     *     total_service: float,
     *     total_service_cash_in: float,
     *     total_cash: float,
     *     expected_cash_in_box: float,
     *     user_earnings: float,
     *     clikio_earnings: float,
     *     clikio_earnings_gross: float,
     *     total_clikio_commission: float,
     *     total_user_extra: float,
     *     total_clikio_extra: float,
     *     total_transfer_discount: float,
     *     total_manual_discount: float,
     *     clikio_settlement: float
     * }
     */
    public static function forSession(CashSession $session): array
    {
        $orders = $session->orders()
            ->where('status', DeliveryOrder::STATUS_COMPLETED)
            ->get();

        $totalCash = 0.0;
        $totalService = 0.0;
        $totalServiceCashIn = 0.0;
        $userEarnings = 0.0;
        $clikioEarnings = 0.0;
        $totalClikioCommission = 0.0;
        $totalUserExtra = 0.0;
        $totalClikioExtra = 0.0;
        $totalTransferDiscount = 0.0;
        $totalManualDiscount = 0.0;

        foreach ($orders as $order) {
            $commissions = DeliveryCommissionCalculator::fromServiceCost(
                (float) $order->service_cost,
                (float) $order->user_percentage,
            );

            $totalCash += self::netCashEffectFromOrder($order);
            $totalService += (float) $order->service_cost;
            $totalServiceCashIn += self::serviceCashInFromOrder($order);
            $userEarnings += $commissions['user_commission'] + (float) ($order->user_extra ?? 0);
            $totalClikioCommission += $commissions['clikio_commission'];
            $clikioEarnings += $commissions['clikio_commission'] + (float) ($order->clikio_extra ?? 0);
            $totalUserExtra += (float) ($order->user_extra ?? 0);
            $totalClikioExtra += (float) ($order->clikio_extra ?? 0);
            $totalTransferDiscount += (float) ($order->transfer_discount ?? 0);
            $totalManualDiscount += (float) ($order->discount ?? 0);
        }

        $clikioEarningsGross = round($clikioEarnings, 2);
        $clikioEarningsNet = round($clikioEarningsGross - $totalTransferDiscount, 2);
        $clikioSettlement = round($clikioEarningsNet - $totalManualDiscount, 2);

        $initialAmount = (float) $session->initial_amount;

        return [
            'completed_orders_count' => $orders->count(),
            'total_service' => round($totalService, 2),
            'total_service_cash_in' => round($totalServiceCashIn, 2),
            'total_cash' => round($totalCash, 2),
            'expected_cash_in_box' => round($initialAmount + $totalCash, 2),
            'user_earnings' => round($userEarnings, 2),
            'clikio_earnings' => $clikioEarningsNet,
            'clikio_earnings_gross' => $clikioEarningsGross,
            'total_clikio_commission' => round($totalClikioCommission, 2),
            'total_user_extra' => round($totalUserExtra, 2),
            'total_clikio_extra' => round($totalClikioExtra, 2),
            'total_transfer_discount' => round($totalTransferDiscount, 2),
            'total_manual_discount' => round($totalManualDiscount, 2),
            'clikio_settlement' => $clikioSettlement,
        ];
    }

    /**
     * Efectivo que te queda tras separar lo que debes a la empresa (cuadre teórico).
     */
    public static function yourCashAfterSettlement(float $expectedCashInBox, float $clikioSettlement): float
    {
        return round($expectedCashInBox - $clikioSettlement, 2);
    }

    /**
     * Efectivo neto en caja: servicios cobrados en efectivo + extras − descuentos manuales.
     * El descuento por transferencia no resta aquí (ya se refleja al no sumar ese servicio en efectivo);
     * ese descuento resta en las ganancias de la empresa.
     */
    public static function serviceCashInFromOrder(DeliveryOrder $order): float
    {
        $mode = $order->client_payment_mode ?? DeliveryOrder::PAYMENT_CASH;
        $serviceCost = (float) $order->service_cost;

        return match ($mode) {
            DeliveryOrder::PAYMENT_TRANSFER => 0.0,
            DeliveryOrder::PAYMENT_MIXED => min(
                $serviceCost,
                (float) ($order->cash_collected ?? 0),
            ),
            default => $serviceCost,
        };
    }

    public static function netCashEffectFromOrder(DeliveryOrder $order): float
    {
        $userExtra = (float) ($order->user_extra ?? 0);
        $clikioExtra = (float) ($order->clikio_extra ?? 0);
        $manualDiscount = (float) ($order->discount ?? 0);

        return round(
            self::serviceCashInFromOrder($order) + $userExtra + $clikioExtra - $manualDiscount,
            2
        );
    }
}
