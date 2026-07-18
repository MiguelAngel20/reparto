<?php

namespace App\Http\Controllers;

use App\Http\Requests\CardAccount\StoreCardAccountPaymentRequest;
use App\Http\Requests\CardAccount\StoreCardAccountPurchaseRequest;
use App\Http\Requests\CardAccount\StoreCardAccountRealDepositRequest;
use App\Http\Requests\CardAccount\StoreCardAccountRequest;
use App\Http\Requests\CardAccount\UpdateCardAccountMovementRequest;
use App\Http\Requests\CardAccount\UpdateCardAccountRequest;
use App\Models\CardAccount;
use App\Models\CardAccountMovement;
use App\Services\CardAccountService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class CardAccountController extends Controller
{
    private const PER_PAGE_OPTIONS = [20, 50, 75, 100];

    public function __construct(
        private readonly CardAccountService $cardAccounts,
    ) {}

    public function index(Request $request): Response
    {
        $user = $request->user();

        return Inertia::render('CardAccount/Index', [
            'cards' => $this->cardAccounts->openAccountCardsFor($user)->values()->all(),
            'assignableUsers' => $this->cardAccounts->assignableUsersForCardForm(),
        ]);
    }

    public function show(Request $request, CardAccount $account): Response|RedirectResponse
    {
        abort_unless($account->isOpen(), 404);
        $this->cardAccounts->assertUserCanAccessCard($request->user(), $account);

        $summary = $this->cardAccounts->summaryForAccount($account);
        $perPage = $this->resolvePerPage($request);
        $cycleMarkers = $this->cardAccounts->debtCycleMarkers($account);

        $movements = $account->movements()
            ->with(['user:id,name', 'account:id,status'])
            ->orderByDesc('movement_date')
            ->orderByDesc('id')
            ->paginate($perPage)
            ->withQueryString()
            ->through(function (CardAccountMovement $movement) use ($cycleMarkers) {
                $formatted = $this->cardAccounts->formatMovement($movement);
                $markers = $cycleMarkers[$movement->id] ?? [];

                $formatted['marker_after'] = $markers['after'] ?? null;
                $formatted['cycle_start_date_formatted'] = $markers['cycle_start_date_formatted'] ?? null;

                return $formatted;
            });

        return Inertia::render('CardAccount/Show', [
            'account' => $this->formatAccountDetail($summary['account'], $summary),
            'balance' => $summary['balance'],
            'totalPurchases' => $summary['total_purchases'],
            'totalPayments' => $summary['total_payments'],
            'realBalance' => $summary['real_balance'],
            'realBalanceConfigured' => $summary['real_balance_configured'],
            'balanceDisplay' => $summary['balance_display'],
            'movements' => $movements,
            'perPageOptions' => self::PER_PAGE_OPTIONS,
        ]);
    }

    public function store(StoreCardAccountRequest $request): RedirectResponse
    {
        $account = $this->cardAccounts->createAccount($request->user(), $request->validated());

        return redirect()
            ->route('card-account.show', $account)
            ->with('success', 'Tarjeta registrada.');
    }

    public function update(UpdateCardAccountRequest $request, CardAccount $account): RedirectResponse
    {
        abort_unless($account->isOpen(), 404);
        $this->cardAccounts->assertUserCanAccessCard($request->user(), $account);

        $this->cardAccounts->updateAccount($account, $request->validated());

        return back()->with('success', 'Datos de la tarjeta actualizados.');
    }

    public function storePurchase(
        StoreCardAccountPurchaseRequest $request,
        CardAccount $account,
    ): RedirectResponse {
        abort_unless($account->isOpen(), 404);
        $this->cardAccounts->assertUserCanAccessCard($request->user(), $account);

        $this->cardAccounts->addPurchase($account, $request->user(), $request->validated());

        return back()->with('success', 'Compra registrada.');
    }

    public function storePayment(
        StoreCardAccountPaymentRequest $request,
        CardAccount $account,
    ): RedirectResponse {
        abort_unless($account->isOpen(), 404);
        $this->cardAccounts->assertUserCanAccessCard($request->user(), $account);

        try {
            $this->cardAccounts->addPayment($account, $request->user(), $request->validated());
        } catch (\InvalidArgumentException $e) {
            return back()->with('error', $e->getMessage());
        }

        return back()->with('success', 'Abono registrado.');
    }

    public function storeRealDeposit(
        StoreCardAccountRealDepositRequest $request,
        CardAccount $account,
    ): RedirectResponse {
        abort_unless($account->isOpen(), 404);
        $this->cardAccounts->assertUserCanAccessCard($request->user(), $account);

        try {
            $this->cardAccounts->addRealDeposit($account, $request->user(), $request->validated());
        } catch (\InvalidArgumentException $e) {
            return back()->with('error', $e->getMessage());
        }

        return back()->with('success', 'Dinero real agregado a la tarjeta.');
    }

    public function updateMovement(
        UpdateCardAccountMovementRequest $request,
        CardAccount $account,
        CardAccountMovement $movement,
    ): RedirectResponse {
        abort_unless($account->isOpen(), 404);
        abort_unless($movement->card_account_id === $account->id, 404);
        $this->cardAccounts->assertUserCanAccessCard($request->user(), $account);

        $this->cardAccounts->updateMovement($movement, $request->validated());

        return back()->with('success', 'Registro actualizado.');
    }

    public function destroyMovement(
        Request $request,
        CardAccount $account,
        CardAccountMovement $movement,
    ): RedirectResponse {
        abort_unless($account->isOpen(), 404);
        abort_unless($movement->card_account_id === $account->id, 404);
        $this->cardAccounts->assertUserCanAccessCard($request->user(), $account);

        $this->cardAccounts->deleteMovement($movement);

        return back()->with('success', 'Registro eliminado.');
    }

    /**
     * @param  array<string, mixed>  $summary
     * @return array<string, mixed>
     */
    private function formatAccountDetail(CardAccount $account, array $summary): array
    {
        return [
            'id' => $account->id,
            'holder_name' => $account->holder_name,
            'account_holder_name' => $account->account_holder_name ?? $account->holder_name,
            'bank_type' => $account->bank_type,
            'account_number' => $account->account_number,
            'initial_real_balance' => $account->initial_real_balance !== null
                ? (float) $account->initial_real_balance
                : null,
            'real_balance' => $summary['real_balance'],
            'real_balance_configured' => $summary['real_balance_configured'],
            'opened_at' => $account->created_at?->format('d/m/Y'),
        ];
    }

    private function resolvePerPage(Request $request): int
    {
        $perPage = (int) $request->input('per_page', 20);

        return in_array($perPage, self::PER_PAGE_OPTIONS, true) ? $perPage : 20;
    }
}
