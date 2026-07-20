export type PersonalServiceListItemDraft = {
    description: string;
    price: string;
    is_completed: boolean;
};

export type PersonalServiceFormDraft = {
    name: string;
    amount: string;
    spent_amount: string;
    description: string;
    items: PersonalServiceListItemDraft[];
    list_open: boolean;
};

const DEFAULT_SERVICE_AMOUNT = 50;

function storageKey(serviceId: number): string {
    return `reparto-personal-service-draft-${serviceId}`;
}

function normalizeDraft(parsed: PersonalServiceFormDraft): PersonalServiceFormDraft {
    return {
        name: parsed.name ?? '',
        amount: parsed.amount ?? String(DEFAULT_SERVICE_AMOUNT),
        spent_amount: parsed.spent_amount ?? '',
        description: parsed.description ?? '',
        items: Array.isArray(parsed.items)
            ? parsed.items.map((item) => ({
                  description: item.description ?? '',
                  price: item.price ?? '',
                  is_completed: Boolean(item.is_completed),
              }))
            : [],
        list_open: Boolean(parsed.list_open),
    };
}

export function loadPersonalServiceDraft(serviceId: number): PersonalServiceFormDraft | null {
    if (typeof window === 'undefined') {
        return null;
    }

    try {
        const raw = localStorage.getItem(storageKey(serviceId));
        if (!raw) {
            return null;
        }

        const parsed = JSON.parse(raw) as PersonalServiceFormDraft;
        if (!parsed || typeof parsed !== 'object') {
            return null;
        }

        return normalizeDraft(parsed);
    } catch {
        return null;
    }
}

export function savePersonalServiceDraft(
    serviceId: number,
    draft: PersonalServiceFormDraft,
): void {
    if (typeof window === 'undefined') {
        return;
    }

    try {
        localStorage.setItem(storageKey(serviceId), JSON.stringify(draft));
    } catch {
        // Quota exceeded u otro error: no bloquear la captura
    }
}

export function clearPersonalServiceDraft(serviceId: number): void {
    if (typeof window === 'undefined') {
        return;
    }

    localStorage.removeItem(storageKey(serviceId));
}

type ServiceItemSnapshot = {
    description: string;
    price: number;
    is_completed: boolean;
};

type ServiceSnapshot = {
    name: string;
    amount: number;
    spent_amount: number | null;
    description: string | null;
    items: ServiceItemSnapshot[];
};

export function serviceToFormDraft(service: ServiceSnapshot): PersonalServiceFormDraft {
    return {
        name: service.name,
        amount: String(service.amount),
        spent_amount: service.spent_amount !== null ? String(service.spent_amount) : '',
        description: service.description ?? '',
        items: service.items.map((item) => ({
            description: item.description,
            price: String(item.price),
            is_completed: item.is_completed,
        })),
        list_open: service.items.length > 0 || (service.spent_amount ?? 0) > 0,
    };
}

export function draftToFormData(
    draft: PersonalServiceFormDraft,
): Omit<PersonalServiceFormDraft, 'list_open'> {
    const { list_open: _listOpen, ...formData } = draft;

    return formData;
}

export function inferListOpenFromDraft(
    draft: PersonalServiceFormDraft,
    service: ServiceSnapshot,
): boolean {
    if (draft.list_open) {
        return true;
    }

    return service.items.length > 0 || (service.spent_amount ?? 0) > 0;
}

export function draftHasContent(draft: PersonalServiceFormDraft): boolean {
    const amount = parseFloat(draft.amount) || 0;

    return (
        draft.name.trim() !== '' ||
        (amount > 0 && amount !== DEFAULT_SERVICE_AMOUNT) ||
        draft.spent_amount.trim() !== '' ||
        draft.description.trim() !== '' ||
        draft.items.some(
            (item) => item.description.trim() !== '' || parseFloat(item.price) > 0,
        ) ||
        draft.list_open
    );
}
