import AppLayout from '@/layouts/app-layout';
import { Card } from '@/components/ui';
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
import { formatCurrency, localDateInputValue, cn } from '@/lib/utils';
import { type BreadcrumbItem } from '@/types';
import { Head, Link, router, useForm, usePage } from '@inertiajs/react';
import {
    ArrowLeft,
    CalendarClock,
    Check,
    ChevronDown,
    ChevronUp,
    Pencil,
    Plus,
    Trash2,
} from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';

type Installment = {
    id: number;
    number: number;
    due_date: string;
    due_date_formatted: string;
    amount: number;
    paid: boolean;
    paid_at: string | null;
    paid_at_formatted: string | null;
};

type Purchase = {
    id: number;
    name: string;
    original_amount: number;
    months_total: number;
    monthly_amount: number;
    first_due_date: string;
    first_due_date_formatted: string;
    debt_start_date: string | null;
    debt_start_date_formatted: string | null;
    notes: string | null;
    status: 'active' | 'paid';
    paid_months: number;
    pending_months: number;
    paid_amount: number;
    remaining_amount: number;
    next_due_date: string | null;
    next_due_date_formatted: string | null;
    progress_percent: number;
    installments: Installment[];
};

type AccountDetail = {
    id: number;
    name: string;
    original_total: number;
    remaining_total: number;
    paid_total: number;
    next_due_date_formatted: string | null;
    purchases: Purchase[];
};

interface MsiShowProps {
    account: AccountDetail;
}

const cardClass =
    'border border-slate-200/80 bg-white p-4 shadow-sm dark:border-[#2b2b2b] dark:bg-[#262626] sm:p-5';

