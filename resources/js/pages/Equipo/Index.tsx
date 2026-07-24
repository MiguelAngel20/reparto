import AppLayout from '@/layouts/app-layout';
import { Badge, Card } from '@/components/ui';
import { cn } from '@/lib/utils';
import { type BreadcrumbItem } from '@/types';
import { Head, router } from '@inertiajs/react';
import type { ComponentType } from 'react';
import {
    Briefcase,
    Package,
    RefreshCw,
    Users,
    UserRound,
} from 'lucide-react';

type TeamMember = {
    id: number;
    name: string;
    email: string;
    role: string | null;
    role_label: string;
    company_name: string | null;
    has_open_shift: boolean;
    shift_started_at: string | null;
    active_orders_count: number;
    active_personal_services_count: number;
    status_key: 'delivering' | 'personal_service' | 'on_shift' | 'idle';
    status_label: string;
};

type TeamSummary = {
    total_members: number;
    on_shift: number;
    with_active_orders: number;
    with_active_services: number;
};

interface EquipoIndexProps {
    generated_at: string;
    summary: TeamSummary;
    members: TeamMember[];
}

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Dashboard', href: '/dashboard' },
    { title: 'Equipo', href: '/equipo' },
];

const cardClass =
    'border border-slate-200/80 bg-white p-4 shadow-sm dark:border-[#2b2b2b] dark:bg-[#262626] sm:p-5';

function statusBadgeVariant(
    key: TeamMember['status_key'],
): 'green' | 'blue' | 'amber' | 'gray' {
    if (key === 'delivering') return 'green';
    if (key === 'personal_service') return 'blue';
    if (key === 'on_shift') return 'amber';
    return 'gray';
}

function SummaryStat({
    label,
    value,
    icon: Icon,
}: {
    label: string;
    value: number;
    icon: ComponentType<{ className?: string }>;
}) {
    return (
        <div className="rounded-xl border border-slate-200 bg-slate-50/60 p-3 dark:border-[#3a3a3a] dark:bg-[#1f1f1f]/50">
            <div className="flex items-center gap-2 text-slate-500">
                <Icon className="h-4 w-4 shrink-0 opacity-80" />
                <p className="text-xs font-medium">{label}</p>
            </div>
            <p className="mt-1 text-2xl font-bold tabular-nums text-slate-900 dark:text-white">
                {value}
            </p>
        </div>
    );
}

export default function EquipoIndex({
    generated_at,
    summary,
    members,
}: EquipoIndexProps) {
    const refresh = () => {
        router.reload({ only: ['generated_at', 'summary', 'members'] });
    };

    const activeFirst = [...members].sort((a, b) => {
        const rank = (m: TeamMember) => {
            if (m.status_key === 'delivering') return 0;
            if (m.status_key === 'personal_service') return 1;
            if (m.status_key === 'on_shift') return 2;
            return 3;
        };

        const diff = rank(a) - rank(b);
        if (diff !== 0) return diff;

        return a.name.localeCompare(b.name, 'es');
    });

    return (
        <AppLayout breadcrumbs={breadcrumbs} title="Equipo">
            <Head title="Equipo" />

            <div className="mx-auto flex w-full max-w-5xl flex-col gap-4 p-4 sm:p-6">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                        <h1 className="text-xl font-semibold text-slate-900 dark:text-white">
                            Equipo
                        </h1>
                        <p className="mt-1 max-w-2xl text-sm text-slate-500">
                            Estado de jornadas, pedidos y servicios propios en curso. Actualiza la
                            página cuando quieras ver datos recientes; no se envían consultas extra
                            a los dispositivos del equipo.
                        </p>
                        <p className="mt-2 text-xs text-slate-400">
                            Datos al {generated_at}
                        </p>
                    </div>
                    <button
                        type="button"
                        onClick={refresh}
                        className="inline-flex h-10 shrink-0 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 hover:bg-slate-50 dark:border-[#3a3a3a] dark:bg-[#1f1f1f] dark:text-slate-200 dark:hover:bg-[#2a2a2a]"
                    >
                        <RefreshCw className="h-4 w-4" />
                        Actualizar
                    </button>
                </div>

                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                    <SummaryStat
                        label="Personas en el equipo"
                        value={summary.total_members}
                        icon={Users}
                    />
                    <SummaryStat
                        label="En jornada"
                        value={summary.on_shift}
                        icon={UserRound}
                    />
                    <SummaryStat
                        label="Con pedido activo"
                        value={summary.with_active_orders}
                        icon={Package}
                    />
                    <SummaryStat
                        label="Con servicio propio"
                        value={summary.with_active_services}
                        icon={Briefcase}
                    />
                </div>

                <Card className={cardClass}>
                    <h2 className="text-base font-semibold text-slate-900 dark:text-white">
                        Detalle por persona
                    </h2>

                    {activeFirst.length === 0 ? (
                        <p className="mt-4 rounded-xl border border-dashed border-slate-200 py-8 text-center text-sm text-slate-500 dark:border-[#3a3a3a]">
                            No hay usuarios de equipo registrados (excluye administradores).
                        </p>
                    ) : (
                        <ul className="mt-4 space-y-2">
                            {activeFirst.map((member) => (
                                <li
                                    key={member.id}
                                    className="rounded-xl border border-slate-200 bg-slate-50/50 p-3 dark:border-[#3a3a3a] dark:bg-[#1f1f1f]/50"
                                >
                                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                                        <div className="min-w-0">
                                            <div className="flex flex-wrap items-center gap-2">
                                                <p className="text-sm font-semibold text-slate-900 dark:text-white">
                                                    {member.name}
                                                </p>
                                                <Badge variant="gray">{member.role_label}</Badge>
                                                <Badge variant={statusBadgeVariant(member.status_key)}>
                                                    {member.status_label}
                                                </Badge>
                                            </div>
                                            <p className="mt-0.5 truncate text-xs text-slate-500">
                                                {member.email}
                                                {member.company_name
                                                    ? ` · ${member.company_name}`
                                                    : ''}
                                            </p>
                                            <p className="mt-2 text-xs text-slate-600 dark:text-slate-300">
                                                {member.has_open_shift ? (
                                                    <>
                                                        Jornada abierta
                                                        {member.shift_started_at
                                                            ? ` desde ${member.shift_started_at}`
                                                            : ''}
                                                    </>
                                                ) : (
                                                    'Sin jornada abierta'
                                                )}
                                            </p>
                                        </div>
                                        <div className="flex shrink-0 gap-4 text-xs sm:text-right">
                                            <div>
                                                <p className="font-medium text-slate-500">
                                                    Pedidos activos
                                                </p>
                                                <p
                                                    className={cn(
                                                        'mt-0.5 text-lg font-bold tabular-nums',
                                                        member.active_orders_count > 0
                                                            ? 'text-emerald-600 dark:text-emerald-400'
                                                            : 'text-slate-700 dark:text-slate-200',
                                                    )}
                                                >
                                                    {member.active_orders_count}
                                                </p>
                                            </div>
                                            <div>
                                                <p className="font-medium text-slate-500">
                                                    Servicios activos
                                                </p>
                                                <p
                                                    className={cn(
                                                        'mt-0.5 text-lg font-bold tabular-nums',
                                                        member.active_personal_services_count > 0
                                                            ? 'text-blue-600 dark:text-blue-400'
                                                            : 'text-slate-700 dark:text-slate-200',
                                                    )}
                                                >
                                                    {member.active_personal_services_count}
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                </li>
                            ))}
                        </ul>
                    )}
                </Card>
            </div>
        </AppLayout>
    );
}
