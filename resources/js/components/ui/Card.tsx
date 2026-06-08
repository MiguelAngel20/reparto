import * as React from 'react';
import { cn } from '@/lib/utils';

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
    /**
     * Título del card (opcional)
     */
    title?: string;
    /**
     * Descripción del card (opcional)
     */
    description?: string;
}

/**
 * Componente Card para contener contenido agrupado
 * 
 * @example
 * ```tsx
 * <Card title="Mi Card" description="Descripción del card">
 *   Contenido aquí
 * </Card>
 * ```
 */
export default function Card({ className, title, description, children, ...props }: CardProps) {
    return (
        <div
            {...props}
            className={cn(
                'rounded-2xl border border-slate-200 bg-white/90 p-5 shadow-sm dark:border-[#2b2b2b] dark:bg-[#262626] dark:shadow-black/10',
                className
            )}
        >
            {(title || description) && (
                <div className="mb-4">
                    {title && <h2 className="text-lg font-semibold text-slate-900 dark:text-white">{title}</h2>}
                    {description && <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{description}</p>}
                </div>
            )}
            {children}
        </div>
    );
}
