import AppLayout from '@/layouts/app-layout';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
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
import { confirmAction } from '@/lib/sweetalert';
import { useSectionAccess } from '@/hooks/useSectionAccess';
import { type BreadcrumbItem } from '@/types';
import { Head, Link, router, useForm, usePage } from '@inertiajs/react';
import {
    ArrowLeft,
    ExternalLink,
    MapPin,
    MessageCircle,
    Pencil,
    Phone,
    Trash2,
    UserRound,
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';

type ContactDetail = {
    id: number;
    name: string;
    initials: string;
    phone: string;
    tel_href: string | null;
    whatsapp_href: string | null;
    address: string | null;
    maps_url: string | null;
    image_url: string | null;
    created_by_name: string | null;
    created_at: string | null;
};

interface ContactsShowProps {
    contact: ContactDetail;
}

export default function ContactsShow({ contact }: ContactsShowProps) {
    const { canUpdate, canDelete } = useSectionAccess('contacts');
    const page = usePage();
    const flash = page.props.flash as { success?: string; error?: string } | undefined;

    const [editOpen, setEditOpen] = useState(false);
    const [imageFile, setImageFile] = useState<File | null>(null);
    const [removeImage, setRemoveImage] = useState(false);

    const editForm = useForm({
        name: contact.name,
        phone: contact.phone,
        address: contact.address ?? '',
        maps_url: contact.maps_url ?? '',
    });

    const breadcrumbs: BreadcrumbItem[] = [
        { title: 'Dashboard', href: '/dashboard' },
        { title: 'Contactos', href: '/contactos' },
        { title: contact.name, href: `/contactos/${contact.id}` },
    ];

    useEffect(() => {
        if (flash?.success) toast.success(flash.success);
        if (flash?.error) toast.error(flash.error);
    }, [flash?.success, flash?.error]);

    const openEdit = () => {
        editForm.setData({
            name: contact.name,
            phone: contact.phone,
            address: contact.address ?? '',
            maps_url: contact.maps_url ?? '',
        });
        setImageFile(null);
        setRemoveImage(false);
        setEditOpen(true);
    };

    const submitEdit = (e: React.FormEvent) => {
        e.preventDefault();

        const payload = new FormData();
        payload.append('_method', 'put');
        payload.append('name', editForm.data.name);
        payload.append('phone', editForm.data.phone);
        payload.append('address', editForm.data.address);
        payload.append('maps_url', editForm.data.maps_url);
        if (removeImage) payload.append('remove_image', '1');
        if (imageFile) payload.append('image', imageFile);

        router.post(`/contactos/${contact.id}`, payload, {
            preserveScroll: true,
            forceFormData: true,
            onSuccess: () => setEditOpen(false),
            onError: (errors) => {
                Object.values(errors).forEach((msg) => {
                    if (typeof msg === 'string') toast.error(msg);
                });
            },
        });
    };

    const deleteContact = async () => {
        const confirmed = await confirmAction({
            title: '¿Eliminar contacto?',
            text: contact.name,
            confirmText: 'Sí, eliminar',
            icon: 'warning',
        });

        if (!confirmed) return;

        router.delete(`/contactos/${contact.id}`);
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs} title={contact.name} fullWidth>
            <Head title={contact.name} />

            <div className="w-full space-y-6 pb-24 sm:pb-8">
                <Link
                    href="/contactos"
                    className="inline-flex items-center gap-2 text-sm font-medium text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
                >
                    <ArrowLeft className="h-4 w-4" />
                    Volver a contactos
                </Link>

                <div className="flex flex-col items-center text-center">
                    <Avatar className="h-24 w-24 border-2 border-slate-200 dark:border-[#343434]">
                        {contact.image_url && !removeImage ? (
                            <AvatarImage src={contact.image_url} alt={contact.name} className="object-cover" />
                        ) : null}
                        <AvatarFallback className="bg-sidebar-active text-2xl font-bold text-white">
                            {contact.initials}
                        </AvatarFallback>
                    </Avatar>
                    <h1 className="mt-4 text-2xl font-bold text-slate-900 dark:text-white">{contact.name}</h1>
                    <p className="mt-1 text-lg text-slate-600 dark:text-slate-300">{contact.phone}</p>

                    <div className="mt-5 flex flex-wrap items-center justify-center gap-3">
                        {contact.tel_href ? (
                            <Button asChild variant="outline" leftIcon={<Phone className="h-4 w-4" />}>
                                <a href={contact.tel_href}>Llamar</a>
                            </Button>
                        ) : null}
                        {contact.whatsapp_href ? (
                            <Button
                                asChild
                                variant="outline"
                                className="border-emerald-200 text-emerald-700 dark:border-emerald-800 dark:text-emerald-400"
                                leftIcon={<MessageCircle className="h-4 w-4" />}
                            >
                                <a href={contact.whatsapp_href} target="_blank" rel="noopener noreferrer">
                                    WhatsApp
                                </a>
                            </Button>
                        ) : null}
                    </div>
                </div>

                <div className="space-y-4 rounded-xl border border-slate-200/80 bg-white p-5 shadow-sm dark:border-[#2b2b2b] dark:bg-[#262626]">
                    {contact.address ? (
                        <div className="flex gap-3">
                            <MapPin className="mt-0.5 h-5 w-5 shrink-0 text-slate-400" />
                            <div>
                                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Dirección</p>
                                <p className="mt-1 text-slate-900 dark:text-white">{contact.address}</p>
                            </div>
                        </div>
                    ) : null}

                    {contact.maps_url ? (
                        <div className="flex gap-3">
                            <ExternalLink className="mt-0.5 h-5 w-5 shrink-0 text-slate-400" />
                            <div className="min-w-0">
                                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Ubicación en Maps</p>
                                <a
                                    href={contact.maps_url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="mt-1 block break-all text-sidebar-active underline-offset-2 hover:underline"
                                >
                                    {contact.maps_url}
                                </a>
                            </div>
                        </div>
                    ) : null}

                    {contact.created_by_name ? (
                        <div className="flex gap-3 border-t border-slate-100 pt-4 dark:border-[#333]">
                            <UserRound className="mt-0.5 h-5 w-5 shrink-0 text-slate-400" />
                            <div>
                                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Registrado por</p>
                                <p className="mt-1 text-slate-900 dark:text-white">
                                    {contact.created_by_name}
                                    {contact.created_at ? (
                                        <span className="text-slate-500 dark:text-slate-400"> · {contact.created_at}</span>
                                    ) : null}
                                </p>
                            </div>
                        </div>
                    ) : null}
                </div>

                {(canUpdate || canDelete) && (
                    <div className="flex flex-wrap gap-2">
                        {canUpdate ? (
                            <Button type="button" variant="outline" leftIcon={<Pencil className="h-4 w-4" />} onClick={openEdit}>
                                Editar
                            </Button>
                        ) : null}
                        {canDelete ? (
                            <Button
                                type="button"
                                variant="danger"
                                leftIcon={<Trash2 className="h-4 w-4" />}
                                onClick={deleteContact}
                            >
                                Eliminar
                            </Button>
                        ) : null}
                    </div>
                )}
            </div>

            <Dialog open={editOpen} onOpenChange={setEditOpen}>
                <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle>Editar contacto</DialogTitle>
                    </DialogHeader>
                    <form onSubmit={submitEdit} className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="edit-name">Restaurante o nombre</Label>
                            <Input
                                id="edit-name"
                                value={editForm.data.name}
                                onChange={(e) => editForm.setData('name', e.target.value)}
                                required
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="edit-phone">Teléfono</Label>
                            <Input
                                id="edit-phone"
                                type="tel"
                                value={editForm.data.phone}
                                onChange={(e) => editForm.setData('phone', e.target.value)}
                                required
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="edit-address">Dirección (opcional)</Label>
                            <Input
                                id="edit-address"
                                value={editForm.data.address}
                                onChange={(e) => editForm.setData('address', e.target.value)}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="edit-maps">URL de Google Maps (opcional)</Label>
                            <Input
                                id="edit-maps"
                                type="url"
                                value={editForm.data.maps_url}
                                onChange={(e) => editForm.setData('maps_url', e.target.value)}
                            />
                        </div>
                        <ImageUpload
                            label="Imagen (opcional)"
                            value={removeImage ? null : contact.image_url}
                            onChange={(file) => {
                                setImageFile(file);
                                if (file) setRemoveImage(false);
                                if (file === null && contact.image_url) setRemoveImage(true);
                            }}
                        />
                        <DialogFooter className="gap-2 sm:gap-0">
                            <Button type="button" variant="outline" onClick={() => setEditOpen(false)}>
                                Cancelar
                            </Button>
                            <Button type="submit" loading={editForm.processing}>
                                Guardar cambios
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>
        </AppLayout>
    );
}
