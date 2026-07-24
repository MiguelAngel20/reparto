<?php

namespace App\Services;

use App\Models\CashSession;
use App\Models\DeliveryOrder;
use App\Models\PersonalService;
use App\Models\User;
use Illuminate\Support\Collection;

class TeamOverviewService
{
    /**
     * @return array{
     *     generated_at: string,
     *     summary: array{
     *         total_members: int,
     *         on_shift: int,
     *         with_active_orders: int,
     *         with_active_services: int
     *     },
     *     members: list<array{
     *         id: int,
     *         name: string,
     *         email: string,
     *         role: string|null,
     *         role_label: string,
     *         company_name: string|null,
     *         has_open_shift: bool,
     *         shift_started_at: string|null,
     *         active_orders_count: int,
     *         active_personal_services_count: int,
     *         status_key: string,
     *         status_label: string
     *     }>
     * }
     */
    public function snapshot(): array
    {
        $users = User::query()
            ->where('role', '!=', User::ROLE_ADMIN)
            ->orderBy('name')
            ->get(['id', 'name', 'email', 'role', 'company_name']);

        $openSessions = CashSession::query()
            ->live()
            ->where('status', CashSession::STATUS_OPEN)
            ->get(['user_id', 'started_at']);

        /** @var Collection<int, CashSession> $sessionByUserId */
        $sessionByUserId = $openSessions->keyBy('user_id');

        $activeOrdersByUser = DeliveryOrder::query()
            ->where('status', DeliveryOrder::STATUS_IN_PROGRESS)
            ->selectRaw('user_id, COUNT(*) as aggregate')
            ->groupBy('user_id')
            ->pluck('aggregate', 'user_id');

        $activeServicesByUser = PersonalService::query()
            ->where('status', PersonalService::STATUS_IN_PROGRESS)
            ->selectRaw('user_id, COUNT(*) as aggregate')
            ->groupBy('user_id')
            ->pluck('aggregate', 'user_id');

        $members = $users->map(function (User $user) use (
            $sessionByUserId,
            $activeOrdersByUser,
            $activeServicesByUser,
        ) {
            $session = $sessionByUserId->get($user->id);
            $activeOrders = (int) ($activeOrdersByUser[$user->id] ?? 0);
            $activeServices = (int) ($activeServicesByUser[$user->id] ?? 0);
            $hasOpenShift = $session !== null;
            $status = $this->memberStatus($hasOpenShift, $activeOrders, $activeServices);

            return [
                'id' => $user->id,
                'name' => $user->name,
                'email' => $user->email,
                'role' => $user->role,
                'role_label' => User::roleLabel($user->role),
                'company_name' => $user->company_name,
                'has_open_shift' => $hasOpenShift,
                'shift_started_at' => $session?->started_at?->format('d/m/Y H:i'),
                'active_orders_count' => $activeOrders,
                'active_personal_services_count' => $activeServices,
                'status_key' => $status['key'],
                'status_label' => $status['label'],
            ];
        })->values()->all();

        $onShift = collect($members)->where('has_open_shift', true)->count();
        $withOrders = collect($members)->where('active_orders_count', '>', 0)->count();
        $withServices = collect($members)->where('active_personal_services_count', '>', 0)->count();

        return [
            'generated_at' => now()->format('d/m/Y H:i'),
            'summary' => [
                'total_members' => count($members),
                'on_shift' => $onShift,
                'with_active_orders' => $withOrders,
                'with_active_services' => $withServices,
            ],
            'members' => $members,
        ];
    }

    /**
     * @return array{key: string, label: string}
     */
    private function memberStatus(bool $onShift, int $activeOrders, int $activeServices): array
    {
        if ($activeOrders > 0) {
            return ['key' => 'delivering', 'label' => 'Repartiendo'];
        }

        if ($activeServices > 0) {
            return ['key' => 'personal_service', 'label' => 'Servicio propio'];
        }

        if ($onShift) {
            return ['key' => 'on_shift', 'label' => 'En jornada'];
        }

        return ['key' => 'idle', 'label' => 'Sin jornada'];
    }
}
