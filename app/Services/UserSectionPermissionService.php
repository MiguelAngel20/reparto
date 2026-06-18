<?php

namespace App\Services;

use App\Models\User;
use App\Models\UserSectionPermission;
use App\Support\UserSection;
use Illuminate\Support\Facades\DB;

class UserSectionPermissionService
{
    /**
     * @return array<string, array<string, bool>>
     */
    public function mapForUser(User $user): array
    {
        if ($user->isAdmin()) {
            return $this->fullAccessMap();
        }

        $permissions = UserSectionPermission::query()
            ->where('user_id', $user->id)
            ->get()
            ->keyBy('section');

        $map = [];

        foreach (UserSection::all() as $section) {
            $row = $permissions->get($section);

            if (UserSection::isGranular($section)) {
                $map[$section] = $this->granularMapFromRow($row);
                continue;
            }

            $canEdit = (bool) ($row?->can_edit);
            $map[$section] = [
                'view' => $canEdit || (bool) ($row?->can_view),
                'edit' => $canEdit,
            ];
        }

        return $map;
    }

    /**
     * @return array<string, array<string, mixed>>
     */
    public function defaultsForNewRepartidor(): array
    {
        return [
            UserSection::DASHBOARD => ['can_view' => true, 'can_edit' => true],
            UserSection::REPARTO => ['can_view' => true, 'can_edit' => true],
            UserSection::MANUAL_CAPTURE => ['can_view' => true, 'can_edit' => true],
            UserSection::GASTO => ['can_view' => true, 'can_edit' => true],
            UserSection::COMPANY_BALANCE => ['can_view' => false, 'can_edit' => false],
            UserSection::CARD_ACCOUNT => [
                'can_view' => false,
                'can_create' => false,
                'can_update' => false,
                'can_delete' => false,
                'can_payment' => false,
                'can_liquidate' => false,
            ],
        ];
    }

    public function applyDefaultPermissions(User $user): void
    {
        if ($user->isAdmin()) {
            return;
        }

        if (UserSectionPermission::query()->where('user_id', $user->id)->exists()) {
            return;
        }

        $this->syncPermissions($user, $this->defaultsForNewRepartidor());
    }

    public function ensureSectionPermissionRow(User $user, string $section): void
    {
        if ($user->isAdmin()) {
            return;
        }

        $defaults = $this->defaultsForNewRepartidor();
        $data = $defaults[$section] ?? ['can_view' => false, 'can_edit' => false];

        if (UserSectionPermission::query()
            ->where('user_id', $user->id)
            ->where('section', $section)
            ->exists()) {
            return;
        }

        if (UserSection::isGranular($section)) {
            $this->syncGranularRow($user, $section, $data);

            return;
        }

        UserSectionPermission::query()->create([
            'user_id' => $user->id,
            'section' => $section,
            'can_view' => (bool) ($data['can_view'] ?? false),
            'can_edit' => (bool) ($data['can_edit'] ?? false),
        ]);
    }

    /**
     * @param  array<string, array<string, bool>>  $permissions
     */
    public function syncPermissions(User $user, array $permissions): void
    {
        if ($user->isAdmin()) {
            return;
        }

        DB::transaction(function () use ($user, $permissions) {
            foreach (UserSection::all() as $section) {
                $data = $permissions[$section] ?? [];

                if (UserSection::isGranular($section)) {
                    $this->syncGranularRow($user, $section, $data);
                    continue;
                }

                $canEdit = (bool) ($data['can_edit'] ?? false);
                $canView = $canEdit || (bool) ($data['can_view'] ?? false);

                UserSectionPermission::query()->updateOrCreate(
                    [
                        'user_id' => $user->id,
                        'section' => $section,
                    ],
                    [
                        'can_view' => $canView,
                        'can_edit' => $canEdit,
                        'can_create' => false,
                        'can_update' => false,
                        'can_delete' => false,
                        'can_payment' => false,
                        'can_liquidate' => false,
                    ],
                );
            }
        });
    }

    /**
     * @return array<string, array<string, mixed>>
     */
    public function editableMatrixForUser(User $user): array
    {
        $current = UserSectionPermission::query()
            ->where('user_id', $user->id)
            ->get()
            ->keyBy('section');

        $matrix = [];

        foreach (UserSection::all() as $section) {
            $row = $current->get($section);
            $entry = [
                'label' => UserSection::label($section),
                'mode' => UserSection::isGranular($section) ? 'granular' : 'simple',
                'can_view' => (bool) ($row?->can_view),
                'can_edit' => (bool) ($row?->can_edit),
            ];

            if (UserSection::isGranular($section)) {
                foreach (UserSection::granularActions($section) as $action) {
                    $column = 'can_'.$action;
                    $entry[$column] = (bool) ($row?->{$column});
                }
                $entry['action_labels'] = UserSection::granularActionLabels($section);
            }

            $matrix[$section] = $entry;
        }

        return $matrix;
    }

