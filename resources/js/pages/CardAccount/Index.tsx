import AppLayout from '@/layouts/app-layout';
import { Card, Pagination } from '@/components/ui';
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
import { confirmAction } from '@/lib/sweetalert';
import { formatCurrency, cn, localDateInputValue } from '@/lib/utils';
import { type BreadcrumbItem } from '@/types';
import { Head, router, useForm, usePage } from '@inertiajs/react';
import { useSectionAccess } from '@/hooks/useSectionAccess';
import {
    CreditCard,
    HandCoins,
    Pencil,
    Plus,
    Scale,
    Trash2,
    TrendingDown,
    TrendingUp,
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';

type BalanceDisplay = {
    label: string;
    tone: 'amber' | 'violet' | 'neutral';
    value: string;
    direction: 'holder_owes' | 'user_owes' | null;
};

type MovementRow = {
    id: number;
    type: 'purchase' | 'payment';
    type_label: string;
    name: string;
    amount: number;
    amount_label: string;
    description: string | null;
    movement_date: string;
    movement_date_formatted: string | null;
    created_at: string | null;
    registered_by: string | null;
    editable: boolean;
};

type PaginatedMovements = {
    data: MovementRow[];
    current_page: number;
    last_page: number;
    per_page: number;
    total: number;
    from: number | null;
    to: number | null;
};

interface CardAccountIndexProps {
    account: {
        id: number;
        holder_name: string | null;
        opened_at: string | null;
    } | null;
    balance: number;
    totalPurchases: number;
    totalPayments: number;
    balanceDisplay: BalanceDisplay;
    readyToLiquidate: boolean;
    movements: PaginatedMovements;
    perPageOptions: number[];
}

const PER_PAGE_OPTIONS = [20, 50, 75, 100] as const;

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Dashboard', href: '/dashboard' },
    { title: 'Cuenta tarjeta', href: '/cuenta-tarjeta' },
];

const cardClass =
    'border border-slate-200/80 bg-white p-4 shadow-sm dark:border-[#2b2b2b] dark:bg-[#262626] sm:p-5';

function toneClass(tone: BalanceDisplay['tone']): string {
    if (tone === 'amber') return 'text-amber-600 dark:text-amber-400';
    if (tone === 'violet') return 'text-violet-600 dark:text-violet-400';
    return 'text-slate-700 dark:text-slate-200';
}

