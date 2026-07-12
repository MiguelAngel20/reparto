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
import { Head, Link, router, useForm, usePage } from '@inertiajs/react';
import { useSectionAccess } from '@/hooks/useSectionAccess';
import {
    SessionHistoryList,
    type SessionHistoryItem,
} from '@/components/reparto/session-history-list';
import {
    ActiveOrdersBar,
    type ActiveOrderSummary,
} from '@/components/reparto/active-orders-bar';
import { Briefcase, Package, Pencil, Play, Receipt, Scale, Trash2, TrendingDown } from 'lucide-react';
import { confirmCloseCashSession, confirmAction } from '@/lib/sweetalert';
import { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';

type SessionOrderRow = {
    id: number;
    name: string;
    service_cost: number;
    user_commission: number;
    clikio_commission: number;
    user_extra: number;
    clikio_extra: number;
    clikio_discounts: number;
    client_charge: number;
};

type CashSessionData = SessionHistoryItem & {
    initial_amount: number;
    counted_amount?: number | null;
    cash_difference?: number | null;
    started_at: string;
    started_at_formatted: string;
    ended_at_formatted?: string | null;
    status: string;
    orders_count: number;
    completed_orders_count: number;
    total_service?: number;
    total_service_cash_in?: number;
    total_cash?: number;
    expected_cash_in_box?: number;
    clikio_earnings?: number;
    clikio_earnings_gross?: number;
    total_transfer_discount?: number;
    total_manual_discount?: number;
    work_duration_formatted?: string | null;
};

interface RepartoIndexProps {
    openSession: CashSessionData | null;
    sessionOrders: SessionOrderRow[];
    activeOrders: ActiveOrderSummary[];
    recentSessions: CashSessionData[];
    canStartJornadaToday: boolean;
    todayDateFormatted: string;
    todayBlockedMessage: string | null;
    userPercentage: number;
    companyName: string;
    totalExpensesToday: number;
    totalPersonalServicesToday: number;
    netEarningsToday: number;
}

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Dashboard', href: '/dashboard' },
    { title: 'Iniciar jornada', href: '/reparto' },
];

const cardClass =
    'border border-slate-200/80 bg-white p-6 shadow-sm dark:border-[#2b2b2b] dark:bg-[#262626]';

