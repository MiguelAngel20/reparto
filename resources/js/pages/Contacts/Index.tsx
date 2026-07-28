import AppLayout from '@/layouts/app-layout';
import { ContactListRow, type ContactListItemData } from '@/components/contacts/ContactListRow';
import {
    Dialog,
    DialogContent,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import ImageUpload from '@/components/ui/ImageUpload';
import Button from '@/components/ui/Button';
import { useSectionAccess } from '@/hooks/useSectionAccess';
import { type BreadcrumbItem } from '@/types';
import { Head, router, useForm, usePage } from '@inertiajs/react';
import { Check, ContactRound, Plus, Search, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';

type ContactRow = ContactListItemData & {
    address: string | null;
    maps_url: string | null;
    created_by_name: string | null;
    created_at: string | null;
};

interface ContactsIndexProps {
    contacts: ContactRow[];
    search: string;
}

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Dashboard', href: '/dashboard' },
    { title: 'Contactos', href: '/contactos' },
];

export default function ContactsIndex({ contacts, search: initialSearch }: ContactsIndexProps) {
    const { canCreate } = useSectionAccess('contacts');
    const page = usePage();
    const flash = page.props.flash as { success?: string; error?: string } | undefined;

    const [search, setSearch] = useState(initialSearch);
    const [modalOpen, setModalOpen] = useState(false);
    const [imageFile, setImageFile] = useState<File | null>(null);

    const form = useForm({
        name: '',
        phone: '',
        address: '',
        maps_url: '',
    });

    useEffect(() => {
        if (flash?.success) toast.success(flash.success);
        if (flash?.error) toast.error(flash.error);
    }, [flash?.success, flash?.error]);

    useEffect(() => {
        setSearch(initialSearch);
    }, [initialSearch]);

    const applySearch = (value: string) => {
        setSearch(value);
        router.get(
            '/contactos',
            value.trim() ? { q: value.trim() } : {},
            { preserveScroll: true, preserveState: true, replace: true },
        );
    };

    const submitContact = (e: React.FormEvent) => {
        e.preventDefault();

        const payload = new FormData();
        payload.append('name', form.data.name);
        payload.append('phone', form.data.phone);
        if (form.data.address.trim()) payload.append('address', form.data.address.trim());
        if (form.data.maps_url.trim()) payload.append('maps_url', form.data.maps_url.trim());
        if (imageFile) payload.append('image', imageFile);

        router.post('/contactos', payload, {
            preserveScroll: true,
            forceFormData: true,
            onSuccess: () => {
                form.reset();
                setImageFile(null);
                setModalOpen(false);
            },
            onError: (errors) => {
                Object.values(errors).forEach((msg) => {
                    if (typeof msg === 'string') toast.error(msg);
                });
            },
        });
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs} title="Contactos" fullWidth>
            <Head title="Contactos" />

            <div className="w-full space-y-4 pb-24 sm:pb-6">
                <div className="flex items-start justify-between gap-3">
                    <div>
                        <h1 className="flex items-center gap-2 text-xl font-bold text-slate-900 dark:text-white sm:text-2xl">
                            <ContactRound className="h-6 w-6 text-sidebar-active" />
                            Contactos
                        </h1>
                    </div>
                    {canCreate ? (
                        <Button
                            type="button"
                            leftIcon={<Plus className="h-4 w-4" />}
                            onClick={() => setModalOpen(true)}
                            className="shrink-0"
                        >
                            <span className="hidden sm:inline">Nuevo</span>
                        </Button>
                    ) : null}
                </div>

                <div className="relative">
                    <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                    <Input
                        value={search}
                        onChange={(e) => applySearch(e.target.value)}
                        placeholder="Buscar por nombre, teléfono o dirección…"
                        className="pl-9"
                    />
                </div>

                <div className="rounded-xl border border-slate-200/80 bg-white px-0 shadow-sm dark:border-[#2b2b2b] dark:bg-[#262626]">
                    {contacts.length === 0 ? (
                        <p className="py-10 text-center text-sm text-slate-500 dark:text-slate-400">
                            {search.trim()
                                ? 'No hay contactos con ese criterio.'
                                : 'Aún no hay contactos. Agrega el primero con el botón Nuevo.'}
                        </p>
                    ) : (
                        contacts.map((contact) => <ContactListRow key={contact.id} contact={contact} />)
                    )}
                </div>
            </div>

            <Dialog open={modalOpen} onOpenChange={setModalOpen}>
                <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle>Nuevo contacto</DialogTitle>
                    </DialogHeader>
                    <form onSubmit={submitContact} className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="contact-name">Restaurante o nombre</Label>
                            <Input
                                id="contact-name"
                                value={form.data.name}
                                onChange={(e) => form.setData('name', e.target.value)}
                                placeholder="Restaurante o nombre"
                                required
                                autoFocus
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="contact-phone">Teléfono</Label>
                            <Input
                                id="contact-phone"
                                type="tel"
                                inputMode="tel"
                                value={form.data.phone}
                                onChange={(e) => form.setData('phone', e.target.value)}
                                placeholder="963 123 4568"
                                required
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="contact-address">Dirección (opcional)</Label>
                            <Input
                                id="contact-address"
                                value={form.data.address}
                                onChange={(e) => form.setData('address', e.target.value)}
                                placeholder="Calle, número, ciudad, etc."
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="contact-maps">URL de Google Maps (opcional)</Label>
                            <Input
                                id="contact-maps"
                                type="url"
                                value={form.data.maps_url}
                                onChange={(e) => form.setData('maps_url', e.target.value)}
                                placeholder="https://maps.google.com/..."
                            />
                        </div>
                        <ImageUpload
                            label="Imagen (opcional)"
                            description="Logo o foto del restaurante"
                            onChange={(file) => setImageFile(file)}
                        />
                        <DialogFooter className="gap-2 sm:gap-0">
                            <Button
                                type="button"
                                variant="danger"
                                leftIcon={<X className="h-4 w-4" />}
                                onClick={() => setModalOpen(false)}
                            >
                                Cancelar
                            </Button>
                            <Button
                                type="submit"
                                variant="info"
                                leftIcon={<Check className="h-4 w-4" />}
                                loading={form.processing}
                            >
                                Agregar
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>
        </AppLayout>
    );
}
