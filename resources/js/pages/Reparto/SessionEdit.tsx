import AppLayout from '@/layouts/app-layout';
import { Card } from '@/components/ui';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
    SessionEntriesTable,
    type SessionEntryRow,
} from '@/components/reparto/session-entries-table';
import { type SessionHistoryItem } from '@/components/reparto/session-history-list';
import { calculateCommission } from '@/lib/delivery-commission';
import { confirmAction } from '@/lib/sweetalert';
import { formatCurrency, cn } from '@/lib/utils';
import { type BreadcrumbItem } from '@/types';
import { Head, Link, router, useForm, usePage } from '@inertiajs/react';
import { ArrowLeft, ClipboardList, Pencil } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';

type SessionData = SessionHistoryItem & {
    work_duration_formatted?: string | null;
};

interface SessionEditProps {
    session: SessionData;
    entries: SessionEntryRow[];
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
    companyName,
    userPercentage,
    backUrl,
}: SessionEditProps) {
    const page = usePage();
    const flash = page.props.flash as { success?: string; error?: string } | undefined;
    const [editingId, setEditingId] = useState<number | null>(null);

    const entryForm = useForm(emptyEntryForm);
    const entriesBaseUrl = `/reparto/jornada/${session.id}/pedidos`;

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

    useEffect(() => {
        if (flash?.success) toast.success(flash.success);
        if (flash?.error) toast.error(flash.error);
    }, [flash?.success, flash?.error]);

    const resetEntryForm = () => {
        setEditingId(null);
        entryForm.clearErrors();
        entryForm.setData(emptyEntryForm);
    };

    const loadEntry = (row: SessionEntryRow) => {
        setEditingId(row.id);
        entryForm.setData({
            name: row.name,
            service_cost: String(row.service_cost),
            user_extra: row.user_extra > 0 ? String(row.user_extra) : '',
            clikio_extra: row.clikio_extra > 0 ? String(row.clikio_extra) : '',
            discount: row.clikio_discounts > 0 ? String(row.clikio_discounts) : '',
        });
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const submitEntry = (e: React.FormEvent) => {
        e.preventDefault();
        if (!editingId) return;

        entryForm.transform((data) => ({
            ...data,
            client_payment_mode: 'cash',
        }));

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
                        {session.session_type_label} · edita los pedidos de este día
                    </p>
                    {session.work_duration_formatted && (
                        <p className="mt-1 text-xs text-slate-500">
                            Duración: {session.work_duration_formatted}
                        </p>
                    )}
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
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

                {editingId ? (
                    <Card className={cardClass}>
                        <div className="mb-3 flex items-center justify-between">
                            <p className="text-sm font-semibold">Editar pedido</p>
                            <button
                                type="button"
                                onClick={resetEntryForm}
                                className="text-xs text-slate-500 underline"
                            >
                                Cancelar edición
                            </button>
                        </div>
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
                                    Monto ($)
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
                                        onFocus={(e) => e.currentTarget.select()}
                                    />
                                </div>
                            </div>
                            <button
                                type="submit"
                                disabled={entryForm.processing}
                                className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-sidebar-active text-sm font-semibold text-white disabled:opacity-50"
                            >
                                <Pencil className="h-4 w-4" />
                                {entryForm.processing ? 'Guardando...' : 'Actualizar pedido'}
                            </button>
                        </form>
                    </Card>
                ) : (
                    <p className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600 dark:border-[#3a3a3a] dark:bg-[#1f1f1f]">
                        Selecciona un pedido de la tabla para editar sus datos.
                    </p>
                )}

                <Card className={cardClass}>
                    <div className="mb-3 flex items-center gap-2">
                        <ClipboardList className="h-5 w-5 text-sidebar-active" />
                        <h2 className="text-sm font-semibold text-slate-900 dark:text-white">
                            Pedidos del día
                        </h2>
                    </div>

                    {entries.length === 0 ? (
                        <p className="text-sm text-slate-500">Sin pedidos registrados.</p>
                    ) : (
                        <SessionEntriesTable
                            entries={entries}
                            tableTotals={tableTotals}
                            companyName={companyName}
                            onEdit={loadEntry}
                            onDelete={deleteEntry}
                        />
                    )}
                </Card>
            </div>
        </AppLayout>
    );
}
