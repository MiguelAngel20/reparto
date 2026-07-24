<?php

namespace App\Http\Controllers;

use App\Services\TeamOverviewService;
use App\Support\DateRangeQuery;
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

        [$dateFrom, $dateTo] = DateRangeQuery::resolve($request);

        return Inertia::render('Equipo/Index', [
            ...$this->teamOverview->snapshot($dateFrom, $dateTo),
            'dateFrom' => $dateFrom,
            'dateTo' => $dateTo,
            'rangeLabel' => DateRangeQuery::formatLabel($dateFrom, $dateTo),
            'isSingleDay' => DateRangeQuery::isSingleDay($dateFrom, $dateTo),
        ]);
    }
}
