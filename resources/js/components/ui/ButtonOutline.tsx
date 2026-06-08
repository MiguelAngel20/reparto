import * as React from 'react';
import Button from './Button';

export interface ButtonOutlineProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
    /**
     * Icono a mostrar a la izquierda del texto
     */
    leftIcon?: React.ReactNode;
    /**
     * Texto del tooltip
     */
    tooltip?: string;
}

/**
 * Botón con estilo outline (borde visible)
 * 
 * @example
 * ```tsx
 * <ButtonOutline leftIcon={<Pencil />}>Editar</ButtonOutline>
 * ```
 */
export default function ButtonOutline({ leftIcon, children, tooltip, ...props }: ButtonOutlineProps) {
    return (
        <Button
            variant="outline"
            size="sm"
            leftIcon={leftIcon}
            tooltip={tooltip}
            {...props}
        >
            {children}
        </Button>
    );
}
