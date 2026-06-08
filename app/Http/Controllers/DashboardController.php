<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class DashboardController extends Controller
{
    public function index(Request $request): Response
    {
        return Inertia::render('Dashboard/Dashboard', [
            'stats' => [
                'entregasHoy' => 0,
                'entregasPendientes' => 0,
                'repartidoresActivos' => 0,
                'clientes' => 0,
            ],
            'chartData' => [
                ['label' => 'Lun', 'total' => 0],
                ['label' => 'Mar', 'total' => 0],
                ['label' => 'Mié', 'total' => 0],
                ['label' => 'Jue', 'total' => 0],
                ['label' => 'Vie', 'total' => 0],
                ['label' => 'Sáb', 'total' => 0],
                ['label' => 'Dom', 'total' => 0],
            ],
        ]);
    }
}
