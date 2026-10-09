import AppLayout from '@/layouts/app-layout';
import { Card } from '@/components/ui';
import {
    Dialog,
    DialogContent,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useSectionAccess } from '@/hooks/useSectionAccess';
import { formatCurrency, cn } from '@/lib/utils';
import { type BreadcrumbItem } from '@/types';
import { Head, Link, useForm, usePage } from '@inertiajs/react';
import { ArrowRight, HandCoins, Plus } from 'lucide-react';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';

type DebtorRow = {
    id: number;
    name: string;
    balance: number;
    opened_at: string | null;
};

interface DebtorsIndexProps {
    debtors: DebtorRow[];
}

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Dashboard', href: '/dashboard' },
    { title: 'Quién te debe', href: '/quien-te-debe' },
];

const cardClass =
    'border border-slate-200/80 bg-white p-4 shadow-sm dark:border-[#2b2b2b] dark:bg-[#262626] sm:p-5';

export default function DebtorsIndex({ debtors }: DebtorsIndexProps) {
    const { canEdit } = useSectionAccess('debtors');
    const page = usePage();
    const flash = page.props.flash as { success?: string; error?: string } | undefined;
    const [createOpen, setCreateOpen] = useState(false);
    const form = useForm({ name: '' });

    useEffect(() => {
        if (flash?.success) toast.success(flash.success);
        if (flash?.error) toast.error(flash.error);
    }, [flash?.success, flash?.error]);

    const submitCreate = (e: React.FormEvent) => {
        e.preventDefault();
        form.post('/quien-te-debe', {
            preserveScroll: true,
            onSuccess: () => {
                form.reset();
                setCreateOpen(false);
            },
        });
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs} title="Quién te debe">
            <Head title="Quién te debe" />

            <div className="flex w-full flex-col gap-4">
                <Card className={cardClass}>
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                        <div>
                            <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
                                Quién te debe
                            </h2>
                        </div>
                        {canEdit && (
                            <button
                                type="button"
                                onClick={() => setCreateOpen(true)}
                                className="inline-flex h-10 shrink-0 items-center justify-center gap-2 rounded-xl bg-sidebar-active px-4 text-sm font-semibold text-white hover:opacity-90"
                            >
                                <Plus className="h-4 w-4" />
                                Nuevo deudor
                            </button>
                        )}
                    </div>
                </Card>

                {debtors.length === 0 ? (
                    <Card className={cardClass}>
                        <div className="flex flex-col items-center py-10 text-center">
                            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-sidebar-active/10 text-sidebar-active">
                                <HandCoins className="h-7 w-7" />
                            </div>
                            <p className="mt-4 text-base font-semibold text-slate-900 dark:text-white">
                                Aún no hay deudores
                            </p>
                            <p className="mt-1 max-w-sm text-sm text-slate-500">
                                Crea uno, por ejemplo Cuenta casa, Cuenta trabajo o el nombre de una persona.
                            </p>
                        </div>
                    </Card>
                ) : (
                    <>
                        <div className="hidden overflow-hidden rounded-xl border border-slate-200/80 bg-white shadow-sm dark:border-[#2b2b2b] dark:bg-[#262626] xl:block">
                            <table className="w-full text-left text-sm">
                                <thead>
                                    <tr className="border-b border-slate-200 bg-slate-50 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:border-[#3a3a3a] dark:bg-[#1f1f1f]">
                                        <th className="px-4 py-3">Deudor</th>
                                        <th className="px-4 py-3 text-right">Te debe</th>
                                        <th className="px-4 py-3 text-center">Acciones</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 dark:divide-[#333]">
                                    {debtors.map((debtor) => (
                                        <tr key={debtor.id} className="text-slate-700 dark:text-slate-200">
                                            <td className="px-4 py-3 font-semibold text-slate-900 dark:text-white">
                                                {debtor.name}
                                            </td>
                                            <td className="px-4 py-3 text-right font-mono text-base font-bold tabular-nums text-amber-700 dark:text-amber-400">
                                                ${formatCurrency(debtor.balance)}
                                            </td>
                                            <td className="px-4 py-3 text-center">
                                                <Link
                                                    href={`/quien-te-debe/${debtor.id}`}
                                                    className="inline-flex h-9 items-center justify-center gap-1.5 rounded-lg bg-sidebar-active px-3 text-xs font-semibold text-white hover:opacity-90"
                                                >
                                                    Entrar
                                                    <ArrowRight className="h-3.5 w-3.5" />
                                                </Link>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>

                        <ul className="grid gap-3 xl:hidden">
                            {debtors.map((debtor) => (
                                <li
                                    key={debtor.id}
                                    className="rounded-xl border border-slate-200/80 bg-white p-4 shadow-sm dark:border-[#2b2b2b] dark:bg-[#262626]"
                                >
                                    <p className="text-base font-semibold text-slate-900 dark:text-white">
                                        {debtor.name}
                                    </p>
                                    <p className="mt-1 text-xs text-slate-500">Te debe</p>
                                    <p className="font-mono text-2xl font-bold tabular-nums text-amber-700 dark:text-amber-400">
                                        ${formatCurrency(debtor.balance)}
                                    </p>
                                    <Link
                                        href={`/quien-te-debe/${debtor.id}`}
                                        className="mt-3 inline-flex h-10 w-full items-center justify-center gap-1.5 rounded-xl bg-sidebar-active text-sm font-semibold text-white hover:opacity-90"
                                    >
                                        Entrar
                                        <ArrowRight className="h-4 w-4" />
                                    </Link>
                                </li>
                            ))}
                        </ul>
                    </>
                )}
            </div>

            <Dialog open={createOpen} onOpenChange={setCreateOpen}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle>Nuevo deudor</DialogTitle>
                    </DialogHeader>
                    <form onSubmit={submitCreate} noValidate className="space-y-4">
                        <div>
                            <Label htmlFor="debtor-name" className="mb-1 block text-xs text-slate-500">
                                Nombre
                            </Label>
                            <Input
                                id="debtor-name"
                                value={form.data.name}
                                onChange={(e) => form.setData('name', e.target.value)}
                                placeholder="Ej. Cuenta casa"
                                autoFocus
                                className={cn(form.errors.name && 'border-rose-500')}
                            />
                            {form.errors.name && (
                                <p className="mt-1 text-xs text-rose-600">{form.errors.name}</p>
                            )}
                        </div>
                        <DialogFooter className="gap-2 sm:gap-0">
                            <button
                                type="button"
                                onClick={() => setCreateOpen(false)}
                                className="inline-flex h-10 items-center justify-center rounded-xl border border-slate-200 px-4 text-sm font-medium text-slate-700 dark:border-[#3a3a3a] dark:text-slate-200"
                            >
                                Cancelar
                            </button>
                            <button
                                type="submit"
                                disabled={form.processing}
                                className="inline-flex h-10 items-center justify-center rounded-xl bg-sidebar-active px-4 text-sm font-semibold text-white disabled:opacity-50"
                            >
                                {form.processing ? 'Guardando...' : 'Crear deudor'}
                            </button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>
        </AppLayout>
    );
}
