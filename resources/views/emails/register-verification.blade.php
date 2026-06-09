<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>Verifica tu correo</title>
</head>
<body style="font-family: system-ui, -apple-system, sans-serif; line-height: 1.5; color: #1e293b; max-width: 480px; margin: 0 auto; padding: 24px;">
    <h1 style="font-size: 20px; margin-bottom: 8px;">¡Bienvenido, {{ $userName }}!</h1>
    <p style="margin: 0 0 16px; color: #475569;">
        Gracias por registrarte en <strong>{{ config('app.name') }}</strong>. Confirma tu correo electrónico para activar tu cuenta:
    </p>
    <p style="text-align: center; margin: 24px 0;">
        <a href="{{ $verificationUrl }}"
           style="display: inline-block; padding: 12px 24px; background: #0085F3; color: #ffffff; text-decoration: none; border-radius: 8px; font-weight: 600;">
            Verificar mi correo
        </a>
    </p>
    <p style="margin: 0 0 12px; font-size: 14px; color: #64748b;">
        Este enlace expira en {{ $expiresMinutes }} minutos. Si no creaste esta cuenta, ignora este correo.
    </p>
    <p style="margin: 0; font-size: 12px; color: #94a3b8; word-break: break-all;">
        Si el botón no funciona, copia y pega este enlace en tu navegador:<br>
        {{ $verificationUrl }}
    </p>
</body>
</html>
