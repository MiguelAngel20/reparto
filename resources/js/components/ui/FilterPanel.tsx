import * as React from "react";
import { Funnel } from "lucide-react";
import FormPanel from "@/components/ui/FormPanel";
import Button from "@/components/ui/Button";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

export interface FilterOption {
    key: string;
    label: string;
    type: "select" | "switch" | "date" | "dateRange";
    options?: { value: string; label: string }[];
    defaultValue?: string | boolean;
    placeholder?: string;
}

export interface FilterPanelProps {
    /**
     * ID único para persistir las preferencias en localStorage
     */
    storageKey: string;
    /**
     * Configuración de filtros disponibles
     */
    filters: FilterOption[];
    /**
     * Valores actuales de los filtros
     */
    filterValues: Record<string, string | boolean>;
    /**
     * Callback cuando cambian los valores de los filtros
     */
    onFilterChange: (filters: Record<string, string | boolean>) => void;
    /**
     * Clases CSS adicionales para el botón
     */
    className?: string;
    /**
     * Texto del tooltip
     */
    tooltip?: string;
    /**
     * Función personalizada para determinar si hay filtros activos
     * Si se proporciona, se usará en lugar de la lógica por defecto
     */
    isFilterActive?: (filters: Record<string, string | boolean>) => boolean;
}

/**
 * Componente reutilizable para mostrar un panel de filtros
 * 
 * @example
 * ```tsx
 * const filters = [
 *   { key: "category", label: "Categoría", type: "select", options: [...] },
 *   { key: "status", label: "Estado", type: "switch" }
 * ];
 * 
 * <FilterPanel
 *   storageKey="products-filters"
 *   filters={filters}
 *   filterValues={currentFilters}
 *   onFilterChange={handleFilterChange}
 * />
 * ```
 */
