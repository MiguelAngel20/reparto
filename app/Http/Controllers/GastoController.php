<?php

namespace App\Http\Controllers;

use App\Http\Requests\Gasto\StoreDailyExpenseRequest;
use App\Http\Requests\Gasto\UpdateDailyExpenseRequest;
use App\Models\CashSession;
use App\Models\DailyExpense;
use App\Services\DailyEarningsHelper;
use App\Support\DateRangeQuery;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class GastoController extends Controller
{
    public function index(Request $request): Response
    {
        $user = $request->user();
        [$dateFrom, $dateTo] = DateRangeQuery::resolve($request);
        $summary = DailyEarningsHelper::summaryForUserInRange($user->id, $dateFrom, $dateTo);

        $expenses = DailyExpense::query()
            ->where('user_id', $user->id)
            ->whereDate('expense_date', '>=', $dateFrom)
            ->whereDate('expense_date', '<=', $dateTo)
            ->orderByDesc('expense_date')
            ->latest()
            ->get()
            ->map(fn (DailyExpense $expense) => $this->formatExpense($expense));

        return Inertia::render('Gasto/Index', [
            'dateFrom' => $dateFrom,
            'dateTo' => $dateTo,
            'rangeLabel' => DateRangeQuery::formatLabel($dateFrom, $dateTo),
            'isSingleDay' => DateRangeQuery::isSingleDay($dateFrom, $dateTo),
            'isTodayRange' => DateRangeQuery::isTodayRange($dateFrom, $dateTo),
            'todayEarnings' => $summary['today_earnings'],
            'totalExpenses' => $summary['total_expenses'],
            'netEarnings' => $summary['net_earnings'],
            'completedOrdersToday' => $summary['completed_orders_today'],
            'hasOpenLiveSession' => $summary['has_open_live_session'],
            'hasSessionToday' => $summary['has_session_today'],
            'expenses' => $expenses,
        ]);
    }

    public function store(StoreDailyExpenseRequest $request): RedirectResponse
    {
        DailyExpense::query()->create([
            'user_id' => $request->user()->id,
            'expense_date' => CashSession::activityBookingDateForUser($request->user()->id),
            'name' => trim($request->validated('name')),
            'amount' => round((float) $request->validated('amount'), 2),
            'concept' => $request->validated('concept'),
        ]);

        return back()->with('success', 'Gasto registrado.');
    }

    public function update(UpdateDailyExpenseRequest $request, DailyExpense $expense): RedirectResponse
    {
        abort_unless($expense->user_id === $request->user()->id, 403);

        $expense->update([
            'name' => trim($request->validated('name')),
            'amount' => round((float) $request->validated('amount'), 2),
            'concept' => $request->validated('concept'),
        ]);

        return back()->with('success', 'Gasto actualizado.');
    }

    public function destroy(Request $request, DailyExpense $expense): RedirectResponse
    {
        abort_unless($expense->user_id === $request->user()->id, 403);

        $expense->delete();

        return back()->with('success', 'Gasto eliminado.');
    }

    /**
     * @return array<string, mixed>
     */
    private function formatExpense(DailyExpense $expense): array
    {
        return [
            'id' => $expense->id,
            'name' => $expense->name,
            'amount' => (float) $expense->amount,
            'amount_label' => '$'.number_format((float) $expense->amount, 2),
            'concept' => $expense->concept,
            'expense_date' => $expense->expense_date->format('Y-m-d'),
            'expense_date_formatted' => $expense->expense_date->format('d/m/Y'),
            'created_at' => $expense->created_at?->format('H:i'),
        ];
    }
}
