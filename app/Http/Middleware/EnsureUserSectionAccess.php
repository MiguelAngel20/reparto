<?php

namespace App\Http\Middleware;

use App\Services\UserSectionPermissionService;
use App\Support\UserSection;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class EnsureUserSectionAccess
{
    public function __construct(
        private readonly UserSectionPermissionService $permissions,
    ) {}

    public function handle(Request $request, Closure $next, string $section, string $action = 'view'): Response
    {
        $user = $request->user();

        if (! $user) {
            abort(403);
        }

        if (! in_array($section, UserSection::all(), true)) {
            abort(500, 'Sección no configurada.');
        }

        $allowed = match ($action) {
            'view' => $this->permissions->canView($user, $section),
            'edit' => $this->permissions->canEdit($user, $section),
            default => $this->permissions->canAction($user, $section, $action),
        };

        if (! $allowed) {
            abort(403, 'No tienes permiso para acceder a esta sección.');
        }

        return $next($request);
    }
}
