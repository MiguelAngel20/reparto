import AppLayout from '@/layouts/app-layout';
import { Card } from '@/components/ui';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { calculatePurchaseCharge, formatDuration } from '@/lib/delivery-commission';
import {
    confirmAction,
    confirmCancelPersonalService,
} from '@/lib/sweetalert';
import { formatCurrency, cn } from '@/lib/utils';
import { useElapsedTime } from '@/hooks/use-elapsed-time';
import {
    ActivePersonalServicesBar,
    type ActivePersonalServiceSummary,
} from '@/components/reparto/active-personal-services-bar';
import { type BreadcrumbItem } from '@/types';
import { Head, Link, useForm, usePage } from '@inertiajs/react';
import { useSectionAccess } from '@/hooks/useSectionAccess';
import { Briefcase, CheckCircle2, Clock } from 'lucide-react';
import { useEffect, useMemo } from 'react';
import { toast } from 'sonner';

type ServiceData = {
    id: number;
    name: string;
    amount: number;
    spent_amount: number | null;
    client_charge: number;
    description: string | null;
    started_at: string | null;
};

interface ShowPersonalServiceProps {
    service: ServiceData;
    activeServices?: ActivePersonalServiceSummary[];
}

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Dashboard', href: '/dashboard' },
    { title: 'Reparto', href: '/reparto' },
    { title: 'Servicio propio', href: '#' },
];

const cardClass =
    'border border-slate-200/80 bg-white p-4 shadow-sm dark:border-[#2b2b2b] dark:bg-[#262626] sm:p-5';

export default function ShowPersonalService(props: ShowPersonalServiceProps) {
    return <ShowPersonalServicePage key={props.service.id} {...props} />;
}

