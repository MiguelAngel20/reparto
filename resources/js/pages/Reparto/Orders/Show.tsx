import AppLayout from '@/layouts/app-layout';
import { Card } from '@/components/ui';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import {
    calculatePurchaseCharge,
    formatDuration,
    sumListPrices,
} from '@/lib/delivery-commission';
import { confirmCancelOrder, confirmFinalizeOrder, confirmSaveCompletedOrder } from '@/lib/sweetalert';
import { validateActiveOrder } from '@/lib/reparto-validation';
import {
    clearOrderDraft,
    draftToFormData,
    inferExtrasEnabledFromDraft,
    inferListOpenFromDraft,
    loadOrderDraft,
    orderToFormDraft,
    saveOrderDraft,
    type OrderFormDraft,
} from '@/lib/reparto-order-draft';
import { formatCurrency, cn } from '@/lib/utils';
import { useElapsedTime } from '@/hooks/use-elapsed-time';
import { type BreadcrumbItem } from '@/types';
import { Head, Link, useForm } from '@inertiajs/react';
import {
    Collapsible,
    CollapsibleContent,
    CollapsibleTrigger,
} from '@/components/ui/collapsible';
import {
    CheckCircle2,
    ChevronDown,
    Clock,
    Plus,
    Trash2,
    XCircle,
} from 'lucide-react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { toast } from 'sonner';

type OrderItem = {
    id?: number;
    description: string;
    price: number;
    is_completed: boolean;
};

type OrderData = {
    id: number;
    name: string;
    service_cost: number;
    order_type: string;
    product_cost: number | null;
    cash_spent: number | null;
    cash_received: number | null;
    user_extra: number | null;
    clikio_extra: number | null;
    discount: number | null;
    client_payment_mode: string;
    cash_collected: number | null;
    transfer_discount: number | null;
    box_adjustment: number | null;
    notes: string | null;
    started_at: string;
    duration_seconds?: number | null;
    completed_at_formatted?: string | null;
    items: OrderItem[];
};

interface ShowOrderProps {
    order: OrderData;
    userPercentage: number;
    companyName: string;
    isEditingCompleted?: boolean;
}

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Dashboard', href: '/dashboard' },
    { title: 'Reparto', href: '/reparto' },
    { title: 'Pedido en curso', href: '#' },
];

const cardClass =
    'border border-slate-200/80 bg-white p-4 shadow-sm dark:border-[#2b2b2b] dark:bg-[#262626] sm:p-5';

const PAYMENT_MODES = [
    { value: 'cash', label: 'Efectivo' },
    { value: 'transfer', label: 'Transf.' },
] as const;

type ListItem = {
    description: string;
    price: string;
    is_completed: boolean;
};

function defaultExtrasEnabled(o: OrderData): boolean {
    return (
        (o.user_extra ?? 0) > 0 ||
        (o.clikio_extra ?? 0) > 0 ||
        ((o.discount ?? 0) > 0 && o.client_payment_mode !== 'transfer')
    );
}

