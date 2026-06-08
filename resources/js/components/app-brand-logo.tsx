import { cn } from '@/lib/utils';
import { resolveAppLogoUrl } from '@/lib/branding';

type LogoVariant = 'login' | 'sidebar' | 'sidebar-collapsed' | 'header';

interface AppBrandLogoProps {
    src?: string | null;
    alt?: string;
    variant?: LogoVariant;
    className?: string;
}

const variantClasses: Record<LogoVariant, string> = {
    login: 'h-28 w-full max-w-[280px] object-contain object-center',
    sidebar: 'h-full w-full max-h-16 object-contain object-center px-4',
    'sidebar-collapsed': 'h-9 w-9 object-contain object-center',
    header: 'h-9 w-auto max-w-[140px] object-contain object-left',
};

export function AppBrandLogo({
    src,
    alt = 'Reparto',
    variant = 'login',
    className,
}: AppBrandLogoProps) {
    const logoSrc = resolveAppLogoUrl(src);

    return (
        <img
            src={logoSrc}
            alt={alt}
            className={cn(variantClasses[variant], className)}
        />
    );
}
