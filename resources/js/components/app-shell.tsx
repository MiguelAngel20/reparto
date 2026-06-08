export function AppShell({ children }: { children: React.ReactNode }) {
    return (
        // Fondo de contenido: claro en light, y #1f1f1f en dark para contrastar con #232323
        <div className="min-h-screen bg-white text-slate-900 transition-colors duration-300 dark:bg-[#1f1f1f] dark:text-slate-100">
            {children}
        </div>
    );
}