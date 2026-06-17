import type { AuthErrors } from '@/lib/auth-validation';

export function validateActiveOrder(data: {
    name: string;
    service_cost: string;
    order_type?: string;
    cash_spent?: string;
    list_total?: number;
    client_payment_mode?: string;
}): AuthErrors {
    const errors: AuthErrors = {};

    if (!data.name.trim()) {
        errors.name = 'El nombre del pedido es obligatorio.';
    }

    const cost = data.service_cost.trim();
    if (!cost) {
        errors.service_cost = 'Indica el costo del servicio.';
    } else if (Number(cost) < 0) {
        errors.service_cost = 'El costo del servicio no puede ser negativo.';
    }

    return errors;
}
