import { formatDuration } from '@/lib/delivery-commission';
import { cn } from '@/lib/utils';
import { useElapsedTime } from '@/hooks/use-elapsed-time';
import { Link } from '@inertiajs/react';
import { Briefcase, Clock, Plus } from 'lucide-react';

export type ActivePersonalServiceSummary = {
    id: number;
    name: string;
    label: string;
    started_at: string | null;
    is_current?: boolean;
};

function ServiceTimer({ startedAt }: { startedAt: string | null }) {
    const elapsed = useElapsedTime(startedAt);

    return (
        <span className="font-mono text-xs tabular-nums text-violet-600 dark:text-violet-400">
            {formatDuration(elapsed)}
        </span>
    );
}

type ActivePersonalServicesBarProps = {
    services: ActivePersonalServiceSummary[];
    currentServiceId?: number;
    showNewServiceButton?: boolean;
    compact?: boolean;
};

export function ActivePersonalServicesBar({
    services,
    currentServiceId,
    showNewServiceButton = true,
    compact = false,
}: ActivePersonalServicesBarProps) {
    if (services.length === 0) {
        return null;
    }

    return (
        <div
            className={cn(
                'space-y-2',
                compact
                    ? ''
                    : 'rounded-xl border border-violet-200/60 bg-violet-50/50 p-3 dark:border-violet-900/40 dark:bg-violet-950/20',
            )}
        >
            {!compact && (
                <div className="flex items-center justify-between gap-2">
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                        Servicios en curso ({services.length})
                    </p>
                    {showNewServiceButton && (
                        <Link
                            href="/reparto/servicios-propios/iniciar"
                            method="post"
                            as="button"
                            className="inline-flex items-center gap-1 rounded-lg bg-violet-600 px-2.5 py-1.5 text-xs font-semibold text-white hover:opacity-90"
                        >
                            <Plus className="h-3.5 w-3.5" />
                            Nuevo servicio
                        </Link>
                    )}
                </div>
            )}

            <div className="flex gap-2 overflow-x-auto pb-0.5">
                {services.map((activeService, index) => {
                    const isCurrent =
                        activeService.is_current ??
                        (currentServiceId !== undefined &&
                            activeService.id === currentServiceId);

                    return (
                        <Link
                            key={activeService.id}
                            href={`/reparto/servicios-propios/${activeService.id}`}
                            className={cn(
                                'flex min-w-[9.5rem] shrink-0 flex-col gap-1 rounded-xl border px-3 py-2 transition-colors',
                                isCurrent
                                    ? 'border-violet-500 bg-violet-100/80 shadow-sm dark:border-violet-500 dark:bg-violet-950/40'
                                    : 'border-slate-200 bg-white hover:border-violet-300 dark:border-[#3a3a3a] dark:bg-[#262626]',
                            )}
                        >
                            <div className="flex items-center gap-1.5">
                                <Briefcase className="h-3.5 w-3.5 shrink-0 text-violet-600 dark:text-violet-400" />
                                <span className="truncate text-sm font-semibold text-slate-900 dark:text-white">
                                    {activeService.label !== 'Sin nombre'
                                        ? activeService.label
                                        : `Servicio ${index + 1}`}
                                </span>
                            </div>
                            <div className="flex items-center gap-1 text-slate-500">
                                <Clock className="h-3 w-3" />
                                <ServiceTimer startedAt={activeService.started_at} />
                            </div>
                        </Link>
                    );
                })}

                {compact && showNewServiceButton && (
                    <Link
                        href="/reparto/servicios-propios/iniciar"
                        method="post"
                        as="button"
                        className="flex min-w-[7rem] shrink-0 flex-col items-center justify-center gap-1 rounded-xl border border-dashed border-violet-400/50 px-3 py-2 text-violet-600 hover:bg-violet-50 dark:text-violet-400 dark:hover:bg-violet-950/30"
                    >
                        <Plus className="h-4 w-4" />
                        <span className="text-xs font-semibold">Nuevo</span>
                    </Link>
                )}
            </div>
        </div>
    );
}
