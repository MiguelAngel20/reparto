<?php

namespace App\Http\Controllers\Settings;

use App\Http\Controllers\Controller;
use App\Http\Requests\Settings\StoreUserTransferCardRequest;
use App\Http\Requests\Settings\UpdatePasswordRequest;
use App\Http\Requests\Settings\UpdateProfileRequest;
use App\Models\User;
use App\Models\UserTransferCard;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class ProfileController extends Controller
{
    public function index(Request $request): Response
    {
        $user = $request->user();

        return Inertia::render('settings/Profile/Index', [
            'profile' => $this->formatProfile($user),
            'transferCards' => $user->transferCards()
                ->get()
                ->map(fn (UserTransferCard $card) => $this->formatTransferCard($card)),
        ]);
    }

    public function update(UpdateProfileRequest $request): RedirectResponse
    {
        $user = $request->user();

        $user->update($request->validated());

        return back()->with('success', 'Tu información se actualizó correctamente.');
    }

    public function updatePassword(UpdatePasswordRequest $request): RedirectResponse
    {
        $user = $request->user();

        $user->update([
            'password' => $request->validated('password'),
        ]);

        return back()->with('success', 'Tu contraseña se actualizó correctamente.');
    }

    public function storeTransferCard(StoreUserTransferCardRequest $request): RedirectResponse
    {
        $request->user()->transferCards()->create($request->validated());

        return back()->with('success', 'Tarjeta de transferencia guardada.');
    }

    public function updateTransferCard(
        StoreUserTransferCardRequest $request,
        UserTransferCard $transferCard,
    ): RedirectResponse {
        if ($transferCard->user_id !== $request->user()->id) {
            abort(403);
        }

        $transferCard->update($request->validated());

        return back()->with('success', 'Tarjeta de transferencia actualizada.');
    }

    public function destroyTransferCard(Request $request, UserTransferCard $transferCard): RedirectResponse
    {
        if ($transferCard->user_id !== $request->user()->id) {
            abort(403);
        }

        $transferCard->delete();

        return back()->with('success', 'Tarjeta de transferencia eliminada.');
    }

    private function formatProfile(User $user): array
    {
        return [
            'id' => $user->id,
            'name' => $user->name,
            'email' => $user->email,
            'company_name' => $user->company_name,
            'percentage' => (float) $user->percentage,
            'role' => $user->role,
            'role_label' => User::roleLabel($user->role),
            'created_at' => $user->created_at?->format('d/m/Y'),
            'created_at_full' => $user->created_at?->format('d/m/Y H:i'),
        ];
    }

    private function formatTransferCard(UserTransferCard $card): array
    {
        return $card->toDisplayArray();
    }
}
