<?php

namespace App\Http\Controllers;

use App\Http\Requests\CompanyBalance\AdjustBalanceRequest;
use App\Http\Requests\CompanyBalance\CorrectBalanceAfterRequest;
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
        return $this->updateMovement($request, $movement);
    }

    public function updateMovement(UpdateBalanceEntryRequest $request, CompanyBalanceMovement $movement): RedirectResponse
    {
        abort_unless($movement->user_id === $request->user()->id, 403);

        $validated = $request->validated();

        try {
            match ($movement->type) {
                CompanyBalanceMovement::TYPE_BALANCE_ENTRY => $this->companyBalance->updateBalanceEntry(
                    $request->user(),
                    $movement,
                    $validated['direction'],
                    (float) $validated['amount'],
                    $validated['notes'] ?? null,
                ),
                CompanyBalanceMovement::TYPE_SESSION_SETTLEMENT => $this->companyBalance->correctMovementBalanceAfter(
                    $request->user(),
                    $movement,
                    $validated['direction'],
                    (float) $validated['amount'],
                    $validated['notes'] ?? null,
                ),
                default => throw new \InvalidArgumentException('No puedes editar este movimiento.'),
            };
        } catch (\InvalidArgumentException $e) {
            return back()->with('error', $e->getMessage());
        }

        $message = $movement->type === CompanyBalanceMovement::TYPE_SESSION_SETTLEMENT
            ? 'Saldo corregido. Se recalculó con las jornadas posteriores.'
            : 'Saldo actualizado. Se recalculó con las jornadas posteriores.';

        return back()->with('success', $message);
    }

    public function correctBalanceAfter(
        CorrectBalanceAfterRequest $request,
        CompanyBalanceMovement $movement,
    ): RedirectResponse {
        abort_unless($movement->user_id === $request->user()->id, 403);

        $validated = $request->validated();

        try {
            $this->companyBalance->correctMovementBalanceAfter(
                $request->user(),
                $movement,
                $validated['direction'],
                (float) $validated['amount'],
                $validated['notes'] ?? null,
            );
        } catch (\InvalidArgumentException $e) {
            return back()->with('error', $e->getMessage());
        }

        return back()->with('success', 'Saldo corregido. Se recalculó con los movimientos posteriores.');
    }

    public function adjustBalance(AdjustBalanceRequest $request): RedirectResponse
    {
        $validated = $request->validated();

        try {
            $this->companyBalance->adjustBalanceToTarget(
                $request->user(),
                $validated['direction'],
                (float) $validated['amount'],
                $validated['notes'] ?? null,
            );
        } catch (\InvalidArgumentException $e) {
            return back()->with('error', $e->getMessage());
        }

        return back()->with('success', 'Saldo ajustado para cuadrar con la empresa.');
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

        $amountFormatted = abs($amount) >= 0.01
            ? '$'.number_format(abs($amount), 2)
            : null;

        $signedLabel = $amount > 0.01
            ? "A favor de {$companyName}"
            : ($amount < -0.01 ? 'A tu favor' : 'Cuadrado');

        $session = $movement->cashSession;

        $typeLabel = match ($movement->type) {
            CompanyBalanceMovement::TYPE_BALANCE_ENTRY => 'Saldo registrado',
            CompanyBalanceMovement::TYPE_SESSION_SETTLEMENT => $session?->isManual()
                ? 'Captura manual'
                : 'Jornada en vivo',
            CompanyBalanceMovement::TYPE_ADJUSTMENT => 'Ajuste de saldo',
            CompanyBalanceMovement::TYPE_LIQUIDATION => 'Liquidación',
            default => 'Movimiento',
        };

        $displayDate = match ($movement->type) {
            CompanyBalanceMovement::TYPE_SESSION_SETTLEMENT => $session?->capture_date?->format('d/m/Y')
                ?? $session?->started_at?->format('d/m/Y'),
            default => $movement->created_at?->format('d/m/Y H:i'),
        };

        $notes = $movement->type === CompanyBalanceMovement::TYPE_SESSION_SETTLEMENT
            ? $movement->notes
            : $movement->notes;

        $balanceAfter = (float) $movement->balance_after;
        $balanceBefore = round($balanceAfter - $amount, 2);
        $balanceAfterDisplay = $this->companyBalance->displayForBalance($balanceAfter, $companyName);

        return [
            'id' => $movement->id,
            'type' => $movement->type,
            'editable' => in_array($movement->type, [
                CompanyBalanceMovement::TYPE_BALANCE_ENTRY,
                CompanyBalanceMovement::TYPE_SESSION_SETTLEMENT,
            ], true),
            'shows_resulting_balance' => $movement->type === CompanyBalanceMovement::TYPE_SESSION_SETTLEMENT,
            'direction' => $amount < -0.01
                ? 'company_owes'
                : ($amount > 0.01 ? 'user_owes' : null),
            'amount_absolute' => abs($amount) >= 0.01 ? abs($amount) : null,
            'type_label' => $typeLabel,
            'amount' => $amount,
            'amount_label' => $movement->type === CompanyBalanceMovement::TYPE_SESSION_SETTLEMENT
                ? ($amountFormatted ?? 'Cuadrado')
                : ($amountFormatted ?? '$0.00'),
            'favor' => $amount > 0.01
                ? 'company'
                : ($amount < -0.01 ? 'user' : 'neutral'),
            'signed_label' => $signedLabel,
            'balance_after' => $balanceAfter,
            'balance_before' => $balanceBefore,
            'balance_calculation_label' => $this->formatBalanceCalculation(
                $balanceBefore,
                $amount,
                $balanceAfter,
            ),
            'balance_after_label' => $balanceAfterDisplay['value'],
            'balance_after_summary' => $balanceAfterDisplay['label'],
            'balance_after_tone' => $balanceAfterDisplay['tone'],
            'balance_after_direction' => $balanceAfter < -0.01
                ? 'company_owes'
                : ($balanceAfter > 0.01 ? 'user_owes' : null),
            'balance_after_absolute' => abs($balanceAfter) >= 0.01 ? abs($balanceAfter) : null,
            'notes' => $notes,
            'display_date' => $displayDate,
        ];
    }

    private function resolvePerPage(Request $request): int
    {
        $perPage = (int) $request->input('per_page', 5);

        return in_array($perPage, self::PER_PAGE_OPTIONS, true) ? $perPage : 5;
    }

    private function formatBalanceCalculation(float $balanceBefore, float $amount, float $balanceAfter): string
    {
        $before = number_format($balanceBefore, 2);
        $after = number_format($balanceAfter, 2);

        if (abs($amount) < 0.01) {
            return "{$before} = {$after}";
        }

        $operator = $amount >= 0 ? '+' : '-';
        $delta = number_format(abs($amount), 2);

        return "{$before} {$operator} {$delta} = {$after}";
    }
}
