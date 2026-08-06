import AppLayout from '@/layouts/app-layout';
import SettingsSidebar from '@/pages/settings/components/SettingsSidebar';
import ProfilePresentationCard from '@/pages/settings/Profile/components/ProfilePresentationCard';
import ProfileEditCard from '@/pages/settings/Profile/components/ProfileEditCard';
import TransferCardsList, {
    type TransferCardData,
} from '@/pages/settings/Profile/components/TransferCardsList';
import { type BreadcrumbItem } from '@/types';
import { Head, useForm, usePage } from '@inertiajs/react';
import { Card } from '@/components/ui';
import Button from '@/components/ui/Button';
import {
    Dialog,
    DialogContent,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { AuthFormAlert } from '@/components/auth/auth-form-alert';
import { AuthFormField } from '@/components/auth/auth-form-field';
import { Check, CreditCard, Lock, Eye, EyeOff, Pencil, Plus, Building2, User, X } from 'lucide-react';
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
    transferCards: TransferCardData[];
}

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Configuración', href: '/settings' },
    { title: 'Mi información', href: '/settings/profile' },
];

const cardClass =
    'border border-slate-200/80 bg-white p-6 shadow-sm dark:border-[#2b2b2b] dark:bg-[#262626]';

export default function ProfileIndex({ profile, transferCards }: ProfilePageProps) {
    const page = usePage();
    const flash = page.props.flash as { success?: string; error?: string } | undefined;

    const [isEditing, setIsEditing] = useState(false);
    const [transferCardModalOpen, setTransferCardModalOpen] = useState(false);
    const [editingTransferCard, setEditingTransferCard] = useState<TransferCardData | null>(null);
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

    const transferCardForm = useForm({
        holder_name: '',
        card_number: '',
        clabe: '',
        bank_name: '',
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

    const closeTransferCardModal = () => {
        setTransferCardModalOpen(false);
        setEditingTransferCard(null);
        transferCardForm.reset();
        transferCardForm.clearErrors();
    };

    const openCreateTransferCard = () => {
        setEditingTransferCard(null);
        transferCardForm.reset();
        transferCardForm.clearErrors();
        setTransferCardModalOpen(true);
    };

    const openEditTransferCard = (card: TransferCardData) => {
        setEditingTransferCard(card);
        transferCardForm.setData({
            holder_name: card.holder_name,
            card_number: card.card_number ?? '',
            clabe: card.clabe ?? '',
            bank_name: card.bank_name,
        });
        transferCardForm.clearErrors();
        setTransferCardModalOpen(true);
    };

    const submitTransferCard = (e: React.FormEvent) => {
        e.preventDefault();

        if (editingTransferCard) {
            transferCardForm.put(
                `/settings/profile/transfer-cards/${editingTransferCard.id}`,
                {
                    preserveScroll: true,
                    onSuccess: () => closeTransferCardModal(),
                },
            );
            return;
        }

        transferCardForm.post('/settings/profile/transfer-cards', {
            preserveScroll: true,
            onSuccess: () => closeTransferCardModal(),
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
                            <div className="flex flex-col gap-2 sm:flex-row">
                                <button
                                    type="button"
                                    onClick={() => setIsEditing(true)}
                                    className="inline-flex h-10 shrink-0 items-center justify-center gap-2 rounded-lg bg-sidebar-active px-4 text-sm font-semibold text-white transition-opacity hover:opacity-90"
                                >
                                    <Pencil className="h-4 w-4" />
                                    Editar perfil
                                </button>
                                <button
                                    type="button"
                                    onClick={openCreateTransferCard}
                                    className="inline-flex h-10 shrink-0 items-center justify-center gap-2 rounded-lg border border-slate-300 px-4 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-50 dark:border-[#3a3a3a] dark:text-slate-200 dark:hover:bg-[#2a2a2a]"
                                >
                                    <Plus className="h-4 w-4" />
                                    Agregar tarjeta
                                </button>
                            </div>
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
                    <p className="mb-4 text-sm text-slate-500 dark:text-slate-400">
                        Referencias para transferencias y cambio de contraseña
                    </p>

                    <div className="mb-8">
                        <h3 className="mb-3 text-sm font-semibold text-slate-800 dark:text-slate-200">
                            Tarjetas para transferencias
                        </h3>
                        <p className="mb-4 text-xs text-slate-500 dark:text-slate-400">
                            Datos de referencia personales para hacer transferencias sin buscar en
                            otro lugar.
                        </p>
                        <TransferCardsList cards={transferCards} onEdit={openEditTransferCard} />
                    </div>

                    <div className="border-t border-slate-200 pt-6 dark:border-[#3a3a3a]">
                        <h3 className="mb-1 text-sm font-semibold text-slate-800 dark:text-slate-200">
                            Cambiar contraseña
                        </h3>
                        <p className="mb-6 text-xs text-slate-500 dark:text-slate-400">
                            Actualiza tu contraseña de acceso
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
                    </div>
                </Card>
            </div>

            <Dialog
                open={transferCardModalOpen}
                onOpenChange={(open) => {
                    if (!open) {
                        closeTransferCardModal();
                        return;
                    }
                    setTransferCardModalOpen(true);
                }}
            >
                <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <CreditCard className="h-5 w-5 text-sidebar-active" />
                            {editingTransferCard
                                ? 'Editar tarjeta para transferencias'
                                : 'Nueva tarjeta para transferencias'}
                        </DialogTitle>
                    </DialogHeader>
                    <form onSubmit={submitTransferCard} noValidate className="space-y-1">
                        <AuthFormField
                            id="transfer-holder-name"
                            label="Nombre del titular"
                            error={transferCardForm.errors.holder_name}
                            icon={<User className="h-4 w-4" />}
                            inputProps={{
                                value: transferCardForm.data.holder_name,
                                onChange: (e) => {
                                    transferCardForm.setData('holder_name', e.target.value);
                                    transferCardForm.clearErrors('holder_name');
                                },
                                placeholder: 'Nombre completo del titular',
                                autoFocus: true,
                            }}
                        />
                        <AuthFormField
                            id="transfer-card-number"
                            label="Número de tarjeta"
                            error={transferCardForm.errors.card_number}
                            icon={<CreditCard className="h-4 w-4" />}
                            inputProps={{
                                inputMode: 'numeric',
                                value: transferCardForm.data.card_number,
                                onChange: (e) => {
                                    transferCardForm.setData('card_number', e.target.value);
                                    transferCardForm.clearErrors('card_number');
                                    if (e.target.value.trim()) {
                                        transferCardForm.clearErrors('clabe');
                                    }
                                },
                                placeholder: '0000 0000 0000 0000',
                            }}
                        />
                        <AuthFormField
                            id="transfer-clabe"
                            label="CLABE"
                            error={transferCardForm.errors.clabe}
                            icon={<CreditCard className="h-4 w-4" />}
                            inputProps={{
                                inputMode: 'numeric',
                                value: transferCardForm.data.clabe,
                                onChange: (e) => {
                                    transferCardForm.setData('clabe', e.target.value);
                                    transferCardForm.clearErrors('clabe');
                                    if (e.target.value.trim()) {
                                        transferCardForm.clearErrors('card_number');
                                    }
                                },
                                placeholder: '18 dígitos',
                            }}
                        />
                        <AuthFormField
                            id="transfer-bank-name"
                            label="Nombre del banco"
                            error={transferCardForm.errors.bank_name}
                            icon={<Building2 className="h-4 w-4" />}
                            inputProps={{
                                value: transferCardForm.data.bank_name,
                                onChange: (e) => {
                                    transferCardForm.setData('bank_name', e.target.value);
                                    transferCardForm.clearErrors('bank_name');
                                },
                                placeholder: 'Ej. BBVA, Banorte, Santander…',
                            }}
                        />
                        <p className="-mt-2 mb-4 text-xs text-slate-500 dark:text-slate-400">
                            Debes indicar al menos el número de tarjeta o la CLABE.
                        </p>
                        <DialogFooter className="gap-2 sm:gap-0">
                            <Button
                                type="button"
                                variant="danger"
                                leftIcon={<X className="h-4 w-4" />}
                                onClick={closeTransferCardModal}
                            >
                                Cancelar
                            </Button>
                            <Button
                                type="submit"
                                variant="info"
                                leftIcon={<Check className="h-4 w-4" />}
                                loading={transferCardForm.processing}
                            >
                                {editingTransferCard ? 'Guardar cambios' : 'Guardar tarjeta'}
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>
        </AppLayout>
    );
}
