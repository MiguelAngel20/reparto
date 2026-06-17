<?php

namespace App\Http\Controllers\Reparto;

use App\Http\Controllers\Controller;
use App\Http\Requests\Reparto\CloseCashSessionRequest;
use App\Http\Requests\Reparto\OpenCashSessionRequest;
use App\Models\CashSession;
use App\Models\DeliveryOrder;
use App\Services\CashSessionSummary;
use App\Services\CompanyBalanceService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;

class CashSessionController extends Controller
{
    use RepartoFormatter;

    public function __construct(
        private readonly CompanyBalanceService $companyBalance,
    ) {}

    public function store(OpenCashSessionRequest $request): RedirectResponse
    {
        $user = $request->user();

        if (CashSession::openLiveForUser($user->id)) {
            return back()->with('error', 'Ya tienes una caja abierta.');
        }

        if (DeliveryOrder::hasActiveOrdersForUser($user->id)) {
            return back()->with('error', 'Finaliza los pedidos en curso antes de abrir otra caja.');
        }

        $today = now()->toDateString();
        if (CashSession::dayRegisteredForUser($user->id, $today)) {
            $message = CashSession::dayRegisteredLabelForUser($user->id, $today)
                ?? 'Ya registraste el día de hoy. Podrás iniciar jornada mañana.';

            return back()->with('error', $message);
        }

        CashSession::create([
            'user_id' => $user->id,
            'capture_date' => $today,
            'initial_amount' => 0,
            'started_at' => now(),
            'session_type' => CashSession::TYPE_LIVE,
            'status' => CashSession::STATUS_OPEN,
            'notes' => $request->validated('notes'),
        ]);

        return redirect()->route('reparto.index')->with('success', 'Jornada iniciada. ¡Buen reparto!');
    }

    public function close(CloseCashSessionRequest $request): RedirectResponse
    {
        $user = $request->user();
        $session = CashSession::openLiveForUser($user->id);

        if (! $session) {
            return back()->with('error', 'No tienes una caja abierta.');
        }

        if (DeliveryOrder::hasActiveOrdersForUser($user->id)) {
            return back()->with('error', 'Finaliza todos los pedidos en curso antes de cerrar la jornada.');
        }

        $endedAt = now();

        $session->update([
            'status' => CashSession::STATUS_CLOSED,
            'ended_at' => $endedAt,
            'counted_amount' => null,
            'cash_difference' => null,
        ]);

        $session->refresh();
        $this->companyBalance->applySessionSettlement($session);
        $duration = $this->calculateWorkDuration($session->started_at, $session->ended_at);
        $durationLabel = $duration['formatted'] ?? '';

        $message = $durationLabel
            ? "Jornada finalizada ({$durationLabel})."
            : 'Jornada finalizada.';

        return redirect()->route('reparto.index')->with('success', $message);
    }
}
