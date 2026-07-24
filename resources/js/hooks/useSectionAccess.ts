import { usePage } from '@inertiajs/react';
import type { SectionKey } from '@/types';

export type SimpleSectionPermission = { view: boolean; edit: boolean };

export type CardAccountSectionPermission = {
    view: boolean;
    create: boolean;
    update: boolean;
    delete: boolean;
    payment: boolean;
    real_deposit: boolean;
};

export type SectionPermissionMap = Partial<
    Record<SectionKey, SimpleSectionPermission | CardAccountSectionPermission>
>;

type PageProps = {
    sectionPermissions?: SectionPermissionMap;
    auth?: {
        user?: {
            role?: string;
        } | null;
    };
};

function isCardAccountAccess(
    access: SimpleSectionPermission | CardAccountSectionPermission | undefined,
): access is CardAccountSectionPermission {
    return access !== undefined && 'create' in access;
}

export function useSectionAccess(section: SectionKey) {
    const page = usePage<PageProps>();
    const permissions = page.props.sectionPermissions ?? {};
    const isAdmin = page.props.auth?.user?.role === 'admin';
    const access = permissions[section];

    if (section === 'card_account') {
        const granular = isCardAccountAccess(access)
            ? access
            : { view: false, create: false, update: false, delete: false, payment: false, real_deposit: false };

        return {
            canView: isAdmin || granular.view,
            canEdit: isAdmin || granular.create || granular.update || granular.delete,
            canCreate: isAdmin || granular.create,
            canUpdate: isAdmin || granular.update,
            canDelete: isAdmin || granular.delete,
            canPayment: isAdmin || granular.payment,
            canRealDeposit: isAdmin || granular.real_deposit,
        };
    }

    if (section === 'contacts') {
        const simple = access && 'edit' in access ? access : { view: false, edit: false };

        return {
            canView: isAdmin || simple.view,
            canEdit: isAdmin || simple.edit,
            canCreate: isAdmin || simple.view,
            canUpdate: isAdmin || simple.edit,
            canDelete: isAdmin || simple.edit,
            canPayment: false,
            canRealDeposit: false,
        };
    }

    const simple = access && 'edit' in access ? access : { view: false, edit: false };

    return {
        canView: isAdmin || simple.view,
        canEdit: isAdmin || simple.edit,
        canCreate: isAdmin || simple.edit,
        canUpdate: isAdmin || simple.edit,
        canDelete: isAdmin || simple.edit,
        canPayment: false,
        canRealDeposit: false,
    };
}

export function useSectionPermissions() {
    const page = usePage<PageProps>();
    const permissions = page.props.sectionPermissions ?? {};
    const isAdmin = page.props.auth?.user?.role === 'admin';

    const canView = (section: SectionKey): boolean => {
        if (isAdmin) return true;
        const access = permissions[section];
        if (!access) return false;
        return access.view;
    };

    const canEdit = (section: SectionKey): boolean => {
        if (isAdmin) return true;
        const access = permissions[section];
        if (!access) return false;
        if ('edit' in access) return access.edit;
        return access.create || access.update || access.delete;
    };

    return { canView, canEdit, permissions, isAdmin };
}
