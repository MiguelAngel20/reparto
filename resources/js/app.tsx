import '../css/app.css';
import 'sweetalert2/dist/sweetalert2.min.css';

import { createInertiaApp } from '@inertiajs/react';
import { resolvePageComponent } from 'laravel-vite-plugin/inertia-helpers';
import { createRoot } from 'react-dom/client';
import { initializeTheme } from './hooks/use-appearance';

const appName = import.meta.env.VITE_APP_NAME || 'Reparto';

function hideBootSplash() {
    const splash = document.getElementById('app-boot-splash');
    if (!splash) {
        return;
    }

    splash.classList.add('is-hiding');
    window.setTimeout(() => {
        splash.remove();
    }, 300);
}

initializeTheme();

createInertiaApp({
    title: (title) => `${title} - ${appName}`,
    resolve: (name) =>
        resolvePageComponent(`./pages/${name}.tsx`, import.meta.glob('./pages/**/*.tsx')),
    setup({ el, App, props }) {
        const root = createRoot(el);
        root.render(<App {...props} />);
        hideBootSplash();
    },
    progress: {
        color: '#0085F3',
    },
});

// PWA: registrar service worker solo en producción (en dev interfiere con Vite HMR)
if ('serviceWorker' in navigator && import.meta.env.PROD) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('/sw.js').catch(() => {
            // Si falla el registro, la app sigue funcionando como web normal
        });
    });
}
