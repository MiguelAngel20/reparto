import AppLayout from '@/layouts/app-layout';
import { Card } from '@/components/ui';
import { formatCurrency } from '@/lib/utils';
import { type BreadcrumbItem } from '@/types';
import { Head } from '@inertiajs/react';
import {
    Bar,
    BarChart,
    CartesianGrid,
    ResponsiveContainer,
    Tooltip,
    XAxis,
    YAxis,
} from 'recharts';
import { Package, Truck, Users, UserCircle } from 'lucide-react';

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Dashboard', href: '/dashboard' },
];

type ChartPoint = { label: string; total: number };

interface DashboardProps {
    stats: {
        entregasHoy: number;
        entregasPendientes: number;
        repartidoresActivos: number;
        clientes: number;
    };
    chartData: ChartPoint[];
}

export default function Dashboard({ stats, chartData }: DashboardProps) {
    const cards = [
        {
            title: 'Entregas hoy',
            value: String(stats.entregasHoy),
            icon: Package,
            color: 'text-[#0085F3]',
        },
        {
            title: 'Pendientes',
            value: String(stats.entregasPendientes),
            icon: Truck,
            color: 'text-amber-600',
        },
        {
            title: 'Repartidores activos',
            value: String(stats.repartidoresActivos),
            icon: Users,
            color: 'text-emerald-600',
        },
        {
            title: 'Clientes',
            value: String(stats.clientes),
            icon: UserCircle,
            color: 'text-violet-600',
        },
    ];

    return (
        <AppLayout breadcrumbs={breadcrumbs} title="Dashboard">
            <Head title="Dashboard" />

            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                {cards.map((card) => (
                    <Card
                        key={card.title}
                        className="border border-slate-200/80 bg-white p-5 shadow-sm dark:border-[#2b2b2b] dark:bg-[#262626]"
                    >
                        <div className="flex items-start justify-between gap-3">
                            <div>
                                <p className="text-sm text-slate-500 dark:text-slate-400">
                                    {card.title}
                                </p>
                                <p className="mt-2 text-3xl font-semibold text-slate-900 dark:text-white">
                                    {card.value}
                                </p>
                            </div>
                            <card.icon className={`h-8 w-8 shrink-0 ${card.color}`} />
                        </div>
                    </Card>
                ))}
            </div>

            <Card className="mt-6 border border-slate-200/80 bg-white p-6 shadow-sm dark:border-[#2b2b2b] dark:bg-[#262626]">
                <h2 className="mb-4 text-lg font-semibold text-slate-900 dark:text-white">
                    Entregas de la semana
                </h2>
                <div className="h-72 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={chartData}>
                            <CartesianGrid
                                strokeDasharray="3 3"
                                className="stroke-slate-200 dark:stroke-[#3a3a3a]"
                            />
                            <XAxis dataKey="label" tick={{ fill: '#64748b', fontSize: 12 }} />
                            <YAxis tick={{ fill: '#64748b', fontSize: 12 }} />
                            <Tooltip
                                formatter={(value: number) => [
                                    formatCurrency(value),
                                    'Total',
                                ]}
                                contentStyle={{
                                    backgroundColor: '#232323',
                                    border: '1px solid #3a3a3a',
                                    borderRadius: '8px',
                                }}
                            />
                            <Bar dataKey="total" fill="#0085F3" radius={[4, 4, 0, 0]} />
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            </Card>

            <p className="mt-6 text-sm text-slate-500 dark:text-slate-400">
                Estructura base lista. Los módulos del menú (entregas, rutas, clientes…) se
                conectarán cuando agregues sus controladores y páginas Inertia.
            </p>
        </AppLayout>
    );
}
