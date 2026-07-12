<?php

namespace App\Http\Controllers\Reparto;

use App\Http\Controllers\Controller;
use App\Http\Requests\Reparto\StoreManualCaptureEntryRequest;
use App\Models\CashSession;
use App\Models\DailyExpense;
use App\Models\DeliveryOrder;
use App\Models\PersonalService;
use App\Services\CashSessionSummary;
use App\Services\CompanyBalanceService;
use App\Services\DailyEarningsHelper;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class RepartoController extends Controller
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
        $user = $request->user();

        $openSession = CashSession::openLiveForUser($user->id);

        $recentSessions = CashSession::query()
            ->live()
            ->where('user_id', $user->id)
            ->where('status', CashSession::STATUS_CLOSED)
            ->withCount([
                'orders as orders_count' => fn ($q) => $q->where('status', '!=', DeliveryOrder::STATUS_CANCELLED),
                'orders as completed_orders_count' => fn ($q) => $q->where('status', DeliveryOrder::STATUS_COMPLETED),
                'orders as entries_count' => fn ($q) => $q->where('status', DeliveryOrder::STATUS_COMPLETED),
            ])
            ->orderByDesc('started_at')
            ->get()
            ->map(fn ($s) => $this->formatSessionWithSummary($s, $user->id));

        $today = now()->toDateString();

        $openSessionData = null;
        $sessionOrders = [];
        $sessionPersonalServices = [];
        $sessionExpenses = [];

        if ($openSession) {
            $openSession->loadCount([
                'orders as orders_count' => fn ($q) => $q->where('status', '!=', DeliveryOrder::STATUS_CANCELLED),
                'orders as completed_orders_count' => fn ($q) => $q->where('status', DeliveryOrder::STATUS_COMPLETED),
            ]);
            $openSessionData = array_merge(
                $this->formatCashSession($openSession),
                CashSessionSummary::forSession($openSession),
            );
            $sessionOrders = $openSession->orders()
                ->with('items')
                ->where('status', DeliveryOrder::STATUS_COMPLETED)
                ->orderBy('completed_at')
                ->orderBy('id')
                ->get()
                ->map(fn ($order) => $this->formatSessionOrderRow($order))
                ->values()
                ->all();

            $sessionPersonalServices = PersonalService::query()
                ->where('user_id', $user->id)
                ->whereDate('service_date', $today)
                ->completed()
                ->latest()
                ->get()
                ->map(fn (PersonalService $service) => $this->formatSessionPersonalServiceRow($service))
                ->values()
                ->all();

            $sessionExpenses = DailyExpense::query()
                ->where('user_id', $user->id)
                ->whereDate('expense_date', $today)
                ->latest()
                ->get()
                ->map(fn (DailyExpense $expense) => $this->formatSessionExpenseRow($expense))
                ->values()
                ->all();
        }

        $daySummary = DailyEarningsHelper::daySummaryForUser($user->id, $today);

        $activeOrders = DeliveryOrder::activeOrdersForUser($user->id)
            ->map(fn ($order) => $this->formatActiveOrderSummary($order))
            ->values()
            ->all();

        $activePersonalServices = PersonalService::activeServicesForUser($user->id)
            ->map(fn ($service) => $this->formatActivePersonalServiceSummary($service))
            ->values()
            ->all();

        return Inertia::render('Reparto/Index', [
            'openSession' => $openSessionData,
            'sessionOrders' => $sessionOrders,
            'sessionPersonalServices' => $sessionPersonalServices,
            'sessionExpenses' => $sessionExpenses,
            'activeOrders' => $activeOrders,
            'activePersonalServices' => $activePersonalServices,
            'recentSessions' => $recentSessions,
            'canStartJornadaToday' => ! CashSession::dayRegisteredForUser($user->id, $today),
            'todayDateFormatted' => now()->format('d/m/Y'),
            'todayBlockedMessage' => CashSession::dayRegisteredLabelForUser($user->id, $today),
            'userPercentage' => (float) $user->percentage,
            'companyName' => $user->company_name ?? 'Clikio',
            'totalExpensesToday' => $daySummary['total_expenses'],
            'totalPersonalServicesToday' => $daySummary['personal_services'],
            'netEarningsToday' => $daySummary['net_earnings'],
        ]);
    }

    public function showSession(Request $request, CashSession $session): Response
    {
        abort_unless($session->isLive(), 404);

        return $this->renderSessionView($request, $session, 'reparto');
    }

    public function editSession(Request $request, CashSession $session): Response
    {
        $this->assertEditableSession($request, $session);

        return $this->renderSessionEdit($request, $session);
    }

    public function updateSessionEntry(
        StoreManualCaptureEntryRequest $request,
        CashSession $session,
        DeliveryOrder $order,
    ): RedirectResponse {
        $this->assertEditableSession($request, $session);
        abort_unless($session->isLive(), 403);
        $this->assertOrderBelongsToSession($order, $session);

        $order->update(
            $this->buildOrderAttributes($request->user(), $session, $request->validated(), $order),
        );

        $this->refreshCompanyBalanceIfNeeded($session);

        return redirect()
            ->route('reparto.session.edit', $session)
            ->with('success', 'Pedido actualizado.');
    }

    public function destroySessionEntry(
        Request $request,
        CashSession $session,
        DeliveryOrder $order,
    ): RedirectResponse {
        abort_unless($session->user_id === $request->user()->id, 403);
        abort_unless($session->isLive(), 403);
        $this->assertOrderBelongsToSession($order, $session);

        if ($session->isOpen()) {
            $this->deleteCompletedOrderFromSession($session, $order);

            return redirect()
                ->route('reparto.index')
                ->with('success', 'Pedido eliminado.');
        }

        $this->assertEditableSession($request, $session);
        $this->deleteCompletedOrderFromSession($session, $order);

        return redirect()
            ->route('reparto.session.edit', $session)
            ->with('success', 'Pedido eliminado.');
    }

    public function destroySession(Request $request, CashSession $session): RedirectResponse
    {
        abort_unless($session->isLive(), 403);

        try {
            $this->companyBalance->deleteClosedSession($session, $request->user());
        } catch (\InvalidArgumentException $e) {
            return redirect()
                ->route('reparto.index')
                ->with('error', $e->getMessage());
        }

        return redirect()
            ->route('reparto.index')
            ->with('success', 'Jornada eliminada correctamente.');
    }
}
