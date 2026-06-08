import AppLayout from '@/layouts/app-layout';
import SettingsSidebar from '@/pages/settings/components/SettingsSidebar';
import ProfilePresentationCard from '@/pages/settings/Profile/components/ProfilePresentationCard';
import ProfileEditCard from '@/pages/settings/Profile/components/ProfileEditCard';
import { type BreadcrumbItem } from '@/types';
import { Head, useForm, usePage } from '@inertiajs/react';
import { Card } from '@/components/ui';
import { AuthFormAlert } from '@/components/auth/auth-form-alert';
import { AuthFormField } from '@/components/auth/auth-form-field';
import { Lock, Eye, EyeOff, Pencil, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
    isPasswordMismatchError,
    PASSWORD_MISMATCH_MESSAGE,
    validatePasswordChange,
} from '@/lib/auth-validation';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';

type ProfileData = {
    id: number;
    name: string;
    email: string;
    company_name: string | null;
    percentage: number;
    role: string;
    role_label: string;
    created_at: string;
    created_at_full: string;
};

interface ProfilePageProps {
    profile: ProfileData;
}

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Configuración', href: '/settings' },
    { title: 'Mi información', href: '/settings/profile' },
];

const cardClass =
    'border border-slate-200/80 bg-white p-6 shadow-sm dark:border-[#2b2b2b] dark:bg-[#262626]';

