import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';
import { Link } from '@inertiajs/react';
import { MessageCircle, Phone } from 'lucide-react';

export type ContactListItemData = {
    id: number;
    name: string;
    initials: string;
    phone: string;
    tel_href: string | null;
    whatsapp_href: string | null;
    image_url: string | null;
};

type Props = {
    contact: ContactListItemData;
    className?: string;
};

export function ContactListRow({ contact, className }: Props) {
    return (
        <div
            className={cn(
                'flex items-center gap-2 border-b border-slate-100 px-[5px] py-2 last:border-b-0 dark:border-[#2b2b2b]',
                className,
            )}
        >
            <Link
                href={`/contactos/${contact.id}`}
                className="flex min-w-0 flex-1 items-center gap-2"
            >
                <Avatar className="h-9 w-9 shrink-0 border border-slate-200 dark:border-[#343434]">
                    {contact.image_url ? (
                        <AvatarImage src={contact.image_url} alt={contact.name} className="object-cover" />
                    ) : null}
                    <AvatarFallback className="bg-sidebar-active text-[10px] font-bold text-white">
                        {contact.initials}
                    </AvatarFallback>
                </Avatar>
                <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold leading-tight text-slate-900 dark:text-white">
                        {contact.name}
                    </p>
                    <p className="truncate text-xs text-slate-500 dark:text-slate-400">{contact.phone}</p>
                </div>
            </Link>

            <div className="flex shrink-0 items-center gap-1">
                {contact.tel_href ? (
                    <a
                        href={contact.tel_href}
                        className="flex h-8 w-8 items-center justify-center rounded-full text-sidebar-active hover:bg-slate-100 dark:hover:bg-white/10"
                        aria-label={`Llamar a ${contact.name}`}
                        onClick={(e) => e.stopPropagation()}
                    >
                        <Phone className="h-4 w-4" />
                    </a>
                ) : null}
                {contact.whatsapp_href ? (
                    <a
                        href={contact.whatsapp_href}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex h-8 w-8 items-center justify-center rounded-full text-emerald-600 hover:bg-emerald-50 dark:text-emerald-400 dark:hover:bg-emerald-950/40"
                        aria-label={`WhatsApp ${contact.name}`}
                        onClick={(e) => e.stopPropagation()}
                    >
                        <MessageCircle className="h-4 w-4" />
                    </a>
                ) : null}
            </div>
        </div>
    );
}
