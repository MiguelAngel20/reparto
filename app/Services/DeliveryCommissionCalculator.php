<?php

namespace App\Services;

class DeliveryCommissionCalculator
{
    /**
     * @return array{user_commission: float, clikio_commission: float}
     */
    public static function fromServiceCost(float $serviceCost, float $percentage): array
    {
        $userCommission = round($serviceCost * ($percentage / 100), 2);
        $clikioCommission = round($serviceCost - $userCommission, 2);

        return [
            'user_commission' => $userCommission,
            'clikio_commission' => $clikioCommission,
        ];
    }
}
