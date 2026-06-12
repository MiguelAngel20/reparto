<?php

namespace App\Http\Controllers\Reparto;

use App\Http\Controllers\Controller;
use App\Http\Requests\Reparto\OpenManualCaptureSessionRequest;
use App\Models\CashSession;
use App\Services\CompanyBalanceService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;

class ManualCaptureSessionController extends Controller
{
    public function __construct(
        private readonly CompanyBalanceService $companyBalance,
    ) {}
    public function store(OpenManualCaptureSessionRequest $request): RedirectResponse
    {
        $user = $request->user();

        if (CashSession::openManualForUser($user->id)) {
            return back()->with(
                'error',
                'Tienes una captura manual en curso. Finalízala antes de iniciar otra.',
            );
        }

        $captureDate = $request->validated('capture_date');

        $session = CashSession::create([
            'user_id' => $user->id,
            'session_type' => CashSession::TYPE_MANUAL,
            'capture_date' => $captureDate,
            'initial_amount' => 0,
            'started_at' => now(),
            'status' => CashSession::STATUS_OPEN,
            'notes' => $request->validated('notes'),
        ]);

        return redirect()
            ->route('manual-capture.edit', $session)
            ->with('success', 'Captura manual iniciada. Agrega los pedidos y finaliza cuando termines.');
    }

    public function close(Request $request, CashSession $session): RedirectResponse
    {
        abort_unless(
            $session->user_id === $request->user()->id
            && $session->isManual()
            && $session->isOpen(),
            403,
        );

        $session->update([
            'status' => CashSession::STATUS_CLOSED,
            'ended_at' => now(),
        ]);

        $session->refresh();
        $this->companyBalance->applySessionSettlement($session);

        return redirect()
            ->route('manual-capture.index')
            ->with('success', 'Captura manual finalizada.');
    }
}
