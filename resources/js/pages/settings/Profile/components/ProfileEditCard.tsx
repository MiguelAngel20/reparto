import { AuthFormField } from '@/components/auth/auth-form-field';
import { Building2, Mail, Percent, User } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { InertiaFormProps } from '@inertiajs/react';

export type ProfileFormData = {
    name: string;
    email: string;
    company_name: string;
    percentage: string;
};

interface ProfileEditCardProps {
    form: InertiaFormProps<ProfileFormData>;
    onSubmit: (e: React.FormEvent) => void;
    className?: string;
}

export default function ProfileEditCard({ form, onSubmit, className }: ProfileEditCardProps) {
    const { data, setData, errors, processing } = form;

    return (
        <div className={cn('w-full', className)}>
            <form onSubmit={onSubmit} noValidate>
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    <AuthFormField
                        id="edit-name"
                        label="Nombre"
                        error={errors.name}
                        icon={<User className="h-4 w-4" />}
                        inputProps={{
                            value: data.name,
                            onChange: (e) => setData('name', e.target.value),
                        }}
                    />
                    <AuthFormField
                        id="edit-email"
                        label="Correo electrónico"
                        error={errors.email}
                        icon={<Mail className="h-4 w-4" />}
                        inputProps={{
                            type: 'email',
                            value: data.email,
                            onChange: (e) => setData('email', e.target.value),
                        }}
                    />
                    <AuthFormField
                        id="edit-company"
                        label="Empresa"
                        error={errors.company_name}
                        icon={<Building2 className="h-4 w-4" />}
                        inputProps={{
                            value: data.company_name,
                            onChange: (e) => setData('company_name', e.target.value),
                        }}
                    />
                    <AuthFormField
                        id="edit-percentage"
                        label="Porcentaje (%)"
                        error={errors.percentage}
                        icon={<Percent className="h-4 w-4" />}
                        inputProps={{
                            type: 'number',
                            min: 0,
                            max: 100,
                            step: 0.01,
                            value: data.percentage,
                            onChange: (e) => setData('percentage', e.target.value),
                        }}
                    />
                </div>

                <button
                    type="submit"
                    disabled={processing}
                    className="mt-6 h-11 w-full rounded-xl bg-gradient-to-r from-[#405de6] via-[#833ab4] to-[#fd1d1d] text-sm font-semibold text-white shadow-md transition-opacity hover:opacity-90 disabled:opacity-50 sm:w-auto sm:min-w-[200px] sm:px-8"
                >
                    {processing ? 'Guardando...' : 'Guardar cambios'}
                </button>
            </form>
        </div>
    );
}
