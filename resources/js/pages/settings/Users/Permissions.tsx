import AppLayout from '@/layouts/app-layout';
import SettingsSidebar from '@/pages/settings/components/SettingsSidebar';
import { Card } from '@/components/ui';
import { type BreadcrumbItem } from '@/types';
import { Head, Link, useForm, usePage } from '@inertiajs/react';
import { cn } from '@/lib/utils';
import { ArrowLeft, Shield } from 'lucide-react';
import { useEffect } from 'react';
import { toast } from 'sonner';

type PermissionRow = {
    label: string;
    mode: 'simple' | 'granular';
    can_view: boolean;
    can_edit?: boolean;
    can_create?: boolean;
    can_update?: boolean;
    can_delete?: boolean;
    can_payment?: boolean;
    can_liquidate?: boolean;
    action_labels?: Record<string, string>;
};

type PermissionsMatrix = Record<string, PermissionRow>;

type UserInfo = {
    id: number;
    name: string;
    email: string;
    role_label: string;
};

interface PermissionsPageProps {
    user: UserInfo;
    permissions: PermissionsMatrix;
    isAdminUser: boolean;
}

type FormPermissionRow = {
    can_view: boolean;
    can_edit?: boolean;
    can_create?: boolean;
    can_update?: boolean;
    can_delete?: boolean;
    can_payment?: boolean;
    can_liquidate?: boolean;
};

const GRANULAR_ACTIONS = [
    'create',
    'update',
    'delete',
    'payment',
    'liquidate',
] as const;

