import * as React from 'react';
import { cn } from '@/lib/utils';

/**
 * Variantes de color disponibles para Badge
 */
type BadgeVariant = 'blue' | 'green' | 'yellow' | 'purple' | 'red' | 'gray';

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
    /**
     * Variante de color del badge
     * @default 'gray'
     */
    variant?: BadgeVariant;
}

/**
 * Mapeo de variantes a clases CSS
 */
const variants: Record<BadgeVariant, string> = {
    blue: 'bg-blue-500/15 text-blue-400 ring-1 ring-inset ring-blue-500/30',
    green: 'bg-emerald-500/15 text-emerald-400 ring-1 ring-inset ring-emerald-500/30',
    yellow: 'bg-amber-500/15 text-amber-300 ring-1 ring-inset ring-amber-500/30',
    purple: 'bg-violet-500/15 text-violet-400 ring-1 ring-inset ring-violet-500/30',
    red: 'bg-rose-500/15 text-rose-400 ring-1 ring-inset ring-rose-500/30',
    gray: 'bg-slate-500/15 text-slate-300 ring-1 ring-inset ring-slate-500/30',
};

/**
 * Componente Badge para mostrar etiquetas o estados
 * 
 * @example
 * ```tsx
 * <Badge variant="green">Activo</Badge>
 * <Badge variant="red">Inactivo</Badge>
 * ```
 */
export default function Badge({ className, children, variant = 'gray', ...props }: BadgeProps) {
    return (
        <span
            {...props}
            className={cn(
                'inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium',
                variants[variant],
                className
            )}
        >
            {children}
        </span>
    );
}
