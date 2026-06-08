import { useMemo } from 'react';
import { Link } from '@inertiajs/react';

import { cn } from '@/lib/utils';
import { useAppearance } from '@/hooks/use-appearance';
import { type BreadcrumbItem } from '@/types';
import {
    Menu,
    MoonStar,
    PanelLeftClose,
    PanelLeftOpen,
    SunMedium,
} from 'lucide-react';
import { AppBrandLogo } from '@/components/app-brand-logo';
import { usePage } from '@inertiajs/react';

interface AppHeaderProps {
    breadcrumbs?: BreadcrumbItem[];
    sidebarCollapsed?: boolean;
    onToggleSidebar?: () => void;
    isMobile?: boolean;
    onOpenMobileMenu?: () => void;
}

export function AppHeader({
    breadcrumbs = [],
    sidebarCollapsed = false,
    onToggleSidebar,
    isMobile = false,
    onOpenMobileMenu,
}: AppHeaderProps) {
    const { appearance, updateAppearance } = useAppearance();
    const page = usePage();
    const { appLogoUrl } = page.props as { appLogoUrl?: string | null };
    const isDark = useMemo(() => appearance === 'dark', [appearance]);
    const pageTitle = breadcrumbs[breadcrumbs.length - 1]?.title;

    return (
        <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-slate-200/70 bg-white/90 px-4 py-3 sm:px-6 backdrop-blur dark:border-[#2b2b2b]/70 dark:bg-[#232323]/90">
            <div className="flex min-w-0 items-center gap-3">
                {isMobile ? (
                    <Link href="/dashboard" className="flex shrink-0 items-center gap-2">
                        <AppBrandLogo src={appLogoUrl} variant="header" />
                    </Link>
                ) : (
                    <>
                        {onToggleSidebar && (
                            <button
                                type="button"
                                onClick={onToggleSidebar}
                                className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-slate-200/80 bg-white/70 text-slate-600 shadow-sm transition-colors hover:border-slate-300 hover:bg-white dark:border-[#343434] dark:bg-[#2a2a2a] dark:text-slate-200 dark:hover:border-[#3a3a3a] dark:hover:bg-[#2f2f2f]"
                                aria-label={
                                    sidebarCollapsed
                                        ? 'Expandir menú lateral'
                                        : 'Contraer menú lateral'
                                }
                            >
                                {sidebarCollapsed ? (
                                    <PanelLeftOpen className="h-5 w-5" aria-hidden="true" />
                                ) : (
                                    <PanelLeftClose className="h-5 w-5" aria-hidden="true" />
                                )}
                            </button>
                        )}
                        {pageTitle && (
                            <h1 className="truncate text-lg font-semibold text-slate-800 dark:text-slate-100">
                                {pageTitle}
                            </h1>
                        )}
                    </>
                )}
            </div>

            <div className="flex shrink-0 items-center gap-2 sm:gap-3">
                <button
                    type="button"
                    className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200/80 bg-white/70 text-slate-600 shadow-sm transition-colors hover:border-slate-300 hover:bg-white dark:border-[#343434] dark:bg-[#2a2a2a] dark:text-slate-200 dark:hover:border-[#3a3a3a] dark:hover:bg-[#2f2f2f]"
                    aria-label="Cambiar tema"
                    onClick={() => updateAppearance(isDark ? 'light' : 'dark')}
                >
                    {isDark ? (
                        <SunMedium className="h-5 w-5 shrink-0" aria-hidden="true" />
                    ) : (
                        <MoonStar className="h-5 w-5 shrink-0" aria-hidden="true" />
                    )}
                </button>
                {isMobile && onOpenMobileMenu && (
                    <button
                        type="button"
                        onClick={onOpenMobileMenu}
                        className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200/80 bg-white/70 text-slate-600 shadow-sm transition-colors hover:border-slate-300 hover:bg-white dark:border-[#343434] dark:bg-[#2a2a2a] dark:text-slate-200 dark:hover:border-[#3a3a3a] dark:hover:bg-[#2f2f2f]"
                        aria-label="Abrir menú"
                    >
                        <Menu className="h-5 w-5 shrink-0" aria-hidden="true" />
                    </button>
                )}
            </div>
        </header>
    );
}
