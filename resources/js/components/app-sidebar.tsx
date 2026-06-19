import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Link, usePage, router } from '@inertiajs/react';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';
import { type NavItem } from '@/types';
import AppLogo from './app-logo';
import { usePermissions } from '@/hooks/usePermissions';
import { useSectionPermissions } from '@/hooks/useSectionAccess';
import {
    Briefcase,
    ClipboardList,
    ChevronDown,
    ChevronUp,
    ChevronRight,
    LayoutGrid,
    LogOut,
    Package,
    Receipt,
    Scale,
    Settings,
    CreditCard,
    X,
} from 'lucide-react';

interface AppSidebarProps {
    collapsed?: boolean;
    /** Cuando es true (viewport < 1280px): colapsado más compacto y expandido más estrecho con iconos/letras menores */
    narrow?: boolean;
    /** Modo drawer (menú móvil): se renderiza dentro de un Sheet, sin posición fija, con botón cerrar */
    asDrawer?: boolean;
    onClose?: () => void;
}

const allNavItems: NavItem[] = [
    { title: 'Dashboard', href: '/dashboard', icon: LayoutGrid, section: 'dashboard' },
    { title: 'Iniciar jornada', href: '/reparto', icon: Package, section: 'reparto' },
    { title: 'Captura manual', href: '/captura-manual', icon: ClipboardList, section: 'manual_capture' },
    { title: 'Cuenta empresa', href: '/cuenta-empresa', icon: Scale, section: 'company_balance' },
    { title: 'Gasto', href: '/gasto', icon: Receipt, section: 'gasto' },
    { title: 'Mis servicios', href: '/mis-servicios', icon: Briefcase, section: 'personal_service' },
    { title: 'Cuenta tarjeta', href: '/cuenta-tarjeta', icon: CreditCard, section: 'card_account' },
];

