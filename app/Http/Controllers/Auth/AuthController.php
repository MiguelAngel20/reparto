<?php

namespace App\Http\Controllers\Auth;

use App\Http\Controllers\Controller;
use App\Http\Requests\Auth\LoginRequest;
use App\Http\Requests\Auth\RegisterRequest;
use App\Mail\LoginVerificationCodeMail;
use App\Mail\RegisterVerificationMail;
use App\Models\CashSession;
use App\Models\User;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\URL;
use Inertia\Inertia;
use Inertia\Response;

class AuthController extends Controller
{
    private const SESSION_PENDING_USER = 'login.pending_user_id';

    private const SESSION_REMEMBER = 'login.remember';

    private const SESSION_CODE_HASH = 'login.code_hash';

    private const SESSION_CODE_EXPIRES = 'login.code_expires_at';

    private const SESSION_MASKED_EMAIL = 'login.masked_email';

    private const SESSION_ATTEMPTS = 'login.verification_attempts';

    public function showLoginForm(Request $request): Response|RedirectResponse
    {
        if (Auth::check()) {
            return redirect($this->homeUrl($request->user()));
        }

        if ($this->hasPendingVerification($request)) {
            return redirect()->route('login.verify');
        }

        return Inertia::render('Auth/Login', [
            'step' => 'credentials',
        ]);
    }

    public function login(LoginRequest $request): RedirectResponse
    {
        $credentials = $request->validated();
        $remember = $request->boolean('remember');

        if (! Auth::validate($credentials)) {
            return back()->withErrors([
                'email' => 'Las credenciales proporcionadas no coinciden con nuestros registros.',
            ])->onlyInput('email');
        }

        /** @var User $user */
        $user = User::query()->where('email', $credentials['email'])->firstOrFail();

        if (! $user->hasVerifiedEmail()) {
            return back()->withErrors([
                'email' => 'Debes verificar tu correo antes de iniciar sesión. Revisa tu bandeja de entrada.',
            ])->onlyInput('email');
        }

        try {
            $this->startPendingVerification($request, $user, $remember);
        } catch (\Throwable $e) {
            report($e);

            return back()->withErrors([
                'email' => 'No se pudo enviar el código de verificación. Revisa la configuración de correo o intenta más tarde.',
            ])->onlyInput('email');
        }

        return redirect()->route('login.verify');
    }

    public function showVerifyForm(Request $request): Response|RedirectResponse
    {
        if (Auth::check()) {
            return redirect($this->homeUrl($request->user()));
        }

        if (! $this->hasPendingVerification($request)) {
            return redirect()->route('login');
        }

        if ($this->verificationExpired($request)) {
            $this->clearPendingVerification($request);

            return redirect()->route('login')->withErrors([
                'email' => 'El código de verificación expiró. Inicia sesión nuevamente.',
            ]);
        }

        return Inertia::render('Auth/Login', [
            'step' => 'verify',
            'maskedEmail' => $request->session()->get(self::SESSION_MASKED_EMAIL),
            'expiresInMinutes' => config('login.verification_code_expires'),
        ]);
    }

    public function verifyLoginCode(Request $request): RedirectResponse
    {
        if (! $this->hasPendingVerification($request)) {
            return redirect()->route('login');
        }

        if ($this->verificationExpired($request)) {
            $this->clearPendingVerification($request);

            return redirect()->route('login')->withErrors([
                'email' => 'El código de verificación expiró. Inicia sesión nuevamente.',
            ]);
        }

        $validated = $request->validate([
            'code' => ['required', 'string', 'size:6', 'regex:/^\d{6}$/'],
        ]);

        $attempts = (int) $request->session()->get(self::SESSION_ATTEMPTS, 0);
        $maxAttempts = config('login.verification_max_attempts');

        if ($attempts >= $maxAttempts) {
            $this->clearPendingVerification($request);

            return redirect()->route('login')->withErrors([
                'email' => 'Demasiados intentos fallidos. Inicia sesión nuevamente.',
            ]);
        }

        $codeHash = $request->session()->get(self::SESSION_CODE_HASH);
        if (! is_string($codeHash) || ! Hash::check($validated['code'], $codeHash)) {
            $request->session()->put(self::SESSION_ATTEMPTS, $attempts + 1);

            return back()->withErrors([
                'code' => 'El código ingresado no es correcto.',
            ]);
        }

        $userId = (int) $request->session()->get(self::SESSION_PENDING_USER);
        $remember = (bool) $request->session()->get(self::SESSION_REMEMBER, false);

        /** @var User|null $user */
        $user = User::query()->find($userId);
        $this->clearPendingVerification($request);

        if (! $user) {
            return redirect()->route('login')->withErrors([
                'email' => 'No se pudo completar el inicio de sesión. Intenta de nuevo.',
            ]);
        }

        Auth::login($user, $remember);
        $request->session()->regenerate();

        return redirect()->intended($this->homeUrl($user));
    }

    /** Con jornada abierta el destino por defecto es la jornada en curso; si no, el dashboard. */
    private function homeUrl(User $user): string
    {
        return CashSession::openLiveForUser($user->id)
            ? route('reparto.index')
            : route('dashboard');
    }

