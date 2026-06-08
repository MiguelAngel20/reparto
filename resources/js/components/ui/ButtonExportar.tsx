import * as React from 'react';
import { Download } from 'lucide-react';
import Button from './Button';

export interface ButtonExportarProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
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
 * Botón para exportar datos
 * 
 * @example
 * ```tsx
 * <ButtonExportar />
 * <ButtonExportar iconOnly={false} label="Exportar CSV" />
 * ```
 */
export default function ButtonExportar({ label = 'Exportar', iconOnly = true, tooltip, ...props }: ButtonExportarProps) {
    return (
        <Button
            variant="default"
            iconOnly={iconOnly}
            leftIcon={<Download className="h-5 w-5" />}
            label={label}
            tooltip={tooltip}
            {...props}
        >
            {label}
        </Button>
    );
}
