import * as React from 'react';
import { Plus } from 'lucide-react';
import Button from './Button';

export interface ButtonCrearProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
    /**
     * Texto del botón
     */
    label?: string;
    /**
     * Si es true, solo muestra el icono
     */
    iconOnly?: boolean;
    /**
     * Texto del tooltip
     */
    tooltip?: string;
}

/**
 * Botón para crear nuevos elementos
 * 
 * @example
 * ```tsx
 * <ButtonCrear />
 * <ButtonCrear iconOnly={false} label="Nueva Sucursal" />
 * ```
 */
export default function ButtonCrear({ label = 'Nuevo', iconOnly = true, tooltip, ...props }: ButtonCrearProps) {
    return (
        <Button
            variant="primary"
            iconOnly={iconOnly}
            leftIcon={<Plus className="h-5 w-5" />}
            label={label}
            tooltip={tooltip}
            {...props}
        >
            {label}
        </Button>
    );
}
