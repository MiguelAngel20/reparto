import * as React from 'react';
import { Head, Link, useForm } from '@inertiajs/react';
import { Mail, Lock, Eye, EyeOff } from 'lucide-react';
import { AppBrandLogo } from '@/components/app-brand-logo';
import { AuthFormField } from '@/components/auth/auth-form-field';
import { AuthFormAlert } from '@/components/auth/auth-form-alert';
import {
    isLoginAuthError,
    LOGIN_AUTH_ERROR_MESSAGE,
    validateLogin,
} from '@/lib/auth-validation';

export default function Login() {
    const [showPassword, setShowPassword] = React.useState(false);
    const { data, setData, post, processing, errors, setError, clearErrors } = useForm({
        email: '',
        password: '',
        remember: false,
    });

    const hasAuthError = isLoginAuthError(errors.email);
    const bannerMessage = hasAuthError ? LOGIN_AUTH_ERROR_MESSAGE : null;

    const fieldError = (field: 'email' | 'password') => {
        if (hasAuthError) {
            return undefined;
        }
        return errors[field];
    };

    const clearField = (field: 'email' | 'password') => {
        if (hasAuthError) {
            clearErrors();
            return;
        }
        if (errors[field]) {
            clearErrors(field);
        }
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        clearErrors();

        const clientErrors = validateLogin(data);
        Object.entries(clientErrors).forEach(([key, message]) => {
            setError(key as 'email' | 'password', message);
        });

        if (Object.keys(clientErrors).length > 0) {
            return;
        }

        post('/login', { preserveScroll: true });
    };

    return (
        <div className="flex min-h-screen items-center justify-center bg-white p-4">
            <Head title="Iniciar Sesión" />

            <div className="w-full max-w-md">
                <div className="mb-6 flex w-full justify-center">
                    <AppBrandLogo variant="login" />
                </div>

                <form onSubmit={handleSubmit} noValidate>
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
                                Ingrese su correo electrónico y contraseña a continuación para
                                iniciar sesión
                            </p>
                        </div>

                        {bannerMessage && (
                            <div className="pt-4">
                                <AuthFormAlert message={bannerMessage} />
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
                                    value: data.email,
                                    onChange: (e) => {
                                        setData('email', e.target.value);
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
                                    value: data.password,
                                    onChange: (e) => {
                                        setData('password', e.target.value);
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
                            <button
                                type="submit"
                                className="h-11 w-full rounded-md bg-blue-600 text-base font-semibold text-white shadow transition-colors hover:bg-blue-700 active:bg-blue-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50"
                                disabled={processing}
                            >
                                {processing ? 'Iniciando sesión...' : 'Acceso'}
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
            </div>
        </div>
    );
}