export function AppSidebar({ collapsed = false, narrow = false, asDrawer = false, onClose }: AppSidebarProps) {
    const { url } = usePage();
    const { hasPermission, user } = usePermissions();
    const { canView } = useSectionPermissions();
    const [userMenuOpen, setUserMenuOpen] = useState(false);
    const [openSubmenus, setOpenSubmenus] = useState<Set<string>>(new Set());
    const pathnameRef = useRef<string>('');

    // Extraer solo la ruta sin query parameters
    const pathname = url.split('?')[0];

    const navItems = React.useMemo(() => {
        return allNavItems
            .filter((item) => !item.section || canView(item.section))
            .map((item) => {
                if (!item.submenu?.length) {
                    return item;
                }
                const visibleSubitems = item.submenu.filter(
                    (sub) => !sub.permission || hasPermission(sub.permission),
                );
                return visibleSubitems.length ? { ...item, submenu: visibleSubitems } : null;
            })
            .filter((item): item is NavItem => item !== null);
    }, [hasPermission, canView]);

    // Abrir automáticamente el submenú si alguna de sus rutas está activa
    // Solo se ejecuta cuando cambia el pathname, no cuando el usuario hace clic manualmente
    React.useEffect(() => {
        // Solo ejecutar si el pathname realmente cambió
        if (pathnameRef.current === pathname) {
            return;
        }
        
        pathnameRef.current = pathname;
        
        const newOpenSubmenus = new Set<string>();
        
        // Usar allNavItems directamente para evitar dependencias que cambian
        allNavItems.forEach((item) => {
            if (item.submenu && item.submenu.some(sub => pathname.startsWith(sub.href))) {
                // Verificar que el usuario tenga permiso para ver al menos un subitem
                const hasAccess = item.submenu.some(sub => !sub.permission || hasPermission(sub.permission));
                if (hasAccess) {
                    newOpenSubmenus.add(item.title);
                }
            }
        });
        
        // Solo actualizar si hay cambios y no estamos sobrescribiendo una acción manual del usuario
        setOpenSubmenus(prev => {
            // Si el usuario ya tiene submenús abiertos manualmente, mantenerlos
            // Solo agregar los que corresponden a la ruta actual
            const merged = new Set(prev);
            newOpenSubmenus.forEach(title => merged.add(title));
            
            // Si no hay cambios, retornar el mismo Set
            if (merged.size === prev.size && 
                Array.from(merged).every(title => prev.has(title)) &&
                Array.from(prev).every(title => merged.has(title))) {
                return prev;
            }
            return merged;
        });
    }, [pathname, hasPermission]);
    
    // Referencia al contenedor del botón de usuario + dropdown.
    // La usamos para detectar clics fuera (click-outside) y cerrar el menú.
    const userMenuRef = useRef<HTMLDivElement | null>(null);

    // Cierra el menú de usuario al hacer clic fuera o presionar Escape.
    useEffect(() => {
        if (!userMenuOpen) {
            return;
        }

        function handleDocumentMouseDown(event: MouseEvent) {
            if (!userMenuRef.current) return;
            const target = event.target as Node | null;
            if (target && !userMenuRef.current.contains(target)) {
                setUserMenuOpen(false);
            }
        }

        function handleDocumentKeyDown(event: KeyboardEvent) {
            if (event.key === 'Escape') {
                setUserMenuOpen(false);
            }
        }

        document.addEventListener('mousedown', handleDocumentMouseDown);
        document.addEventListener('keydown', handleDocumentKeyDown);
        return () => {
            document.removeEventListener('mousedown', handleDocumentMouseDown);
            document.removeEventListener('keydown', handleDocumentKeyDown);
        };
    }, [userMenuOpen]);

    const tooltipDelay = useMemo(() => (collapsed ? 100 : 0), [collapsed]);
    const compact = collapsed && narrow && !asDrawer;
    const iconSize = 'h-5 w-5';
    const iconSizeSmall = 'h-3 w-3';
    const chevronSize = 'h-4 w-4';

    const wrapperClassName = cn(
        'flex flex-col border-r transition-all duration-300',
        asDrawer ? 'h-full w-full' : 'fixed inset-y-0 left-0 z-40',
        !asDrawer && (collapsed ? (narrow ? 'w-14 items-center' : 'w-20 items-center') : (narrow ? 'w-56' : 'w-72')),
        'border-slate-200 bg-white text-slate-900 shadow-[0_10px_30px_rgba(15,23,42,0.08)]',
        'dark:border-[#2b2b2b] dark:bg-[#232323] dark:text-slate-100 dark:shadow-[0_10px_30px_rgba(0,0,0,0.35)]'
    );

    return (
        <aside className={wrapperClassName}>
            {/* Drawer: barra superior con logo + botón cerrar */}
            {asDrawer && onClose && (
                <div className="flex h-14 shrink-0 min-w-0 items-center justify-between gap-3 border-b border-slate-200 px-4 dark:border-[#2b2b2b]">
                    <div className="min-w-0 flex-1 overflow-hidden">
                        <AppLogo collapsed={false} narrow />
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        className="shrink-0 inline-flex h-10 w-10 min-h-10 min-w-10 items-center justify-center rounded-xl border border-slate-200/80 bg-white/70 text-slate-600 shadow-sm transition-colors hover:border-slate-300 hover:bg-white dark:border-[#343434] dark:bg-[#2a2a2a] dark:text-slate-200 dark:hover:border-[#3a3a3a] dark:hover:bg-[#2f2f2f]"
                        aria-label="Cerrar menú"
                    >
                        <X className="h-5 w-5 shrink-0" />
                    </button>
                </div>
            )}
            {!asDrawer && <AppLogo collapsed={collapsed} narrow={narrow} />}

            <nav className={cn('flex-1 overflow-y-auto py-6', compact ? 'px-1 py-4' : collapsed ? 'px-2' : narrow ? 'px-1.5 py-4' : 'px-1.5')}>
                <TooltipProvider delayDuration={tooltipDelay}>
                    <div className="flex flex-col gap-1">
                        {navItems.map((item) => {
                            const hasSubmenu = item.submenu && item.submenu.length > 0;
                            const isSubmenuOpen = openSubmenus.has(item.title);
                            
                            // Si tiene submenú, el padre NO se marca como activo (solo los subitems)
                            // Si tiene href, está activo si la URL coincide
                            let isActive = false;
                            if (hasSubmenu) {
                                // Para items con submenú, el padre nunca se marca como activo
                                // Solo los subitems se marcan como activos
                                isActive = false;
                            } else if (item.href) {
                                // Para items sin submenú, verificar si la ruta coincide (sin query params)
                                isActive = pathname.startsWith(item.href);
                            }

                            const toggleSubmenu = () => {
                                setOpenSubmenus(prev => {
                                    const newSet = new Set(prev);
                                    if (newSet.has(item.title)) {
                                        newSet.delete(item.title);
                                    } else {
                                        newSet.add(item.title);
                                    }
                                    return newSet;
                                });
                            };

                            if (hasSubmenu && collapsed) {
                                // Sidebar colapsado: mostrar ícono + flecha indicadora con dropdown al hacer clic
                                const submenuItems = item.submenu || [];
                                return (
                                    <DropdownMenu key={item.title}>
                                        <Tooltip>
                                            <TooltipTrigger asChild>
                                                <DropdownMenuTrigger asChild>
                                                    <button
                                                        className={cn(
                                                            'rounded-lg transition-colors inline-flex items-center justify-center gap-1.5',
                                                            collapsed ? 'h-[36px] w-[50px] min-h-[36px] min-w-[50px] px-1.5 py-2 text-sm self-center' : 'w-full px-2.5 py-1.5 text-[16px]',
                                                            'text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-[#2a2a2a] dark:hover:text-white'
                                                        )}
                                                    >
                                                        {item.icon && <item.icon className={cn(iconSize, 'shrink-0 opacity-80')} />}
                                                        <ChevronRight className={cn(iconSizeSmall, 'shrink-0 text-slate-400 dark:text-slate-500')} aria-hidden />
                                                    </button>
                                                </DropdownMenuTrigger>
                                            </TooltipTrigger>
                                            <TooltipContent side="right" sideOffset={14}>
                                                {item.title}
                                            </TooltipContent>
                                        </Tooltip>
                                        <DropdownMenuContent side="right" align="start" sideOffset={8} className="min-w-[180px] bg-white border-slate-200 dark:bg-[#262626] dark:border-slate-700">
                                            {submenuItems.map((subItem) => {
                                                const urlMatches = pathname === subItem.href || pathname.startsWith(subItem.href + '/');
                                                const hasMoreSpecificMatch = submenuItems.some(otherItem => {
                                                    if (otherItem.href === subItem.href) return false;
                                                    const otherMatches = pathname === otherItem.href || pathname.startsWith(otherItem.href + '/');
                                                    return otherMatches && otherItem.href.length > subItem.href.length;
                                                });
                                                const isSubActive = urlMatches && !hasMoreSpecificMatch;
                                                return (
                                                    <DropdownMenuItem key={subItem.href} asChild>
                                                        <Link
                                                            href={subItem.href}
                                                            className={cn(
                                                                'cursor-pointer flex items-center px-2 py-1.5 text-sm rounded-md',
                                                                isSubActive
                                                                    ? 'bg-sidebar-active font-medium text-white'
                                                                    : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-[#2a2a2a]'
                                                            )}
                                                        >
                                                            {subItem.title}
                                                        </Link>
                                                    </DropdownMenuItem>
                                                );
                                            })}
                                        </DropdownMenuContent>
                                    </DropdownMenu>
                                );
                            }

                            if (hasSubmenu && !collapsed) {
                                const submenuItems = item.submenu || [];
                                const isLastSubmenu = submenuItems.length > 0;
                                
                                return (
                                    <div key={item.title} className="flex flex-col relative">
                                        <button
                                            onClick={toggleSubmenu}
                                            className={cn(
                                                'w-full rounded-lg px-2.5 py-1.5 text-[16px] transition-colors inline-flex items-center gap-2 relative z-10',
                                                isActive
                                                    ? 'bg-sidebar-active text-white'
                                                    : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-[#2a2a2a] dark:hover:text-white'
                                            )}
                                        >
                                            {item.icon && <item.icon className={cn(iconSize, 'shrink-0 opacity-80')} />}
                                            <span className="truncate flex-1 text-left">{item.title}</span>
                                            <ChevronRight 
                                                className={cn(
                                                    'h-4 w-4 transition-transform',
                                                    isSubmenuOpen && 'rotate-90'
                                                )} 
                                            />
                                        </button>
                                        {isSubmenuOpen && submenuItems.length > 0 && (
                                            <div className="relative ml-6 mt-1 flex flex-col pl-4">
                                                {/* Línea vertical continua que conecta todos los hijos */}
                                                <div className="absolute left-0 top-0 bottom-0 w-px bg-slate-300 dark:bg-slate-600" />
                                                
                                                {submenuItems.map((subItem, index) => {
                                                    // Verificar si el subitem está activo de forma más precisa
                                                    // Solo se marca como activo si:
                                                    // 1. La ruta coincide exactamente con el href
                                                    // 2. O la ruta empieza con el href seguido de '/' (subruta)
                                                    // Pero no si hay otro subitem más específico que también coincida
                                                    const urlMatches = pathname === subItem.href || pathname.startsWith(subItem.href + '/');
                                                    
                                                    // Verificar si hay otro subitem más específico que también coincida
                                                    const hasMoreSpecificMatch = submenuItems.some(otherItem => {
                                                        if (otherItem.href === subItem.href) return false;
                                                        const otherMatches = pathname === otherItem.href || pathname.startsWith(otherItem.href + '/');
                                                        // Es más específico si su href es más largo y también coincide
                                                        return otherMatches && otherItem.href.length > subItem.href.length;
                                                    });
                                                    
                                                    const isSubActive = urlMatches && !hasMoreSpecificMatch;
                                                    
                                                    return (
                                                        <div key={subItem.href} className="relative flex items-center py-0.5">
                                                            {/* Línea horizontal que conecta cada hijo con la vertical */}
                                                            <div className="absolute left-0 top-1/2 w-4 h-px bg-slate-300 dark:bg-slate-600 -translate-y-1/2" />
                                                            
                                                            {/* Punto de conexión en la intersección */}
                                                            <div className="absolute left-0 top-1/2 w-1.5 h-1.5 rounded-full bg-slate-400 dark:bg-slate-500 -translate-x-1/2 -translate-y-1/2 z-20 border border-white dark:border-[#232323]" />
                                                            
                                                            <Link
                                                                href={subItem.href}
                                                                className={cn(
                                                                    'w-full rounded-lg transition-colors relative z-10',
                                                                    narrow ? 'px-2 py-1 text-xs ml-3' : 'px-2.5 py-1.5 text-sm ml-4',
                                                                    isSubActive
                                                                        ? 'bg-sidebar-active text-white font-medium'
                                                                        : 'text-slate-500 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-[#2a2a2a] dark:hover:text-white'
                                                                )}
                                                            >
                                                                {subItem.title}
                                                            </Link>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        )}
                                    </div>
                                );
                            }

                            // Item sin submenú o sidebar colapsado — tamaño fijo 50×36 cuando está colapsado para consistencia en todos los breakpoints
                            const linkClasses = cn(
                                'rounded-lg transition-colors inline-flex items-center gap-2',
                                collapsed ? 'h-[36px] w-[50px] min-h-[36px] min-w-[50px] px-1.5 py-2 text-sm justify-center gap-1.5 self-center' : 'w-full px-2.5 py-1.5 text-[16px]',
                                isActive
                                    ? 'bg-sidebar-active text-white'
                                    : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-[#2a2a2a] dark:hover:text-white'
                            );

                            const link = item.href ? (
                                <Link key={item.href} href={item.href} className={linkClasses}>
                                    {item.icon && <item.icon className={cn(iconSize, 'shrink-0 opacity-80')} />}
                                    <span className={cn('truncate', collapsed && 'hidden')}>{item.title}</span>
                                    {collapsed && <span className={cn(iconSizeSmall, 'shrink-0')} aria-hidden />}
                                </Link>
                            ) : null;

                            if (!link) return null;

                            if (!collapsed) {
                                return link;
                            }

                            return (
                                <Tooltip key={item.title}>
                                    <TooltipTrigger asChild>{link}</TooltipTrigger>
                                    <TooltipContent side="right" sideOffset={14}>
                                        {item.title}
                                    </TooltipContent>
                                </Tooltip>
                            );
                        })}
                    </div>
                </TooltipProvider>
            </nav>

            {/* Footer del sidebar y perfil: mismo ancho que los ítems del menú (alineado con el azul activo) */}
            <div className={cn('py-5', compact ? 'px-1' : collapsed ? 'px-2' : 'px-1.5', (compact || (narrow && !collapsed)) && 'py-3')}>
                {/* Asignamos la ref al wrapper para detectar clics fuera del menú */}
                <div ref={userMenuRef} className={cn('relative', collapsed && 'flex justify-center')}>
                    <button
                        type="button"
                        onClick={() => setUserMenuOpen((prev) => !prev)}
                        className={cn(
                            'flex w-full items-center rounded-2xl transition-all duration-200 bg-slate-200/60 dark:bg-[#282828]/80',
                            compact ? 'justify-center px-0 py-2' : collapsed ? 'justify-center px-0 py-3' : narrow ? 'gap-2 px-2 py-2 hover:bg-slate-100 dark:hover:bg-[#2f2f2f]' : 'gap-3 px-4 py-3 hover:bg-slate-100 dark:hover:bg-[#2f2f2f]'
                        )}
                        aria-haspopup="true"
                        aria-expanded={userMenuOpen}
                    >
                            <Avatar className={cn('border border-slate-200 dark:border-[#343434]', compact && 'h-8 w-8', narrow && !collapsed && 'h-9 w-9')}>
                                <AvatarFallback className={cn('bg-sidebar-active dark:bg-sidebar-active text-white font-bold', (compact || (narrow && !collapsed)) && 'text-xs')}>
                                    {user?.name
                                        ?.split(' ')
                                        .map((n) => n[0])
                                        .join('')
                                        .toUpperCase()
                                        .slice(0, 2) || 'U'}
                                </AvatarFallback>
                        </Avatar>

                        <div className={cn('flex flex-1 flex-col text-left', collapsed && 'hidden')}>
                            <span className="text-sm font-semibold text-slate-900 dark:text-white">
                                {user?.name || 'Usuario'}
                            </span>
                            <span className="text-xs text-slate-500 dark:text-slate-400">
                                {(() => {
                                    if (!user) {
                                        return 'Sin rol';
                                    }
                                    
                                    // Intentar obtener el rol de Spatie primero
                                    let roleToDisplay = null;
                                    
                                    if (user.roles && Array.isArray(user.roles) && user.roles.length > 0) {
                                        roleToDisplay = user.roles[0];
                                    } else if (user.role) {
                                        roleToDisplay = user.role;
                                    }
                                    
                                    if (!roleToDisplay) {
                                        return 'Sin rol';
                                    }
                                    
                                    // Formatear el rol: capitalizar y reemplazar guiones bajos
                                    const formatted = roleToDisplay
                                        .split('_')
                                        .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
                                        .join(' ');
                                    
                                    return formatted;
                                })()}
                            </span>
                        </div>

                        {!collapsed && (
                            <span className="text-slate-500 transition-transform duration-200 shrink-0">
                                {userMenuOpen ? <ChevronUp className={chevronSize} /> : <ChevronDown className={chevronSize} />}
                            </span>
                        )}
                    </button>

                    {userMenuOpen && (
                        <div
                            className={cn(
                                'absolute bottom-16 w-56 rounded-2xl border border-slate-200 bg-white p-3 text-sm shadow-xl shadow-slate-900/10 dark:border-[#2b2b2b] dark:bg-[#232323] dark:shadow-black/40',
                                compact ? 'left-14' : collapsed ? 'left-20' : 'left-0'
                            )}
                        >
                            {/* Mostrar Configuración solo si tiene permisos de branches o users */}
                            <Link
                                href={user?.role === 'admin' ? '/settings/users' : '/settings/profile'}
                                onClick={() => setUserMenuOpen(false)}
                                className="flex w-full items-center gap-3 rounded-xl px-3 py-2 text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-200 dark:hover:bg-[#2a2a2a] dark:hover:text-white"
                            >
                                <Settings className="h-4 w-4" />
                                Configuración
                            </Link>
                            {user && (
                                <button
                                    type="button"
                                    onClick={() => router.post('/logout')}
                                    className="mt-1 flex w-full items-center gap-3 rounded-xl px-3 py-2 text-left text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-200 dark:hover:bg-[#2a2a2a] dark:hover:text-white"
                                >
                                    <LogOut className="h-4 w-4" />
                                    Cerrar sesión
                                </button>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </aside>
    );
}