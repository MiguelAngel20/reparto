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
import { cn } from '@/lib/utils';
import { type BreadcrumbItem } from '@/types';
import { Head, router, useForm, usePage } from '@inertiajs/react';
import { useSectionAccess } from '@/hooks/useSectionAccess';
import { Pencil, Plus, Scale } from 'lucide-react';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';

type BalanceDisplay = {
    label: string;
    tone: 'amber' | 'violet' | 'neutral';
    value: string;
};

type Movement = {
    id: number;
    type: string;
    type_label: string;
    editable: boolean;
    shows_resulting_balance: boolean;
    direction: 'company_owes' | 'user_owes' | null;
    amount_absolute: number | null;
    amount: number;
    amount_label: string;
    favor: 'user' | 'company' | 'neutral';
    signed_label: string;
    balance_after: number;
    balance_before?: number;
    balance_calculation_label?: string;
    balance_after_label: string;
    balance_after_summary: string;
    balance_after_tone: BalanceDisplay['tone'];
    balance_after_direction: 'company_owes' | 'user_owes' | null;
    balance_after_absolute: number | null;
    notes: string | null;
    display_date: string | null;
};

type PaginatedMovements = {
    data: Movement[];
    current_page: number;
    last_page: number;
    per_page: number;
    total: number;
    from: number | null;
    to: number | null;
};

interface CompanyBalanceIndexProps {
    companyName: string;
    balance: number;
    balanceDisplay: BalanceDisplay;
    movements: PaginatedMovements;
    perPageOptions: number[];
}

const PER_PAGE_OPTIONS = [5, 15, 25, 50] as const;

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Dashboard', href: '/dashboard' },
    { title: 'Cuenta empresa', href: '/cuenta-empresa' },
];

const cardClass =
    'border border-slate-200/80 bg-white p-4 shadow-sm dark:border-[#2b2b2b] dark:bg-[#262626] sm:p-5';

function toneClass(tone: BalanceDisplay['tone']): string {
    if (tone === 'amber') {
        return 'text-amber-600 dark:text-amber-400';
    }
    if (tone === 'violet') {
        return 'text-violet-600 dark:text-violet-400';
    }
    return 'text-slate-700 dark:text-slate-200';
}

function FavorBadge({
    label,
    favor,
}: {
    label: string;
    favor: Movement['favor'];
}) {
    if (favor === 'neutral') {
        return (
            <span className="inline-flex rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-600 dark:bg-[#333] dark:text-slate-300">
                {label}
            </span>
        );
    }

    const isUser = favor === 'user';

    return (
        <span
            className={cn(
                'inline-flex rounded-full px-2 py-0.5 text-[10px] font-semibold',
                isUser
                    ? 'bg-violet-100 text-violet-700 dark:bg-violet-900/40 dark:text-violet-300'
                    : 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300',
            )}
        >
            {label}
        </span>
    );
}

function amountToneClass(favor: Movement['favor']): string {
    if (favor === 'user') {
        return 'text-violet-600 dark:text-violet-400';
    }
    if (favor === 'company') {
        return 'text-amber-600 dark:text-amber-400';
    }
    return 'text-slate-600 dark:text-slate-300';
}

function BalanceAmountDisplay({
    tone,
    value,
    size = 'hero',
}: {
    tone: BalanceDisplay['tone'];
    value: string;
    size?: 'hero' | 'compact' | 'inline';
}) {
    if (tone === 'neutral') {
        const amountClass =
            size === 'hero'
                ? 'text-2xl font-bold tabular-nums sm:text-3xl'
                : size === 'compact'
                  ? 'text-lg font-bold tabular-nums'
                  : 'text-sm font-bold tabular-nums';
        const labelClass =
            size === 'hero'
                ? 'text-sm font-semibold sm:text-base'
                : size === 'compact'
                  ? 'text-xs font-semibold'
                  : 'text-[10px] font-semibold';

        return (
            <span className="inline-flex items-baseline gap-1.5">
                <span className={cn(amountClass, toneClass(tone))}>$0.00</span>
            </span>
        );
    }

    const valueClass =
        size === 'hero'
            ? 'text-2xl font-bold sm:text-3xl'
            : size === 'compact'
              ? 'text-lg font-bold'
              : 'text-sm font-semibold';

    return <span className={cn(valueClass, toneClass(tone))}>{value}</span>;
}

