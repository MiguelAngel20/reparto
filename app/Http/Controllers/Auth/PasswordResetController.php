<?php

namespace App\Http\Controllers\Auth;

use App\Http\Controllers\Controller;
use App\Http\Requests\Auth\ResetPasswordRequest;
use App\Mail\PasswordResetCodeMail;
use App\Models\User;
use App\Services\UserSectionPermissionService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Mail;
use Inertia\Inertia;
use Inertia\Response;

class PasswordResetController extends Controller
{
    private const SESSION_USER = 'password_reset.user_id';

    private const SESSION_CODE_HASH = 'password_reset.code_hash';

    private const SESSION_CODE_EXPIRES = 'password_reset.expires_at';

    private const SESSION_MASKED_EMAIL = 'password_reset.masked_email';

    private const SESSION_ATTEMPTS = 'password_reset.attempts';

    private const SESSION_VERIFIED = 'password_reset.verified';

    public function __construct(
        private readonly UserSectionPermissionService $sectionPermissions,
    ) {}

    public function create(Request $request): Response|RedirectResponse
    {
        if ($this->isVerified($request)) {
            return redirect()->route('password.reset');
        }

        if ($this->hasPendingCode($request)) {
            return redirect()->route('password.code');
        }

        return Inertia::render('Auth/ForgotPassword', [
            'step' => 'email',
        ]);
    }

