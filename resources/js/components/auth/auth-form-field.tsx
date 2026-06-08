import * as React from 'react';
import { AlertCircle } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

interface AuthFormFieldProps {
    id: string;
    label: string;
    error?: string;
    icon?: React.ReactNode;
    children?: React.ReactNode;
    /** Input control (si no usas children) */
    inputProps?: React.ComponentProps<typeof Input>;
    rightSlot?: React.ReactNode;
}

export function AuthFormField({
    id,
    label,
    error,
    icon,
    children,
    inputProps,
    rightSlot,
}: AuthFormFieldProps) {
    const hasError = Boolean(error);

    return (
        <div className="pb-5">
            <label
                htmlFor={id}
                className={cn(
                    'mb-3 block text-base font-semibold transition-colors',
                    hasError ? 'text-rose-600' : 'text-slate-600',
                )}
            >
                {label}
            </label>

            <div
                className={cn(
                    'relative rounded-lg transition-shadow',
                    hasError && 'ring-2 ring-rose-500/25',
                )}
            >
                {icon && (
                    <span
                        className={cn(
                            'pointer-events-none absolute left-3 top-1/2 z-10 -translate-y-1/2',
                            hasError ? 'text-rose-500' : 'text-slate-500',
                        )}
                    >
                        {icon}
                    </span>
                )}

                {children ??
                    (inputProps && (
                        <Input
                            id={id}
                            aria-invalid={hasError}
                            aria-describedby={hasError ? `${id}-error` : undefined}
                            className={cn(
                                icon && 'pl-10',
                                rightSlot && 'pr-10',
                                hasError &&
                                    'border-rose-500 bg-rose-50/40 focus-visible:border-rose-500 focus-visible:ring-rose-500/20 dark:bg-rose-950/20',
                                !hasError &&
                                    'border-slate-300 focus-visible:border-blue-500 dark:border-slate-300 dark:bg-white dark:text-slate-900',
                                'h-11 bg-white text-slate-900',
                                inputProps.className,
                            )}
                            {...inputProps}
                        />
                    ))}

                {rightSlot}
            </div>

            {hasError && (
                <p
                    id={`${id}-error`}
                    role="alert"
                    className="mt-2 flex items-start gap-1.5 text-xs font-medium text-rose-600"
                >
                    <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden />
                    <span>{error}</span>
                </p>
            )}
        </div>
    );
}
