<?php

namespace App\Http\Controllers;

use App\Services\DashboardService;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class DashboardController extends Controller
{
    public function __construct(
        protected DashboardService $dashboard,
    ) {}

    public function index(Request $request): Response
    {
        $user = $request->user();

        return Inertia::render('Dashboard/Dashboard', [
            'companyName' => $user->company_name ?? 'Clikio',
            'todayStats' => $this->dashboard->todayStatsForUser($user),
            'dailyEarnings' => $this->dashboard->dailyEarningsForUser($user->id),
        ]);
    }
}
