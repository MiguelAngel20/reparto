import * as React from 'react';
import { Search } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface SearchBarProps extends React.InputHTMLAttributes<HTMLInputElement> {
    /**
     * Callback que se ejecuta cuando cambia el valor del input
     * Recibe el nuevo valor como string
     */
    onChange?: (value: string) => void;
}

/**
 * Componente SearchBar con icono de búsqueda integrado
 * 
 * @example
 * ```tsx
 * <SearchBar 
 *   placeholder="Buscar..." 
 *   onChange={(value) => setQuery(value)} 
 * />
 * ```
 */
export default function SearchBar({ className, onChange, placeholder = 'Buscar...', value, ...props }: SearchBarProps) {
    return (
        <div className={cn('relative', className)}>
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500 dark:text-slate-400" />
            <input
                {...props}
                value={value}
                placeholder={placeholder}
                onChange={(e) => onChange?.(e.target.value)}
                className={cn(
                    'w-full rounded-xl border border-slate-300 bg-white/90 pl-9 pr-3 py-2 text-sm text-slate-800 shadow-sm outline-none transition',
                    'placeholder:text-slate-400 focus:border-slate-400 focus:ring-2 focus:ring-slate-200',
                    'dark:border-[#3a3a3a] dark:bg-[#1f1f1f] dark:text-slate-100 dark:placeholder:text-slate-500 dark:focus:ring-[#2a2a2a]',
                    props.className
                )}
            />
        </div>
    );
}
