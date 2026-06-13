<?php

namespace App\Http\Controllers\Reparto;

use App\Http\Controllers\Controller;
use App\Models\CashSession;
use App\Models\DeliveryOrder;
use App\Services\CashSessionSummary;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class RepartoController extends Controller
{
    use RepartoFormatter;

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
            ->map(fn ($s) => $this->formatSessionWithSummary($s));

        $openSessionData = null;
        $sessionOrders = [];

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
        }

        $today = now()->toDateString();

        $activeOrders = DeliveryOrder::activeOrdersForUser($user->id)
            ->map(fn ($order) => $this->formatActiveOrderSummary($order))
            ->values()
            ->all();

        return Inertia::render('Reparto/Index', [
            'openSession' => $openSessionData,
            'sessionOrders' => $sessionOrders,
            'activeOrders' => $activeOrders,
            'recentSessions' => $recentSessions,
            'canStartJornadaToday' => ! CashSession::dayRegisteredForUser($user->id, $today),
            'todayDateFormatted' => now()->format('d/m/Y'),
            'todayBlockedMessage' => CashSession::dayRegisteredLabelForUser($user->id, $today),
            'userPercentage' => (float) $user->percentage,
            'companyName' => $user->company_name ?? 'Clikio',
        ]);
    }
}
