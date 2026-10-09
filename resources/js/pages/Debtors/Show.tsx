import AppLayout from '@/layouts/app-layout';
import { Card, Pagination } from '@/components/ui';
import {
    Dialog,
    DialogContent,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useSectionAccess } from '@/hooks/useSectionAccess';
import { confirmAction } from '@/lib/sweetalert';
import { cn, formatCurrency, localDateInputValue } from '@/lib/utils';
import { type BreadcrumbItem } from '@/types';
import { Head, Link, router, useForm, usePage } from '@inertiajs/react';
import { CheckCircle2, HandCoins, Pencil, Plus, Trash2, TrendingDown, TrendingUp } from 'lucide-react';
import { Fragment, useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';

type MovementRow = {
    id: number;
    type: 'debt' | 'payment' | 'settlement';
    type_label: string;
    name: string;
    amount: number;
    amount_label: string;
    movement_date: string;
    movement_date_formatted: string | null;
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

interface DebtorsShowProps {
    debtor: {
        id: number;
        name: string;
        opened_at: string | null;
    };
    balance: number;
    totalDebts: number;
    totalPayments: number;
    movements: PaginatedMovements;
    perPageOptions: number[];
}

const breadcrumbs = (id: number): BreadcrumbItem[] => [
    { title: 'Dashboard', href: '/dashboard' },
    { title: 'Quién te debe', href: '/quien-te-debe' },
    { title: 'Detalle', href: `/quien-te-debe/${id}` },
];

const cardClass =
    'border border-slate-200/80 bg-white p-4 shadow-sm dark:border-[#2b2b2b] dark:bg-[#262626] sm:p-5';

type MovementDateGroup = {
    dateKey: string;
    label: string;
    movements: MovementRow[];
};

function formatMovementDateGroupLabel(dateKey: string, formatted: string | null): string {
    const today = localDateInputValue();
    const yesterdayDate = new Date();
    yesterdayDate.setDate(yesterdayDate.getDate() - 1);
    const yesterday = localDateInputValue(yesterdayDate);

    if (dateKey === today) return `Hoy · ${formatted ?? dateKey}`;
    if (dateKey === yesterday) return `Ayer · ${formatted ?? dateKey}`;
    return formatted ?? dateKey;
}

function groupMovementsByDate(movements: MovementRow[]): MovementDateGroup[] {
    const groups: MovementDateGroup[] = [];

    for (const movement of movements) {
        const lastGroup = groups[groups.length - 1];
        if (lastGroup && lastGroup.dateKey === movement.movement_date) {
            lastGroup.movements.push(movement);
            continue;
        }

        groups.push({
            dateKey: movement.movement_date,
            label: formatMovementDateGroupLabel(
                movement.movement_date,
                movement.movement_date_formatted,
            ),
            movements: [movement],
        });
    }

    return groups;
}

function FieldError({ message }: { message?: string }) {
    if (!message) return null;
    return <p className="mt-1 text-xs text-rose-600">{message}</p>;
}

function CycleSeparator({
    type,
    date,
}: {
    type: 'settled' | 'cycle_start';
    date?: string | null;
}) {
    if (type === 'settled') {
        return (
            <div className="flex items-center gap-3 py-1">
                <div className="h-px flex-1 bg-emerald-300 dark:bg-emerald-800" />
                <span className="shrink-0 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-[10px] font-semibold uppercase tracking-wide text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-300">
                    Al corriente — ya no te debe
                </span>
                <div className="h-px flex-1 bg-emerald-300 dark:bg-emerald-800" />
            </div>
        );
    }

    return (
        <div className="flex items-center gap-3 py-1">
            <div className="h-px flex-1 bg-amber-300 dark:bg-amber-800" />
            <span className="shrink-0 rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-[10px] font-semibold uppercase tracking-wide text-amber-800 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-300">
                Inicio de deuda{date ? ` · ${date}` : ''}
            </span>
            <div className="h-px flex-1 bg-amber-300 dark:bg-amber-800" />
        </div>
    );
}

function amountClass(type: MovementRow['type']): string {
    return type === 'debt'
        ? 'text-rose-600 dark:text-rose-400'
        : 'text-emerald-600 dark:text-emerald-400';
}

export default function DebtorsShow({
    debtor,
    balance,
    totalDebts,
    totalPayments,
    movements,
    perPageOptions,
}: DebtorsShowProps) {
    const { canEdit } = useSectionAccess('debtors');
    const page = usePage();
    const flash = page.props.flash as { success?: string; error?: string } | undefined;
    const settled = balance < 0.01;

    const [debtOpen, setDebtOpen] = useState(false);
    const [paymentOpen, setPaymentOpen] = useState(false);
    const [settleOpen, setSettleOpen] = useState(false);
    const [renameOpen, setRenameOpen] = useState(false);
    const [editing, setEditing] = useState<MovementRow | null>(null);

    const debtForm = useForm({
        movement_date: localDateInputValue(),
        name: '',
        amount: '',
    });
    const paymentForm = useForm({
        movement_date: localDateInputValue(),
        name: '',
        amount: '',
    });
    const settleForm = useForm({
        movement_date: localDateInputValue(),
        name: 'Liquidación',
    });
    const renameForm = useForm({ name: debtor.name });
    const editForm = useForm({
        movement_date: '',
        name: '',
        amount: '',
    });

    useEffect(() => {
        if (flash?.success) toast.success(flash.success);
        if (flash?.error) toast.error(flash.error);
    }, [flash?.success, flash?.error]);

    const groups = useMemo(() => groupMovementsByDate(movements.data), [movements.data]);

    const visit = (params: { page?: number; per_page?: number }) => {
        router.get(
            `/quien-te-debe/${debtor.id}`,
            {
                page: params.page ?? movements.current_page,
                per_page: params.per_page ?? movements.per_page,
            },
            { preserveState: true, preserveScroll: true, replace: true },
        );
    };

    const openEdit = (movement: MovementRow) => {
        setEditing(movement);
        editForm.setData({
            movement_date: movement.movement_date,
            name: movement.name,
            amount: String(movement.amount),
        });
        editForm.clearErrors();
    };

    const deleteMovement = async (movement: MovementRow) => {
        const ok = await confirmAction({
            title: 'Eliminar registro',
            text: `Se eliminará «${movement.name}».`,
            confirmText: 'Eliminar',
            icon: 'warning',
        });
        if (!ok) return;
        router.delete(`/quien-te-debe/${debtor.id}/movimientos/${movement.id}`, {
            preserveScroll: true,
        });
    };

    const deleteDebtor = async () => {
        const ok = await confirmAction({
            title: 'Eliminar deudor',
            text: `Se eliminará «${debtor.name}» y todos sus movimientos.`,
            confirmText: 'Eliminar',
            icon: 'warning',
        });
        if (!ok) return;
        router.delete(`/quien-te-debe/${debtor.id}`);
    };

    const markers = (movement: MovementRow) => (
        <>
            {movement.marker_after === 'cycle_start' && (
                <CycleSeparator type="cycle_start" date={movement.cycle_start_date_formatted} />
            )}
            {movement.marker_after === 'settled' && <CycleSeparator type="settled" />}
        </>
    );

    const actions = (movement: MovementRow) =>
        canEdit ? (
            <div className="flex justify-end gap-1">
                <button
                    type="button"
                    onClick={() => openEdit(movement)}
                    className="rounded p-1.5 text-slate-500 hover:bg-slate-100 dark:hover:bg-[#333]"
                    title="Editar"
                >
                    <Pencil className="h-4 w-4" />
                </button>
                <button
                    type="button"
                    onClick={() => deleteMovement(movement)}
                    className="rounded p-1.5 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/30"
                    title="Eliminar"
                >
                    <Trash2 className="h-4 w-4" />
                </button>
            </div>
        ) : null;

    return (
        <AppLayout breadcrumbs={breadcrumbs(debtor.id)} title={debtor.name}>
            <Head title={debtor.name} />

            <Link
                href="/quien-te-debe"
                className="mb-3 inline-block text-sm text-slate-600 dark:text-slate-400"
            >
                ← Deudores
            </Link>

            <div className="flex w-full flex-col gap-4">
                <Card className={cardClass}>
                    <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                            <div className="flex items-center gap-2">
                                <h2 className="truncate text-lg font-semibold text-slate-900 dark:text-white">
                                    {debtor.name}
                                </h2>
                                {canEdit && (
                                    <button
                                        type="button"
                                        onClick={() => {
                                            renameForm.setData('name', debtor.name);
                                            setRenameOpen(true);
                                        }}
                                        className="rounded p-1 text-slate-400 hover:bg-slate-100 dark:hover:bg-[#333]"
                                        title="Editar nombre"
                                    >
                                        <Pencil className="h-4 w-4" />
                                    </button>
                                )}
                            </div>
                            {debtor.opened_at && (
                                <p className="mt-0.5 text-xs text-slate-500">
                                    Desde {debtor.opened_at}
                                </p>
                            )}
                            <p className="mt-3 text-xs font-medium uppercase tracking-wide text-slate-500">
                                Te debe
                            </p>
                            <p
                                className={cn(
                                    'font-mono text-3xl font-bold tabular-nums',
                                    settled
                                        ? 'text-emerald-600 dark:text-emerald-400'
                                        : 'text-amber-700 dark:text-amber-400',
                                )}
                            >
                                ${formatCurrency(balance)}
                            </p>
                            {settled && (
                                <p className="mt-2 inline-flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-300">
                                    <CheckCircle2 className="h-3.5 w-3.5" />
                                    Al corriente
                                </p>
                            )}
                        </div>
                        {canEdit && (
                            <button
                                type="button"
                                onClick={deleteDebtor}
                                className="inline-flex h-9 shrink-0 items-center gap-1.5 rounded-lg border border-rose-200 px-3 text-xs font-semibold text-rose-600 hover:bg-rose-50 dark:border-rose-900 dark:text-rose-400 dark:hover:bg-rose-950/30"
                            >
                                <Trash2 className="h-3.5 w-3.5" />
                                Eliminar
                            </button>
                        )}
                    </div>

                    <div className="mt-4 grid gap-3 sm:grid-cols-2">
                        <div className="rounded-xl bg-rose-50 px-3 py-3 dark:bg-rose-950/30">
                            <div className="flex items-center gap-1.5 text-[10px] font-semibold uppercase text-rose-700 dark:text-rose-400">
                                <TrendingDown className="h-3.5 w-3.5" />
                                Deudas
                            </div>
                            <p className="mt-1 text-xl font-bold text-rose-600 dark:text-rose-400">
                                ${formatCurrency(totalDebts)}
                            </p>
                        </div>
                        <div className="rounded-xl bg-emerald-50 px-3 py-3 dark:bg-emerald-950/30">
                            <div className="flex items-center gap-1.5 text-[10px] font-semibold uppercase text-emerald-700 dark:text-emerald-400">
                                <TrendingUp className="h-3.5 w-3.5" />
                                Abonos y liquidaciones
                            </div>
                            <p className="mt-1 text-xl font-bold text-emerald-600 dark:text-emerald-400">
                                ${formatCurrency(totalPayments)}
                            </p>
                        </div>
                    </div>

                    {canEdit && (
                        <div className="mt-4 flex flex-wrap gap-2">
                            <button
                                type="button"
                                onClick={() => setDebtOpen(true)}
                                className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-sidebar-active px-4 text-sm font-semibold text-white hover:opacity-90"
                            >
                                <Plus className="h-4 w-4" />
                                Agregar
                            </button>
                            <button
                                type="button"
                                onClick={() => setPaymentOpen(true)}
                                disabled={settled}
                                className="inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 text-sm font-semibold text-emerald-700 hover:bg-emerald-100 disabled:opacity-50 dark:border-emerald-900 dark:bg-emerald-950/30 dark:text-emerald-400"
                            >
                                <HandCoins className="h-4 w-4" />
                                Abonar
                            </button>
                            <button
                                type="button"
                                onClick={() => setSettleOpen(true)}
                                disabled={settled}
                                className="inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-slate-200 px-4 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50 dark:border-[#3a3a3a] dark:text-slate-200 dark:hover:bg-[#2a2a2a]"
                            >
                                <CheckCircle2 className="h-4 w-4" />
                                Liquidar
                            </button>
                        </div>
                    )}
                </Card>

                <Card className={cardClass}>
                    <h3 className="text-base font-semibold text-slate-900 dark:text-white">
                        Movimientos
                    </h3>

                    {movements.data.length === 0 ? (
                        <p className="mt-4 rounded-xl border border-dashed border-slate-200 py-8 text-center text-sm text-slate-500 dark:border-[#3a3a3a]">
                            Aún no hay movimientos.
                        </p>
                    ) : (
                        <>
                            <div className="mt-4 hidden overflow-x-auto rounded-xl border border-slate-200 dark:border-[#3a3a3a] xl:block">
                                <table className="w-full min-w-[640px] text-left text-sm">
                                    <thead>
                                        <tr className="border-b border-slate-200 bg-slate-50 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:border-[#3a3a3a] dark:bg-[#1f1f1f]">
                                            <th className="px-4 py-3">Tipo</th>
                                            <th className="px-4 py-3">Nombre</th>
                                            <th className="px-4 py-3 text-right">Monto</th>
                                            {canEdit && <th className="px-4 py-3 text-right">Acciones</th>}
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {groups.map((group) => (
                                            <Fragment key={group.dateKey}>
                                                <tr>
                                                    <td
                                                        colSpan={canEdit ? 4 : 3}
                                                        className="bg-slate-50/80 px-4 py-2 text-xs font-semibold text-slate-700 dark:bg-[#1f1f1f] dark:text-slate-200"
                                                    >
                                                        {group.label}
                                                    </td>
                                                </tr>
                                                {group.movements.map((movement) => (
                                                    <Fragment key={movement.id}>
                                                        <tr className="border-t border-slate-100 dark:border-[#333]">
                                                            <td className="px-4 py-3 font-medium text-slate-800 dark:text-slate-100">
                                                                {movement.type_label}
                                                            </td>
                                                            <td className="px-4 py-3 text-slate-700 dark:text-slate-300">
                                                                {movement.name}
                                                            </td>
                                                            <td
                                                                className={cn(
                                                                    'px-4 py-3 text-right font-mono font-semibold tabular-nums',
                                                                    amountClass(movement.type),
                                                                )}
                                                            >
                                                                {movement.amount_label}
                                                            </td>
                                                            {canEdit && (
                                                                <td className="px-4 py-3">{actions(movement)}</td>
                                                            )}
                                                        </tr>
                                                        {movement.marker_after && (
                                                            <tr>
                                                                <td colSpan={canEdit ? 4 : 3} className="px-4 py-2">
                                                                    {markers(movement)}
                                                                </td>
                                                            </tr>
                                                        )}
                                                    </Fragment>
                                                ))}
                                            </Fragment>
                                        ))}
                                    </tbody>
                                </table>
                            </div>

                            <ul className="mt-4 space-y-2 xl:hidden">
                                {groups.map((group) => (
                                    <Fragment key={group.dateKey}>
                                        <li className="flex items-center gap-3 pt-2 first:pt-0">
                                            <span className="shrink-0 text-xs font-semibold text-slate-700 dark:text-slate-200">
                                                {group.label}
                                            </span>
                                            <div className="h-px flex-1 bg-slate-200 dark:bg-[#3a3a3a]" />
                                        </li>
                                        {group.movements.map((movement) => (
                                            <Fragment key={movement.id}>
                                                <li className="rounded-xl border border-slate-200 bg-slate-50/60 p-3 dark:border-[#3a3a3a] dark:bg-[#1f1f1f]/50">
                                                    <div className="flex items-start justify-between gap-2">
                                                        <div className="min-w-0">
                                                            <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">
                                                                {movement.type_label}
                                                            </p>
                                                            <p className="truncate text-sm font-semibold text-slate-900 dark:text-white">
                                                                {movement.name}
                                                            </p>
                                                        </div>
                                                        <p
                                                            className={cn(
                                                                'shrink-0 font-mono text-base font-bold tabular-nums',
                                                                amountClass(movement.type),
                                                            )}
                                                        >
                                                            {movement.amount_label}
                                                        </p>
                                                    </div>
                                                    {canEdit && <div className="mt-2">{actions(movement)}</div>}
                                                </li>
                                                {movement.marker_after && <li>{markers(movement)}</li>}
                                            </Fragment>
                                        ))}
                                    </Fragment>
                                ))}
                            </ul>
                        </>
                    )}

                    {movements.total > 0 && (
                        <div className="mt-4 flex flex-col gap-3 border-t border-slate-200 pt-4 dark:border-[#3a3a3a] sm:flex-row sm:items-center sm:justify-between">
                            <div className="flex flex-wrap items-center gap-2 text-sm text-slate-500">
                                <label htmlFor="debtor-per-page">Mostrar</label>
                                <select
                                    id="debtor-per-page"
                                    value={movements.per_page}
                                    onChange={(e) => visit({ page: 1, per_page: Number(e.target.value) })}
                                    className="h-8 rounded-lg border border-slate-200 bg-white px-2 text-sm text-slate-700 dark:border-[#3a3a3a] dark:bg-[#1f1f1f] dark:text-slate-200"
                                >
                                    {perPageOptions.map((option) => (
                                        <option key={option} value={option}>
                                            {option}
                                        </option>
                                    ))}
                                </select>
                                <span>por página</span>
                                {movements.from !== null && movements.to !== null && (
                                    <span className="text-xs">
                                        ({movements.from}–{movements.to} de {movements.total})
                                    </span>
                                )}
                            </div>
                            {movements.last_page > 1 && (
                                <Pagination
                                    currentPage={movements.current_page}
                                    totalPages={movements.last_page}
                                    onPageChange={(next) => visit({ page: next })}
                                    iconOnly
                                />
                            )}
                        </div>
                    )}
                </Card>
            </div>

            <Dialog open={debtOpen} onOpenChange={setDebtOpen}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle>Agregar deuda</DialogTitle>
                    </DialogHeader>
                    <form
                        noValidate
                        className="space-y-4"
                        onSubmit={(e) => {
                            e.preventDefault();
                            debtForm.post(`/quien-te-debe/${debtor.id}/deudas`, {
                                preserveScroll: true,
                                onSuccess: () => {
                                    debtForm.reset();
                                    debtForm.setData('movement_date', localDateInputValue());
                                    setDebtOpen(false);
                                },
                            });
                        }}
                    >
                        <div>
                            <Label htmlFor="debt-date" className="mb-1 block text-xs text-slate-500">Fecha</Label>
                            <Input
                                id="debt-date"
                                type="date"
                                value={debtForm.data.movement_date}
                                onChange={(e) => debtForm.setData('movement_date', e.target.value)}
                                className={cn(debtForm.errors.movement_date && 'border-rose-500')}
                            />
                            <FieldError message={debtForm.errors.movement_date} />
                        </div>
                        <div>
                            <Label htmlFor="debt-name" className="mb-1 block text-xs text-slate-500">Nombre</Label>
                            <Input
                                id="debt-name"
                                value={debtForm.data.name}
                                onChange={(e) => debtForm.setData('name', e.target.value)}
                                placeholder="Ej. Préstamo de la semana"
                                className={cn(debtForm.errors.name && 'border-rose-500')}
                            />
                            <FieldError message={debtForm.errors.name} />
                        </div>
                        <div>
                            <Label htmlFor="debt-amount" className="mb-1 block text-xs text-slate-500">Monto</Label>
                            <Input
                                id="debt-amount"
                                inputMode="decimal"
                                value={debtForm.data.amount}
                                onChange={(e) => debtForm.setData('amount', e.target.value)}
                                placeholder="0.00"
                                className={cn(debtForm.errors.amount && 'border-rose-500')}
                            />
                            <FieldError message={debtForm.errors.amount} />
                        </div>
                        <DialogFooter className="gap-2 sm:gap-0">
                            <button type="button" onClick={() => setDebtOpen(false)} className="inline-flex h-10 items-center justify-center rounded-xl border border-slate-200 px-4 text-sm font-medium text-slate-700 dark:border-[#3a3a3a] dark:text-slate-200">
                                Cancelar
                            </button>
                            <button type="submit" disabled={debtForm.processing} className="inline-flex h-10 items-center justify-center rounded-xl bg-sidebar-active px-4 text-sm font-semibold text-white disabled:opacity-50">
                                {debtForm.processing ? 'Guardando...' : 'Guardar deuda'}
                            </button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

            <Dialog open={paymentOpen} onOpenChange={setPaymentOpen}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle>Abonar</DialogTitle>
                    </DialogHeader>
                    <form
                        noValidate
                        className="space-y-4"
                        onSubmit={(e) => {
                            e.preventDefault();
                            paymentForm.post(`/quien-te-debe/${debtor.id}/abonos`, {
                                preserveScroll: true,
                                onSuccess: () => {
                                    paymentForm.reset();
                                    paymentForm.setData('movement_date', localDateInputValue());
                                    setPaymentOpen(false);
                                },
                            });
                        }}
                    >
                        <div>
                            <Label htmlFor="payment-date" className="mb-1 block text-xs text-slate-500">Fecha</Label>
                            <Input
                                id="payment-date"
                                type="date"
                                value={paymentForm.data.movement_date}
                                onChange={(e) => paymentForm.setData('movement_date', e.target.value)}
                                className={cn(paymentForm.errors.movement_date && 'border-rose-500')}
                            />
                            <FieldError message={paymentForm.errors.movement_date} />
                        </div>
                        <div>
                            <Label htmlFor="payment-name" className="mb-1 block text-xs text-slate-500">Nombre</Label>
                            <Input
                                id="payment-name"
                                value={paymentForm.data.name}
                                onChange={(e) => paymentForm.setData('name', e.target.value)}
                                placeholder="Ej. Abono en efectivo"
                                className={cn(paymentForm.errors.name && 'border-rose-500')}
                            />
                            <FieldError message={paymentForm.errors.name} />
                        </div>
                        <div>
                            <Label htmlFor="payment-amount" className="mb-1 block text-xs text-slate-500">Monto</Label>
                            <Input
                                id="payment-amount"
                                inputMode="decimal"
                                value={paymentForm.data.amount}
                                onChange={(e) => paymentForm.setData('amount', e.target.value)}
                                placeholder="0.00"
                                className={cn(paymentForm.errors.amount && 'border-rose-500')}
                            />
                            <FieldError message={paymentForm.errors.amount} />
                        </div>
                        <DialogFooter className="gap-2 sm:gap-0">
                            <button type="button" onClick={() => setPaymentOpen(false)} className="inline-flex h-10 items-center justify-center rounded-xl border border-slate-200 px-4 text-sm font-medium text-slate-700 dark:border-[#3a3a3a] dark:text-slate-200">
                                Cancelar
                            </button>
                            <button type="submit" disabled={paymentForm.processing} className="inline-flex h-10 items-center justify-center rounded-xl bg-emerald-600 px-4 text-sm font-semibold text-white disabled:opacity-50">
                                {paymentForm.processing ? 'Guardando...' : 'Registrar abono'}
                            </button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

            <Dialog open={settleOpen} onOpenChange={setSettleOpen}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle>Liquidar</DialogTitle>
                    </DialogHeader>
                    <form
                        noValidate
                        className="space-y-4"
                        onSubmit={(e) => {
                            e.preventDefault();
                            settleForm.post(`/quien-te-debe/${debtor.id}/liquidar`, {
                                preserveScroll: true,
                                onSuccess: () => setSettleOpen(false),
                            });
                        }}
                    >
                        <div>
                            <Label htmlFor="settle-date" className="mb-1 block text-xs text-slate-500">Fecha</Label>
                            <Input
                                id="settle-date"
                                type="date"
                                value={settleForm.data.movement_date}
                                onChange={(e) => settleForm.setData('movement_date', e.target.value)}
                                className={cn(settleForm.errors.movement_date && 'border-rose-500')}
                            />
                            <FieldError message={settleForm.errors.movement_date} />
                        </div>
                        <div>
                            <Label htmlFor="settle-name" className="mb-1 block text-xs text-slate-500">Nombre</Label>
                            <Input
                                id="settle-name"
                                value={settleForm.data.name}
                                onChange={(e) => settleForm.setData('name', e.target.value)}
                                className={cn(settleForm.errors.name && 'border-rose-500')}
                            />
                            <FieldError message={settleForm.errors.name} />
                        </div>
                        <div className="rounded-xl bg-slate-50 px-3 py-3 dark:bg-[#1f1f1f]">
                            <p className="text-xs text-slate-500">Monto a liquidar</p>
                            <p className="font-mono text-2xl font-bold tabular-nums text-slate-900 dark:text-white">
                                ${formatCurrency(balance)}
                            </p>
                        </div>
                        <DialogFooter className="gap-2 sm:gap-0">
                            <button type="button" onClick={() => setSettleOpen(false)} className="inline-flex h-10 items-center justify-center rounded-xl border border-slate-200 px-4 text-sm font-medium text-slate-700 dark:border-[#3a3a3a] dark:text-slate-200">
                                Cancelar
                            </button>
                            <button type="submit" disabled={settleForm.processing || settled} className="inline-flex h-10 items-center justify-center rounded-xl bg-sidebar-active px-4 text-sm font-semibold text-white disabled:opacity-50">
                                {settleForm.processing ? 'Guardando...' : 'Liquidar'}
                            </button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

            <Dialog open={renameOpen} onOpenChange={setRenameOpen}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle>Editar deudor</DialogTitle>
                    </DialogHeader>
                    <form
                        noValidate
                        className="space-y-4"
                        onSubmit={(e) => {
                            e.preventDefault();
                            renameForm.put(`/quien-te-debe/${debtor.id}`, {
                                preserveScroll: true,
                                onSuccess: () => setRenameOpen(false),
                            });
                        }}
                    >
                        <div>
                            <Label htmlFor="rename-debtor" className="mb-1 block text-xs text-slate-500">Nombre</Label>
                            <Input
                                id="rename-debtor"
                                value={renameForm.data.name}
                                onChange={(e) => renameForm.setData('name', e.target.value)}
                                className={cn(renameForm.errors.name && 'border-rose-500')}
                            />
                            <FieldError message={renameForm.errors.name} />
                        </div>
                        <DialogFooter className="gap-2 sm:gap-0">
                            <button type="button" onClick={() => setRenameOpen(false)} className="inline-flex h-10 items-center justify-center rounded-xl border border-slate-200 px-4 text-sm font-medium text-slate-700 dark:border-[#3a3a3a] dark:text-slate-200">
                                Cancelar
                            </button>
                            <button type="submit" disabled={renameForm.processing} className="inline-flex h-10 items-center justify-center rounded-xl bg-sidebar-active px-4 text-sm font-semibold text-white disabled:opacity-50">
                                Guardar
                            </button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

            <Dialog open={editing !== null} onOpenChange={(open) => !open && setEditing(null)}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle>Editar registro</DialogTitle>
                    </DialogHeader>
                    <form
                        noValidate
                        className="space-y-4"
                        onSubmit={(e) => {
                            e.preventDefault();
                            if (!editing) return;
                            editForm.put(`/quien-te-debe/${debtor.id}/movimientos/${editing.id}`, {
                                preserveScroll: true,
                                onSuccess: () => setEditing(null),
                            });
                        }}
                    >
                        <div>
                            <Label htmlFor="edit-date" className="mb-1 block text-xs text-slate-500">Fecha</Label>
                            <Input
                                id="edit-date"
                                type="date"
                                value={editForm.data.movement_date}
                                onChange={(e) => editForm.setData('movement_date', e.target.value)}
                                className={cn(editForm.errors.movement_date && 'border-rose-500')}
                            />
                            <FieldError message={editForm.errors.movement_date} />
                        </div>
                        <div>
                            <Label htmlFor="edit-name" className="mb-1 block text-xs text-slate-500">Nombre</Label>
                            <Input
                                id="edit-name"
                                value={editForm.data.name}
                                onChange={(e) => editForm.setData('name', e.target.value)}
                                className={cn(editForm.errors.name && 'border-rose-500')}
                            />
                            <FieldError message={editForm.errors.name} />
                        </div>
                        {editing?.type !== 'settlement' && (
                            <div>
                                <Label htmlFor="edit-amount" className="mb-1 block text-xs text-slate-500">Monto</Label>
                                <Input
                                    id="edit-amount"
                                    inputMode="decimal"
                                    value={editForm.data.amount}
                                    onChange={(e) => editForm.setData('amount', e.target.value)}
                                    className={cn(editForm.errors.amount && 'border-rose-500')}
                                />
                                <FieldError message={editForm.errors.amount} />
                            </div>
                        )}
                        <DialogFooter className="gap-2 sm:gap-0">
                            <button type="button" onClick={() => setEditing(null)} className="inline-flex h-10 items-center justify-center rounded-xl border border-slate-200 px-4 text-sm font-medium text-slate-700 dark:border-[#3a3a3a] dark:text-slate-200">
                                Cancelar
                            </button>
                            <button type="submit" disabled={editForm.processing} className="inline-flex h-10 items-center justify-center rounded-xl bg-sidebar-active px-4 text-sm font-semibold text-white disabled:opacity-50">
                                Guardar cambios
                            </button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>
        </AppLayout>
    );
}
