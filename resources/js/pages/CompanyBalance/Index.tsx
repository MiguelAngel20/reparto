import AppLayout from '@/layouts/app-layout';
import { Card } from '@/components/ui';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { confirmAction } from '@/lib/sweetalert';
import { cn } from '@/lib/utils';
import { type BreadcrumbItem } from '@/types';
import { Head, useForm, usePage } from '@inertiajs/react';
import { Scale } from 'lucide-react';
import { useEffect } from 'react';
import { toast } from 'sonner';

type BalanceDisplay = {
    label: string;
    tone: 'amber' | 'violet' | 'neutral';
    value: string;
};

type Movement = {
    id: number;
    type: string;
    type_label: string;
    amount: number;
    amount_label: string;
    signed_label: string;
    balance_after: number;
    balance_after_label: string;
    notes: string | null;
    created_at: string;
};

interface CompanyBalanceIndexProps {
    companyName: string;
    balance: number;
    balanceDisplay: BalanceDisplay;
    movements: Movement[];
}

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Dashboard', href: '/dashboard' },
    { title: 'Cuenta empresa', href: '/cuenta-empresa' },
];

const cardClass =
    'border border-slate-200/80 bg-white p-4 shadow-sm dark:border-[#2b2b2b] dark:bg-[#262626] sm:p-5';

function toneClass(tone: BalanceDisplay['tone']): string {
    if (tone === 'amber') {
        return 'text-amber-600 dark:text-amber-400';
    }
    if (tone === 'violet') {
        return 'text-violet-600 dark:text-violet-400';
    }
    return 'text-slate-700 dark:text-slate-200';
}

