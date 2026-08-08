<!DOCTYPE html>
<html lang="{{ str_replace('_', '-', app()->getLocale()) }}">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
    <meta name="csrf-token" content="{{ csrf_token() }}">
    <title inertia>{{ config('app.name', 'Reparto') }}</title>

    <link rel="manifest" href="/manifest.webmanifest">
    <meta name="theme-color" content="#0085F3">
    <meta name="mobile-web-app-capable" content="yes">
    <meta name="apple-mobile-web-app-capable" content="yes">
    <meta name="apple-mobile-web-app-status-bar-style" content="default">
    <meta name="apple-mobile-web-app-title" content="{{ config('app.name', 'Reparto') }}">
    <link rel="apple-touch-icon" href="/icons/apple-touch-icon.png">

    <script>
        (function () {
            try {
                var appearance = localStorage.getItem('appearance') || 'light';
                var prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
                var isDark = appearance === 'dark' || (appearance === 'system' && prefersDark);
                document.documentElement.classList.toggle('dark', isDark);
            } catch (e) {}
        })();
    </script>

    <style>
        #app-boot-splash {
            position: fixed;
            inset: 0;
            z-index: 99999;
            display: flex;
            align-items: center;
            justify-content: center;
            background: #ffffff;
            transition: opacity 0.28s ease, visibility 0.28s ease;
        }

        html.dark #app-boot-splash {
            background: #171717;
        }

        #app-boot-splash.is-hiding {
            opacity: 0;
            visibility: hidden;
            pointer-events: none;
        }

        #app-boot-splash .splash-inner {
            display: flex;
            flex-direction: column;
            align-items: center;
            gap: 1.75rem;
            padding: 1.5rem;
        }

        #app-boot-splash .splash-logo {
            width: min(220px, 58vw);
            height: auto;
            object-fit: contain;
        }

        #app-boot-splash .splash-title {
            margin: 0;
            font-family: "Instrument Sans", system-ui, sans-serif;
            font-size: 1.125rem;
            font-weight: 600;
            letter-spacing: 0.02em;
            color: #0f172a;
        }

        html.dark #app-boot-splash .splash-title {
            color: #f8fafc;
        }

        #app-boot-splash .tiny-bar-loader {
            position: relative;
            width: 40px;
            height: 40px;
        }

        #app-boot-splash .tiny-bar-loader span {
            position: absolute;
            left: 50%;
            top: 50%;
            width: 3.5px;
            height: 11px;
            margin-left: -1.75px;
            margin-top: -20px;
            border-radius: 999px;
            background: #0085F3;
            transform-origin: center 20px;
            animation: splash-bar-fade 1s linear infinite;
            opacity: 0.15;
        }

        #app-boot-splash .tiny-bar-loader span:nth-child(1) { transform: rotate(0deg); animation-delay: -0.916s; }
        #app-boot-splash .tiny-bar-loader span:nth-child(2) { transform: rotate(30deg); animation-delay: -0.833s; }
        #app-boot-splash .tiny-bar-loader span:nth-child(3) { transform: rotate(60deg); animation-delay: -0.75s; }
        #app-boot-splash .tiny-bar-loader span:nth-child(4) { transform: rotate(90deg); animation-delay: -0.666s; }
        #app-boot-splash .tiny-bar-loader span:nth-child(5) { transform: rotate(120deg); animation-delay: -0.583s; }
        #app-boot-splash .tiny-bar-loader span:nth-child(6) { transform: rotate(150deg); animation-delay: -0.5s; }
        #app-boot-splash .tiny-bar-loader span:nth-child(7) { transform: rotate(180deg); animation-delay: -0.416s; }
        #app-boot-splash .tiny-bar-loader span:nth-child(8) { transform: rotate(210deg); animation-delay: -0.333s; }
        #app-boot-splash .tiny-bar-loader span:nth-child(9) { transform: rotate(240deg); animation-delay: -0.25s; }
        #app-boot-splash .tiny-bar-loader span:nth-child(10) { transform: rotate(270deg); animation-delay: -0.166s; }
        #app-boot-splash .tiny-bar-loader span:nth-child(11) { transform: rotate(300deg); animation-delay: -0.083s; }
        #app-boot-splash .tiny-bar-loader span:nth-child(12) { transform: rotate(330deg); animation-delay: 0s; }

        @keyframes splash-bar-fade {
            0%, 39%, 100% { opacity: 0.15; }
            40% { opacity: 1; }
        }
    </style>

    <link rel="preconnect" href="https://fonts.bunny.net">
    <link href="https://fonts.bunny.net/css?family=instrument-sans:400,500,600,700" rel="stylesheet" />

    @viteReactRefresh
    @vite(['resources/css/app.css', 'resources/js/app.tsx'])
    @inertiaHead
</head>
<body>
    <div id="app-boot-splash" role="status" aria-live="polite" aria-label="Cargando aplicación">
        <div class="splash-inner">
            <img
                class="splash-logo"
                src="/images/logoreparto.webp"
                alt="{{ config('app.name', 'Reparto') }}"
                width="220"
                height="80"
            >
            <p class="splash-title">{{ config('app.name', 'Reparto') }}</p>
            <div class="tiny-bar-loader" aria-hidden="true">
                <span></span><span></span><span></span><span></span>
                <span></span><span></span><span></span><span></span>
                <span></span><span></span><span></span><span></span>
            </div>
        </div>
    </div>

    @inertia
</body>
</html>
