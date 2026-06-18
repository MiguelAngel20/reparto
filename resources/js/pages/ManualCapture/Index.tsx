import AppLayout from '@/layouts/app-layout';
import { Card } from '@/components/ui';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { calculateCommission } from '@/lib/delivery-commission';
import { confirmFinalizeManualCapture } from '@/lib/sweetalert';
import { formatCurrency, cn, localDateInputValue } from '@/lib/utils';
import { type BreadcrumbItem } from '@/types';
import { Head, Link, router, useForm, usePage } from '@inertiajs/react';
import { useSectionAccess } from '@/hooks/useSectionAccess';
import {
    ArrowLeft,
    CheckCircle2,
    ClipboardList,
    Pencil,
    Plus,
    Trash2,
    Calendar,
} from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import {
    SessionHistoryList,
    type SessionHistoryItem,
} from '@/components/reparto/session-history-list';

type EntryRow = {
    id: number;
    name: string;
    service_cost: number;
    user_commission: number;
    clikio_commission: number;
    user_extra: number;
    clikio_extra: number;
    clikio_discounts: number;
    client_payment_mode: string;
    client_payment_mode_label: string;
};

type ManualCaptureSessionData = SessionHistoryItem & {
    session_type: 'live' | 'manual';
    status: string;
    entries_count: number;
    total_service?: number;
    total_service_cash_in?: number;
    total_cash_movements?: number;
    user_commission?: number;
    clikio_earnings?: number;
    clikio_earnings_gross?: number;
};

interface ManualCaptureIndexProps {
    activeSession: ManualCaptureSessionData | null;
    entries: EntryRow[];
    savedSessions: ManualCaptureSessionData[];
    usedCaptureDates: string[];
    blockedDateMessages: Record<string, string>;
    userPercentage: number;
    companyName: string;
}

function formatDateLabel(date: string): string {
    const [y, m, day] = date.split('-');
    return `${day}/${m}/${y}`;
}

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Dashboard', href: '/dashboard' },
    { title: 'Captura manual', href: '/captura-manual' },
];

const cardClass =
    'border border-slate-200/80 bg-white p-4 shadow-sm dark:border-[#2b2b2b] dark:bg-[#262626] sm:p-5';

const emptyEntryForm = {
    name: '',
    service_cost: '60',
    client_payment_mode: 'cash' as 'cash' | 'transfer',
    user_extra: '',
    clikio_extra: '',
    discount: '',
};