export default function UserPermissions({
    user,
    permissions,
    isAdminUser,
}: PermissionsPageProps) {
    const page = usePage();
    const flash = page.props.flash as { success?: string; error?: string } | undefined;

    const form = useForm({
        permissions: Object.fromEntries(
            Object.entries(permissions).map(([section, row]) => {
                if (row.mode === 'granular') {
                    return [
                        section,
                        {
                            can_view: row.can_view,
                            can_create: row.can_create ?? false,
                            can_update: row.can_update ?? false,
                            can_delete: row.can_delete ?? false,
                            can_payment: row.can_payment ?? false,
                            can_liquidate: row.can_liquidate ?? false,
                        },
                    ];
                }

                return [section, { can_view: row.can_view, can_edit: row.can_edit ?? false }];
            }),
        ) as Record<string, FormPermissionRow>,
    });

    useEffect(() => {
        if (flash?.success) toast.success(flash.success);
        if (flash?.error) toast.error(flash.error);
    }, [flash?.success, flash?.error]);

    const breadcrumbs: BreadcrumbItem[] = [
        { title: 'Configuración', href: '/settings' },
        { title: 'Usuarios', href: '/settings/users' },
        { title: user.name, href: `/settings/users/${user.id}/permisos` },
    ];

    const toggleView = (section: string) => {
        const current = form.data.permissions[section];
        const nextView = !current.can_view;

        if (permissions[section]?.mode === 'granular') {
            form.setData('permissions', {
                ...form.data.permissions,
                [section]: {
                    ...current,
                    can_view: nextView,
                    ...(nextView
                        ? {}
                        : {
                              can_create: false,
                              can_update: false,
                              can_delete: false,
                              can_payment: false,
                              can_liquidate: false,
                          }),
                },
            });
            return;
        }

        form.setData('permissions', {
            ...form.data.permissions,
            [section]: {
                can_view: nextView,
                can_edit: nextView ? (current.can_edit ?? false) : false,
            },
        });
    };

    const toggleEdit = (section: string) => {
        const current = form.data.permissions[section];
        const nextEdit = !(current.can_edit ?? false);
        form.setData('permissions', {
            ...form.data.permissions,
            [section]: {
                can_view: nextEdit ? true : current.can_view,
                can_edit: nextEdit,
            },
        });
    };

    const toggleGranular = (section: string, action: (typeof GRANULAR_ACTIONS)[number]) => {
        const current = form.data.permissions[section];
        const key = `can_${action}` as keyof FormPermissionRow;
        const next = !(current[key] as boolean);

        form.setData('permissions', {
            ...form.data.permissions,
            [section]: {
                ...current,
                [key]: next,
                can_view: next ? true : current.can_view,
            },
        });
    };

    const submit = (e: React.FormEvent) => {
        e.preventDefault();
        form.put(`/settings/users/${user.id}/permisos`, { preserveScroll: true });
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs} title="Permisos" sidebar={<SettingsSidebar />}>
            <Head title={`Permisos — ${user.name}`} />

            <Link
                href="/settings/users"
                className="mb-4 inline-flex items-center gap-1.5 text-sm text-slate-600 hover:text-sidebar-active dark:text-slate-400"
            >
                <ArrowLeft className="h-4 w-4" />
                Volver a usuarios
            </Link>

            <Card className="border border-slate-200/80 bg-white p-5 shadow-sm dark:border-[#2b2b2b] dark:bg-[#262626]">
                <div className="mb-6 flex items-start gap-3">
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-sidebar-active/10 text-sidebar-active">
                        <Shield className="h-5 w-5" />
                    </div>
                    <div>
                        <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
                            Permisos de {user.name}
                        </h2>
                        <p className="text-sm text-slate-500">
                            {user.email} · {user.role_label}
                        </p>
                    </div>
                </div>

                {isAdminUser ? (
                    <p className="rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-800 dark:border-blue-900 dark:bg-blue-950/40 dark:text-blue-200">
                        El administrador siempre tiene acceso completo a todas las secciones.
                    </p>
                ) : (
                    <form onSubmit={submit}>
                        <p className="mb-4 text-sm text-slate-500">
                            Las secciones normales usan <strong>Ver</strong> y <strong>Modificar</strong>.
                            Cuenta tarjeta permite permisos detallados por acción.
                        </p>

                        <div className="space-y-4">
                            {Object.entries(permissions).map(([section, row]) => {
                                const values = form.data.permissions[section];

                                if (row.mode === 'granular') {
                                    return (
                                        <div
                                            key={section}
                                            className="overflow-x-auto rounded-xl border border-slate-200 dark:border-[#3a3a3a]"
                                        >
                                            <div className="border-b border-slate-200 bg-slate-50 px-4 py-3 dark:border-[#3a3a3a] dark:bg-[#1f1f1f]">
                                                <p className="font-semibold text-slate-900 dark:text-white">
                                                    {row.label}
                                                </p>
                                                <p className="text-xs text-slate-500">
                                                    Permisos detallados por acción
                                                </p>
                                            </div>
                                            <table className="w-full min-w-[520px] text-sm">
                                                <thead>
                                                    <tr className="border-b border-slate-200 text-xs uppercase tracking-wide text-slate-500 dark:border-[#3a3a3a]">
                                                        <th className="px-4 py-2 text-left font-semibold">
                                                            Ver
                                                        </th>
                                                        {GRANULAR_ACTIONS.map((action) => (
                                                            <th
                                                                key={action}
                                                                className="px-4 py-2 text-center font-semibold"
                                                            >
                                                                {row.action_labels?.[action] ?? action}
                                                            </th>
                                                        ))}
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    <tr>
                                                        <td className="px-4 py-3">
                                                            <input
                                                                type="checkbox"
                                                                checked={values.can_view}
                                                                onChange={() => toggleView(section)}
                                                                className="h-4 w-4 rounded border-slate-300 text-sidebar-active focus:ring-sidebar-active"
                                                            />
                                                        </td>
                                                        {GRANULAR_ACTIONS.map((action) => {
                                                            const key =
                                                                `can_${action}` as keyof FormPermissionRow;

                                                            return (
                                                                <td
                                                                    key={action}
                                                                    className="px-4 py-3 text-center"
                                                                >
                                                                    <input
                                                                        type="checkbox"
                                                                        checked={Boolean(values[key])}
                                                                        onChange={() =>
                                                                            toggleGranular(
                                                                                section,
                                                                                action,
                                                                            )
                                                                        }
                                                                        className="h-4 w-4 rounded border-slate-300 text-sidebar-active focus:ring-sidebar-active"
                                                                    />
                                                                </td>
                                                            );
                                                        })}
                                                    </tr>
                                                </tbody>
                                            </table>
                                        </div>
                                    );
                                }

                                return (
                                    <div
                                        key={section}
                                        className="flex items-center justify-between rounded-xl border border-slate-200 px-4 py-3 dark:border-[#3a3a3a]"
                                    >
                                        <span className="font-medium text-slate-900 dark:text-white">
                                            {row.label}
                                        </span>
                                        <div className="flex items-center gap-6">
                                            <label className="flex items-center gap-2 text-sm text-slate-600">
                                                <input
                                                    type="checkbox"
                                                    checked={values.can_view}
                                                    onChange={() => toggleView(section)}
                                                    className="h-4 w-4 rounded border-slate-300 text-sidebar-active focus:ring-sidebar-active"
                                                />
                                                Ver
                                            </label>
                                            <label className="flex items-center gap-2 text-sm text-slate-600">
                                                <input
                                                    type="checkbox"
                                                    checked={values.can_edit ?? false}
                                                    onChange={() => toggleEdit(section)}
                                                    className="h-4 w-4 rounded border-slate-300 text-sidebar-active focus:ring-sidebar-active"
                                                />
                                                Modificar
                                            </label>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>

                        <button
                            type="submit"
                            disabled={form.processing}
                            className={cn(
                                'mt-5 inline-flex h-10 items-center justify-center rounded-xl bg-sidebar-active px-6 text-sm font-semibold text-white disabled:opacity-50',
                            )}
                        >
                            {form.processing ? 'Guardando...' : 'Guardar permisos'}
                        </button>
                    </form>
                )}
            </Card>
        </AppLayout>
    );
}
