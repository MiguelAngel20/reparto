import * as React from "react";
import { Columns3 } from "lucide-react";
import FormPanel from "@/components/ui/FormPanel";
import Button from "@/components/ui/Button";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";

export interface ColumnConfig {
    key: string;
    label: string;
    defaultVisible?: boolean;
}

export interface ColumnVisibilityControlProps {
    /**
     * ID único para persistir las preferencias en localStorage
     */
    storageKey: string;
    /**
     * Configuración de columnas disponibles
     */
    columns: ColumnConfig[];
    /**
     * Callback cuando cambian las columnas visibles
     */
    onVisibilityChange: (visibleColumns: Set<string>) => void;
    /**
     * Clases CSS adicionales para el botón
     */
    className?: string;
    /**
     * Texto del botón (ya no se usa, solo se muestra el icono)
     */
    buttonText?: string;
    /**
     * Texto del tooltip (por defecto muestra "Filtrar columnas")
     */
    tooltip?: string;
}

/**
 * Componente reutilizable para controlar la visibilidad de columnas en una tabla
 * 
 * @example
 * ```tsx
 * const columnConfig = [
 *   { key: "name", label: "Nombre", defaultVisible: true },
 *   { key: "email", label: "Email", defaultVisible: true },
 *   { key: "phone", label: "Teléfono", defaultVisible: false }
 * ];
 * 
 * <ColumnVisibilityControl
 *   storageKey="users-table-columns"
 *   columns={columnConfig}
 *   onVisibilityChange={(visibleColumns) => {
 *     // Actualizar las columnas visibles en la tabla
 *   }}
 * />
 * ```
 */
export default function ColumnVisibilityControl({
    storageKey,
    columns,
    onVisibilityChange,
    className,
    buttonText = "Columnas",
    tooltip,
}: ColumnVisibilityControlProps) {
    const [open, setOpen] = React.useState(false);
    const [visibleColumns, setVisibleColumns] = React.useState<Set<string>>(() => {
        // Intentar cargar desde localStorage
        try {
            const stored = localStorage.getItem(storageKey);
            if (stored) {
                return new Set(JSON.parse(stored));
            }
        } catch (error) {
            console.error("Error loading column visibility from localStorage:", error);
        }

        // Si no hay nada guardado, usar los valores por defecto
        return new Set(
            columns
                .filter((col) => col.defaultVisible !== false)
                .map((col) => col.key)
        );
    });

    // Sincronizar con el callback cuando cambia visibleColumns
    React.useEffect(() => {
        onVisibilityChange(visibleColumns);
        
        // Guardar en localStorage
        try {
            localStorage.setItem(storageKey, JSON.stringify(Array.from(visibleColumns)));
        } catch (error) {
            console.error("Error saving column visibility to localStorage:", error);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [visibleColumns, storageKey]);

    const toggleColumn = React.useCallback((columnKey: string) => {
        setVisibleColumns((prev) => {
            const newSet = new Set(prev);
            if (newSet.has(columnKey)) {
                newSet.delete(columnKey);
            } else {
                newSet.add(columnKey);
            }
            return newSet;
        });
    }, []);

    const selectAll = React.useCallback(() => {
        setVisibleColumns(new Set(columns.map((col) => col.key)));
    }, [columns]);

    const resetToDefault = React.useCallback(() => {
        setVisibleColumns(
            new Set(
                columns
                    .filter((col) => col.defaultVisible !== false)
                    .map((col) => col.key)
            )
        );
    }, [columns]);

    // Detectar si hay columnas personalizadas (diferentes a las por defecto)
    const hasCustomColumns = React.useMemo(() => {
        const defaultColumns = new Set(
            columns
                .filter((col) => col.defaultVisible !== false)
                .map((col) => col.key)
        );
        
        // Comparar si visibleColumns es diferente de defaultColumns
        if (visibleColumns.size !== defaultColumns.size) {
            return true;
        }
        
        // Verificar si todas las columnas visibles son las mismas que las por defecto
        for (const key of visibleColumns) {
            if (!defaultColumns.has(key)) {
                return true;
            }
        }
        
        for (const key of defaultColumns) {
            if (!visibleColumns.has(key)) {
                return true;
            }
        }
        
        return false;
    }, [visibleColumns, columns]);

    return (
        <>
            <Button
                type="button"
                onClick={() => setOpen(true)}
                iconOnly={true}
                tooltip={tooltip || "Filtrar columnas"}
                leftIcon={<Columns3 className="h-4 w-4" />}
                className={cn("h-10", hasCustomColumns && "ring-2 ring-green-500 ring-offset-2", className)}
                variant="outline"
            />

            <FormPanel
                open={open}
                onOpenChange={setOpen}
                title="Columnas de la Tabla"
                description="Selecciona las columnas que deseas mostrar en la tabla"
                className="sm:max-w-[400px]"
                footer={
                    <div className="flex w-full gap-3">
                        <Button
                            variant="outline"
                            onClick={() => setOpen(false)}
                            className="flex-1 font-medium"
                        >
                            Cerrar
                        </Button>
                    </div>
                }
            >
                <div className="flex flex-1 min-h-0 flex-col">
                    {/* Tabs de acción rápida */}
                    <div className="flex gap-1 p-1 rounded-lg border border-slate-200 dark:border-[#2b2b2b] bg-slate-50 dark:bg-[#1f1f1f] mb-4 shrink-0">
                        <button
                            onClick={selectAll}
                            className={cn(
                                "flex-1 px-4 py-2 text-sm font-medium rounded-md transition-colors",
                                "text-slate-700 hover:text-slate-900 hover:bg-white dark:text-slate-300 dark:hover:text-white dark:hover:bg-[#2a2a2a]",
                                "border border-transparent hover:border-slate-200 dark:hover:border-[#3a3a3a]"
                            )}
                        >
                            Seleccionar todo
                        </button>
                        <button
                            onClick={resetToDefault}
                            className={cn(
                                "flex-1 px-4 py-2 text-sm font-medium rounded-md transition-colors",
                                "text-slate-700 hover:text-slate-900 hover:bg-white dark:text-slate-300 dark:hover:text-white dark:hover:bg-[#2a2a2a]",
                                "border border-transparent hover:border-slate-200 dark:hover:border-[#3a3a3a]"
                            )}
                        >
                            Restablecer por defecto
                        </button>
                    </div>

                    {/* Lista de columnas agrupadas con bordes - ocupa todo el espacio disponible */}
                    <div className="flex-1 min-h-0 rounded-lg border border-slate-200 dark:border-[#2b2b2b] bg-slate-50/50 dark:bg-[#1f1f1f]/50 p-4 space-y-2 overflow-y-auto">
                        {columns.map((column) => {
                            const isVisible = visibleColumns.has(column.key);
                            return (
                                <label
                                    key={column.key}
                                    className="flex items-center justify-between gap-3 p-3 rounded-lg hover:bg-slate-100 dark:hover:bg-[#2a2a2a] cursor-pointer transition-colors border border-slate-200 dark:border-[#2b2b2b] bg-white dark:bg-[#1f1f1f]"
                                >
                                    <span className="text-sm font-medium text-slate-900 dark:text-white">
                                        {column.label}
                                    </span>
                                    <Switch
                                        checked={isVisible}
                                        onCheckedChange={() => toggleColumn(column.key)}
                                    />
                                </label>
                            );
                        })}
                    </div>
                </div>
            </FormPanel>
        </>
    );
}

