import AppLayout from '@/layouts/app-layout';
import { Card } from '@/components/ui';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { formatCurrency, cn } from '@/lib/utils';
import { type BreadcrumbItem } from '@/types';
import { Head, Link, useForm, usePage } from '@inertiajs/react';
import { useSectionAccess } from '@/hooks/useSectionAccess';
import { Copy, CreditCard, Eye, EyeOff, Pencil, Plus } from 'lucide-react';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';

type CardSummary = {
    id: number;
    holder_name: string | null;
    account_holder_name: string | null;
    bank_type: string | null;
    account_number: string | null;
    account_number_masked: string | null;
    initial_real_balance: number | null;
    real_balance: number | null;
    real_balance_configured: boolean;
    real_balance_label: string;
    holder_debt: number;
    holder_debt_label: string;
    opened_at: string | null;
};

interface CardAccountIndexProps {
    cards: CardSummary[];
}

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Dashboard', href: '/dashboard' },
    { title: 'Cuenta tarjeta', href: '/cuenta-tarjeta' },
];

const cardClass =
    'border border-slate-200/80 bg-white p-4 shadow-sm dark:border-[#2b2b2b] dark:bg-[#262626] sm:p-5';

function BankCardVisual({
    card,
    onEdit,
    canEdit,
}: {
    card: CardSummary;
    onEdit: () => void;
    canEdit: boolean;
}) {
    const [accountVisible, setAccountVisible] = useState(false);

    const stopCardNav = (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
    };

    const copyAccountNumber = async (e: React.MouseEvent) => {
        stopCardNav(e);
        if (!card.account_number) return;

        try {
            await navigator.clipboard.writeText(card.account_number);
            toast.success('Número de cuenta copiado');
        } catch {
            toast.error('No se pudo copiar el número');
        }
    };

    const toggleAccountVisible = (e: React.MouseEvent) => {
        stopCardNav(e);
        setAccountVisible((visible) => !visible);
    };

    const displayedAccountNumber = accountVisible
        ? card.account_number || '—'
        : card.account_number_masked || card.account_number || '—';

    return (
        <div className="relative w-full min-w-0 max-w-full">
            <Link
                href={`/cuenta-tarjeta/${card.id}`}
                className="block w-full min-w-0 overflow-hidden rounded-2xl border border-slate-200/80 shadow-md dark:border-[#333]"
            >
                <div className="flex flex-col justify-between bg-white p-4 text-slate-900 dark:bg-[#262626] dark:text-white sm:p-5">
                    <div className="flex items-start gap-2">
                        <div className="min-w-0 flex-1">
                            <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">
                                Titular
                            </p>
                            <p className="mt-1 truncate text-base font-semibold leading-snug">
                                {card.account_holder_name || 'Sin titular'}
                            </p>
                        </div>
                        <div className="flex shrink-0 items-center gap-1.5">
                            {canEdit && (
                                <button
                                    type="button"
                                    onClick={(e) => {
                                        stopCardNav(e);
                                        onEdit();
                                    }}
                                    className="rounded-lg border border-slate-200 bg-slate-50 p-2 text-slate-600 hover:bg-slate-100 dark:border-[#444] dark:bg-[#1f1f1f] dark:text-slate-300 dark:hover:bg-[#333]"
                                    title="Editar tarjeta"
                                >
                                    <Pencil className="h-4 w-4" />
                                </button>
                            )}
                            <div className="rounded-lg bg-slate-100 p-2 text-slate-700 dark:bg-[#1f1f1f] dark:text-slate-200">
                                <CreditCard className="h-5 w-5" />
                            </div>
                        </div>
                    </div>

                    <div className="mt-4 space-y-3">
                        <div className="grid grid-cols-1 gap-3 min-[400px]:grid-cols-2">
                            <div className="min-w-0">
                                <p className="text-[10px] uppercase tracking-wide text-slate-500 dark:text-slate-400">
                                    Banco
                                </p>
                                <p className="mt-0.5 truncate font-medium">
                                    {card.bank_type || '—'}
                                </p>
                            </div>
                            <div className="min-w-0">
                                <p className="text-[10px] uppercase tracking-wide text-slate-500 dark:text-slate-400">
                                    Cuenta
                                </p>
                                <div className="mt-0.5 flex flex-col gap-1.5 min-[420px]:flex-row min-[420px]:items-center min-[420px]:gap-1.5">
                                    <p className="min-w-0 break-all font-mono text-sm font-medium min-[420px]:truncate">
                                        {displayedAccountNumber}
                                    </p>
                                    {card.account_number && (
                                        <div className="flex shrink-0 items-center gap-1">
                                            <button
                                                type="button"
                                                onClick={toggleAccountVisible}
                                                className="rounded-md border border-slate-200 px-2 py-0.5 text-[10px] font-semibold uppercase text-slate-600 hover:bg-slate-50 dark:border-[#444] dark:text-slate-300 dark:hover:bg-[#333]"
                                            >
                                                {accountVisible ? (
                                                    <span className="inline-flex items-center gap-1">
                                                        <EyeOff className="h-3 w-3" />
                                                        Ocultar
                                                    </span>
                                                ) : (
                                                    <span className="inline-flex items-center gap-1">
                                                        <Eye className="h-3 w-3" />
                                                        Ver
                                                    </span>
                                                )}
                                            </button>
                                            {accountVisible && (
                                                <button
                                                    type="button"
                                                    onClick={copyAccountNumber}
                                                    className="rounded-md border border-slate-200 p-1 text-slate-600 hover:bg-slate-50 dark:border-[#444] dark:text-slate-300 dark:hover:bg-[#333]"
                                                    title="Copiar número"
                                                >
                                                    <Copy className="h-3.5 w-3.5" />
                                                </button>
                                            )}
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                        <div>
                            <p className="text-[10px] uppercase tracking-wide text-slate-500 dark:text-slate-400">
                                Monto real de la tarjeta
                            </p>
                            <p className="mt-0.5 text-xl font-bold tabular-nums text-slate-900 dark:text-white">
                                {card.real_balance_configured && card.real_balance !== null
                                    ? `$${formatCurrency(card.real_balance)}`
                                    : 'Sin configurar'}
                            </p>
                        </div>
                    </div>
                </div>

                <div className="flex items-center justify-between gap-3 bg-sidebar-active px-4 py-3.5 text-white sm:px-5 sm:py-4">
                    <div className="min-w-0 flex-1">
                        <p className="text-[10px] uppercase tracking-wide text-white/70">
                            Usando la tarjeta
                        </p>
                        <p className="truncate font-semibold">{card.holder_name || 'Sin nombre'}</p>
                    </div>
                    <div className="shrink-0 text-right">
                        <p className="text-[10px] uppercase tracking-wide text-white/70">
                            Debe a la tarjeta
                        </p>
                        <p className="text-base font-bold tabular-nums">
                            ${formatCurrency(card.holder_debt)}
                        </p>
                    </div>
                </div>
            </Link>
        </div>
    );
}

export default function CardAccountIndex({ cards }: CardAccountIndexProps) {
    const { canCreate, canUpdate } = useSectionAccess('card_account');
    const page = usePage();
    const flash = page.props.flash as { success?: string; error?: string } | undefined;

    const [createModalOpen, setCreateModalOpen] = useState(false);
    const [editingCard, setEditingCard] = useState<CardSummary | null>(null);

    const createForm = useForm({
        holder_name: '',
        account_holder_name: '',
        bank_type: '',
        account_number: '',
        initial_real_balance: '',
    });

    const editForm = useForm({
        holder_name: '',
        account_holder_name: '',
        bank_type: '',
        account_number: '',
        initial_real_balance: '',
    });

    useEffect(() => {
        if (flash?.success) toast.success(flash.success);
        if (flash?.error) toast.error(flash.error);
    }, [flash?.success, flash?.error]);

    const openEditCard = (card: CardSummary) => {
        setEditingCard(card);
        editForm.setData({
            holder_name: card.holder_name ?? '',
            account_holder_name: card.account_holder_name ?? '',
            bank_type: card.bank_type ?? '',
            account_number: card.account_number ?? '',
            initial_real_balance:
                card.initial_real_balance !== null
                    ? String(card.initial_real_balance)
                    : '',
        });
        editForm.clearErrors();
    };

    const closeEditCard = () => {
        setEditingCard(null);
        editForm.reset();
        editForm.clearErrors();
    };

    const submitCreate = (e: React.FormEvent) => {
        e.preventDefault();
        createForm.post('/cuenta-tarjeta', {
            onSuccess: () => {
                createForm.reset();
                setCreateModalOpen(false);
            },
        });
    };

    const submitEdit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!editingCard) return;

        editForm.put(`/cuenta-tarjeta/${editingCard.id}`, {
            preserveScroll: true,
            onSuccess: () => closeEditCard(),
        });
    };

    const renderAccountFormFields = (
        form: typeof createForm,
        idPrefix: string,
    ) => (
        <>
            <div>
                <Label htmlFor={`${idPrefix}_holder_name`} className="mb-1 block text-xs text-slate-500">
                    Quién usa la tarjeta
                </Label>
                <Input
                    id={`${idPrefix}_holder_name`}
                    value={form.data.holder_name}
                    onChange={(e) => form.setData('holder_name', e.target.value)}
                    placeholder="Ej. Juan"
                    className={cn(form.errors.holder_name && 'border-rose-500')}
                />
            </div>
            <div>
                <Label
                    htmlFor={`${idPrefix}_account_holder_name`}
                    className="mb-1 block text-xs text-slate-500"
                >
                    Nombre o titular de la cuenta
                </Label>
                <Input
                    id={`${idPrefix}_account_holder_name`}
                    value={form.data.account_holder_name}
                    onChange={(e) => form.setData('account_holder_name', e.target.value)}
                    placeholder="Ej. María López"
                />
            </div>
            <div className="grid grid-cols-2 gap-3">
                <div>
                    <Label htmlFor={`${idPrefix}_bank_type`} className="mb-1 block text-xs text-slate-500">
                        Tipo de banco
                    </Label>
                    <Input
                        id={`${idPrefix}_bank_type`}
                        value={form.data.bank_type}
                        onChange={(e) => form.setData('bank_type', e.target.value)}
                        placeholder="Ej. BBVA"
                    />
                </div>
                <div>
                    <Label
                        htmlFor={`${idPrefix}_account_number`}
                        className="mb-1 block text-xs text-slate-500"
                    >
                        Número de cuenta
                    </Label>
                    <Input
                        id={`${idPrefix}_account_number`}
                        value={form.data.account_number}
                        onChange={(e) => form.setData('account_number', e.target.value)}
                        placeholder="**** 1234"
                    />
                </div>
            </div>
            <div>
                <Label
                    htmlFor={`${idPrefix}_initial_real_balance`}
                    className="mb-1 block text-xs text-slate-500"
                >
                    Monto inicial real de la tarjeta ($)
                </Label>
                <Input
                    id={`${idPrefix}_initial_real_balance`}
                    type="number"
                    min={0}
                    step="0.01"
                    value={form.data.initial_real_balance}
                    onChange={(e) => form.setData('initial_real_balance', e.target.value)}
                    placeholder="Ej. 25000"
                />
                <p className="mt-1 text-xs text-slate-500">
                    Saldo actual en la tarjeta física. Las compras lo reducen; los depósitos reales o
                    abonos por transferencia lo aumentan.
                </p>
            </div>
        </>
    );

    return (
        <AppLayout breadcrumbs={breadcrumbs} title="Cuenta tarjeta">
            <Head title="Cuenta tarjeta" />

            <div className="flex w-full min-w-0 flex-col gap-4 overflow-x-hidden">
                <Card className={cardClass}>
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                        <div>
                            <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
                                Mis tarjetas
                            </h2>
                            <p className="mt-1 text-sm text-slate-500">
                                Toca una tarjeta para ver compras, abonos y movimientos.
                            </p>
                        </div>
                        {canCreate && (
                            <button
                                type="button"
                                onClick={() => setCreateModalOpen(true)}
                                className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-sidebar-active px-4 text-sm font-semibold text-white hover:opacity-90"
                            >
                                <Plus className="h-4 w-4" />
                                Nueva tarjeta
                            </button>
                        )}
                    </div>
                </Card>

                {cards.length === 0 ? (
                    <Card className={cardClass}>
                        <div className="flex flex-col items-center py-10 text-center">
                            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-sidebar-active/10 text-sidebar-active">
                                <CreditCard className="h-7 w-7" />
                            </div>
                            <p className="mt-4 text-base font-semibold text-slate-900 dark:text-white">
                                No hay tarjetas activas
                            </p>
                            <p className="mt-1 max-w-sm text-sm text-slate-500">
                                Registra una tarjeta para llevar compras, abonos y el monto real del
                                saldo.
                            </p>
                        </div>
                    </Card>
                ) : (
                    <div className="grid w-full min-w-0 grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
                        {cards.map((card) => (
                            <BankCardVisual
                                key={card.id}
                                card={card}
                                canEdit={canUpdate}
                                onEdit={() => openEditCard(card)}
                            />
                        ))}
                    </div>
                )}

                <Dialog open={createModalOpen} onOpenChange={setCreateModalOpen}>
                    <DialogContent className="sm:max-w-md">
                        <DialogHeader>
                            <DialogTitle>Nueva tarjeta</DialogTitle>
                            <DialogDescription>
                                Registra los datos de la tarjeta compartida y el monto real inicial.
                            </DialogDescription>
                        </DialogHeader>
                        <form onSubmit={submitCreate} noValidate className="space-y-4">
                            {renderAccountFormFields(createForm, 'create')}
                            <DialogFooter className="gap-2 sm:gap-0">
                                <button
                                    type="button"
                                    onClick={() => setCreateModalOpen(false)}
                                    className="inline-flex h-10 items-center justify-center rounded-xl border border-slate-200 px-4 text-sm font-medium text-slate-700 dark:border-[#3a3a3a] dark:text-slate-200"
                                >
                                    Cancelar
                                </button>
                                <button
                                    type="submit"
                                    disabled={createForm.processing}
                                    className="inline-flex h-10 items-center justify-center rounded-xl bg-sidebar-active px-4 text-sm font-semibold text-white disabled:opacity-50"
                                >
                                    {createForm.processing ? 'Guardando...' : 'Crear tarjeta'}
                                </button>
                            </DialogFooter>
                        </form>
                    </DialogContent>
                </Dialog>

                <Dialog
                    open={editingCard !== null}
                    onOpenChange={(open) => {
                        if (!open) closeEditCard();
                    }}
                >
                    <DialogContent className="sm:max-w-md">
                        <DialogHeader>
                            <DialogTitle>Editar tarjeta</DialogTitle>
                            <DialogDescription>
                                Actualiza los datos visibles en la tarjeta. Si cambias el monto inicial,
                                el monto real se recalcula con los movimientos.
                            </DialogDescription>
                        </DialogHeader>
                        <form onSubmit={submitEdit} noValidate className="space-y-4">
                            {renderAccountFormFields(editForm, 'edit')}
                            <DialogFooter className="gap-2 sm:gap-0">
                                <button
                                    type="button"
                                    onClick={closeEditCard}
                                    className="inline-flex h-10 items-center justify-center rounded-xl border border-slate-200 px-4 text-sm font-medium text-slate-700 dark:border-[#3a3a3a] dark:text-slate-200"
                                >
                                    Cancelar
                                </button>
                                <button
                                    type="submit"
                                    disabled={editForm.processing}
                                    className="inline-flex h-10 items-center justify-center rounded-xl bg-sidebar-active px-4 text-sm font-semibold text-white disabled:opacity-50"
                                >
                                    {editForm.processing ? 'Guardando...' : 'Guardar cambios'}
                                </button>
                            </DialogFooter>
                        </form>
                    </DialogContent>
                </Dialog>
            </div>
        </AppLayout>
    );
}
