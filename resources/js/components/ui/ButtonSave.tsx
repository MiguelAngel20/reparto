import * as React from 'react';
import { Save } from 'lucide-react';
import Button from './Button';

export interface ButtonSaveProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
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
 * Botón para guardar vistas o configuraciones
 * 
 * @example
 * ```tsx
 * <ButtonSave />
 * <ButtonSave iconOnly={false} label="Guardar" />
 * ```
 */
export default function ButtonSave({ label = 'Guardar vista', iconOnly = true, tooltip, ...props }: ButtonSaveProps) {
    return (
        <Button
            variant="primary"
            iconOnly={iconOnly}
            leftIcon={<Save className="h-5 w-5" />}
            label={label}
            tooltip={tooltip}
            {...props}
        >
            {label}
        </Button>
    );
}
