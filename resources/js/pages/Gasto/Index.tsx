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
import { confirmAction } from '@/lib/sweetalert';
import { formatCurrency, cn } from '@/lib/utils';
import { type BreadcrumbItem } from '@/types';
import { Head, router, useForm, usePage } from '@inertiajs/react';
import { Pencil, Receipt, Trash2, TrendingDown, TrendingUp, Wallet } from 'lucide-react';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';

type ExpenseRow = {
    id: number;
    name: string;
    amount: number;
    amount_label: string;
    concept: string | null;
    created_at: string | null;
};

interface GastoIndexProps {
    todayDateFormatted: string;
    todayEarnings: number;
    totalExpenses: number;
    netEarnings: number;
    completedOrdersToday: number;
    hasOpenLiveSession: boolean;
    hasSessionToday: boolean;
    expenses: ExpenseRow[];
}

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Dashboard', href: '/dashboard' },
    { title: 'Gasto', href: '/gasto' },
];

const cardClass =
    'border border-slate-200/80 bg-white p-4 shadow-sm dark:border-[#2b2b2b] dark:bg-[#262626] sm:p-5';

export default function GastoIndex({
    todayDateFormatted,
    todayEarnings,
    totalExpenses,
    netEarnings,
    completedOrdersToday,
    hasOpenLiveSession,
    hasSessionToday,
    expenses,
}: GastoIndexProps) {
    const page = usePage();
    const flash = page.props.flash as { success?: string; error?: string } | undefined;

    const expenseForm = useForm({
        name: '',
        amount: '',
        concept: '',
    });

    const editForm = useForm({
        name: '',
        amount: '',
        concept: '',
    });

    const [editingExpense, setEditingExpense] = useState<ExpenseRow | null>(null);

    useEffect(() => {
        if (flash?.success) toast.success(flash.success);
        if (flash?.error) toast.error(flash.error);
    }, [flash?.success, flash?.error]);

    useEffect(() => {
        if (!hasOpenLiveSession) {
            return;
        }

        const intervalId = window.setInterval(() => {
            router.reload({
                only: [
                    'todayEarnings',
                    'totalExpenses',
                    'netEarnings',
                    'completedOrdersToday',
                    'hasOpenLiveSession',
                    'hasSessionToday',
                    'expenses',
                ],
            });
        }, 5000);

        return () => window.clearInterval(intervalId);
    }, [hasOpenLiveSession]);

    const submitExpense = (e: React.FormEvent) => {
        e.preventDefault();
        expenseForm.post('/gasto', {
            preserveScroll: true,
            onSuccess: () => expenseForm.reset(),
        });
    };

    const deleteExpense = async (expense: ExpenseRow) => {
        const confirmed = await confirmAction({
            title: '¿Eliminar gasto?',
            text: `${expense.name} — ${expense.amount_label}`,
            confirmText: 'Sí, eliminar',
            icon: 'warning',
        });

        if (!confirmed) return;

        router.delete(`/gasto/${expense.id}`, { preserveScroll: true });
    };

    const openEditExpense = (expense: ExpenseRow) => {
        setEditingExpense(expense);
        editForm.setData({
            name: expense.name,
            amount: String(expense.amount),
            concept: expense.concept ?? '',
        });
        editForm.clearErrors();
    };

    const closeEditExpense = () => {
        setEditingExpense(null);
        editForm.reset();
        editForm.clearErrors();
    };

    const submitEditExpense = (e: React.FormEvent) => {
        e.preventDefault();
        if (!editingExpense) return;

        editForm.put(`/gasto/${editingExpense.id}`, {
            preserveScroll: true,
            onSuccess: () => closeEditExpense(),
        });
    };

    const netTone =
        netEarnings > 0.01
            ? 'text-emerald-600 dark:text-emerald-400'
            : netEarnings < -0.01
              ? 'text-rose-600 dark:text-rose-400'
              : 'text-slate-700 dark:text-slate-200';

    return (
        <AppLayout breadcrumbs={breadcrumbs} title="Gasto">
            <Head title="Gasto" />

            <div className="flex w-full flex-col gap-4">
                <Card className={cardClass}>
                    <div className="flex items-start gap-3">
                        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-sidebar-active/10 text-sidebar-active">
                            <Wallet className="h-5 w-5" />
                        </div>
                        <div className="min-w-0 flex-1">
                            <p className="text-sm text-slate-500">Resumen del día</p>
                            <p className="mt-0.5 text-lg font-semibold text-slate-900 dark:text-white">
                                {todayDateFormatted}
                            </p>
                            <p className="mt-1 text-xs text-slate-500">
                                {hasOpenLiveSession
                                    ? 'Tus ganancias se actualizan solas mientras repartes.'
                                    : hasSessionToday
                                      ? `${completedOrdersToday} pedido${completedOrdersToday !== 1 ? 's' : ''} completado${completedOrdersToday !== 1 ? 's' : ''} hoy.`
                                      : 'Aún no hay jornada hoy. Puedes registrar gastos del día.'}
                            </p>
                        </div>
                    </div>

                    <div className="mt-4 grid gap-3 sm:grid-cols-3">
                        <div className="rounded-xl bg-emerald-50 px-3 py-3 dark:bg-emerald-950/30">
                            <div className="flex items-center gap-1.5 text-[10px] font-semibold uppercase text-emerald-700 dark:text-emerald-400">
                                <TrendingUp className="h-3.5 w-3.5" />
                                Ganancias del día
                            </div>
                            <p className="mt-1 text-xl font-bold text-emerald-600 dark:text-emerald-400">
                                ${formatCurrency(todayEarnings)}
                            </p>
                        </div>

                        <div className="rounded-xl bg-rose-50 px-3 py-3 dark:bg-rose-950/30">
                            <div className="flex items-center gap-1.5 text-[10px] font-semibold uppercase text-rose-700 dark:text-rose-400">
                                <TrendingDown className="h-3.5 w-3.5" />
                                Gastos del día
                            </div>
                            <p className="mt-1 text-xl font-bold text-rose-600 dark:text-rose-400">
                                ${formatCurrency(totalExpenses)}
                            </p>
                        </div>

                        <div className="rounded-xl bg-slate-100 px-3 py-3 dark:bg-[#1f1f1f]">
                            <div className="flex items-center gap-1.5 text-[10px] font-semibold uppercase text-slate-600 dark:text-slate-400">
                                <Receipt className="h-3.5 w-3.5" />
                                Te queda
                            </div>
                            <p className={cn('mt-1 text-xl font-bold', netTone)}>
                                ${formatCurrency(Math.abs(netEarnings))}
                                {netEarnings < -0.01 && (
                                    <span className="ml-1 text-sm font-semibold">en negativo</span>
                                )}
                            </p>
                        </div>
                    </div>
                </Card>

                <Card className={cardClass}>
                    <h2 className="text-base font-semibold text-slate-900 dark:text-white">
                        Registrar gasto
                    </h2>
                    <p className="mt-1 text-sm text-slate-500">
                        Captura lo que gastas hoy para ver cuánto te queda de tus ganancias.
                    </p>

                    <form onSubmit={submitExpense} noValidate className="mt-4 space-y-4">
                        <div>
                            <Label htmlFor="expense_name" className="mb-1 block text-xs text-slate-500">
                                Nombre del gasto
                            </Label>
                            <Input
                                id="expense_name"
                                value={expenseForm.data.name}
                                onChange={(e) => expenseForm.setData('name', e.target.value)}
                                placeholder="Ej. Gasolina, comida, casetas"
                                className={cn(expenseForm.errors.name && 'border-rose-500')}
                            />
                            {expenseForm.errors.name && (
                                <p className="mt-1 text-xs text-rose-600">{expenseForm.errors.name}</p>
                            )}
                        </div>

                        <div>
                            <Label htmlFor="expense_amount" className="mb-1 block text-xs text-slate-500">
                                Cantidad ($)
                            </Label>
                            <Input
                                id="expense_amount"
                                type="number"
                                min={0.01}
                                step="0.01"
                                value={expenseForm.data.amount}
                                onChange={(e) => expenseForm.setData('amount', e.target.value)}
                                placeholder="0.00"
                                className={cn(expenseForm.errors.amount && 'border-rose-500')}
                            />
                            {expenseForm.errors.amount && (
                                <p className="mt-1 text-xs text-rose-600">{expenseForm.errors.amount}</p>
                            )}
                        </div>

                        <div>
                            <Label htmlFor="expense_concept" className="mb-1 block text-xs text-slate-500">
                                Concepto (opcional)
                            </Label>
                            <Input
                                id="expense_concept"
                                value={expenseForm.data.concept}
                                onChange={(e) => expenseForm.setData('concept', e.target.value)}
                                placeholder="Detalle adicional del gasto"
                            />
                        </div>

                        <button
                            type="submit"
                            disabled={expenseForm.processing}
                            className="inline-flex h-10 w-full items-center justify-center rounded-xl bg-sidebar-active text-sm font-semibold text-white disabled:opacity-50 sm:w-auto sm:px-6"
                        >
                            {expenseForm.processing ? 'Guardando...' : 'Agregar gasto'}
                        </button>
                    </form>
                </Card>

                <Card className={cardClass}>
                    <h2 className="text-base font-semibold text-slate-900 dark:text-white">
                        Gastos de hoy
                    </h2>

                    {expenses.length === 0 ? (
                        <p className="mt-4 rounded-xl border border-dashed border-slate-200 py-8 text-center text-sm text-slate-500 dark:border-[#3a3a3a]">
                            Aún no registras gastos hoy.
                        </p>
                    ) : (
                        <ul className="mt-4 space-y-2">
                            {expenses.map((expense) => (
                                <li
                                    key={expense.id}
                                    className="flex items-start justify-between gap-3 rounded-xl border border-slate-200 bg-slate-50/50 p-3 dark:border-[#3a3a3a] dark:bg-[#1f1f1f]/50"
                                >
                                    <div className="min-w-0">
                                        <p className="text-sm font-semibold text-slate-900 dark:text-white">
                                            {expense.name}
                                        </p>
                                        {expense.concept && (
                                            <p className="mt-0.5 text-xs text-slate-500">{expense.concept}</p>
                                        )}
                                        {expense.created_at && (
                                            <p className="mt-1 text-[10px] text-slate-400">
                                                {expense.created_at}
                                            </p>
                                        )}
                                    </div>
                                    <div className="flex shrink-0 items-center gap-1">
                                        <p className="text-sm font-bold tabular-nums text-rose-600 dark:text-rose-400">
                                            −{expense.amount_label}
                                        </p>
                                        <button
                                            type="button"
                                            onClick={() => openEditExpense(expense)}
                                            className="rounded p-1.5 text-slate-500 hover:bg-slate-100 dark:hover:bg-[#333]"
                                            title="Editar gasto"
                                        >
                                            <Pencil className="h-4 w-4" />
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => deleteExpense(expense)}
                                            className="rounded p-1.5 text-slate-500 hover:bg-slate-100 dark:hover:bg-[#333]"
                                            title="Eliminar gasto"
                                        >
                                            <Trash2 className="h-4 w-4" />
                                        </button>
                                    </div>
                                </li>
                            ))}
                        </ul>
                    )}
                </Card>

                <Dialog
                    open={editingExpense !== null}
                    onOpenChange={(open) => {
                        if (!open) closeEditExpense();
                    }}
                >
                    <DialogContent className="sm:max-w-md">
                        <DialogHeader>
                            <DialogTitle>Editar gasto</DialogTitle>
                            <DialogDescription>
                                Al guardar, se recalculan los gastos del día y tu saldo restante.
                            </DialogDescription>
                        </DialogHeader>

                        <form onSubmit={submitEditExpense} noValidate className="space-y-4">
                            <div>
                                <Label
                                    htmlFor="edit_expense_name"
                                    className="mb-1 block text-xs text-slate-500"
                                >
                                    Nombre del gasto
                                </Label>
                                <Input
                                    id="edit_expense_name"
                                    value={editForm.data.name}
                                    onChange={(e) => editForm.setData('name', e.target.value)}
                                    className={cn(editForm.errors.name && 'border-rose-500')}
                                />
                                {editForm.errors.name && (
                                    <p className="mt-1 text-xs text-rose-600">{editForm.errors.name}</p>
                                )}
                            </div>

                            <div>
                                <Label
                                    htmlFor="edit_expense_amount"
                                    className="mb-1 block text-xs text-slate-500"
                                >
                                    Cantidad ($)
                                </Label>
                                <Input
                                    id="edit_expense_amount"
                                    type="number"
                                    min={0.01}
                                    step="0.01"
                                    value={editForm.data.amount}
                                    onChange={(e) => editForm.setData('amount', e.target.value)}
                                    className={cn(editForm.errors.amount && 'border-rose-500')}
                                />
                                {editForm.errors.amount && (
                                    <p className="mt-1 text-xs text-rose-600">{editForm.errors.amount}</p>
                                )}
                            </div>

                            <div>
                                <Label
                                    htmlFor="edit_expense_concept"
                                    className="mb-1 block text-xs text-slate-500"
                                >
                                    Concepto (opcional)
                                </Label>
                                <Input
                                    id="edit_expense_concept"
                                    value={editForm.data.concept}
                                    onChange={(e) => editForm.setData('concept', e.target.value)}
                                />
                            </div>

                            <DialogFooter className="gap-2 sm:gap-0">
                                <button
                                    type="button"
                                    onClick={closeEditExpense}
                                    className="inline-flex h-10 items-center justify-center rounded-xl border border-slate-200 px-4 text-sm font-medium text-slate-700 hover:bg-slate-50 dark:border-[#3a3a3a] dark:text-slate-200 dark:hover:bg-[#2a2a2a]"
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