export default function CompanyBalanceIndex({
    companyName,
    balance,
    balanceDisplay,
    movements,
}: CompanyBalanceIndexProps) {
    const page = usePage();
    const flash = page.props.flash as { success?: string; error?: string } | undefined;

    const entryForm = useForm({
        direction: 'company_owes' as 'company_owes' | 'user_owes',
        amount: '',
        notes: '',
    });

    const liquidateForm = useForm({
        notes: '',
    });

    const hasBalance = Math.abs(balance) >= 0.01;

    useEffect(() => {
        if (flash?.success) toast.success(flash.success);
        if (flash?.error) toast.error(flash.error);
    }, [flash?.success, flash?.error]);

    const submitEntry = (e: React.FormEvent) => {
        e.preventDefault();
        entryForm.post('/cuenta-empresa/saldo', {
            preserveScroll: true,
            onSuccess: () => entryForm.reset('amount', 'notes'),
        });
    };

    const submitLiquidation = async () => {
        const confirmed = await confirmAction({
            title: '¿Liquidar cuenta?',
            text: hasBalance
                ? `El saldo actual (${balanceDisplay.label}: ${balanceDisplay.value}) volverá a cero.`
                : undefined,
            confirmText: 'Sí, liquidar',
            icon: 'warning',
        });

        if (!confirmed) return;

        liquidateForm.post('/cuenta-empresa/liquidar', { preserveScroll: true });
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs} title="Cuenta empresa">
            <Head title="Cuenta empresa" />

            <div className="flex w-full flex-col gap-4">
                <Card className={cardClass}>
                    <div className="flex items-start gap-3">
                        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-sidebar-active/10 text-sidebar-active">
                            <Scale className="h-5 w-5" />
                        </div>
                        <div className="min-w-0 flex-1">
                            <p className="text-sm text-slate-500">Saldo acumulado con {companyName}</p>
                            <p className={cn('mt-1 text-2xl font-bold sm:text-3xl', toneClass(balanceDisplay.tone))}>
                                {balanceDisplay.value}
                            </p>
                            <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
                                {balanceDisplay.label}
                            </p>
                            <p className="mt-2 text-xs text-slate-500">
                                Cada jornada cerrada suma o resta según el cuadre del día. Aquí registras
                                saldos iniciales y liquidaciones.
                            </p>
                        </div>
                    </div>

                    {hasBalance && (
                        <button
                            type="button"
                            onClick={submitLiquidation}
                            disabled={liquidateForm.processing}
                            className="mt-4 inline-flex h-10 w-full items-center justify-center rounded-xl border-2 border-sidebar-active text-sm font-semibold text-sidebar-active hover:bg-sidebar-active/10 disabled:opacity-50 sm:w-auto sm:px-6"
                        >
                            {liquidateForm.processing ? 'Liquidando...' : 'Liquidar cuenta'}
                        </button>
                    )}
                </Card>

                <Card className={cardClass}>
                    <h2 className="text-base font-semibold text-slate-900 dark:text-white">
                        Registrar nuevo saldo
                    </h2>
                    <p className="mt-1 text-sm text-slate-500">
                        Usa esto cuando traes dinero de la empresa o cuando {companyName} ya te debe
                        dinero antes de cerrar jornadas.
                    </p>

                    <form onSubmit={submitEntry} noValidate className="mt-4 space-y-4">
                        <div className="grid gap-2 sm:grid-cols-2">
                            <button
                                type="button"
                                onClick={() => entryForm.setData('direction', 'company_owes')}
                                className={cn(
                                    'rounded-xl border px-3 py-3 text-left text-sm transition-colors',
                                    entryForm.data.direction === 'company_owes'
                                        ? 'border-sidebar-active bg-sidebar-active/10 text-sidebar-active'
                                        : 'border-slate-200 dark:border-[#3a3a3a]',
                                )}
                            >
                                <span className="block font-semibold">{companyName} me debe</span>
                                <span className="mt-1 block text-xs opacity-80">A tu favor</span>
                            </button>
                            <button
                                type="button"
                                onClick={() => entryForm.setData('direction', 'user_owes')}
                                className={cn(
                                    'rounded-xl border px-3 py-3 text-left text-sm transition-colors',
                                    entryForm.data.direction === 'user_owes'
                                        ? 'border-sidebar-active bg-sidebar-active/10 text-sidebar-active'
                                        : 'border-slate-200 dark:border-[#3a3a3a]',
                                )}
                            >
                                <span className="block font-semibold">Yo le debo a {companyName}</span>
                                <span className="mt-1 block text-xs opacity-80">A favor de la empresa</span>
                            </button>
                        </div>

                        <div>
                            <Label htmlFor="amount" className="mb-1 block text-xs text-slate-500">
                                Monto ($)
                            </Label>
                            <Input
                                id="amount"
                                type="number"
                                min={0.01}
                                step="0.01"
                                value={entryForm.data.amount}
                                onChange={(e) => entryForm.setData('amount', e.target.value)}
                                placeholder="0.00"
                                className={cn(entryForm.errors.amount && 'border-rose-500')}
                            />
                            {entryForm.errors.amount && (
                                <p className="mt-1 text-xs text-rose-600">{entryForm.errors.amount}</p>
                            )}
                        </div>

                        <div>
                            <Label htmlFor="notes" className="mb-1 block text-xs text-slate-500">
                                Nota (opcional)
                            </Label>
                            <Input
                                id="notes"
                                value={entryForm.data.notes}
                                onChange={(e) => entryForm.setData('notes', e.target.value)}
                                placeholder="Ej. Efectivo que traigo de la empresa"
                            />
                        </div>

                        <button
                            type="submit"
                            disabled={entryForm.processing}
                            className="inline-flex h-10 w-full items-center justify-center rounded-xl bg-sidebar-active text-sm font-semibold text-white disabled:opacity-50 sm:w-auto sm:px-6"
                        >
                            {entryForm.processing ? 'Guardando...' : 'Registrar saldo'}
                        </button>
                    </form>
                </Card>

                <Card className={cardClass}>
                    <h2 className="text-base font-semibold text-slate-900 dark:text-white">
                        Historial de movimientos
                    </h2>

                    {movements.length === 0 ? (
                        <p className="mt-4 rounded-xl border border-dashed border-slate-200 py-8 text-center text-sm text-slate-500 dark:border-[#3a3a3a]">
                            Aún no hay movimientos. El saldo inicia en cero.
                        </p>
                    ) : (
                        <ul className="mt-4 space-y-2">
                            {movements.map((movement) => (
                                <li
                                    key={movement.id}
                                    className="rounded-xl border border-slate-200 bg-slate-50/50 p-3 dark:border-[#3a3a3a] dark:bg-[#1f1f1f]/50"
                                >
                                    <div className="flex items-start justify-between gap-3">
                                        <div className="min-w-0">
                                            <p className="text-sm font-semibold text-slate-900 dark:text-white">
                                                {movement.type_label}
                                            </p>
                                            <p className="mt-0.5 text-xs text-slate-500">
                                                {movement.created_at}
                                            </p>
                                            {movement.notes && (
                                                <p className="mt-1 text-xs text-slate-600 dark:text-slate-300">
                                                    {movement.notes}
                                                </p>
                                            )}
                                        </div>
                                        <div className="shrink-0 text-right">
                                            <p
                                                className={cn(
                                                    'text-sm font-semibold tabular-nums',
                                                    movement.amount > 0.01
                                                        ? 'text-amber-600'
                                                        : movement.amount < -0.01
                                                          ? 'text-violet-600'
                                                          : 'text-slate-600',
                                                )}
                                            >
                                                {movement.amount_label}
                                            </p>
                                            <p className="mt-0.5 text-[10px] text-slate-500">
                                                {movement.signed_label}
                                            </p>
                                            <p className="mt-1 text-xs font-medium text-slate-700 dark:text-slate-200">
                                                Saldo: {movement.balance_after_label}
                                            </p>
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
