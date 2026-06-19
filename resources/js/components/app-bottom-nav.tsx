import { Link, router, usePage } from '@inertiajs/react';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { usePermissions } from '@/hooks/usePermissions';
import { useSectionPermissions } from '@/hooks/useSectionAccess';
import { cn } from '@/lib/utils';
import { Briefcase, ClipboardList, CreditCard, LayoutGrid, LogOut, Package, Receipt, Scale, Settings } from 'lucide-react';

const navItems = [
    { title: 'Dashboard', href: '/dashboard', icon: LayoutGrid, section: 'dashboard' as const },
    { title: 'Jornada', href: '/reparto', icon: Package, section: 'reparto' as const },
    { title: 'Captura', href: '/captura-manual', icon: ClipboardList, section: 'manual_capture' as const },
    { title: 'Cuenta', href: '/cuenta-empresa', icon: Scale, section: 'company_balance' as const },
];

/** Barra de navegación inferior tipo app móvil (se muestra en pantallas < 500px). */
export function AppBottomNav() {
    const { url } = usePage();
    const { user } = usePermissions();
    const { canView } = useSectionPermissions();
    const pathname = url.split('?')[0];
    const visibleNavItems = navItems.filter((item) => canView(item.section));
    const gridCols = visibleNavItems.length + 1;

    const initials =
        user?.name
            ?.split(' ')
            .map((n) => n[0])
            .join('')
            .toUpperCase()
            .slice(0, 2) || 'U';

    return (
        <nav
            className="fixed inset-x-0 bottom-0 z-40 border-t border-slate-200 bg-white pb-[env(safe-area-inset-bottom)] shadow-[0_-4px_20px_rgba(0,0,0,0.06)] dark:border-[#2b2b2b] dark:bg-[#232323]"
            aria-label="Navegación principal"
        >
            <div
                className="grid h-16"
                style={{ gridTemplateColumns: `repeat(${gridCols}, minmax(0, 1fr))` }}
            >
                {visibleNavItems.map((item) => {
                    const isActive = pathname.startsWith(item.href);

                    return (
                        <Link
                            key={item.href}
                            href={item.href}
                            className={cn(
                                'flex flex-col items-center justify-center gap-1',
                                isActive
                                    ? 'text-sidebar-active'
                                    : 'text-slate-500 dark:text-slate-400',
                            )}
                        >
                            <item.icon
                                className={cn('h-5 w-5', isActive && 'stroke-[2.4]')}
                            />
                            <span
                                className={cn(
                                    'text-[10px] leading-none',
                                    isActive ? 'font-semibold' : 'font-medium',
                                )}
                            >
                                {item.title}
                            </span>
                        </Link>
                    );
                })}

                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <button
                            type="button"
                            className="flex flex-col items-center justify-center gap-1 text-slate-500 dark:text-slate-400"
                            aria-label="Perfil"
                        >
                            <Avatar className="h-6 w-6 border border-slate-200 dark:border-[#343434]">
                                <AvatarFallback className="bg-sidebar-active text-[9px] font-bold text-white">
                                    {initials}
                                </AvatarFallback>
                            </Avatar>
                            <span className="text-[10px] font-medium leading-none">
                                Perfil
                            </span>
                        </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent
                        side="top"
                        align="end"
                        sideOffset={10}
                        className="min-w-[190px] border-slate-200 bg-white dark:border-slate-700 dark:bg-[#262626]"
                    >
                        {canView('gasto') && (
                            <DropdownMenuItem asChild>
                                <Link href="/gasto" className="flex cursor-pointer items-center gap-2">
                                    <Receipt className="h-4 w-4" />
                                    Gasto
                                </Link>
                            </DropdownMenuItem>
                        )}
                        {canView('personal_service') && (
                            <DropdownMenuItem asChild>
                                <Link
                                    href="/mis-servicios"
                                    className="flex cursor-pointer items-center gap-2"
                                >
                                    <Briefcase className="h-4 w-4" />
                                    Mis servicios
                                </Link>
                            </DropdownMenuItem>
                        )}
                        {canView('card_account') && (
                            <DropdownMenuItem asChild>
                                <Link
                                    href="/cuenta-tarjeta"
                                    className="flex cursor-pointer items-center gap-2"
                                >
                                    <CreditCard className="h-4 w-4" />
                                    Cuenta tarjeta
                                </Link>
                            </DropdownMenuItem>
                        )}
                        <DropdownMenuItem asChild>
                            <Link
                                href={
                                    user?.role === 'admin'
                                        ? '/settings/users'
                                        : '/settings/profile'
                                }
                                className="flex cursor-pointer items-center gap-2"
                            >
                                <Settings className="h-4 w-4" />
                                Configuración
                            </Link>
                        </DropdownMenuItem>
                        <DropdownMenuItem
                            className="flex cursor-pointer items-center gap-2"
                            onClick={() => router.post('/logout')}
                        >
                            <LogOut className="h-4 w-4" />
                            Cerrar sesión
                        </DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
            </div>
        </nav>
    );
}
