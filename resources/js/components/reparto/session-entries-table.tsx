import { formatCurrency } from '@/lib/utils';
import { Pencil, Trash2 } from 'lucide-react';

export type SessionEntryRow = {
    id: number;
    name: string;
    service_cost: number;
    user_commission: number;
    clikio_commission: number;
    user_extra: number;
    clikio_extra: number;
    clikio_discounts: number;
};

export type SessionEntryTotals = {
    service_cost: number;
    user_commission: number;
    clikio_commission: number;
    user_extra: number;
    clikio_extra: number;
    clikio_discounts: number;
};

type SessionEntriesTableProps = {
    entries: SessionEntryRow[];
    tableTotals: SessionEntryTotals;
    companyName: string;
    onEdit?: (row: SessionEntryRow) => void;
    onDelete?: (id: number) => void;
};

export function SessionEntriesTable({
    entries,
    tableTotals,
    companyName,
    onEdit,
    onDelete,
}: SessionEntriesTableProps) {
    const showActions = Boolean(onEdit);

    return (
        <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-[#3a3a3a]">
            <table className="w-full min-w-[720px] text-left text-sm">
                <thead>
                    <tr className="bg-slate-50 text-xs uppercase text-slate-500 dark:bg-[#1f1f1f]">
                        <th className="px-3 py-2">Nombre</th>
                        <th className="px-3 py-2 text-right">Monto</th>
                        <th className="px-3 py-2 text-right">Mi gan.</th>
                        <th className="px-3 py-2 text-right">{companyName}</th>
                        <th className="px-3 py-2 text-right">Extra</th>
                        <th className="px-3 py-2 text-right">Extra {companyName}</th>
                        <th className="px-3 py-2 text-right">Desc.</th>
                        {showActions && <th className="px-3 py-2" />}
                    </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-[#333]">
                    {entries.map((row, index) => (
                        <tr key={row.id}>
                            <td className="px-3 py-2">
                                <span className="mr-1 text-slate-400">{index + 1}.</span>
                                {row.name}
                            </td>
                            <td className="px-3 py-2 text-right font-medium">
                                ${formatCurrency(row.service_cost)}
                            </td>
                            <td className="px-3 py-2 text-right text-emerald-600">
                                ${formatCurrency(row.user_commission)}
                            </td>
                            <td className="px-3 py-2 text-right text-blue-600">
                                ${formatCurrency(row.clikio_commission)}
                            </td>
                            <td className="px-3 py-2 text-right">
                                {row.user_extra > 0
                                    ? `$${formatCurrency(row.user_extra)}`
                                    : '—'}
                            </td>
                            <td className="px-3 py-2 text-right">
                                {row.clikio_extra > 0
                                    ? `$${formatCurrency(row.clikio_extra)}`
                                    : '—'}
                            </td>
                            <td className="px-3 py-2 text-right text-amber-600">
                                {row.clikio_discounts > 0
                                    ? `$${formatCurrency(row.clikio_discounts)}`
                                    : '—'}
                            </td>
                            {showActions && onEdit && (
                                <td className="px-3 py-2">
                                    <div className="flex justify-end gap-1">
                                        <button
                                            type="button"
                                            onClick={() => onEdit(row)}
                                            className="rounded p-1.5 text-slate-500 hover:bg-slate-100 dark:hover:bg-[#333]"
                                            title="Editar pedido"
                                        >
                                            <Pencil className="h-4 w-4" />
                                        </button>
                                        {onDelete && (
                                            <button
                                                type="button"
                                                onClick={() => onDelete(row.id)}
                                                className="rounded p-1.5 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/30"
                                                title="Eliminar pedido"
                                            >
                                                <Trash2 className="h-4 w-4" />
                                            </button>
                                        )}
                                    </div>
                                </td>
                            )}
                        </tr>
                    ))}
                </tbody>
                <tfoot>
                    <tr className="bg-slate-50 font-semibold dark:bg-[#1f1f1f]">
                        <td className="px-3 py-2">Total</td>
                        <td className="px-3 py-2 text-right">
                            ${formatCurrency(tableTotals.service_cost)}
                        </td>
                        <td className="px-3 py-2 text-right text-emerald-600">
                            ${formatCurrency(tableTotals.user_commission)}
                        </td>
                        <td className="px-3 py-2 text-right text-blue-600">
                            ${formatCurrency(tableTotals.clikio_commission)}
                        </td>
                        <td className="px-3 py-2 text-right">
                            ${formatCurrency(tableTotals.user_extra)}
                        </td>
                        <td className="px-3 py-2 text-right">
                            ${formatCurrency(tableTotals.clikio_extra)}
                        </td>
                        <td className="px-3 py-2 text-right text-amber-600">
                            ${formatCurrency(tableTotals.clikio_discounts)}
                        </td>
                        {showActions && <td />}
                    </tr>
                </tfoot>
            </table>
        </div>
    );
}
