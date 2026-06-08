import * as React from 'react';
import { Funnel } from 'lucide-react';
import Button from './Button';

export interface ButtonFiltroProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
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
 * Botón para abrir filtros
 * 
 * @example
 * ```tsx
 * <ButtonFiltro />
 * <ButtonFiltro iconOnly={false} label="Filtros" />
 * ```
 */
export default function ButtonFiltro({ label = 'Filtros', iconOnly = true, tooltip, ...props }: ButtonFiltroProps) {
    return (
        <Button
            variant="default"
            iconOnly={iconOnly}
            leftIcon={<Funnel className="h-5 w-5" />}
            label={label}
            tooltip={tooltip}
            {...props}
        >
            {label}
        </Button>
    );
}
