import * as React from 'react';
import { Head, Link, router, useForm, usePage } from '@inertiajs/react';
import { Mail, Lock, Eye, EyeOff, ShieldCheck, ArrowLeft } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { AppBrandLogo } from '@/components/app-brand-logo';
import { AuthFormField } from '@/components/auth/auth-form-field';
import { AuthFormAlert } from '@/components/auth/auth-form-alert';
import { cn } from '@/lib/utils';
import {
    isLoginAuthError,
    LOGIN_AUTH_ERROR_MESSAGE,
    validateLogin,
} from '@/lib/auth-validation';

type LoginStep = 'credentials' | 'verify';

interface LoginProps {
    step?: LoginStep;
    maskedEmail?: string | null;
    expiresInMinutes?: number;
}

export default function Login({
    step = 'credentials',
    maskedEmail = null,
    expiresInMinutes = 10,
}: LoginProps) {
    const { flash } = usePage().props as { flash?: { success?: string } };
    const [showPassword, setShowPassword] = React.useState(false);

    const credentialsForm = useForm({
        email: '',
        password: '',
        remember: false,
    });

    const verifyForm = useForm({
        code: '',
    });

    const hasAuthError = isLoginAuthError(credentialsForm.errors.email);
    const bannerMessage = hasAuthError ? LOGIN_AUTH_ERROR_MESSAGE : null;

    const fieldError = (field: 'email' | 'password') => {
        if (hasAuthError) {
            return undefined;
        }
        return credentialsForm.errors[field];
    };

    const clearField = (field: 'email' | 'password') => {
        if (hasAuthError) {
            credentialsForm.clearErrors();
            return;
        }
        if (credentialsForm.errors[field]) {
            credentialsForm.clearErrors(field);
        }
    };

    const handleCredentialsSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        credentialsForm.clearErrors();

        const clientErrors = validateLogin(credentialsForm.data);
        Object.entries(clientErrors).forEach(([key, message]) => {
            credentialsForm.setError(key as 'email' | 'password', message);
        });

        if (Object.keys(clientErrors).length > 0) {
            return;
        }

        credentialsForm.post('/login', { preserveScroll: true });
    };

    const handleVerifySubmit = (e: React.FormEvent) => {
        e.preventDefault();
        verifyForm.post('/login/verify', { preserveScroll: true });
    };

    const handleCodeChange = (value: string) => {
        const digitsOnly = value.replace(/\D/g, '').slice(0, 6);
        verifyForm.setData('code', digitsOnly);
    };

    const handleResendCode = () => {
        router.post('/login/resend-code', {}, { preserveScroll: true });
    };

    const handleCancelVerification = () => {
        router.post('/login/cancel');
    };

    const isVerifyStep = step === 'verify';

    return (
        <div className="flex min-h-screen items-center justify-center bg-white p-4">
            <Head title={isVerifyStep ? 'Verificar código' : 'Iniciar Sesión'} />

            <div className="w-full max-w-md">
                <div className="mb-6 flex w-full justify-center">
                    <AppBrandLogo variant="login" />
                </div>

                {isVerifyStep ? (
                    <form onSubmit={handleVerifySubmit} noValidate>
                        <div className="overflow-hidden rounded-xl border-2 border-slate-300 bg-white shadow-sm">
                            <div className="border-b border-slate-200 px-5 pb-4 pt-5 text-center">
                                <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-blue-50">
                                    <ShieldCheck className="h-6 w-6 text-blue-600" />
                                </div>
                                <h1 className="mb-2 text-2xl font-bold text-slate-900">
                                    Verifica tu correo
                                </h1>
                                <p className="text-sm text-slate-600">
                                    Enviamos un código de 6 dígitos a{' '}
                                    <span className="font-semibold text-slate-800">
                                        {maskedEmail || 'tu correo'}
                                    </span>
                                </p>
                                <p className="mt-1 text-xs text-slate-500">
                                    El código expira en {expiresInMinutes} minutos
                                </p>
                            </div>

                            <div className="p-5">
                                <label
                                    htmlFor="code"
                                    className="mb-3 block text-base font-semibold text-slate-600"
                                >
                                    Código de verificación
                                </label>
                                <Input
                                    id="code"
                                    type="text"
                                    inputMode="numeric"
                                    autoComplete="one-time-code"
                                    value={verifyForm.data.code}
                                    onChange={(e) => handleCodeChange(e.target.value)}
                                    placeholder="000000"
                                    maxLength={6}
                                    className={cn(
                                        'h-12 border-slate-300 text-center text-2xl font-bold tracking-[0.4em]',
                                        verifyForm.errors.code &&
                                            'border-rose-500 focus-visible:border-rose-500',
                                    )}
                                    required
                                    autoFocus
                                />
                                {verifyForm.errors.code && (
                                    <p className="mt-2 text-xs font-medium text-rose-500">
                                        {verifyForm.errors.code}
                                    </p>
                                )}
                                {flash?.success && (
                                    <p className="mt-2 text-xs font-medium text-green-600">
                                        {flash.success}
                                    </p>
                                )}
                            </div>

                            <div className="space-y-3 px-5 pb-5">
                                <button
                                    type="submit"
                                    className="h-11 w-full rounded-md bg-blue-600 text-base font-semibold text-white shadow transition-colors hover:bg-blue-700 active:bg-blue-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50"
                                    disabled={
                                        verifyForm.processing ||
                                        verifyForm.data.code.length !== 6
                                    }
                                >
                                    {verifyForm.processing
                                        ? 'Verificando...'
                                        : 'Confirmar acceso'}
                                </button>

                                <button
                                    type="button"
                                    onClick={handleResendCode}
                                    disabled={verifyForm.processing}
                                    className="w-full text-sm font-medium text-blue-600 hover:text-blue-700 hover:underline disabled:opacity-50"
                                >
                                    Reenviar código
                                </button>

                                <button
                                    type="button"
                                    onClick={handleCancelVerification}
                                    className="flex w-full items-center justify-center gap-1 text-sm text-slate-600 hover:text-slate-800"
                                >
                                    <ArrowLeft className="h-4 w-4" />
                                    Volver al inicio de sesión
                                </button>
                            </div>
                        </div>
                    </form>
                ) : (
                    <form onSubmit={handleCredentialsSubmit} noValidate>
                        <div
                            className={`overflow-hidden rounded-xl border-2 bg-white shadow-sm ${
                                bannerMessage ? 'border-rose-300' : 'border-slate-300'
                            }`}
                        >
                            <div className="border-b border-slate-200 px-5 pb-4 pt-5 text-center">
                                <h1 className="mb-2 text-2xl font-bold text-slate-900">
                                    Inicia sesión en tu cuenta
                                </h1>
                                <p className="text-sm text-slate-600">
                                    Ingresa tu correo y contraseña. Te enviaremos un código de
                                    verificación a tu correo registrado.
                                </p>
                            </div>

                            {flash?.success && (
                                <div className="px-5 pt-4">
                                    <p className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-800">
                                        {flash.success}
                                    </p>
                                </div>
                            )}

                            {bannerMessage && (
                                <div className="pt-4">
                                    <AuthFormAlert message={bannerMessage} />
                                </div>
                            )}

                            {!hasAuthError && credentialsForm.errors.email && (
                                <div className="px-5 pt-4">
                                    <AuthFormAlert message={credentialsForm.errors.email} />
                                </div>
                            )}

                            <div className="px-5 pt-2">
                                <AuthFormField
                                    id="email"
                                    label="Correo electrónico"
                                    error={fieldError('email')}
                                    icon={<Mail className="h-4 w-4" />}
                                    inputProps={{
                                        type: 'email',
                                        value: credentialsForm.data.email,
                                        onChange: (e) => {
                                            credentialsForm.setData('email', e.target.value);
                                            clearField('email');
                                        },
                                        placeholder: 'correo@ejemplo.com',
                                        autoFocus: true,
                                        autoComplete: 'email',
                                    }}
                                />
                            </div>

                            <div className="px-5">
                                <AuthFormField
                                    id="password"
                                    label="Contraseña"
                                    error={fieldError('password')}
                                    icon={<Lock className="h-4 w-4" />}
                                    inputProps={{
                                        type: showPassword ? 'text' : 'password',
                                        value: credentialsForm.data.password,
                                        onChange: (e) => {
                                            credentialsForm.setData('password', e.target.value);
                                            clearField('password');
                                        },
                                        placeholder: 'Ingresa tu contraseña',
                                        autoComplete: 'current-password',
                                    }}
                                    rightSlot={
                                        <button
                                            type="button"
                                            onClick={() => setShowPassword(!showPassword)}
                                            className="absolute right-3 top-1/2 z-10 -translate-y-1/2 text-slate-500 transition-colors hover:text-slate-700"
                                            tabIndex={-1}
                                        >
                                            {showPassword ? (
                                                <EyeOff className="h-4 w-4" />
                                            ) : (
                                                <Eye className="h-4 w-4" />
                                            )}
                                        </button>
                                    }
                                />
                            </div>

                            <div className="px-5 pb-5">
                                <label className="mb-4 flex cursor-pointer items-center gap-2">
                                    <input
                                        type="checkbox"
                                        checked={credentialsForm.data.remember}
                                        onChange={(e) =>
                                            credentialsForm.setData('remember', e.target.checked)
                                        }
                                        className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                                    />
                                    <span className="text-sm text-slate-600">Recordarme</span>
                                </label>

                                <button
                                    type="submit"
                                    className="h-11 w-full rounded-md bg-blue-600 text-base font-semibold text-white shadow transition-colors hover:bg-blue-700 active:bg-blue-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50"
                                    disabled={credentialsForm.processing}
                                >
                                    {credentialsForm.processing
                                        ? 'Enviando código...'
                                        : 'Continuar'}
                                </button>

                                <div className="mt-4 text-center">
                                    <a
                                        href="#"
                                        className="text-xs font-medium text-blue-600 hover:text-blue-700 hover:underline"
                                    >
                                        ¿Has olvidado tu contraseña?
                                    </a>
                                </div>

                                <div className="mt-3 text-center">
                                    <span className="text-xs text-slate-600">
                                        ¿No tienes una cuenta?{' '}
                                        <Link
                                            href="/register"
                                            className="font-medium text-blue-600 hover:text-blue-700 hover:underline"
                                        >
                                            Regístrate aquí
                                        </Link>
                                    </span>
                                </div>
                            </div>
                        </div>
                    </form>
                )}
            </div>
        </div>
    );
}
