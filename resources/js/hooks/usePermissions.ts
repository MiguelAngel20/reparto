import { usePage } from '@inertiajs/react';

interface AuthUser {
    id: number;
    name: string;
    email: string;
    role?: string;
    company_name?: string | null;
    percentage?: number;
    registered_at?: string | null;
    branch_id?: number | null;
    company_id?: number | null;
    can_pick_branch?: boolean;
    roles: string[];
    permissions: string[];
}

interface PageProps {
    auth?: {
        user: AuthUser | null;
    };
}

/**
 * Hook para acceder a los permisos del usuario autenticado
 */
export function usePermissions() {
    const page = usePage<PageProps>();
    
    // Los props compartidos de Inertia están en page.props directamente
    const pageProps = page.props as PageProps;
    const auth = pageProps?.auth || { user: null };
    const user = auth?.user || null;

    /**
     * Verificar si el usuario tiene un permiso específico
     */
    const hasPermission = (permission: string): boolean => {
        if (!user) return false;
        if (user.permissions.includes('*')) return true;
        return user.permissions.includes(permission);
    };

    /**
     * Verificar si el usuario tiene alguno de los permisos
     */
    const hasAnyPermission = (permissions: string[]): boolean => {
        if (!user) return false;
        return permissions.some(permission => user.permissions.includes(permission));
    };

    /**
     * Verificar si el usuario tiene todos los permisos
     */
    const hasAllPermissions = (permissions: string[]): boolean => {
        if (!user) return false;
        return permissions.every(permission => user.permissions.includes(permission));
    };

    /**
     * Verificar si el usuario tiene un rol específico
     */
    const hasRole = (role: string): boolean => {
        if (!user) return false;
        if (user.role === role) return true;
        return user.roles.includes(role);
    };

    /**
     * Verificar si el usuario es System Admin
     */
    const isSystemAdmin = (): boolean => {
        return hasRole('system_admin');
    };

    /**
     * @deprecated super_admin ya no se usa; solo system_admin. Retorna false.
     */
    const isSuperAdmin = (): boolean => {
        return false;
    };

    /**
     * Acceso total al sistema (desarrollador). Antes incluía super_admin; ahora solo system_admin.
     */
    const isSystemOrSuperAdmin = (): boolean => {
        return isSystemAdmin();
    };

    /**
     * Verificar si el usuario es Admin
     */
    const isAdmin = (): boolean => {
        return hasRole('admin');
    };

    /**
     * Verificar si el usuario es Vendedor
     */
    const isVendedor = (): boolean => {
        return hasRole('vendedor');
    };

    const isCompanyOwner = (): boolean => {
        return hasRole('root');
    };

    /** Debe elegir sucursal en formularios (system_admin o dueño root sin sucursal). */
    const canPickBranch = (): boolean => {
        if (!user) return false;
        if (user.can_pick_branch) return true;
        return isSystemOrSuperAdmin() || (isCompanyOwner() && !user.branch_id);
    };

    return {
        user,
        hasPermission,
        hasAnyPermission,
        hasAllPermissions,
        hasRole,
        isSystemAdmin,
        isSuperAdmin,
        isSystemOrSuperAdmin,
        isAdmin,
        isVendedor,
        isCompanyOwner,
        canPickBranch,
        permissions: user?.permissions || [],
        roles: user?.roles || [],
    };
}

