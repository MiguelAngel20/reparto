<?php

namespace App\Http\Controllers;

use App\Http\Requests\CardAccount\StoreCardAccountPaymentRequest;
use App\Http\Requests\CardAccount\StoreCardAccountPurchaseRequest;
use App\Http\Requests\CardAccount\UpdateCardAccountMovementRequest;
use App\Models\CardAccountMovement;
use App\Services\CardAccountService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Pagination\LengthAwarePaginator;
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
        $summary = $this->cardAccounts->summary();
        $account = $summary['account'];
        $perPage = $this->resolvePerPage($request);

        if ($account) {
            $movements = $account->movements()
                ->with(['user:id,name', 'account:id,status'])
                ->orderByDesc('movement_date')
                ->orderByDesc('id')
                ->paginate($perPage)
                ->withQueryString()
                ->through(fn (CardAccountMovement $movement) => $this->cardAccounts->formatMovement($movement));
        } else {
            $movements = new LengthAwarePaginator(
                [],
                0,
                $perPage,
                1,
                ['path' => $request->url(), 'query' => $request->query()],
            );
        }

        return Inertia::render('CardAccount/Index', [
            'account' => $account ? [
                'id' => $account->id,
                'holder_name' => $account->holder_name,
                'opened_at' => $account->created_at?->format('d/m/Y'),
            ] : null,
            'balance' => $summary['balance'],
            'totalPurchases' => $summary['total_purchases'],
            'totalPayments' => $summary['total_payments'],
            'balanceDisplay' => $summary['balance_display'],
            'readyToLiquidate' => abs($summary['balance']) < 0.01 && $account !== null,
            'movements' => $movements,
            'perPageOptions' => self::PER_PAGE_OPTIONS,
        ]);
    }

    public function storePurchase(StoreCardAccountPurchaseRequest $request): RedirectResponse
    {
        $validated = $request->validated();

        $this->cardAccounts->addPurchase(
            $request->user(),
            $validated,
            $validated['holder_name'] ?? null,
        );

        return back()->with('success', 'Compra registrada.');
    }

    public function storePayment(StoreCardAccountPaymentRequest $request): RedirectResponse
    {
        try {
            $this->cardAccounts->addPayment($request->user(), $request->validated());
        } catch (\InvalidArgumentException $e) {
            return back()->with('error', $e->getMessage());
        }

        return back()->with('success', 'Abono registrado.');
    }

    public function update(
        UpdateCardAccountMovementRequest $request,
        CardAccountMovement $movement,
    ): RedirectResponse {
        $this->cardAccounts->updateMovement($movement, $request->validated());

        return back()->with('success', 'Registro actualizado.');
    }

    public function destroy(Request $request, CardAccountMovement $movement): RedirectResponse
    {
        $this->cardAccounts->deleteMovement($movement);

        return back()->with('success', 'Registro eliminado.');
    }

    public function liquidate(Request $request): RedirectResponse
    {
        try {
            $this->cardAccounts->liquidate();
        } catch (\InvalidArgumentException $e) {
            return back()->with('error', $e->getMessage());
        }

        return back()->with('success', 'Cuenta liquidada. Puedes iniciar una nueva cuando quieras.');
    }

    private function resolvePerPage(Request $request): int
    {
        $perPage = (int) $request->input('per_page', 20);

        return in_array($perPage, self::PER_PAGE_OPTIONS, true) ? $perPage : 20;
    }
}
