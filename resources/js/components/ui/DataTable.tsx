import * as React from 'react';
import { cn } from '@/lib/utils';

/**
 * Definición de columna para DataTable
 */
export type ColumnDef<T> = {
    /**
     * Clave única de la columna (debe coincidir con una propiedad del objeto o ser un identificador único)
     */
    key: string;
    /**
     * Etiqueta a mostrar en el encabezado de la columna (puede ser texto o un elemento React)
     */
    label: string | React.ReactNode;
    /**
     * Función opcional para renderizar el contenido de la celda
     * Si no se proporciona, se usa el valor de la propiedad con el mismo nombre que `key`
     */
    render?: (row: T) => React.ReactNode;
};

export interface DataTableProps<T> {
    /**
     * Definiciones de columnas
     */
    columns: ColumnDef<T>[];
    /**
     * Array de datos a mostrar
     */
    data: T[];
    /**
     * Si es true, muestra un estado de carga
     */
    loading?: boolean;
    /**
     * Texto a mostrar cuando no hay datos
     */
    emptyText?: string;
    /**
     * Clases CSS adicionales
     */
    className?: string;
    /**
     * Función para obtener una clave única de cada fila
     * Si no se proporciona, se intenta usar una propiedad 'id' o 'key' del objeto
     */
    getRowKey?: (row: T, index: number) => string | number;
    /**
     * Callback que se ejecuta cuando se hace clic en una fila
     */
    onRowClick?: (row: T) => void;
}

/**
 * Componente DataTable genérico para mostrar datos en formato tabla
 * 
 * @template T Tipo de los objetos en el array de datos
 * 
 * @example
 * ```tsx
 * const columns = [
 *   { key: 'name', label: 'Nombre' },
 *   { key: 'status', label: 'Estado', render: (row) => <Badge>{row.status}</Badge> }
 * ];
 * 
 * <DataTable columns={columns} data={items} />
 * ```
 */
export default function DataTable<T extends Record<string, any>>({
    columns,
    data,
    loading = false,
    emptyText = 'Sin datos',
    className,
    getRowKey,
    onRowClick,
}: DataTableProps<T>) {
    /**
     * Obtiene una clave única para cada fila
     */
    const getKey = React.useCallback(
        (row: T, index: number): string | number => {
            if (getRowKey) {
                return getRowKey(row, index);
            }
            // Intenta usar 'id' o 'key' como identificador único
            if ('id' in row && typeof row.id === 'string' || typeof row.id === 'number') {
                return row.id;
            }
            if ('key' in row && typeof row.key === 'string' || typeof row.key === 'number') {
                return row.key;
            }
            // Como último recurso, usa el índice (no ideal pero mejor que nada)
            return index;
        },
        [getRowKey]
    );

    return (
        <div className={cn('overflow-hidden rounded-2xl border border-slate-200 dark:border-[#2b2b2b]', className)}>
            <div className="w-full overflow-x-auto">
                <table className="min-w-full border-collapse">
                    <thead>
                        <tr className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500 dark:bg-[#1f1f1f] dark:text-slate-400">
                            {columns.map((column) => (
                                <th 
                                    key={column.key} 
                                    className={cn(
                                        "px-4 py-3",
                                        column.key === "actions" && "text-center",
                                        column.key === "imagen" && "text-center"
                                    )}
                                >
                                    {column.label}
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 dark:divide-[#2b2b2b]">
                        {loading ? (
                            <tr>
                                <td colSpan={columns.length} className="px-4 py-8 text-center text-slate-500 dark:text-slate-400">
                                    Cargando...
                                </td>
                            </tr>
                        ) : data.length === 0 ? (
                            <tr>
                                <td colSpan={columns.length} className="px-4 py-8 text-center text-slate-500 dark:text-slate-400">
                                    {emptyText}
                                </td>
                            </tr>
                        ) : (
                            data.map((row, index) => {
                                const rowKey = getKey(row, index);
                                return (
                                    <tr
                                        key={rowKey}
                                        onClick={() => onRowClick?.(row)}
                                        className={cn(
                                            "bg-white transition-colors dark:bg-[#232323]",
                                            onRowClick && "cursor-pointer hover:bg-slate-50 dark:hover:bg-[#2a2a2a]"
                                        )}
                                    >
                                        {columns.map((column) => {
                                            const cellContent = column.render
                                                ? column.render(row)
                                                : (row[column.key] as React.ReactNode);
                                            return (
                                                <td
                                                    key={column.key}
                                                    className={cn(
                                                        "px-4 py-3 text-sm text-slate-700 dark:text-slate-200",
                                                        column.key === "actions" && "text-center align-middle",
                                                        column.key === "imagen" && "text-center"
                                                    )}
                                                    style={column.key === "actions" ? { verticalAlign: "middle" } : undefined}
                                                >
                                                    {cellContent}
                                                </td>
                                            );
                                        })}
                                    </tr>
                                );
                            })
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
