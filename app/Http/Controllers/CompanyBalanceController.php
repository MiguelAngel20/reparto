<?php

namespace App\Http\Controllers;

use App\Http\Requests\CompanyBalance\LiquidateBalanceRequest;
use App\Http\Requests\CompanyBalance\StoreBalanceEntryRequest;
use App\Http\Requests\CompanyBalance\UpdateBalanceEntryRequest;
use App\Models\CashSession;
use App\Models\CompanyBalanceMovement;
use App\Services\CompanyBalanceService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class CompanyBalanceController extends Controller
{
    private const PER_PAGE_OPTIONS = [5, 15, 25, 50];

    public function __construct(
        private readonly CompanyBalanceService $companyBalance,
    ) {}

    public function index(Request $request): Response
    {
        $user = $request->user();
        $this->companyBalance->recalculateUserBalance($user);
        $user->refresh();

        $companyName = $user->company_name ?? 'Clikio';
        $balance = $this->companyBalance->currentBalance($user);
        $perPage = $this->resolvePerPage($request);

        $movements = CompanyBalanceMovement::query()
            ->where('user_id', $user->id)
            ->with('cashSession:id,capture_date,session_type,started_at')
            ->latest()
            ->paginate($perPage)
            ->withQueryString()
            ->through(fn (CompanyBalanceMovement $movement) => $this->formatMovement($movement, $companyName));

        return Inertia::render('CompanyBalance/Index', [
            'companyName' => $companyName,
            'balance' => $balance,
            'balanceDisplay' => $this->companyBalance->displayForBalance($balance, $companyName),
            'movements' => $movements,
            'perPageOptions' => self::PER_PAGE_OPTIONS,
        ]);
    }

    public function storeEntry(StoreBalanceEntryRequest $request): RedirectResponse
    {
        $validated = $request->validated();

        $this->companyBalance->addBalanceEntry(
            $request->user(),
            $validated['direction'],
            (float) $validated['amount'],
            $validated['notes'] ?? null,
        );

        return back()->with('success', 'Saldo registrado correctamente.');
    }

    public function updateEntry(UpdateBalanceEntryRequest $request, CompanyBalanceMovement $movement): RedirectResponse
    {
        abort_unless($movement->user_id === $request->user()->id, 403);

        $validated = $request->validated();

        try {
            $this->companyBalance->updateBalanceEntry(
                $request->user(),
                $movement,
                $validated['direction'],
                (float) $validated['amount'],
                $validated['notes'] ?? null,
            );
        } catch (\InvalidArgumentException $e) {
            return back()->with('error', $e->getMessage());
        }

        return back()->with('success', 'Saldo actualizado. Se recalculó con las jornadas posteriores.');
    }

    public function liquidate(LiquidateBalanceRequest $request): RedirectResponse
    {
        try {
            $this->companyBalance->liquidate(
                $request->user(),
                $request->validated('notes'),
            );
        } catch (\InvalidArgumentException $e) {
            return back()->with('error', $e->getMessage());
        }

        return back()->with('success', 'Cuenta liquidada. El saldo volvió a cero.');
    }

    /**
     * @return array<string, mixed>
     */
    private function formatMovement(CompanyBalanceMovement $movement, string $companyName): array
    {
        $amount = (float) $movement->amount;
        $signedLabel = $amount > 0.01
            ? "A favor de {$companyName}"
            : ($amount < -0.01 ? 'A tu favor' : 'Sin cambio');

        $session = $movement->cashSession;

        $typeLabel = match ($movement->type) {
            CompanyBalanceMovement::TYPE_BALANCE_ENTRY => 'Saldo registrado',
            CompanyBalanceMovement::TYPE_SESSION_SETTLEMENT => $session?->isManual()
                ? 'Captura manual'
                : 'Jornada en vivo',
            CompanyBalanceMovement::TYPE_LIQUIDATION => 'Liquidación',
            default => 'Movimiento',
        };

        $displayDate = match ($movement->type) {
            CompanyBalanceMovement::TYPE_SESSION_SETTLEMENT => $session?->capture_date?->format('d/m/Y')
                ?? $session?->started_at?->format('d/m/Y'),
            default => $movement->created_at?->format('d/m/Y H:i'),
        };

        $notes = $movement->type === CompanyBalanceMovement::TYPE_SESSION_SETTLEMENT
            ? null
            : $movement->notes;

        return [
            'id' => $movement->id,
            'type' => $movement->type,
            'editable' => $movement->type === CompanyBalanceMovement::TYPE_BALANCE_ENTRY,
            'direction' => $amount < -0.01
                ? 'company_owes'
                : ($amount > 0.01 ? 'user_owes' : null),
            'amount_absolute' => abs($amount) >= 0.01 ? abs($amount) : null,
            'type_label' => $typeLabel,
            'amount' => $amount,
            'amount_label' => '$'.number_format(abs($amount), 2),
            'favor' => $amount > 0.01
                ? 'company'
                : ($amount < -0.01 ? 'user' : 'neutral'),
            'signed_label' => $signedLabel,
            'balance_after' => (float) $movement->balance_after,
            'balance_after_label' => $this->companyBalance->displayForBalance(
                (float) $movement->balance_after,
                $companyName,
            )['value'],
            'notes' => $notes,
            'display_date' => $displayDate,
        ];
    }

    private function resolvePerPage(Request $request): int
    {
        $perPage = (int) $request->input('per_page', 5);

        return in_array($perPage, self::PER_PAGE_OPTIONS, true) ? $perPage : 5;
    }
}