export default function ManualCaptureIndex({
    activeSession,
    entries,
    savedSessions,
    usedCaptureDates,
    blockedDateMessages,
    userPercentage,
    companyName,
}: ManualCaptureIndexProps) {
    const { canEdit } = useSectionAccess('manual_capture');
    const page = usePage();
    const flash = page.props.flash as { success?: string; error?: string } | undefined;
    const [editingId, setEditingId] = useState<number | null>(null);

    const startForm = useForm({
        capture_date: localDateInputValue(),
        notes: '',
    });
    const entryForm = useForm(emptyEntryForm);
    const closeForm = useForm({});

    const sessionId = activeSession?.id;
    const isManualSession = activeSession?.session_type === 'manual';
    const isManualCaptureOpen =
        isManualSession && activeSession?.status === 'open';
    const entriesBaseUrl = sessionId ? `/captura-manual/jornada/${sessionId}/pedidos` : '';

    const summary = useMemo(() => {
        if (!activeSession) return null;
        const settlement = activeSession.clikio_settlement ?? 0;
        return {
            total_cash_movements: activeSession.total_cash_movements ?? 0,
            total_service_cash_in: activeSession.total_service_cash_in ?? 0,
            count: activeSession.count ?? activeSession.entries_count ?? 0,
            user_earnings: activeSession.user_earnings ?? 0,
            settlement,
            owesClikio: settlement > 0,
            clikioOwesYou: settlement < 0,
        };
    }, [activeSession]);

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

    const usedDatesSet = useMemo(() => new Set(usedCaptureDates), [usedCaptureDates]);

    const canCaptureSelectedDate = !usedDatesSet.has(startForm.data.capture_date);

    const selectedDateBlockedMessage = useMemo(() => {
        if (canCaptureSelectedDate) {
            return null;
        }

        return (
            blockedDateMessages[startForm.data.capture_date] ??
            'Esta fecha ya está registrada. Usa Editar en la lista.'
        );
    }, [canCaptureSelectedDate, startForm.data.capture_date, blockedDateMessages]);

    useEffect(() => {
        if (flash?.success) toast.success(flash.success);
        if (flash?.error) toast.error(flash.error);
    }, [flash?.success, flash?.error]);

    const submitStartCapture = (e: React.FormEvent) => {
        e.preventDefault();
        startForm.clearErrors();

        if (!canCaptureSelectedDate) {
            startForm.setError(
                'capture_date',
                selectedDateBlockedMessage ??
                    'Esta fecha ya está registrada. Usa Editar en la lista.',
            );
            return;
        }

        startForm.post('/captura-manual/sesion', { preserveScroll: true });
    };

    const resetEntryForm = () => {
        setEditingId(null);
        entryForm.clearErrors();
        entryForm.setData(emptyEntryForm);
    };

    const setPaymentMode = (mode: 'cash' | 'transfer') => {
        if (mode === 'transfer') {
            entryForm.setData({
                ...entryForm.data,
                client_payment_mode: mode,
                discount: entryForm.data.service_cost || entryForm.data.discount,
            });
            return;
        }

        entryForm.setData({
            ...entryForm.data,
            client_payment_mode: mode,
        });
    };

    const handleServiceCostChange = (value: string) => {
        if (entryForm.data.client_payment_mode === 'transfer') {
            entryForm.setData({
                ...entryForm.data,
                service_cost: value,
                discount: value,
            });
            return;
        }

        entryForm.setData('service_cost', value);
    };

    const handleDiscountChange = (value: string) => {
        entryForm.setData('discount', value);
    };

    const loadEntry = (row: EntryRow) => {
        setEditingId(row.id);
        const isTransfer = row.client_payment_mode === 'transfer';
        entryForm.setData({
            name: row.name,
            service_cost: String(row.service_cost),
            client_payment_mode: isTransfer ? 'transfer' : 'cash',
            user_extra: row.user_extra > 0 ? String(row.user_extra) : '',
            clikio_extra: row.clikio_extra > 0 ? String(row.clikio_extra) : '',
            discount: isTransfer
                ? String(row.clikio_discounts > 0 ? row.clikio_discounts : row.service_cost)
                : row.clikio_discounts > 0
                  ? String(row.clikio_discounts)
                  : '',
        });
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const submitEntry = (e: React.FormEvent) => {
        e.preventDefault();
        if (!entriesBaseUrl) return;

        if (editingId) {
            entryForm.put(`${entriesBaseUrl}/${editingId}`, {
                preserveScroll: true,
                onSuccess: () => resetEntryForm(),
            });
            return;
        }
        entryForm.post(entriesBaseUrl, {
            preserveScroll: true,
            onSuccess: () => resetEntryForm(),
        });
    };

    const deleteEntry = (id: number) => {
        if (!entriesBaseUrl || !window.confirm('¿Eliminar este pedido?')) return;
        router.delete(`${entriesBaseUrl}/${id}`, { preserveScroll: true });
    };

    const submitCloseCapture = async () => {
        if (!sessionId || !activeSession?.capture_date_formatted) return;

        const confirmed = await confirmFinalizeManualCapture(
            activeSession.capture_date_formatted,
        );
        if (!confirmed) return;

        closeForm.post(`/captura-manual/jornada/${sessionId}/cerrar`, {
            preserveScroll: true,
        });
    };

    const isTransferMode = entryForm.data.client_payment_mode === 'transfer';

    const commissionPreview = useMemo(() => {
        const serviceCost = parseFloat(entryForm.data.service_cost) || 0;
        return calculateCommission(serviceCost, userPercentage);
    }, [entryForm.data.service_cost, userPercentage]);

    return (
        <AppLayout breadcrumbs={breadcrumbs} title="Captura manual">
            <Head title="Captura manual" />

            <div className="flex w-full flex-col gap-6">
                {!activeSession ? (
                    <>
                        {canEdit && (
                        <Card className={cardClass}>
                            <form onSubmit={submitStartCapture} className="max-w-md space-y-4">
                                <div>
                                    <Label htmlFor="capture_date" className="mb-1 block text-sm">
                                        Fecha del día
                                    </Label>
                                    <Input
                                        id="capture_date"
                                        type="date"
                                        value={startForm.data.capture_date}
                                        onChange={(e) => {
                                            startForm.setData('capture_date', e.target.value);
                                            startForm.clearErrors('capture_date');
                                        }}
                                        className={cn(
                                            startForm.errors.capture_date && 'border-rose-500',
                                        )}
                                    />
                                    {startForm.errors.capture_date && (
                                        <p className="mt-1 text-xs text-rose-600">
                                            {startForm.errors.capture_date}
                                        </p>
                                    )}
                                    {usedCaptureDates.length > 0 && (
                                        <p className="mt-2 text-xs text-slate-500">
                                            Fechas no disponibles:{' '}
                                            {usedCaptureDates
                                                .slice(0, 6)
                                                .map(formatDateLabel)
                                                .join(', ')}
                                            {usedCaptureDates.length > 6 ? '…' : ''}
                                        </p>
                                    )}
                                </div>

                                <button
                                    type="submit"
                                    disabled={
                                        startForm.processing || !canCaptureSelectedDate
                                    }
                                    className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-sidebar-active text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50"
                                >
                                    <Calendar className="h-4 w-4" />
                                    {startForm.processing
                                        ? 'Iniciando...'
                                        : 'Iniciar captura manual'}
                                </button>
                            </form>
                        </Card>
                        )}

                        {savedSessions.length > 0 && (
                            <SessionHistoryList
                                sessions={savedSessions}
                                companyName={companyName}
                                showEditButton={canEdit}
                            />
                        )}
                    </>
                ) : (
                    <>
                        <div className="flex flex-wrap items-center justify-between gap-3">
                            <div>
                                {!isManualCaptureOpen && (
                                    <Link
                                        href="/captura-manual"
                                        className="mb-2 inline-flex items-center gap-1 text-sm text-slate-500 hover:text-sidebar-active"
                                    >
                                        <ArrowLeft className="h-4 w-4" />
                                        Volver al listado
                                    </Link>
                                )}
                                {isManualCaptureOpen && (
                                    <p className="mb-2 text-xs font-medium uppercase tracking-wide text-sidebar-active">
                                        Captura en curso
                                    </p>
                                )}
                                <h1 className="text-lg font-semibold text-slate-900 dark:text-white">
                                    {activeSession.capture_date_formatted}
                                </h1>
                                <p className="text-sm text-slate-500">
                                    {activeSession.session_type_label}
                                    {isManualCaptureOpen
                                        ? ' · agrega pedidos y finaliza cuando termines'
                                        : ' · edita los pedidos de este día'}
                                </p>
                            </div>
                            {isManualCaptureOpen && canEdit && (
                                <button
                                    type="button"
                                    onClick={submitCloseCapture}
                                    disabled={closeForm.processing}
                                    className="inline-flex h-10 items-center gap-2 rounded-xl border border-rose-200 bg-rose-50 px-4 text-sm font-semibold text-rose-700 hover:bg-rose-100 dark:border-rose-900 dark:bg-rose-950/40 dark:text-rose-300"
                                >
                                    <CheckCircle2 className="h-4 w-4" />
                                    Finalizar captura
                                </button>
                            )}
                        </div>

                        {summary && (
                            <div className="grid gap-3 sm:grid-cols-2">
                                <Card
                                    className={cn(
                                        cardClass,
                                        summary.owesClikio &&
                                            'bg-amber-50/50 dark:bg-amber-950/20',
                                        summary.clikioOwesYou &&
                                            'bg-violet-50/50 dark:bg-violet-950/20',
                                    )}
                                >
                                    <p className="text-xs uppercase text-slate-600">
                                        Cuadre con {companyName}
                                    </p>
                                    {Math.abs(summary.settlement) >= 0.01 ? (
                                        <p
                                            className={cn(
                                                'mt-1 text-2xl font-bold',
                                                summary.owesClikio
                                                    ? 'text-amber-700'
                                                    : 'text-violet-700',
                                            )}
                                        >
                                            {summary.owesClikio
                                                ? `Le debes $${formatCurrency(Math.abs(summary.settlement))}`
                                                : `Te debe $${formatCurrency(Math.abs(summary.settlement))}`}
                                        </p>
                                    ) : (
                                        <p className="mt-1 text-2xl font-bold text-slate-600">
                                            Cuadrado
                                        </p>
                                    )}
                                    <p className="mt-1 text-xs text-slate-500">
                                        {summary.count} pedidos en este día
                                    </p>
                                </Card>
                                <Card
                                    className={`${cardClass} bg-emerald-50/50 dark:bg-emerald-950/20`}
                                >
                                    <p className="text-xs uppercase text-emerald-700">
                                        Mis ganancias
                                    </p>
                                    <p className="mt-1 text-2xl font-bold text-emerald-600">
                                        ${formatCurrency(summary.user_earnings)}
                                    </p>
                                </Card>
                            </div>
                        )}

                        {(isManualSession || editingId) && canEdit ? (
                        <Card className={cardClass}>
                            <div className="mb-3 flex items-center justify-between">
                                <p className="text-sm font-semibold">
                                    {editingId ? 'Editar pedido' : 'Agregar pedido'}
                                </p>
                                {editingId && (
                                    <button
                                        type="button"
                                        onClick={resetEntryForm}
                                        className="text-xs text-slate-500 underline"
                                    >
                                        Cancelar edición
                                    </button>
                                )}
                            </div>
                            <form onSubmit={submitEntry} className="space-y-3">
                                <div>
                                    <Label className="mb-1 block text-xs text-slate-500">
                                        Nombre
                                    </Label>
                                    <Input
                                        value={entryForm.data.name}
                                        onChange={(e) =>
                                            entryForm.setData('name', e.target.value)
                                        }
                                        placeholder="Ej. Soriana"
                                        className={cn(entryForm.errors.name && 'border-rose-500')}
                                    />
                                    {entryForm.errors.name && (
                                        <p className="mt-1 text-xs text-rose-600">
                                            {entryForm.errors.name}
                                        </p>
                                    )}
                                </div>
                                <div className="grid grid-cols-2 gap-3">
                                    <div>
                                        <Label className="mb-1 block text-xs text-slate-500">
                                            Monto ($)
                                        </Label>
                                        <Input
                                            type="number"
                                            min={0}
                                            step="0.01"
                                            value={entryForm.data.service_cost}
                                            onChange={(e) =>
                                                handleServiceCostChange(e.target.value)
                                            }
                                        />
                                        <p className="mt-1.5 text-[11px] text-slate-500">
                                            Tu {userPercentage}% · Mi gan.: $
                                            {formatCurrency(commissionPreview.userCommission)}{' '}
                                            · {companyName}: $
                                            {formatCurrency(commissionPreview.clikioCommission)}
                                        </p>
                                    </div>
                                    <div>
                                        <Label className="mb-1 block text-xs text-slate-500">
                                            Pago
                                        </Label>
                                        <div className="flex gap-2">
                                            {(
                                                [
                                                    { value: 'cash', label: 'Efectivo' },
                                                    { value: 'transfer', label: 'Transf.' },
                                                ] as const
                                            ).map((mode) => (
                                                <button
                                                    key={mode.value}
                                                    type="button"
                                                    onClick={() => setPaymentMode(mode.value)}
                                                    className={cn(
                                                        'flex-1 rounded-lg py-2 text-xs font-medium',
                                                        entryForm.data.client_payment_mode ===
                                                            mode.value
                                                            ? 'bg-sidebar-active text-white'
                                                            : 'border border-slate-200 dark:border-[#3a3a3a]',
                                                    )}
                                                >
                                                    {mode.label}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
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
                                            {isTransferMode ? 'Descuento (transf.)' : 'Descuento'}
                                        </Label>
                                        <Input
                                            type="number"
                                            min={0}
                                            step="0.01"
                                            value={entryForm.data.discount}
                                            onChange={(e) =>
                                                handleDiscountChange(e.target.value)
                                            }
                                            onFocus={(e) => e.currentTarget.select()}
                                        />
                                    </div>
                                </div>
                                {(isManualSession || editingId) && (
                                    <button
                                        type="submit"
                                        disabled={entryForm.processing}
                                        className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-sidebar-active text-sm font-semibold text-white disabled:opacity-50"
                                    >
                                        {editingId ? (
                                            <Pencil className="h-4 w-4" />
                                        ) : (
                                            <Plus className="h-4 w-4" />
                                        )}
                                        {entryForm.processing
                                            ? 'Guardando...'
                                            : editingId
                                              ? 'Actualizar'
                                              : 'Agregar a la lista'}
                                    </button>
                                )}
                            </form>
                        </Card>
                        ) : (
                            <p className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600 dark:border-[#3a3a3a] dark:bg-[#1f1f1f]">
                                Jornada en vivo: puedes editar pedidos existentes. Para agregar
                                nuevos, usa Iniciar jornada.
                            </p>
                        )}

                        <Card className={cardClass}>
                            <div className="mb-3 flex items-center gap-2">
                                <ClipboardList className="h-5 w-5 text-sidebar-active" />
                                <h2 className="text-sm font-semibold">Pedidos del día</h2>
                            </div>

                            {entries.length === 0 ? (
                                <p className="text-sm text-slate-500">
                                    Agrega los pedidos que anotaste en el celular.
                                </p>
                            ) : (
                                <EntriesTable
                                    entries={entries}
                                    tableTotals={tableTotals}
                                    companyName={companyName}
                                    onEdit={canEdit ? loadEntry : undefined}
                                    onDelete={canEdit && isManualSession ? deleteEntry : undefined}
                                />
                            )}
                        </Card>
                    </>
                )}
            </div>
        </AppLayout>
    );
}

function EntriesTable({
    entries,
    tableTotals,
    companyName,
    onEdit,
    onDelete,
}: {
    entries: EntryRow[];
    tableTotals: {
        service_cost: number;
        user_commission: number;
        clikio_commission: number;
        user_extra: number;
        clikio_extra: number;
        clikio_discounts: number;
    };
    companyName: string;
    onEdit?: (row: EntryRow) => void;
    onDelete?: (id: number) => void;
}) {
    const showActions = Boolean(onEdit);
    return (
        <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-[#3a3a3a]">
            <table className="w-full min-w-[720px] text-left text-sm">
                <thead>
                    <tr className="bg-slate-50 text-xs uppercase text-slate-500 dark:bg-[#1f1f1f]">
                        <th className="px-3 py-2">Nombre</th>
                        <th className="px-3 py-2 text-right">Monto</th>
                        <th className="px-3 py-2 text-right">Mi gan.</th>
                        <th className="px-3 py-2 text-right">{companyName}</th>
                        <th className="px-3 py-2 text-right">Extra</th>
                        <th className="px-3 py-2 text-right">Extra {companyName}</th>
                        <th className="px-3 py-2 text-right">Desc.</th>
                        <th className="px-3 py-2">Pago</th>
                        {showActions && <th className="px-3 py-2" />}
                    </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-[#333]">
                    {entries.map((row, index) => (
                        <tr key={row.id}>
                            <td className="px-3 py-2">
                                <span className="mr-1 text-slate-400">{index + 1}.</span>
                                {row.name}
                            </td>
                            <td className="px-3 py-2 text-right font-medium">
                                ${formatCurrency(row.service_cost)}
                            </td>
                            <td className="px-3 py-2 text-right text-emerald-600">
                                ${formatCurrency(row.user_commission)}
                            </td>
                            <td className="px-3 py-2 text-right text-blue-600">
                                ${formatCurrency(row.clikio_commission)}
                            </td>
                            <td className="px-3 py-2 text-right">
                                {row.user_extra > 0
                                    ? `$${formatCurrency(row.user_extra)}`
                                    : '—'}
                            </td>
                            <td className="px-3 py-2 text-right">
                                {row.clikio_extra > 0
                                    ? `$${formatCurrency(row.clikio_extra)}`
                                    : '—'}
                            </td>
                            <td className="px-3 py-2 text-right text-amber-600">
                                {row.clikio_discounts > 0
                                    ? `$${formatCurrency(row.clikio_discounts)}`
                                    : '—'}
                            </td>
                            <td className="px-3 py-2 text-xs">{row.client_payment_mode_label}</td>
                            {showActions && onEdit && (
                            <td className="px-3 py-2">
                                <div className="flex justify-end gap-1">
                                    <button
                                        type="button"
                                        onClick={() => onEdit(row)}
                                        className="rounded p-1.5 text-slate-500 hover:bg-slate-100"
                                    >
                                        <Pencil className="h-4 w-4" />
                                    </button>
                                    {onDelete && (
                                        <button
                                            type="button"
                                            onClick={() => onDelete(row.id)}
                                            className="rounded p-1.5 text-rose-500 hover:bg-rose-50"
                                        >
                                            <Trash2 className="h-4 w-4" />
                                        </button>
                                    )}
                                </div>
                            </td>
                            )}
                        </tr>
                    ))}
                </tbody>
                <tfoot>
                    <tr className="bg-slate-50 font-semibold dark:bg-[#1f1f1f]">
                        <td className="px-3 py-2">Total</td>
                        <td className="px-3 py-2 text-right">
                            ${formatCurrency(tableTotals.service_cost)}
                        </td>
                        <td className="px-3 py-2 text-right text-emerald-600">
                            ${formatCurrency(tableTotals.user_commission)}
                        </td>
                        <td className="px-3 py-2 text-right text-blue-600">
                            ${formatCurrency(tableTotals.clikio_commission)}
                        </td>
                        <td className="px-3 py-2 text-right">
                            ${formatCurrency(tableTotals.user_extra)}
                        </td>
                        <td className="px-3 py-2 text-right">
                            ${formatCurrency(tableTotals.clikio_extra)}
                        </td>
                        <td className="px-3 py-2 text-right text-amber-600">
                            ${formatCurrency(tableTotals.clikio_discounts)}
                        </td>
                        <td colSpan={showActions ? 2 : 1} />
                    </tr>
                </tfoot>
            </table>
        </div>
    );
}
