import { usePage } from '@inertiajs/react';
import { cn } from '@/lib/utils';
import { AppBrandLogo } from '@/components/app-brand-logo';

interface AppLogoProps {
    collapsed?: boolean;
    narrow?: boolean;
}

export default function AppLogo({ collapsed = false, narrow = false }: AppLogoProps) {
    const page = usePage();
    const appLogoUrl = (page.props as { appLogoUrl?: string | null }).appLogoUrl;
    const compact = collapsed && narrow;

    return (
        <div
            className={cn(
                'flex w-full min-w-0 shrink-0 items-center justify-center',
                compact
                    ? 'mt-2 h-10 px-1'
                    : collapsed
                      ? 'mt-2 h-12 px-2'
                      : narrow
                        ? 'mt-3 h-[4.5rem] px-3'
                        : 'mt-3 h-20 px-4',
            )}
        >
            <AppBrandLogo
                src={appLogoUrl}
                variant={collapsed ? 'sidebar-collapsed' : 'sidebar'}
            />
        </div>
    );
}