export default function ShowOrder({
    order,
    companyName,
    isEditingCompleted = false,
}: ShowOrderProps) {
    const elapsed = useElapsedTime(isEditingCompleted ? null : order.started_at);
    const savedDraft = useRef(
        isEditingCompleted ? null : loadOrderDraft(order.id),
    ).current;
    const serverDraft = orderToFormDraft(
        order,
        defaultExtrasEnabled(order),
        order.items.length > 0 || (order.cash_spent ?? 0) > 0,
    );

    const [extrasEnabled, setExtrasEnabled] = useState(() =>
        savedDraft ? inferExtrasEnabledFromDraft(savedDraft) : defaultExtrasEnabled(order),
    );
    const [listOpen, setListOpen] = useState(() =>
        savedDraft ? inferListOpenFromDraft(savedDraft, order) : serverDraft.list_open,
    );

    const form = useForm(savedDraft ? draftToFormData(savedDraft) : draftToFormData(serverDraft));

    const serviceCost = parseFloat(form.data.service_cost) || 0;
    const listTotal = useMemo(
        () => sumListPrices(form.data.items),
        [form.data.items],
    );
    const hasListPrices = form.data.items.some((i) => parseFloat(i.price) > 0);
    const purchaseAmount = useMemo(() => {
        if (hasListPrices) {
            return listTotal;
        }
        return parseFloat(form.data.cash_spent) || 0;
    }, [form.data.cash_spent, hasListPrices, listTotal]);

    const totalToCharge = useMemo(
        () => calculatePurchaseCharge(purchaseAmount, serviceCost),
        [purchaseAmount, serviceCost],
    );

    const clientTotal = totalToCharge;
    const paymentMode = form.data.client_payment_mode;
    const isTransferMode = paymentMode === 'transfer';

    const setPaymentMode = (mode: 'cash' | 'transfer') => {
        if (mode === 'transfer') {
            form.setData({
                ...form.data,
                client_payment_mode: mode,
                cash_collected: '',
                discount: form.data.service_cost || form.data.discount,
            });
            return;
        }

        // Al volver a efectivo se limpia el descuento que aplicó la transferencia
        form.setData({
            ...form.data,
            client_payment_mode: mode,
            cash_collected: '',
            discount: '',
        });
    };

    const handleServiceCostChange = (value: string) => {
        if (isTransferMode) {
            form.setData({
                ...form.data,
                service_cost: value,
                discount: value,
            });
            return;
        }

        form.setData('service_cost', value);
        clearField('service_cost');
    };

    const clearField = (field: 'name' | 'service_cost' | 'cash_spent') => {
        if (form.errors[field]) {
            form.clearErrors(field);
        }
    };

    const syncCashSpentFromList = (items: ListItem[]) => {
        const total = sumListPrices(items);
        if (items.some((i) => parseFloat(i.price) > 0)) {
            form.setData('cash_spent', total > 0 ? String(total) : '');
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
            syncCashSpentFromList(items);
            clearField('cash_spent');
        }
    };

    const removeListItem = (index: number) => {
        const items = form.data.items.filter((_, i) => i !== index);
        form.setData('items', items);
        syncCashSpentFromList(items);
    };

    const buildLocalDraft = useCallback((): OrderFormDraft => {
        return {
            ...form.data,
            extras_enabled: extrasEnabled,
            list_open: listOpen,
        };
    }, [form.data, extrasEnabled, listOpen]);

    useEffect(() => {
        if (isEditingCompleted) {
            return;
        }

        const timer = window.setTimeout(() => {
            saveOrderDraft(order.id, buildLocalDraft());
        }, 400);

        return () => window.clearTimeout(timer);
    }, [order.id, buildLocalDraft, isEditingCompleted]);

    const inferOrderType = (): 'cash_out' | 'service_only' => {
        const spent = hasListPrices ? listTotal : parseFloat(form.data.cash_spent) || 0;

        return spent > 0 ? 'cash_out' : 'service_only';
    };

    const buildFinalizePayload = useCallback(() => {
        const orderType = inferOrderType();
        const amount = hasListPrices ? listTotal : parseFloat(form.data.cash_spent) || 0;
        const paymentMode =
            form.data.client_payment_mode === 'transfer' ? 'transfer' : 'cash';

        return {
            ...form.data,
            order_type: orderType,
            cash_spent: orderType === 'cash_out' ? String(amount) : '',
            cash_collected: '',
            client_payment_mode: paymentMode,
            items: form.data.items.filter((i) => i.description.trim() !== ''),
        };
    }, [form.data, hasListPrices, listTotal]);

    const saveCompletedOrder = async () => {
        form.clearErrors();
        const clientErrors = validateActiveOrder({
            name: form.data.name,
            service_cost: form.data.service_cost,
            client_payment_mode: form.data.client_payment_mode,
        });
        Object.entries(clientErrors).forEach(([key, message]) => {
            form.setError(key as 'name' | 'service_cost' | 'cash_spent', message);
        });
        if (Object.keys(clientErrors).length > 0) {
            toast.error(Object.values(clientErrors)[0]);
            return;
        }

        const confirmed = await confirmSaveCompletedOrder();
        if (!confirmed) return;

        form.transform(() => buildFinalizePayload());
        form.put(`/reparto/pedidos/${order.id}/actualizar`, {
            onSuccess: () => clearOrderDraft(order.id),
            onError: (errors: Record<string, string>) => {
                const first = Object.values(errors).find(
                    (msg) => typeof msg === 'string',
                );
                toast.error(
                    first ?? 'No se pudo actualizar el pedido. Revisa los datos.',
                );
            },
        });
    };

    const finalizeOrder = async () => {
        form.clearErrors();
        const clientErrors = validateActiveOrder({
            name: form.data.name,
            service_cost: form.data.service_cost,
            client_payment_mode: form.data.client_payment_mode,
        });
        Object.entries(clientErrors).forEach(([key, message]) => {
            form.setError(key as 'name' | 'service_cost' | 'cash_spent', message);
        });
        if (Object.keys(clientErrors).length > 0) {
            toast.error(Object.values(clientErrors)[0]);
            return;
        }

        const confirmed = await confirmFinalizeOrder();
        if (!confirmed) return;

        form.transform(() => buildFinalizePayload());
        form.post(`/reparto/pedidos/${order.id}/finalizar`, {
            onSuccess: () => clearOrderDraft(order.id),
            onError: (errors: Record<string, string>) => {
                const first = Object.values(errors).find(
                    (msg) => typeof msg === 'string',
                );
                toast.error(
                    first ?? 'No se pudo finalizar el pedido. Revisa los datos.',
                );
            },
        });
    };

    const cancelOrder = async () => {
        const confirmed = await confirmCancelOrder();
        if (!confirmed) return;
        clearOrderDraft(order.id);
        form.post(`/reparto/pedidos/${order.id}/cancelar`);
    };

    const pageTitle = isEditingCompleted ? 'Editar pedido' : 'Pedido en curso';

    return (
        <AppLayout breadcrumbs={breadcrumbs} title={pageTitle}>
            <Head title={pageTitle} />

            <Link
                href="/reparto"
                className="mb-3 inline-block text-sm text-slate-600 dark:text-slate-400"
            >
                ← Reparto
            </Link>

            <div className="flex w-full flex-col gap-3 max-[499px]:pb-28">
                <div className="flex items-center justify-between rounded-xl border border-sidebar-active/30 bg-white px-4 py-3 dark:bg-[#262626]">
                    <div className="flex items-center gap-2 text-sidebar-active">
                        <Clock className="h-5 w-5" />
                        <span className="font-mono text-2xl font-bold text-slate-900 dark:text-white">
                            {isEditingCompleted
                                ? formatDuration(order.duration_seconds ?? 0)
                                : formatDuration(elapsed)}
                        </span>
                    </div>
                    <p className="text-xs text-slate-500">
                        {isEditingCompleted
                            ? order.completed_at_formatted
                                ? `Finalizado ${order.completed_at_formatted}`
                                : 'Finalizado'
                            : 'En curso'}
                    </p>
                </div>

                <Card className={cardClass}>
                    <div className="space-y-4">
                        <div>
                            <Label htmlFor="name" className="mb-1 block text-xs text-slate-500">
                                Nombre
                            </Label>
                            <Input
                                id="name"
                                value={form.data.name}
                                onChange={(e) => {
                                    form.setData('name', e.target.value);
                                    clearField('name');
                                }}
                                placeholder="Ej. Soriana"
                                className={cn(form.errors.name && 'border-rose-500')}
                            />
                            {form.errors.name && (
                                <p className="mt-1 text-xs text-rose-600">{form.errors.name}</p>
                            )}
                        </div>

                        <div className="grid grid-cols-2 gap-3 min-[500px]:grid-cols-3">
                            <div>
                                <Label htmlFor="service_cost" className="mb-1 block text-xs text-slate-500">
                                    Servicio ($)
                                </Label>
                                <Input
                                    id="service_cost"
                                    type="number"
                                    min={0}
                                    step="0.01"
                                    value={form.data.service_cost}
                                    onChange={(e) => handleServiceCostChange(e.target.value)}
                                    className={cn(form.errors.service_cost && 'border-rose-500')}
                                />
                            </div>
                            <div>
                                <Label className="mb-1 block text-xs text-slate-500">
                                    Compra ($){' '}
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
                                        type="number"
                                        min={0}
                                        step="0.01"
                                        placeholder="0"
                                        value={form.data.cash_spent}
                                        onChange={(e) => {
                                            form.setData('cash_spent', e.target.value);
                                            clearField('cash_spent');
                                        }}
                                        className={cn(form.errors.cash_spent && 'border-rose-500')}
                                    />
                                )}
                            </div>
                            <div className="col-span-2 min-[500px]:col-span-1">
                                <Label className="mb-1 block text-xs text-slate-500">Pago</Label>
                                <div className="flex gap-2">
                                    {PAYMENT_MODES.map((mode) => (
                                        <button
                                            key={mode.value}
                                            type="button"
                                            onClick={() => setPaymentMode(mode.value)}
                                            className={cn(
                                                'flex-1 rounded-lg py-2 text-xs font-medium',
                                                paymentMode === mode.value
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
                        {form.errors.service_cost && (
                            <p className="text-xs text-rose-600">{form.errors.service_cost}</p>
                        )}
                        {form.errors.cash_spent && (
                            <p className="text-xs text-rose-600">{form.errors.cash_spent}</p>
                        )}

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
                    </div>
                </Card>

                <Card className={cardClass}>
                    <div className="flex items-center justify-between">
                        <span className="text-sm font-medium">Extras / descuento</span>
                        <Switch
                            checked={extrasEnabled}
                            onCheckedChange={setExtrasEnabled}
                            aria-label="Extras y descuento"
                        />
                    </div>

                    {extrasEnabled && (
                        <div className="mt-3 space-y-3">
                            <div className="grid grid-cols-3 gap-2">
                                <div>
                                    <Label className="mb-1 block text-[10px] text-slate-500">
                                        Extra tuyo
                                    </Label>
                                    <Input
                                        type="number"
                                        min={0}
                                        step="0.01"
                                        value={form.data.user_extra}
                                        onChange={(e) =>
                                            form.setData('user_extra', e.target.value)
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
                                        value={form.data.clikio_extra}
                                        onChange={(e) =>
                                            form.setData('clikio_extra', e.target.value)
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
                                        value={form.data.discount}
                                        onChange={(e) =>
                                            form.setData('discount', e.target.value)
                                        }
                                    />
                                </div>
                            </div>
                        </div>
                    )}
                </Card>

                <div className="sticky bottom-0 z-10 -mx-1 rounded-t-2xl border-t border-slate-200 bg-white/95 p-4 shadow-[0_-4px_20px_rgba(0,0,0,0.06)] backdrop-blur max-[499px]:fixed max-[499px]:inset-x-0 max-[499px]:bottom-16 max-[499px]:mx-0 max-[499px]:rounded-t-lg max-[499px]:p-2 dark:border-[#333] dark:bg-[#262626]/95">
                    <div className="flex items-center justify-between gap-2">
                        <span className="text-sm text-slate-500">
                            Total al cliente
                        </span>
                        <span className="text-2xl font-bold text-sidebar-active">
                            ${formatCurrency(clientTotal)}
                        </span>
                    </div>
                    {Object.keys(form.errors).length > 0 && (
                        <p className="mt-2 text-center text-xs text-rose-600 max-[499px]:mt-1 max-[499px]:text-[10px]">
                            {Object.values(form.errors)[0]}
                        </p>
                    )}
                    <div className="mt-3 grid gap-2 max-[499px]:mt-1.5 max-[499px]:grid-cols-2 max-[499px]:gap-1.5">
                        {isEditingCompleted ? (
                            <>
                                <button
                                    type="button"
                                    onClick={saveCompletedOrder}
                                    disabled={form.processing}
                                    className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 text-sm font-semibold text-white disabled:opacity-50 max-[499px]:h-8 max-[499px]:gap-1 max-[499px]:rounded-lg max-[499px]:px-1 max-[499px]:text-[10px]"
                                >
                                    <CheckCircle2 className="h-5 w-5 max-[499px]:h-3.5 max-[499px]:w-3.5" />
                                    <span className="max-[499px]:truncate">
                                        {form.processing ? '...' : (
                                            <>
                                                <span className="max-[499px]:hidden">Guardar cambios</span>
                                                <span className="hidden max-[499px]:inline">Guardar</span>
                                            </>
                                        )}
                                    </span>
                                </button>
                                <Link
                                    href="/reparto"
                                    className="inline-flex h-10 w-full items-center justify-center rounded-xl border border-slate-200 text-sm font-semibold text-slate-700 dark:border-[#3a3a3a] dark:text-slate-200 max-[499px]:h-8 max-[499px]:rounded-lg max-[499px]:px-1 max-[499px]:text-[10px]"
                                >
                                    Volver
                                </Link>
                            </>
                        ) : (
                            <>
                                <button
                                    type="button"
                                    onClick={finalizeOrder}
                                    disabled={form.processing}
                                    className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 text-sm font-semibold text-white disabled:opacity-50 max-[499px]:h-8 max-[499px]:gap-1 max-[499px]:rounded-lg max-[499px]:px-1 max-[499px]:text-[10px]"
                                >
                                    <CheckCircle2 className="h-5 w-5 max-[499px]:h-3.5 max-[499px]:w-3.5" />
                                    <span className="max-[499px]:truncate">
                                        {form.processing ? '...' : (
                                            <>
                                                <span className="max-[499px]:hidden">Finalizar pedido</span>
                                                <span className="hidden max-[499px]:inline">Finalizar</span>
                                            </>
                                        )}
                                    </span>
                                </button>
                                <button
                                    type="button"
                                    onClick={cancelOrder}
                                    disabled={form.processing}
                                    className="inline-flex h-10 w-full items-center justify-center rounded-xl bg-rose-600 text-sm font-semibold text-white disabled:opacity-50 max-[499px]:h-8 max-[499px]:rounded-lg max-[499px]:px-1 max-[499px]:text-[10px]"
                                >
                                    <span className="max-[499px]:truncate">
                                        <span className="max-[499px]:hidden">Cancelar pedido</span>
                                        <span className="hidden max-[499px]:inline">Cancelar</span>
                                    </span>
                                </button>
                            </>
                        )}
                    </div>
                </div>
            </div>
        </AppLayout>
    );
}
