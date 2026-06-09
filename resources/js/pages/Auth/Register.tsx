import * as React from 'react';
import { Head, Link, useForm, usePage } from '@inertiajs/react';
import { Mail, Lock, Eye, EyeOff, User, CheckCircle2 } from 'lucide-react';
import { AppBrandLogo } from '@/components/app-brand-logo';
import { AuthFormField } from '@/components/auth/auth-form-field';
import { AuthFormAlert } from '@/components/auth/auth-form-alert';
import {
    isPasswordMismatchError,
    PASSWORD_MISMATCH_MESSAGE,
    validateRegister,
    type AuthErrors,
} from '@/lib/auth-validation';

type RegisterField = keyof AuthErrors;

export default function Register() {
    const { flash } = usePage().props as {
        flash?: {
            registration_complete?: boolean;
            registered_email?: string;
        };
    };

    const registrationComplete = !!flash?.registration_complete;
    const registeredEmail = flash?.registered_email ?? '';

    const [showPassword, setShowPassword] = React.useState(false);
    const [showPasswordConfirmation, setShowPasswordConfirmation] = React.useState(false);
    const [clientBanner, setClientBanner] = React.useState<string | null>(null);

    const { data, setData, post, processing, errors, setError, clearErrors } = useForm({
        name: '',
        email: '',
        password: '',
        password_confirmation: '',
    });

    const serverPasswordMismatch = isPasswordMismatchError(errors);
    const bannerMessage =
        clientBanner ??
        (serverPasswordMismatch ? PASSWORD_MISMATCH_MESSAGE : null);

    const fieldError = (field: RegisterField) => {
        if (bannerMessage && (field === 'password' || field === 'password_confirmation')) {
            return undefined;
        }
        return errors[field];
    };

    const clearBanner = () => {
        if (clientBanner) {
            setClientBanner(null);
        }
        if (serverPasswordMismatch) {
            clearErrors('password');
            clearErrors('password_confirmation');
        }
    };

    const clearField = (field: RegisterField) => {
        clearBanner();
        if (errors[field] && field !== 'password' && field !== 'password_confirmation') {
            clearErrors(field);
        }
        if (field === 'password' || field === 'password_confirmation') {
            if (errors[field] && !serverPasswordMismatch) {
                clearErrors(field);
            }
        }
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        clearErrors();
        setClientBanner(null);

        const { fieldErrors, bannerError } = validateRegister(data);

        Object.entries(fieldErrors).forEach(([key, message]) => {
            setError(key as RegisterField, message);
        });

        if (bannerError) {
            setClientBanner(bannerError);
        }

        if (Object.keys(fieldErrors).length > 0 || bannerError) {
            return;
        }

        post('/register', { preserveScroll: true });
    };

    return (
        <div className="flex min-h-screen items-center justify-center bg-white p-4">
            <Head title={registrationComplete ? 'Registro exitoso' : 'Registrarse'} />

            <div className="w-full max-w-md">
                <div className="mb-6 flex w-full justify-center">
                    <AppBrandLogo variant="login" />
                </div>

                {registrationComplete ? (
                    <div className="overflow-hidden rounded-xl border-2 border-emerald-200 bg-white shadow-sm">
                        <div className="px-5 py-8 text-center">
                            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-emerald-50">
                                <CheckCircle2 className="h-8 w-8 text-emerald-600" />
                            </div>
                            <h1 className="mb-2 text-2xl font-bold text-slate-900">
                                Registro exitoso
                            </h1>
                            <p className="text-sm text-slate-600">
                                Revisa tu correo para verificar tu correo electrónico.
                            </p>
                            {registeredEmail && (
                                <p className="mt-3 text-sm font-semibold text-slate-800">
                                    {registeredEmail}
                                </p>
                            )}
                            <p className="mt-3 text-xs text-slate-500">
                                Abre el enlace que te enviamos para activar tu cuenta. Después
                                podrás iniciar sesión.
                            </p>
                            <Link
                                href="/login"
                                className="mt-6 inline-flex h-11 w-full items-center justify-center rounded-md bg-blue-600 text-base font-semibold text-white shadow transition-colors hover:bg-blue-700"
                            >
                                Ir a iniciar sesión
                            </Link>
                        </div>
                    </div>
                ) : (
                    <form onSubmit={handleSubmit} noValidate>
                        <div
                            className={`overflow-hidden rounded-xl border-2 bg-white shadow-sm ${
                                bannerMessage ? 'border-rose-300' : 'border-slate-300'
                            }`}
                        >
                            <div className="border-b border-slate-200 px-5 pb-4 pt-5 text-center">
                                <h1 className="mb-2 text-2xl font-bold text-slate-900">
                                    Crear cuenta
                                </h1>
                                <p className="text-sm text-slate-600">
                                    Completa tus datos para registrarte como repartidor
                                </p>
                            </div>

                            {bannerMessage && (
                                <div className="pt-4">
                                    <AuthFormAlert message={bannerMessage} />
                                </div>
                            )}

                            <div className="space-y-0 px-5 pt-2">
                                <AuthFormField
                                    id="name"
                                    label="Nombre"
                                    error={fieldError('name')}
                                    icon={<User className="h-4 w-4" />}
                                    inputProps={{
                                        type: 'text',
                                        value: data.name,
                                        onChange: (e) => {
                                            setData('name', e.target.value);
                                            clearField('name');
                                        },
                                        placeholder: 'Tu nombre completo',
                                        autoFocus: true,
                                        autoComplete: 'name',
                                    }}
                                />

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
                                        autoComplete: 'email',
                                    }}
                                />

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
                                        placeholder: 'Mínimo 8 caracteres',
                                        autoComplete: 'new-password',
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

                                <AuthFormField
                                    id="password_confirmation"
                                    label="Confirmar contraseña"
                                    error={fieldError('password_confirmation')}
                                    icon={<Lock className="h-4 w-4" />}
                                    inputProps={{
                                        type: showPasswordConfirmation ? 'text' : 'password',
                                        value: data.password_confirmation,
                                        onChange: (e) => {
                                            setData('password_confirmation', e.target.value);
                                            clearField('password_confirmation');
                                        },
                                        placeholder: 'Repite tu contraseña',
                                        autoComplete: 'new-password',
                                    }}
                                    rightSlot={
                                        <button
                                            type="button"
                                            onClick={() =>
                                                setShowPasswordConfirmation(
                                                    !showPasswordConfirmation,
                                                )
                                            }
                                            className="absolute right-3 top-1/2 z-10 -translate-y-1/2 text-slate-500 transition-colors hover:text-slate-700"
                                            tabIndex={-1}
                                        >
                                            {showPasswordConfirmation ? (
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
                                    {processing ? 'Registrando...' : 'Registrarme'}
                                </button>

                                <div className="mt-4 text-center">
                                    <span className="text-xs text-slate-600">
                                        ¿Ya tienes cuenta?{' '}
                                        <Link
                                            href="/login"
                                            className="font-medium text-blue-600 hover:text-blue-700 hover:underline"
                                        >
                                            Inicia sesión
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
