<?php

namespace App\Http\Controllers;

use App\Http\Requests\PersonalService\StorePersonalServiceRequest;
use App\Http\Requests\PersonalService\UpdatePersonalServiceRequest;
use App\Models\PersonalService;
use App\Services\DailyEarningsHelper;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class PersonalServiceController extends Controller
{
    public function index(Request $request): Response
    {
        $user = $request->user();
        $today = now()->toDateString();
        $summary = DailyEarningsHelper::daySummaryForUser($user->id, $today);

        $services = PersonalService::query()
            ->where('user_id', $user->id)
            ->whereDate('service_date', $today)
            ->latest()
            ->get()
            ->map(fn (PersonalService $service) => $this->formatService($service));

        return Inertia::render('PersonalService/Index', [
            'todayDateFormatted' => now()->format('d/m/Y'),
            'todayEarnings' => $summary['today_earnings'],
            'sessionEarnings' => $summary['session_earnings'],
            'totalPersonalServices' => $summary['personal_services'],
            'totalExpenses' => $summary['total_expenses'],
            'netEarnings' => $summary['net_earnings'],
            'completedOrdersToday' => $summary['completed_orders_today'],
            'hasOpenLiveSession' => $summary['has_open_live_session'],
            'hasSessionToday' => $summary['has_session_today'],
            'services' => $services,
        ]);
    }

    public function store(StorePersonalServiceRequest $request): RedirectResponse
    {
        PersonalService::query()->create([
            'user_id' => $request->user()->id,
            'service_date' => now()->toDateString(),
            'name' => trim($request->validated('name')),
            'amount' => round((float) $request->validated('amount'), 2),
            'description' => $request->validated('description'),
        ]);

        return back()->with('success', 'Servicio registrado.');
    }

    public function update(UpdatePersonalServiceRequest $request, PersonalService $service): RedirectResponse
    {
        abort_unless($service->user_id === $request->user()->id, 403);

        $service->update([
            'name' => trim($request->validated('name')),
            'amount' => round((float) $request->validated('amount'), 2),
            'description' => $request->validated('description'),
        ]);

        return back()->with('success', 'Servicio actualizado.');
    }

    public function destroy(Request $request, PersonalService $service): RedirectResponse
    {
        abort_unless($service->user_id === $request->user()->id, 403);

        $service->delete();

        return back()->with('success', 'Servicio eliminado.');
    }

    /**
     * @return array<string, mixed>
     */
    private function formatService(PersonalService $service): array
    {
        return [
            'id' => $service->id,
            'name' => $service->name,
            'amount' => (float) $service->amount,
            'amount_label' => '$'.number_format((float) $service->amount, 2),
            'description' => $service->description,
            'created_at' => $service->created_at?->format('H:i'),
        ];
    }
}
