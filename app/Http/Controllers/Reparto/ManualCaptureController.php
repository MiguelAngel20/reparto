<?php

namespace App\Http\Controllers\Reparto;

use App\Http\Controllers\Controller;
use App\Http\Requests\Reparto\StoreManualCaptureEntryRequest;
use App\Models\CashSession;
use App\Models\DeliveryOrder;
use App\Services\CashSessionSummary;
use App\Services\CompanyBalanceService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class ManualCaptureController extends Controller
{
    use EditableCashSessionEntries, RepartoFormatter;

    public function __construct(
        private readonly CompanyBalanceService $companyBalance,
    ) {}

    protected function companyBalance(): CompanyBalanceService
    {
        return $this->companyBalance;
    }

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

    public function show(Request $request, CashSession $session): Response
    {
        return $this->renderSessionView($request, $session, 'manual_capture');
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
        $this->assertCanDeleteOrderInSession($session);
        $this->deleteCompletedOrderFromSession($session, $order);

        return redirect()
            ->route('manual-capture.edit', $session)
            ->with('success', 'Pedido eliminado.');
    }

    public function destroySession(Request $request, CashSession $session): RedirectResponse
    {
        try {
            $this->companyBalance->deleteClosedSession($session, $request->user());
        } catch (\InvalidArgumentException $e) {
            return redirect()
                ->route('manual-capture.index')
                ->with('error', $e->getMessage());
        }

        return redirect()
            ->route('manual-capture.index')
            ->with('success', 'Captura eliminada correctamente.');
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
            ->manual()
            ->withCount([
                'orders as entries_count' => fn ($q) => $q->where('status', DeliveryOrder::STATUS_COMPLETED),
            ])
            ->orderByRaw('COALESCE(capture_date, DATE(started_at)) DESC')
            ->orderByDesc('started_at')
            ->get()
            ->map(fn ($s) => $this->formatSessionWithSummary($s, $user->id));

        $activeSessionData = null;
        $entries = [];

        if ($activeSession) {
            $activeSession->loadCount([
                'orders as entries_count' => fn ($q) => $q->where('status', DeliveryOrder::STATUS_COMPLETED),
            ]);
            $activeSessionData = $this->formatSessionWithSummary($activeSession, $user->id);
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
        return $this->formatSessionOrderRow($order);
    }

}
