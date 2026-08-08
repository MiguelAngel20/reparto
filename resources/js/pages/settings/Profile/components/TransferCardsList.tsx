import Button from '@/components/ui/Button';
import { router } from '@inertiajs/react';
import { CreditCard, Pencil, Trash2 } from 'lucide-react';
import { useState } from 'react';

export type TransferCardData = {
    id: number;
    holder_name: string;
    card_number: string | null;
    card_number_formatted: string | null;
    clabe: string | null;
    clabe_formatted: string | null;
    bank_name: string;
    created_at: string | null;
};

type Props = {
    cards: TransferCardData[];
    onEdit: (card: TransferCardData) => void;
};

export default function TransferCardsList({ cards, onEdit }: Props) {
    const [deletingId, setDeletingId] = useState<number | null>(null);

    const removeCard = (card: TransferCardData) => {
        if (
            !window.confirm(
                `¿Eliminar la tarjeta ${card.bank_name} de ${card.holder_name}?`,
            )
        ) {
            return;
        }

        setDeletingId(card.id);
        router.delete(`/settings/profile/transfer-cards/${card.id}`, {
            preserveScroll: true,
            onFinish: () => setDeletingId(null),
        });
    };

    if (cards.length === 0) {
        return (
            <p className="rounded-xl border border-dashed border-slate-200 px-4 py-6 text-center text-sm text-slate-500 dark:border-[#3a3a3a] dark:text-slate-400">
                No tienes tarjetas guardadas. Usa «Agregar tarjeta» para tener a la mano los
                datos de transferencia.
            </p>
        );
    }

    return (
        <ul className="space-y-3">
            {cards.map((card) => (
                <li
                    key={card.id}
                    className="rounded-xl border border-slate-200 bg-slate-50/60 p-4 dark:border-[#3a3a3a] dark:bg-[#1f1f1f]/50"
                >
                    <div className="flex items-start justify-between gap-3">
                        <div className="flex min-w-0 items-start gap-3">
                            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-sidebar-active/10 text-sidebar-active">
                                <CreditCard className="h-5 w-5" />
                            </div>
                            <div className="min-w-0">
                                <p className="truncate text-sm font-semibold text-slate-900 dark:text-white">
                                    {card.bank_name}
                                </p>
                                <p className="mt-0.5 text-xs font-medium text-slate-500 dark:text-slate-400">
                                    {card.holder_name}
                                </p>
                            </div>
                        </div>
                        <div className="flex shrink-0 items-center gap-1">
                            <Button
                                type="button"
                                variant="outline"
                                size="icon"
                                className="rounded-lg"
                                onClick={() => onEdit(card)}
                                aria-label={`Editar tarjeta ${card.bank_name}`}
                            >
                                <Pencil className="h-4 w-4 text-slate-600 dark:text-slate-300" />
                            </Button>
                            <Button
                                type="button"
                                variant="outline"
                                size="icon"
                                className="rounded-lg"
                                disabled={deletingId === card.id}
                                onClick={() => removeCard(card)}
                                aria-label={`Eliminar tarjeta ${card.bank_name}`}
                            >
                                <Trash2 className="h-4 w-4 text-rose-600 dark:text-rose-400" />
                            </Button>
                        </div>
                    </div>

                    <dl className="mt-3 grid gap-2 text-xs sm:grid-cols-2">
                        {card.card_number_formatted ? (
                            <div>
                                <dt className="font-medium text-slate-500 dark:text-slate-400">
                                    Número de tarjeta
                                </dt>
                                <dd className="mt-0.5 font-mono text-sm tabular-nums text-slate-800 dark:text-slate-100">
                                    {card.card_number_formatted}
                                </dd>
                            </div>
                        ) : null}
                        {card.clabe_formatted ? (
                            <div>
                                <dt className="font-medium text-slate-500 dark:text-slate-400">
                                    CLABE
                                </dt>
                                <dd className="mt-0.5 font-mono text-sm tabular-nums text-slate-800 dark:text-slate-100">
                                    {card.clabe_formatted}
                                </dd>
                            </div>
                        ) : null}
                    </dl>
                </li>
            ))}
        </ul>
    );
}