export default function CompanyBalanceIndex({
    companyName,
    balance,
    balanceDisplay,
    movements,
    perPageOptions = [...PER_PAGE_OPTIONS],
}: CompanyBalanceIndexProps) {
    const { canEdit } = useSectionAccess('company_balance');
    const page = usePage();
    const flash = page.props.flash as { success?: string; error?: string } | undefined;
    const [editingId, setEditingId] = useState<number | null>(null);
    const [editingType, setEditingType] = useState<'entry' | 'resulting_balance' | null>(null);
    const [adjustModalOpen, setAdjustModalOpen] = useState(false);
    const [registerModalOpen, setRegisterModalOpen] = useState(false);

    const entryForm = useForm({
        direction: 'company_owes' as 'company_owes' | 'user_owes',
        amount: '',
        notes: '',
    });

    const adjustForm = useForm({
        direction: 'user_owes' as 'company_owes' | 'user_owes',
        amount: '',
        notes: '',
    });

    const liquidateForm = useForm({
        notes: '',
    });

    const hasBalance = Math.abs(balance) >= 0.01;
    const isBalanced = !hasBalance;

    const openRegisterModal = () => {
        cancelEditing();
        closeAdjustModal();
        entryForm.reset();
        entryForm.clearErrors();
        setRegisterModalOpen(true);
    };

    const closeRegisterModal = () => {
        setRegisterModalOpen(false);
        entryForm.reset();
        entryForm.clearErrors();
    };

    const closeEditModal = () => {
        setEditingId(null);
        setEditingType(null);
        entryForm.reset();
        entryForm.clearErrors();
    };

    useEffect(() => {
        if (flash?.success) toast.success(flash.success);
        if (flash?.error) toast.error(flash.error);
    }, [flash?.success, flash?.error]);

    const submitEntry = (e: React.FormEvent) => {
        e.preventDefault();

        if (editingId) {
            const endpoint =
                editingType === 'resulting_balance'
                    ? `/cuenta-empresa/movimientos/${editingId}/saldo-resultante`
                    : `/cuenta-empresa/movimientos/${editingId}`;

            entryForm.put(endpoint, {
                preserveScroll: true,
                onSuccess: () => closeEditModal(),
            });
            return;
        }

        entryForm.post('/cuenta-empresa/saldo', {
            preserveScroll: true,
            onSuccess: () => closeRegisterModal(),
        });
    };

    const startEditing = (movement: Movement) => {
        setAdjustModalOpen(false);
        setRegisterModalOpen(false);
        setEditingId(movement.id);

        if (movement.type === 'session_settlement') {
            setEditingType('resulting_balance');
            entryForm.setData({
                direction: movement.balance_after_direction ?? 'user_owes',
                amount:
                    movement.balance_after_absolute !== null
                        ? String(movement.balance_after_absolute)
                        : '',
                notes: movement.notes ?? '',
            });
        } else {
            setEditingType('entry');
            entryForm.setData({
                direction: movement.direction ?? 'user_owes',
                amount:
                    movement.amount_absolute !== null
                        ? String(movement.amount_absolute)
                        : '',
                notes: movement.notes ?? '',
            });
        }

        entryForm.clearErrors();
    };

    const cancelEditing = () => {
        closeEditModal();
    };

    const openAdjustModal = () => {
        cancelEditing();
        closeRegisterModal();
        const direction = balance < -0.01 ? 'company_owes' : 'user_owes';
        const amount = Math.abs(balance) >= 0.01 ? String(Math.abs(balance)) : '';

        adjustForm.setData({
            direction,
            amount,
            notes: '',
        });
        adjustForm.clearErrors();
        setAdjustModalOpen(true);
    };

    const closeAdjustModal = () => {
        setAdjustModalOpen(false);
        adjustForm.reset();
        adjustForm.clearErrors();
    };

    const submitAdjust = (e: React.FormEvent) => {
        e.preventDefault();
        adjustForm.post('/cuenta-empresa/ajustar', {
            preserveScroll: true,
            onSuccess: () => closeAdjustModal(),
        });
    };

    const submitLiquidation = async () => {
        const confirmed = await confirmAction({
            title: '¿Liquidar cuenta?',
            text: hasBalance
                ? `El saldo actual (${balanceDisplay.label}: ${balanceDisplay.value}) volverá a cero.`
                : undefined,
            confirmText: 'Sí, liquidar',
            icon: 'warning',
        });

        if (!confirmed) return;

        liquidateForm.post('/cuenta-empresa/liquidar', { preserveScroll: true });
    };

    const visitMovements = (params: { page?: number; per_page?: number }) => {
        router.get(
            '/cuenta-empresa',
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
        <AppLayout breadcrumbs={breadcrumbs} title="Cuenta empresa">
            <Head title="Cuenta empresa" />

            <div className="flex w-full flex-col gap-4">
                <Card className={cardClass}>
                    <div className="flex items-start gap-3">
                        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-sidebar-active/10 text-sidebar-active">
                            <Scale className="h-5 w-5" />
                        </div>
                        <div className="min-w-0 flex-1">
                            <p className="text-sm text-slate-500">Saldo acumulado con {companyName}</p>
                            <p className="mt-1">
                                <BalanceAmountDisplay
                                    tone={balanceDisplay.tone}
                                    value={balanceDisplay.value}
                                    size="hero"
                                />
                            </p>
                            <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
                                {balanceDisplay.label}
                            </p>
                        </div>
                    </div>

                    {canEdit && (
                    <div className="mt-4 flex flex-wrap gap-2">
                        {hasBalance && (
                            <>
                                <button
                                    type="button"
                                    onClick={openAdjustModal}
                                    className="inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-sidebar-active bg-sidebar-active/5 px-4 text-sm font-semibold text-sidebar-active hover:bg-sidebar-active/10 sm:px-6"
                                >
                                    <Pencil className="h-4 w-4" />
                                    Ajustar saldo final
                                </button>
                                <button
                                    type="button"
                                    onClick={submitLiquidation}
                                    disabled={liquidateForm.processing}
                                    className="inline-flex h-10 items-center justify-center rounded-xl border-2 border-sidebar-active px-4 text-sm font-semibold text-sidebar-active hover:bg-sidebar-active/10 disabled:opacity-50 sm:px-6"
                                >
                                    {liquidateForm.processing ? 'Liquidando...' : 'Liquidar cuenta'}
                                </button>
                            </>
                        )}
                        {isBalanced && (
                            <button
                                type="button"
                                onClick={openRegisterModal}
                                className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-sidebar-active px-4 text-sm font-semibold text-white hover:opacity-90 sm:px-6"
                            >
                                <Plus className="h-4 w-4" />
                                Registrar nuevo saldo
                            </button>
                        )}
                    </div>
                    )}
                </Card>

                {canEdit && (
                    <Dialog
                        open={adjustModalOpen}
                        onOpenChange={(open) => {
                            if (!open) closeAdjustModal();
                        }}
                    >
                        <DialogContent className="sm:max-w-md">
                            <DialogHeader>
                                <DialogTitle>Ajustar saldo final con {companyName}</DialogTitle>
                                <DialogDescription>
                                    Indica el saldo correcto según el cuadre de la empresa (por
                                    redondeos u otros detalles). Sistema actual:{' '}
                                    <BalanceAmountDisplay
                                        tone={balanceDisplay.tone}
                                        value={balanceDisplay.value}
                                        size="inline"
                                    />
                                    .
                                </DialogDescription>
                            </DialogHeader>
                            <form onSubmit={submitAdjust} noValidate className="space-y-4">
                                <p className="text-xs text-slate-500">
                                    El saldo correcto ahora debe ser:
                                </p>
                                <div className="grid gap-2 sm:grid-cols-2">
                                    <button
                                        type="button"
                                        onClick={() =>
                                            adjustForm.setData('direction', 'company_owes')
                                        }
                                        className={cn(
                                            'rounded-xl border px-3 py-3 text-left text-sm transition-colors',
                                            adjustForm.data.direction === 'company_owes'
                                                ? 'border-sidebar-active bg-sidebar-active/10 text-sidebar-active'
                                                : 'border-slate-200 dark:border-[#3a3a3a]',
                                        )}
                                    >
                                        <span className="block font-semibold">
                                            {companyName} me debe
                                        </span>
                                        <span className="mt-1 block text-xs opacity-80">
                                            A tu favor
                                        </span>
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => adjustForm.setData('direction', 'user_owes')}
                                        className={cn(
                                            'rounded-xl border px-3 py-3 text-left text-sm transition-colors',
                                            adjustForm.data.direction === 'user_owes'
                                                ? 'border-sidebar-active bg-sidebar-active/10 text-sidebar-active'
                                                : 'border-slate-200 dark:border-[#3a3a3a]',
                                        )}
                                    >
                                        <span className="block font-semibold">
                                            Yo le debo a {companyName}
                                        </span>
                                        <span className="mt-1 block text-xs opacity-80">
                                            A favor de la empresa
                                        </span>
                                    </button>
                                </div>
                                <div>
                                    <Label
                                        htmlFor="adjust_amount"
                                        className="mb-1 block text-xs text-slate-500"
                                    >
                                        Saldo correcto ($)
                                    </Label>
                                    <Input
                                        id="adjust_amount"
                                        type="number"
                                        min={0.01}
                                        step="0.01"
                                        value={adjustForm.data.amount}
                                        onChange={(e) =>
                                            adjustForm.setData('amount', e.target.value)
                                        }
                                        className={cn(
                                            adjustForm.errors.amount && 'border-rose-500',
                                        )}
                                    />
                                    {adjustForm.errors.amount && (
                                        <p className="mt-1 text-xs text-rose-600">
                                            {adjustForm.errors.amount}
                                        </p>
                                    )}
                                </div>
                                <div>
                                    <Label
                                        htmlFor="adjust_notes"
                                        className="mb-1 block text-xs text-slate-500"
                                    >
                                        Motivo (opcional)
                                    </Label>
                                    <Input
                                        id="adjust_notes"
                                        value={adjustForm.data.notes}
                                        onChange={(e) =>
                                            adjustForm.setData('notes', e.target.value)
                                        }
                                        placeholder="Ej. Redondeo de centavos con Clikio"
                                    />
                                </div>
                                <DialogFooter className="gap-2 sm:gap-0">
                                    <button
                                        type="button"
                                        onClick={closeAdjustModal}
                                        className="inline-flex h-10 items-center justify-center rounded-xl border border-slate-200 px-4 text-sm font-medium text-slate-700 hover:bg-slate-50 dark:border-[#3a3a3a] dark:text-slate-200 dark:hover:bg-[#2a2a2a]"
                                    >
                                        Cancelar
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={adjustForm.processing}
                                        className="inline-flex h-10 items-center justify-center rounded-xl bg-sidebar-active px-4 text-sm font-semibold text-white disabled:opacity-50"
                                    >
                                        {adjustForm.processing ? 'Guardando...' : 'Guardar ajuste'}
                                    </button>
                                </DialogFooter>
                            </form>
                        </DialogContent>
                    </Dialog>
                )}

                <Card className={cardClass}>
                    <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                        <h2 className="text-base font-semibold text-slate-900 dark:text-white">
                            Historial de movimientos
                        </h2>
                        {movements.total > 0 && (
                            <p className="text-xs text-slate-500">
                                {movements.total} movimiento{movements.total !== 1 ? 's' : ''}
                            </p>
                        )}
                    </div>

                    {movements.data.length === 0 ? (
                        <p className="mt-4 rounded-xl border border-dashed border-slate-200 py-8 text-center text-sm text-slate-500 dark:border-[#3a3a3a]">
                            Aún no hay movimientos. El saldo inicia en cero.
                        </p>
                    ) : (
                        <ul className="mt-4 space-y-2">
                            {movements.data.map((movement) => (
                                <li
                                    key={movement.id}
                                    className="rounded-xl border border-slate-200 bg-slate-50/50 p-3 dark:border-[#3a3a3a] dark:bg-[#1f1f1f]/50"
                                >
                                    <div className="flex items-start justify-between gap-3">
                                        <div className="min-w-0 flex-1">
                                            <div className="flex flex-wrap items-center gap-2">
                                                <p className="text-sm font-semibold text-slate-900 dark:text-white">
                                                    {movement.type_label}
                                                </p>
                                                {movement.type === 'session_settlement' && (
                                                    <FavorBadge
                                                        label={movement.signed_label}
                                                        favor={movement.favor}
                                                    />
                                                )}
                                            </div>
                                            <p className="mt-0.5 text-xs text-slate-500">
                                                {movement.display_date}
                                            </p>
                                            {movement.type !== 'session_settlement' && (
                                                <p
                                                    className={cn(
                                                        'mt-2 text-sm font-semibold tabular-nums',
                                                        amountToneClass(movement.favor),
                                                    )}
                                                >
                                                    {movement.amount_label}
                                                </p>
                                            )}
                                            {movement.type === 'session_settlement' && (
                                                <p
                                                    className={cn(
                                                        'mt-2 text-sm font-semibold tabular-nums',
                                                        amountToneClass(movement.favor),
                                                    )}
                                                >
                                                    {movement.favor === 'user' &&
                                                        `${companyName} te debe ${movement.amount_label}`}
                                                    {movement.favor === 'company' &&
                                                        `Le debes ${movement.amount_label} a ${companyName}`}
                                                    {movement.favor === 'neutral' && movement.amount_label}
                                                </p>
                                            )}
                                            {movement.type !== 'session_settlement' && (
                                                <div className="mt-1">
                                                    <FavorBadge
                                                        label={movement.signed_label}
                                                        favor={movement.favor}
                                                    />
                                                </div>
                                            )}
                                            {movement.notes && (
                                                <p className="mt-1 text-xs text-slate-600 dark:text-slate-300">
                                                    {movement.notes}
                                                </p>
                                            )}
                                            {movement.shows_resulting_balance && (
                                                <div className="mt-3 rounded-lg border border-slate-200 bg-white px-3 py-2 dark:border-[#3a3a3a] dark:bg-[#262626]">
                                                    <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">
                                                        Saldo resultante
                                                    </p>
                                                    <p className="mt-0.5">
                                                        <BalanceAmountDisplay
                                                            tone={movement.balance_after_tone}
                                                            value={movement.balance_after_label}
                                                            size="compact"
                                                        />
                                                    </p>
                                                    {movement.balance_calculation_label && (
                                                        <p className="mt-1 font-mono text-xs tabular-nums text-slate-600 dark:text-slate-300">
                                                            {movement.balance_calculation_label}
                                                        </p>
                                                    )}
                                                    <p className="mt-0.5 text-xs text-slate-500">
                                                        {movement.balance_after_summary}
                                                    </p>
                                                </div>
                                            )}
                                        </div>
                                        <div className="flex shrink-0 items-start gap-2">
                                            {!movement.shows_resulting_balance && (
                                                <div className="text-right">
                                                    <p className="mt-1 text-xs font-medium text-slate-700 dark:text-slate-200">
                                                        Saldo:{' '}
                                                        <BalanceAmountDisplay
                                                            tone={movement.balance_after_tone}
                                                            value={movement.balance_after_label}
                                                            size="inline"
                                                        />
                                                    </p>
                                                </div>
                                            )}
                                            {movement.editable && canEdit && (
                                                <button
                                                    type="button"
                                                    onClick={() => startEditing(movement)}
                                                    className={cn(
                                                        'rounded p-1.5 text-slate-500 hover:bg-slate-100 dark:hover:bg-[#333]',
                                                        editingId === movement.id &&
                                                            'bg-sidebar-active/10 text-sidebar-active',
                                                    )}
                                                    title={
                                                        movement.type === 'session_settlement'
                                                            ? 'Corregir saldo resultante'
                                                            : 'Editar saldo'
                                                    }
                                                >
                                                    <Pencil className="h-4 w-4" />
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                </li>
                            ))}
                        </ul>
                    )}

                    {movements.total > 0 && (
                        <div className="mt-4 flex flex-col gap-3 border-t border-slate-200 pt-4 dark:border-[#3a3a3a] sm:flex-row sm:items-center sm:justify-between">
                            <div className="flex flex-wrap items-center gap-2 text-sm text-slate-500">
                                <label htmlFor="movements-per-page" className="shrink-0">
                                    Mostrar
                                </label>
                                <select
                                    id="movements-per-page"
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

                {canEdit && (
                    <Dialog
                        open={registerModalOpen}
                        onOpenChange={(open) => {
                            if (!open) closeRegisterModal();
                        }}
                    >
                        <DialogContent className="sm:max-w-md">
                            <DialogHeader>
                                <DialogTitle>Registrar nuevo saldo</DialogTitle>
                                <DialogDescription>
                                    Usa esto cuando traes dinero de la empresa o cuando {companyName}{' '}
                                    ya te debe dinero antes de cerrar jornadas. Solo disponible con
                                    saldo en cero.
                                </DialogDescription>
                            </DialogHeader>
                            <form onSubmit={submitEntry} noValidate className="space-y-4">
                                <div className="grid gap-2 sm:grid-cols-2">
                                    <button
                                        type="button"
                                        onClick={() =>
                                            entryForm.setData('direction', 'company_owes')
                                        }
                                        className={cn(
                                            'rounded-xl border px-3 py-3 text-left text-sm transition-colors',
                                            entryForm.data.direction === 'company_owes'
                                                ? 'border-sidebar-active bg-sidebar-active/10 text-sidebar-active'
                                                : 'border-slate-200 dark:border-[#3a3a3a]',
                                        )}
                                    >
                                        <span className="block font-semibold">
                                            {companyName} me debe
                                        </span>
                                        <span className="mt-1 block text-xs opacity-80">
                                            A tu favor
                                        </span>
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => entryForm.setData('direction', 'user_owes')}
                                        className={cn(
                                            'rounded-xl border px-3 py-3 text-left text-sm transition-colors',
                                            entryForm.data.direction === 'user_owes'
                                                ? 'border-sidebar-active bg-sidebar-active/10 text-sidebar-active'
                                                : 'border-slate-200 dark:border-[#3a3a3a]',
                                        )}
                                    >
                                        <span className="block font-semibold">
                                            Yo le debo a {companyName}
                                        </span>
                                        <span className="mt-1 block text-xs opacity-80">
                                            A favor de la empresa
                                        </span>
                                    </button>
                                </div>
                                <div>
                                    <Label
                                        htmlFor="register_amount"
                                        className="mb-1 block text-xs text-slate-500"
                                    >
                                        Monto ($)
                                    </Label>
                                    <Input
                                        id="register_amount"
                                        type="number"
                                        min={0.01}
                                        step="0.01"
                                        value={entryForm.data.amount}
                                        onChange={(e) =>
                                            entryForm.setData('amount', e.target.value)
                                        }
                                        placeholder="0.00"
                                        className={cn(
                                            entryForm.errors.amount && 'border-rose-500',
                                        )}
                                    />
                                    {entryForm.errors.amount && (
                                        <p className="mt-1 text-xs text-rose-600">
                                            {entryForm.errors.amount}
                                        </p>
                                    )}
                                </div>
                                <div>
                                    <Label
                                        htmlFor="register_notes"
                                        className="mb-1 block text-xs text-slate-500"
                                    >
                                        Nota (opcional)
                                    </Label>
                                    <Input
                                        id="register_notes"
                                        value={entryForm.data.notes}
                                        onChange={(e) =>
                                            entryForm.setData('notes', e.target.value)
                                        }
                                        placeholder="Ej. Efectivo que traigo de la empresa"
                                    />
                                </div>
                                <DialogFooter className="gap-2 sm:gap-0">
                                    <button
                                        type="button"
                                        onClick={closeRegisterModal}
                                        className="inline-flex h-10 items-center justify-center rounded-xl border border-slate-200 px-4 text-sm font-medium text-slate-700 hover:bg-slate-50 dark:border-[#3a3a3a] dark:text-slate-200 dark:hover:bg-[#2a2a2a]"
                                    >
                                        Cancelar
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={entryForm.processing}
                                        className="inline-flex h-10 items-center justify-center rounded-xl bg-sidebar-active px-4 text-sm font-semibold text-white disabled:opacity-50"
                                    >
                                        {entryForm.processing ? 'Guardando...' : 'Registrar saldo'}
                                    </button>
                                </DialogFooter>
                            </form>
                        </DialogContent>
                    </Dialog>
                )}

                {canEdit && (
                    <Dialog
                        open={editingId !== null}
                        onOpenChange={(open) => {
                            if (!open) cancelEditing();
                        }}
                    >
                        <DialogContent className="sm:max-w-md">
                            <DialogHeader>
                                <DialogTitle>
                                    {editingType === 'resulting_balance'
                                        ? 'Corregir saldo después de la jornada'
                                        : 'Editar saldo registrado'}
                                </DialogTitle>
                                <DialogDescription>
                                    {editingType === 'resulting_balance'
                                        ? 'Indica el saldo correcto que debía quedar tras esta jornada. Los movimientos posteriores se recalculan automáticamente.'
                                        : 'Al guardar, el saldo se recalcula con todas las jornadas cerradas después de este registro.'}
                                </DialogDescription>
                            </DialogHeader>
                            <form onSubmit={submitEntry} noValidate className="space-y-4">
                                <div className="grid gap-2 sm:grid-cols-2">
                                    <button
                                        type="button"
                                        onClick={() =>
                                            entryForm.setData('direction', 'company_owes')
                                        }
                                        className={cn(
                                            'rounded-xl border px-3 py-3 text-left text-sm transition-colors',
                                            entryForm.data.direction === 'company_owes'
                                                ? 'border-sidebar-active bg-sidebar-active/10 text-sidebar-active'
                                                : 'border-slate-200 dark:border-[#3a3a3a]',
                                        )}
                                    >
                                        <span className="block font-semibold">
                                            {companyName} me debe
                                        </span>
                                        <span className="mt-1 block text-xs opacity-80">
                                            A tu favor
                                        </span>
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => entryForm.setData('direction', 'user_owes')}
                                        className={cn(
                                            'rounded-xl border px-3 py-3 text-left text-sm transition-colors',
                                            entryForm.data.direction === 'user_owes'
                                                ? 'border-sidebar-active bg-sidebar-active/10 text-sidebar-active'
                                                : 'border-slate-200 dark:border-[#3a3a3a]',
                                        )}
                                    >
                                        <span className="block font-semibold">
                                            Yo le debo a {companyName}
                                        </span>
                                        <span className="mt-1 block text-xs opacity-80">
                                            A favor de la empresa
                                        </span>
                                    </button>
                                </div>
                                <div>
                                    <Label
                                        htmlFor="edit_amount"
                                        className="mb-1 block text-xs text-slate-500"
                                    >
                                        {editingType === 'resulting_balance'
                                            ? 'Saldo correcto después de esta jornada ($)'
                                            : 'Monto ($)'}
                                    </Label>
                                    <Input
                                        id="edit_amount"
                                        type="number"
                                        min={editingType === 'resulting_balance' ? 0 : 0.01}
                                        step="0.01"
                                        value={entryForm.data.amount}
                                        onChange={(e) =>
                                            entryForm.setData('amount', e.target.value)
                                        }
                                        placeholder="0.00"
                                        className={cn(
                                            entryForm.errors.amount && 'border-rose-500',
                                        )}
                                    />
                                    {entryForm.errors.amount && (
                                        <p className="mt-1 text-xs text-rose-600">
                                            {entryForm.errors.amount}
                                        </p>
                                    )}
                                </div>
                                <div>
                                    <Label
                                        htmlFor="edit_notes"
                                        className="mb-1 block text-xs text-slate-500"
                                    >
                                        {editingType === 'resulting_balance'
                                            ? 'Motivo (opcional)'
                                            : 'Nota (opcional)'}
                                    </Label>
                                    <Input
                                        id="edit_notes"
                                        value={entryForm.data.notes}
                                        onChange={(e) =>
                                            entryForm.setData('notes', e.target.value)
                                        }
                                        placeholder={
                                            editingType === 'resulting_balance'
                                                ? 'Ej. Redondeo con Clikio'
                                                : 'Ej. Efectivo que traigo de la empresa'
                                        }
                                    />
                                </div>
                                <DialogFooter className="gap-2 sm:gap-0">
                                    <button
                                        type="button"
                                        onClick={cancelEditing}
                                        className="inline-flex h-10 items-center justify-center rounded-xl border border-slate-200 px-4 text-sm font-medium text-slate-700 hover:bg-slate-50 dark:border-[#3a3a3a] dark:text-slate-200 dark:hover:bg-[#2a2a2a]"
                                    >
                                        Cancelar
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={entryForm.processing}
                                        className="inline-flex h-10 items-center justify-center rounded-xl bg-sidebar-active px-4 text-sm font-semibold text-white disabled:opacity-50"
                                    >
                                        {entryForm.processing ? 'Guardando...' : 'Guardar cambios'}
                                    </button>
                                </DialogFooter>
                            </form>
                        </DialogContent>
                    </Dialog>
                )}
            </div>
        </AppLayout>
    );
}
