<?php

namespace App\Http\Controllers\Reparto;

use App\Models\CashSession;
use App\Models\DeliveryOrder;
use App\Models\DeliveryOrderItem;
use App\Services\CashSessionSummary;
use App\Services\DailyEarningsHelper;
use App\Services\DeliveryCommissionCalculator;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

trait RepartoFormatter
{
    protected function formatCashSession(CashSession $session): array
    {
        $workDuration = $this->calculateWorkDuration($session->started_at, $session->ended_at);

        return [
            'id' => $session->id,
            'initial_amount' => (float) $session->initial_amount,
            'counted_amount' => $session->counted_amount !== null ? (float) $session->counted_amount : null,
            'cash_difference' => $session->cash_difference !== null ? (float) $session->cash_difference : null,
            'started_at' => $session->started_at?->toIso8601String(),
            'started_at_formatted' => $session->started_at?->format('d/m/Y H:i'),
            'ended_at' => $session->ended_at?->toIso8601String(),
            'ended_at_formatted' => $session->ended_at?->format('d/m/Y H:i'),
            'status' => $session->status,
            'notes' => $session->notes,
            'orders_count' => (int) ($session->orders_count ?? $session->orders()->count()),
            'completed_orders_count' => (int) ($session->completed_orders_count
                ?? $session->orders()->where('status', DeliveryOrder::STATUS_COMPLETED)->count()),
            'work_duration_seconds' => $workDuration['seconds'] ?? null,
            'work_duration_hours' => $workDuration['hours'] ?? null,
            'work_duration_minutes' => $workDuration['minutes'] ?? null,
            'work_duration_formatted' => $workDuration['formatted'] ?? null,
        ];
    }

    /**
     * @return array{seconds: int, hours: int, minutes: int, formatted: string}|null
     */
    protected function calculateWorkDuration($startedAt, $endedAt): ?array
    {
        if (! $startedAt || ! $endedAt) {
            return null;
        }

        $seconds = (int) $startedAt->diffInSeconds($endedAt);
        $hours = intdiv($seconds, 3600);
        $minutes = intdiv($seconds % 3600, 60);

        return [
            'seconds' => $seconds,
            'hours' => $hours,
            'minutes' => $minutes,
            'formatted' => $this->formatWorkDurationLabel($hours, $minutes),
        ];
    }

    protected function formatWorkDurationLabel(int $hours, int $minutes): string
    {
        $parts = [];

        if ($hours > 0) {
            $parts[] = $hours === 1 ? '1 hora' : "{$hours} horas";
        }

        if ($minutes > 0 || $hours === 0) {
            $parts[] = $minutes === 1 ? '1 minuto' : "{$minutes} minutos";
        }

        return implode(' y ', $parts);
    }

    protected function purchaseAmountForOrder(DeliveryOrder $order): float
    {
        if ($order->order_type !== DeliveryOrder::TYPE_CASH_OUT) {
            return 0.0;
        }

        if ($order->relationLoaded('items') && $order->items->isNotEmpty()) {
            $fromList = $order->items->sum(fn ($item) => (float) $item->price);
            if ($fromList > 0) {
                return round($fromList, 2);
            }
        }

        if ($order->cash_spent !== null) {
            return round((float) $order->cash_spent, 2);
        }

        return 0.0;
    }

    protected function clientChargeForOrder(DeliveryOrder $order): float
    {
        return round($this->purchaseAmountForOrder($order) + (float) $order->service_cost, 2);
    }

    protected function formatSessionOrderRow(DeliveryOrder $order): array
    {
        $userExtra = (float) ($order->user_extra ?? 0);
        $clikioExtra = (float) ($order->clikio_extra ?? 0);
        $commissions = DeliveryCommissionCalculator::fromServiceCost(
            (float) $order->service_cost,
            (float) $order->user_percentage,
        );
        $userCommission = $commissions['user_commission'];
        $clikioCommission = $commissions['clikio_commission'];
        $manualDiscount = (float) ($order->discount ?? 0);
        $transferDiscount = (float) ($order->transfer_discount ?? 0);

        return [
            'id' => $order->id,
            'name' => trim($order->name) !== '' ? $order->name : '—',
            'service_cost' => (float) $order->service_cost,
            'user_commission' => $userCommission,
            'clikio_commission' => $clikioCommission,
            'user_extra' => $userExtra,
            'clikio_extra' => $clikioExtra,
            'clikio_discounts' => round($manualDiscount + $transferDiscount, 2),
            'client_charge' => $this->clientChargeForOrder($order),
        ];
    }

