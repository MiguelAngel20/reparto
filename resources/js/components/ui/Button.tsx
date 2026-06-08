import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';
import { TooltipProvider, Tooltip, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip';

/**
 * Variantes de estilo para el componente Button
 */
const buttonVariants = cva(
    'inline-flex items-center justify-center gap-2 rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50',
    {
        variants: {
            variant: {
                default: 'bg-gray-100 text-slate-700 hover:bg-slate-200 border border-slate-200 dark:bg-white/10 dark:border-white/20 dark:text-white dark:hover:bg-white/15 dark:active:bg-white/20',
                primary: 'bg-green-700 text-white shadow hover:bg-green-600 active:bg-green-700 dark:bg-green-700 dark:hover:bg-green-400 dark:active:bg-green-600',
                danger: 'bg-rose-600 text-white shadow hover:bg-rose-500 active:bg-rose-700 dark:bg-rose-500 dark:hover:bg-rose-400 dark:active:bg-rose-600',
                outline: 'border border-slate-300 text-slate-700 hover:bg-slate-100 dark:bg-[#2a2a2a] dark:border-[#3a3a3a] dark:text-slate-200 dark:hover:bg-[#333333]',
                save: 'bg-slate-100 text-slate-700 hover:bg-slate-200 border border-slate-200 dark:bg-blue-500 dark:text-white dark:hover:bg-blue-400 dark:active:bg-blue-600 dark:border-blue-400',
                warning: 'bg-amber-600 text-white shadow hover:bg-amber-500 active:bg-amber-700 dark:bg-amber-500 dark:hover:bg-amber-400 dark:active:bg-amber-600',
                info: 'bg-[#007bff] text-white shadow hover:bg-[#0069d9] active:bg-[#0062cc] dark:bg-[#007bff] dark:hover:bg-[#0069d9] dark:active:bg-[#0062cc]',
            },
            size: {
                default: 'h-9 px-3',
                icon: 'h-9 w-9 px-2',
                sm: 'h-8 px-3 text-xs rounded-xl',
            },
        },
        defaultVariants: {
            variant: 'default',
            size: 'default',
        },
    }
);

export interface ButtonProps
    extends React.ButtonHTMLAttributes<HTMLButtonElement>,
        VariantProps<typeof buttonVariants> {
    /**
     * Contenido del botón (texto o elementos React)
     */
    children?: React.ReactNode;
    /**
     * Icono a mostrar a la izquierda del texto
     */
    leftIcon?: React.ReactNode;
    /**
     * Icono a mostrar a la derecha del texto
     */
    rightIcon?: React.ReactNode;
    /**
     * Si es true, solo muestra el icono (requiere leftIcon o rightIcon)
     */
    iconOnly?: boolean;
    /**
     * Texto del tooltip (se muestra automáticamente si iconOnly es true)
     */
    tooltip?: string;
    /**
     * Label del botón (usado para aria-label y tooltip cuando iconOnly es true)
     */
    label?: string;

    /**
     * Compatibilidad con APIs tipo Radix/ShadCN. Aquí NO renderiza Slot,
     * solo se filtra para evitar que llegue al DOM como atributo inválido.
     */
    asChild?: boolean;
}

/**
 * Componente Button reutilizable con múltiples variantes y estilos
 * 
 * @example
 * ```tsx
 * <Button variant="primary" leftIcon={<Plus />}>
 *   Crear
 * </Button>
 * 
 * <Button variant="danger" iconOnly leftIcon={<Trash2 />} tooltip="Eliminar" />
 * ```
 */
const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
    (
        {
            className,
            variant,
            size,
            children,
            leftIcon,
            rightIcon,
            iconOnly = false,
            tooltip,
            label,
            title,
            'aria-label': ariaLabel,
            ...props
        },
        ref
    ) => {
        const effectiveLabel = label || (typeof children === 'string' ? children : undefined);
        const effectiveTooltip = tooltip ?? (iconOnly ? effectiveLabel : undefined);
        const effectiveAriaLabel = ariaLabel ?? (iconOnly ? effectiveLabel : undefined);
        const effectiveTitle = title ?? (iconOnly ? effectiveLabel : undefined);

        const buttonSize = iconOnly ? 'icon' : size;

        // Filtrar props que no son válidos para elementos HTML button
        const { loading, asChild, ...buttonProps } = props as any;

        const content = (
            <button
                ref={ref}
                {...buttonProps}
                className={cn(buttonVariants({ variant, size: buttonSize }), className)}
                title={effectiveTitle}
                aria-label={effectiveAriaLabel}
            >
                {leftIcon}
                {!iconOnly && children && <span>{children}</span>}
                {rightIcon}
            </button>
        );

        if (!effectiveTooltip) return content;

        return (
            <TooltipProvider delayDuration={0}>
                <Tooltip>
                    <TooltipTrigger asChild>{content}</TooltipTrigger>
                    <TooltipContent>{effectiveTooltip}</TooltipContent>
                </Tooltip>
            </TooltipProvider>
        );
    }
);

Button.displayName = 'Button';

export default Button;

