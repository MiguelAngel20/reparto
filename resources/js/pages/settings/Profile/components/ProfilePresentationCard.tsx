import { Badge } from '@/components/ui';
import { resolveAppLogoUrl } from '@/lib/branding';
import { cn, formatCurrency } from '@/lib/utils';
import { Building2, Calendar, Mail, Percent } from 'lucide-react';

export type ProfileDisplayData = {
    name: string;
    email: string;
    company_name: string | null;
    percentage: number;
    role: string;
    role_label: string;
    created_at_full: string;
};

interface ProfilePresentationCardProps {
    profile: ProfileDisplayData;
    className?: string;
}

function getInitials(name: string): string {
    return name
        .trim()
        .split(/\s+/)
        .map((part) => part[0])
        .join('')
        .slice(0, 2)
        .toUpperCase();
}

function InfoTag({
    icon,
    label,
    value,
}: {
    icon: React.ReactNode;
    label: string;
    value: string;
}) {
    return (
        <div className="flex items-center gap-3 rounded-xl border border-slate-200/70 bg-slate-50/80 px-4 py-3.5 dark:border-[#3a3a3a] dark:bg-[#2a2a2a]/60">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white text-slate-600 shadow-sm dark:bg-[#333] dark:text-slate-300">
                {icon}
            </span>
            <div className="min-w-0 flex-1">
                <p className="text-[11px] font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">
                    {label}
                </p>
                <p className="truncate text-sm font-semibold text-slate-900 dark:text-white">
                    {value}
                </p>
            </div>
        </div>
    );
}

export default function ProfilePresentationCard({
    profile,
    className,
}: ProfilePresentationCardProps) {
    const roleVariant = profile.role === 'admin' ? 'blue' : 'green';
    const logoSrc = resolveAppLogoUrl(null);

    return (
        <div className={cn('w-full', className)}>
            <div className="flex flex-col gap-8 lg:flex-row lg:items-start">
                <div className="flex shrink-0 flex-col items-center text-center lg:items-start lg:text-left">
                    <div className="inline-flex rounded-full bg-gradient-to-tr from-[#f9ce34] via-[#ee2a7b] to-[#6228d7] p-[3px]">
                        <div className="relative flex h-28 w-28 items-center justify-center overflow-hidden rounded-full border-2 border-white bg-white dark:border-[#262626] dark:bg-[#1a1a1a]">
                            <img
                                src={logoSrc}
                                alt=""
                                className="absolute inset-0 h-full w-full object-cover opacity-20"
                                aria-hidden
                            />
                            <span className="relative z-10 text-3xl font-bold text-slate-800 dark:text-white">
                                {getInitials(profile.name)}
                            </span>
                        </div>
                    </div>

                    <h2 className="mt-4 text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
                        {profile.name}
                    </h2>
                    <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                        @{profile.email.split('@')[0]}
                    </p>
                    <p className="mt-0.5 text-sm text-slate-400 dark:text-slate-500">
                        {profile.email}
                    </p>
                    <div className="mt-3">
                        <Badge variant={roleVariant} className="px-3 py-1">
                            {profile.role_label}
                        </Badge>
                    </div>
                </div>

                <div className="grid min-w-0 flex-1 grid-cols-1 gap-3 sm:grid-cols-2">
                    <InfoTag
                        icon={<Building2 className="h-4 w-4" />}
                        label="Empresa"
                        value={profile.company_name ?? '—'}
                    />
                    <InfoTag
                        icon={<Mail className="h-4 w-4" />}
                        label="Correo"
                        value={profile.email}
                    />
                    <InfoTag
                        icon={<Percent className="h-4 w-4" />}
                        label="Porcentaje"
                        value={`${formatCurrency(profile.percentage)}%`}
                    />
                    <InfoTag
                        icon={<Calendar className="h-4 w-4" />}
                        label="Miembro desde"
                        value={profile.created_at_full}
                    />
                </div>
            </div>
        </div>
    );
}
