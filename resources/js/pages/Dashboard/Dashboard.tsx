import AppLayout from '@/layouts/app-layout';
import { Card } from '@/components/ui';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { formatCurrency, cn, localDateInputValue } from '@/lib/utils';
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
import { DollarSign, Package, Scale, TrendingUp } from 'lucide-react';
import { useMemo, useState } from 'react';

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Dashboard', href: '/dashboard' },
];

type DailyEarning = { date: string; user_earnings: number };

type ChartPoint = { label: string; total: number };

type TodayStats = {
    orders_today: number;
    user_earnings: number;
    clikio_commission: number;
    clikio_settlement: number;
};

type ChartPeriod = 'week' | 'day' | 'month' | 'year';

type DayRange = { from: string; to: string };

function firstDayOfMonth(): string {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`;
}

function defaultDayRange(): DayRange {
    return {
        from: firstDayOfMonth(),
        to: localDateInputValue(),
    };
}

function toDateKey(date: Date): string {
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

interface DashboardProps {
    companyName: string;
    todayStats: TodayStats;
    dailyEarnings: DailyEarning[];
}

const WEEKDAY_LABELS = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];

const MONTH_LABELS = [
    'Enero',
    'Febrero',
    'Marzo',
    'Abril',
    'Mayo',
    'Junio',
    'Julio',
    'Agosto',
    'Septiembre',
    'Octubre',
    'Noviembre',
    'Diciembre',
];

const CHART_YEAR_START = 2020;
const CHART_YEAR_END = 2026;

function parseLocalDate(date: string): Date {
    const [y, m, d] = date.split('-').map(Number);
    return new Date(y, m - 1, d);
}

function startOfWeekMonday(date: Date): Date {
    const d = new Date(date);
    const day = d.getDay();
    const diff = day === 0 ? -6 : 1 - day;
    d.setDate(d.getDate() + diff);
    d.setHours(0, 0, 0, 0);
    return d;
}

function buildDayRangeChartData(
    dailyEarnings: DailyEarning[],
    dateFrom: string,
    dateTo: string,
): ChartPoint[] {
    const indexed = new Map(
        dailyEarnings.map((row) => [row.date, row.user_earnings]),
    );

    let from = parseLocalDate(dateFrom);
    let to = parseLocalDate(dateTo);
    if (from > to) {
        [from, to] = [to, from];
    }

    const points: ChartPoint[] = [];
    const cursor = new Date(from);

    while (cursor <= to) {
        const key = toDateKey(cursor);
        points.push({
            label: `${cursor.getDate()}/${cursor.getMonth() + 1}`,
            total: indexed.get(key) ?? 0,
        });
        cursor.setDate(cursor.getDate() + 1);
    }

    return points;
}

function buildChartData(
    dailyEarnings: DailyEarning[],
    period: ChartPeriod,
    reference: Date,
    dayRange: DayRange,
): ChartPoint[] {
    const indexed = new Map(
        dailyEarnings.map((row) => [row.date, row.user_earnings]),
    );

    if (period === 'day') {
        return buildDayRangeChartData(dailyEarnings, dayRange.from, dayRange.to);
    }

    if (period === 'week') {
        const monday = startOfWeekMonday(reference);
        const points: ChartPoint[] = [];

        for (let i = 0; i < 7; i++) {
            const d = new Date(monday);
            d.setDate(monday.getDate() + i);
            const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
            points.push({
                label: WEEKDAY_LABELS[d.getDay()],
                total: indexed.get(key) ?? 0,
            });
        }

        return points;
    }

    if (period === 'month') {
        const year = reference.getFullYear();
        const totals = Array.from({ length: 12 }, () => 0);

        dailyEarnings.forEach((row) => {
            const d = parseLocalDate(row.date);
            if (d.getFullYear() !== year) {
                return;
            }
            totals[d.getMonth()] += row.user_earnings;
        });

        return MONTH_LABELS.map((label, index) => ({
            label,
            total: Math.round(totals[index] * 100) / 100,
        }));
    }

    const yearTotals = new Map<number, number>();
    for (let y = CHART_YEAR_START; y <= CHART_YEAR_END; y++) {
        yearTotals.set(y, 0);
    }

    dailyEarnings.forEach((row) => {
        const d = parseLocalDate(row.date);
        const year = d.getFullYear();
        if (!yearTotals.has(year)) {
            return;
        }
        yearTotals.set(year, (yearTotals.get(year) ?? 0) + row.user_earnings);
    });

    return Array.from({ length: CHART_YEAR_END - CHART_YEAR_START + 1 }, (_, i) => {
        const year = CHART_YEAR_START + i;

        return {
            label: String(year),
            total: Math.round((yearTotals.get(year) ?? 0) * 100) / 100,
        };
    });
}

function settlementDisplay(
    settlement: number,
): { value: string; tone: string; iconTone: string } {
    if (settlement > 0.01) {
        return {
            value: `Le debes $${formatCurrency(settlement)}`,
            tone: 'text-amber-600 dark:text-amber-400',
            iconTone: 'text-amber-600',
        };
    }
    if (settlement < -0.01) {
        return {
            value: `Te debe $${formatCurrency(Math.abs(settlement))}`,
            tone: 'text-violet-600 dark:text-violet-400',
            iconTone: 'text-violet-600',
        };
    }
    return {
        value: 'Cuadrado',
        tone: 'text-slate-600 dark:text-slate-300',
        iconTone: 'text-slate-500',
    };
}

const periodOptions: { value: ChartPeriod; label: string }[] = [
    { value: 'week', label: 'Semana' },
    { value: 'day', label: 'Día' },
    { value: 'month', label: 'Mes' },
    { value: 'year', label: 'Año' },
];

export default function Dashboard({
    companyName,
    todayStats,
    dailyEarnings,
}: DashboardProps) {
    const [chartPeriod, setChartPeriod] = useState<ChartPeriod>('week');
    const [dayRange, setDayRange] = useState<DayRange>(defaultDayRange);

    const settlement = useMemo(
        () => settlementDisplay(todayStats.clikio_settlement),
        [todayStats.clikio_settlement],
    );

    const chartData = useMemo(
        () => buildChartData(dailyEarnings, chartPeriod, new Date(), dayRange),
        [dailyEarnings, chartPeriod, dayRange],
    );

    const chartTitle =
        chartPeriod === 'week'
            ? 'Mis ganancias de la semana'
            : chartPeriod === 'day'
              ? 'Mis ganancias por día'
              : chartPeriod === 'month'
                ? `Mis ganancias por mes (${new Date().getFullYear()})`
                : `Mis ganancias por año (${CHART_YEAR_START}–${CHART_YEAR_END})`;

    const xAxisAngle =
        chartPeriod === 'month' || (chartPeriod === 'day' && chartData.length > 14)
            ? -35
            : 0;

    const cards = [
        {
            title: 'Pedidos hoy',
            value: String(todayStats.orders_today),
            icon: Package,
            color: 'text-[#0085F3]',
        },
        {
            title: 'Mis ganancias hoy',
            value: `$${formatCurrency(todayStats.user_earnings)}`,
            icon: DollarSign,
            color: 'text-emerald-600',
        },
        {
            title: `${companyName} hoy`,
            value: `$${formatCurrency(todayStats.clikio_commission)}`,
            icon: TrendingUp,
            color: 'text-blue-600',
        },
        {
            title: `Cuadre ${companyName}`,
            value: settlement.value,
            icon: Scale,
            color: settlement.iconTone,
            valueClass: settlement.tone,
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
                            <div className="min-w-0">
                                <p className="text-sm text-slate-500 dark:text-slate-400">
                                    {card.title}
                                </p>
                                <p
                                    className={cn(
                                        'mt-2 text-2xl font-semibold text-slate-900 dark:text-white sm:text-3xl',
                                        card.valueClass,
                                    )}
                                >
                                    {card.value}
                                </p>
                            </div>
                            <card.icon className={`h-8 w-8 shrink-0 ${card.color}`} />
                        </div>
                    </Card>
                ))}
            </div>

            <Card className="mt-6 border border-slate-200/80 bg-white p-6 shadow-sm dark:border-[#2b2b2b] dark:bg-[#262626]">
                <div className="mb-4 flex flex-col gap-3">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                        <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
                            {chartTitle}
                        </h2>
                        <div className="flex flex-wrap gap-2">
                            {periodOptions.map((option) => (
                                <button
                                    key={option.value}
                                    type="button"
                                    onClick={() => setChartPeriod(option.value)}
                                    className={cn(
                                        'rounded-lg px-3 py-1.5 text-sm font-medium transition-colors',
                                        chartPeriod === option.value
                                            ? 'bg-sidebar-active text-white'
                                            : 'border border-slate-200 text-slate-600 hover:bg-slate-50 dark:border-[#3a3a3a] dark:text-slate-300 dark:hover:bg-[#2a2a2a]',
                                    )}
                                >
                                    {option.label}
                                </button>
                            ))}
                        </div>
                    </div>
                    {chartPeriod === 'day' && (
                        <div className="flex flex-wrap items-end gap-2">
                            <div>
                                <Label className="mb-1 block text-[10px] uppercase text-slate-500">
                                    Desde
                                </Label>
                                <Input
                                    type="date"
                                    value={dayRange.from}
                                    onChange={(e) =>
                                        setDayRange((prev) => ({
                                            ...prev,
                                            from: e.target.value,
                                        }))
                                    }
                                    className="h-9 w-36"
                                />
                            </div>
                            <div>
                                <Label className="mb-1 block text-[10px] uppercase text-slate-500">
                                    Hasta
                                </Label>
                                <Input
                                    type="date"
                                    value={dayRange.to}
                                    onChange={(e) =>
                                        setDayRange((prev) => ({
                                            ...prev,
                                            to: e.target.value,
                                        }))
                                    }
                                    className="h-9 w-36"
                                />
                            </div>
                        </div>
                    )}
                </div>
                <div className="h-72 w-full">
                    <ResponsiveContainer
                        width="100%"
                        height="100%"
                        initialDimension={{ width: 600, height: 288 }}
                    >
                        <BarChart data={chartData}>
                            <CartesianGrid
                                strokeDasharray="3 3"
                                className="stroke-slate-200 dark:stroke-[#3a3a3a]"
                            />
                            <XAxis
                                dataKey="label"
                                tick={{
                                    fill: '#64748b',
                                    fontSize: xAxisAngle !== 0 ? 10 : 12,
                                }}
                                interval={
                                    chartPeriod === 'day' && chartData.length > 20 ? 1 : 0
                                }
                                angle={xAxisAngle}
                                textAnchor={xAxisAngle !== 0 ? 'end' : 'middle'}
                                height={xAxisAngle !== 0 ? 56 : 30}
                            />
                            <YAxis tick={{ fill: '#64748b', fontSize: 12 }} />
                            <Tooltip
                                formatter={(value: number) => [
                                    `$${formatCurrency(value)}`,
                                    'Mis ganancias',
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
        </AppLayout>
    );
}