export default function ProfileIndex({ profile }: ProfilePageProps) {
    const page = usePage();
    const flash = page.props.flash as { success?: string; error?: string } | undefined;

    const [isEditing, setIsEditing] = useState(false);
    const [showNewPassword, setShowNewPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const [passwordBanner, setPasswordBanner] = useState<string | null>(null);

    const profileForm = useForm({
        name: profile.name,
        email: profile.email,
        company_name: profile.company_name ?? '',
        percentage: String(profile.percentage),
    });

    const passwordForm = useForm({
        password: '',
        password_confirmation: '',
    });

    useEffect(() => {
        if (flash?.success) {
            toast.success(flash.success);
        }
        if (flash?.error) {
            toast.error(flash.error);
        }
    }, [flash?.success, flash?.error]);

    const displayProfile = {
        name: profileForm.data.name || profile.name,
        email: profileForm.data.email || profile.email,
        company_name: profileForm.data.company_name || profile.company_name,
        percentage: parseFloat(profileForm.data.percentage) || profile.percentage,
        role: profile.role,
        role_label: profile.role_label,
        created_at_full: profile.created_at_full,
    };

    const serverPasswordMismatch = isPasswordMismatchError(passwordForm.errors);
    const passwordBannerMessage =
        passwordBanner ??
        (serverPasswordMismatch ? PASSWORD_MISMATCH_MESSAGE : null);

    const passwordFieldError = (field: 'password' | 'password_confirmation') => {
        if (passwordBannerMessage) {
            return undefined;
        }
        return passwordForm.errors[field];
    };

    const submitProfile = (e: React.FormEvent) => {
        e.preventDefault();
        profileForm.put('/settings/profile', {
            preserveScroll: true,
            onSuccess: () => setIsEditing(false),
        });
    };

    const submitPassword = (e: React.FormEvent) => {
        e.preventDefault();
        passwordForm.clearErrors();
        setPasswordBanner(null);

        const { fieldErrors, bannerError } = validatePasswordChange({
            password: passwordForm.data.password,
            password_confirmation: passwordForm.data.password_confirmation,
        });

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

        passwordForm.put('/settings/profile/password', {
            preserveScroll: true,
            onSuccess: () => {
                passwordForm.reset();
                setPasswordBanner(null);
            },
        });
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs} title="Mi información" sidebar={<SettingsSidebar />}>
            <Head title="Mi información" />

            <div className="flex w-full flex-col gap-6">
                <Card className={cardClass}>
                    <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                        <div>
                            <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
                                Mi perfil
                            </h2>
                            <p className="text-sm text-slate-500 dark:text-slate-400">
                                Tu tarjeta de presentación en el sistema
                            </p>
                        </div>
                        {!isEditing ? (
                            <button
                                type="button"
                                onClick={() => setIsEditing(true)}
                                className="inline-flex h-10 shrink-0 items-center justify-center gap-2 rounded-lg bg-sidebar-active px-4 text-sm font-semibold text-white transition-opacity hover:opacity-90"
                            >
                                <Pencil className="h-4 w-4" />
                                Editar perfil
                            </button>
                        ) : (
                            <button
                                type="button"
                                onClick={() => {
                                    setIsEditing(false);
                                    profileForm.reset();
                                }}
                                className="inline-flex h-10 shrink-0 items-center justify-center gap-2 rounded-lg border border-slate-300 px-4 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50 dark:border-[#3a3a3a] dark:text-slate-200 dark:hover:bg-[#2a2a2a]"
                            >
                                <X className="h-4 w-4" />
                                Cancelar
                            </button>
                        )}
                    </div>

                    <ProfilePresentationCard profile={displayProfile} />
                </Card>

                {isEditing && (
                    <Card className={cardClass}>
                        <h2 className="mb-1 text-lg font-semibold text-slate-900 dark:text-white">
                            Editar mis datos
                        </h2>
                        <p className="mb-6 text-sm text-slate-500 dark:text-slate-400">
                            Modifica nombre, correo, empresa y porcentaje
                        </p>
                        <ProfileEditCard form={profileForm} onSubmit={submitProfile} />
                    </Card>
                )}

                <Card
                    className={cn(
                        cardClass,
                        passwordBannerMessage && 'border-rose-300 dark:border-rose-800',
                    )}
                >
                    <h2 className="mb-1 text-lg font-semibold text-slate-900 dark:text-white">
                        Seguridad
                    </h2>
                    <p className="mb-6 text-sm text-slate-500 dark:text-slate-400">
                        Cambia tu contraseña de acceso
                    </p>

                    {passwordBannerMessage && (
                        <div className="mb-4">
                            <AuthFormAlert message={passwordBannerMessage} />
                        </div>
                    )}

                    <form onSubmit={submitPassword} noValidate>
                        <div className="grid max-w-3xl grid-cols-1 gap-4 md:grid-cols-2">
                            <AuthFormField
                                id="new-password"
                                label="Nueva contraseña"
                                error={passwordFieldError('password')}
                                icon={<Lock className="h-4 w-4" />}
                                inputProps={{
                                    type: showNewPassword ? 'text' : 'password',
                                    placeholder: '*****',
                                    value: passwordForm.data.password,
                                    onChange: (e) => {
                                        passwordForm.setData('password', e.target.value);
                                        setPasswordBanner(null);
                                        passwordForm.clearErrors('password');
                                    },
                                    autoComplete: 'new-password',
                                }}
                                rightSlot={
                                    <button
                                        type="button"
                                        onClick={() => setShowNewPassword(!showNewPassword)}
                                        className="absolute right-3 top-1/2 z-10 -translate-y-1/2 text-slate-500"
                                    >
                                        {showNewPassword ? (
                                            <EyeOff className="h-4 w-4" />
                                        ) : (
                                            <Eye className="h-4 w-4" />
                                        )}
                                    </button>
                                }
                            />

                            <AuthFormField
                                id="confirm-password"
                                label="Confirmar nueva contraseña"
                                error={passwordFieldError('password_confirmation')}
                                icon={<Lock className="h-4 w-4" />}
                                inputProps={{
                                    type: showConfirmPassword ? 'text' : 'password',
                                    placeholder: '*****',
                                    value: passwordForm.data.password_confirmation,
                                    onChange: (e) => {
                                        passwordForm.setData(
                                            'password_confirmation',
                                            e.target.value,
                                        );
                                        setPasswordBanner(null);
                                        passwordForm.clearErrors('password_confirmation');
                                    },
                                    autoComplete: 'new-password',
                                }}
                                rightSlot={
                                    <button
                                        type="button"
                                        onClick={() =>
                                            setShowConfirmPassword(!showConfirmPassword)
                                        }
                                        className="absolute right-3 top-1/2 z-10 -translate-y-1/2 text-slate-500"
                                    >
                                        {showConfirmPassword ? (
                                            <EyeOff className="h-4 w-4" />
                                        ) : (
                                            <Eye className="h-4 w-4" />
                                        )}
                                    </button>
                                }
                            />
                        </div>

                        <button
                            type="submit"
                            disabled={passwordForm.processing}
                            className="mt-6 h-11 rounded-xl bg-slate-800 px-8 text-sm font-semibold text-white hover:bg-slate-900 disabled:opacity-50 dark:bg-[#3a3a3a] dark:hover:bg-[#454545]"
                        >
                            {passwordForm.processing
                                ? 'Actualizando...'
                                : 'Actualizar contraseña'}
                        </button>
                    </form>
                </Card>
            </div>
        </AppLayout>
    );
}
