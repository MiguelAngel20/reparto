import { formatDuration } from '@/lib/delivery-commission';
import { cn } from '@/lib/utils';
import { useElapsedTime } from '@/hooks/use-elapsed-time';
import { Link } from '@inertiajs/react';
import { Clock, Package, Plus } from 'lucide-react';

export type ActiveOrderSummary = {
    id: number;
    name: string;
    label: string;
    started_at: string | null;
    is_current?: boolean;
};

function OrderTimer({ startedAt }: { startedAt: string | null }) {
    const elapsed = useElapsedTime(startedAt);

    return (
        <span className="font-mono text-xs tabular-nums text-sidebar-active">
            {formatDuration(elapsed)}
        </span>
    );
}

type ActiveOrdersBarProps = {
    orders: ActiveOrderSummary[];
    currentOrderId?: number;
    showNewOrderButton?: boolean;
    compact?: boolean;
};

export function ActiveOrdersBar({
    orders,
    currentOrderId,
    showNewOrderButton = true,
    compact = false,
}: ActiveOrdersBarProps) {
    if (orders.length === 0) {
        return null;
    }

    return (
        <div className={cn('space-y-2', compact ? '' : 'rounded-xl border border-sidebar-active/20 bg-sidebar-active/5 p-3')}>
            {!compact && (
                <div className="flex items-center justify-between gap-2">
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                        Pedidos en curso ({orders.length})
                    </p>
                    {showNewOrderButton && (
                        <Link
                            href="/reparto/pedidos/iniciar"
                            method="post"
                            as="button"
                            className="inline-flex items-center gap-1 rounded-lg bg-sidebar-active px-2.5 py-1.5 text-xs font-semibold text-white hover:opacity-90"
                        >
                            <Plus className="h-3.5 w-3.5" />
                            Nuevo pedido
                        </Link>
                    )}
                </div>
            )}

            <div className="flex gap-2 overflow-x-auto pb-0.5">
                {orders.map((activeOrder, index) => {
                    const isCurrent =
                        activeOrder.is_current ??
                        (currentOrderId !== undefined && activeOrder.id === currentOrderId);

                    return (
                        <Link
                            key={activeOrder.id}
                            href={`/reparto/pedidos/${activeOrder.id}`}
                            className={cn(
                                'flex min-w-[9.5rem] shrink-0 flex-col gap-1 rounded-xl border px-3 py-2 transition-colors',
                                isCurrent
                                    ? 'border-sidebar-active bg-sidebar-active/10 shadow-sm'
                                    : 'border-slate-200 bg-white hover:border-sidebar-active/40 dark:border-[#3a3a3a] dark:bg-[#262626]',
                            )}
                        >
                            <div className="flex items-center gap-1.5">
                                <Package className="h-3.5 w-3.5 shrink-0 text-sidebar-active" />
                                <span className="truncate text-sm font-semibold text-slate-900 dark:text-white">
                                    {activeOrder.label !== 'Sin nombre'
                                        ? activeOrder.label
                                        : `Pedido ${index + 1}`}
                                </span>
                            </div>
                            <div className="flex items-center gap-1 text-slate-500">
                                <Clock className="h-3 w-3" />
                                <OrderTimer startedAt={activeOrder.started_at} />
                            </div>
                        </Link>
                    );
                })}

                {compact && showNewOrderButton && (
                    <Link
                        href="/reparto/pedidos/iniciar"
                        method="post"
                        as="button"
                        className="flex min-w-[7rem] shrink-0 flex-col items-center justify-center gap-1 rounded-xl border border-dashed border-sidebar-active/50 px-3 py-2 text-sidebar-active hover:bg-sidebar-active/5"
                    >
                        <Plus className="h-4 w-4" />
                        <span className="text-xs font-semibold">Nuevo</span>
                    </Link>
                )}
            </div>
        </div>
    );
}