    protected function formatOrderItem(DeliveryOrderItem $item): array
    {
        return [
            'id' => $item->id,
            'description' => $item->description,
            'price' => (float) $item->price,
            'is_completed' => $item->is_completed,
            'sort_order' => $item->sort_order,
        ];
    }

    protected function formatOrder(DeliveryOrder $order, bool $withItems = true): array
    {
        $data = [
            'id' => $order->id,
            'cash_session_id' => $order->cash_session_id,
            'name' => $order->name,
            'service_cost' => (float) $order->service_cost,
            'user_percentage' => (float) $order->user_percentage,
            'user_commission' => (float) $order->user_commission,
            'clikio_commission' => (float) $order->clikio_commission,
            'user_extra' => $order->user_extra !== null ? (float) $order->user_extra : null,
            'order_type' => $order->order_type,
            'order_type_label' => DeliveryOrder::typeLabels()[$order->order_type] ?? $order->order_type,
            'product_cost' => $order->product_cost !== null ? (float) $order->product_cost : null,
            'cash_spent' => $order->cash_spent !== null ? (float) $order->cash_spent : null,
            'cash_received' => $order->cash_received !== null ? (float) $order->cash_received : null,
            'clikio_extra' => $order->clikio_extra !== null ? (float) $order->clikio_extra : null,
            'discount' => $order->discount !== null ? (float) $order->discount : null,
            'client_payment_mode' => $order->client_payment_mode ?? DeliveryOrder::PAYMENT_CASH,
            'client_payment_mode_label' => DeliveryOrder::paymentModeLabels()[$order->client_payment_mode ?? DeliveryOrder::PAYMENT_CASH] ?? 'Efectivo',
            'cash_collected' => $order->cash_collected !== null ? (float) $order->cash_collected : null,
            'transfer_discount' => $order->transfer_discount !== null ? (float) $order->transfer_discount : null,
            'box_adjustment' => $order->box_adjustment !== null ? (float) $order->box_adjustment : null,
            'started_at' => $order->started_at?->toIso8601String(),
            'started_at_formatted' => $order->started_at?->format('d/m/Y H:i'),
            'completed_at' => $order->completed_at?->toIso8601String(),
            'completed_at_formatted' => $order->completed_at?->format('d/m/Y H:i'),
            'duration_seconds' => $order->duration_seconds,
            'status' => $order->status,
            'notes' => $order->notes,
        ];

        if ($withItems) {
            $data['items'] = $order->relationLoaded('items')
                ? $order->items->map(fn ($item) => $this->formatOrderItem($item))->values()->all()
                : [];
        }

        return $data;
    }

    /**
     * @return array{id: int, name: string, label: string, started_at: ?string, is_current: bool}
     */
    protected function formatActiveOrderSummary(DeliveryOrder $order, ?int $currentOrderId = null): array
    {
        $name = trim((string) $order->name);

        return [
            'id' => $order->id,
            'name' => $name,
            'label' => $name !== '' ? $name : 'Sin nombre',
            'started_at' => $order->started_at?->toIso8601String(),
            'is_current' => $currentOrderId !== null && $order->id === $currentOrderId,
        ];
    }

    protected function formatSessionWithSummary(CashSession $session, ?int $userId = null): array
    {
        $summary = CashSessionSummary::forSession($session);

        $totalClikioDiscounts = round(
            $summary['total_transfer_discount'] + $summary['total_manual_discount'],
            2,
        );

        $data = array_merge(
            $this->formatSessionCard($session),
            $summary,
            [
                'count' => $summary['completed_orders_count'],
                'total_service' => $summary['total_service'],
                'total_service_cash_in' => $summary['total_service_cash_in'],
                'total_cash_movements' => $summary['total_cash'],
                'user_earnings' => $summary['user_earnings'],
                'user_commission' => round($summary['user_earnings'] - $summary['total_user_extra'], 2),
                'clikio_earnings' => $summary['clikio_earnings'],
                'clikio_earnings_gross' => $summary['clikio_earnings_gross'],
                'total_clikio_commission' => $summary['total_clikio_commission'],
                'total_user_extra' => $summary['total_user_extra'],
                'total_clikio_extra' => $summary['total_clikio_extra'],
                'total_clikio_discounts' => $totalClikioDiscounts,
                'clikio_settlement' => $summary['clikio_settlement'],
            ],
        );

        if ($userId !== null && ! empty($data['capture_date'])) {
            $day = DailyEarningsHelper::daySummaryForUser($userId, $data['capture_date']);
            $data['net_earnings'] = $day['net_earnings'];
        }

        return $data;
    }

