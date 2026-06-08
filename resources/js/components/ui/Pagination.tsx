import * as React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface PaginationProps {
    /**
     * Página actual (basada en 1)
     */
    currentPage: number;
    /**
     * Número total de páginas
     */
    totalPages: number;
    /**
     * Callback que se ejecuta cuando el usuario cambia de página
     * Recibe el número de la nueva página
     */
    onPageChange: (page: number) => void;
    /**
     * Si es true, solo muestra las flechas sin texto
     */
    iconOnly?: boolean;
}

/**
 * Componente Pagination para navegar entre páginas
 * Muestra botones de navegación y números de página con lógica inteligente
 * para mostrar páginas cercanas a la actual
 * 
 * @example
 * ```tsx
 * <Pagination
 *   currentPage={1}
 *   totalPages={10}
 *   onPageChange={(page) => setPage(page)}
 * />
 * ```
 */
export default function Pagination({ currentPage, totalPages, onPageChange, iconOnly = false }: PaginationProps) {
    const canPrev = currentPage > 1;
    const canNext = currentPage < totalPages;

    /**
     * Calcula qué números de página mostrar
     * Muestra la página actual, 2 páginas antes, 2 páginas después,
     * y siempre incluye la primera y última página
     */
    const pages = React.useMemo(() => {
        const items: number[] = [];
        const start = Math.max(1, currentPage - 2);
        const end = Math.min(totalPages, currentPage + 2);
        for (let i = start; i <= end; i++) items.push(i);
        if (!items.includes(1)) items.unshift(1);
        if (!items.includes(totalPages)) items.push(totalPages);
        return Array.from(new Set(items));
    }, [currentPage, totalPages]);

    return (
        <div className="flex items-center gap-2">
            <button
                disabled={!canPrev}
                onClick={() => canPrev && onPageChange(currentPage - 1)}
                className={cn(
                    'inline-flex h-8 items-center justify-center rounded-xl border border-slate-300 text-sm text-slate-700 hover:bg-slate-100 disabled:opacity-60',
                    iconOnly ? 'w-8 px-0' : 'gap-2 px-3',
                    'dark:border-[#3a3a3a] dark:text-slate-300 dark:hover:bg-[#2a2a2a]'
                )}
            >
                <ChevronLeft className="h-4 w-4" />
                {!iconOnly && <span className="hidden sm:inline">Prev</span>}
            </button>
            <div className="flex items-center gap-1">
                {pages.map((page) => (
                    <button
                        key={page}
                        onClick={() => onPageChange(page)}
                        className={cn(
                            'min-w-8 h-8 rounded-lg px-2 text-sm',
                            page === currentPage
                                ? 'bg-blue-600 font-medium text-white'
                                : 'border border-slate-300 text-slate-700 hover:bg-slate-100 dark:border-[#3a3a3a] dark:text-slate-300 dark:hover:bg-[#2a2a2a]'
                        )}
                    >
                        {page}
                    </button>
                ))}
            </div>
            <button
                disabled={!canNext}
                onClick={() => canNext && onPageChange(currentPage + 1)}
                className={cn(
                    'inline-flex h-8 items-center justify-center rounded-xl border border-slate-300 text-sm text-slate-700 hover:bg-slate-100 disabled:opacity-60',
                    iconOnly ? 'w-8 px-0' : 'gap-2 px-3',
                    'dark:border-[#3a3a3a] dark:text-slate-300 dark:hover:bg-[#2a2a2a]'
                )}
            >
                {!iconOnly && <span className="hidden sm:inline">Next</span>}
                <ChevronRight className="h-4 w-4" />
            </button>
        </div>
    );
}
