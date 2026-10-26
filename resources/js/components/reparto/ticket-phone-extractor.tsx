import { extractClientPhoneFromImage, formatTicketPhone } from '@/lib/extract-ticket-phone';
import { cn } from '@/lib/utils';
import { Check, Copy, ImageUp, LoaderCircle, Phone, X } from 'lucide-react';
import { useRef, useState } from 'react';
import { toast } from 'sonner';

type Props = {
    disabled?: boolean;
};

export function TicketPhoneExtractor({ disabled = false }: Props) {
    const inputRef = useRef<HTMLInputElement>(null);
    const [preview, setPreview] = useState<string | null>(null);
    const [phone, setPhone] = useState<string | null>(null);
    const [reading, setReading] = useState(false);
    const [copied, setCopied] = useState(false);

    const reset = () => {
        if (preview) {
            URL.revokeObjectURL(preview);
        }
        setPreview(null);
        setPhone(null);
        setCopied(false);
        if (inputRef.current) {
            inputRef.current.value = '';
        }
    };

    const copyPhone = async (value: string) => {
        try {
            await navigator.clipboard.writeText(value);
            setCopied(true);
            toast.success('Número copiado');
            window.setTimeout(() => setCopied(false), 1500);
        } catch {
            toast.error('No se pudo copiar el número');
        }
    };

    const handleFile = async (file: File | undefined) => {
        if (!file) {
            return;
        }

        if (!file.type.startsWith('image/')) {
            toast.error('Selecciona una imagen del ticket.');
            return;
        }

        setPreview(URL.createObjectURL(file));
        setPhone(null);
        setReading(true);

        try {
            const extracted = await extractClientPhoneFromImage(file);
            if (!extracted) {
                toast.error('No se encontró el número del cliente en la imagen.');
                return;
            }

            setPhone(extracted);
            toast.success('Número del cliente extraído');
        } catch {
            toast.error('No se pudo leer la imagen. Intenta con una foto más clara.');
        } finally {
            setReading(false);
        }
    };

    return (
        <div className="space-y-2">
            <p className="text-xs text-slate-500">Ticket del cliente (opcional)</p>

            <input
                ref={inputRef}
                type="file"
                accept="image/*"
                className="hidden"
                disabled={disabled || reading}
                onChange={(e) => {
                    void handleFile(e.target.files?.[0]);
                }}
            />

            <button
                type="button"
                disabled={disabled || reading}
                onClick={() => inputRef.current?.click()}
                className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-xl border border-dashed border-slate-300 bg-slate-50 px-3 text-sm font-medium text-slate-700 hover:bg-slate-100 disabled:opacity-50 dark:border-[#3a3a3a] dark:bg-[#1f1f1f] dark:text-slate-200 dark:hover:bg-[#2a2a2a]"
            >
                {reading ? (
                    <LoaderCircle className="h-4 w-4 animate-spin" />
                ) : (
                    <ImageUp className="h-4 w-4" />
                )}
                {reading ? 'Leyendo ticket…' : 'Cargar imagen'}
            </button>

            {preview && (
                <div className="relative overflow-hidden rounded-xl border border-slate-200 dark:border-[#3a3a3a]">
                    <img src={preview} alt="Ticket cargado" className="max-h-40 w-full object-contain bg-slate-50 dark:bg-[#1f1f1f]" />
                    <button
                        type="button"
                        onClick={reset}
                        className="absolute right-2 top-2 inline-flex h-8 w-8 items-center justify-center rounded-full bg-white/90 text-slate-600 shadow dark:bg-[#262626]/90 dark:text-slate-200"
                        aria-label="Quitar imagen"
                    >
                        <X className="h-4 w-4" />
                    </button>
                </div>
            )}

            {phone && (
                <div className="flex items-center justify-between gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2.5 dark:border-emerald-900 dark:bg-emerald-950/30">
                    <div className="min-w-0">
                        <p className="text-[10px] font-semibold uppercase tracking-wide text-emerald-700 dark:text-emerald-400">
                            Número del cliente
                        </p>
                        <p className="flex items-center gap-1.5 font-mono text-lg font-bold tabular-nums text-emerald-800 dark:text-emerald-300">
                            <Phone className="h-4 w-4" />
                            {formatTicketPhone(phone)}
                        </p>
                    </div>
                    <button
                        type="button"
                        onClick={() => void copyPhone(phone)}
                        className={cn(
                            'inline-flex h-9 shrink-0 items-center gap-1.5 rounded-lg px-3 text-xs font-semibold',
                            'border border-emerald-300 bg-white text-emerald-700 dark:border-emerald-800 dark:bg-[#1f1f1f] dark:text-emerald-300',
                        )}
                    >
                        {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                        Copiar
                    </button>
                </div>
            )}
        </div>
    );
}