    protected function formatSessionCard(CashSession $session): array
    {
        $captureDate = $this->dateOnlyString($session->getRawOriginal('capture_date'));

        $displayDate = $session->isManual()
            ? $captureDate
            : $this->dateOnlyString($session->started_at);

        $base = $session->isManual()
            ? []
            : array_merge($this->formatCashSession($session), [
                'orders_count' => (int) ($session->orders_count ?? 0),
                'completed_orders_count' => (int) ($session->completed_orders_count ?? 0),
            ]);

        return array_merge($base, [
            'id' => $session->id,
            'capture_date' => $displayDate,
            'capture_date_formatted' => $this->formatDateOnly($displayDate),
            'session_type' => $session->session_type,
            'session_type_label' => $session->isManual() ? 'Captura manual' : 'Iniciar jornada',
            'status' => $session->status,
            'entries_count' => (int) ($session->entries_count ?? $session->completed_orders_count ?? 0),
            'notes' => $session->notes,
        ]);
    }

    protected function dateOnlyString(mixed $value): string
    {
        if ($value instanceof \DateTimeInterface) {
            return $value->format('Y-m-d');
        }

        return substr((string) $value, 0, 10);
    }

    protected function formatDateOnly(string $date): string
    {
        [$year, $month, $day] = explode('-', $this->dateOnlyString($date));

        return "{$day}/{$month}/{$year}";
    }

    protected function renderSessionView(Request $request, CashSession $session, string $origin): Response
    {
        abort_unless($session->user_id === $request->user()->id, 403);
        abort_unless(
            $session->status === CashSession::STATUS_CLOSED,
            403,
            'Solo puedes consultar jornadas cerradas.',
        );

        $user = $request->user();

        $session->loadCount([
            'orders as entries_count' => fn ($q) => $q->where('status', DeliveryOrder::STATUS_COMPLETED),
        ]);

        $sessionData = $this->formatSessionWithSummary($session, $user->id);

        if ($session->isLive()) {
            $sessionData = array_merge($sessionData, $this->formatCashSession($session));
        }

        $orders = $session->orders()
            ->where('status', DeliveryOrder::STATUS_COMPLETED)
            ->orderBy('completed_at')
            ->orderBy('id')
            ->get()
            ->map(fn (DeliveryOrder $order) => $this->formatSessionOrderRow($order))
            ->values()
            ->all();

        [$backUrl, $backLabel, $pageTitle] = match ($origin) {
            'reparto' => [route('reparto.index'), 'Iniciar jornada', 'Detalle de jornada'],
            default => [route('manual-capture.index'), 'Captura manual', 'Detalle de captura'],
        };

        return Inertia::render('Reparto/SessionShow', [
            'session' => $sessionData,
            'orders' => $orders,
            'companyName' => $user->company_name ?? 'Clikio',
            'backUrl' => $backUrl,
            'backLabel' => $backLabel,
            'pageTitle' => $pageTitle,
        ]);
    }

    protected function renderSessionEdit(Request $request, CashSession $session): Response
    {
        abort_unless($session->isLive(), 404);
        abort_unless($session->user_id === $request->user()->id, 403);
        abort_unless(
            $session->status === CashSession::STATUS_CLOSED,
            403,
            'Solo puedes editar jornadas cerradas.',
        );

        $user = $request->user();

        $session->loadCount([
            'orders as entries_count' => fn ($q) => $q->where('status', DeliveryOrder::STATUS_COMPLETED),
        ]);

        $sessionData = array_merge(
            $this->formatSessionWithSummary($session, $user->id),
            $this->formatCashSession($session),
        );

        $orders = $session->orders()
            ->where('status', DeliveryOrder::STATUS_COMPLETED)
            ->orderBy('completed_at')
            ->orderBy('id')
            ->get();

        foreach ($orders as $order) {
            $this->syncOrderCommissions($order, (float) $user->percentage);
        }

        $entries = $orders
            ->map(fn (DeliveryOrder $order) => $this->formatSessionOrderRow($order->fresh()))
            ->values()
            ->all();

        return Inertia::render('Reparto/SessionEdit', [
            'session' => $sessionData,
            'entries' => $entries,
            'companyName' => $user->company_name ?? 'Clikio',
            'userPercentage' => (float) $user->percentage,
            'backUrl' => route('reparto.index'),
        ]);
    }
}
