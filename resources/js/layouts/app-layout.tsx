import AppLayoutTemplate from '@/layouts/app/app-sidebar-layout';
import { type BreadcrumbItem } from '@/types';
import { type ReactNode } from 'react';
import { Toaster } from '@/components/ui/sonner';

export interface AppLayoutProps {
    children: ReactNode;
    breadcrumbs?: BreadcrumbItem[];
    title?: string;
    fullWidth?: boolean;
    sidebar?: ReactNode; // Sidebar opcional (por ejemplo, SettingsSidebar)
}

export default function AppLayout({ children, breadcrumbs, title, fullWidth, sidebar }: AppLayoutProps) {
    return (
        <AppLayoutTemplate breadcrumbs={breadcrumbs} title={title} fullWidth={fullWidth} sidebar={sidebar}>
            {children}
            <Toaster />
        </AppLayoutTemplate>
    );
}