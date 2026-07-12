import { Card } from '@/components/ui';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { confirmAction } from '@/lib/sweetalert';
import { formatCurrency, cn, localDateInputValue } from '@/lib/utils';
import { Link, router } from '@inertiajs/react';
import { Pencil, Trash2 } from 'lucide-react';
import { useMemo, useState } from 'react';

export type SessionHistoryItem = {
    id: number;
    capture_date: string;
    capture_date_formatted: string;
    session_type_label: string;
    entries_count?: number;
    count?: number;
    user_earnings?: number;
    net_earnings?: number;
    total_clikio_commission?: number;
    total_user_extra?: number;
    total_clikio_extra?: number;
    total_clikio_discounts?: number;
    clikio_settlement?: number;
    work_duration_formatted?: string | null;
};

function firstDayOfMonth(): string {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`;
}

const cardClass =
    'border border-slate-200/80 bg-white p-4 shadow-sm dark:border-[#2b2b2b] dark:bg-[#262626] sm:p-5';

const actionIconClass =
    'inline-flex h-9 w-9 items-center justify-center rounded-lg border transition-colors';

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

type SessionHistoryListProps = {
    sessions: SessionHistoryItem[];
    companyName: string;
    title?: string;
    showEditButton?: boolean;
    showDeleteButton?: boolean;
    showWorkDuration?: boolean;
    editHref?: (sessionId: number) => string;
    deleteHref?: (sessionId: number) => string;
    deleteLabel?: string;
};

export function SessionHistoryList({
    sessions,
    companyName,
    title = 'Jornadas registradas',
    showEditButton = false,
    showDeleteButton = false,
    showWorkDuration = false,
    editHref = (id) => `/reparto/jornada/${id}/editar`,
    deleteHref = (id) => `/reparto/jornada/${id}`,
    deleteLabel = 'jornada',
}: SessionHistoryListProps) {
    const [dateFrom, setDateFrom] = useState(firstDayOfMonth);
    const [dateTo, setDateTo] = useState(localDateInputValue);

    const filteredSessions = useMemo(() => {
        return sessions.filter((s) => {
            const d = s.capture_date;
            if (dateFrom && d < dateFrom) return false;
            if (dateTo && d > dateTo) return false;
            return true;
        });
    }, [sessions, dateFrom, dateTo]);

    const deleteSession = async (session: SessionHistoryItem) => {
        const confirmed = await confirmAction({
            title: `¿Eliminar ${deleteLabel}?`,
            text: `Se eliminará ${session.session_type_label} del ${session.capture_date_formatted} y todos sus pedidos. Esta acción no se puede deshacer.`,
            confirmText: 'Sí, eliminar',
            icon: 'warning',
        });

        if (!confirmed) return;

        router.delete(deleteHref(session.id), { preserveScroll: true });
    };

    if (sessions.length === 0) {
        return null;
    }

    return (
        <Card className={cardClass}>
            <div className="mb-5 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
                <div>
                    <h3 className="text-base font-semibold text-slate-900 dark:text-white">
                        {title}
                    </h3>
                    <p className="mt-1 text-sm text-slate-500">
                        {filteredSessions.length} jornada
                        {filteredSessions.length !== 1 ? 's' : ''} en el rango
                    </p>
                </div>
                <div className="grid grid-cols-2 items-end gap-2 sm:flex">
                    <div className="min-w-0">
                        <Label className="mb-1 block text-[10px] uppercase text-slate-500">
                            Desde
                        </Label>
                        <Input
                            type="date"
                            value={dateFrom}
                            onChange={(e) => setDateFrom(e.target.value)}
                            className="h-9 w-full min-w-0 text-xs sm:w-36 sm:text-sm"
                        />
                    </div>
                    <div className="min-w-0">
                        <Label className="mb-1 block text-[10px] uppercase text-slate-500">
                            Hasta
                        </Label>
                        <Input
                            type="date"
                            value={dateTo}
                            onChange={(e) => setDateTo(e.target.value)}
                            className="h-9 w-full min-w-0 text-xs sm:w-36 sm:text-sm"
                        />
                    </div>
                </div>
            </div>

            {filteredSessions.length === 0 ? (
                <p className="rounded-xl border border-dashed border-slate-200 py-8 text-center text-sm text-slate-500 dark:border-[#3a3a3a]">
                    No hay jornadas en este rango de fechas.
                </p>
            ) : (
                <ul className="space-y-3">
                    {filteredSessions.map((s) => {
                        const daySettlement = s.clikio_settlement ?? 0;
                        const dayOwes = daySettlement > 0.01;
                        const dayClikioOwes = daySettlement < -0.01;
                        const cuadreValue =
                            Math.abs(daySettlement) >= 0.01
                                ? dayOwes
                                    ? `Le debes $${formatCurrency(Math.abs(daySettlement))}`
                                    : `Te debe $${formatCurrency(Math.abs(daySettlement))}`
                                : 'Cuadrado';
                        const cuadreTone = dayOwes
                            ? 'amber'
                            : dayClikioOwes
                              ? 'violet'
                              : undefined;

                        const netEarnings = s.net_earnings;
                        const saldoTone =
                            netEarnings !== undefined && netEarnings > 0.01
                                ? 'emerald'
                                : netEarnings !== undefined && netEarnings < -0.01
                                  ? 'rose'
                                  : undefined;

                        return (
                            <li
                                key={s.id}
                                className="rounded-xl border border-slate-200 bg-slate-50/50 p-4 dark:border-[#3a3a3a] dark:bg-[#1f1f1f]/50"
                            >
                                <div className="mb-3 flex flex-col gap-2">
                                    <div className="flex items-start justify-between gap-2">
                                        <p className="text-base font-semibold text-slate-900 dark:text-white">
                                            {s.capture_date_formatted}
                                        </p>
                                        {(showEditButton || showDeleteButton) && (
                                            <div className="flex shrink-0 items-center gap-2">
                                                {showEditButton && (
                                                    <Link
                                                        href={editHref(s.id)}
                                                        className={cn(
                                                            actionIconClass,
                                                            'border-sidebar-active/30 bg-sidebar-active/10 text-sidebar-active hover:bg-sidebar-active/20',
                                                        )}
                                                        title="Editar"
                                                    >
                                                        <Pencil className="h-4 w-4" />
                                                    </Link>
                                                )}
                                                {showDeleteButton && (
                                                    <button
                                                        type="button"
                                                        onClick={() => deleteSession(s)}
                                                        className={cn(
                                                            actionIconClass,
                                                            'border-rose-200 bg-white text-rose-600 hover:bg-rose-50 dark:border-rose-900/50 dark:bg-[#262626] dark:text-rose-400 dark:hover:bg-rose-950/30',
                                                        )}
                                                        title="Eliminar"
                                                    >
                                                        <Trash2 className="h-4 w-4" />
                                                    </button>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                    <div className="flex flex-wrap items-center gap-1.5">
                                        <span className="rounded-md bg-sidebar-active/10 px-2 py-0.5 text-[10px] font-medium text-sidebar-active sm:px-2 sm:text-xs">
                                            {s.session_type_label}
                                        </span>
                                        {showWorkDuration && s.work_duration_formatted && (
                                            <span className="max-w-full rounded-md bg-sidebar-active/10 px-2 py-0.5 text-[10px] font-semibold leading-tight text-sidebar-active sm:rounded-lg sm:px-3 sm:py-1 sm:text-xs md:text-sm">
                                                {s.work_duration_formatted}
                                            </span>
                                        )}
                                    </div>
                                    <span className="text-xs text-slate-500">
                                        {s.entries_count ?? s.count ?? 0} pedidos
                                    </span>
                                </div>
                                {netEarnings !== undefined && (
                                    <div className="mb-2">
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
                                        value={`$${formatCurrency(s.user_earnings ?? 0)}`}
                                        tone="emerald"
                                    />
                                    <StatPill
                                        label={companyName}
                                        value={`$${formatCurrency(s.total_clikio_commission ?? 0)}`}
                                        tone="blue"
                                    />
                                    <StatPill
                                        label="Extra tuyo"
                                        value={`$${formatCurrency(s.total_user_extra ?? 0)}`}
                                    />
                                    <StatPill
                                        label={`Extra ${companyName}`}
                                        value={`$${formatCurrency(s.total_clikio_extra ?? 0)}`}
                                    />
                                    <StatPill
                                        label="Descuentos"
                                        value={`$${formatCurrency(s.total_clikio_discounts ?? 0)}`}
                                        tone="amber"
                                    />
                                    <StatPill
                                        label={`Cuadre ${companyName}`}
                                        value={cuadreValue}
                                        tone={cuadreTone}
                                    />
                                </div>
                            </li>
                        );
                    })}
                </ul>
            )}
        </Card>
    );
}