function ShowPersonalServicePage({
    service,
    activeServices = [],
}: ShowPersonalServiceProps) {
    const { canEdit } = useSectionAccess('personal_service');
    const page = usePage();
    const flash = page.props.flash as { success?: string; error?: string } | undefined;
    const elapsed = useElapsedTime(service.started_at);

    const form = useForm({
        name: service.name,
        amount: String(service.amount),
        spent_amount:
            service.spent_amount !== null ? String(service.spent_amount) : '',
        description: service.description ?? '',
    });

    useEffect(() => {
        if (flash?.success) toast.success(flash.success);
        if (flash?.error) toast.error(flash.error);
    }, [flash?.success, flash?.error]);

    const serviceAmount = parseFloat(form.data.amount) || 0;
    const spentAmount = parseFloat(form.data.spent_amount) || 0;
    const clientCharge = useMemo(
        () => calculatePurchaseCharge(spentAmount, serviceAmount),
        [spentAmount, serviceAmount],
    );

    const clearField = (field: 'name' | 'amount' | 'spent_amount') => {
        if (form.errors[field]) {
            form.clearErrors(field);
        }
    };

    const validateForm = (): boolean => {
        form.clearErrors();
        const errors: Record<string, string> = {};

        if (!form.data.name.trim()) {
            errors.name = 'Indica el nombre del pedido.';
        }

        if (!form.data.amount || serviceAmount < 0.01) {
            errors.amount = 'Indica el monto del servicio.';
        }

        if (form.data.spent_amount !== '' && spentAmount < 0) {
            errors.spent_amount = 'El monto gastado no puede ser negativo.';
        }

        Object.entries(errors).forEach(([key, message]) => {
            form.setError(key as 'name' | 'amount' | 'spent_amount', message);
        });

        if (Object.keys(errors).length > 0) {
            toast.error(Object.values(errors)[0]);
            return false;
        }

        return true;
    };

    const buildPayload = () => ({
        name: form.data.name.trim(),
        amount: form.data.amount,
        spent_amount: form.data.spent_amount !== '' ? form.data.spent_amount : '',
        description: form.data.description.trim() || '',
    });

    const finalizeService = async () => {
        if (!validateForm()) return;

        const confirmed = await confirmAction({
            title: '¿Finalizar servicio propio?',
            text: 'Se registrará este servicio en tus ganancias del día.',
            confirmText: 'Sí, finalizar',
            cancelText: 'Seguir editando',
        });
        if (!confirmed) return;

        form.transform(() => buildPayload());
        form.post(`/reparto/servicios-propios/${service.id}/finalizar`, {
            onError: (errors: Record<string, string>) => {
                const first = Object.values(errors).find(
                    (msg) => typeof msg === 'string',
                );
                toast.error(
                    first ?? 'No se pudo finalizar el servicio. Revisa los datos.',
                );
            },
        });
    };

    const cancelService = async () => {
        const confirmed = await confirmCancelPersonalService();
        if (!confirmed) return;

        form.post(`/reparto/servicios-propios/${service.id}/cancelar`);
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs} title="Servicio propio">
            <Head title="Servicio propio" />

            <Link
                href="/reparto"
                className="mb-3 inline-block text-sm text-slate-600 dark:text-slate-400"
            >
                ← Reparto
            </Link>

            <div className="flex w-full flex-col gap-3">
                {activeServices.length > 0 && (
                    <ActivePersonalServicesBar
                        services={activeServices}
                        currentServiceId={service.id}
                        compact
                        showNewServiceButton={canEdit}
                    />
                )}

                <div className="flex items-center justify-between rounded-xl border border-violet-200/60 bg-white px-4 py-3 dark:border-violet-900/40 dark:bg-[#262626]">
                    <div className="flex items-center gap-2 text-violet-600 dark:text-violet-400">
                        <Clock className="h-5 w-5" />
                        <span className="font-mono text-2xl font-bold text-slate-900 dark:text-white">
                            {formatDuration(elapsed)}
                        </span>
                    </div>
                    <p className="text-xs text-slate-500">
                        {activeServices.length > 1
                            ? `Servicio ${activeServices.findIndex((s) => s.id === service.id) + 1} de ${activeServices.length}`
                            : 'En curso'}
                    </p>
                </div>

                <Card className={cardClass}>

                    <div className="space-y-4">
                        <div>
                            <Label htmlFor="name" className="mb-1 block text-xs text-slate-500">
                                Nombre del pedido
                            </Label>
                            <Input
                                id="name"
                                value={form.data.name}
                                onChange={(e) => {
                                    form.setData('name', e.target.value);
                                    clearField('name');
                                }}
                                placeholder="Ej. Reparto express"
                                className={cn(form.errors.name && 'border-rose-500')}
                            />
                            {form.errors.name && (
                                <p className="mt-1 text-xs text-rose-600">{form.errors.name}</p>
                            )}
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <Label
                                    htmlFor="amount"
                                    className="mb-1 block text-xs text-slate-500"
                                >
                                    Monto del servicio ($)
                                </Label>
                                <Input
                                    id="amount"
                                    type="number"
                                    min={0.01}
                                    step="0.01"
                                    value={form.data.amount}
                                    onChange={(e) => {
                                        form.setData('amount', e.target.value);
                                        clearField('amount');
                                    }}
                                    className={cn(form.errors.amount && 'border-rose-500')}
                                />
                                {form.errors.amount && (
                                    <p className="mt-1 text-xs text-rose-600">
                                        {form.errors.amount}
                                    </p>
                                )}
                            </div>
                            <div>
                                <Label
                                    htmlFor="spent_amount"
                                    className="mb-1 block text-xs text-slate-500"
                                >
                                    Monto gastado ($){' '}
                                    <span className="font-normal">opc.</span>
                                </Label>
                                <Input
                                    id="spent_amount"
                                    type="number"
                                    min={0}
                                    step="0.01"
                                    placeholder="0"
                                    value={form.data.spent_amount}
                                    onChange={(e) => {
                                        form.setData('spent_amount', e.target.value);
                                        clearField('spent_amount');
                                    }}
                                    className={cn(form.errors.spent_amount && 'border-rose-500')}
                                />
                                {form.errors.spent_amount && (
                                    <p className="mt-1 text-xs text-rose-600">
                                        {form.errors.spent_amount}
                                    </p>
                                )}
                            </div>
                        </div>

                        <div>
                            <Label
                                htmlFor="description"
                                className="mb-1 block text-xs text-slate-500"
                            >
                                Descripción (opcional)
                            </Label>
                            <Input
                                id="description"
                                value={form.data.description}
                                onChange={(e) =>
                                    form.setData('description', e.target.value)
                                }
                                placeholder="Detalle del servicio"
                            />
                        </div>
                    </div>
                </Card>

                <div
                    className="hidden max-[499px]:block max-[499px]:h-[5rem] max-[499px]:shrink-0"
                    aria-hidden
                />

                <div className="sticky bottom-0 z-30 -mx-1 rounded-t-2xl border-t border-slate-200 bg-white/95 p-4 shadow-[0_-4px_20px_rgba(0,0,0,0.06)] backdrop-blur max-[499px]:fixed max-[499px]:inset-x-0 max-[499px]:bottom-[calc(4rem+env(safe-area-inset-bottom,0px))] max-[499px]:mx-0 max-[499px]:rounded-t-lg max-[499px]:p-3 dark:border-[#333] dark:bg-[#262626]/95">
                    <div className="flex items-center justify-between gap-2">
                        <span className="text-sm text-slate-500">Cobrar al cliente</span>
                        <span className="text-2xl font-bold text-violet-600 dark:text-violet-400">
                            ${formatCurrency(clientCharge)}
                        </span>
                    </div>
                    {spentAmount > 0 && serviceAmount > 0 && (
                        <p className="mt-1 text-center text-xs text-slate-500 max-[499px]:text-[10px]">
                            ${formatCurrency(spentAmount)} + ${formatCurrency(serviceAmount)} = $
                            {formatCurrency(clientCharge)}
                        </p>
                    )}
                    {Object.keys(form.errors).length > 0 && (
                        <p className="mt-2 text-center text-xs text-rose-600 max-[499px]:mt-1 max-[499px]:text-[10px]">
                            {Object.values(form.errors)[0]}
                        </p>
                    )}
                    {canEdit && (
                        <div className="mt-3 grid gap-2 max-[499px]:mt-2 max-[499px]:grid-cols-2 max-[499px]:gap-2">
                            <button
                                type="button"
                                onClick={finalizeService}
                                disabled={form.processing}
                                className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 text-sm font-semibold text-white disabled:opacity-50 max-[499px]:h-10 max-[499px]:gap-1.5 max-[499px]:rounded-lg max-[499px]:text-xs"
                            >
                                <CheckCircle2 className="h-5 w-5 max-[499px]:h-3.5 max-[499px]:w-3.5" />
                                <span className="max-[499px]:truncate">
                                    {form.processing ? '...' : (
                                        <>
                                            <span className="max-[499px]:hidden">
                                                Finalizar servicio
                                            </span>
                                            <span className="hidden max-[499px]:inline">
                                                Finalizar
                                            </span>
                                        </>
                                    )}
                                </span>
                            </button>
                            <button
                                type="button"
                                onClick={cancelService}
                                disabled={form.processing}
                                className="inline-flex h-10 w-full items-center justify-center rounded-xl bg-rose-600 text-sm font-semibold text-white disabled:opacity-50 max-[499px]:h-10 max-[499px]:rounded-lg max-[499px]:text-xs"
                            >
                                <span className="max-[499px]:truncate">
                                    <span className="max-[499px]:hidden">Cancelar servicio</span>
                                    <span className="hidden max-[499px]:inline">Cancelar</span>
                                </span>
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </AppLayout>
    );
}