    public function canView(User $user, string $section): bool
    {
        if ($user->isAdmin()) {
            return true;
        }

        $row = $this->permissionRow($user, $section);

        if (! $row) {
            return false;
        }

        if (UserSection::isGranular($section)) {
            return $row->can_view
                || $row->can_create
                || $row->can_update
                || $row->can_delete
                || $row->can_payment
                || $row->can_liquidate;
        }

        return $row->can_edit || $row->can_view;
    }

    public function canEdit(User $user, string $section): bool
    {
        if ($user->isAdmin()) {
            return true;
        }

        if (UserSection::isGranular($section)) {
            return $this->canAction($user, $section, 'create')
                || $this->canAction($user, $section, 'update')
                || $this->canAction($user, $section, 'delete');
        }

        return (bool) $this->permissionRow($user, $section)?->can_edit;
    }

    public function canAction(User $user, string $section, string $action): bool
    {
        if ($user->isAdmin()) {
            return true;
        }

        if (! UserSection::isGranular($section)) {
            return $action === 'view'
                ? $this->canView($user, $section)
                : $this->canEdit($user, $section);
        }

        $column = 'can_'.$action;

        if (! in_array($action, UserSection::granularActions($section), true)) {
            return false;
        }

        $row = $this->permissionRow($user, $section);

        return (bool) ($row?->{$column});
    }

    public function defaultLandingUrl(User $user): string
    {
        if ($this->canView($user, UserSection::REPARTO)
            && \App\Models\CashSession::openLiveForUser($user->id)) {
            return route('reparto.index');
        }

        foreach ([
            UserSection::DASHBOARD => 'dashboard',
            UserSection::REPARTO => 'reparto.index',
            UserSection::MANUAL_CAPTURE => 'manual-capture.index',
            UserSection::GASTO => 'gasto.index',
            UserSection::COMPANY_BALANCE => 'company-balance.index',
            UserSection::CARD_ACCOUNT => 'card-account.index',
        ] as $section => $routeName) {
            if ($this->canView($user, $section)) {
                return route($routeName);
            }
        }

        return route('settings.profile');
    }

    /**
     * @param  array<string, bool>  $data
     */
    private function syncGranularRow(User $user, string $section, array $data): void
    {
        $canView = (bool) ($data['can_view'] ?? false);
        $actions = [];

        foreach (UserSection::granularActions($section) as $action) {
            $actions[$action] = (bool) ($data['can_'.$action] ?? false);
            if ($actions[$action]) {
                $canView = true;
            }
        }

        UserSectionPermission::query()->updateOrCreate(
            [
                'user_id' => $user->id,
                'section' => $section,
            ],
            [
                'can_view' => $canView,
                'can_edit' => false,
                'can_create' => $actions['create'] ?? false,
                'can_update' => $actions['update'] ?? false,
                'can_delete' => $actions['delete'] ?? false,
                'can_payment' => $actions['payment'] ?? false,
                'can_liquidate' => $actions['liquidate'] ?? false,
            ],
        );
    }

    /**
     * @return array<string, bool>
     */
    private function granularMapFromRow(?UserSectionPermission $row): array
    {
        return [
            'view' => (bool) ($row?->can_view),
            'create' => (bool) ($row?->can_create),
            'update' => (bool) ($row?->can_update),
            'delete' => (bool) ($row?->can_delete),
            'payment' => (bool) ($row?->can_payment),
            'liquidate' => (bool) ($row?->can_liquidate),
        ];
    }

    /**
     * @return array<string, array<string, bool>>
     */
    private function fullAccessMap(): array
    {
        $map = [];

        foreach (UserSection::all() as $section) {
            if (UserSection::isGranular($section)) {
                $map[$section] = [
                    'view' => true,
                    'create' => true,
                    'update' => true,
                    'delete' => true,
                    'payment' => true,
                    'liquidate' => true,
                ];
                continue;
            }

            $map[$section] = ['view' => true, 'edit' => true];
        }

        return $map;
    }

    private function permissionRow(User $user, string $section): ?UserSectionPermission
    {
        return UserSectionPermission::query()
            ->where('user_id', $user->id)
            ->where('section', $section)
            ->first();
    }
}
