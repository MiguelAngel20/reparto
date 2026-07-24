<?php

namespace App\Http\Controllers;

use App\Services\TeamOverviewService;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class TeamController extends Controller
{
    public function __construct(
        private readonly TeamOverviewService $teamOverview,
    ) {}

    public function index(Request $request): Response
    {
        abort_unless($request->user()?->isAdmin(), 403);

        return Inertia::render('Equipo/Index', $this->teamOverview->snapshot());
    }
}
