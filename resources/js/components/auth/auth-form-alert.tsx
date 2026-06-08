import { AlertCircle } from 'lucide-react';

interface AuthFormAlertProps {
    message: string;
}

export function AuthFormAlert({ message }: AuthFormAlertProps) {
    return (
        <div
            role="alert"
            className="mx-5 mb-4 flex items-start gap-2 rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800"
        >
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
            <span>{message}</span>
        </div>
    );
}
