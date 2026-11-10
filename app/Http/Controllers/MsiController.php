<?php

namespace App\Http\Controllers;

use App\Http\Requests\Msi\PayMsiMonthsRequest;
use App\Http\Requests\Msi\SendMsiPurchaseEmailRequest;
use App\Http\Requests\Msi\StoreMsiAccountRequest;
use App\Http\Requests\Msi\StoreMsiPurchaseRequest;
use App\Http\Requests\Msi\ToggleMsiInstallmentRequest;
use App\Mail\MsiPurchaseDetailsMail;
use App\Models\MsiAccount;
use App\Models\MsiInstallment;
use App\Models\MsiPurchase;
use App\Models\User;
use App\Services\MsiService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Mail;
use Inertia\Inertia;
use Inertia\Response;
use InvalidArgumentException;
use Throwable;

class MsiController extends Controller
{
    public function __construct(
        private readonly MsiService $msi,
    ) {}

    public function index(Request $request): Response
    {
        $accounts = $this->msi->listAccountsForUser($request->user());

        return Inertia::render('Msi/Index', [
            'accounts' => $accounts,
            'totals' => [
                'original' => round(array_sum(array_column($accounts, 'original_total')), 2),
                'remaining' => round(array_sum(array_column($accounts, 'remaining_total')), 2),
                'paid' => round(array_sum(array_column($accounts, 'paid_total')), 2),
            ],
        ]);
    }

    public function show(Request $request, MsiAccount $account): Response
    {
        $this->msi->assertOwned($request->user(), $account);
        $account->load(['purchases.installments']);

        return Inertia::render('Msi/Show', [
            'account' => $this->msi->formatAccountDetail($account),
            'users' => User::query()
                ->orderBy('name')
                ->get(['id', 'name', 'email'])
                ->map(fn (User $user) => [
                    'id' => $user->id,
                    'name' => $user->name,
                    'email' => $user->email,
                ])
                ->values()
                ->all(),
        ]);
    }

    public function store(StoreMsiAccountRequest $request): RedirectResponse
    {
        $account = $this->msi->createAccount($request->user(), $request->validated('name'));

        return redirect()
            ->route('msi.show', $account)
            ->with('success', 'Tarjeta MSI registrada.');
    }

    public function update(StoreMsiAccountRequest $request, MsiAccount $account): RedirectResponse
    {
        $this->msi->assertOwned($request->user(), $account);
        $this->msi->renameAccount($account, $request->validated('name'));

        return back()->with('success', 'Nombre de la tarjeta actualizado.');
    }

    public function destroy(Request $request, MsiAccount $account): RedirectResponse
    {
        $this->msi->assertOwned($request->user(), $account);
        $account->delete();

        return redirect()
            ->route('msi.index')
            ->with('success', 'Tarjeta MSI eliminada.');
    }

    public function storePurchase(StoreMsiPurchaseRequest $request, MsiAccount $account): RedirectResponse
    {
        $this->msi->assertOwned($request->user(), $account);

        try {
            $this->msi->createPurchase($account, $request->user(), $request->validated());
        } catch (InvalidArgumentException $exception) {
            return back()->with('error', $exception->getMessage());
        }

        return back()->with('success', 'Compra a MSI registrada.');
    }

    public function destroyPurchase(Request $request, MsiAccount $account, MsiPurchase $purchase): RedirectResponse
    {
        $this->msi->assertOwned($request->user(), $account);
        abort_unless($purchase->msi_account_id === $account->id, 404);
        $this->msi->assertPurchaseOwned($request->user(), $purchase);

        $purchase->delete();

        return back()->with('success', 'Compra eliminada.');
    }

    public function toggleInstallment(
        ToggleMsiInstallmentRequest $request,
        MsiAccount $account,
        MsiPurchase $purchase,
        MsiInstallment $installment,
    ): RedirectResponse {
        $this->msi->assertOwned($request->user(), $account);
        abort_unless($purchase->msi_account_id === $account->id, 404);
        abort_unless($installment->msi_purchase_id === $purchase->id, 404);
        $this->msi->assertPurchaseOwned($request->user(), $purchase);

        $paid = (bool) $request->validated('paid');

        if ($paid) {
            $this->msi->markInstallmentPaid($installment, $request->validated('paid_at'));
            return back()->with('success', 'Mes marcado como pagado.');
        }

        $this->msi->markInstallmentUnpaid($installment);

        return back()->with('success', 'Mes marcado como pendiente.');
    }

    public function payMonths(
        PayMsiMonthsRequest $request,
        MsiAccount $account,
        MsiPurchase $purchase,
    ): RedirectResponse {
        $this->msi->assertOwned($request->user(), $account);
        abort_unless($purchase->msi_account_id === $account->id, 404);
        $this->msi->assertPurchaseOwned($request->user(), $purchase);

        try {
            $count = $this->msi->payNextMonths(
                $purchase,
                (int) $request->validated('months'),
                $request->validated('paid_at'),
            );
        } catch (InvalidArgumentException $exception) {
            return back()->with('error', $exception->getMessage());
        }

        return back()->with('success', $count === 1
            ? '1 mes marcado como pagado.'
            : "{$count} meses marcados como pagados.");
    }

    public function sendPurchaseEmail(
        SendMsiPurchaseEmailRequest $request,
        MsiAccount $account,
        MsiPurchase $purchase,
    ): RedirectResponse {
        $this->msi->assertOwned($request->user(), $account);
        abort_unless($purchase->msi_account_id === $account->id, 404);
        $this->msi->assertPurchaseOwned($request->user(), $purchase);

        $purchase->loadMissing('installments');
        $formatted = $this->msi->formatPurchase($purchase);

        $recipientEmail = null;
        if ($request->filled('user_id')) {
            $recipient = User::query()->find((int) $request->validated('user_id'));
            $recipientEmail = $recipient?->email;
        }

        if (! $recipientEmail && $request->filled('email')) {
            $recipientEmail = strtolower(trim((string) $request->validated('email')));
        }

        if (! $recipientEmail) {
            return back()->with('error', 'No se pudo determinar el correo de destino.');
        }

        $details = [
            'account_name' => $account->name,
            'purchase_name' => $formatted['name'],
            'original_amount' => $formatted['original_amount'],
            'monthly_amount' => $formatted['monthly_amount'],
            'months_total' => $formatted['months_total'],
            'first_due_date_formatted' => $formatted['first_due_date_formatted'] ?? '',
            'installments' => array_map(
                fn (array $installment) => [
                    'number' => $installment['number'],
                    'due_date_formatted' => $installment['due_date_formatted'],
                    'amount' => $installment['amount'],
                    'paid' => $installment['paid'],
                    'paid_at_formatted' => $installment['paid_at_formatted'],
                ],
                $formatted['installments'],
            ),
        ];

        try {
            Mail::to($recipientEmail)->send(new MsiPurchaseDetailsMail(
                $details,
                $request->user()->name,
            ));
        } catch (Throwable) {
            return back()->with('error', 'No se pudo enviar el correo. Intenta de nuevo.');
        }

        return back()->with('success', "Detalle enviado a {$recipientEmail}.");
    }
}
