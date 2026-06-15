<?php

namespace App\Http\Controllers\Reparto;

use App\Http\Controllers\Controller;
use App\Http\Requests\Reparto\StoreManualCaptureEntryRequest;
use App\Models\CashSession;
use App\Models\DeliveryOrder;
use App\Services\CashSessionSummary;
use App\Services\CompanyBalanceService;
use App\Services\DeliveryCommissionCalculator;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Inertia\Inertia;
use Inertia\Response;

class ManualCaptureController extends Controller
{
    use RepartoFormatter;

    public function __construct(
        private readonly CompanyBalanceService $companyBalance,
    ) {}

    public function index(Request $request): Response|RedirectResponse
    {
        $openManual = CashSession::openManualForUser($request->user()->id);
        if ($openManual) {
            return redirect()->route('manual-capture.edit', $openManual);
        }

        return $this->renderIndex($request, null);
    }

    public function edit(Request $request, CashSession $session): Response
    {
        $this->assertEditableSession($request, $session);

        return $this->renderIndex($request, $session);
    }

    public function storeEntry(
        StoreManualCaptureEntryRequest $request,
        CashSession $session,
    ): RedirectResponse {
        $this->assertEditableSession($request, $session);
        abort_unless($session->isManual(), 403, 'Solo puedes agregar pedidos en capturas manuales por fecha.');

        DeliveryOrder::create(
            $this->buildOrderAttributes($request->user(), $session, $request->validated())
        );

        $this->refreshCompanyBalanceIfNeeded($session);

        return redirect()
            ->route('manual-capture.edit', $session)
            ->with('success', 'Pedido agregado.');
    }

    public function updateEntry(
        StoreManualCaptureEntryRequest $request,
        CashSession $session,
        DeliveryOrder $order,
    ): RedirectResponse {
        $this->assertEditableSession($request, $session);
        $this->assertOrderBelongsToSession($order, $session);

        $order->update(
            $this->buildOrderAttributes($request->user(), $session, $request->validated(), $order)
        );

        $this->refreshCompanyBalanceIfNeeded($session);

        return redirect()
            ->route('manual-capture.edit', $session)
            ->with('success', 'Pedido actualizado.');
    }

    public function destroyEntry(
        Request $request,
        CashSession $session,
        DeliveryOrder $order,
    ): RedirectResponse {
        $this->assertEditableSession($request, $session);
        $this->assertOrderBelongsToSession($order, $session);
        abort_unless($session->isManual(), 403, 'Solo puedes eliminar pedidos en capturas manuales por fecha.');

        $order->delete();

        $this->refreshCompanyBalanceIfNeeded($session);

        return redirect()
            ->route('manual-capture.edit', $session)
            ->with('success', 'Pedido eliminado.');
    }

    protected function renderIndex(Request $request, ?CashSession $activeSession): Response
    {
        $user = $request->user();

        $usedCaptureDates = [];
        $blockedDateMessages = [];

        foreach (
            CashSession::query()->where('user_id', $user->id)->get() as $session
        ) {
            $raw = $session->getRawOriginal('capture_date');
            $date = $raw
                ? $this->dateOnlyString($raw)
                : $this->dateOnlyString($session->started_at);

            if (in_array($date, $usedCaptureDates, true)) {
                continue;
            }

            $usedCaptureDates[] = $date;
            $blockedDateMessages[$date] = CashSession::dayRegisteredLabelForUser($user->id, $date)
                ?? 'Esta fecha ya está registrada.';
        }

        sort($usedCaptureDates);
        rsort($usedCaptureDates);

        $savedSessions = CashSession::query()
            ->where('user_id', $user->id)
            ->where('status', CashSession::STATUS_CLOSED)
            ->where(function ($query) {
                $query->manual()
                    ->orWhere(fn ($q) => $q->live());
            })
            ->withCount([
                'orders as entries_count' => fn ($q) => $q->where('status', DeliveryOrder::STATUS_COMPLETED),
            ])
            ->orderByRaw('COALESCE(capture_date, DATE(started_at)) DESC')
            ->orderByDesc('started_at')
            ->get()
            ->map(fn ($s) => $this->formatSessionWithSummary($s));

        $activeSessionData = null;
        $entries = [];

        if ($activeSession) {
            $activeSession->loadCount([
                'orders as entries_count' => fn ($q) => $q->where('status', DeliveryOrder::STATUS_COMPLETED),
            ]);
            $activeSessionData = $this->formatSessionWithSummary($activeSession);
            $orders = $activeSession->orders()
                ->where('status', DeliveryOrder::STATUS_COMPLETED)
                ->orderBy('id')
                ->get();

            foreach ($orders as $order) {
                $this->syncOrderCommissions($order, (float) $user->percentage);
            }

            $entries = $orders
                ->map(fn ($order) => $this->formatManualOrderRow($order->fresh()))
                ->values()
                ->all();
        }

        return Inertia::render('ManualCapture/Index', [
            'activeSession' => $activeSessionData,
            'entries' => $entries,
            'savedSessions' => $savedSessions,
            'usedCaptureDates' => $usedCaptureDates,
            'blockedDateMessages' => $blockedDateMessages,
            'userPercentage' => (float) $user->percentage,
            'companyName' => $user->company_name ?? 'Clikio',
        ]);
    }

    protected function formatManualOrderRow(DeliveryOrder $order): array
    {
        $row = $this->formatSessionOrderRow($order);
        $manualDiscount = (float) ($order->discount ?? 0);
        $transferDiscount = (float) ($order->transfer_discount ?? 0);
        $row['clikio_discounts'] = $order->client_payment_mode === DeliveryOrder::PAYMENT_TRANSFER
            ? $transferDiscount
            : round($manualDiscount + $transferDiscount, 2);
        $row['client_payment_mode'] = $order->client_payment_mode ?? DeliveryOrder::PAYMENT_CASH;
        $row['client_payment_mode_label'] = DeliveryOrder::paymentModeLabels()[$row['client_payment_mode']]
            ?? $row['client_payment_mode'];

        return $row;
    }

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
        $mode = $validated['client_payment_mode'];
        $serviceCost = (float) $validated['service_cost'];

        if ($mode === DeliveryOrder::PAYMENT_TRANSFER) {
            $discountAmount = (float) ($validated['discount'] ?? $serviceCost);
            if ($discountAmount <= 0) {
                $discountAmount = $serviceCost;
            }
            $transferDiscount = $discountAmount > 0 ? $discountAmount : null;
            $manualDiscount = null;
        } else {
            $transferDiscount = null;
            $manualDiscount = $validated['discount'] ?? null;
        }

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
            'client_payment_mode' => $mode,
            'transfer_discount' => $transferDiscount,
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
        $this->companyBalance->refreshSessionSettlement($session);
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
