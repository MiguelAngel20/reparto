import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs));
}

/**
 * Formatea un número como moneda usando el formato estadounidense (1,000.00)
 * @param value - El valor numérico a formatear
 * @returns String formateado con comas para miles y punto para decimales
 */
export function formatCurrency(value: number | string): string {
    return Number(value).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

/** Fecha local YYYY-MM-DD para inputs type="date" (evita desfase con toISOString/UTC). */
export function localDateInputValue(date = new Date()): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');

    return `${year}-${month}-${day}`;
}