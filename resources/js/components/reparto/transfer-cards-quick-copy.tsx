import { Link } from '@inertiajs/react';
import { Check, Copy, CreditCard } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';
import type { TransferCardData } from '@/pages/settings/Profile/components/TransferCardsList';

type Props = {
    cards: TransferCardData[];
    className?: string;
};

async function copyText(value: string, successMessage: string) {
    try {
        await navigator.clipboard.writeText(value);
        toast.success(successMessage);
        return true;
    } catch {
        toast.error('No se pudo copiar');
        return false;
    }
}

function buildFullCopyText(card: TransferCardData): string {
    const lines = [
        `Banco: ${card.bank_name}`,
        `Titular: ${card.holder_name}`,
    ];

    if (card.card_number) {
        lines.push(`Tarjeta: ${card.card_number}`);
    }
    if (card.clabe) {
        lines.push(`CLABE: ${card.clabe}`);
    }

    return lines.join('\n');
}

function CopyFieldButton({
    value,
    label,
}: {
    value: string;
    label: string;
}) {
    const [copied, setCopied] = useState(false);

    const handleCopy = async () => {
        const ok = await copyText(value, `${label} copiado`);
        if (!ok) return;
        setCopied(true);
        window.setTimeout(() => setCopied(false), 1500);
    };

    return (
        <button
            type="button"
            onClick={handleCopy}
            className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100 hover:text-sidebar-active dark:hover:bg-[#333]"
            title={`Copiar ${label.toLowerCase()}`}
            aria-label={`Copiar ${label.toLowerCase()}`}
        >
            {copied ? (
                <Check className="h-3.5 w-3.5 text-emerald-600" />
            ) : (
                <Copy className="h-3.5 w-3.5" />
            )}
        </button>
    );
}

function TransferCardQuickItem({ card }: { card: TransferCardData }) {
    const [copiedAll, setCopiedAll] = useState(false);

    const handleCopyAll = async () => {
        const ok = await copyText(buildFullCopyText(card), 'Datos de transferencia copiados');
        if (!ok) return;
        setCopiedAll(true);
        window.setTimeout(() => setCopiedAll(false), 1500);
    };

    return (
        <li className="rounded-xl border border-slate-200 bg-slate-50/50 p-3 dark:border-[#3a3a3a] dark:bg-[#1f1f1f]/40">
            <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-slate-900 dark:text-white">
                        {card.bank_name}
                    </p>
                    <p className="truncate text-xs text-slate-500 dark:text-slate-400">
                        {card.holder_name}
                    </p>
                </div>
                <button
                    type="button"
                    onClick={handleCopyAll}
                    className="inline-flex h-8 shrink-0 items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 dark:border-[#3a3a3a] dark:bg-[#262626] dark:text-slate-200 dark:hover:bg-[#2a2a2a]"
                >
                    {copiedAll ? (
                        <Check className="h-3.5 w-3.5 text-emerald-600" />
                    ) : (
                        <Copy className="h-3.5 w-3.5" />
                    )}
                    Copiar todo
                </button>
            </div>

            <div className="mt-2 space-y-1.5">
                <div className="flex items-center gap-1">
                    <p className="min-w-0 flex-1 truncate text-xs text-slate-600 dark:text-slate-300">
                        <span className="font-medium text-slate-500 dark:text-slate-400">
                            Banco:{' '}
                        </span>
                        {card.bank_name}
                    </p>
                    <CopyFieldButton value={card.bank_name} label="Banco" />
                </div>
                <div className="flex items-center gap-1">
                    <p className="min-w-0 flex-1 truncate text-xs text-slate-600 dark:text-slate-300">
                        <span className="font-medium text-slate-500 dark:text-slate-400">
                            Titular:{' '}
                        </span>
                        {card.holder_name}
                    </p>
                    <CopyFieldButton value={card.holder_name} label="Titular" />
                </div>
                {card.card_number ? (
                    <div className="flex items-center gap-1">
                        <p className="min-w-0 flex-1 truncate font-mono text-xs tabular-nums text-slate-700 dark:text-slate-200">
                            <span className="font-sans font-medium text-slate-500 dark:text-slate-400">
                                Tarjeta:{' '}
                            </span>
                            {card.card_number_formatted ?? card.card_number}
                        </p>
                        <CopyFieldButton value={card.card_number} label="Número de tarjeta" />
                    </div>
                ) : null}
                {card.clabe ? (
                    <div className="flex items-center gap-1">
                        <p className="min-w-0 flex-1 truncate font-mono text-xs tabular-nums text-slate-700 dark:text-slate-200">
                            <span className="font-sans font-medium text-slate-500 dark:text-slate-400">
                                CLABE:{' '}
                            </span>
                            {card.clabe_formatted ?? card.clabe}
                        </p>
                        <CopyFieldButton value={card.clabe} label="CLABE" />
                    </div>
                ) : null}
            </div>
        </li>
    );
}

export function TransferCardsQuickCopy({ cards, className }: Props) {
    return (
        <div className={className}>
            <div className="mb-3 flex items-center justify-between gap-2">
                <h3 className="flex items-center gap-2 text-sm font-semibold text-slate-900 dark:text-white">
                    <CreditCard className="h-4 w-4 text-sidebar-active" />
                    Mis tarjetas
                </h3>
                <Link
                    href="/settings/profile"
                    className="text-xs font-medium text-sidebar-active hover:underline"
                >
                    Administrar
                </Link>
            </div>

            {cards.length === 0 ? (
                <p className="text-sm text-slate-500 dark:text-slate-400">
                    No tienes tarjetas guardadas.{' '}
                    <Link href="/settings/profile" className="font-medium text-sidebar-active hover:underline">
                        Agregar en mi perfil
                    </Link>
                </p>
            ) : (
                <ul className="space-y-2">
                    {cards.map((card) => (
                        <TransferCardQuickItem key={card.id} card={card} />
                    ))}
                </ul>
            )}
        </div>
    );
}
