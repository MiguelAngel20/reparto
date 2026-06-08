import * as React from 'react';
import Button from './Button';

export interface ButtonDangerProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
    /**
     * Icono a mostrar a la izquierda del texto
     */
    leftIcon?: React.ReactNode;
    /**
     * Texto del tooltip
     */
    tooltip?: string;
    /**
     * Si es true, solo muestra el icono (requiere leftIcon o rightIcon)
     */
    iconOnly?: boolean;
}

/**
 * Botón con estilo danger (rojo) para acciones destructivas
 * 
 * @example
 * ```tsx
 * <ButtonDanger leftIcon={<Trash2 />}>Eliminar</ButtonDanger>
 * ```
 */
export default function ButtonDanger({ leftIcon, children, tooltip, iconOnly, ...props }: ButtonDangerProps) {
    return (
        <Button
            variant="danger"
            size={iconOnly ? "icon" : "sm"}
            leftIcon={leftIcon}
            tooltip={tooltip}
            iconOnly={iconOnly}
            {...props}
        >
            {children}
        </Button>
    );
}
