import AppLayout from '@/layouts/app-layout';
import { Card } from '@/components/ui';
import { formatCurrency, cn } from '@/lib/utils';
import { type BreadcrumbItem } from '@/types';
import { Head, Link } from '@inertiajs/react';
import { ArrowLeft, ClipboardList } from 'lucide-react';
import { useMemo } from 'react';
import { type SessionHistoryItem } from '@/components/reparto/session-history-list';

type OrderRow = {
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

type SessionData = SessionHistoryItem & {
    session_type?: 'live' | 'manual';
    started_at_formatted?: string | null;
    ended_at_formatted?: string | null;
};

interface SessionShowProps {
    session: SessionData;
    orders: OrderRow[];
    companyName: string;
    backUrl: string;
    backLabel: string;
    pageTitle: string;
}

const cardClass =
    'border border-slate-200/80 bg-white p-4 shadow-sm dark:border-[#2b2b2b] dark:bg-[#262626] sm:p-5';

function StatPill({
    label,
    value,
    tone,
}: {
    label: string;
    value: string;
    tone?: 'emerald' | 'blue' | 'amber' | 'violet' | 'rose';
}) {
    const valueClass = cn(
        'font-semibold tabular-nums text-sm',
        tone === 'emerald' && 'text-emerald-600',
        tone === 'blue' && 'text-blue-600',
        tone === 'amber' && 'text-amber-600',
        tone === 'violet' && 'text-violet-600',
        tone === 'rose' && 'text-rose-600',
        !tone && 'text-slate-900 dark:text-white',
    );

    return (
        <div className="rounded-lg border border-slate-200/80 bg-white px-3 py-2 dark:border-[#333] dark:bg-[#262626]">
            <p className="text-[10px] uppercase tracking-wide text-slate-500">{label}</p>
            <p className={valueClass}>{value}</p>
        </div>
    );
}

export default function SessionShow({
    session,
    orders,
    companyName,
    backUrl,
    backLabel,
    pageTitle,
}: SessionShowProps) {
    const breadcrumbs: BreadcrumbItem[] = [
        { title: 'Dashboard', href: '/dashboard' },
        { title: backLabel, href: backUrl },
        { title: session.capture_date_formatted, href: '#' },
    ];

    const isLiveSession = session.session_type === 'live';

    const daySettlement = session.clikio_settlement ?? 0;
    const dayOwes = daySettlement > 0.01;
    const dayClikioOwes = daySettlement < -0.01;
    const cuadreValue =
        Math.abs(daySettlement) >= 0.01
            ? dayOwes
                ? `Le debes $${formatCurrency(Math.abs(daySettlement))}`
                : `Te debe $${formatCurrency(Math.abs(daySettlement))}`
            : 'Cuadrado';
    const cuadreTone = dayOwes ? 'amber' : dayClikioOwes ? 'violet' : undefined;

    const netEarnings = session.net_earnings;
    const saldoTone =
        netEarnings !== undefined && netEarnings > 0.01
            ? 'emerald'
            : netEarnings !== undefined && netEarnings < -0.01
              ? 'rose'
              : undefined;

    const tableTotals = useMemo(
        () =>
            orders.reduce(
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
            ),
        [orders],
    );

    return (
        <AppLayout breadcrumbs={breadcrumbs} title={pageTitle}>
            <Head title={`${pageTitle} · ${session.capture_date_formatted}`} />

            <div className="flex w-full flex-col gap-6">
                <div>
                    <Link
                        href={backUrl}
                        className="mb-3 inline-flex items-center gap-1 text-sm text-slate-500 hover:text-sidebar-active"
                    >
                        <ArrowLeft className="h-4 w-4" />
                        Volver a {backLabel}
                    </Link>
                    <h1 className="text-lg font-semibold text-slate-900 dark:text-white">
                        {session.capture_date_formatted}
                    </h1>
                    <div className="mt-1 flex flex-wrap items-center gap-2">
                        <span className="rounded-md bg-sidebar-active/10 px-2 py-0.5 text-xs font-medium text-sidebar-active">
                            {session.session_type_label}
                        </span>
                        <span className="text-sm text-slate-500">
                            {session.entries_count ?? session.count ?? 0} pedidos
                        </span>
                        {session.work_duration_formatted && (
                            <span className="rounded-lg bg-sidebar-active/10 px-2 py-0.5 text-xs font-semibold text-sidebar-active">
                                {session.work_duration_formatted}
                            </span>
                        )}
                    </div>
                    {isLiveSession && session.started_at_formatted && (
                        <p className="mt-1 text-xs text-slate-500">
                            {session.started_at_formatted}
                            {session.ended_at_formatted && ` → ${session.ended_at_formatted}`}
                        </p>
                    )}
                </div>

                <Card className={cardClass}>
                    {netEarnings !== undefined && (
                        <div className="mb-3">
                            <StatPill
                                label="Saldo del día"
                                value={`$${formatCurrency(Math.abs(netEarnings))}${netEarnings < -0.01 ? ' (neg.)' : ''}`}
                                tone={saldoTone}
                            />
                        </div>
                    )}
                    <div className="grid grid-cols-2 gap-2 text-xs sm:grid-cols-3">
                        <StatPill
                            label="Mis ganancias"
                            value={`$${formatCurrency(session.user_earnings ?? 0)}`}
                            tone="emerald"
                        />
                        <StatPill
                            label={companyName}
                            value={`$${formatCurrency(session.total_clikio_commission ?? 0)}`}
                            tone="blue"
                        />
                        <StatPill
                            label="Extra tuyo"
                            value={`$${formatCurrency(session.total_user_extra ?? 0)}`}
                        />
                        <StatPill
                            label={`Extra ${companyName}`}
                            value={`$${formatCurrency(session.total_clikio_extra ?? 0)}`}
                        />
                        <StatPill
                            label="Descuentos"
                            value={`$${formatCurrency(session.total_clikio_discounts ?? 0)}`}
                            tone="amber"
                        />
                        <StatPill
                            label={`Cuadre ${companyName}`}
                            value={cuadreValue}
                            tone={cuadreTone}
                        />
                    </div>
                </Card>

                <Card className={cardClass}>
                    <div className="mb-3 flex items-center gap-2">
                        <ClipboardList className="h-5 w-5 text-sidebar-active" />
                        <h2 className="text-sm font-semibold text-slate-900 dark:text-white">
                            Pedidos del día
                        </h2>
                    </div>

                    {orders.length === 0 ? (
                        <p className="text-sm text-slate-500">Sin pedidos registrados.</p>
                    ) : (
                        <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-[#3a3a3a]">
                            <table className="w-full min-w-[720px] text-left text-sm">
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
                                        {isLiveSession && (
                                            <th className="px-4 py-3 text-right">
                                                Cobro al cliente
                                            </th>
                                        )}
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 dark:divide-[#333]">
                                    {orders.map((row, index) => (
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
                                            {isLiveSession && (
                                                <td className="px-4 py-3 text-right font-medium text-slate-800 dark:text-slate-100">
                                                    ${formatCurrency(row.client_charge)}
                                                </td>
                                            )}
                                        </tr>
                                    ))}
                                </tbody>
                                <tfoot>
                                    <tr className="border-t-2 border-slate-200 bg-slate-50 font-semibold text-slate-900 dark:border-[#3a3a3a] dark:bg-[#1f1f1f] dark:text-white">
                                        <td className="px-4 py-3">Total</td>
                                        <td className="px-4 py-3 text-right">
                                            ${formatCurrency(tableTotals.service_cost)}
                                        </td>
                                        <td className="px-4 py-3 text-right text-emerald-600">
                                            ${formatCurrency(tableTotals.user_commission)}
                                        </td>
                                        <td className="px-4 py-3 text-right text-blue-600">
                                            ${formatCurrency(tableTotals.clikio_commission)}
                                        </td>
                                        <td className="px-4 py-3 text-right">
                                            ${formatCurrency(tableTotals.user_extra)}
                                        </td>
                                        <td className="px-4 py-3 text-right">
                                            ${formatCurrency(tableTotals.clikio_extra)}
                                        </td>
                                        <td className="px-4 py-3 text-right text-amber-600">
                                            ${formatCurrency(tableTotals.clikio_discounts)}
                                        </td>
                                        {isLiveSession && (
                                            <td className="px-4 py-3 text-right">
                                                ${formatCurrency(tableTotals.client_charge)}
                                            </td>
                                        )}
                                    </tr>
                                </tfoot>
                            </table>
                        </div>
                    )}
                </Card>
            </div>
        </AppLayout>
    );
}
