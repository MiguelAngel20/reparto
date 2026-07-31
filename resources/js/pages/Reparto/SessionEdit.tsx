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
import {
    SessionEntriesTable,
    type SessionEntryRow,
} from '@/components/reparto/session-entries-table';
import { type SessionHistoryItem } from '@/components/reparto/session-history-list';
import { useSectionAccess } from '@/hooks/useSectionAccess';
import { calculateCommission, calculatePurchaseCharge } from '@/lib/delivery-commission';
import { confirmAction } from '@/lib/sweetalert';
import { formatCurrency, cn } from '@/lib/utils';
import { type BreadcrumbItem } from '@/types';
import { Head, Link, router, useForm, usePage } from '@inertiajs/react';
import { ArrowLeft, Briefcase, ClipboardList, Pencil, PlusCircle, Receipt, Trash2 } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';

type SessionData = SessionHistoryItem & {
    work_duration_formatted?: string | null;
    net_earnings?: number;
    personal_services_total?: number;
    total_expenses?: number;
};

type PersonalServiceRow = {
    id: number;
    name: string;
    amount: number;
    spent_amount: number | null;
    client_charge: number;
    description: string | null;
};

type ExpenseRow = {
    id: number;
    name: string;
    amount: number;
    concept: string | null;
};

interface SessionEditProps {
    session: SessionData;
    entries: SessionEntryRow[];
    personalServices: PersonalServiceRow[];
    expenses: ExpenseRow[];
    companyName: string;
    userPercentage: number;
    backUrl: string;
}

const cardClass =
    'border border-slate-200/80 bg-white p-4 shadow-sm dark:border-[#2b2b2b] dark:bg-[#262626] sm:p-5';

const emptyEntryForm = {
    name: '',
    service_cost: '60',
    user_extra: '',
    clikio_extra: '',
    discount: '',
};