    public function store(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'email' => ['required', 'email'],
        ], [
            'email.required' => 'El correo electrónico es obligatorio.',
            'email.email' => 'Ingresa un correo electrónico válido.',
        ]);

        /** @var User|null $user */
        $user = User::query()->where('email', $validated['email'])->first();

        if (! $user) {
            return back()->withErrors([
                'email' => 'No encontramos una cuenta con ese correo.',
            ])->onlyInput('email');
        }

        try {
            $this->sendCode($request, $user);
        } catch (\Throwable $e) {
            report($e);

            return back()->withErrors([
                'email' => 'No se pudo enviar el código. Revisa la configuración de correo o intenta más tarde.',
            ])->onlyInput('email');
        }

        return redirect()->route('password.code');
    }

    public function showCode(Request $request): Response|RedirectResponse
    {
        if ($this->isVerified($request)) {
            return redirect()->route('password.reset');
        }

        if (! $this->hasPendingCode($request)) {
            return redirect()->route('password.request');
        }

        if ($this->codeExpired($request)) {
            $this->clear($request);

            return redirect()->route('password.request')->withErrors([
                'email' => 'El código expiró. Solicita uno nuevo.',
            ]);
        }

        return Inertia::render('Auth/ForgotPassword', [
            'step' => 'code',
            'maskedEmail' => $request->session()->get(self::SESSION_MASKED_EMAIL),
            'expiresInMinutes' => config('login.verification_code_expires'),
        ]);
    }

    public function verifyCode(Request $request): RedirectResponse
    {
        if (! $this->hasPendingCode($request)) {
            return redirect()->route('password.request');
        }

        if ($this->codeExpired($request)) {
            $this->clear($request);

            return redirect()->route('password.request')->withErrors([
                'email' => 'El código expiró. Solicita uno nuevo.',
            ]);
        }

        $validated = $request->validate([
            'code' => ['required', 'string', 'size:6', 'regex:/^\d{6}$/'],
        ], [
            'code.required' => 'Ingresa el código de verificación.',
            'code.size' => 'El código debe tener 6 dígitos.',
            'code.regex' => 'El código debe tener 6 dígitos.',
        ]);

        $attempts = (int) $request->session()->get(self::SESSION_ATTEMPTS, 0);
        $maxAttempts = (int) config('login.verification_max_attempts');

        if ($attempts >= $maxAttempts) {
            $this->clear($request);

            return redirect()->route('password.request')->withErrors([
                'email' => 'Demasiados intentos fallidos. Solicita un código nuevo.',
            ]);
        }

        $codeHash = $request->session()->get(self::SESSION_CODE_HASH);
        if (! is_string($codeHash) || ! Hash::check($validated['code'], $codeHash)) {
            $request->session()->put(self::SESSION_ATTEMPTS, $attempts + 1);

            return back()->withErrors([
                'code' => 'El código ingresado no es correcto.',
            ]);
        }

        $request->session()->put(self::SESSION_VERIFIED, true);
        $request->session()->forget([
            self::SESSION_CODE_HASH,
            self::SESSION_CODE_EXPIRES,
            self::SESSION_ATTEMPTS,
        ]);

        return redirect()->route('password.reset');
    }

    public function resendCode(Request $request): RedirectResponse
    {
        if (! $this->hasPendingCode($request) || $this->isVerified($request)) {
            return redirect()->route('password.request');
        }

        /** @var User|null $user */
        $user = User::query()->find((int) $request->session()->get(self::SESSION_USER));
        if (! $user) {
            $this->clear($request);

            return redirect()->route('password.request');
        }

        try {
            $this->sendCode($request, $user);
        } catch (\Throwable $e) {
            report($e);

            return back()->withErrors([
                'code' => 'No se pudo reenviar el código. Intenta más tarde.',
            ]);
        }

        return back()->with('success', 'Te enviamos un nuevo código a tu correo.');
    }

    public function showReset(Request $request): Response|RedirectResponse
    {
        if (! $this->isVerified($request)) {
            return redirect()->route('password.request');
        }

        return Inertia::render('Auth/ForgotPassword', [
            'step' => 'password',
            'maskedEmail' => $request->session()->get(self::SESSION_MASKED_EMAIL),
        ]);
    }

    public function reset(ResetPasswordRequest $request): RedirectResponse
    {
        if (! $this->isVerified($request)) {
            return redirect()->route('password.request');
        }

        /** @var User|null $user */
        $user = User::query()->find((int) $request->session()->get(self::SESSION_USER));
        $this->clear($request);

        if (! $user) {
            return redirect()->route('password.request')->withErrors([
                'email' => 'No se pudo restablecer la contraseña. Intenta de nuevo.',
            ]);
        }

        $user->update([
            'password' => $request->validated('password'),
        ]);

        if (! $user->hasVerifiedEmail()) {
            $user->markEmailAsVerified();
        }

        config(['session.lifetime' => 60 * 24 * 30]);
        $request->session()->regenerate();
        Auth::login($user, true);

        return redirect()->intended($this->sectionPermissions->defaultLandingUrl($user));
    }

    public function cancel(Request $request): RedirectResponse
    {
        $this->clear($request);

        return redirect()->route('login');
    }

    private function sendCode(Request $request, User $user): void
    {
        $code = str_pad((string) random_int(0, 999999), 6, '0', STR_PAD_LEFT);
        $expiresMinutes = (int) config('login.verification_code_expires');

        Mail::to($user->email)->send(new PasswordResetCodeMail($code, $expiresMinutes));

        $request->session()->put([
            self::SESSION_USER => $user->id,
            self::SESSION_CODE_HASH => Hash::make($code),
            self::SESSION_CODE_EXPIRES => now()->addMinutes($expiresMinutes)->timestamp,
            self::SESSION_MASKED_EMAIL => $this->maskEmail($user->email),
            self::SESSION_ATTEMPTS => 0,
            self::SESSION_VERIFIED => false,
        ]);
    }

    private function hasPendingCode(Request $request): bool
    {
        return $request->session()->has(self::SESSION_USER)
            && $request->session()->has(self::SESSION_CODE_HASH)
            && ! $this->isVerified($request);
    }

    private function isVerified(Request $request): bool
    {
        return $request->session()->get(self::SESSION_VERIFIED) === true
            && $request->session()->has(self::SESSION_USER);
    }

    private function codeExpired(Request $request): bool
    {
        $expiresAt = $request->session()->get(self::SESSION_CODE_EXPIRES);

        return ! is_numeric($expiresAt) || now()->timestamp > (int) $expiresAt;
    }

    private function clear(Request $request): void
    {
        $request->session()->forget([
            self::SESSION_USER,
            self::SESSION_CODE_HASH,
            self::SESSION_CODE_EXPIRES,
            self::SESSION_MASKED_EMAIL,
            self::SESSION_ATTEMPTS,
            self::SESSION_VERIFIED,
        ]);
    }

    private function maskEmail(string $email): string
    {
        $parts = explode('@', $email, 2);
        if (count($parts) !== 2) {
            return $email;
        }

        [$local, $domain] = $parts;
        $visible = mb_substr($local, 0, min(2, mb_strlen($local)));

        return $visible.str_repeat('*', max(1, mb_strlen($local) - mb_strlen($visible))).'@'.$domain;
    }
}
