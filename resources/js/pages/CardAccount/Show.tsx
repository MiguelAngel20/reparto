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
import { Head, Link, router, useForm, usePage } from '@inertiajs/react';
import { useSectionAccess } from '@/hooks/useSectionAccess';
import {
    CreditCard,
    HandCoins,
    Landmark,
    Pencil,
    Plus,
    Trash2,
    TrendingDown,
    TrendingUp,
    Wallet,
} from 'lucide-react';
import { Fragment, useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';

type BalanceDisplay = {
    label: string;
    tone: 'amber' | 'violet' | 'neutral';
    value: string;
    direction: 'holder_owes' | 'user_owes' | null;
};

type MovementRow = {
    id: number;
    type: 'purchase' | 'payment' | 'real_deposit';
    type_label: string;
    payment_method: 'cash' | 'transfer' | null;
    payment_method_label: string | null;
    name: string;
    amount: number;
    amount_label: string;
    description: string | null;
    movement_date: string;
    movement_date_formatted: string | null;
    created_at: string | null;
    registered_by: string | null;
    editable: boolean;
    marker_after: 'cycle_start' | 'settled' | null;
    cycle_start_date_formatted: string | null;
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

interface CardAccountShowProps {
    account: {
        id: number;
        holder_name: string | null;
        account_holder_name: string | null;
        bank_type: string | null;
        account_number: string | null;
        initial_real_balance: number | null;
        real_balance: number | null;
        real_balance_configured: boolean;
        opened_at: string | null;
    };
    balance: number;
    totalPurchases: number;
    totalPayments: number;
    realBalance: number | null;
    realBalanceConfigured: boolean;
    balanceDisplay: BalanceDisplay;
    movements: PaginatedMovements;
    perPageOptions: number[];
}

const breadcrumbs = (accountId: number): BreadcrumbItem[] => [
    { title: 'Dashboard', href: '/dashboard' },
    { title: 'Cuenta tarjeta', href: '/cuenta-tarjeta' },
    { title: 'Detalle', href: `/cuenta-tarjeta/${accountId}` },
];

const cardClass =
    'border border-slate-200/80 bg-white p-4 shadow-sm dark:border-[#2b2b2b] dark:bg-[#262626] sm:p-5';

function toneClass(tone: BalanceDisplay['tone']): string {
    if (tone === 'amber') return 'text-amber-600 dark:text-amber-400';
    if (tone === 'violet') return 'text-violet-600 dark:text-violet-400';
    return 'text-slate-700 dark:text-slate-200';
}

function isTypingTarget(target: EventTarget | null): boolean {
    if (!(target instanceof HTMLElement)) {
        return false;
    }

    const tag = target.tagName;

    return (
        tag === 'INPUT' ||
        tag === 'TEXTAREA' ||
        tag === 'SELECT' ||
        target.isContentEditable
    );
}

function DebtCycleSeparator({
    type,
    date,
}: {
    type: 'settled' | 'cycle_start';
    date?: string | null;
}) {
    if (type === 'settled') {
        return (
            <li
                aria-hidden
                className="flex items-center gap-3 py-1"
            >
                <div className="h-px flex-1 bg-emerald-300 dark:bg-emerald-800" />
                <span className="shrink-0 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-[10px] font-semibold uppercase tracking-wide text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-300">
                    Al corriente — ya no debe a la tarjeta
                </span>
                <div className="h-px flex-1 bg-emerald-300 dark:bg-emerald-800" />
            </li>
        );
    }

    return (
        <li
            aria-hidden
            className="flex items-center gap-3 py-1"
        >
            <div className="h-px flex-1 bg-amber-300 dark:bg-amber-800" />
            <span className="shrink-0 rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-[10px] font-semibold uppercase tracking-wide text-amber-800 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-300">
                Inicio de nueva deuda{date ? ` · ${date}` : ''}
            </span>
            <div className="h-px flex-1 bg-amber-300 dark:bg-amber-800" />
        </li>
    );
}

function MovementListItem({
    movement,
    canUpdate,
    canDelete,
    onEdit,
    onDelete,
}: {
    movement: MovementRow;
    canUpdate: boolean;
    canDelete: boolean;
    onEdit: (movement: MovementRow) => void;
    onDelete: (movement: MovementRow) => void;
}) {
    const isPurchase = movement.type === 'purchase';
    const isRealDeposit = movement.type === 'real_deposit';

    return (
        <li className="flex items-start justify-between gap-3 rounded-xl border border-slate-200 bg-slate-50/50 p-3 dark:border-[#3a3a3a] dark:bg-[#1f1f1f]/50">
            <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                    <span
                        className={cn(
                            'rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase',
                            isPurchase
                                ? 'bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300'
                                : isRealDeposit
                                  ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300'
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
                    <p className="mt-0.5 text-xs text-slate-500">{movement.description}</p>
                )}
                {movement.payment_method_label && (
                    <p className="mt-0.5 text-xs text-slate-500">{movement.payment_method_label}</p>
                )}
                {movement.movement_date_formatted && (
                    <p className="mt-1 text-[10px] text-slate-400">
                        {movement.movement_date_formatted}
                        {movement.registered_by && ` · ${movement.registered_by}`}
                    </p>
                )}
            </div>
            <div className="flex shrink-0 items-center gap-1">
                <p
                    className={cn(
                        'text-sm font-bold tabular-nums',
                        isPurchase
                            ? 'text-rose-600 dark:text-rose-400'
                            : isRealDeposit
                              ? 'text-blue-600 dark:text-blue-400'
                              : 'text-emerald-600 dark:text-emerald-400',
                    )}
                >
                    {isPurchase ? '+' : isRealDeposit ? '↑' : '−'}
                    {movement.amount_label}
                </p>
                {movement.editable && canUpdate && (
                    <button
                        type="button"
                        onClick={() => onEdit(movement)}
                        className="rounded p-1.5 text-slate-500 hover:bg-slate-100 dark:hover:bg-[#333]"
                        title="Editar"
                    >
                        <Pencil className="h-4 w-4" />
                    </button>
                )}
                {movement.editable && canDelete && (
                    <button
                        type="button"
                        onClick={() => onDelete(movement)}
                        className="rounded p-1.5 text-slate-500 hover:bg-slate-100 dark:hover:bg-[#333]"
                        title="Eliminar"
                    >
                        <Trash2 className="h-4 w-4" />
                    </button>
                )}
            </div>
        </li>
    );
}

export default function CardAccountShow({
    account,
    balance,
    totalPurchases,
    totalPayments,
    realBalance,
    realBalanceConfigured,
    balanceDisplay,
    movements,
    perPageOptions = [20, 50, 75, 100],
}: CardAccountShowProps) {
    const {
        canCreate,
        canUpdate,
        canDelete,
        canPayment,
        canRealDeposit,
    } = useSectionAccess('card_account');

    const page = usePage();
    const flash = page.props.flash as { success?: string; error?: string } | undefined;

    const [purchaseModalOpen, setPurchaseModalOpen] = useState(false);
    const [paymentModalOpen, setPaymentModalOpen] = useState(false);
    const [realDepositModalOpen, setRealDepositModalOpen] = useState(false);
    const [editingMovement, setEditingMovement] = useState<MovementRow | null>(null);

    const purchaseForm = useForm({
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
        payment_method: 'cash' as 'cash' | 'transfer',
    });

    const realDepositForm = useForm({
        movement_date: localDateInputValue(),
        name: 'Depósito a tarjeta',
        amount: '',
        description: '',
    });

    const editForm = useForm({
        movement_date: localDateInputValue(),
        name: '',
        amount: '',
        description: '',
        payment_method: 'cash' as 'cash' | 'transfer',
    });

    useEffect(() => {
        if (flash?.success) toast.success(flash.success);
        if (flash?.error) toast.error(flash.error);
    }, [flash?.success, flash?.error]);

    const openPurchaseModal = useCallback(() => {
        purchaseForm.setData('movement_date', localDateInputValue());
        setPurchaseModalOpen(true);
    }, [purchaseForm]);

    useEffect(() => {
        if (!canCreate) {
            return;
        }

        const handleKeyDown = (event: KeyboardEvent) => {
            if (event.key !== 'F1') {
                return;
            }

            if (isTypingTarget(event.target)) {
                return;
            }

            if (
                purchaseModalOpen ||
                paymentModalOpen ||
                realDepositModalOpen ||
                editingMovement !== null
            ) {
                return;
            }

            event.preventDefault();
            openPurchaseModal();
        };

        window.addEventListener('keydown', handleKeyDown);

        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [
        canCreate,
        purchaseModalOpen,
        paymentModalOpen,
        realDepositModalOpen,
        editingMovement,
        openPurchaseModal,
    ]);

    const submitPurchase = (e: React.FormEvent) => {
        e.preventDefault();
        purchaseForm.post(`/cuenta-tarjeta/${account.id}/compras`, {
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
        paymentForm.post(`/cuenta-tarjeta/${account.id}/abonos`, {
            preserveScroll: true,
            onSuccess: () => {
                paymentForm.reset('amount', 'description');
                paymentForm.setData({
                    name: 'Abono',
                    movement_date: localDateInputValue(),
                    payment_method: 'cash',
                });
                setPaymentModalOpen(false);
            },
        });
    };

    const submitRealDeposit = (e: React.FormEvent) => {
        e.preventDefault();
        realDepositForm.post(`/cuenta-tarjeta/${account.id}/deposito-real`, {
            preserveScroll: true,
            onSuccess: () => {
                realDepositForm.reset('amount', 'description');
                realDepositForm.setData({
                    name: 'Depósito a tarjeta',
                    movement_date: localDateInputValue(),
                });
                setRealDepositModalOpen(false);
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
            payment_method: movement.payment_method ?? 'cash',
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

        editForm.put(`/cuenta-tarjeta/${account.id}/movimientos/${editingMovement.id}`, {
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

        router.delete(`/cuenta-tarjeta/${account.id}/movimientos/${movement.id}`, { preserveScroll: true });
    };

    const visitMovements = (params: { page?: number; per_page?: number }) => {
        router.get(
            `/cuenta-tarjeta/${account.id}`,
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
        <AppLayout breadcrumbs={breadcrumbs(account.id)} title="Cuenta tarjeta">
            <Head title="Cuenta tarjeta" />

            <Link
                href="/cuenta-tarjeta"
                className="mb-3 inline-block text-sm text-slate-600 dark:text-slate-400"
            >
                ← Tarjetas
            </Link>

            <div className="flex w-full flex-col gap-4">
                <Card className={cardClass}>
                    <div className="flex items-start gap-3">
                        <div className="min-w-0 flex-1">
                            {account.account_holder_name && (
                                <p className="mt-0.5 text-sm font-medium text-slate-700 dark:text-slate-200">
                                    Titular: {account.account_holder_name}
                                </p>
                            )}
                            <p className="mt-2 text-sm font-semibold text-slate-700 dark:text-slate-200">
                                Monto real de la tarjeta:{' '}
                                <span className="text-sidebar-active">
                                    {realBalanceConfigured && realBalance !== null
                                        ? `$${formatCurrency(realBalance)}`
                                        : 'Sin configurar'}
                                </span>
                            </p>
                            <p className={cn('mt-2 text-2xl font-bold sm:text-3xl', toneClass(balanceDisplay.tone))}>
                                {balanceDisplay.value}
                            </p>
                            <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
                                {balanceDisplay.label}
                                {account.opened_at && (
                                <p className="text-xs text-slate-500">
                                    Cuenta abierta desde {account.opened_at}
                                </p>
                            )}
                            </p>
                            {balance <= 0 && (
                                <p className="mt-2 inline-flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-300">
                                    Al corriente — no hay deuda pendiente con la tarjeta
                                </p>
                            )}
                        </div>
                    </div>

                    <div className="mt-4 grid gap-3 sm:grid-cols-3">
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
                        <div className="rounded-xl bg-blue-50 px-3 py-3 dark:bg-blue-950/30">
                            <div className="flex items-center gap-1.5 text-[10px] font-semibold uppercase text-blue-700 dark:text-blue-400">
                                <Wallet className="h-3.5 w-3.5" />
                                Depósitos reales
                            </div>
                            <p className="mt-1 text-xl font-bold text-blue-600 dark:text-blue-400">
                                {realBalanceConfigured && realBalance !== null
                                    ? `$${formatCurrency(realBalance)}`
                                    : '—'}
                            </p>
                        </div>
                    </div>

                    <div className="mt-4 flex flex-wrap gap-2">
                        {canCreate && (
                            <button
                                type="button"
                                onClick={openPurchaseModal}
                                className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-sidebar-active px-4 text-sm font-semibold text-white hover:opacity-90"
                            >
                                <Plus className="h-4 w-4" />
                                Agregar compra
                                <kbd className="hidden rounded border border-white/30 bg-white/10 px-1.5 py-0.5 text-[10px] font-normal sm:inline">
                                    F1
                                </kbd>
                            </button>
                        )}
                        {canPayment && (
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
                        {canRealDeposit && realBalanceConfigured && (
                            <button
                                type="button"
                                onClick={() => {
                                    realDepositForm.setData('movement_date', localDateInputValue());
                                    setRealDepositModalOpen(true);
                                }}
                                className="inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-blue-200 bg-blue-50 px-4 text-sm font-semibold text-blue-700 hover:bg-blue-100 dark:border-blue-900 dark:bg-blue-950/30 dark:text-blue-400"
                            >
                                <Landmark className="h-4 w-4" />
                                Agregar dinero real
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
                                Más recientes primero. Los separadores indican inicio de deuda y cuando
                                quedó al corriente.
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
                            Aún no hay movimientos en esta cuenta.
                        </p>
                    ) : (
                        <ul className="mt-4 space-y-2">
                            {movements.data.map((movement) => (
                                <Fragment key={movement.id}>
                                    <MovementListItem
                                        movement={movement}
                                        canUpdate={canUpdate}
                                        canDelete={canDelete}
                                        onEdit={openEdit}
                                        onDelete={deleteMovement}
                                    />
                                    {movement.marker_after === 'cycle_start' && (
                                        <DebtCycleSeparator
                                            type="cycle_start"
                                            date={movement.cycle_start_date_formatted}
                                        />
                                    )}
                                    {movement.marker_after === 'settled' && (
                                        <DebtCycleSeparator type="settled" />
                                    )}
                                </Fragment>
                            ))}
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
                                <Label className="mb-2 block text-xs text-slate-500">
                                    ¿Cómo te pagó?
                                </Label>
                                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                                    <button
                                        type="button"
                                        onClick={() =>
                                            paymentForm.setData('payment_method', 'cash')
                                        }
                                        className={cn(
                                            'rounded-xl border px-3 py-2.5 text-left text-sm transition-colors',
                                            paymentForm.data.payment_method === 'cash'
                                                ? 'border-emerald-500 bg-emerald-50 text-emerald-800 dark:bg-emerald-950/30 dark:text-emerald-300'
                                                : 'border-slate-200 dark:border-[#3a3a3a]',
                                        )}
                                    >
                                        <span className="font-semibold">Efectivo</span>
                                        <span className="mt-0.5 block text-xs opacity-80">
                                            Solo reduce la deuda
                                        </span>
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() =>
                                            paymentForm.setData('payment_method', 'transfer')
                                        }
                                        className={cn(
                                            'rounded-xl border px-3 py-2.5 text-left text-sm transition-colors',
                                            paymentForm.data.payment_method === 'transfer'
                                                ? 'border-emerald-500 bg-emerald-50 text-emerald-800 dark:bg-emerald-950/30 dark:text-emerald-300'
                                                : 'border-slate-200 dark:border-[#3a3a3a]',
                                        )}
                                    >
                                        <span className="font-semibold">Transferencia a tarjeta</span>
                                        <span className="mt-0.5 block text-xs opacity-80">
                                            Reduce deuda y aumenta monto real
                                        </span>
                                    </button>
                                </div>
                            </div>
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

                <Dialog open={realDepositModalOpen} onOpenChange={setRealDepositModalOpen}>
                    <DialogContent className="sm:max-w-md">
                        <DialogHeader>
                            <DialogTitle>Agregar dinero real a la tarjeta</DialogTitle>
                            <DialogDescription>
                                Usa esto cuando depositas efectivo en la tarjeta física. Aumenta el
                                monto real sin modificar la deuda del compañero.
                            </DialogDescription>
                        </DialogHeader>
                        <form onSubmit={submitRealDeposit} noValidate className="space-y-4">
                            <div>
                                <Label
                                    htmlFor="deposit_movement_date"
                                    className="mb-1 block text-xs text-slate-500"
                                >
                                    Fecha del depósito
                                </Label>
                                <Input
                                    id="deposit_movement_date"
                                    type="date"
                                    value={realDepositForm.data.movement_date}
                                    onChange={(e) =>
                                        realDepositForm.setData('movement_date', e.target.value)
                                    }
                                />
                            </div>
                            <div>
                                <Label htmlFor="deposit_name" className="mb-1 block text-xs text-slate-500">
                                    Nombre
                                </Label>
                                <Input
                                    id="deposit_name"
                                    value={realDepositForm.data.name}
                                    onChange={(e) =>
                                        realDepositForm.setData('name', e.target.value)
                                    }
                                />
                            </div>
                            <div>
                                <Label htmlFor="deposit_amount" className="mb-1 block text-xs text-slate-500">
                                    Monto ($)
                                </Label>
                                <Input
                                    id="deposit_amount"
                                    type="number"
                                    min={0.01}
                                    step="0.01"
                                    value={realDepositForm.data.amount}
                                    onChange={(e) =>
                                        realDepositForm.setData('amount', e.target.value)
                                    }
                                />
                            </div>
                            <div>
                                <Label
                                    htmlFor="deposit_description"
                                    className="mb-1 block text-xs text-slate-500"
                                >
                                    Descripción (opcional)
                                </Label>
                                <Input
                                    id="deposit_description"
                                    value={realDepositForm.data.description}
                                    onChange={(e) =>
                                        realDepositForm.setData('description', e.target.value)
                                    }
                                />
                            </div>
                            <DialogFooter className="gap-2 sm:gap-0">
                                <button
                                    type="button"
                                    onClick={() => setRealDepositModalOpen(false)}
                                    className="inline-flex h-10 items-center justify-center rounded-xl border border-slate-200 px-4 text-sm font-medium text-slate-700 dark:border-[#3a3a3a] dark:text-slate-200"
                                >
                                    Cancelar
                                </button>
                                <button
                                    type="submit"
                                    disabled={realDepositForm.processing}
                                    className="inline-flex h-10 items-center justify-center rounded-xl bg-blue-600 px-4 text-sm font-semibold text-white disabled:opacity-50"
                                >
                                    {realDepositForm.processing ? 'Guardando...' : 'Agregar dinero'}
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
                            {editingMovement?.type === 'payment' && (
                                <div>
                                    <Label className="mb-2 block text-xs text-slate-500">
                                        Forma de pago
                                    </Label>
                                    <select
                                        value={editForm.data.payment_method}
                                        onChange={(e) =>
                                            editForm.setData(
                                                'payment_method',
                                                e.target.value as 'cash' | 'transfer',
                                            )
                                        }
                                        className="h-10 w-full rounded-md border border-slate-200 bg-white px-3 text-sm dark:border-[#3a3a3a] dark:bg-[#1f1f1f]"
                                    >
                                        <option value="cash">Efectivo</option>
                                        <option value="transfer">Transferencia a tarjeta</option>
                                    </select>
                                </div>
                            )}
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
