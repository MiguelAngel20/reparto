<?php

namespace App\Http\Controllers;

use App\Http\Requests\Debtor\StoreDebtorMovementRequest;
use App\Http\Requests\Debtor\StoreDebtorRequest;
use App\Http\Requests\Debtor\StoreDebtorSettlementRequest;
use App\Http\Requests\Debtor\UpdateDebtorMovementRequest;
use App\Models\Debtor;
use App\Models\DebtorMovement;
use App\Services\DebtorService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class DebtorController extends Controller
{
    private const PER_PAGE_OPTIONS = [20, 50, 75, 100];

    public function __construct(
        private readonly DebtorService $debtors,
    ) {}

    public function index(Request $request): Response
    {
        return Inertia::render('Debtors/Index', [
            'debtors' => $this->debtors->listForUser($request->user()),
        ]);
    }

    public function show(Request $request, Debtor $debtor): Response
    {
        $this->debtors->assertOwned($request->user(), $debtor);

        $totals = $this->debtors->totals($debtor);
        $cycleMarkers = $this->debtors->debtCycleMarkers($debtor);
        $perPage = $this->resolvePerPage($request);

        $movements = $debtor->movements()
            ->orderByDesc('movement_date')
            ->orderByDesc('id')
            ->paginate($perPage)
            ->withQueryString()
            ->through(function (DebtorMovement $movement) use ($cycleMarkers) {
                $formatted = $this->debtors->formatMovement($movement);
                $markers = $cycleMarkers[$movement->id] ?? [];
                $formatted['marker_after'] = $markers['after'] ?? null;
                $formatted['cycle_start_date_formatted'] = $markers['cycle_start_date_formatted'] ?? null;

                return $formatted;
            });

        return Inertia::render('Debtors/Show', [
            'debtor' => [
                'id' => $debtor->id,
                'name' => $debtor->name,
                'opened_at' => $debtor->created_at?->format('d/m/Y'),
            ],
            'balance' => $totals['balance'],
            'totalDebts' => $totals['total_debts'],
            'totalPayments' => $totals['total_payments'],
            'movements' => $movements,
            'perPageOptions' => self::PER_PAGE_OPTIONS,
        ]);
    }

    public function store(StoreDebtorRequest $request): RedirectResponse
    {
        $debtor = $this->debtors->create($request->user(), $request->validated('name'));

        return redirect()
            ->route('debtors.show', $debtor)
            ->with('success', 'Deudor registrado.');
    }

    public function update(StoreDebtorRequest $request, Debtor $debtor): RedirectResponse
    {
        $this->debtors->assertOwned($request->user(), $debtor);
        $this->debtors->rename($debtor, $request->validated('name'));

        return back()->with('success', 'Nombre del deudor actualizado.');
    }

    public function destroy(Request $request, Debtor $debtor): RedirectResponse
    {
        $this->debtors->assertOwned($request->user(), $debtor);
        $debtor->delete();

        return redirect()
            ->route('debtors.index')
            ->with('success', 'Deudor eliminado.');
    }

    public function storeDebt(StoreDebtorMovementRequest $request, Debtor $debtor): RedirectResponse
    {
        $this->debtors->assertOwned($request->user(), $debtor);
        $this->debtors->addDebt($debtor, $request->user(), $request->validated());

        return back()->with('success', 'Deuda registrada.');
    }

    public function storePayment(StoreDebtorMovementRequest $request, Debtor $debtor): RedirectResponse
    {
        $this->debtors->assertOwned($request->user(), $debtor);

        try {
            $this->debtors->addPayment($debtor, $request->user(), $request->validated());
        } catch (\InvalidArgumentException $e) {
            return back()->with('error', $e->getMessage());
        }

        return back()->with('success', 'Abono registrado.');
    }

    public function settle(StoreDebtorSettlementRequest $request, Debtor $debtor): RedirectResponse
    {
        $this->debtors->assertOwned($request->user(), $debtor);

        try {
            $this->debtors->settle($debtor, $request->user(), $request->validated());
        } catch (\InvalidArgumentException $e) {
            return back()->with('error', $e->getMessage());
        }

        return back()->with('success', 'Deuda liquidada.');
    }

    public function updateMovement(
        UpdateDebtorMovementRequest $request,
        Debtor $debtor,
        DebtorMovement $movement,
    ): RedirectResponse {
        $this->debtors->assertOwned($request->user(), $debtor);

        try {
            $this->debtors->updateMovement($debtor, $movement, $request->validated());
        } catch (\InvalidArgumentException $e) {
            return back()->with('error', $e->getMessage());
        }

        return back()->with('success', 'Registro actualizado.');
    }

    public function destroyMovement(
        Request $request,
        Debtor $debtor,
        DebtorMovement $movement,
    ): RedirectResponse {
        $this->debtors->assertOwned($request->user(), $debtor);

        try {
            $this->debtors->deleteMovement($debtor, $movement);
        } catch (\InvalidArgumentException $e) {
            return back()->with('error', $e->getMessage());
        }

        return back()->with('success', 'Registro eliminado.');
    }

    private function resolvePerPage(Request $request): int
    {
        $perPage = (int) $request->input('per_page', 20);

        return in_array($perPage, self::PER_PAGE_OPTIONS, true) ? $perPage : 20;
    }
}
