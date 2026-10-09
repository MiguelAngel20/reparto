import * as React from 'react';
import { Head, Link, router, useForm, usePage } from '@inertiajs/react';
import { ArrowLeft, Eye, EyeOff, Lock, Mail, ShieldCheck } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { AppBrandLogo } from '@/components/app-brand-logo';
import { AuthFormField } from '@/components/auth/auth-form-field';
import { AuthFormAlert } from '@/components/auth/auth-form-alert';
import { cn } from '@/lib/utils';
import {
    PASSWORD_MISMATCH_MESSAGE,
    validatePasswordChange,
} from '@/lib/auth-validation';

type Step = 'email' | 'code' | 'password';

interface ForgotPasswordProps {
    step?: Step;
    maskedEmail?: string | null;
    expiresInMinutes?: number;
}

export default function ForgotPassword({
    step = 'email',
    maskedEmail = null,
    expiresInMinutes = 10,
}: ForgotPasswordProps) {
    const { flash } = usePage().props as { flash?: { success?: string } };
    const [showPassword, setShowPassword] = React.useState(false);
    const [showConfirm, setShowConfirm] = React.useState(false);
    const [passwordBanner, setPasswordBanner] = React.useState<string | null>(null);

    const emailForm = useForm({ email: '' });
    const codeForm = useForm({ code: '' });
    const passwordForm = useForm({
        password: '',
        password_confirmation: '',
    });

    const submitEmail = (e: React.FormEvent) => {
        e.preventDefault();
        emailForm.post('/recuperar-contrasena', { preserveScroll: true });
    };

    const submitCode = (e: React.FormEvent) => {
        e.preventDefault();
        codeForm.post('/recuperar-contrasena/codigo', { preserveScroll: true });
    };

    const submitPassword = (e: React.FormEvent) => {
        e.preventDefault();
        passwordForm.clearErrors();
        setPasswordBanner(null);

        const { fieldErrors, bannerError } = validatePasswordChange(passwordForm.data);
        if (fieldErrors.password) {
            passwordForm.setError('password', fieldErrors.password);
        }
        if (fieldErrors.password_confirmation && !bannerError) {
            passwordForm.setError('password_confirmation', fieldErrors.password_confirmation);
        }
        if (bannerError) {
            setPasswordBanner(bannerError);
            return;
        }
        if (fieldErrors.password) {
            return;
        }

        passwordForm.post('/recuperar-contrasena/nueva', { preserveScroll: true });
    };

    const handleCodeChange = (value: string) => {
        codeForm.setData('code', value.replace(/\D/g, '').slice(0, 6));
        codeForm.clearErrors('code');
    };

    return (
        <div className="flex min-h-screen items-center justify-center bg-white p-4">
            <Head title="Recuperar contraseña" />

            <div className="w-full max-w-md">
                <div className="mb-6 flex w-full justify-center">
                    <AppBrandLogo variant="login" />
                </div>

                {step === 'email' && (
                    <form onSubmit={submitEmail} noValidate>
                        <div className="overflow-hidden rounded-xl border-2 border-slate-300 bg-white shadow-sm">
                            <div className="border-b border-slate-200 px-5 pb-4 pt-5 text-center">
                                <h1 className="mb-2 text-2xl font-bold text-slate-900">
                                    Recupera tu contraseña
                                </h1>
                                <p className="text-sm text-slate-600">
                                    Escribe el correo de tu cuenta. Si existe, te enviaremos un código.
                                </p>
                            </div>

                            <div className="px-5 pt-2">
                                <AuthFormField
                                    id="reset-email"
                                    label="Correo electrónico"
                                    error={emailForm.errors.email}
                                    icon={<Mail className="h-4 w-4" />}
                                    inputProps={{
                                        type: 'email',
                                        value: emailForm.data.email,
                                        onChange: (e) => {
                                            emailForm.setData('email', e.target.value);
                                            emailForm.clearErrors('email');
                                        },
                                        placeholder: 'correo@ejemplo.com',
                                        autoFocus: true,
                                        autoComplete: 'email',
                                    }}
                                />
                            </div>

                            <div className="space-y-3 px-5 pb-5">
                                <button
                                    type="submit"
                                    disabled={emailForm.processing}
                                    className="h-11 w-full rounded-md bg-blue-600 text-base font-semibold text-white shadow hover:bg-blue-700 disabled:opacity-50"
                                >
                                    {emailForm.processing ? 'Enviando código...' : 'Enviar código'}
                                </button>
                                <Link
                                    href="/login"
                                    className="flex items-center justify-center gap-1 text-sm text-slate-600 hover:text-slate-800"
                                >
                                    <ArrowLeft className="h-4 w-4" />
                                    Volver al inicio de sesión
                                </Link>
                            </div>
                        </div>
                    </form>
                )}

                {step === 'code' && (
                    <form onSubmit={submitCode} noValidate>
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
                                    htmlFor="reset-code"
                                    className="mb-3 block text-base font-semibold text-slate-600"
                                >
                                    Código de verificación
                                </label>
                                <Input
                                    id="reset-code"
                                    type="text"
                                    inputMode="numeric"
                                    autoComplete="one-time-code"
                                    value={codeForm.data.code}
                                    onChange={(e) => handleCodeChange(e.target.value)}
                                    placeholder="000000"
                                    maxLength={6}
                                    autoFocus
                                    className={cn(
                                        'h-12 border-slate-300 text-center text-2xl font-bold tracking-[0.4em]',
                                        codeForm.errors.code &&
                                            'border-rose-500 focus-visible:border-rose-500',
                                    )}
                                />
                                {codeForm.errors.code && (
                                    <p className="mt-2 text-xs font-medium text-rose-500">
                                        {codeForm.errors.code}
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
                                    disabled={codeForm.processing || codeForm.data.code.length !== 6}
                                    className="h-11 w-full rounded-md bg-blue-600 text-base font-semibold text-white shadow hover:bg-blue-700 disabled:opacity-50"
                                >
                                    {codeForm.processing ? 'Verificando...' : 'Continuar'}
                                </button>
                                <button
                                    type="button"
                                    onClick={() =>
                                        router.post('/recuperar-contrasena/reenviar', {}, { preserveScroll: true })
                                    }
                                    className="w-full text-sm font-medium text-blue-600 hover:underline"
                                >
                                    Reenviar código
                                </button>
                                <button
                                    type="button"
                                    onClick={() => router.post('/recuperar-contrasena/cancelar')}
                                    className="flex w-full items-center justify-center gap-1 text-sm text-slate-600 hover:text-slate-800"
                                >
                                    <ArrowLeft className="h-4 w-4" />
                                    Volver al inicio de sesión
                                </button>
                            </div>
                        </div>
                    </form>
                )}

                {step === 'password' && (
                    <form onSubmit={submitPassword} noValidate>
                        <div
                            className={cn(
                                'overflow-hidden rounded-xl border-2 bg-white shadow-sm',
                                passwordBanner ? 'border-rose-300' : 'border-slate-300',
                            )}
                        >
                            <div className="border-b border-slate-200 px-5 pb-4 pt-5 text-center">
                                <h1 className="mb-2 text-2xl font-bold text-slate-900">
                                    Nueva contraseña
                                </h1>
                                <p className="text-sm text-slate-600">
                                    Elige una contraseña para {maskedEmail || 'tu cuenta'}.
                                </p>
                            </div>

                            {passwordBanner && (
                                <div className="pt-4">
                                    <AuthFormAlert message={passwordBanner || PASSWORD_MISMATCH_MESSAGE} />
                                </div>
                            )}

                            <div className="px-5 pt-2">
                                <AuthFormField
                                    id="new-password"
                                    label="Nueva contraseña"
                                    error={passwordBanner ? undefined : passwordForm.errors.password}
                                    icon={<Lock className="h-4 w-4" />}
                                    inputProps={{
                                        type: showPassword ? 'text' : 'password',
                                        value: passwordForm.data.password,
                                        onChange: (e) => {
                                            passwordForm.setData('password', e.target.value);
                                            passwordForm.clearErrors('password');
                                            setPasswordBanner(null);
                                        },
                                        placeholder: 'Mínimo 8 caracteres',
                                        autoComplete: 'new-password',
                                        autoFocus: true,
                                    }}
                                    rightSlot={
                                        <button
                                            type="button"
                                            onClick={() => setShowPassword((v) => !v)}
                                            className="absolute right-3 top-1/2 z-10 -translate-y-1/2 text-slate-500"
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
                                <AuthFormField
                                    id="confirm-password"
                                    label="Repetir contraseña"
                                    error={
                                        passwordBanner
                                            ? undefined
                                            : passwordForm.errors.password_confirmation
                                    }
                                    icon={<Lock className="h-4 w-4" />}
                                    inputProps={{
                                        type: showConfirm ? 'text' : 'password',
                                        value: passwordForm.data.password_confirmation,
                                        onChange: (e) => {
                                            passwordForm.setData('password_confirmation', e.target.value);
                                            passwordForm.clearErrors('password_confirmation');
                                            setPasswordBanner(null);
                                        },
                                        placeholder: 'Repite la contraseña',
                                        autoComplete: 'new-password',
                                    }}
                                    rightSlot={
                                        <button
                                            type="button"
                                            onClick={() => setShowConfirm((v) => !v)}
                                            className="absolute right-3 top-1/2 z-10 -translate-y-1/2 text-slate-500"
                                            tabIndex={-1}
                                        >
                                            {showConfirm ? (
                                                <EyeOff className="h-4 w-4" />
                                            ) : (
                                                <Eye className="h-4 w-4" />
                                            )}
                                        </button>
                                    }
                                />
                            </div>

                            <div className="px-5 pb-5">
                                <button
                                    type="submit"
                                    disabled={passwordForm.processing}
                                    className="h-11 w-full rounded-md bg-blue-600 text-base font-semibold text-white shadow hover:bg-blue-700 disabled:opacity-50"
                                >
                                    {passwordForm.processing ? 'Guardando...' : 'Guardar y entrar'}
                                </button>
                            </div>
                        </div>
                    </form>
                )}
            </div>
        </div>
    );
}
