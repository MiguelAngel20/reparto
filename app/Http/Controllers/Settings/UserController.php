<?php

namespace App\Http\Controllers\Settings;

use App\Http\Controllers\Controller;
use App\Http\Requests\Settings\UpdateUserSectionPermissionsRequest;
use App\Models\User;
use App\Services\UserSectionPermissionService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class UserController extends Controller
{
    public function __construct(
        private readonly UserSectionPermissionService $sectionPermissions,
    ) {}

    public function index(Request $request): Response
    {
        abort_unless($request->user()?->isAdmin(), 403);

        $search = $request->string('search')->trim()->toString();

        $users = User::query()
            ->when($search !== '', function ($query) use ($search) {
                $query->where(function ($q) use ($search) {
                    $q->where('name', 'like', "%{$search}%")
                        ->orWhere('email', 'like', "%{$search}%")
                        ->orWhere('company_name', 'like', "%{$search}%");
                });
            })
            ->orderBy('name')
            ->paginate(15)
            ->withQueryString()
            ->through(fn (User $user) => $this->formatUser($user));

        return Inertia::render('settings/Users/Index', [
            'users' => $users,
            'filters' => [
                'search' => $search,
            ],
        ]);
    }

    public function editPermissions(Request $request, User $user): Response
    {
        abort_unless($request->user()?->isAdmin(), 403);

        if ($user->isAdmin()) {
            return Inertia::render('settings/Users/Permissions', [
                'user' => $this->formatUser($user),
                'permissions' => $this->sectionPermissions->editableMatrixForUser($user),
                'isAdminUser' => true,
            ]);
        }

        $this->sectionPermissions->applyDefaultPermissions($user);

        return Inertia::render('settings/Users/Permissions', [
            'user' => $this->formatUser($user),
            'permissions' => $this->sectionPermissions->editableMatrixForUser($user),
            'isAdminUser' => false,
        ]);
    }

    public function updatePermissions(
        UpdateUserSectionPermissionsRequest $request,
        User $user,
    ): RedirectResponse {
        abort_unless($request->user()?->isAdmin(), 403);

        if ($user->isAdmin()) {
            return back()->with('error', 'El administrador siempre tiene acceso completo.');
        }

        $this->sectionPermissions->syncPermissions(
            $user,
            $request->validated('permissions'),
        );

        return redirect()
            ->route('settings.users.permissions', $user)
            ->with('success', 'Permisos actualizados correctamente.');
    }

    /**
     * @return array<string, mixed>
     */
    private function formatUser(User $user): array
    {
        return [
            'id' => $user->id,
            'name' => $user->name,
            'email' => $user->email,
            'company_name' => $user->company_name,
            'percentage' => (float) $user->percentage,
            'role' => $user->role,
            'role_label' => User::roleLabel($user->role),
            'created_at' => $user->created_at?->format('d/m/Y H:i'),
        ];
    }
}