export default function FilterPanel({
    storageKey,
    filters,
    filterValues,
    onFilterChange,
    className,
    tooltip,
    isFilterActive,
}: FilterPanelProps) {
    const [open, setOpen] = React.useState(false);
    
    // Inicializar desde filterValues o localStorage, pero no sincronizar automáticamente
    const [localFilters, setLocalFilters] = React.useState<Record<string, string | boolean>>(() => {
        // Si hay filterValues, usarlos (vienen de la URL o estado inicial)
        if (Object.keys(filterValues).length > 0) {
            return filterValues;
        }
        
        // Intentar cargar desde localStorage
        try {
            const stored = localStorage.getItem(storageKey);
            if (stored) {
                const parsed = JSON.parse(stored);
                // Validar que tenga las mismas keys que los filtros
                const hasAllKeys = filters.every(f => parsed.hasOwnProperty(f.key));
                if (hasAllKeys) {
                    return parsed;
                }
            }
        } catch (error) {
            console.error("Error loading filters from localStorage:", error);
        }

        // Si no hay nada guardado, usar los valores por defecto
        const defaults: Record<string, string | boolean> = {};
        filters.forEach((filter) => {
            if (filter.defaultValue !== undefined) {
                defaults[filter.key] = filter.defaultValue;
            } else if (filter.type === "select") {
                defaults[filter.key] = "";
            } else {
                defaults[filter.key] = false;
            }
        });
        return defaults;
    });

    const handleFilterChange = React.useCallback((key: string, value: string | boolean) => {
        setLocalFilters((prev) => {
            const newFilters = {
                ...prev,
                [key]: value,
            };
            
            // Llamar al callback inmediatamente cuando el usuario cambia un filtro
            onFilterChange(newFilters);
            
            // Guardar en localStorage
            try {
                localStorage.setItem(storageKey, JSON.stringify(newFilters));
            } catch (error) {
                console.error("Error saving filters to localStorage:", error);
            }
            
            return newFilters;
        });
    }, [onFilterChange, storageKey]);

    // Función helper para obtener la fecha actual en formato YYYY-MM-DD
    const getTodayDate = React.useCallback(() => {
        const today = new Date();
        const year = today.getFullYear();
        const month = String(today.getMonth() + 1).padStart(2, '0');
        const day = String(today.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    }, []);

    const resetFilters = React.useCallback(() => {
        const defaults: Record<string, string | boolean> = {};
        const todayDate = getTodayDate();
        
        filters.forEach((filter) => {
            if (filter.type === "dateRange") {
                // Para dateRange, establecer fecha_from y fecha_to a la fecha actual
                defaults[`${filter.key}_from`] = todayDate;
                defaults[`${filter.key}_to`] = todayDate;
            } else if (filter.defaultValue !== undefined) {
                defaults[filter.key] = filter.defaultValue;
            } else if (filter.type === "select") {
                defaults[filter.key] = "";
            } else {
                defaults[filter.key] = false;
            }
        });
        setLocalFilters(defaults);
        onFilterChange(defaults);
        
        // Guardar en localStorage
        try {
            localStorage.setItem(storageKey, JSON.stringify(defaults));
        } catch (error) {
            console.error("Error saving filters to localStorage:", error);
        }
    }, [filters, onFilterChange, storageKey, getTodayDate]);

    const hasActiveFilters = React.useMemo(() => {
        // Si se proporciona una función personalizada, usarla
        if (isFilterActive) {
            return isFilterActive(localFilters);
        }
        // Lógica por defecto
        return Object.values(localFilters).some((value) => {
            if (typeof value === "boolean") {
                return value === true;
            }
            return value !== "";
        });
    }, [localFilters, isFilterActive]);

    return (
        <>
            <Button
                type="button"
                onClick={() => setOpen(true)}
                iconOnly={true}
                tooltip={tooltip || "Filtros"}
                leftIcon={<Funnel className="h-4 w-4" />}
                className={cn("h-10", hasActiveFilters && "ring-2 ring-green-500 ring-offset-2", className)}
                variant="outline"
            />

            <FormPanel
                open={open}
                onOpenChange={setOpen}
                title="Filtros"
                description="Selecciona los filtros que deseas aplicar a la tabla"
                className="sm:max-w-[400px]"
                footer={
                    <div className="flex w-full gap-3">
                        <Button
                            variant="outline"
                            onClick={resetFilters}
                            className="flex-1 font-medium"
                        >
                            Limpiar filtros
                        </Button>
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
                    {/* Un solo contenedor; cada filtro separado por una línea debajo */}
                    <div className="flex-1 min-h-0 rounded-lg border border-slate-200 dark:border-[#2b2b2b] bg-slate-50/50 dark:bg-[#1f1f1f]/50 p-4 overflow-y-auto">
                        {filters.map((filter) => {
                            const value = localFilters[filter.key] ?? (filter.type === "select" ? "" : false);
                            const isLast = filter === filters[filters.length - 1];

                            return (
                                <div
                                    key={filter.key}
                                    className={cn(
                                        "pb-4 space-y-3",
                                        !isLast && "mb-4 border-b border-slate-200 dark:border-[#2b2b2b]"
                                    )}
                                >
                                    <label className="text-sm font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wide block">
                                        {filter.label}
                                    </label>

                                    {filter.type === "select" && filter.options ? (
                                        <Select
                                            value={value as string || ""}
                                            onValueChange={(newValue) => handleFilterChange(filter.key, newValue)}
                                        >
                                            <SelectTrigger className="h-10">
                                                <SelectValue placeholder={`Selecciona ${filter.label.toLowerCase()}`}>
                                                    {value && value !== "" 
                                                        ? filter.options.find(opt => opt.value === value)?.label 
                                                        : "Todas"}
                                                </SelectValue>
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="">
                                                    Todas
                                                </SelectItem>
                                                {filter.options.map((option) => (
                                                    <SelectItem key={option.value} value={option.value}>
                                                        {option.label}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    ) : filter.type === "switch" ? (
                                        <div className="flex items-center justify-between">
                                            <span className="text-sm text-slate-600 dark:text-slate-400">
                                                {value ? "Activo" : "Inactivo"}
                                            </span>
                                            <Switch
                                                checked={value as boolean}
                                                onCheckedChange={(checked) => handleFilterChange(filter.key, checked)}
                                            />
                                        </div>
                                    ) : filter.type === "date" ? (
                                        <Input
                                            type="date"
                                            value={value as string || ""}
                                            onChange={(e) => handleFilterChange(filter.key, e.target.value)}
                                            placeholder={filter.placeholder || `Selecciona ${filter.label.toLowerCase()}`}
                                            className="h-10"
                                        />
                                    ) : filter.type === "dateRange" ? (
                                        <div className="space-y-2">
                                            <div>
                                                <Label className="text-xs text-slate-600 dark:text-slate-400 mb-1 block">
                                                    Desde
                                                </Label>
                                                <Input
                                                    type="date"
                                                    value={(localFilters[`${filter.key}_from`] as string) || ""}
                                                    onChange={(e) => handleFilterChange(`${filter.key}_from`, e.target.value)}
                                                    placeholder="Fecha desde"
                                                    className="h-10"
                                                />
                                            </div>
                                            <div>
                                                <Label className="text-xs text-slate-600 dark:text-slate-400 mb-1 block">
                                                    Hasta
                                                </Label>
                                                <Input
                                                    type="date"
                                                    value={(localFilters[`${filter.key}_to`] as string) || ""}
                                                    onChange={(e) => handleFilterChange(`${filter.key}_to`, e.target.value)}
                                                    placeholder="Fecha hasta"
                                                    className="h-10"
                                                />
                                            </div>
                                        </div>
                                    ) : null}
                                </div>
                            );
                        })}
                    </div>
                </div>
            </FormPanel>
        </>
    );
}

