<?php

namespace App\Http\Controllers\Reparto;

use App\Http\Controllers\Controller;
use App\Http\Requests\Gasto\StoreDailyExpenseRequest;
use App\Http\Requests\Gasto\UpdateDailyExpenseRequest;
use App\Http\Requests\PersonalService\UpdatePersonalServiceRequest;
use App\Http\Requests\Reparto\StoreManualCaptureEntryRequest;
use App\Models\CashSession;
use App\Models\DailyExpense;
use App\Models\DeliveryOrder;
use App\Models\PersonalService;
use App\Models\UserTransferCard;
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

            $sessionPersonalServices = DailyEarningsHelper::personalServicesQueryForSession($openSession)
                ->latest()
                ->get()
                ->map(fn (PersonalService $service) => $this->formatSessionPersonalServiceRow($service))
                ->values()
                ->all();

            $sessionExpenses = DailyEarningsHelper::expensesQueryForSession($openSession)
                ->latest()
                ->get()
                ->map(fn (DailyExpense $expense) => $this->formatSessionExpenseRow($expense))
                ->values()
                ->all();
        }

        $daySummary = $openSession
            ? DailyEarningsHelper::daySummaryForSession($openSession)
            : DailyEarningsHelper::daySummaryForUser($user->id, $today);

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
            'transferCards' => $user->transferCards()
                ->get()
                ->map(fn (UserTransferCard $card) => $card->toDisplayArray())
                ->values()
                ->all(),
            'canStartJornadaToday' => $openSession === null && ! CashSession::dayRegisteredForUser($user->id, $today),
            'todayDateFormatted' => now()->format('d/m/Y'),
            'sessionDateFormatted' => $openSession
                ? $this->formatDateOnly($openSession->businessDate())
                : null,
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

    public function storeSessionEntry(
        StoreManualCaptureEntryRequest $request,
        CashSession $session,
    ): RedirectResponse {
        $this->assertEditableSession($request, $session);
        abort_unless($session->isLive(), 403);

        DeliveryOrder::query()->create(
            $this->buildOrderAttributes($request->user(), $session, $request->validated()),
        );

        $this->refreshCompanyBalanceIfNeeded($session);

        return redirect()
            ->route('reparto.session.edit', $session)
            ->with('success', 'Pedido agregado.');
    }

    public function storeSessionExpense(
        StoreDailyExpenseRequest $request,
        CashSession $session,
    ): RedirectResponse {
        $this->assertEditableSession($request, $session);
        abort_unless($session->isLive(), 403);

        DailyExpense::query()->create([
            'user_id' => $request->user()->id,
            'expense_date' => $session->businessDate(),
            'name' => trim($request->validated('name')),
            'amount' => round((float) $request->validated('amount'), 2),
            'concept' => $request->validated('concept'),
        ]);

        $this->refreshCompanyBalanceIfNeeded($session);

        return redirect()
            ->route('reparto.session.edit', $session)
            ->with('success', 'Gasto registrado.');
    }

    public function storeSessionPersonalService(
        UpdatePersonalServiceRequest $request,
        CashSession $session,
    ): RedirectResponse {
        $this->assertEditableSession($request, $session);
        abort_unless($session->isLive(), 403);

        $spent = $request->validated('spent_amount');

        PersonalService::query()->create([
            'user_id' => $request->user()->id,
            'service_date' => $session->businessDate(),
            'status' => PersonalService::STATUS_COMPLETED,
            'name' => trim($request->validated('name')),
            'amount' => round((float) $request->validated('amount'), 2),
            'spent_amount' => $spent !== null ? round((float) $spent, 2) : null,
            'description' => $request->validated('description'),
        ]);

        $this->refreshCompanyBalanceIfNeeded($session);

        return redirect()
            ->route('reparto.session.edit', $session)
            ->with('success', 'Servicio propio registrado.');
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

    public function updateSessionExpense(
        UpdateDailyExpenseRequest $request,
        CashSession $session,
        DailyExpense $expense,
    ): RedirectResponse {
        $this->assertEditableSession($request, $session);
        abort_unless($session->isLive(), 403);
        $this->assertExpenseBelongsToSession($expense, $session);

        $expense->update([
            'name' => trim($request->validated('name')),
            'amount' => round((float) $request->validated('amount'), 2),
            'concept' => $request->validated('concept'),
        ]);

        return redirect()
            ->route('reparto.session.edit', $session)
            ->with('success', 'Gasto actualizado.');
    }

    public function destroySessionExpense(
        Request $request,
        CashSession $session,
        DailyExpense $expense,
    ): RedirectResponse {
        $this->assertEditableSession($request, $session);
        abort_unless($session->isLive(), 403);
        $this->assertExpenseBelongsToSession($expense, $session);

        $expense->delete();

        return redirect()
            ->route('reparto.session.edit', $session)
            ->with('success', 'Gasto eliminado.');
    }

    public function updateSessionPersonalService(
        UpdatePersonalServiceRequest $request,
        CashSession $session,
        PersonalService $service,
    ): RedirectResponse {
        $this->assertEditableSession($request, $session);
        abort_unless($session->isLive(), 403);
        $this->assertPersonalServiceBelongsToSession($service, $session);

        $spent = $request->validated('spent_amount');

        $service->update([
            'name' => trim($request->validated('name')),
            'amount' => round((float) $request->validated('amount'), 2),
            'spent_amount' => $spent !== null ? round((float) $spent, 2) : null,
            'description' => $request->validated('description'),
        ]);

        return redirect()
            ->route('reparto.session.edit', $session)
            ->with('success', 'Servicio propio actualizado.');
    }

    public function destroySessionPersonalService(
        Request $request,
        CashSession $session,
        PersonalService $service,
    ): RedirectResponse {
        $this->assertEditableSession($request, $session);
        abort_unless($session->isLive(), 403);
        $this->assertPersonalServiceBelongsToSession($service, $session);

        $service->delete();

        return redirect()
            ->route('reparto.session.edit', $session)
            ->with('success', 'Servicio propio eliminado.');
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
