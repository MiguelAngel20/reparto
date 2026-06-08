<?php

namespace App\Http\Controllers\Reparto;

use App\Http\Controllers\Controller;
use App\Http\Requests\Reparto\CloseCashSessionRequest;
use App\Http\Requests\Reparto\OpenCashSessionRequest;
use App\Models\CashSession;
use App\Models\DeliveryOrder;
use App\Services\CashSessionSummary;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;

class CashSessionController extends Controller
{
    use RepartoFormatter;

    public function store(OpenCashSessionRequest $request): RedirectResponse
    {
        $user = $request->user();

        if (CashSession::openLiveForUser($user->id)) {
            return back()->with('error', 'Ya tienes una caja abierta.');
        }

        if (DeliveryOrder::activeForUser($user->id)) {
            return back()->with('error', 'Finaliza el pedido en curso antes de abrir otra caja.');
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
            'initial_amount' => $request->validated('initial_amount'),
            'started_at' => now(),
            'session_type' => CashSession::TYPE_LIVE,
            'status' => CashSession::STATUS_OPEN,
            'notes' => $request->validated('notes'),
        ]);

        return redirect()->route('reparto.index')->with('success', 'Caja abierta. ¡Buen reparto!');
    }

    public function close(CloseCashSessionRequest $request): RedirectResponse
    {
        $user = $request->user();
        $session = CashSession::openLiveForUser($user->id);

        if (! $session) {
            return back()->with('error', 'No tienes una caja abierta.');
        }

        if (DeliveryOrder::activeForUser($user->id)) {
            return back()->with('error', 'Finaliza el pedido en curso antes de cerrar la caja.');
        }

        $summary = CashSessionSummary::forSession($session);
        $countedAmount = (float) $request->validated('counted_amount');
        $expectedCash = $summary['expected_cash_in_box'];
        $difference = round($countedAmount - $expectedCash, 2);

        $endedAt = now();

        $session->update([
            'status' => CashSession::STATUS_CLOSED,
            'ended_at' => $endedAt,
            'counted_amount' => $countedAmount,
            'cash_difference' => $difference,
        ]);

        $session->refresh();
        $duration = $this->calculateWorkDuration($session->started_at, $session->ended_at);
        $durationLabel = $duration['formatted'] ?? '';

        $differenceText = match (true) {
            abs($difference) < 0.01 => 'Cuadre perfecto: el efectivo contado coincide con el esperado.',
            $difference > 0 => 'Sobrante de $'.number_format($difference, 2).' (contaste más de lo esperado).',
            default => 'Faltante de $'.number_format(abs($difference), 2).' (contaste menos de lo esperado).',
        };

        $message = $durationLabel
            ? "Caja cerrada ({$durationLabel}). {$differenceText}"
            : "Caja cerrada. {$differenceText}";

        return redirect()->route('reparto.index')->with('success', $message);
    }
}
