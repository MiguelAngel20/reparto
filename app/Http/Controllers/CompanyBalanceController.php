<?php

namespace App\Http\Controllers;

use App\Http\Requests\CompanyBalance\LiquidateBalanceRequest;
use App\Http\Requests\CompanyBalance\StoreBalanceEntryRequest;
use App\Models\CompanyBalanceMovement;
use App\Services\CompanyBalanceService;
use Illuminate\Http\RedirectResponse;
use Inertia\Inertia;
use Inertia\Response;

class CompanyBalanceController extends Controller
{
    public function __construct(
        private readonly CompanyBalanceService $companyBalance,
    ) {}

    public function index(): Response
    {
        $user = request()->user();
        $companyName = $user->company_name ?? 'Clikio';
        $balance = $this->companyBalance->currentBalance($user);

        $movements = CompanyBalanceMovement::query()
            ->where('user_id', $user->id)
            ->with('cashSession:id,capture_date,session_type')
            ->latest()
            ->limit(100)
            ->get()
            ->map(fn (CompanyBalanceMovement $movement) => $this->formatMovement($movement, $companyName));

        return Inertia::render('CompanyBalance/Index', [
            'companyName' => $companyName,
            'balance' => $balance,
            'balanceDisplay' => $this->companyBalance->displayForBalance($balance, $companyName),
            'movements' => $movements,
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
            ? 'A favor de la empresa'
            : ($amount < -0.01 ? 'A tu favor' : 'Sin cambio');

        return [
            'id' => $movement->id,
            'type' => $movement->type,
            'type_label' => match ($movement->type) {
                CompanyBalanceMovement::TYPE_BALANCE_ENTRY => 'Saldo registrado',
                CompanyBalanceMovement::TYPE_SESSION_SETTLEMENT => 'Jornada',
                CompanyBalanceMovement::TYPE_LIQUIDATION => 'Liquidación',
                default => 'Movimiento',
            },
            'amount' => $amount,
            'amount_label' => ($amount >= 0 ? '+' : '-').'$'.number_format(abs($amount), 2),
            'signed_label' => $signedLabel,
            'balance_after' => (float) $movement->balance_after,
            'balance_after_label' => $this->companyBalance->displayForBalance(
                (float) $movement->balance_after,
                $companyName,
            )['value'],
            'notes' => $movement->notes,
            'created_at' => $movement->created_at?->format('d/m/Y H:i'),
        ];
    }
}