export default function SessionEdit({
    session,
    entries,
    personalServices,
    expenses,
    companyName,
    userPercentage,
    backUrl,
}: SessionEditProps) {
    const page = usePage();
    const flash = page.props.flash as { success?: string; error?: string } | undefined;
    const { canEdit: canEditReparto } = useSectionAccess('reparto');
    const { canEdit: canEditGasto, canView: canViewGasto } = useSectionAccess('gasto');
    const {
        canEdit: canEditPersonalService,
        canView: canViewPersonalService,
    } = useSectionAccess('personal_service');
    const [entryDialogMode, setEntryDialogMode] = useState<'add' | 'edit' | null>(null);
    const [editingId, setEditingId] = useState<number | null>(null);
    const [personalServiceDialogMode, setPersonalServiceDialogMode] = useState<
        'add' | 'edit' | null
    >(null);
    const [editingPersonalService, setEditingPersonalService] =
        useState<PersonalServiceRow | null>(null);
    const [expenseDialogMode, setExpenseDialogMode] = useState<'add' | 'edit' | null>(null);
    const [editingExpense, setEditingExpense] = useState<ExpenseRow | null>(null);

    const entryForm = useForm(emptyEntryForm);
    const editPersonalServiceForm = useForm({
        name: '',
        amount: '',
        spent_amount: '',
        description: '',
    });
    const editExpenseForm = useForm({
        name: '',
        amount: '',
        concept: '',
    });
    const sessionBaseUrl = `/reparto/jornada/${session.id}`;
    const entriesBaseUrl = `${sessionBaseUrl}/pedidos`;

    const breadcrumbs: BreadcrumbItem[] = [
        { title: 'Dashboard', href: '/dashboard' },
        { title: 'Iniciar jornada', href: backUrl },
        { title: `Editar ${session.capture_date_formatted}`, href: '#' },
    ];

    const summary = useMemo(() => {
        const settlement = session.clikio_settlement ?? 0;
        return {
            count: session.count ?? session.entries_count ?? 0,
            user_earnings: session.user_earnings ?? 0,
            settlement,
            owesClikio: settlement > 0,
            clikioOwesYou: settlement < 0,
        };
    }, [session]);

    const tableTotals = useMemo(
        () =>
            entries.reduce(
                (acc, row) => ({
                    service_cost: acc.service_cost + row.service_cost,
                    user_commission: acc.user_commission + row.user_commission,
                    clikio_commission: acc.clikio_commission + row.clikio_commission,
                    user_extra: acc.user_extra + row.user_extra,
                    clikio_extra: acc.clikio_extra + row.clikio_extra,
                    clikio_discounts: acc.clikio_discounts + row.clikio_discounts,
                }),
                {
                    service_cost: 0,
                    user_commission: 0,
                    clikio_commission: 0,
                    user_extra: 0,
                    clikio_extra: 0,
                    clikio_discounts: 0,
                },
            ),
        [entries],
    );

    const commissionPreview = useMemo(() => {
        const serviceCost = parseFloat(entryForm.data.service_cost) || 0;
        return calculateCommission(serviceCost, userPercentage);
    }, [entryForm.data.service_cost, userPercentage]);

    const personalServiceClientCharge = useMemo(() => {
        const amount = parseFloat(editPersonalServiceForm.data.amount) || 0;
        const spent = parseFloat(editPersonalServiceForm.data.spent_amount) || 0;
        return calculatePurchaseCharge(spent, amount);
    }, [editPersonalServiceForm.data.amount, editPersonalServiceForm.data.spent_amount]);

    const personalServicesTotal = useMemo(
        () => personalServices.reduce((acc, row) => acc + row.amount, 0),
        [personalServices],
    );

    const expensesTotal = useMemo(
        () => expenses.reduce((acc, row) => acc + row.amount, 0),
        [expenses],
    );

    useEffect(() => {
        if (flash?.success) toast.success(flash.success);
        if (flash?.error) toast.error(flash.error);
    }, [flash?.success, flash?.error]);

    const resetEntryForm = () => {
        setEntryDialogMode(null);
        setEditingId(null);
        entryForm.clearErrors();
        entryForm.setData(emptyEntryForm);
    };

    const openAddEntry = () => {
        setPersonalServiceDialogMode(null);
        setExpenseDialogMode(null);
        setEditingPersonalService(null);
        setEditingExpense(null);
        setEditingId(null);
        entryForm.setData(emptyEntryForm);
        entryForm.clearErrors();
        setEntryDialogMode('add');
    };

    const loadEntry = (row: SessionEntryRow) => {
        setPersonalServiceDialogMode(null);
        setExpenseDialogMode(null);
        setEditingPersonalService(null);
        setEditingExpense(null);
        setEditingId(row.id);
        entryForm.setData({
            name: row.name,
            service_cost: String(row.service_cost),
            user_extra: row.user_extra > 0 ? String(row.user_extra) : '',
            clikio_extra: row.clikio_extra > 0 ? String(row.clikio_extra) : '',
            discount: row.clikio_discounts > 0 ? String(row.clikio_discounts) : '',
        });
        entryForm.clearErrors();
        setEntryDialogMode('edit');
    };

    const submitEntry = (e: React.FormEvent) => {
        e.preventDefault();
        if (!entryDialogMode) return;

        entryForm.transform((data) => ({
            ...data,
            client_payment_mode: 'cash',
        }));

        if (entryDialogMode === 'add') {
            entryForm.post(`${sessionBaseUrl}/pedidos`, {
                preserveScroll: true,
                onSuccess: () => resetEntryForm(),
            });
            return;
        }

        if (!editingId) return;

        entryForm.put(`${entriesBaseUrl}/${editingId}`, {
            preserveScroll: true,
            onSuccess: () => resetEntryForm(),
        });
    };

    const deleteEntry = async (id: number) => {
        const confirmed = await confirmAction({
            title: '¿Eliminar pedido?',
            text: 'Se recalcularán las ganancias y el cuadre del día.',
            confirmText: 'Sí, eliminar',
            icon: 'warning',
        });

        if (!confirmed) return;

        router.delete(`${entriesBaseUrl}/${id}`, {
            preserveScroll: true,
            onSuccess: () => {
                if (editingId === id) {
                    resetEntryForm();
                }
            },
        });
    };

    const openAddPersonalService = () => {
        setEntryDialogMode(null);
        setExpenseDialogMode(null);
        setEditingExpense(null);
        setEditingPersonalService(null);
        editPersonalServiceForm.reset();
        editPersonalServiceForm.clearErrors();
        setPersonalServiceDialogMode('add');
    };

    const openEditPersonalService = (service: PersonalServiceRow) => {
        setEntryDialogMode(null);
        setExpenseDialogMode(null);
        setEditingExpense(null);
        setEditingPersonalService(service);
        editPersonalServiceForm.setData({
            name: service.name,
            amount: String(service.amount),
            spent_amount: service.spent_amount !== null ? String(service.spent_amount) : '',
            description: service.description ?? '',
        });
        editPersonalServiceForm.clearErrors();
        setPersonalServiceDialogMode('edit');
    };

    const closeEditPersonalService = () => {
        setPersonalServiceDialogMode(null);
        setEditingPersonalService(null);
        editPersonalServiceForm.reset();
        editPersonalServiceForm.clearErrors();
    };

    const submitEditPersonalService = (e: React.FormEvent) => {
        e.preventDefault();
        if (!personalServiceDialogMode) return;

        if (personalServiceDialogMode === 'add') {
            editPersonalServiceForm.post(`${sessionBaseUrl}/servicios-propios`, {
                preserveScroll: true,
                onSuccess: () => closeEditPersonalService(),
            });
            return;
        }

        if (!editingPersonalService) return;

        editPersonalServiceForm.put(
            `${sessionBaseUrl}/servicios-propios/${editingPersonalService.id}`,
            {
                preserveScroll: true,
                onSuccess: () => closeEditPersonalService(),
            },
        );
    };

    const deletePersonalService = async (service: PersonalServiceRow) => {
        const confirmed = await confirmAction({
            title: '¿Eliminar servicio?',
            text: `${service.name} — se recalculará el saldo del día.`,
            confirmText: 'Sí, eliminar',
            icon: 'warning',
        });

        if (!confirmed) return;

        router.delete(`${sessionBaseUrl}/servicios-propios/${service.id}`, {
            preserveScroll: true,
            onSuccess: () => {
                if (editingPersonalService?.id === service.id) {
                    closeEditPersonalService();
                }
            },
        });
    };

    const openAddExpense = () => {
        setEntryDialogMode(null);
        setPersonalServiceDialogMode(null);
        setEditingPersonalService(null);
        setEditingExpense(null);
        editExpenseForm.reset();
        editExpenseForm.clearErrors();
        setExpenseDialogMode('add');
    };

    const openEditExpense = (expense: ExpenseRow) => {
        setEntryDialogMode(null);
        setPersonalServiceDialogMode(null);
        setEditingPersonalService(null);
        setEditingExpense(expense);
        editExpenseForm.setData({
            name: expense.name,
            amount: String(expense.amount),
            concept: expense.concept ?? '',
        });
        editExpenseForm.clearErrors();
        setExpenseDialogMode('edit');
    };

    const closeEditExpense = () => {
        setExpenseDialogMode(null);
        setEditingExpense(null);
        editExpenseForm.reset();
        editExpenseForm.clearErrors();
    };

    const submitEditExpense = (e: React.FormEvent) => {
        e.preventDefault();
        if (!expenseDialogMode) return;

        if (expenseDialogMode === 'add') {
            editExpenseForm.post(`${sessionBaseUrl}/gastos`, {
                preserveScroll: true,
                onSuccess: () => closeEditExpense(),
            });
            return;
        }

        if (!editingExpense) return;

        editExpenseForm.put(`${sessionBaseUrl}/gastos/${editingExpense.id}`, {
            preserveScroll: true,
            onSuccess: () => closeEditExpense(),
        });
    };

    const deleteExpense = async (expense: ExpenseRow) => {
        const confirmed = await confirmAction({
            title: '¿Eliminar gasto?',
            text: `${expense.name} — $${formatCurrency(expense.amount)}`,
            confirmText: 'Sí, eliminar',
            icon: 'warning',
        });

        if (!confirmed) return;

        router.delete(`${sessionBaseUrl}/gastos/${expense.id}`, {
            preserveScroll: true,
            onSuccess: () => {
                if (editingExpense?.id === expense.id) {
                    closeEditExpense();
                }
            },
        });
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs} title="Editar jornada">
            <Head title={`Editar jornada · ${session.capture_date_formatted}`} />

            <div className="flex w-full flex-col gap-6">
                <div>
                    <Link
                        href={backUrl}
                        className="mb-3 inline-flex items-center gap-1 text-sm text-slate-500 hover:text-sidebar-active"
                    >
                        <ArrowLeft className="h-4 w-4" />
                        Volver a Iniciar jornada
                    </Link>
                    <h1 className="text-lg font-semibold text-slate-900 dark:text-white">
                        {session.capture_date_formatted}
                    </h1>
                    <p className="mt-1 text-sm text-slate-500">
                        {session.session_type_label} · edita pedidos, gastos y servicios propios
                    </p>
                    {session.work_duration_formatted && (
                        <p className="mt-1 text-xs text-slate-500">
                            Duración: {session.work_duration_formatted}
                        </p>
                    )}
                </div>

                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                    {session.net_earnings !== undefined && (
                        <Card
                            className={cn(
                                cardClass,
                                session.net_earnings > 0.01 &&
                                    'bg-emerald-50/50 dark:bg-emerald-950/20',
                                session.net_earnings < -0.01 && 'bg-rose-50/50 dark:bg-rose-950/20',
                            )}
                        >
                            <p className="text-xs uppercase text-slate-600">Saldo del día</p>
                            <p
                                className={cn(
                                    'mt-1 text-2xl font-bold',
                                    session.net_earnings > 0.01
                                        ? 'text-emerald-600'
                                        : session.net_earnings < -0.01
                                          ? 'text-rose-600'
                                          : 'text-slate-700',
                                )}
                            >
                                ${formatCurrency(Math.abs(session.net_earnings))}
                            </p>
                            {(session.personal_services_total ?? 0) > 0 && (
                                <p className="mt-1 text-xs text-violet-600">
                                    +${formatCurrency(session.personal_services_total ?? 0)} servicios
                                </p>
                            )}
                            {(session.total_expenses ?? 0) > 0 && (
                                <p className="mt-0.5 text-xs text-rose-600">
                                    −${formatCurrency(session.total_expenses ?? 0)} gastos
                                </p>
                            )}
                        </Card>
                    )}
                    <Card
                        className={cn(
                            cardClass,
                            summary.owesClikio && 'bg-amber-50/50 dark:bg-amber-950/20',
                            summary.clikioOwesYou && 'bg-violet-50/50 dark:bg-violet-950/20',
                        )}
                    >
                        <p className="text-xs uppercase text-slate-600">
                            Cuadre con {companyName}
                        </p>
                        {Math.abs(summary.settlement) >= 0.01 ? (
                            <p
                                className={cn(
                                    'mt-1 text-2xl font-bold',
                                    summary.owesClikio ? 'text-amber-700' : 'text-violet-700',
                                )}
                            >
                                {summary.owesClikio
                                    ? `Le debes $${formatCurrency(Math.abs(summary.settlement))}`
                                    : `Te debe $${formatCurrency(Math.abs(summary.settlement))}`}
                            </p>
                        ) : (
                            <p className="mt-1 text-2xl font-bold text-slate-600">Cuadrado</p>
                        )}
                        <p className="mt-1 text-xs text-slate-500">
                            {summary.count} pedidos en este día
                        </p>
                    </Card>
                    <Card className={`${cardClass} bg-emerald-50/50 dark:bg-emerald-950/20`}>
                        <p className="text-xs uppercase text-emerald-700">Mis ganancias</p>
                        <p className="mt-1 text-2xl font-bold text-emerald-600">
                            ${formatCurrency(summary.user_earnings)}
                        </p>
                    </Card>
                </div>

                {canViewPersonalService && (
                    <Card className={cardClass}>
                        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                            <div className="flex items-center gap-2">
                                <Briefcase className="h-5 w-5 text-violet-600" />
                                <h2 className="text-sm font-semibold text-slate-900 dark:text-white">
                                    Servicios propios del día
                                </h2>
                            </div>
                            {canEditPersonalService && (
                                <button
                                    type="button"
                                    onClick={openAddPersonalService}
                                    className="inline-flex items-center gap-1.5 rounded-lg border border-violet-200 bg-violet-50 px-3 py-1.5 text-xs font-semibold text-violet-700 hover:bg-violet-100 dark:border-violet-900/50 dark:bg-violet-950/30 dark:text-violet-400"
                                >
                                    <PlusCircle className="h-3.5 w-3.5" />
                                    Agregar servicio propio
                                </button>
                            )}
                        </div>

                        {personalServices.length === 0 ? (
                            <p className="text-sm text-slate-500">
                                Sin servicios propios registrados.
                            </p>
                        ) : (
                            <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-[#3a3a3a]">
                                <table className="w-full min-w-[640px] text-left text-sm">
                                    <thead>
                                        <tr className="border-b border-slate-200 bg-slate-50 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:border-[#3a3a3a] dark:bg-[#1f1f1f]">
                                            <th className="px-4 py-3">Nombre</th>
                                            <th className="px-4 py-3 text-right">Servicio</th>
                                            <th className="px-4 py-3 text-right">Gastado</th>
                                            <th className="px-4 py-3 text-right">
                                                Cobrar al cliente
                                            </th>
                                            {canEditPersonalService && (
                                                <th className="px-4 py-3 text-center">Acciones</th>
                                            )}
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100 dark:divide-[#333]">
                                        {personalServices.map((row, index) => (
                                            <tr
                                                key={row.id}
                                                className="text-slate-700 dark:text-slate-300"
                                            >
                                                <td className="px-4 py-3">
                                                    <span className="mr-2 text-xs text-slate-400">
                                                        {index + 1}.
                                                    </span>
                                                    {row.name}
                                                </td>
                                                <td className="px-4 py-3 text-right font-medium text-violet-600">
                                                    +${formatCurrency(row.amount)}
                                                </td>
                                                <td className="px-4 py-3 text-right">
                                                    {row.spent_amount !== null &&
                                                    row.spent_amount > 0
                                                        ? `$${formatCurrency(row.spent_amount)}`
                                                        : '—'}
                                                </td>
                                                <td className="px-4 py-3 text-right font-medium">
                                                    ${formatCurrency(row.client_charge)}
                                                </td>
                                                {canEditPersonalService && (
                                                    <td className="px-4 py-3">
                                                        <div className="flex justify-center gap-1">
                                                            <button
                                                                type="button"
                                                                onClick={() =>
                                                                    openEditPersonalService(row)
                                                                }
                                                                className="rounded p-1.5 text-slate-500 hover:bg-slate-100 dark:hover:bg-[#333]"
                                                                title="Editar servicio"
                                                            >
                                                                <Pencil className="h-4 w-4" />
                                                            </button>
                                                            <button
                                                                type="button"
                                                                onClick={() =>
                                                                    deletePersonalService(row)
                                                                }
                                                                className="rounded p-1.5 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/30"
                                                                title="Eliminar servicio"
                                                            >
                                                                <Trash2 className="h-4 w-4" />
                                                            </button>
                                                        </div>
                                                    </td>
                                                )}
                                            </tr>
                                        ))}
                                    </tbody>
                                    <tfoot>
                                        <tr className="border-t-2 border-slate-200 bg-slate-50 font-semibold text-slate-900 dark:border-[#3a3a3a] dark:bg-[#1f1f1f] dark:text-white">
                                            <td className="px-4 py-3">Total</td>
                                            <td className="px-4 py-3 text-right text-violet-600">
                                                +${formatCurrency(personalServicesTotal)}
                                            </td>
                                            <td colSpan={canEditPersonalService ? 3 : 2} />
                                        </tr>
                                    </tfoot>
                                </table>
                            </div>
                        )}
                    </Card>
                )}

                {canViewGasto && (
                    <Card className={cardClass}>
                        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                            <div className="flex items-center gap-2">
                                <Receipt className="h-5 w-5 text-rose-600" />
                                <h2 className="text-sm font-semibold text-slate-900 dark:text-white">
                                    Gastos del día
                                </h2>
                            </div>
                            {canEditGasto && (
                                <button
                                    type="button"
                                    onClick={openAddExpense}
                                    className="inline-flex items-center gap-1.5 rounded-lg border border-rose-200 bg-rose-50 px-3 py-1.5 text-xs font-semibold text-rose-700 hover:bg-rose-100 dark:border-rose-900/50 dark:bg-rose-950/30 dark:text-rose-400"
                                >
                                    <PlusCircle className="h-3.5 w-3.5" />
                                    Agregar gasto
                                </button>
                            )}
                        </div>

                        {expenses.length === 0 ? (
                            <p className="text-sm text-slate-500">Sin gastos registrados.</p>
                        ) : (
                            <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-[#3a3a3a]">
                                <table className="w-full min-w-[520px] text-left text-sm">
                                    <thead>
                                        <tr className="border-b border-slate-200 bg-slate-50 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:border-[#3a3a3a] dark:bg-[#1f1f1f]">
                                            <th className="px-4 py-3">Nombre</th>
                                            <th className="px-4 py-3 text-right">Cantidad</th>
                                            <th className="px-4 py-3">Concepto</th>
                                            {canEditGasto && (
                                                <th className="px-4 py-3 text-center">Acciones</th>
                                            )}
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100 dark:divide-[#333]">
                                        {expenses.map((row, index) => (
                                            <tr
                                                key={row.id}
                                                className="text-slate-700 dark:text-slate-300"
                                            >
                                                <td className="px-4 py-3">
                                                    <span className="mr-2 text-xs text-slate-400">
                                                        {index + 1}.
                                                    </span>
                                                    {row.name}
                                                </td>
                                                <td className="px-4 py-3 text-right font-medium text-rose-600">
                                                    ${formatCurrency(row.amount)}
                                                </td>
                                                <td className="px-4 py-3">{row.concept ?? '—'}</td>
                                                {canEditGasto && (
                                                    <td className="px-4 py-3">
                                                        <div className="flex justify-center gap-1">
                                                            <button
                                                                type="button"
                                                                onClick={() => openEditExpense(row)}
                                                                className="rounded p-1.5 text-slate-500 hover:bg-slate-100 dark:hover:bg-[#333]"
                                                                title="Editar gasto"
                                                            >
                                                                <Pencil className="h-4 w-4" />
                                                            </button>
                                                            <button
                                                                type="button"
                                                                onClick={() => deleteExpense(row)}
                                                                className="rounded p-1.5 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/30"
                                                                title="Eliminar gasto"
                                                            >
                                                                <Trash2 className="h-4 w-4" />
                                                            </button>
                                                        </div>
                                                    </td>
                                                )}
                                            </tr>
                                        ))}
                                    </tbody>
                                    <tfoot>
                                        <tr className="border-t-2 border-slate-200 bg-slate-50 font-semibold text-slate-900 dark:border-[#3a3a3a] dark:bg-[#1f1f1f] dark:text-white">
                                            <td className="px-4 py-3">Total</td>
                                            <td className="px-4 py-3 text-right text-rose-600">
                                                ${formatCurrency(expensesTotal)}
                                            </td>
                                            <td colSpan={canEditGasto ? 2 : 1} />
                                        </tr>
                                    </tfoot>
                                </table>
                            </div>
                        )}
                    </Card>
                )}

                <Card className={cardClass}>
                    <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                            <ClipboardList className="h-5 w-5 text-sidebar-active" />
                            <h2 className="text-sm font-semibold text-slate-900 dark:text-white">
                                Pedidos del día · {companyName}
                            </h2>
                        </div>
                        {canEditReparto && (
                            <button
                                type="button"
                                onClick={openAddEntry}
                                className="inline-flex items-center gap-1.5 rounded-lg bg-sidebar-active px-3 py-1.5 text-xs font-semibold text-white hover:opacity-90"
                            >
                                <PlusCircle className="h-3.5 w-3.5" />
                                Agregar pedido
                            </button>
                        )}
                    </div>

                    {entries.length === 0 ? (
                        <p className="text-sm text-slate-500">Sin pedidos registrados.</p>
                    ) : (
                        <SessionEntriesTable
                            entries={entries}
                            tableTotals={tableTotals}
                            companyName={companyName}
                            onEdit={canEditReparto ? loadEntry : undefined}
                            onDelete={canEditReparto ? deleteEntry : undefined}
                        />
                    )}
                </Card>

                <Dialog
                    open={entryDialogMode !== null}
                    onOpenChange={(open) => {
                        if (!open) resetEntryForm();
                    }}
                >
                    <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
                        <DialogHeader>
                            <DialogTitle>
                                {entryDialogMode === 'add'
                                    ? `Agregar pedido de ${companyName}`
                                    : 'Editar pedido'}
                            </DialogTitle>
                            <DialogDescription>
                                Comisiones, extras y descuentos se calculan al guardar.
                            </DialogDescription>
                        </DialogHeader>
                        <form onSubmit={submitEntry} className="space-y-3">
                            <div>
                                <Label className="mb-1 block text-xs text-slate-500">Nombre</Label>
                                <Input
                                    value={entryForm.data.name}
                                    onChange={(e) => entryForm.setData('name', e.target.value)}
                                    placeholder="Ej. Soriana"
                                    className={cn(entryForm.errors.name && 'border-rose-500')}
                                />
                                {entryForm.errors.name && (
                                    <p className="mt-1 text-xs text-rose-600">
                                        {entryForm.errors.name}
                                    </p>
                                )}
                            </div>
                            <div>
                                <Label className="mb-1 block text-xs text-slate-500">
                                    Monto del servicio ($)
                                </Label>
                                <Input
                                    type="number"
                                    min={0}
                                    step="0.01"
                                    value={entryForm.data.service_cost}
                                    onChange={(e) =>
                                        entryForm.setData('service_cost', e.target.value)
                                    }
                                />
                                <p className="mt-1.5 text-[11px] text-slate-500">
                                    Tu {userPercentage}% · Mi gan.: $
                                    {formatCurrency(commissionPreview.userCommission)} ·{' '}
                                    {companyName}: $
                                    {formatCurrency(commissionPreview.clikioCommission)}
                                </p>
                            </div>
                            <div className="grid grid-cols-3 gap-2">
                                <div>
                                    <Label className="mb-1 block text-[10px] text-slate-500">
                                        Extra tuyo
                                    </Label>
                                    <Input
                                        type="number"
                                        min={0}
                                        step="0.01"
                                        value={entryForm.data.user_extra}
                                        onChange={(e) =>
                                            entryForm.setData('user_extra', e.target.value)
                                        }
                                    />
                                </div>
                                <div>
                                    <Label className="mb-1 block text-[10px] text-slate-500">
                                        Extra {companyName}
                                    </Label>
                                    <Input
                                        type="number"
                                        min={0}
                                        step="0.01"
                                        value={entryForm.data.clikio_extra}
                                        onChange={(e) =>
                                            entryForm.setData('clikio_extra', e.target.value)
                                        }
                                    />
                                </div>
                                <div>
                                    <Label className="mb-1 block text-[10px] text-slate-500">
                                        Descuento
                                    </Label>
                                    <Input
                                        type="number"
                                        min={0}
                                        step="0.01"
                                        value={entryForm.data.discount}
                                        onChange={(e) =>
                                            entryForm.setData('discount', e.target.value)
                                        }
                                    />
                                </div>
                            </div>
                            <DialogFooter className="gap-2 sm:gap-0">
                                <button
                                    type="button"
                                    onClick={resetEntryForm}
                                    className="inline-flex h-10 items-center justify-center rounded-xl border border-slate-200 px-4 text-sm font-medium text-slate-700 hover:bg-slate-50 dark:border-[#3a3a3a] dark:text-slate-200 dark:hover:bg-[#2a2a2a]"
                                >
                                    Cancelar
                                </button>
                                <button
                                    type="submit"
                                    disabled={entryForm.processing}
                                    className="inline-flex h-10 items-center justify-center rounded-xl bg-sidebar-active px-4 text-sm font-semibold text-white disabled:opacity-50"
                                >
                                    {entryForm.processing
                                        ? 'Guardando...'
                                        : entryDialogMode === 'add'
                                          ? 'Agregar pedido'
                                          : 'Guardar cambios'}
                                </button>
                            </DialogFooter>
                        </form>
                    </DialogContent>
                </Dialog>

                <Dialog
                    open={personalServiceDialogMode !== null}
                    onOpenChange={(open) => {
                        if (!open) closeEditPersonalService();
                    }}
                >
                    <DialogContent className="sm:max-w-md">
                        <DialogHeader>
                            <DialogTitle>
                                {personalServiceDialogMode === 'add'
                                    ? 'Agregar servicio propio'
                                    : 'Editar servicio propio'}
                            </DialogTitle>
                            <DialogDescription>
                                Al guardar, se recalcula el saldo del día de esta jornada.
                            </DialogDescription>
                        </DialogHeader>
                        <form
                            onSubmit={submitEditPersonalService}
                            noValidate
                            className="space-y-4"
                        >
                            <div>
                                <Label
                                    htmlFor="edit_session_service_name"
                                    className="mb-1 block text-xs text-slate-500"
                                >
                                    Nombre del pedido
                                </Label>
                                <Input
                                    id="edit_session_service_name"
                                    value={editPersonalServiceForm.data.name}
                                    onChange={(e) =>
                                        editPersonalServiceForm.setData('name', e.target.value)
                                    }
                                    className={cn(
                                        editPersonalServiceForm.errors.name && 'border-rose-500',
                                    )}
                                />
                                {editPersonalServiceForm.errors.name && (
                                    <p className="mt-1 text-xs text-rose-600">
                                        {editPersonalServiceForm.errors.name}
                                    </p>
                                )}
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <Label
                                        htmlFor="edit_session_service_amount"
                                        className="mb-1 block text-xs text-slate-500"
                                    >
                                        Monto del servicio ($)
                                    </Label>
                                    <Input
                                        id="edit_session_service_amount"
                                        type="number"
                                        min={0.01}
                                        step="0.01"
                                        value={editPersonalServiceForm.data.amount}
                                        onChange={(e) =>
                                            editPersonalServiceForm.setData(
                                                'amount',
                                                e.target.value,
                                            )
                                        }
                                        className={cn(
                                            editPersonalServiceForm.errors.amount &&
                                                'border-rose-500',
                                        )}
                                    />
                                    {editPersonalServiceForm.errors.amount && (
                                        <p className="mt-1 text-xs text-rose-600">
                                            {editPersonalServiceForm.errors.amount}
                                        </p>
                                    )}
                                </div>
                                <div>
                                    <Label
                                        htmlFor="edit_session_service_spent"
                                        className="mb-1 block text-xs text-slate-500"
                                    >
                                        Monto gastado ($){' '}
                                        <span className="font-normal">opc.</span>
                                    </Label>
                                    <Input
                                        id="edit_session_service_spent"
                                        type="number"
                                        min={0}
                                        step="0.01"
                                        value={editPersonalServiceForm.data.spent_amount}
                                        onChange={(e) =>
                                            editPersonalServiceForm.setData(
                                                'spent_amount',
                                                e.target.value,
                                            )
                                        }
                                    />
                                </div>
                            </div>
                            <p className="text-[11px] text-slate-500">
                                Cobrar al cliente: ${formatCurrency(personalServiceClientCharge)}
                            </p>
                            <div>
                                <Label
                                    htmlFor="edit_session_service_description"
                                    className="mb-1 block text-xs text-slate-500"
                                >
                                    Descripción (opcional)
                                </Label>
                                <Input
                                    id="edit_session_service_description"
                                    value={editPersonalServiceForm.data.description}
                                    onChange={(e) =>
                                        editPersonalServiceForm.setData(
                                            'description',
                                            e.target.value,
                                        )
                                    }
                                />
                            </div>
                            <DialogFooter className="gap-2 sm:gap-0">
                                <button
                                    type="button"
                                    onClick={closeEditPersonalService}
                                    className="inline-flex h-10 items-center justify-center rounded-xl border border-slate-200 px-4 text-sm font-medium text-slate-700 hover:bg-slate-50 dark:border-[#3a3a3a] dark:text-slate-200 dark:hover:bg-[#2a2a2a]"
                                >
                                    Cancelar
                                </button>
                                <button
                                    type="submit"
                                    disabled={editPersonalServiceForm.processing}
                                    className="inline-flex h-10 items-center justify-center rounded-xl bg-sidebar-active px-4 text-sm font-semibold text-white disabled:opacity-50"
                                >
                                    {editPersonalServiceForm.processing
                                        ? 'Guardando...'
                                        : personalServiceDialogMode === 'add'
                                          ? 'Agregar servicio'
                                          : 'Guardar cambios'}
                                </button>
                            </DialogFooter>
                        </form>
                    </DialogContent>
                </Dialog>

                <Dialog
                    open={expenseDialogMode !== null}
                    onOpenChange={(open) => {
                        if (!open) closeEditExpense();
                    }}
                >
                    <DialogContent className="sm:max-w-md">
                        <DialogHeader>
                            <DialogTitle>
                                {expenseDialogMode === 'add' ? 'Agregar gasto' : 'Editar gasto'}
                            </DialogTitle>
                            <DialogDescription>
                                Al guardar, se recalculan los gastos y el saldo del día.
                            </DialogDescription>
                        </DialogHeader>
                        <form onSubmit={submitEditExpense} noValidate className="space-y-4">
                            <div>
                                <Label
                                    htmlFor="edit_session_expense_name"
                                    className="mb-1 block text-xs text-slate-500"
                                >
                                    Nombre del gasto
                                </Label>
                                <Input
                                    id="edit_session_expense_name"
                                    value={editExpenseForm.data.name}
                                    onChange={(e) =>
                                        editExpenseForm.setData('name', e.target.value)
                                    }
                                    className={cn(
                                        editExpenseForm.errors.name && 'border-rose-500',
                                    )}
                                />
                                {editExpenseForm.errors.name && (
                                    <p className="mt-1 text-xs text-rose-600">
                                        {editExpenseForm.errors.name}
                                    </p>
                                )}
                            </div>
                            <div>
                                <Label
                                    htmlFor="edit_session_expense_amount"
                                    className="mb-1 block text-xs text-slate-500"
                                >
                                    Cantidad ($)
                                </Label>
                                <Input
                                    id="edit_session_expense_amount"
                                    type="number"
                                    min={0.01}
                                    step="0.01"
                                    value={editExpenseForm.data.amount}
                                    onChange={(e) =>
                                        editExpenseForm.setData('amount', e.target.value)
                                    }
                                    className={cn(
                                        editExpenseForm.errors.amount && 'border-rose-500',
                                    )}
                                />
                                {editExpenseForm.errors.amount && (
                                    <p className="mt-1 text-xs text-rose-600">
                                        {editExpenseForm.errors.amount}
                                    </p>
                                )}
                            </div>
                            <div>
                                <Label
                                    htmlFor="edit_session_expense_concept"
                                    className="mb-1 block text-xs text-slate-500"
                                >
                                    Concepto (opcional)
                                </Label>
                                <Input
                                    id="edit_session_expense_concept"
                                    value={editExpenseForm.data.concept}
                                    onChange={(e) =>
                                        editExpenseForm.setData('concept', e.target.value)
                                    }
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
                                    disabled={editExpenseForm.processing}
                                    className="inline-flex h-10 items-center justify-center rounded-xl bg-sidebar-active px-4 text-sm font-semibold text-white disabled:opacity-50"
                                >
                                    {editExpenseForm.processing
                                        ? 'Guardando...'
                                        : expenseDialogMode === 'add'
                                          ? 'Agregar gasto'
                                          : 'Guardar cambios'}
                                </button>
                            </DialogFooter>
                        </form>
                    </DialogContent>
                </Dialog>
            </div>
        </AppLayout>
    );
}
