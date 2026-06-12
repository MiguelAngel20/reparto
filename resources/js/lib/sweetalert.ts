import Swal from 'sweetalert2';

const defaultOptions = {
    confirmButtonColor: '#0085F3',
    cancelButtonColor: '#64748b',
    reverseButtons: true,
    buttonsStyling: true,
    customClass: {
        popup: 'rounded-2xl',
        title: 'text-lg font-semibold',
        confirmButton: 'rounded-lg px-5 py-2 text-sm font-semibold',
        cancelButton: 'rounded-lg px-5 py-2 text-sm font-medium',
    },
};

type ConfirmOptions = {
    title: string;
    text?: string;
    confirmText?: string;
    cancelText?: string;
    icon?: 'warning' | 'question' | 'info' | 'success' | 'error';
};

export async function confirmAction(options: ConfirmOptions): Promise<boolean> {
    const result = await Swal.fire({
        ...defaultOptions,
        title: options.title,
        text: options.text,
        icon: options.icon ?? 'question',
        showCancelButton: true,
        confirmButtonText: options.confirmText ?? 'Sí, continuar',
        cancelButtonText: options.cancelText ?? 'Cancelar',
    });

    return result.isConfirmed;
}

export async function confirmSaveCompletedOrder(): Promise<boolean> {
    return confirmAction({
        title: '¿Guardar cambios?',
        text: 'Se actualizará este pedido en la jornada actual.',
        icon: 'question',
        confirmText: 'Sí, guardar',
        cancelText: 'Cancelar',
    });
}

export async function confirmFinalizeOrder(): Promise<boolean> {
    return confirmAction({
        title: '¿Finalizar pedido?',
        text: 'Se guardará el tiempo total que llevaste en este pedido.',
        icon: 'question',
        confirmText: 'Sí, finalizar',
        cancelText: 'Seguir en el pedido',
    });
}

export async function confirmCancelOrder(): Promise<boolean> {
    return confirmAction({
        title: '¿Cancelar pedido?',
        text: 'Se descartará este pedido y el cronómetro se detendrá. No se guardará en tus pedidos completados.',
        icon: 'warning',
        confirmText: 'Sí, cancelar',
        cancelText: 'Seguir en el pedido',
    });
}

export async function confirmCloseCashSession(): Promise<boolean> {
    return confirmAction({
        title: '¿Finalizar jornada?',
        text: 'Se cerrará la jornada en curso y no podrás registrar más pedidos hoy.',
        icon: 'question',
        confirmText: 'Sí, finalizar',
        cancelText: 'Cancelar',
    });
}

export async function confirmFinalizeManualCapture(
    captureDateFormatted: string,
): Promise<boolean> {
    return confirmAction({
        title: '¿Finalizar captura manual?',
        text: `Se cerrará la captura del ${captureDateFormatted}. No podrás agregar más pedidos hasta editarla desde el historial.`,
        icon: 'question',
        confirmText: 'Sí, finalizar',
        cancelText: 'Seguir capturando',
    });
}

export function showSuccess(message: string, title = 'Listo') {
    return Swal.fire({
        ...defaultOptions,
        title,
        text: message,
        icon: 'success',
        confirmButtonText: 'Entendido',
    });
}

export function showError(message: string, title = 'Error') {
    return Swal.fire({
        ...defaultOptions,
        title,
        text: message,
        icon: 'error',
        confirmButtonText: 'Entendido',
    });
}