    public function resendLoginCode(Request $request): RedirectResponse
    {
        if (! $this->hasPendingVerification($request)) {
            return redirect()->route('login');
        }

        $userId = (int) $request->session()->get(self::SESSION_PENDING_USER);
        $remember = (bool) $request->session()->get(self::SESSION_REMEMBER, false);

        /** @var User|null $user */
        $user = User::query()->find($userId);
        if (! $user) {
            $this->clearPendingVerification($request);

            return redirect()->route('login');
        }

        try {
            $this->startPendingVerification($request, $user, $remember);
        } catch (\Throwable $e) {
            report($e);

            return back()->withErrors([
                'code' => 'No se pudo reenviar el código. Intenta más tarde.',
            ]);
        }

        return back()->with('success', 'Te enviamos un nuevo código a tu correo.');
    }

    public function cancelVerification(Request $request): RedirectResponse
    {
        $this->clearPendingVerification($request);

        return redirect()->route('login');
    }

    public function showRegisterForm(Request $request): Response|RedirectResponse
    {
        if (Auth::check()) {
            return redirect($this->homeUrl($request->user()));
        }

        return Inertia::render('Auth/Register');
    }

    public function register(RegisterRequest $request): RedirectResponse
    {
        $validated = $request->validated();

        $user = User::query()->create([
            'name' => $validated['name'],
            'email' => $validated['email'],
            'password' => $validated['password'],
            'company_name' => User::DEFAULT_COMPANY_NAME,
            'percentage' => User::DEFAULT_REPARTIDOR_PERCENTAGE,
            'role' => User::ROLE_REPARTIDOR,
        ]);

        try {
            $this->sendRegisterVerificationEmail($user);
        } catch (\Throwable $e) {
            report($e);
            $user->delete();

            return back()->withErrors([
                'email' => 'No se pudo enviar el correo de verificación. Intenta más tarde.',
            ])->onlyInput('name', 'email');
        }

        return redirect()
            ->route('register')
            ->with('registration_complete', true)
            ->with('registered_email', $user->email);
    }

    public function verifyEmail(Request $request, int $id, string $hash): RedirectResponse
    {
        if (! $request->hasValidSignature()) {
            return redirect()->route('login')->withErrors([
                'email' => 'El enlace de verificación no es válido o expiró. Regístrate de nuevo o contacta soporte.',
            ]);
        }

        /** @var User|null $user */
        $user = User::query()->find($id);

        if (! $user) {
            return redirect()->route('login')->withErrors([
                'email' => 'No se encontró la cuenta asociada a este enlace.',
            ]);
        }

        if (! hash_equals($hash, sha1($user->getEmailForVerification()))) {
            abort(403);
        }

        if ($user->hasVerifiedEmail()) {
            return redirect()
                ->route('login')
                ->with('success', 'Tu correo ya estaba verificado. Ya puedes iniciar sesión.');
        }

        $user->markEmailAsVerified();

        return redirect()
            ->route('login')
            ->with('success', 'Su correo fue verificado exitosamente. Ya puedes iniciar sesión.');
    }

    public function logout(Request $request): RedirectResponse
    {
        Auth::logout();

        $request->session()->invalidate();
        $request->session()->regenerateToken();

        return redirect()->route('login');
    }

    private function startPendingVerification(Request $request, User $user, bool $remember): void
    {
        $code = str_pad((string) random_int(0, 999999), 6, '0', STR_PAD_LEFT);
        $expiresMinutes = config('login.verification_code_expires');

        Mail::to($user->email)->send(new LoginVerificationCodeMail($code, $expiresMinutes));

        $request->session()->put([
            self::SESSION_PENDING_USER => $user->id,
            self::SESSION_REMEMBER => $remember,
            self::SESSION_CODE_HASH => Hash::make($code),
            self::SESSION_CODE_EXPIRES => now()->addMinutes($expiresMinutes)->timestamp,
            self::SESSION_MASKED_EMAIL => $this->maskEmail($user->email),
            self::SESSION_ATTEMPTS => 0,
        ]);
    }

    private function hasPendingVerification(Request $request): bool
    {
        return $request->session()->has(self::SESSION_PENDING_USER)
            && $request->session()->has(self::SESSION_CODE_HASH);
    }

    private function verificationExpired(Request $request): bool
    {
        $expiresAt = $request->session()->get(self::SESSION_CODE_EXPIRES);

        return ! is_numeric($expiresAt) || now()->timestamp > (int) $expiresAt;
    }

    private function clearPendingVerification(Request $request): void
    {
        $request->session()->forget([
            self::SESSION_PENDING_USER,
            self::SESSION_REMEMBER,
            self::SESSION_CODE_HASH,
            self::SESSION_CODE_EXPIRES,
            self::SESSION_MASKED_EMAIL,
            self::SESSION_ATTEMPTS,
        ]);
    }

    private function sendRegisterVerificationEmail(User $user): void
    {
        $expiresMinutes = config('login.email_verification_expires');

        $verificationUrl = URL::temporarySignedRoute(
            'verification.verify',
            now()->addMinutes($expiresMinutes),
            [
                'id' => $user->id,
                'hash' => sha1($user->getEmailForVerification()),
            ],
        );

        Mail::to($user->email)->send(new RegisterVerificationMail(
            $verificationUrl,
            $expiresMinutes,
            $user->name,
        ));
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