export default function CardAccountIndex({
    account,
    balance,
    totalPurchases,
    totalPayments,
    balanceDisplay,
    readyToLiquidate,
    movements,
    perPageOptions = [...PER_PAGE_OPTIONS],
}: CardAccountIndexProps) {
    const {
        canCreate,
        canUpdate,
        canDelete,
        canPayment,
        canLiquidate,
    } = useSectionAccess('card_account');

    const page = usePage();
    const flash = page.props.flash as { success?: string; error?: string } | undefined;

    const [purchaseModalOpen, setPurchaseModalOpen] = useState(false);
    const [paymentModalOpen, setPaymentModalOpen] = useState(false);
    const [editingMovement, setEditingMovement] = useState<MovementRow | null>(null);

    const purchaseForm = useForm({
        holder_name: account?.holder_name ?? '',
        movement_date: localDateInputValue(),
        name: '',
        amount: '',
        description: '',
    });

    const paymentForm = useForm({
        movement_date: localDateInputValue(),
        name: 'Abono',
        amount: '',
        description: '',
    });

    const editForm = useForm({
        movement_date: localDateInputValue(),
        name: '',
        amount: '',
        description: '',
    });

    useEffect(() => {
        if (flash?.success) toast.success(flash.success);
        if (flash?.error) toast.error(flash.error);
    }, [flash?.success, flash?.error]);

    const submitPurchase = (e: React.FormEvent) => {
        e.preventDefault();
        purchaseForm.post('/cuenta-tarjeta/compras', {
            preserveScroll: true,
            onSuccess: () => {
                purchaseForm.reset('name', 'amount', 'description');
                purchaseForm.setData('movement_date', localDateInputValue());
                setPurchaseModalOpen(false);
            },
        });
    };

    const submitPayment = (e: React.FormEvent) => {
        e.preventDefault();
        paymentForm.post('/cuenta-tarjeta/abonos', {
            preserveScroll: true,
            onSuccess: () => {
                paymentForm.reset('amount', 'description');
                paymentForm.setData({
                    name: 'Abono',
                    movement_date: localDateInputValue(),
                });
                setPaymentModalOpen(false);
            },
        });
    };

    const openEdit = (movement: MovementRow) => {
        setEditingMovement(movement);
        editForm.setData({
            movement_date: movement.movement_date,
            name: movement.name,
            amount: String(movement.amount),
            description: movement.description ?? '',
        });
        editForm.clearErrors();
    };

    const closeEdit = () => {
        setEditingMovement(null);
        editForm.reset();
        editForm.clearErrors();
    };

    const submitEdit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!editingMovement) return;

        editForm.put(`/cuenta-tarjeta/movimientos/${editingMovement.id}`, {
            preserveScroll: true,
            onSuccess: () => closeEdit(),
        });
    };

    const deleteMovement = async (movement: MovementRow) => {
        const confirmed = await confirmAction({
            title: '¿Eliminar registro?',
            text: `${movement.type_label}: ${movement.name} — ${movement.amount_label}`,
            confirmText: 'Sí, eliminar',
            icon: 'warning',
        });

        if (!confirmed) return;

        router.delete(`/cuenta-tarjeta/movimientos/${movement.id}`, { preserveScroll: true });
    };

    const liquidateAccount = async () => {
        const confirmed = await confirmAction({
            title: '¿Liquidar cuenta?',
            text: 'Se cerrará esta cuenta y podrás iniciar una nueva con otro compañero.',
            confirmText: 'Sí, liquidar',
            icon: 'warning',
        });

        if (!confirmed) return;

        router.post('/cuenta-tarjeta/liquidar', {}, { preserveScroll: true });
    };

    const visitMovements = (params: { page?: number; per_page?: number }) => {
        router.get(
            '/cuenta-tarjeta',
            {
                page: params.page ?? movements.current_page,
                per_page: params.per_page ?? movements.per_page,
            },
            { preserveState: true, preserveScroll: true, replace: true },
        );
    };

    const handlePerPageChange = (perPage: number) => {
        visitMovements({ page: 1, per_page: perPage });
    };

    const handlePageChange = (page: number) => {
        visitMovements({ page });
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs} title="Cuenta tarjeta">
            <Head title="Cuenta tarjeta" />

            <div className="flex w-full flex-col gap-4">
                <Card className={cardClass}>
                    <div className="flex items-start gap-3">
                        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-sidebar-active/10 text-sidebar-active">
                            <CreditCard className="h-5 w-5" />
                        </div>
                        <div className="min-w-0 flex-1">
                            <p className="text-sm text-slate-500">Cuenta compartida de la tarjeta</p>
                            {account?.holder_name && (
                                <p className="mt-0.5 text-sm font-medium text-slate-700 dark:text-slate-200">
                                    Tarjeta con: {account.holder_name}
                                </p>
                            )}
                            {account?.opened_at && (
                                <p className="text-xs text-slate-500">
                                    Cuenta abierta desde {account.opened_at}
                                </p>
                            )}
                            <p className={cn('mt-2 text-2xl font-bold sm:text-3xl', toneClass(balanceDisplay.tone))}>
                                {balanceDisplay.value}
                            </p>
                            <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
                                {balanceDisplay.label}
                            </p>
                        </div>
                    </div>

                    <div className="mt-4 grid gap-3 sm:grid-cols-2">
                        <div className="rounded-xl bg-rose-50 px-3 py-3 dark:bg-rose-950/30">
                            <div className="flex items-center gap-1.5 text-[10px] font-semibold uppercase text-rose-700 dark:text-rose-400">
                                <TrendingDown className="h-3.5 w-3.5" />
                                Compras en tarjeta
                            </div>
                            <p className="mt-1 text-xl font-bold text-rose-600 dark:text-rose-400">
                                ${formatCurrency(totalPurchases)}
                            </p>
                        </div>
                        <div className="rounded-xl bg-emerald-50 px-3 py-3 dark:bg-emerald-950/30">
                            <div className="flex items-center gap-1.5 text-[10px] font-semibold uppercase text-emerald-700 dark:text-emerald-400">
                                <TrendingUp className="h-3.5 w-3.5" />
                                Abonos recibidos
                            </div>
                            <p className="mt-1 text-xl font-bold text-emerald-600 dark:text-emerald-400">
                                ${formatCurrency(totalPayments)}
                            </p>
                        </div>
                    </div>

                    <div className="mt-4 flex flex-wrap gap-2">
                        {canCreate && (
                            <button
                                type="button"
                                onClick={() => {
                                    purchaseForm.setData('movement_date', localDateInputValue());
                                    setPurchaseModalOpen(true);
                                }}
                                className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-sidebar-active px-4 text-sm font-semibold text-white hover:opacity-90"
                            >
                                <Plus className="h-4 w-4" />
                                Agregar compra
                            </button>
                        )}
                        {canPayment && account && (
                            <button
                                type="button"
                                onClick={() => {
                                    paymentForm.setData('movement_date', localDateInputValue());
                                    setPaymentModalOpen(true);
                                }}
                                className="inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 text-sm font-semibold text-emerald-700 hover:bg-emerald-100 dark:border-emerald-900 dark:bg-emerald-950/30 dark:text-emerald-400"
                            >
                                <HandCoins className="h-4 w-4" />
                                Registrar abono
                            </button>
                        )}
                        {readyToLiquidate && canLiquidate && (
                            <button
                                type="button"
                                onClick={liquidateAccount}
                                className="inline-flex h-10 items-center justify-center gap-2 rounded-xl border-2 border-sidebar-active px-4 text-sm font-semibold text-sidebar-active hover:bg-sidebar-active/10"
                            >
                                <Scale className="h-4 w-4" />
                                Liquidar cuenta
                            </button>
                        )}
                    </div>
                </Card>

                <Card className={cardClass}>
                    <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                        <div>
                            <h2 className="text-base font-semibold text-slate-900 dark:text-white">
                                Movimientos
                            </h2>
                            <p className="mt-1 text-sm text-slate-500">
                                Todos con permiso ven los mismos movimientos. Compras con la tarjeta y
                                abonos del equipo.
                            </p>
                        </div>
                        {movements.total > 0 && (
                            <p className="text-xs text-slate-500">
                                {movements.total} movimiento{movements.total !== 1 ? 's' : ''}
                            </p>
                        )}
                    </div>

                    {movements.data.length === 0 ? (
                        <p className="mt-4 rounded-xl border border-dashed border-slate-200 py-8 text-center text-sm text-slate-500 dark:border-[#3a3a3a]">
                            {account
                                ? 'Aún no hay movimientos en esta cuenta.'
                                : 'Agrega la primera compra para abrir la cuenta.'}
                        </p>
                    ) : (
                        <ul className="mt-4 space-y-2">
                            {movements.data.map((movement) => {
                                const isPurchase = movement.type === 'purchase';

                                return (
                                    <li
                                        key={movement.id}
                                        className="flex items-start justify-between gap-3 rounded-xl border border-slate-200 bg-slate-50/50 p-3 dark:border-[#3a3a3a] dark:bg-[#1f1f1f]/50"
                                    >
                                        <div className="min-w-0">
                                            <div className="flex flex-wrap items-center gap-2">
                                                <span
                                                    className={cn(
                                                        'rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase',
                                                        isPurchase
                                                            ? 'bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300'
                                                            : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300',
                                                    )}
                                                >
                                                    {movement.type_label}
                                                </span>
                                                <p className="text-sm font-semibold text-slate-900 dark:text-white">
                                                    {movement.name}
                                                </p>
                                            </div>
                                            {movement.description && (
                                                <p className="mt-0.5 text-xs text-slate-500">
                                                    {movement.description}
                                                </p>
                                            )}
                                            {movement.movement_date_formatted && (
                                                <p className="mt-1 text-[10px] text-slate-400">
                                                    {movement.movement_date_formatted}
                                                    {movement.registered_by &&
                                                        ` · ${movement.registered_by}`}
                                                </p>
                                            )}
                                        </div>
                                        <div className="flex shrink-0 items-center gap-1">
                                            <p
                                                className={cn(
                                                    'text-sm font-bold tabular-nums',
                                                    isPurchase
                                                        ? 'text-rose-600 dark:text-rose-400'
                                                        : 'text-emerald-600 dark:text-emerald-400',
                                                )}
                                            >
                                                {isPurchase ? '+' : '−'}
                                                {movement.amount_label}
                                            </p>
                                            {movement.editable && canUpdate && (
                                                <button
                                                    type="button"
                                                    onClick={() => openEdit(movement)}
                                                    className="rounded p-1.5 text-slate-500 hover:bg-slate-100 dark:hover:bg-[#333]"
                                                    title="Editar"
                                                >
                                                    <Pencil className="h-4 w-4" />
                                                </button>
                                            )}
                                            {movement.editable && canDelete && (
                                                <button
                                                    type="button"
                                                    onClick={() => deleteMovement(movement)}
                                                    className="rounded p-1.5 text-slate-500 hover:bg-slate-100 dark:hover:bg-[#333]"
                                                    title="Eliminar"
                                                >
                                                    <Trash2 className="h-4 w-4" />
                                                </button>
                                            )}
                                        </div>
                                    </li>
                                );
                            })}
                        </ul>
                    )}

                    {movements.total > 0 && (
                        <div className="mt-4 flex flex-col gap-3 border-t border-slate-200 pt-4 dark:border-[#3a3a3a] sm:flex-row sm:items-center sm:justify-between">
                            <div className="flex flex-wrap items-center gap-2 text-sm text-slate-500">
                                <label htmlFor="card-movements-per-page" className="shrink-0">
                                    Mostrar
                                </label>
                                <select
                                    id="card-movements-per-page"
                                    value={movements.per_page}
                                    onChange={(e) => handlePerPageChange(Number(e.target.value))}
                                    className="h-8 rounded-lg border border-slate-200 bg-white px-2 text-sm text-slate-700 dark:border-[#3a3a3a] dark:bg-[#1f1f1f] dark:text-slate-200"
                                >
                                    {perPageOptions.map((option) => (
                                        <option key={option} value={option}>
                                            {option}
                                        </option>
                                    ))}
                                </select>
                                <span className="shrink-0">por página</span>
                                {movements.from !== null && movements.to !== null && (
                                    <span className="text-xs sm:ml-1">
                                        ({movements.from}–{movements.to} de {movements.total})
                                    </span>
                                )}
                            </div>

                            {movements.last_page > 1 && (
                                <Pagination
                                    currentPage={movements.current_page}
                                    totalPages={movements.last_page}
                                    onPageChange={handlePageChange}
                                    iconOnly
                                />
                            )}
                        </div>
                    )}
                </Card>

                <Dialog open={purchaseModalOpen} onOpenChange={setPurchaseModalOpen}>
                    <DialogContent className="sm:max-w-md">
                        <DialogHeader>
                            <DialogTitle>Agregar compra</DialogTitle>
                            <DialogDescription>
                                Registra lo que gastó tu compañero con la tarjeta.
                            </DialogDescription>
                        </DialogHeader>
                        <form onSubmit={submitPurchase} noValidate className="space-y-4">
                            {!account && (
                                <div>
                                    <Label htmlFor="holder_name" className="mb-1 block text-xs text-slate-500">
                                        Nombre del compañero
                                    </Label>
                                    <Input
                                        id="holder_name"
                                        value={purchaseForm.data.holder_name}
                                        onChange={(e) =>
                                            purchaseForm.setData('holder_name', e.target.value)
                                        }
                                        placeholder="Ej. Juan"
                                    />
                                </div>
                            )}
                            <div>
                                <Label
                                    htmlFor="purchase_movement_date"
                                    className="mb-1 block text-xs text-slate-500"
                                >
                                    Fecha de la compra
                                </Label>
                                <Input
                                    id="purchase_movement_date"
                                    type="date"
                                    value={purchaseForm.data.movement_date}
                                    onChange={(e) =>
                                        purchaseForm.setData('movement_date', e.target.value)
                                    }
                                    className={cn(
                                        purchaseForm.errors.movement_date && 'border-rose-500',
                                    )}
                                />
                                {purchaseForm.errors.movement_date && (
                                    <p className="mt-1 text-xs text-rose-600">
                                        {purchaseForm.errors.movement_date}
                                    </p>
                                )}
                            </div>
                            <div>
                                <Label htmlFor="purchase_name" className="mb-1 block text-xs text-slate-500">
                                    Nombre
                                </Label>
                                <Input
                                    id="purchase_name"
                                    value={purchaseForm.data.name}
                                    onChange={(e) => purchaseForm.setData('name', e.target.value)}
                                    placeholder="Ej. Gasolina Oxxo"
                                    className={cn(purchaseForm.errors.name && 'border-rose-500')}
                                />
                                {purchaseForm.errors.name && (
                                    <p className="mt-1 text-xs text-rose-600">{purchaseForm.errors.name}</p>
                                )}
                            </div>
                            <div>
                                <Label htmlFor="purchase_amount" className="mb-1 block text-xs text-slate-500">
                                    Monto ($)
                                </Label>
                                <Input
                                    id="purchase_amount"
                                    type="number"
                                    min={0.01}
                                    step="0.01"
                                    value={purchaseForm.data.amount}
                                    onChange={(e) => purchaseForm.setData('amount', e.target.value)}
                                    className={cn(purchaseForm.errors.amount && 'border-rose-500')}
                                />
                                {purchaseForm.errors.amount && (
                                    <p className="mt-1 text-xs text-rose-600">{purchaseForm.errors.amount}</p>
                                )}
                            </div>
                            <div>
                                <Label
                                    htmlFor="purchase_description"
                                    className="mb-1 block text-xs text-slate-500"
                                >
                                    Descripción (opcional)
                                </Label>
                                <Input
                                    id="purchase_description"
                                    value={purchaseForm.data.description}
                                    onChange={(e) =>
                                        purchaseForm.setData('description', e.target.value)
                                    }
                                />
                            </div>
                            <DialogFooter className="gap-2 sm:gap-0">
                                <button
                                    type="button"
                                    onClick={() => setPurchaseModalOpen(false)}
                                    className="inline-flex h-10 items-center justify-center rounded-xl border border-slate-200 px-4 text-sm font-medium text-slate-700 dark:border-[#3a3a3a] dark:text-slate-200"
                                >
                                    Cancelar
                                </button>
                                <button
                                    type="submit"
                                    disabled={purchaseForm.processing}
                                    className="inline-flex h-10 items-center justify-center rounded-xl bg-sidebar-active px-4 text-sm font-semibold text-white disabled:opacity-50"
                                >
                                    {purchaseForm.processing ? 'Guardando...' : 'Guardar compra'}
                                </button>
                            </DialogFooter>
                        </form>
                    </DialogContent>
                </Dialog>

                <Dialog open={paymentModalOpen} onOpenChange={setPaymentModalOpen}>
                    <DialogContent className="sm:max-w-md">
                        <DialogHeader>
                            <DialogTitle>Registrar abono</DialogTitle>
                            <DialogDescription>
                                Registra el dinero que te va entregando tu compañero.
                            </DialogDescription>
                        </DialogHeader>
                        <form onSubmit={submitPayment} noValidate className="space-y-4">
                            <div>
                                <Label
                                    htmlFor="payment_movement_date"
                                    className="mb-1 block text-xs text-slate-500"
                                >
                                    Fecha del abono
                                </Label>
                                <Input
                                    id="payment_movement_date"
                                    type="date"
                                    value={paymentForm.data.movement_date}
                                    onChange={(e) =>
                                        paymentForm.setData('movement_date', e.target.value)
                                    }
                                    className={cn(
                                        paymentForm.errors.movement_date && 'border-rose-500',
                                    )}
                                />
                                {paymentForm.errors.movement_date && (
                                    <p className="mt-1 text-xs text-rose-600">
                                        {paymentForm.errors.movement_date}
                                    </p>
                                )}
                            </div>
                            <div>
                                <Label htmlFor="payment_name" className="mb-1 block text-xs text-slate-500">
                                    Nombre
                                </Label>
                                <Input
                                    id="payment_name"
                                    value={paymentForm.data.name}
                                    onChange={(e) => paymentForm.setData('name', e.target.value)}
                                    className={cn(paymentForm.errors.name && 'border-rose-500')}
                                />
                            </div>
                            <div>
                                <Label htmlFor="payment_amount" className="mb-1 block text-xs text-slate-500">
                                    Monto ($)
                                </Label>
                                <Input
                                    id="payment_amount"
                                    type="number"
                                    min={0.01}
                                    step="0.01"
                                    value={paymentForm.data.amount}
                                    onChange={(e) => paymentForm.setData('amount', e.target.value)}
                                    className={cn(paymentForm.errors.amount && 'border-rose-500')}
                                />
                                {paymentForm.errors.amount && (
                                    <p className="mt-1 text-xs text-rose-600">{paymentForm.errors.amount}</p>
                                )}
                            </div>
                            <div>
                                <Label
                                    htmlFor="payment_description"
                                    className="mb-1 block text-xs text-slate-500"
                                >
                                    Descripción (opcional)
                                </Label>
                                <Input
                                    id="payment_description"
                                    value={paymentForm.data.description}
                                    onChange={(e) =>
                                        paymentForm.setData('description', e.target.value)
                                    }
                                />
                            </div>
                            <DialogFooter className="gap-2 sm:gap-0">
                                <button
                                    type="button"
                                    onClick={() => setPaymentModalOpen(false)}
                                    className="inline-flex h-10 items-center justify-center rounded-xl border border-slate-200 px-4 text-sm font-medium text-slate-700 dark:border-[#3a3a3a] dark:text-slate-200"
                                >
                                    Cancelar
                                </button>
                                <button
                                    type="submit"
                                    disabled={paymentForm.processing}
                                    className="inline-flex h-10 items-center justify-center rounded-xl bg-emerald-600 px-4 text-sm font-semibold text-white disabled:opacity-50"
                                >
                                    {paymentForm.processing ? 'Guardando...' : 'Guardar abono'}
                                </button>
                            </DialogFooter>
                        </form>
                    </DialogContent>
                </Dialog>

                <Dialog
                    open={editingMovement !== null}
                    onOpenChange={(open) => {
                        if (!open) closeEdit();
                    }}
                >
                    <DialogContent className="sm:max-w-md">
                        <DialogHeader>
                            <DialogTitle>Editar registro</DialogTitle>
                            <DialogDescription>
                                Al guardar se recalcula el saldo de la cuenta.
                            </DialogDescription>
                        </DialogHeader>
                        <form onSubmit={submitEdit} noValidate className="space-y-4">
                            <div>
                                <Label
                                    htmlFor="edit_movement_date"
                                    className="mb-1 block text-xs text-slate-500"
                                >
                                    Fecha del registro
                                </Label>
                                <Input
                                    id="edit_movement_date"
                                    type="date"
                                    value={editForm.data.movement_date}
                                    onChange={(e) =>
                                        editForm.setData('movement_date', e.target.value)
                                    }
                                    className={cn(
                                        editForm.errors.movement_date && 'border-rose-500',
                                    )}
                                />
                                {editForm.errors.movement_date && (
                                    <p className="mt-1 text-xs text-rose-600">
                                        {editForm.errors.movement_date}
                                    </p>
                                )}
                            </div>
                            <div>
                                <Label htmlFor="edit_name" className="mb-1 block text-xs text-slate-500">
                                    Nombre
                                </Label>
                                <Input
                                    id="edit_name"
                                    value={editForm.data.name}
                                    onChange={(e) => editForm.setData('name', e.target.value)}
                                    className={cn(editForm.errors.name && 'border-rose-500')}
                                />
                            </div>
                            <div>
                                <Label htmlFor="edit_amount" className="mb-1 block text-xs text-slate-500">
                                    Monto ($)
                                </Label>
                                <Input
                                    id="edit_amount"
                                    type="number"
                                    min={0.01}
                                    step="0.01"
                                    value={editForm.data.amount}
                                    onChange={(e) => editForm.setData('amount', e.target.value)}
                                    className={cn(editForm.errors.amount && 'border-rose-500')}
                                />
                            </div>
                            <div>
                                <Label
                                    htmlFor="edit_description"
                                    className="mb-1 block text-xs text-slate-500"
                                >
                                    Descripción (opcional)
                                </Label>
                                <Input
                                    id="edit_description"
                                    value={editForm.data.description}
                                    onChange={(e) => editForm.setData('description', e.target.value)}
                                />
                            </div>
                            <DialogFooter className="gap-2 sm:gap-0">
                                <button
                                    type="button"
                                    onClick={closeEdit}
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
