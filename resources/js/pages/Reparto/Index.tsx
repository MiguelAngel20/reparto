import AppLayout from '@/layouts/app-layout';
import { AuthFormField } from '@/components/auth/auth-form-field';
import { Card } from '@/components/ui';
import { formatCurrency, cn } from '@/lib/utils';
import { validateOpenCashSession } from '@/lib/reparto-validation';
import { type BreadcrumbItem } from '@/types';
import { Head, Link, useForm, usePage } from '@inertiajs/react';
import {
    SessionHistoryList,
    type SessionHistoryItem,
} from '@/components/reparto/session-history-list';
import {
    ActiveOrdersBar,
    type ActiveOrderSummary,
} from '@/components/reparto/active-orders-bar';
import { Package, Pencil, Play, Scale, Wallet } from 'lucide-react';
import { confirmCloseCashSession } from '@/lib/sweetalert';
import { useEffect, useMemo } from 'react';
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
}: RepartoIndexProps) {
    const page = usePage();
    const flash = page.props.flash as { success?: string; error?: string } | undefined;
    const openForm = useForm({ initial_amount: '', notes: '' });
    const closeForm = useForm({});
    const startOrderForm = useForm({});

    const sessionSummary = useMemo(() => {
        if (!openSession) {
            return null;
        }
        const expected = openSession.expected_cash_in_box ?? openSession.initial_amount;
        const settlement = openSession.clikio_settlement ?? 0;
        const yourCash = Math.round((expected - settlement) * 100) / 100;

        return {
            expected,
            settlement,
            yourCash,
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

    const clearInitialAmountError = () => {
        if (openForm.errors.initial_amount) {
            openForm.clearErrors('initial_amount');
        }
    };

    const submitOpenCaja = (e: React.FormEvent) => {
        e.preventDefault();
        if (!canStartJornadaToday) {
            return;
        }

        openForm.clearErrors();

        const clientErrors = validateOpenCashSession(openForm.data);
        if (clientErrors.initial_amount) {
            openForm.setError('initial_amount', clientErrors.initial_amount);
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

    return (
        <AppLayout breadcrumbs={breadcrumbs} title="Iniciar jornada">
            <Head title="Iniciar jornada" />

            <div className="flex w-full flex-col gap-6">
                {!openSession ? (
                    <Card className={cardClass}>
                        <div className="mb-6 flex items-start gap-4">
                            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-sidebar-active/10 text-sidebar-active">
                                <Wallet className="h-6 w-6" />
                            </div>
                            <div>
                                <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
                                    Abrir caja
                                </h2>
                                <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                                    Efectivo con el que sales a repartir. Solo una jornada por
                                    día ({todayDateFormatted}).
                                </p>
                            </div>
                        </div>

                        {!canStartJornadaToday && todayBlockedMessage && (
                            <p className="mb-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-200">
                                {todayBlockedMessage} Podrás iniciar jornada mañana.
                            </p>
                        )}

                        <form onSubmit={submitOpenCaja} noValidate className="max-w-md">
                            <AuthFormField
                                id="initial_amount"
                                label="Monto inicial de caja ($)"
                                error={openForm.errors.initial_amount}
                                icon={<Wallet className="h-4 w-4" />}
                                inputProps={{
                                    type: 'number',
                                    min: 0,
                                    step: '0.01',
                                    placeholder: '$0.00 (opcional)',
                                    value: openForm.data.initial_amount,
                                    disabled: !canStartJornadaToday,
                                    onChange: (e) => {
                                        openForm.setData('initial_amount', e.target.value);
                                        clearInitialAmountError();
                                    },
                                }}
                            />
                            <button
                                type="submit"
                                disabled={openForm.processing || !canStartJornadaToday}
                                className="inline-flex h-11 items-center gap-2 rounded-xl bg-sidebar-active px-6 text-sm font-semibold text-white hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
                            >
                                <Play className="h-4 w-4" />
                                {openForm.processing ? 'Abriendo...' : 'Iniciar jornada'}
                            </button>
                        </form>
                    </Card>
                ) : (
                    <>
                        <Card className={`${cardClass} border-2 border-sidebar-active/30 p-4 sm:p-5`}>
                            <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                                Efectivo en caja
                            </p>
                            <p className="mt-1 font-mono text-4xl font-bold text-sidebar-active">
                                ${formatCurrency(sessionSummary?.expected ?? 0)}
                            </p>
                            <p className="mt-1 text-xs text-slate-500">
                                {openSession.completed_orders_count} pedidos · inicio $
                                {formatCurrency(openSession.initial_amount)}
                                {openSession.orders_count > openSession.completed_orders_count &&
                                    ` · +${openSession.orders_count - openSession.completed_orders_count} en curso`}
                            </p>

                            <div className="mt-4 grid grid-cols-2 gap-3">
                                <div className="rounded-xl bg-emerald-50 px-3 py-3 dark:bg-emerald-950/30">
                                    <p className="text-[10px] font-semibold uppercase text-emerald-700 dark:text-emerald-400">
                                        Mis ganancias
                                    </p>
                                    <p className="mt-0.5 text-lg font-bold text-emerald-600">
                                        ${formatCurrency(openSession.user_earnings ?? 0)}
                                    </p>
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
                                    <p className="text-[10px] font-semibold uppercase text-slate-600">
                                        {companyName}
                                    </p>
                                    {sessionSummary && Math.abs(sessionSummary.settlement) >= 0.01 ? (
                                        <p
                                            className={cn(
                                                'mt-0.5 text-lg font-bold',
                                                sessionSummary.owesClikio
                                                    ? 'text-amber-700 dark:text-amber-400'
                                                    : 'text-violet-700 dark:text-violet-400',
                                            )}
                                        >
                                            {sessionSummary.owesClikio
                                                ? `Le debes $${formatCurrency(sessionSummary.settlementAbs)}`
                                                : `Te debe $${formatCurrency(sessionSummary.settlementAbs)}`}
                                        </p>
                                    ) : (
                                        <p className="mt-0.5 text-lg font-bold text-slate-600 dark:text-slate-300">
                                            Cuadrado
                                        </p>
                                    )}
                                </div>
                            </div>

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
                        </Card>

                        {activeOrders.length > 0 && (
                            <ActiveOrdersBar orders={activeOrders} />
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
                                                <th className="px-4 py-3 text-center">Acciones</th>
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
                                                    <td className="px-4 py-3">
                                                        <div className="flex justify-center">
                                                            <Link
                                                                href={`/reparto/pedidos/${row.id}/editar`}
                                                                className="rounded p-1.5 text-slate-500 hover:bg-slate-100 dark:hover:bg-[#333]"
                                                                title="Editar pedido"
                                                            >
                                                                <Pencil className="h-4 w-4" />
                                                            </Link>
                                                        </div>
                                                    </td>
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
                                            </tr>
                                        </tfoot>
                                    </table>
                                </div>
                            )}
                        </Card>
                    </>
                )}

                <SessionHistoryList
                    sessions={recentSessions}
                    companyName={companyName}
                    title="Jornadas recientes"
                    showWorkDuration
                />
            </div>
        </AppLayout>
    );
}