export default function RepartoIndex({
    openSession,
    sessionOrders,
    activeOrders,
    recentSessions,
    canStartJornadaToday,
    todayDateFormatted,
    todayBlockedMessage,
    userPercentage,
    companyName,
    totalExpensesToday,
    totalPersonalServicesToday,
    netEarningsToday,
}: RepartoIndexProps) {
    const { canEdit } = useSectionAccess('reparto');
    const { canEdit: canEditGasto } = useSectionAccess('gasto');
    const { canEdit: canEditPersonalService } = useSectionAccess('personal_service');
    const page = usePage();
    const flash = page.props.flash as { success?: string; error?: string } | undefined;
    const openForm = useForm({});
    const closeForm = useForm({});
    const startOrderForm = useForm({});
    const expenseForm = useForm({
        name: '',
        amount: '',
        concept: '',
    });
    const [expenseModalOpen, setExpenseModalOpen] = useState(false);
    const [personalServiceModalOpen, setPersonalServiceModalOpen] = useState(false);
    const personalServiceForm = useForm({
        name: '',
        amount: '',
        description: '',
    });

    const sessionSummary = useMemo(() => {
        if (!openSession) {
            return null;
        }
        const settlement = openSession.clikio_settlement ?? 0;

        return {
            settlement,
            owesClikio: settlement > 0,
            clikioOwesYou: settlement < 0,
            settlementAbs: Math.abs(settlement),
        };
    }, [openSession]);

    const orderTableTotals = useMemo(() => {
        return sessionOrders.reduce(
            (acc, row) => ({
                service_cost: acc.service_cost + row.service_cost,
                user_commission: acc.user_commission + row.user_commission,
                clikio_commission: acc.clikio_commission + row.clikio_commission,
                user_extra: acc.user_extra + row.user_extra,
                clikio_extra: acc.clikio_extra + row.clikio_extra,
                clikio_discounts: acc.clikio_discounts + row.clikio_discounts,
                client_charge: acc.client_charge + row.client_charge,
            }),
            {
                service_cost: 0,
                user_commission: 0,
                clikio_commission: 0,
                user_extra: 0,
                clikio_extra: 0,
                clikio_discounts: 0,
                client_charge: 0,
            },
        );
    }, [sessionOrders]);

    useEffect(() => {
        if (flash?.success) toast.success(flash.success);
        if (flash?.error) toast.error(flash.error);
    }, [flash?.success, flash?.error]);

    useEffect(() => {
        if (!openSession) {
            return;
        }

        const intervalId = window.setInterval(() => {
            router.reload({
                only: [
                    'openSession',
                    'sessionOrders',
                    'activeOrders',
                    'totalExpensesToday',
                    'totalPersonalServicesToday',
                    'netEarningsToday',
                ],
            });
        }, 5000);

        return () => window.clearInterval(intervalId);
    }, [openSession?.id]);

    const startJornada = () => {
        if (!canStartJornadaToday) {
            return;
        }

        openForm.post('/reparto/caja', { preserveScroll: true });
    };

    const startOrder = () => {
        startOrderForm.post('/reparto/pedidos/iniciar');
    };

    const submitCloseCaja = async () => {
        if (!openSession) return;

        const confirmed = await confirmCloseCashSession();
        if (!confirmed) return;

        closeForm.post('/reparto/caja/cerrar', { preserveScroll: true });
    };

    const submitExpense = (e: React.FormEvent) => {
        e.preventDefault();
        expenseForm.post('/gasto', {
            preserveScroll: true,
            onSuccess: () => {
                expenseForm.reset();
                setExpenseModalOpen(false);
            },
        });
    };

    const submitPersonalService = (e: React.FormEvent) => {
        e.preventDefault();
        personalServiceForm.post('/mis-servicios', {
            preserveScroll: true,
            onSuccess: () => {
                personalServiceForm.reset();
                setPersonalServiceModalOpen(false);
            },
        });
    };

    const deleteSessionOrder = async (orderId: number, orderName: string) => {
        if (!openSession) return;

        const confirmed = await confirmAction({
            title: '¿Eliminar pedido?',
            text: `${orderName} — se recalcularán las ganancias y el cuadre del día.`,
            confirmText: 'Sí, eliminar',
            icon: 'warning',
        });

        if (!confirmed) return;

        router.delete(`/reparto/jornada/${openSession.id}/pedidos/${orderId}`, {
            preserveScroll: true,
        });
    };

    const myEarningsToday =
        (openSession?.user_earnings ?? 0) + totalPersonalServicesToday;

    return (
        <AppLayout breadcrumbs={breadcrumbs} title="Iniciar jornada">
            <Head title="Iniciar jornada" />

            <div className="flex w-full flex-col gap-6">
                {!openSession ? (
                    <Card className={cardClass}>
                        <div className="mb-6 flex items-start gap-4">
                            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-sidebar-active/10 text-sidebar-active">
                                <Package className="h-6 w-6" />
                            </div>
                            <div>
                                <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
                                    Iniciar jornada
                                </h2>
                                <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                                    Comienza tu jornada del día ({todayDateFormatted}). Solo una
                                    jornada por día.
                                </p>
                            </div>
                        </div>

                        {!canStartJornadaToday && todayBlockedMessage && (
                            <p className="mb-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-200">
                                {todayBlockedMessage} Podrás iniciar jornada mañana.
                            </p>
                        )}

                        {canEdit && (
                        <button
                            type="button"
                            onClick={startJornada}
                            disabled={openForm.processing || !canStartJornadaToday}
                            className="inline-flex h-11 items-center gap-2 rounded-xl bg-sidebar-active px-6 text-sm font-semibold text-white hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                            <Play className="h-4 w-4" />
                            {openForm.processing ? 'Iniciando...' : 'Iniciar jornada'}
                        </button>
                        )}
                    </Card>
                ) : null}

                {!openSession && !canStartJornadaToday && (
                    <Card
                        className={cn(
                            cardClass,
                            'p-4',
                            netEarningsToday > 0.01 && 'border-emerald-200 dark:border-emerald-900/50',
                            netEarningsToday < -0.01 && 'border-rose-200 dark:border-rose-900/50',
                        )}
                    >
                        <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                            Saldo del día · {todayDateFormatted}
                        </p>
                        <p
                            className={cn(
                                'mt-1 font-mono text-3xl font-bold tabular-nums',
                                netEarningsToday > 0.01
                                    ? 'text-emerald-600 dark:text-emerald-400'
                                    : netEarningsToday < -0.01
                                      ? 'text-rose-600 dark:text-rose-400'
                                      : 'text-slate-900 dark:text-white',
                            )}
                        >
                            ${formatCurrency(Math.abs(netEarningsToday))}
                        </p>
                        {netEarningsToday < -0.01 && (
                            <p className="mt-0.5 text-sm font-semibold text-rose-600 dark:text-rose-400">
                                en negativo
                            </p>
                        )}
                    </Card>
                )}

                {openSession ? (
                    <>
                        <Card className={`${cardClass} border-2 border-sidebar-active/30 p-4 sm:p-5`}>
                            {/* Móvil: 4 cards compactas en grid 2×2 */}
                            <div className="grid grid-cols-2 items-stretch gap-2.5 md:hidden">
                                <div
                                    className={cn(
                                        'flex h-full min-h-0 flex-col gap-0.5 rounded-xl px-2.5 py-2',
                                        netEarningsToday > 0.01
                                            ? 'bg-emerald-50 dark:bg-emerald-950/30'
                                            : netEarningsToday < -0.01
                                              ? 'bg-rose-50 dark:bg-rose-950/30'
                                              : 'bg-slate-50 dark:bg-[#1f1f1f]',
                                    )}
                                >
                                    <p className="text-[9px] font-semibold uppercase tracking-wide text-slate-500">
                                        Saldo del día
                                    </p>
                                    <p
                                        className={cn(
                                            'font-mono text-lg font-bold tabular-nums leading-tight',
                                            netEarningsToday > 0.01
                                                ? 'text-emerald-600 dark:text-emerald-400'
                                                : netEarningsToday < -0.01
                                                  ? 'text-rose-600 dark:text-rose-400'
                                                  : 'text-sidebar-active',
                                        )}
                                    >
                                        ${formatCurrency(Math.abs(netEarningsToday))}
                                    </p>
                                    {netEarningsToday < -0.01 && (
                                        <p className="text-[10px] font-semibold leading-tight text-rose-600 dark:text-rose-400">
                                            en negativo
                                        </p>
                                    )}
                                    <p className="text-[9px] leading-tight text-slate-500">
                                        {openSession.completed_orders_count}{' '}
                                        pedido{openSession.completed_orders_count !== 1 ? 's' : ''}
                                        {openSession.orders_count > openSession.completed_orders_count &&
                                            ` · +${openSession.orders_count - openSession.completed_orders_count} en curso`}
                                    </p>
                                </div>

                                <div className="flex h-full min-h-0 flex-col gap-0.5 rounded-xl bg-rose-50 px-2.5 py-2 dark:bg-rose-950/30">
                                    <div className="flex items-center gap-1 text-[9px] font-semibold uppercase text-rose-700 dark:text-rose-400">
                                        <TrendingDown className="h-3 w-3 shrink-0" />
                                        Gastos del día
                                    </div>
                                    <p className="font-mono text-lg font-bold tabular-nums leading-tight text-rose-600 dark:text-rose-400">
                                        ${formatCurrency(totalExpensesToday)}
                                    </p>
                                    <p className="text-[9px] leading-tight text-rose-600/70 dark:text-rose-400/70">
                                        Registrados hoy
                                    </p>
                                </div>

                                <div className="flex h-full min-h-0 flex-col gap-0.5 rounded-xl bg-emerald-50 px-2.5 py-2 dark:bg-emerald-950/30">
                                    <p className="text-[9px] font-semibold uppercase text-emerald-700 dark:text-emerald-400">
                                        Mis ganancias
                                    </p>
                                    <p className="font-mono text-lg font-bold tabular-nums leading-tight text-emerald-600 dark:text-emerald-400">
                                        ${formatCurrency(myEarningsToday)}
                                    </p>
                                    {totalPersonalServicesToday > 0 && (
                                        <p className="text-[9px] leading-tight text-slate-500">
                                            +${formatCurrency(totalPersonalServicesToday)} servicios
                                            propios
                                        </p>
                                    )}
                                    <p className="text-[9px] leading-tight text-emerald-600/70 dark:text-emerald-400/70">
                                        Jornada + propios
                                    </p>
                                </div>

                                <div
                                    className={cn(
                                        'flex h-full min-h-0 flex-col gap-0.5 rounded-xl px-2.5 py-2',
                                        sessionSummary?.owesClikio &&
                                            'bg-amber-50 dark:bg-amber-950/30',
                                        sessionSummary?.clikioOwesYou &&
                                            'bg-violet-50 dark:bg-violet-950/30',
                                        sessionSummary &&
                                            Math.abs(sessionSummary.settlement) < 0.01 &&
                                            'bg-slate-50 dark:bg-[#1f1f1f]',
                                    )}
                                >
                                    {sessionSummary && Math.abs(sessionSummary.settlement) >= 0.01 ? (
                                        <>
                                            <p
                                                className={cn(
                                                    'text-[9px] font-semibold leading-tight',
                                                    sessionSummary.owesClikio
                                                        ? 'text-amber-800 dark:text-amber-300'
                                                        : 'text-violet-800 dark:text-violet-300',
                                                )}
                                            >
                                                {sessionSummary.owesClikio
                                                    ? `Le debes a ${companyName}`
                                                    : `Te debe ${companyName}`}
                                            </p>
                                            <p
                                                className={cn(
                                                    'font-mono text-lg font-bold tabular-nums leading-tight',
                                                    sessionSummary.owesClikio
                                                        ? 'text-amber-700 dark:text-amber-400'
                                                        : 'text-violet-700 dark:text-violet-400',
                                                )}
                                            >
                                                ${formatCurrency(sessionSummary.settlementAbs)}
                                            </p>
                                            <p
                                                className={cn(
                                                    'text-[9px] leading-tight',
                                                    sessionSummary.owesClikio
                                                        ? 'text-amber-700/70 dark:text-amber-400/70'
                                                        : 'text-violet-700/70 dark:text-violet-400/70',
                                                )}
                                            >
                                                Cuadre con {companyName}
                                            </p>
                                        </>
                                    ) : (
                                        <p className="text-[10px] font-semibold leading-tight text-slate-600 dark:text-slate-300">
                                            Cuadrado con {companyName}
                                        </p>
                                    )}
                                </div>
                            </div>

                            {/* Tablet y escritorio: saldo destacado + fila de resumen */}
                            <div className="hidden md:block">
                                <div className="flex items-start justify-between gap-4">
                                    <div className="min-w-0 flex-1">
                                        <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                                            Saldo del día
                                        </p>
                                        <div className="mt-1">
                                            <p
                                                className={cn(
                                                    'font-mono text-4xl font-bold tabular-nums',
                                                    netEarningsToday > 0.01
                                                        ? 'text-emerald-600 dark:text-emerald-400'
                                                        : netEarningsToday < -0.01
                                                          ? 'text-rose-600 dark:text-rose-400'
                                                          : 'text-sidebar-active',
                                                )}
                                            >
                                                ${formatCurrency(Math.abs(netEarningsToday))}
                                            </p>
                                            {netEarningsToday < -0.01 && (
                                                <p className="mt-0.5 text-sm font-semibold text-rose-600 dark:text-rose-400">
                                                    en negativo
                                                </p>
                                            )}
                                        </div>
                                        <p className="mt-1 text-xs text-slate-500">
                                            {openSession.completed_orders_count}{' '}
                                            pedido{openSession.completed_orders_count !== 1 ? 's' : ''}
                                            {openSession.orders_count > openSession.completed_orders_count &&
                                                ` · +${openSession.orders_count - openSession.completed_orders_count} en curso`}
                                        </p>
                                    </div>
                                    <div className="shrink-0 rounded-xl bg-rose-50 px-4 py-3 text-right dark:bg-rose-950/30">
                                        <div className="flex items-center justify-end gap-1 text-[10px] font-semibold uppercase text-rose-700 dark:text-rose-400">
                                            <TrendingDown className="h-3.5 w-3.5" />
                                            Gastos del día
                                        </div>
                                        <p className="mt-1 text-xl font-bold tabular-nums text-rose-600 dark:text-rose-400">
                                            ${formatCurrency(totalExpensesToday)}
                                        </p>
                                    </div>
                                </div>

                                <div className="mt-4 grid grid-cols-2 gap-3">
                                    <div className="rounded-xl bg-emerald-50 px-3 py-3 dark:bg-emerald-950/30">
                                        <p className="text-[10px] font-semibold uppercase text-emerald-700 dark:text-emerald-400">
                                            Mis ganancias
                                        </p>
                                        <p className="mt-0.5 text-lg font-bold tabular-nums text-emerald-600 dark:text-emerald-400">
                                            ${formatCurrency(myEarningsToday)}
                                        </p>
                                        {totalPersonalServicesToday > 0 && (
                                            <p className="mt-0.5 text-[10px] text-slate-500">
                                                +${formatCurrency(totalPersonalServicesToday)} servicios
                                                propios
                                            </p>
                                        )}
                                    </div>
                                    <div
                                        className={cn(
                                            'rounded-xl px-3 py-3',
                                            sessionSummary?.owesClikio &&
                                                'bg-amber-50 dark:bg-amber-950/30',
                                            sessionSummary?.clikioOwesYou &&
                                                'bg-violet-50 dark:bg-violet-950/30',
                                            sessionSummary &&
                                                Math.abs(sessionSummary.settlement) < 0.01 &&
                                                'bg-slate-50 dark:bg-[#1f1f1f]',
                                        )}
                                    >
                                        {sessionSummary && Math.abs(sessionSummary.settlement) >= 0.01 ? (
                                            <>
                                                <p
                                                    className={cn(
                                                        'text-xs font-semibold leading-tight',
                                                        sessionSummary.owesClikio
                                                            ? 'text-amber-800 dark:text-amber-300'
                                                            : 'text-violet-800 dark:text-violet-300',
                                                    )}
                                                >
                                                    {sessionSummary.owesClikio
                                                        ? `Le debes a ${companyName}`
                                                        : `Te debe ${companyName}`}
                                                </p>
                                                <p
                                                    className={cn(
                                                        'mt-0.5 text-lg font-bold tabular-nums',
                                                        sessionSummary.owesClikio
                                                            ? 'text-amber-700 dark:text-amber-400'
                                                            : 'text-violet-700 dark:text-violet-400',
                                                    )}
                                                >
                                                    ${formatCurrency(sessionSummary.settlementAbs)}
                                                </p>
                                            </>
                                        ) : (
                                            <p className="text-sm font-semibold text-slate-600 dark:text-slate-300">
                                                Cuadrado con {companyName}
                                            </p>
                                        )}
                                    </div>
                                </div>
                            </div>

                            {canEdit && (
                            <div className="mt-4 grid grid-cols-1 gap-2 min-[350px]:grid-cols-2">
                                <button
                                    type="button"
                                    onClick={startOrder}
                                    disabled={startOrderForm.processing}
                                    className="inline-flex h-12 items-center justify-center gap-1.5 whitespace-nowrap rounded-xl bg-sidebar-active px-2 text-xs font-semibold text-white hover:opacity-90 disabled:opacity-50 sm:gap-2 sm:text-sm"
                                >
                                    <Package className="h-4 w-4 shrink-0" />
                                    {startOrderForm.processing ? '...' : 'Nuevo pedido'}
                                </button>
                                <button
                                    type="button"
                                    onClick={submitCloseCaja}
                                    disabled={closeForm.processing}
                                    className="inline-flex h-12 items-center justify-center gap-1.5 whitespace-nowrap rounded-xl border-2 border-sidebar-active px-2 text-xs font-semibold text-sidebar-active hover:bg-sidebar-active/10 disabled:opacity-50 sm:gap-2 sm:text-sm"
                                >
                                    <Scale className="h-4 w-4 shrink-0" />
                                    {closeForm.processing ? '...' : 'Finalizar jornada'}
                                </button>
                            </div>
                            )}

                            {canEditGasto && (
                            <>
                            <button
                                type="button"
                                onClick={() => setExpenseModalOpen(true)}
                                className="mt-2 inline-flex h-12 w-full items-center justify-center gap-2 rounded-xl border border-rose-200 bg-rose-50 text-sm font-semibold text-rose-700 hover:bg-rose-100 dark:border-rose-900/50 dark:bg-rose-950/30 dark:text-rose-400 dark:hover:bg-rose-950/50"
                            >
                                <Receipt className="h-4 w-4 shrink-0" />
                                Agregar gasto
                            </button>

                            <Dialog
                                open={expenseModalOpen}
                                onOpenChange={(open) => {
                                    setExpenseModalOpen(open);
                                    if (!open) {
                                        expenseForm.reset();
                                        expenseForm.clearErrors();
                                    }
                                }}
                            >
                                <DialogContent className="sm:max-w-md">
                                    <DialogHeader>
                                        <DialogTitle>Agregar gasto del día</DialogTitle>
                                        <DialogDescription>
                                            Registra un gasto sin salir de la jornada. Se restará de
                                            tu saldo del día.
                                        </DialogDescription>
                                    </DialogHeader>

                                    <form onSubmit={submitExpense} noValidate className="space-y-4">
                                        <div>
                                            <Label
                                                htmlFor="jornada_expense_name"
                                                className="mb-1 block text-xs text-slate-500"
                                            >
                                                Nombre del gasto
                                            </Label>
                                            <Input
                                                id="jornada_expense_name"
                                                value={expenseForm.data.name}
                                                onChange={(e) =>
                                                    expenseForm.setData('name', e.target.value)
                                                }
                                                placeholder="Ej. Gasolina, comida"
                                                className={cn(
                                                    expenseForm.errors.name && 'border-rose-500',
                                                )}
                                            />
                                            {expenseForm.errors.name && (
                                                <p className="mt-1 text-xs text-rose-600">
                                                    {expenseForm.errors.name}
                                                </p>
                                            )}
                                        </div>

                                        <div>
                                            <Label
                                                htmlFor="jornada_expense_amount"
                                                className="mb-1 block text-xs text-slate-500"
                                            >
                                                Cantidad ($)
                                            </Label>
                                            <Input
                                                id="jornada_expense_amount"
                                                type="number"
                                                min={0.01}
                                                step="0.01"
                                                value={expenseForm.data.amount}
                                                onChange={(e) =>
                                                    expenseForm.setData('amount', e.target.value)
                                                }
                                                placeholder="0.00"
                                                className={cn(
                                                    expenseForm.errors.amount && 'border-rose-500',
                                                )}
                                            />
                                            {expenseForm.errors.amount && (
                                                <p className="mt-1 text-xs text-rose-600">
                                                    {expenseForm.errors.amount}
                                                </p>
                                            )}
                                        </div>

                                        <div>
                                            <Label
                                                htmlFor="jornada_expense_concept"
                                                className="mb-1 block text-xs text-slate-500"
                                            >
                                                Concepto (opcional)
                                            </Label>
                                            <Input
                                                id="jornada_expense_concept"
                                                value={expenseForm.data.concept}
                                                onChange={(e) =>
                                                    expenseForm.setData('concept', e.target.value)
                                                }
                                                placeholder="Detalle adicional"
                                            />
                                        </div>

                                        <DialogFooter className="gap-2 sm:gap-0">
                                            <button
                                                type="button"
                                                onClick={() => setExpenseModalOpen(false)}
                                                className="inline-flex h-10 items-center justify-center rounded-xl border border-slate-200 px-4 text-sm font-medium text-slate-700 hover:bg-slate-50 dark:border-[#3a3a3a] dark:text-slate-200 dark:hover:bg-[#2a2a2a]"
                                            >
                                                Cancelar
                                            </button>
                                            <button
                                                type="submit"
                                                disabled={expenseForm.processing}
                                                className="inline-flex h-10 items-center justify-center rounded-xl bg-sidebar-active px-4 text-sm font-semibold text-white disabled:opacity-50"
                                            >
                                                {expenseForm.processing
                                                    ? 'Guardando...'
                                                    : 'Guardar gasto'}
                                            </button>
                                        </DialogFooter>
                                    </form>
                                </DialogContent>
                            </Dialog>
                            </>
                            )}

                            {canEditPersonalService && (
                            <>
                            <button
                                type="button"
                                onClick={() => setPersonalServiceModalOpen(true)}
                                className="mt-2 inline-flex h-12 w-full items-center justify-center gap-2 rounded-xl border border-violet-200 bg-violet-50 text-sm font-semibold text-violet-700 hover:bg-violet-100 dark:border-violet-900/50 dark:bg-violet-950/30 dark:text-violet-400 dark:hover:bg-violet-950/50"
                            >
                                <Briefcase className="h-4 w-4 shrink-0" />
                                Agregar servicio propio
                            </button>

                            <Dialog
                                open={personalServiceModalOpen}
                                onOpenChange={(open) => {
                                    setPersonalServiceModalOpen(open);
                                    if (!open) {
                                        personalServiceForm.reset();
                                        personalServiceForm.clearErrors();
                                    }
                                }}
                            >
                                <DialogContent className="sm:max-w-md">
                                    <DialogHeader>
                                        <DialogTitle>Agregar servicio propio</DialogTitle>
                                        <DialogDescription>
                                            Servicio fuera de la empresa. El monto completo suma a
                                            tus ganancias del día.
                                        </DialogDescription>
                                    </DialogHeader>

                                    <form
                                        onSubmit={submitPersonalService}
                                        noValidate
                                        className="space-y-4"
                                    >
                                        <div>
                                            <Label
                                                htmlFor="jornada_service_name"
                                                className="mb-1 block text-xs text-slate-500"
                                            >
                                                Nombre del pedido
                                            </Label>
                                            <Input
                                                id="jornada_service_name"
                                                value={personalServiceForm.data.name}
                                                onChange={(e) =>
                                                    personalServiceForm.setData('name', e.target.value)
                                                }
                                                placeholder="Ej. Reparto express"
                                                className={cn(
                                                    personalServiceForm.errors.name &&
                                                        'border-rose-500',
                                                )}
                                            />
                                            {personalServiceForm.errors.name && (
                                                <p className="mt-1 text-xs text-rose-600">
                                                    {personalServiceForm.errors.name}
                                                </p>
                                            )}
                                        </div>

                                        <div>
                                            <Label
                                                htmlFor="jornada_service_amount"
                                                className="mb-1 block text-xs text-slate-500"
                                            >
                                                Monto ($)
                                            </Label>
                                            <Input
                                                id="jornada_service_amount"
                                                type="number"
                                                min={0.01}
                                                step="0.01"
                                                value={personalServiceForm.data.amount}
                                                onChange={(e) =>
                                                    personalServiceForm.setData(
                                                        'amount',
                                                        e.target.value,
                                                    )
                                                }
                                                placeholder="0.00"
                                                className={cn(
                                                    personalServiceForm.errors.amount &&
                                                        'border-rose-500',
                                                )}
                                            />
                                            {personalServiceForm.errors.amount && (
                                                <p className="mt-1 text-xs text-rose-600">
                                                    {personalServiceForm.errors.amount}
                                                </p>
                                            )}
                                        </div>

                                        <div>
                                            <Label
                                                htmlFor="jornada_service_description"
                                                className="mb-1 block text-xs text-slate-500"
                                            >
                                                Descripción (opcional)
                                            </Label>
                                            <Input
                                                id="jornada_service_description"
                                                value={personalServiceForm.data.description}
                                                onChange={(e) =>
                                                    personalServiceForm.setData(
                                                        'description',
                                                        e.target.value,
                                                    )
                                                }
                                                placeholder="Detalle del servicio"
                                            />
                                        </div>

                                        <DialogFooter className="gap-2 sm:gap-0">
                                            <button
                                                type="button"
                                                onClick={() => setPersonalServiceModalOpen(false)}
                                                className="inline-flex h-10 items-center justify-center rounded-xl border border-slate-200 px-4 text-sm font-medium text-slate-700 hover:bg-slate-50 dark:border-[#3a3a3a] dark:text-slate-200 dark:hover:bg-[#2a2a2a]"
                                            >
                                                Cancelar
                                            </button>
                                            <button
                                                type="submit"
                                                disabled={personalServiceForm.processing}
                                                className="inline-flex h-10 items-center justify-center rounded-xl bg-sidebar-active px-4 text-sm font-semibold text-white disabled:opacity-50"
                                            >
                                                {personalServiceForm.processing
                                                    ? 'Guardando...'
                                                    : 'Guardar servicio'}
                                            </button>
                                        </DialogFooter>
                                    </form>
                                </DialogContent>
                            </Dialog>
                            </>
                            )}
                        </Card>

                        {activeOrders.length > 0 && (
                            <ActiveOrdersBar orders={activeOrders} showNewOrderButton={canEdit} />
                        )}

                        <Card className={`${cardClass} p-4 sm:p-5`}>
                            <h3 className="mb-3 text-sm font-semibold text-slate-900 dark:text-white">
                                Pedidos del día
                            </h3>

                            {sessionOrders.length === 0 ? (
                                <p className="text-sm text-slate-500">Sin pedidos finalizados.</p>
                            ) : (
                                <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-[#3a3a3a]">
                                    <table className="w-full min-w-[800px] text-left text-sm">
                                        <thead>
                                            <tr className="border-b border-slate-200 bg-slate-50 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:border-[#3a3a3a] dark:bg-[#1f1f1f]">
                                                <th className="px-4 py-3">Nombre</th>
                                                <th className="px-4 py-3 text-right">Costo</th>
                                                <th className="px-4 py-3 text-right">Mi ganancia</th>
                                                <th className="px-4 py-3 text-right">
                                                    Ganancia {companyName}
                                                </th>
                                                <th className="px-4 py-3 text-right">Extra</th>
                                                <th className="px-4 py-3 text-right">
                                                    Extra {companyName}
                                                </th>
                                                <th className="px-4 py-3 text-right">
                                                    Descuentos {companyName}
                                                </th>
                                                <th className="px-4 py-3 text-right">
                                                    Cobro al cliente
                                                </th>
                                                {canEdit && (
                                                    <th className="px-4 py-3 text-center">Acciones</th>
                                                )}
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-100 dark:divide-[#333]">
                                            {sessionOrders.map((row, index) => (
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
                                                    <td className="px-4 py-3 text-right font-medium">
                                                        ${formatCurrency(row.service_cost)}
                                                    </td>
                                                    <td className="px-4 py-3 text-right text-emerald-600">
                                                        ${formatCurrency(row.user_commission)}
                                                    </td>
                                                    <td className="px-4 py-3 text-right text-blue-600">
                                                        ${formatCurrency(row.clikio_commission)}
                                                    </td>
                                                    <td className="px-4 py-3 text-right">
                                                        {row.user_extra > 0
                                                            ? `$${formatCurrency(row.user_extra)}`
                                                            : '—'}
                                                    </td>
                                                    <td className="px-4 py-3 text-right">
                                                        {row.clikio_extra > 0
                                                            ? `$${formatCurrency(row.clikio_extra)}`
                                                            : '—'}
                                                    </td>
                                                    <td className="px-4 py-3 text-right text-amber-600">
                                                        {row.clikio_discounts > 0
                                                            ? `$${formatCurrency(row.clikio_discounts)}`
                                                            : '—'}
                                                    </td>
                                                    <td className="px-4 py-3 text-right font-medium text-slate-800 dark:text-slate-100">
                                                        ${formatCurrency(row.client_charge)}
                                                    </td>
                                                    {canEdit && (
                                                    <td className="px-4 py-3">
                                                        <div className="flex justify-center gap-1">
                                                            <Link
                                                                href={`/reparto/pedidos/${row.id}/editar`}
                                                                className="rounded p-1.5 text-slate-500 hover:bg-slate-100 dark:hover:bg-[#333]"
                                                                title="Editar pedido"
                                                            >
                                                                <Pencil className="h-4 w-4" />
                                                            </Link>
                                                            <button
                                                                type="button"
                                                                onClick={() =>
                                                                    deleteSessionOrder(
                                                                        row.id,
                                                                        row.name,
                                                                    )
                                                                }
                                                                className="rounded p-1.5 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/30"
                                                                title="Eliminar pedido"
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
                                                <td className="px-4 py-3 text-right">
                                                    ${formatCurrency(orderTableTotals.service_cost)}
                                                </td>
                                                <td className="px-4 py-3 text-right text-emerald-600">
                                                    $
                                                    {formatCurrency(
                                                        orderTableTotals.user_commission,
                                                    )}
                                                </td>
                                                <td className="px-4 py-3 text-right text-blue-600">
                                                    $
                                                    {formatCurrency(
                                                        orderTableTotals.clikio_commission,
                                                    )}
                                                </td>
                                                <td className="px-4 py-3 text-right">
                                                    $
                                                    {formatCurrency(orderTableTotals.user_extra)}
                                                </td>
                                                <td className="px-4 py-3 text-right">
                                                    $
                                                    {formatCurrency(orderTableTotals.clikio_extra)}
                                                </td>
                                                <td className="px-4 py-3 text-right text-amber-600">
                                                    $
                                                    {formatCurrency(
                                                        orderTableTotals.clikio_discounts,
                                                    )}
                                                </td>
                                                <td className="px-4 py-3 text-right">
                                                    $
                                                    {formatCurrency(orderTableTotals.client_charge)}
                                                </td>
                                                <td />
                                                {canEdit && <td />}
                                            </tr>
                                        </tfoot>
                                    </table>
                                </div>
                            )}
                        </Card>
                    </>
                ) : null}

                <SessionHistoryList
                    sessions={recentSessions}
                    companyName={companyName}
                    title="Jornadas recientes"
                    showWorkDuration
                    showEditButton={canEdit}
                    showDeleteButton={canEdit}
                    editHref={(id) => `/reparto/jornada/${id}/editar`}
                    deleteHref={(id) => `/reparto/jornada/${id}`}
                    deleteLabel="jornada"
                />
            </div>
        </AppLayout>
    );
}
