export interface BreadcrumbItem {
    title: string;
    href: string;
}

export interface NavItem {
    title: string;
    href?: string;
    icon?: React.ComponentType<{ className?: string }>;
    onClick?: boolean;
    badge?: string;
    permission?: string | null; // Permiso requerido para mostrar el item
    submenu?: {
        title: string;
        href: string;
        permission?: string | null; // Permiso requerido para mostrar el subitem
    }[];
}

export interface SharedData {
    auth?: {
        user?: any;
    };
    sidebarOpen?: boolean;
    [key: string]: any;
}