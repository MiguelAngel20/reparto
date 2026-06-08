import * as React from 'react';
import { Grid } from 'lucide-react';
import Button from './Button';

export interface ButtonColumnsProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
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
 * Botón para mostrar/ocultar columnas en tablas
 * 
 * @example
 * ```tsx
 * <ButtonColumns />
 * <ButtonColumns iconOnly={false} label="Columnas" />
 * ```
 */
export default function ButtonColumns({ label = 'Columnas', iconOnly = true, tooltip, ...props }: ButtonColumnsProps) {
    return (
        <Button
            variant="default"
            iconOnly={iconOnly}
            leftIcon={<Grid className="h-5 w-5" />}
            label={label}
            tooltip={tooltip}
            {...props}
        >
            {label}
        </Button>
    );
}

