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
import { useSectionAccess } from '@/hooks/useSectionAccess';
import { Briefcase, Pencil, Plus, Receipt, Trash2, TrendingDown, TrendingUp } from 'lucide-react';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';

type ServiceRow = {
    id: number;
    name: string;
    amount: number;
    amount_label: string;
    description: string | null;
    created_at: string | null;
};

interface PersonalServiceIndexProps {
    todayDateFormatted: string;
    todayEarnings: number;
    sessionEarnings: number;
    totalPersonalServices: number;
    totalExpenses: number;
    netEarnings: number;
    completedOrdersToday: number;
    hasOpenLiveSession: boolean;
    hasSessionToday: boolean;
    services: ServiceRow[];
}

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Dashboard', href: '/dashboard' },
    { title: 'Mis servicios', href: '/mis-servicios' },
];

const cardClass =
    'border border-slate-200/80 bg-white p-4 shadow-sm dark:border-[#2b2b2b] dark:bg-[#262626] sm:p-5';

export default function PersonalServiceIndex({
    todayDateFormatted,
    todayEarnings,
    sessionEarnings,
    totalPersonalServices,
    totalExpenses,
    netEarnings,
    hasOpenLiveSession,
    hasSessionToday,
    services,
}: PersonalServiceIndexProps) {
    const { canEdit } = useSectionAccess('personal_service');
    const page = usePage();
    const flash = page.props.flash as { success?: string; error?: string } | undefined;

    const [addModalOpen, setAddModalOpen] = useState(false);
    const [editingService, setEditingService] = useState<ServiceRow | null>(null);

    const addForm = useForm({
        name: '',
        amount: '',
        description: '',
    });

    const editForm = useForm({
        name: '',
        amount: '',
        description: '',
    });

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
                    'sessionEarnings',
                    'totalPersonalServices',
                    'totalExpenses',
                    'netEarnings',
                    'completedOrdersToday',
                    'hasOpenLiveSession',
                    'hasSessionToday',
                    'services',
                ],
            });
        }, 5000);

        return () => window.clearInterval(intervalId);
    }, [hasOpenLiveSession]);

    const submitAdd = (e: React.FormEvent) => {
        e.preventDefault();
        addForm.post('/mis-servicios', {
            preserveScroll: true,
            onSuccess: () => {
                addForm.reset();
                setAddModalOpen(false);
            },
        });
    };

    const openEdit = (service: ServiceRow) => {
        setEditingService(service);
        editForm.setData({
            name: service.name,
            amount: String(service.amount),
            description: service.description ?? '',
        });
        editForm.clearErrors();
    };

    const closeEdit = () => {
        setEditingService(null);
        editForm.reset();
        editForm.clearErrors();
    };

    const submitEdit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!editingService) return;

        editForm.put(`/mis-servicios/${editingService.id}`, {
            preserveScroll: true,
            onSuccess: () => closeEdit(),
        });
    };

    const deleteService = async (service: ServiceRow) => {
        const confirmed = await confirmAction({
            title: '¿Eliminar servicio?',
            text: `${service.name} — ${service.amount_label}`,
            confirmText: 'Sí, eliminar',
            icon: 'warning',
        });

        if (!confirmed) return;

        router.delete(`/mis-servicios/${service.id}`, { preserveScroll: true });
    };

    const netTone =
        netEarnings > 0.01
            ? 'text-emerald-600 dark:text-emerald-400'
            : netEarnings < -0.01
              ? 'text-rose-600 dark:text-rose-400'
              : 'text-slate-700 dark:text-slate-200';

    return (
        <AppLayout breadcrumbs={breadcrumbs} title="Mis servicios">
            <Head title="Mis servicios" />

            <div className="flex w-full flex-col gap-4">
                <Card className={cardClass}>
                    <div className="flex items-start gap-3">
                        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-sidebar-active/10 text-sidebar-active">
                            <Briefcase className="h-5 w-5" />
                        </div>
                        <div className="min-w-0 flex-1">
                            <p className="text-sm text-slate-500">Servicios propios del día</p>
                            <p className="mt-0.5 text-lg font-semibold text-slate-900 dark:text-white">
                                {todayDateFormatted}
                            </p>
                            <p className="mt-1 text-xs text-slate-500">
                                Fuera de la empresa. Todo el monto es tuyo, sin comisión.
                            </p>
                        </div>
                    </div>

                    <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                        <div className="rounded-xl bg-violet-50 px-3 py-3 dark:bg-violet-950/30">
                            <div className="flex items-center gap-1.5 text-[10px] font-semibold uppercase text-violet-700 dark:text-violet-400">
                                <Briefcase className="h-3.5 w-3.5" />
                                Mis servicios hoy
                            </div>
                            <p className="mt-1 text-xl font-bold text-violet-600 dark:text-violet-400">
                                ${formatCurrency(totalPersonalServices)}
                            </p>
                        </div>
                        <div className="rounded-xl bg-emerald-50 px-3 py-3 dark:bg-emerald-950/30">
                            <div className="flex items-center gap-1.5 text-[10px] font-semibold uppercase text-emerald-700 dark:text-emerald-400">
                                <TrendingUp className="h-3.5 w-3.5" />
                                Ganancias del día
                            </div>
                            <p className="mt-1 text-xl font-bold text-emerald-600 dark:text-emerald-400">
                                ${formatCurrency(todayEarnings)}
                            </p>
                            {sessionEarnings > 0 && totalPersonalServices > 0 && (
                                <p className="mt-1 text-[10px] text-slate-500">
                                    Jornada ${formatCurrency(sessionEarnings)} + propios $
                                    {formatCurrency(totalPersonalServices)}
                                </p>
                            )}
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
                                Ganancias netas
                            </div>
                            <p className={cn('mt-1 text-xl font-bold', netTone)}>
                                ${formatCurrency(Math.abs(netEarnings))}
                                {netEarnings < -0.01 && (
                                    <span className="ml-1 text-sm font-semibold">en negativo</span>
                                )}
                            </p>
                        </div>
                    </div>

                    {canEdit && (
                        <button
                            type="button"
                            onClick={() => setAddModalOpen(true)}
                            className="mt-4 inline-flex h-10 w-full items-center justify-center gap-2 rounded-xl bg-sidebar-active text-sm font-semibold text-white hover:opacity-90 sm:w-auto sm:px-6"
                        >
                            <Plus className="h-4 w-4" />
                            Agregar servicio
                        </button>
                    )}
                </Card>

                <Card className={cardClass}>
                    <h2 className="text-base font-semibold text-slate-900 dark:text-white">
                        Servicios de hoy
                    </h2>

                    {services.length === 0 ? (
                        <p className="mt-4 rounded-xl border border-dashed border-slate-200 py-8 text-center text-sm text-slate-500 dark:border-[#3a3a3a]">
                            {hasSessionToday
                                ? 'Aún no registras servicios propios hoy.'
                                : 'Registra tus servicios personales del día.'}
                        </p>
                    ) : (
                        <ul className="mt-4 space-y-2">
                            {services.map((service) => (
                                <li
                                    key={service.id}
                                    className="flex items-start justify-between gap-3 rounded-xl border border-slate-200 bg-slate-50/50 p-3 dark:border-[#3a3a3a] dark:bg-[#1f1f1f]/50"
                                >
                                    <div className="min-w-0">
                                        <p className="text-sm font-semibold text-slate-900 dark:text-white">
                                            {service.name}
                                        </p>
                                        {service.description && (
                                            <p className="mt-0.5 text-xs text-slate-500">
                                                {service.description}
                                            </p>
                                        )}
                                        {service.created_at && (
                                            <p className="mt-1 text-[10px] text-slate-400">
                                                {service.created_at}
                                            </p>
                                        )}
                                    </div>
                                    <div className="flex shrink-0 items-center gap-1">
                                        <p className="text-sm font-bold tabular-nums text-violet-600 dark:text-violet-400">
                                            +{service.amount_label}
                                        </p>
                                        {canEdit && (
                                            <>
                                                <button
                                                    type="button"
                                                    onClick={() => openEdit(service)}
                                                    className="rounded p-1.5 text-slate-500 hover:bg-slate-100 dark:hover:bg-[#333]"
                                                    title="Editar"
                                                >
                                                    <Pencil className="h-4 w-4" />
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => deleteService(service)}
                                                    className="rounded p-1.5 text-slate-500 hover:bg-slate-100 dark:hover:bg-[#333]"
                                                    title="Eliminar"
                                                >
                                                    <Trash2 className="h-4 w-4" />
                                                </button>
                                            </>
                                        )}
                                    </div>
                                </li>
                            ))}
                        </ul>
                    )}
                </Card>

                <Dialog open={addModalOpen} onOpenChange={setAddModalOpen}>
                    <DialogContent className="sm:max-w-md">
                        <DialogHeader>
                            <DialogTitle>Agregar servicio propio</DialogTitle>
                            <DialogDescription>
                                El monto completo suma a tus ganancias del día. Sin comisión de
                                empresa.
                            </DialogDescription>
                        </DialogHeader>
                        <form onSubmit={submitAdd} noValidate className="space-y-4">
                            <div>
                                <Label htmlFor="service_name" className="mb-1 block text-xs text-slate-500">
                                    Nombre del pedido
                                </Label>
                                <Input
                                    id="service_name"
                                    value={addForm.data.name}
                                    onChange={(e) => addForm.setData('name', e.target.value)}
                                    placeholder="Ej. Reparto express, mandado"
                                    className={cn(addForm.errors.name && 'border-rose-500')}
                                />
                                {addForm.errors.name && (
                                    <p className="mt-1 text-xs text-rose-600">{addForm.errors.name}</p>
                                )}
                            </div>
                            <div>
                                <Label htmlFor="service_amount" className="mb-1 block text-xs text-slate-500">
                                    Monto ($)
                                </Label>
                                <Input
                                    id="service_amount"
                                    type="number"
                                    min={0.01}
                                    step="0.01"
                                    value={addForm.data.amount}
                                    onChange={(e) => addForm.setData('amount', e.target.value)}
                                    className={cn(addForm.errors.amount && 'border-rose-500')}
                                />
                                {addForm.errors.amount && (
                                    <p className="mt-1 text-xs text-rose-600">{addForm.errors.amount}</p>
                                )}
                            </div>
                            <div>
                                <Label
                                    htmlFor="service_description"
                                    className="mb-1 block text-xs text-slate-500"
                                >
                                    Descripción (opcional)
                                </Label>
                                <Input
                                    id="service_description"
                                    value={addForm.data.description}
                                    onChange={(e) => addForm.setData('description', e.target.value)}
                                />
                            </div>
                            <DialogFooter className="gap-2 sm:gap-0">
                                <button
                                    type="button"
                                    onClick={() => setAddModalOpen(false)}
                                    className="inline-flex h-10 items-center justify-center rounded-xl border border-slate-200 px-4 text-sm font-medium text-slate-700 dark:border-[#3a3a3a] dark:text-slate-200"
                                >
                                    Cancelar
                                </button>
                                <button
                                    type="submit"
                                    disabled={addForm.processing}
                                    className="inline-flex h-10 items-center justify-center rounded-xl bg-sidebar-active px-4 text-sm font-semibold text-white disabled:opacity-50"
                                >
                                    {addForm.processing ? 'Guardando...' : 'Guardar'}
                                </button>
                            </DialogFooter>
                        </form>
                    </DialogContent>
                </Dialog>

                <Dialog
                    open={editingService !== null}
                    onOpenChange={(open) => {
                        if (!open) closeEdit();
                    }}
                >
                    <DialogContent className="sm:max-w-md">
                        <DialogHeader>
                            <DialogTitle>Editar servicio</DialogTitle>
                            <DialogDescription>
                                Al guardar, se recalculan tus ganancias del día.
                            </DialogDescription>
                        </DialogHeader>
                        <form onSubmit={submitEdit} noValidate className="space-y-4">
                            <div>
                                <Label htmlFor="edit_service_name" className="mb-1 block text-xs text-slate-500">
                                    Nombre del pedido
                                </Label>
                                <Input
                                    id="edit_service_name"
                                    value={editForm.data.name}
                                    onChange={(e) => editForm.setData('name', e.target.value)}
                                    className={cn(editForm.errors.name && 'border-rose-500')}
                                />
                            </div>
                            <div>
                                <Label
                                    htmlFor="edit_service_amount"
                                    className="mb-1 block text-xs text-slate-500"
                                >
                                    Monto ($)
                                </Label>
                                <Input
                                    id="edit_service_amount"
                                    type="number"
                                    min={0.01}
                                    step="0.01"
                                    value={editForm.data.amount}
                                    onChange={(e) => editForm.setData('amount', e.target.value)}
                                    className={cn(editForm.errors.amount && 'border-rose-500')}
                                />
                            </div>
                            <div>
                                <Label
                                    htmlFor="edit_service_description"
                                    className="mb-1 block text-xs text-slate-500"
                                >
                                    Descripción (opcional)
                                </Label>
                                <Input
                                    id="edit_service_description"
                                    value={editForm.data.description}
                                    onChange={(e) => editForm.setData('description', e.target.value)}
                                />
                            </div>
                            <DialogFooter className="gap-2 sm:gap-0">
                                <button
                                    type="button"
                                    onClick={closeEdit}
                                    className="inline-flex h-10 items-center justify-center rounded-xl border border-slate-200 px-4 text-sm font-medium text-slate-700 dark:border-[#3a3a3a] dark:text-slate-200"
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
