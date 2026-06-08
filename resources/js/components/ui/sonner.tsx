import { Toaster as SonnerToaster } from "sonner";
import { cn } from "@/lib/utils";

type ToasterProps = React.ComponentProps<typeof SonnerToaster>;

/**
 * Componente Toaster personalizado con estilos modernos
 * Configurado para modo claro y oscuro
 */
function Toaster({ className, ...props }: ToasterProps) {
    return (
        <SonnerToaster
            className={cn("toaster group", className)}
            toastOptions={{
                classNames: {
                    toast:
                        "group toast group-[.toaster]:bg-white group-[.toaster]:text-slate-950 group-[.toaster]:border-slate-200 group-[.toaster]:shadow-lg dark:group-[.toaster]:bg-[#232323] dark:group-[.toaster]:text-slate-50 dark:group-[.toaster]:border-[#2b2b2b]",
                    description: "group-[.toast]:text-slate-500 dark:group-[.toast]:text-slate-400",
                    actionButton:
                        "group-[.toast]:bg-slate-900 group-[.toast]:text-slate-50 dark:group-[.toast]:bg-slate-50 dark:group-[.toast]:text-slate-900",
                    cancelButton:
                        "group-[.toast]:bg-slate-100 group-[.toast]:text-slate-500 dark:group-[.toast]:bg-[#2a2a2a] dark:group-[.toast]:text-slate-400",
                },
            }}
                   position="top-center"
                   richColors
                   {...props}
        />
    );
}

export { Toaster };