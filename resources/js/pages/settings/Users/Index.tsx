import AppLayout from '@/layouts/app-layout';
import SettingsSidebar from '@/pages/settings/components/SettingsSidebar';
import { type BreadcrumbItem } from '@/types';
import { Head, router } from '@inertiajs/react';
import { Badge, Card, DataTable, SearchBar } from '@/components/ui';
import type { ColumnDef } from '@/components/ui/DataTable';
import { useCallback, useState } from 'react';
import { formatCurrency } from '@/lib/utils';

type UserRow = {
    id: number;
    name: string;
    email: string;
    company_name: string | null;
    percentage: number;
    role: string;
    role_label: string;
    created_at: string;
};

type PaginatedUsers = {
    data: UserRow[];
    current_page: number;
    last_page: number;
    per_page: number;
    total: number;
    links: { url: string | null; label: string; active: boolean }[];
};

interface UsersPageProps {
    users: PaginatedUsers;
    filters: { search: string };
}

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Configuración', href: '/settings' },
    { title: 'Usuarios', href: '/settings/users' },
];

const roleBadgeVariant = (role: string): 'blue' | 'green' | 'gray' => {
    if (role === 'admin') return 'blue';
    if (role === 'repartidor') return 'green';
    return 'gray';
};

export default function UsersIndex({ users, filters }: UsersPageProps) {
    const [query, setQuery] = useState(filters.search ?? '');

    const handleSearch = useCallback((search: string) => {
        setQuery(search);
        router.get(
            '/settings/users',
            { search },
            { preserveState: true, preserveScroll: true, replace: true },
        );
    }, []);

    const columns: ColumnDef<UserRow>[] = [
        { key: 'name', label: 'Nombre' },
        { key: 'email', label: 'Correo' },
        {
            key: 'company_name',
            label: 'Empresa',
            render: (row) => row.company_name ?? '—',
        },
        {
            key: 'percentage',
            label: 'Porcentaje',
            render: (row) => `${formatCurrency(row.percentage)}%`,
        },
        {
            key: 'role',
            label: 'Rol',
            render: (row) => (
                <Badge variant={roleBadgeVariant(row.role)}>{row.role_label}</Badge>
            ),
        },
        { key: 'created_at', label: 'Registro' },
    ];

    return (
        <AppLayout breadcrumbs={breadcrumbs} title="Usuarios" sidebar={<SettingsSidebar />}>
            <Head title="Usuarios" />

            <Card className="border border-slate-200/80 bg-white p-5 shadow-sm dark:border-[#2b2b2b] dark:bg-[#262626]">
                <div className="mb-5 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                        <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
                            Todos los usuarios
                        </h2>
                        <p className="text-sm text-slate-500 dark:text-slate-400">
                            {users.total} usuario{users.total !== 1 ? 's' : ''} registrado
                            {users.total !== 1 ? 's' : ''}
                        </p>
                    </div>
                    <div className="w-full sm:max-w-xs">
                        <SearchBar
                            value={query}
                            onChange={handleSearch}
                            placeholder="Buscar por nombre, correo o empresa..."
                        />
                    </div>
                </div>

                <DataTable columns={columns} data={users.data} emptyText="No hay usuarios" />

                {users.last_page > 1 && (
                    <div className="mt-4 flex flex-wrap gap-2">
                        {users.links.map((link, i) =>
                            link.url ? (
                                <button
                                    key={i}
                                    type="button"
                                    onClick={() => router.get(link.url!)}
                                    className={`rounded-md px-3 py-1 text-sm ${
                                        link.active
                                            ? 'bg-sidebar-active text-white'
                                            : 'border border-slate-200 text-slate-600 hover:bg-slate-50 dark:border-[#3a3a3a] dark:text-slate-300'
                                    }`}
                                    dangerouslySetInnerHTML={{ __html: link.label }}
                                />
                            ) : (
                                <span
                                    key={i}
                                    className="px-2 py-1 text-sm text-slate-400"
                                    dangerouslySetInnerHTML={{ __html: link.label }}
                                />
                            ),
                        )}
                    </div>
                )}
            </Card>
        </AppLayout>
    );
}
