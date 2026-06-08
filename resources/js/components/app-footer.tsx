const PROJECT_START_YEAR = 2026;
const APP_DISPLAY_NAME = 'Reparto';

export function AppFooter() {
    const currentYear = new Date().getFullYear();
    const yearLabel =
        currentYear > PROJECT_START_YEAR
            ? `${PROJECT_START_YEAR} - ${currentYear}`
            : String(PROJECT_START_YEAR);

    return (
        <footer className="border-t border-slate-200 bg-white px-6 py-4 text-sm text-slate-500 transition-colors duration-300 dark:border-[#2b2b2b] dark:bg-[#232323] dark:text-slate-300 text-center">
            <p>
                © {yearLabel} {APP_DISPLAY_NAME} — Todos los derechos reservados.
            </p>
        </footer>
    );
}
