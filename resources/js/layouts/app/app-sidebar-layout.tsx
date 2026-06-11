import { useEffect, useMemo, useState } from 'react';
import { usePage } from '@inertiajs/react';
import { AppBottomNav } from '@/components/app-bottom-nav';
import { AppContent } from '@/components/app-content';
import { AppFooter } from '@/components/app-footer';
import { AppHeader } from '@/components/app-header';
import { AppShell } from '@/components/app-shell';
import { AppSidebar } from '@/components/app-sidebar';
import { Sheet, SheetContent } from '@/components/ui/sheet';
import { cn } from '@/lib/utils';
import { type BreadcrumbItem } from '@/types';

const SIDEBAR_EXPAND_BREAKPOINT = 1280; // Por debajo de este ancho el sidebar queda colapsado
const MOBILE_BREAKPOINT = 768; // Por debajo: sidebar oculto, menú hamburguesa
const PHONE_BREAKPOINT = 500; // Por debajo: barra de navegación inferior tipo app

interface AppSidebarLayoutProps {
    children: React.ReactNode;
    breadcrumbs?: BreadcrumbItem[];
    title?: string;
    fullWidth?: boolean;
    sidebar?: React.ReactNode; // Sidebar secundario (ej. Settings)
}

export default function AppSidebarLayout({ children, breadcrumbs = [], title, fullWidth = false, sidebar }: AppSidebarLayoutProps) {
    const { url } = usePage();
    const [sidebarCollapsed, setSidebarCollapsed] = useState(() =>
        typeof window !== 'undefined'
            ? window.matchMedia(`(max-width: ${SIDEBAR_EXPAND_BREAKPOINT - 1}px)`).matches
            : false
    );
    const [isNarrow, setIsNarrow] = useState(() =>
        typeof window !== 'undefined'
            ? window.matchMedia(`(max-width: ${SIDEBAR_EXPAND_BREAKPOINT - 1}px)`).matches
            : false
    );
    const [isMobile, setIsMobile] = useState(() =>
        typeof window !== 'undefined'
            ? window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT - 1}px)`).matches
            : false
    );
    const [isPhone, setIsPhone] = useState(() =>
        typeof window !== 'undefined'
            ? window.matchMedia(`(max-width: ${PHONE_BREAKPOINT - 1}px)`).matches
            : false
    );
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

    useEffect(() => {
        const mq = window.matchMedia(`(max-width: ${SIDEBAR_EXPAND_BREAKPOINT - 1}px)`);
        const handleChange = () => {
            setIsNarrow(mq.matches);
            if (mq.matches) setSidebarCollapsed(true);
        };
        handleChange();
        mq.addEventListener('change', handleChange);
        return () => mq.removeEventListener('change', handleChange);
    }, []);

    useEffect(() => {
        const mq = window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT - 1}px)`);
        const handleChange = () => setIsMobile(mq.matches);
        handleChange();
        mq.addEventListener('change', handleChange);
        return () => mq.removeEventListener('change', handleChange);
    }, []);

    useEffect(() => {
        const mq = window.matchMedia(`(max-width: ${PHONE_BREAKPOINT - 1}px)`);
        const handleChange = () => setIsPhone(mq.matches);
        handleChange();
        mq.addEventListener('change', handleChange);
        return () => mq.removeEventListener('change', handleChange);
    }, []);

    useEffect(() => {
        setMobileMenuOpen(false);
    }, [url]);

    const pageTitle = useMemo(() => title ?? breadcrumbs[breadcrumbs.length - 1]?.title ?? 'Panel principal', [breadcrumbs, title]);

    const contentMargin = isMobile
        ? 'ml-0'
        : !sidebarCollapsed
            ? (isNarrow ? 'ml-56' : 'ml-72')
            : (isNarrow ? 'ml-14' : 'ml-20');

    return (
        <AppShell>
            {!isMobile && (
                <AppSidebar collapsed={sidebarCollapsed} narrow={isNarrow} />
            )}

            {isMobile && !isPhone && (
                <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
                    <SheetContent side="left" showCloseButton={false} className="w-72 max-w-[85vw] p-0">
                        <AppSidebar
                            asDrawer
                            collapsed={false}
                            narrow={false}
                            onClose={() => setMobileMenuOpen(false)}
                        />
                    </SheetContent>
                </Sheet>
            )}

            {isPhone && <AppBottomNav />}

            <div className={cn('flex min-h-screen flex-col transition-all duration-300', contentMargin, isPhone && 'pb-16')}>
                <AppHeader
                    breadcrumbs={breadcrumbs}
                    sidebarCollapsed={sidebarCollapsed}
                    onToggleSidebar={!isMobile ? () => setSidebarCollapsed((prev) => !prev) : undefined}
                    isMobile={isMobile}
                    onOpenMobileMenu={isMobile && !isPhone ? () => setMobileMenuOpen(true) : undefined}
                />

                <div className="flex-1">
                    {sidebar ? (
                        // ≥1024px: sidebar fijo a la izquierda, contenido desplazable a la derecha.
                        // <1024px: submenú arriba, contenido abajo a ancho completo.
                        <div className="flex flex-col gap-6 px-6 py-6 lg:flex-row">
                            <aside className="w-full shrink-0 lg:w-56 lg:sticky lg:top-24 self-start">
                                {sidebar}
                            </aside>
                            <div className="min-w-0 flex-1 w-full">
                                <AppContent breadcrumbs={breadcrumbs} title={pageTitle} fullWidth={fullWidth} compact>
                                    {children}
                                </AppContent>
                            </div>
                        </div>
                    ) : (
                        <AppContent breadcrumbs={breadcrumbs} title={pageTitle} fullWidth={fullWidth}>
                            {children}
                        </AppContent>
                    )}
                </div>

                <AppFooter />
            </div>
        </AppShell>
    );
}
