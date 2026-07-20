import AppLayout from '@/layouts/app-layout';
import { Card } from '@/components/ui';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { calculatePurchaseCharge, formatDuration, sumListPrices } from '@/lib/delivery-commission';
import {
    confirmAction,
    confirmCancelPersonalService,
} from '@/lib/sweetalert';
import {
    clearPersonalServiceDraft,
    draftHasContent,
    draftToFormData,
    inferListOpenFromDraft,
    loadPersonalServiceDraft,
    savePersonalServiceDraft,
    serviceToFormDraft,
} from '@/lib/reparto-personal-service-draft';
import { formatCurrency, cn } from '@/lib/utils';
import { useElapsedTime } from '@/hooks/use-elapsed-time';
import {
    ActivePersonalServicesBar,
    type ActivePersonalServiceSummary,
} from '@/components/reparto/active-personal-services-bar';
import {
    Collapsible,
    CollapsibleContent,
    CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { type BreadcrumbItem } from '@/types';
import { Head, Link, useForm, usePage } from '@inertiajs/react';
import { useSectionAccess } from '@/hooks/useSectionAccess';
import { CheckCircle2, ChevronDown, Clock, Plus, Trash2 } from 'lucide-react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { toast } from 'sonner';

type ServiceItem = {
    id?: number;
    description: string;
    price: number;
    is_completed: boolean;
};

type ServiceData = {
    id: number;
    name: string;
    amount: number;
    spent_amount: number | null;
    client_charge: number;
    description: string | null;
    started_at: string | null;
    items: ServiceItem[];
};

type ListItem = {
    description: string;
    price: string;
    is_completed: boolean;
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

    const loadedDraft = useRef(loadPersonalServiceDraft(service.id)).current;
    const savedDraft =
        loadedDraft && draftHasContent(loadedDraft) ? loadedDraft : null;
    const serverDraft = serviceToFormDraft(service);

    const [listOpen, setListOpen] = useState(() =>
        savedDraft ? inferListOpenFromDraft(savedDraft, service) : serverDraft.list_open,
    );

    const form = useForm(
        savedDraft ? draftToFormData(savedDraft) : draftToFormData(serverDraft),
    );

    useEffect(() => {
        if (flash?.success) toast.success(flash.success);
        if (flash?.error) toast.error(flash.error);
    }, [flash?.success, flash?.error]);

    const buildLocalDraft = useCallback(
        () => ({
            name: form.data.name,
            amount: form.data.amount,
            spent_amount: form.data.spent_amount,
            description: form.data.description,
            items: form.data.items,
            list_open: listOpen,
        }),
        [form.data, listOpen],
    );

    const buildLocalDraftRef = useRef(buildLocalDraft);
    buildLocalDraftRef.current = buildLocalDraft;

    useEffect(() => {
        const serviceId = service.id;
        const timer = window.setTimeout(() => {
            const draft = buildLocalDraftRef.current();
            if (draftHasContent(draft)) {
                savePersonalServiceDraft(serviceId, draft);
            }
        }, 200);

        return () => {
            window.clearTimeout(timer);
            const draft = buildLocalDraftRef.current();
            if (draftHasContent(draft)) {
                savePersonalServiceDraft(serviceId, draft);
            }
        };
    }, [service.id, buildLocalDraft]);

    const serviceAmount = parseFloat(form.data.amount) || 0;
    const listTotal = useMemo(
        () => sumListPrices(form.data.items),
        [form.data.items],
    );
    const hasListPrices = form.data.items.some((item) => parseFloat(item.price) > 0);
    const purchaseAmount = useMemo(() => {
        if (hasListPrices) {
            return listTotal;
        }

        return parseFloat(form.data.spent_amount) || 0;
    }, [form.data.spent_amount, hasListPrices, listTotal]);
    const clientCharge = useMemo(
        () => calculatePurchaseCharge(purchaseAmount, serviceAmount),
        [purchaseAmount, serviceAmount],
    );

    const syncSpentAmountFromList = (items: ListItem[]) => {
        const total = sumListPrices(items);
        if (items.some((item) => parseFloat(item.price) > 0)) {
            form.setData('spent_amount', total > 0 ? String(total) : '');
        }
    };

    const addListItem = () => {
        const items = [
            ...form.data.items,
            { description: '', price: '', is_completed: false },
        ];
        form.setData('items', items);
    };

    const updateListItem = (
        index: number,
        field: keyof ListItem,
        value: string | boolean,
    ) => {
        const items = [...form.data.items];
        items[index] = { ...items[index], [field]: value };
        form.setData('items', items);

        if (field === 'price') {
            syncSpentAmountFromList(items);
            clearField('spent_amount');
        }
    };

    const removeListItem = (index: number) => {
        const items = form.data.items.filter((_, itemIndex) => itemIndex !== index);
        form.setData('items', items);
        syncSpentAmountFromList(items);
    };

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

        if (form.data.spent_amount !== '' && purchaseAmount < 0) {
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

    const buildPayload = () => {
        const spent = hasListPrices ? listTotal : parseFloat(form.data.spent_amount) || 0;

        return {
            name: form.data.name.trim(),
            amount: form.data.amount,
            spent_amount: spent > 0 ? String(spent) : '',
            description: form.data.description.trim() || '',
            items: form.data.items.filter((item) => item.description.trim() !== ''),
        };
    };

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
            onSuccess: () => clearPersonalServiceDraft(service.id),
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

        form.post(`/reparto/servicios-propios/${service.id}/cancelar`, {
            onSuccess: () => clearPersonalServiceDraft(service.id),
        });
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
                                <Label className="mb-1 block text-xs text-slate-500">
                                    Monto gastado ($){' '}
                                    {!hasListPrices && (
                                        <span className="font-normal">opc.</span>
                                    )}
                                </Label>
                                {hasListPrices ? (
                                    <div className="flex h-10 items-center rounded-md border border-slate-200 bg-slate-50 px-3 text-sm font-semibold tabular-nums dark:border-[#3a3a3a] dark:bg-[#1f1f1f]">
                                        ${formatCurrency(listTotal)}
                                    </div>
                                ) : (
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
                                )}
                                {form.errors.spent_amount && (
                                    <p className="mt-1 text-xs text-rose-600">
                                        {form.errors.spent_amount}
                                    </p>
                                )}
                            </div>
                        </div>

                        <Collapsible open={listOpen} onOpenChange={setListOpen}>
                            <CollapsibleTrigger className="flex w-full items-center justify-between rounded-lg border border-slate-200 px-3 py-2.5 text-sm font-medium dark:border-[#3a3a3a]">
                                Desglose compra
                                <ChevronDown
                                    className={cn(
                                        'h-4 w-4 transition-transform',
                                        listOpen && 'rotate-180',
                                    )}
                                />
                            </CollapsibleTrigger>
                            <CollapsibleContent className="space-y-2 pt-2">
                                {form.data.items.map((item, index) => (
                                    <div key={index} className="flex items-center gap-2">
                                        <Input
                                            value={item.description}
                                            onChange={(e) =>
                                                updateListItem(
                                                    index,
                                                    'description',
                                                    e.target.value,
                                                )
                                            }
                                            placeholder="Producto"
                                            className="min-w-0 flex-1"
                                        />
                                        <Input
                                            type="number"
                                            min={0}
                                            step="0.01"
                                            value={item.price}
                                            onChange={(e) =>
                                                updateListItem(index, 'price', e.target.value)
                                            }
                                            className="w-24"
                                        />
                                        <button
                                            type="button"
                                            onClick={() => removeListItem(index)}
                                            className="shrink-0 p-2 text-rose-500"
                                        >
                                            <Trash2 className="h-4 w-4" />
                                        </button>
                                    </div>
                                ))}
                                <button
                                    type="button"
                                    onClick={() => {
                                        addListItem();
                                        setListOpen(true);
                                    }}
                                    className="flex w-full items-center justify-center gap-1 rounded-lg border border-dashed py-2 text-sm text-slate-600 dark:border-[#3a3a3a]"
                                >
                                    <Plus className="h-4 w-4" />
                                    Agregar
                                </button>
                            </CollapsibleContent>
                        </Collapsible>

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
                    {purchaseAmount > 0 && serviceAmount > 0 && (
                        <p className="mt-1 text-center text-xs text-slate-500 max-[499px]:text-[10px]">
                            ${formatCurrency(purchaseAmount)} + ${formatCurrency(serviceAmount)} = $
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
