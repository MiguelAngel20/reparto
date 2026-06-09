<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>Código de verificación</title>
</head>
<body style="font-family: system-ui, -apple-system, sans-serif; line-height: 1.5; color: #1e293b; max-width: 480px; margin: 0 auto; padding: 24px;">
    <h1 style="font-size: 20px; margin-bottom: 8px;">Verifica tu inicio de sesión</h1>
    <p style="margin: 0 0 16px; color: #475569;">
        Usa el siguiente código para completar el acceso a <strong>{{ config('app.name') }}</strong>:
    </p>
    <p style="font-size: 32px; font-weight: 700; letter-spacing: 8px; text-align: center; margin: 24px 0; padding: 16px; background: #f1f5f9; border-radius: 8px;">
        {{ $code }}
    </p>
    <p style="margin: 0; font-size: 14px; color: #64748b;">
        Este código expira en {{ $expiresMinutes }} minutos. Si no intentaste iniciar sesión, ignora este correo.
    </p>
</body>
</html>
