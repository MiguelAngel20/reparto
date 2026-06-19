export interface BreadcrumbItem {
    title: string;
    href: string;
}

export interface NavItem {
    title: string;
    href?: string;
    icon?: React.ComponentType<{ className?: string }>;
    section?: SectionKey;
    onClick?: boolean;
    badge?: string;
    permission?: string | null;
    submenu?: {
        title: string;
        href: string;
        permission?: string | null;
    }[];
}

export type SectionKey =
    | 'dashboard'
    | 'reparto'
    | 'manual_capture'
    | 'company_balance'
    | 'gasto'
    | 'card_account'
    | 'personal_service';

export interface SharedData {
    auth?: {
        user?: any;
    };
    sidebarOpen?: boolean;
    [key: string]: any;
}