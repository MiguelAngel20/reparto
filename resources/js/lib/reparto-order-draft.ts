export type OrderListItemDraft = {
    description: string;
    price: string;
    is_completed: boolean;
};

export type OrderFormDraft = {
    name: string;
    service_cost: string;
    order_type: string;
    product_cost: string;
    cash_spent: string;
    user_extra: string;
    clikio_extra: string;
    discount: string;
    client_payment_mode: string;
    cash_collected: string;
    notes: string;
    items: OrderListItemDraft[];
    extras_enabled: boolean;
    list_open: boolean;
};

function storageKey(orderId: number): string {
    return `reparto-order-draft-${orderId}`;
}

export function loadOrderDraft(orderId: number): OrderFormDraft | null {
    if (typeof window === 'undefined') {
        return null;
    }

    try {
        const raw = localStorage.getItem(storageKey(orderId));
        if (!raw) {
            return null;
        }

        const parsed = JSON.parse(raw) as OrderFormDraft;
        if (!parsed || typeof parsed !== 'object') {
            return null;
        }

        return parsed;
    } catch {
        return null;
    }
}

export function saveOrderDraft(orderId: number, draft: OrderFormDraft): void {
    if (typeof window === 'undefined') {
        return;
    }

    try {
        localStorage.setItem(storageKey(orderId), JSON.stringify(draft));
    } catch {
        // Quota exceeded u otro error: no bloquear la captura
    }
}

export function clearOrderDraft(orderId: number): void {
    if (typeof window === 'undefined') {
        return;
    }

    localStorage.removeItem(storageKey(orderId));
}

type OrderSnapshot = {
    name: string;
    service_cost: number;
    order_type: string;
    product_cost: number | null;
    cash_spent: number | null;
    user_extra: number | null;
    clikio_extra: number | null;
    discount: number | null;
    client_payment_mode: string;
    cash_collected: number | null;
    notes: string | null;
    items: { description: string; price: number; is_completed: boolean }[];
};

export function orderToFormDraft(
    order: OrderSnapshot,
    extrasEnabled: boolean,
    listOpen: boolean,
): OrderFormDraft {
    return {
        name: order.name,
        service_cost: String(order.service_cost),
        order_type: order.order_type === 'service_only' ? 'service_only' : 'cash_out',
        product_cost: order.product_cost != null ? String(order.product_cost) : '',
        cash_spent: order.cash_spent != null ? String(order.cash_spent) : '',
        user_extra: order.user_extra != null ? String(order.user_extra) : '',
        clikio_extra: order.clikio_extra != null ? String(order.clikio_extra) : '',
        discount: order.discount != null ? String(order.discount) : '',
        client_payment_mode:
            order.client_payment_mode === 'transfer' ? 'transfer' : 'cash',
        cash_collected: order.cash_collected != null ? String(order.cash_collected) : '',
        notes: order.notes ?? '',
        items: order.items.map((i) => ({
            description: i.description,
            price: String(i.price),
            is_completed: i.is_completed,
        })),
        extras_enabled: extrasEnabled,
        list_open: listOpen,
    };
}

export function draftToFormData(draft: OrderFormDraft): Omit<OrderFormDraft, 'extras_enabled' | 'list_open'> {
    const { extras_enabled: _e, list_open: _l, ...formData } = draft;
    return formData;
}

export function inferExtrasEnabledFromDraft(draft: OrderFormDraft): boolean {
    return draft.extras_enabled;
}

export function inferListOpenFromDraft(draft: OrderFormDraft, order: OrderSnapshot): boolean {
    if (draft.list_open) {
        return true;
    }
    return order.items.length > 0 || (order.cash_spent ?? 0) > 0;
}

export function draftHasContent(draft: OrderFormDraft): boolean {
    const serviceCost = parseFloat(draft.service_cost) || 0;

    return (
        draft.name.trim() !== '' ||
        serviceCost > 0 && serviceCost !== 60 ||
        draft.cash_spent.trim() !== '' ||
        draft.items.some(
            (item) => item.description.trim() !== '' || parseFloat(item.price) > 0,
        ) ||
        draft.user_extra.trim() !== '' ||
        draft.clikio_extra.trim() !== '' ||
        draft.discount.trim() !== '' ||
        draft.notes.trim() !== '' ||
        draft.client_payment_mode === 'transfer' ||
        draft.extras_enabled
    );
}
