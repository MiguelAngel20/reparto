import { type BreadcrumbItem } from '@/types';
import { cn } from '@/lib/utils';

interface AppContentProps {
    children: React.ReactNode;
    breadcrumbs?: BreadcrumbItem[];
    title?: string;
    fullWidth?: boolean;
    compact?: boolean; // Cuando es true, elimina paddings para alinear con sidebars externos
}

export function AppContent({ children, breadcrumbs = [], title, fullWidth = false, compact = false }: AppContentProps) {
    return (
        // El main no impone fondo: hereda el de AppShell para evitar cortes
        <main className={cn('flex-1 overflow-y-auto bg-transparent transition-colors duration-300 dark:bg-transparent', compact ? 'px-0 py-0' : 'px-8 py-10')}>
            <div className={cn('flex w-full flex-col gap-6', fullWidth ? '' : 'mx-auto max-w-7xl')}>
                {/* Sin contenedor adicional: dejamos que cada página decida su propio borde/fondo */}
                <div>{children}</div>
            </div>
        </main>
    );
}