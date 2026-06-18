import { Link, usePage } from '@inertiajs/react';
import { cn } from '@/lib/utils';
import { User, Users } from 'lucide-react';
import { usePermissions } from '@/hooks/usePermissions';

export default function SettingsSidebar() {
    const page = usePage();
    const url = (page.url || '').split('?')[0];
    const { hasRole } = usePermissions();

    const isAdmin = hasRole('admin');
    const isUsers = url.startsWith('/settings/users');
    const isPermissions = /\/settings\/users\/\d+\/permisos/.test(url);
    const isProfile = url.startsWith('/settings/profile');

    return (
        <div className="w-full rounded-xl border border-slate-200/80 bg-white p-1.5 dark:border-[#2b2b2b] dark:bg-[#262626]">
            <nav className="flex w-full flex-col gap-1.5">
                {isAdmin && (
                    <Link
                        href="/settings/users"
                        className={cn(
                            'inline-flex w-full items-center justify-start gap-2 rounded-lg px-2.5 py-1.5 text-[16px] transition-colors',
                            isUsers || isPermissions
                                ? 'bg-sidebar-active text-white'
                                : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-[#2a2a2a] dark:hover:text-white',
                        )}
                    >
                        <Users className="h-4 w-4 shrink-0 opacity-80" />
                        <span>Usuarios</span>
                    </Link>
                )}
                <Link
                    href="/settings/profile"
                    className={cn(
                        'inline-flex w-full items-center justify-start gap-2 rounded-lg px-2.5 py-1.5 text-[16px] transition-colors',
                        isProfile
                            ? 'bg-sidebar-active text-white'
                            : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-[#2a2a2a] dark:hover:text-white',
                    )}
                >
                    <User className="h-4 w-4 shrink-0 opacity-80" />
                    <span>{isAdmin ? 'Mi perfil' : 'Mi información'}</span>
                </Link>
            </nav>
        </div>
    );
}
