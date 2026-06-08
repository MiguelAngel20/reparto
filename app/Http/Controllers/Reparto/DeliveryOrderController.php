<?php

namespace App\Http\Controllers\Reparto;

use App\Http\Controllers\Controller;
use App\Http\Requests\Reparto\FinalizeDeliveryOrderRequest;
use App\Http\Requests\Reparto\UpdateDeliveryOrderRequest;
use App\Models\CashSession;
use App\Models\DeliveryOrder;
use App\Models\DeliveryOrderItem;
use App\Services\DeliveryCommissionCalculator;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class DeliveryOrderController extends Controller
{
    use RepartoFormatter;

    public function start(Request $request): RedirectResponse
    {
        $user = $request->user();

        if (DeliveryOrder::activeForUser($user->id)) {
            return redirect()->route('reparto.orders.show', DeliveryOrder::activeForUser($user->id));
        }

        $session = CashSession::openLiveForUser($user->id);
        if (! $session) {
            return redirect()->route('reparto.index')->with('error', 'Abre una caja antes de iniciar un pedido.');
        }

        $defaultServiceCost = 60;
        $commissions = DeliveryCommissionCalculator::fromServiceCost(
            $defaultServiceCost,
            (float) $user->percentage,
        );

        $order = DeliveryOrder::create([
            'cash_session_id' => $session->id,
            'user_id' => $user->id,
            'name' => '',
            'service_cost' => $defaultServiceCost,
            'user_percentage' => $user->percentage,
            'user_commission' => $commissions['user_commission'],
            'clikio_commission' => $commissions['clikio_commission'],
            'order_type' => DeliveryOrder::TYPE_CASH_OUT,
            'client_payment_mode' => DeliveryOrder::PAYMENT_CASH,
            'started_at' => now(),
            'status' => DeliveryOrder::STATUS_IN_PROGRESS,
        ]);

        return redirect()->route('reparto.orders.show', $order);
    }

    public function show(Request $request, DeliveryOrder $order): Response|RedirectResponse
    {
        $this->authorizeOrder($request, $order);

        if (! $order->isInProgress()) {
            return redirect()->route('reparto.index');
        }

        $order->load('items');
        $user = $request->user();

        return Inertia::render('Reparto/Orders/Show', [
            'order' => $this->formatOrder($order),
            'userPercentage' => (float) $user->percentage,
            'companyName' => $user->company_name ?? 'Clikio',
        ]);
    }

    public function update(UpdateDeliveryOrderRequest $request, DeliveryOrder $order): RedirectResponse
    {
        $this->authorizeOrder($request, $order);

        if (! $order->isInProgress()) {
            return back()->with('error', 'Este pedido ya fue finalizado.');
        }

        $this->applyOrderData($order, $request->validated());

        return back();
    }

    public function complete(FinalizeDeliveryOrderRequest $request, DeliveryOrder $order): RedirectResponse
    {
        $this->authorizeOrder($request, $order);

        if (! $order->isInProgress()) {
            return back()->with('error', 'Este pedido ya fue finalizado.');
        }

        $this->applyOrderData($order, $request->validated());

        $completedAt = now();
        $durationSeconds = $order->started_at
            ? (int) $order->started_at->diffInSeconds($completedAt)
            : 0;

        $order->update([
            'status' => DeliveryOrder::STATUS_COMPLETED,
            'completed_at' => $completedAt,
            'duration_seconds' => $durationSeconds,
        ]);

        return redirect()
            ->route('reparto.index')
            ->with('success', 'Pedido finalizado. Tiempo: '.$this->formatDuration($durationSeconds));
    }

    public function cancel(Request $request, DeliveryOrder $order): RedirectResponse
    {
        $this->authorizeOrder($request, $order);

        if (! $order->isInProgress()) {
            return redirect()->route('reparto.index');
        }

        $order->delete();

        return redirect()->route('reparto.index')->with('success', 'Pedido cancelado.');
    }

    protected function applyOrderData(DeliveryOrder $order, array $validated): void
    {
        $serviceCost = (float) ($validated['service_cost'] ?? $order->service_cost);
        $commissions = DeliveryCommissionCalculator::fromServiceCost(
            $serviceCost,
            (float) $order->user_percentage,
        );

        $orderType = $validated['order_type'] ?? $order->order_type;
        $cashSpent = array_key_exists('cash_spent', $validated)
            ? ($validated['cash_spent'] !== null ? (float) $validated['cash_spent'] : null)
            : ($order->cash_spent !== null ? (float) $order->cash_spent : null);

        $paymentMode = $validated['client_payment_mode']
            ?? $order->client_payment_mode
            ?? DeliveryOrder::PAYMENT_CASH;

        $payment = $this->resolveClientPayment(
            $paymentMode,
            $serviceCost,
            isset($validated['cash_collected']) ? ($validated['cash_collected'] !== null ? (float) $validated['cash_collected'] : null) : ($order->cash_collected !== null ? (float) $order->cash_collected : null),
        );

        if ($paymentMode === DeliveryOrder::PAYMENT_TRANSFER) {
            $discountAmount = (float) ($validated['discount'] ?? $serviceCost);
            if ($discountAmount <= 0) {
                $discountAmount = $serviceCost;
            }
            $payment['transfer_discount'] = $discountAmount > 0 ? $discountAmount : null;
            $payment['box_adjustment'] = $discountAmount > 0 ? -$discountAmount : null;
            $manualDiscount = null;
        } else {
            $manualDiscount = array_key_exists('discount', $validated)
                ? $validated['discount']
                : $order->discount;
        }

        $order->update([
            'name' => $validated['name'] ?? $order->name,
            'service_cost' => $serviceCost,
            'user_commission' => $commissions['user_commission'],
            'clikio_commission' => $commissions['clikio_commission'],
            'order_type' => $validated['order_type'] ?? $order->order_type,
            'product_cost' => array_key_exists('product_cost', $validated)
                ? $validated['product_cost']
                : $order->product_cost,
            'cash_spent' => $cashSpent,
            'cash_received' => $payment['cash_received'],
            'user_extra' => array_key_exists('user_extra', $validated)
                ? $validated['user_extra']
                : $order->user_extra,
            'clikio_extra' => array_key_exists('clikio_extra', $validated)
                ? $validated['clikio_extra']
                : $order->clikio_extra,
            'discount' => $manualDiscount,
            'client_payment_mode' => $payment['client_payment_mode'],
            'cash_collected' => $payment['cash_collected'],
            'transfer_discount' => $payment['transfer_discount'],
            'box_adjustment' => $payment['box_adjustment'],
            'notes' => array_key_exists('notes', $validated) ? $validated['notes'] : $order->notes,
        ]);

        if (! array_key_exists('items', $validated) || ! is_array($validated['items'])) {
            return;
        }

        $order->items()->delete();
        foreach ($validated['items'] as $index => $item) {
            if (empty(trim($item['description'] ?? ''))) {
                continue;
            }
            DeliveryOrderItem::create([
                'delivery_order_id' => $order->id,
                'description' => trim($item['description']),
                'price' => $item['price'] ?? 0,
                'is_completed' => (bool) ($item['is_completed'] ?? false),
                'sort_order' => $index,
            ]);
        }
    }

    /**
     * Cobro del servicio para efectivo/transferencia. El monto de compra no entra aquí (solo referencia).
     *
     * @return array{
     *     client_payment_mode: string,
     *     cash_collected: ?float,
     *     transfer_discount: ?float,
     *     cash_received: ?float,
     *     box_adjustment: ?float
     * }
     */
    protected function resolveClientPayment(string $mode, float $serviceCost, ?float $cashCollected): array
    {
        $serviceCost = round($serviceCost, 2);

        return match ($mode) {
            DeliveryOrder::PAYMENT_TRANSFER => [
                'client_payment_mode' => DeliveryOrder::PAYMENT_TRANSFER,
                'cash_collected' => null,
                'transfer_discount' => $serviceCost > 0 ? $serviceCost : null,
                'cash_received' => null,
                'box_adjustment' => $serviceCost > 0 ? -$serviceCost : null,
            ],
            DeliveryOrder::PAYMENT_MIXED => (function () use ($serviceCost, $cashCollected) {
                $cash = max(0, min($serviceCost, (float) ($cashCollected ?? 0)));
                $transfer = round(max(0, $serviceCost - $cash), 2);

                return [
                    'client_payment_mode' => DeliveryOrder::PAYMENT_MIXED,
                    'cash_collected' => $cash > 0 ? $cash : null,
                    'transfer_discount' => $transfer > 0 ? $transfer : null,
                    'cash_received' => $cash > 0 ? $cash : null,
                    'box_adjustment' => $transfer > 0 ? -$transfer : null,
                ];
            })(),
            default => [
                'client_payment_mode' => DeliveryOrder::PAYMENT_CASH,
                'cash_collected' => null,
                'transfer_discount' => null,
                'cash_received' => $serviceCost > 0 ? $serviceCost : null,
                'box_adjustment' => null,
            ],
        };
    }

    protected function authorizeOrder(Request $request, DeliveryOrder $order): void
    {
        abort_unless($order->user_id === $request->user()->id, 403);
    }

    protected function formatDuration(int $seconds): string
    {
        $h = intdiv($seconds, 3600);
        $m = intdiv($seconds % 3600, 60);
        $s = $seconds % 60;

        if ($h > 0) {
            return sprintf('%d:%02d:%02d', $h, $m, $s);
        }

        return sprintf('%02d:%02d', $m, $s);
    }
}
