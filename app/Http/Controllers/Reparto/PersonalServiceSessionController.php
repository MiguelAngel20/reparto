<?php

namespace App\Http\Controllers\Reparto;

use App\Http\Controllers\Controller;
use App\Http\Requests\Reparto\FinalizePersonalServiceSessionRequest;
use App\Models\CashSession;
use App\Models\PersonalService;
use App\Models\PersonalServiceItem;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class PersonalServiceSessionController extends Controller
{
    private const DEFAULT_SERVICE_AMOUNT = 50;

    public function start(Request $request): RedirectResponse
    {
        $user = $request->user();

        if (! CashSession::openLiveForUser($user->id)) {
            return redirect()
                ->route('reparto.index')
                ->with('error', 'Abre una jornada antes de agregar un servicio propio.');
        }

        $service = PersonalService::query()->create([
            'user_id' => $user->id,
            'service_date' => now()->toDateString(),
            'status' => PersonalService::STATUS_IN_PROGRESS,
            'name' => '',
            'amount' => self::DEFAULT_SERVICE_AMOUNT,
            'spent_amount' => null,
            'started_at' => now(),
        ]);

        return redirect()->route('reparto.personal-services.show', $service);
    }

    public function show(Request $request, PersonalService $service): Response|RedirectResponse
    {
        $this->authorizeService($request, $service);

        if (! $service->isInProgress()) {
            return redirect()->route('reparto.index');
        }

        return $this->renderServiceForm($request, $service);
    }

    public function update(
        FinalizePersonalServiceSessionRequest $request,
        PersonalService $service,
    ): RedirectResponse {
        $this->authorizeService($request, $service);

        if (! $service->isInProgress()) {
            return back()->with('error', 'Este servicio ya fue finalizado.');
        }

        $this->applyServiceData($service, $request->validated());

        return back();
    }

    public function complete(
        FinalizePersonalServiceSessionRequest $request,
        PersonalService $service,
    ): RedirectResponse {
        $this->authorizeService($request, $service);

        if (! $service->isInProgress()) {
            return back()->with('error', 'Este servicio ya fue finalizado.');
        }

        $this->applyServiceData($service, $request->validated());

        $service->update([
            'status' => PersonalService::STATUS_COMPLETED,
        ]);

        return $this->redirectAfterClosingService(
            $request->user()->id,
            'Servicio propio registrado.',
        );
    }

    public function cancel(Request $request, PersonalService $service): RedirectResponse
    {
        $this->authorizeService($request, $service);

        if (! $service->isInProgress()) {
            return redirect()->route('reparto.index');
        }

        $service->delete();

        $remaining = PersonalService::activeServicesForUser($request->user()->id)->count();
        $message = $remaining > 0
            ? 'Servicio cancelado. Siguiente servicio en curso.'
            : 'Servicio cancelado.';

        return $this->redirectAfterClosingService($request->user()->id, $message);
    }

    protected function redirectAfterClosingService(int $userId, string $successMessage): RedirectResponse
    {
        $nextService = PersonalService::activeServicesForUser($userId)->first();

        if ($nextService) {
            return redirect()
                ->route('reparto.personal-services.show', $nextService)
                ->with('success', $successMessage);
        }

        return redirect()
            ->route('reparto.index')
            ->with('success', $successMessage);
    }

    protected function applyServiceData(PersonalService $service, array $validated): void
    {
        $spent = null;

        if (array_key_exists('items', $validated) && is_array($validated['items'])) {
            $this->syncServiceItems($service, $validated['items']);

            $total = 0.0;
            foreach ($validated['items'] as $item) {
                if (empty(trim($item['description'] ?? ''))) {
                    continue;
                }

                $total += (float) ($item['price'] ?? 0);
            }

            $spent = $total > 0 ? round($total, 2) : null;
        } else {
            $service->items()->delete();

            $spent = array_key_exists('spent_amount', $validated) && $validated['spent_amount'] !== null
                ? round((float) $validated['spent_amount'], 2)
                : null;
        }

        $service->update([
            'name' => trim($validated['name']),
            'amount' => round((float) $validated['amount'], 2),
            'spent_amount' => $spent,
            'description' => $validated['description'] ?? null,
        ]);
    }

    /**
     * @param  array<int, array<string, mixed>>  $items
     */
    protected function syncServiceItems(PersonalService $service, array $items): void
    {
        $service->items()->delete();

        foreach ($items as $index => $item) {
            if (empty(trim($item['description'] ?? ''))) {
                continue;
            }

            PersonalServiceItem::query()->create([
                'personal_service_id' => $service->id,
                'description' => trim($item['description']),
                'price' => $item['price'] ?? 0,
                'is_completed' => (bool) ($item['is_completed'] ?? false),
                'sort_order' => $index,
            ]);
        }
    }

    protected function authorizeService(Request $request, PersonalService $service): void
    {
        abort_unless($service->user_id === $request->user()->id, 403);
    }

    protected function renderServiceForm(Request $request, PersonalService $service): Response
    {
        $user = $request->user();

        $activeServices = PersonalService::activeServicesForUser($user->id)
            ->map(fn (PersonalService $active) => $this->formatActiveServiceSummary(
                $active,
                $service->id,
            ))
            ->values()
            ->all();

        return Inertia::render('Reparto/PersonalServices/Show', [
            'service' => $this->formatService($service),
            'activeServices' => $activeServices,
        ]);
    }

    /**
     * @return array<string, mixed>
     */
    protected function formatService(PersonalService $service): array
    {
        $service->load('items');

        return [
            'id' => $service->id,
            'name' => $service->name,
            'amount' => (float) $service->amount,
            'spent_amount' => $service->spent_amount !== null ? (float) $service->spent_amount : null,
            'client_charge' => $service->clientCharge(),
            'description' => $service->description,
            'started_at' => $service->started_at?->toIso8601String(),
            'items' => $service->items->map(fn (PersonalServiceItem $item) => [
                'id' => $item->id,
                'description' => $item->description,
                'price' => (float) $item->price,
                'is_completed' => (bool) $item->is_completed,
            ])->values()->all(),
        ];
    }

    /**
     * @return array<string, mixed>
     */
    protected function formatActiveServiceSummary(PersonalService $service, ?int $currentServiceId = null): array
    {
        $label = trim($service->name) !== '' ? trim($service->name) : 'Sin nombre';

        return [
            'id' => $service->id,
            'name' => $service->name,
            'label' => $label,
            'started_at' => $service->started_at?->toIso8601String(),
            'is_current' => $currentServiceId !== null && $service->id === $currentServiceId,
        ];
    }
}