export default function MsiShow({ account }: MsiShowProps) {
    const { canEdit } = useSectionAccess('msi');
    const page = usePage();
    const flash = page.props.flash as { success?: string; error?: string } | undefined;
    const [purchaseOpen, setPurchaseOpen] = useState(false);
    const [renameOpen, setRenameOpen] = useState(false);
    const [advanceOpen, setAdvanceOpen] = useState<Purchase | null>(null);
    const [expanded, setExpanded] = useState<Record<number, boolean>>({});

    const renameForm = useForm({ name: account.name });
    const purchaseForm = useForm({
        name: '',
        original_amount: '',
        months_total: '12',
        first_due_date: localDateInputValue(),
        debt_start_date: '',
        months_already_paid: '0',
        notes: '',
    });
    const advanceForm = useForm({
        months: '1',
        paid_at: localDateInputValue(),
    });

    const breadcrumbs: BreadcrumbItem[] = [
        { title: 'Dashboard', href: '/dashboard' },
        { title: 'MSI', href: '/msi' },
        { title: account.name, href: `/msi/${account.id}` },
    ];

    useEffect(() => {
        if (flash?.success) toast.success(flash.success);
        if (flash?.error) toast.error(flash.error);
    }, [flash?.success, flash?.error]);

    const monthlyPreview = useMemo(() => {
        const amount = Number(purchaseForm.data.original_amount);
        const months = Number(purchaseForm.data.months_total);
        if (!amount || !months || amount <= 0 || months < 1) return null;
        return amount / months;
    }, [purchaseForm.data.original_amount, purchaseForm.data.months_total]);

    const submitRename = (e: React.FormEvent) => {
        e.preventDefault();
        renameForm.put(`/msi/${account.id}`, {
            preserveScroll: true,
            onSuccess: () => setRenameOpen(false),
        });
    };

    const submitPurchase = (e: React.FormEvent) => {
        e.preventDefault();
        purchaseForm.post(`/msi/${account.id}/compras`, {
            preserveScroll: true,
            onSuccess: () => {
                purchaseForm.reset();
                purchaseForm.setData({
                    name: '',
                    original_amount: '',
                    months_total: '12',
                    first_due_date: localDateInputValue(),
                    debt_start_date: '',
                    months_already_paid: '0',
                    notes: '',
                });
                setPurchaseOpen(false);
            },
        });
    };

    const submitAdvance = (e: React.FormEvent) => {
        e.preventDefault();
        if (!advanceOpen) return;

        advanceForm.post(`/msi/${account.id}/compras/${advanceOpen.id}/adelantar`, {
            preserveScroll: true,
            onSuccess: () => {
                setAdvanceOpen(null);
                advanceForm.setData({ months: '1', paid_at: localDateInputValue() });
            },
        });
    };

    const toggleInstallment = async (purchase: Purchase, installment: Installment) => {
        if (!canEdit) return;

        const willMarkPaid = !installment.paid;
        const ok = await confirmAction({
            title: willMarkPaid ? '¿Marcar mes como pagado?' : '¿Desmarcar este mes?',
            text: willMarkPaid
                ? `Mes ${installment.number} de “${purchase.name}” (vence ${installment.due_date_formatted}) se marcará como pagado.`
                : `Mes ${installment.number} de “${purchase.name}” volverá a pendiente y se sumará al restante.`,
            confirmText: willMarkPaid ? 'Sí, marcar pagado' : 'Sí, desmarcar',
            icon: 'question',
        });
        if (!ok) return;

        router.put(
            `/msi/${account.id}/compras/${purchase.id}/meses/${installment.id}`,
            {
                paid: willMarkPaid,
                paid_at: localDateInputValue(),
            },
            { preserveScroll: true },
        );
    };

    const deleteAccount = async () => {
        const ok = await confirmAction({
            title: '¿Eliminar tarjeta?',
            text: 'Se borrarán también todas sus compras y meses.',
            confirmText: 'Sí, eliminar',
            icon: 'warning',
        });
        if (!ok) return;
        router.delete(`/msi/${account.id}`);
    };

    const deletePurchase = async (purchase: Purchase) => {
        const ok = await confirmAction({
            title: '¿Eliminar compra?',
            text: `Se eliminará “${purchase.name}” y su calendario de pagos.`,
            confirmText: 'Sí, eliminar',
            icon: 'warning',
        });
        if (!ok) return;
        router.delete(`/msi/${account.id}/compras/${purchase.id}`, { preserveScroll: true });
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs} title={account.name}>
            <Head title={`MSI · ${account.name}`} />

            <div className="flex w-full flex-col gap-4">
                <Card className={cardClass}>
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                        <div>
                            <Link
                                href="/msi"
                                className="mb-2 inline-flex items-center gap-1 text-xs font-medium text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
                            >
                                <ArrowLeft className="h-3.5 w-3.5" />
                                Volver a MSI
                            </Link>
                            <h2 className="text-lg font-semibold text-slate-900 dark:text-white">{account.name}</h2>
                            <p className="mt-0.5 text-sm text-slate-500">
                                Próximo pago: {account.next_due_date_formatted ?? 'Sin pendientes'}
                            </p>
                        </div>
                        {canEdit && (
                            <div className="flex flex-wrap gap-2">
                                <button
                                    type="button"
                                    onClick={() => {
                                        renameForm.setData('name', account.name);
                                        setRenameOpen(true);
                                    }}
                                    className="inline-flex h-10 items-center gap-1.5 rounded-xl border border-slate-200 px-3 text-sm font-medium text-slate-700 dark:border-[#3a3a3a] dark:text-slate-200"
                                >
                                    <Pencil className="h-3.5 w-3.5" />
                                    Renombrar
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setPurchaseOpen(true)}
                                    className="inline-flex h-10 items-center gap-1.5 rounded-xl bg-sidebar-active px-4 text-sm font-semibold text-white hover:opacity-90"
                                >
                                    <Plus className="h-4 w-4" />
                                    Nueva compra
                                </button>
                                <button
                                    type="button"
                                    onClick={() => void deleteAccount()}
                                    className="inline-flex h-10 items-center gap-1.5 rounded-xl border border-rose-200 px-3 text-sm font-medium text-rose-700 dark:border-rose-900 dark:text-rose-300"
                                >
                                    <Trash2 className="h-3.5 w-3.5" />
                                    Eliminar
                                </button>
                            </div>
                        )}
                    </div>
                </Card>

                <div className="grid gap-3 sm:grid-cols-3">
                    <Card className={cardClass}>
                        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Monto inicial</p>
                        <p className="mt-1 font-mono text-2xl font-bold tabular-nums text-slate-900 dark:text-white">
                            ${formatCurrency(account.original_total)}
                        </p>
                        <p className="mt-1 text-xs text-slate-500">No cambia al pagar</p>
                    </Card>
                    <Card className={cardClass}>
                        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Restante</p>
                        <p className="mt-1 font-mono text-2xl font-bold tabular-nums text-amber-700 dark:text-amber-400">
                            ${formatCurrency(account.remaining_total)}
                        </p>
                    </Card>
                    <Card className={cardClass}>
                        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Pagado</p>
                        <p className="mt-1 font-mono text-2xl font-bold tabular-nums text-emerald-700 dark:text-emerald-400">
                            ${formatCurrency(account.paid_total)}
                        </p>
                    </Card>
                </div>

                {account.purchases.length === 0 ? (
                    <Card className={cardClass}>
                        <div className="flex flex-col items-center py-10 text-center">
                            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-sidebar-active/10 text-sidebar-active">
                                <CalendarClock className="h-7 w-7" />
                            </div>
                            <p className="mt-4 text-base font-semibold text-slate-900 dark:text-white">
                                Sin compras en esta tarjeta
                            </p>
                            <p className="mt-1 max-w-sm text-sm text-slate-500">
                                Registra una compra a MSI. El sistema calcula la mensualidad y el calendario de pagos.
                            </p>
                        </div>
                    </Card>
                ) : (
                    <ul className="grid gap-3">
                        {account.purchases.map((purchase) => {
                            const open = expanded[purchase.id] ?? purchase.status === 'active';
                            return (
                                <li key={purchase.id} className={cn(cardClass, 'rounded-xl')}>
                                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                                        <div className="min-w-0">
                                            <div className="flex flex-wrap items-center gap-2">
                                                <h3 className="text-base font-semibold text-slate-900 dark:text-white">
                                                    {purchase.name}
                                                </h3>
                                                <span
                                                    className={cn(
                                                        'rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide',
                                                        purchase.status === 'paid'
                                                            ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300'
                                                            : 'bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300',
                                                    )}
                                                >
                                                    {purchase.status === 'paid' ? 'Liquidada' : 'Activa'}
                                                </span>
                                            </div>
                                            <p className="mt-1 text-sm text-slate-500">
                                                {purchase.paid_months}/{purchase.months_total} meses · mensualidad $
                                                {formatCurrency(purchase.monthly_amount)}
                                                {purchase.next_due_date_formatted
                                                    ? ` · próximo ${purchase.next_due_date_formatted}`
                                                    : ''}
                                            </p>
                                            <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-100 dark:bg-[#1f1f1f]">
                                                <div
                                                    className="h-full rounded-full bg-sidebar-active"
                                                    style={{ width: `${purchase.progress_percent}%` }}
                                                />
                                            </div>
                                            <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
                                                <div>
                                                    <p className="text-[11px] uppercase tracking-wide text-slate-500">Inicial</p>
                                                    <p className="font-mono text-sm font-semibold tabular-nums">
                                                        ${formatCurrency(purchase.original_amount)}
                                                    </p>
                                                </div>
                                                <div>
                                                    <p className="text-[11px] uppercase tracking-wide text-slate-500">Restante</p>
                                                    <p className="font-mono text-sm font-bold tabular-nums text-amber-700 dark:text-amber-400">
                                                        ${formatCurrency(purchase.remaining_amount)}
                                                    </p>
                                                </div>
                                                <div>
                                                    <p className="text-[11px] uppercase tracking-wide text-slate-500">Pagado</p>
                                                    <p className="font-mono text-sm font-semibold tabular-nums text-emerald-700 dark:text-emerald-400">
                                                        ${formatCurrency(purchase.paid_amount)}
                                                    </p>
                                                </div>
                                                <div>
                                                    <p className="text-[11px] uppercase tracking-wide text-slate-500">Inicio pago</p>
                                                    <p className="text-sm font-medium">{purchase.first_due_date_formatted}</p>
                                                </div>
                                            </div>
                                        </div>
                                        <div className="flex flex-wrap gap-2">
                                            <button
                                                type="button"
                                                onClick={() =>
                                                    setExpanded((prev) => ({ ...prev, [purchase.id]: !open }))
                                                }
                                                className="inline-flex h-9 items-center gap-1 rounded-lg border border-slate-200 px-3 text-xs font-semibold text-slate-700 dark:border-[#3a3a3a] dark:text-slate-200"
                                            >
                                                {open ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
                                                Meses
                                            </button>
                                            {canEdit && purchase.pending_months > 0 && (
                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        advanceForm.setData({
                                                            months: '1',
                                                            paid_at: localDateInputValue(),
                                                        });
                                                        setAdvanceOpen(purchase);
                                                    }}
                                                    className="inline-flex h-9 items-center gap-1 rounded-lg bg-sidebar-active px-3 text-xs font-semibold text-white"
                                                >
                                                    <Check className="h-3.5 w-3.5" />
                                                    Adelantar
                                                </button>
                                            )}
                                            {canEdit && (
                                                <button
                                                    type="button"
                                                    onClick={() => void deletePurchase(purchase)}
                                                    className="inline-flex h-9 items-center gap-1 rounded-lg border border-rose-200 px-3 text-xs font-semibold text-rose-700 dark:border-rose-900 dark:text-rose-300"
                                                >
                                                    <Trash2 className="h-3.5 w-3.5" />
                                                </button>
                                            )}
                                        </div>
                                    </div>

                                    {open && (
                                        <div className="mt-4 border-t border-slate-100 pt-3 dark:border-[#333]">
                                            <ul className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                                                {purchase.installments.map((installment) => (
                                                    <li key={installment.id}>
                                                        <button
                                                            type="button"
                                                            disabled={!canEdit}
                                                            onClick={() => void toggleInstallment(purchase, installment)}
                                                            className={cn(
                                                                'flex w-full items-center justify-between gap-2 rounded-xl border px-3 py-2.5 text-left transition',
                                                                installment.paid
                                                                    ? 'border-emerald-200 bg-emerald-50 dark:border-emerald-900 dark:bg-emerald-950/30'
                                                                    : 'border-slate-200 bg-slate-50 hover:border-sidebar-active/40 dark:border-[#3a3a3a] dark:bg-[#1f1f1f]',
                                                                !canEdit && 'cursor-default opacity-80',
                                                            )}
                                                        >
                                                            <div>
                                                                <p className="text-xs font-semibold text-slate-900 dark:text-white">
                                                                    Mes {installment.number}
                                                                </p>
                                                                <p className="text-[11px] text-slate-500">
                                                                    Vence {installment.due_date_formatted}
                                                                    {installment.paid_at_formatted
                                                                        ? ` · pagado ${installment.paid_at_formatted}`
                                                                        : ''}
                                                                </p>
                                                            </div>
                                                            <div className="text-right">
                                                                <p className="font-mono text-sm font-bold tabular-nums">
                                                                    ${formatCurrency(installment.amount)}
                                                                </p>
                                                                <p
                                                                    className={cn(
                                                                        'text-[10px] font-semibold uppercase',
                                                                        installment.paid
                                                                            ? 'text-emerald-700 dark:text-emerald-300'
                                                                            : 'text-amber-700 dark:text-amber-300',
                                                                    )}
                                                                >
                                                                    {installment.paid ? 'Pagado' : 'Pendiente'}
                                                                </p>
                                                            </div>
                                                        </button>
                                                    </li>
                                                ))}
                                            </ul>
                                        </div>
                                    )}
                                </li>
                            );
                        })}
                    </ul>
                )}
            </div>

            <Dialog open={renameOpen} onOpenChange={setRenameOpen}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle>Renombrar tarjeta</DialogTitle>
                    </DialogHeader>
                    <form onSubmit={submitRename} noValidate className="space-y-4">
                        <div>
                            <Label htmlFor="rename-msi" className="mb-1 block text-xs text-slate-500">
                                Nombre
                            </Label>
                            <Input
                                id="rename-msi"
                                value={renameForm.data.name}
                                onChange={(e) => renameForm.setData('name', e.target.value)}
                                className={cn(renameForm.errors.name && 'border-rose-500')}
                            />
                            {renameForm.errors.name && (
                                <p className="mt-1 text-xs text-rose-600">{renameForm.errors.name}</p>
                            )}
                        </div>
                        <DialogFooter className="gap-2 sm:gap-0">
                            <button
                                type="button"
                                onClick={() => setRenameOpen(false)}
                                className="inline-flex h-10 items-center justify-center rounded-xl border border-slate-200 px-4 text-sm font-medium"
                            >
                                Cancelar
                            </button>
                            <button
                                type="submit"
                                disabled={renameForm.processing}
                                className="inline-flex h-10 items-center justify-center rounded-xl bg-sidebar-active px-4 text-sm font-semibold text-white disabled:opacity-50"
                            >
                                Guardar
                            </button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

            <Dialog open={purchaseOpen} onOpenChange={setPurchaseOpen}>
                <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
                    <DialogHeader>
                        <DialogTitle>Nueva compra MSI</DialogTitle>
                    </DialogHeader>
                    <form onSubmit={submitPurchase} noValidate className="space-y-4">
                        <div>
                            <Label htmlFor="purchase-name" className="mb-1 block text-xs text-slate-500">
                                Nombre / descripción
                            </Label>
                            <Input
                                id="purchase-name"
                                value={purchaseForm.data.name}
                                onChange={(e) => purchaseForm.setData('name', e.target.value)}
                                placeholder="Ej. Laptop, celular, muebles"
                                className={cn(purchaseForm.errors.name && 'border-rose-500')}
                            />
                            {purchaseForm.errors.name && (
                                <p className="mt-1 text-xs text-rose-600">{purchaseForm.errors.name}</p>
                            )}
                        </div>

                        <div className="grid gap-3 sm:grid-cols-2">
                            <div>
                                <Label htmlFor="purchase-amount" className="mb-1 block text-xs text-slate-500">
                                    Monto inicial
                                </Label>
                                <Input
                                    id="purchase-amount"
                                    type="number"
                                    min="0.01"
                                    step="0.01"
                                    value={purchaseForm.data.original_amount}
                                    onChange={(e) => purchaseForm.setData('original_amount', e.target.value)}
                                    placeholder="18000"
                                    className={cn(purchaseForm.errors.original_amount && 'border-rose-500')}
                                />
                                {purchaseForm.errors.original_amount && (
                                    <p className="mt-1 text-xs text-rose-600">{purchaseForm.errors.original_amount}</p>
                                )}
                            </div>
                            <div>
                                <Label htmlFor="purchase-months" className="mb-1 block text-xs text-slate-500">
                                    Meses sin intereses
                                </Label>
                                <Input
                                    id="purchase-months"
                                    type="number"
                                    min="1"
                                    max="48"
                                    value={purchaseForm.data.months_total}
                                    onChange={(e) => purchaseForm.setData('months_total', e.target.value)}
                                    className={cn(purchaseForm.errors.months_total && 'border-rose-500')}
                                />
                                {purchaseForm.errors.months_total && (
                                    <p className="mt-1 text-xs text-rose-600">{purchaseForm.errors.months_total}</p>
                                )}
                            </div>
                        </div>

                        {monthlyPreview !== null && (
                            <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm dark:border-[#3a3a3a] dark:bg-[#1f1f1f]">
                                Pagarás aproximadamente{' '}
                                <span className="font-mono font-bold tabular-nums">
                                    ${formatCurrency(monthlyPreview)}
                                </span>{' '}
                                cada mes
                            </div>
                        )}

                        <div className="grid gap-3 sm:grid-cols-2">
                            <div>
                                <Label htmlFor="first-due" className="mb-1 block text-xs text-slate-500">
                                    Fecha primer pago
                                </Label>
                                <Input
                                    id="first-due"
                                    type="date"
                                    value={purchaseForm.data.first_due_date}
                                    onChange={(e) => purchaseForm.setData('first_due_date', e.target.value)}
                                    className={cn(purchaseForm.errors.first_due_date && 'border-rose-500')}
                                />
                                {purchaseForm.errors.first_due_date && (
                                    <p className="mt-1 text-xs text-rose-600">{purchaseForm.errors.first_due_date}</p>
                                )}
                            </div>
                            <div>
                                <Label htmlFor="debt-start" className="mb-1 block text-xs text-slate-500">
                                    Fecha inicio deuda (opcional)
                                </Label>
                                <Input
                                    id="debt-start"
                                    type="date"
                                    value={purchaseForm.data.debt_start_date}
                                    onChange={(e) => purchaseForm.setData('debt_start_date', e.target.value)}
                                />
                            </div>
                        </div>

                        <div>
                            <Label htmlFor="already-paid" className="mb-1 block text-xs text-slate-500">
                                Meses ya pagados
                            </Label>
                            <Input
                                id="already-paid"
                                type="number"
                                min="0"
                                max="48"
                                value={purchaseForm.data.months_already_paid}
                                onChange={(e) => purchaseForm.setData('months_already_paid', e.target.value)}
                            />
                            <p className="mt-1 text-[11px] text-slate-500">
                                Úsalo si la compra ya lleva varios meses pagados y aún te faltan.
                            </p>
                        </div>

                        <div>
                            <Label htmlFor="purchase-notes" className="mb-1 block text-xs text-slate-500">
                                Notas (opcional)
                            </Label>
                            <Input
                                id="purchase-notes"
                                value={purchaseForm.data.notes}
                                onChange={(e) => purchaseForm.setData('notes', e.target.value)}
                                placeholder="Detalle extra"
                            />
                        </div>

                        <DialogFooter className="gap-2 sm:gap-0">
                            <button
                                type="button"
                                onClick={() => setPurchaseOpen(false)}
                                className="inline-flex h-10 items-center justify-center rounded-xl border border-slate-200 px-4 text-sm font-medium"
                            >
                                Cancelar
                            </button>
                            <button
                                type="submit"
                                disabled={purchaseForm.processing}
                                className="inline-flex h-10 items-center justify-center rounded-xl bg-sidebar-active px-4 text-sm font-semibold text-white disabled:opacity-50"
                            >
                                {purchaseForm.processing ? 'Guardando...' : 'Registrar compra'}
                            </button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

            <Dialog open={!!advanceOpen} onOpenChange={(open) => !open && setAdvanceOpen(null)}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle>Adelantar meses</DialogTitle>
                    </DialogHeader>
                    {advanceOpen && (
                        <form onSubmit={submitAdvance} noValidate className="space-y-4">
                            <p className="text-sm text-slate-500">
                                {advanceOpen.name}: quedan {advanceOpen.pending_months} meses pendientes.
                            </p>
                            <div className="grid gap-3 sm:grid-cols-2">
                                <div>
                                    <Label htmlFor="advance-months" className="mb-1 block text-xs text-slate-500">
                                        Meses a marcar
                                    </Label>
                                    <Input
                                        id="advance-months"
                                        type="number"
                                        min="1"
                                        max={advanceOpen.pending_months}
                                        value={advanceForm.data.months}
                                        onChange={(e) => advanceForm.setData('months', e.target.value)}
                                    />
                                </div>
                                <div>
                                    <Label htmlFor="advance-date" className="mb-1 block text-xs text-slate-500">
                                        Fecha de pago
                                    </Label>
                                    <Input
                                        id="advance-date"
                                        type="date"
                                        value={advanceForm.data.paid_at}
                                        onChange={(e) => advanceForm.setData('paid_at', e.target.value)}
                                    />
                                </div>
                            </div>
                            <DialogFooter className="gap-2 sm:gap-0">
                                <button
                                    type="button"
                                    onClick={() => setAdvanceOpen(null)}
                                    className="inline-flex h-10 items-center justify-center rounded-xl border border-slate-200 px-4 text-sm font-medium"
                                >
                                    Cancelar
                                </button>
                                <button
                                    type="submit"
                                    disabled={advanceForm.processing}
                                    className="inline-flex h-10 items-center justify-center rounded-xl bg-sidebar-active px-4 text-sm font-semibold text-white disabled:opacity-50"
                                >
                                    {advanceForm.processing ? 'Guardando...' : 'Marcar pagados'}
                                </button>
                            </DialogFooter>
                        </form>
                    )}
                </DialogContent>
            </Dialog>
        </AppLayout>
    );
}
