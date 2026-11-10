<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>Detalle MSI</title>
</head>
<body style="font-family: system-ui, -apple-system, sans-serif; line-height: 1.5; color: #1e293b; max-width: 640px; margin: 0 auto; padding: 24px;">
    <h1 style="font-size: 20px; margin: 0 0 8px;">Detalle de compra MSI</h1>
    <p style="margin: 0 0 20px; color: #475569;">
        {{ $senderName }} te comparte el detalle de una compra a meses sin intereses en
        <strong>{{ config('app.name') }}</strong>.
    </p>

    <table style="width: 100%; border-collapse: collapse; margin-bottom: 24px;">
        <tr>
            <td style="padding: 8px 0; color: #64748b; width: 40%;">Tarjeta</td>
            <td style="padding: 8px 0; font-weight: 600;">{{ $details['account_name'] }}</td>
        </tr>
        <tr>
            <td style="padding: 8px 0; color: #64748b;">Compra</td>
            <td style="padding: 8px 0; font-weight: 600;">{{ $details['purchase_name'] }}</td>
        </tr>
        <tr>
            <td style="padding: 8px 0; color: #64748b;">Monto de la compra</td>
            <td style="padding: 8px 0; font-weight: 700;">${{ number_format($details['original_amount'], 2) }}</td>
        </tr>
        <tr>
            <td style="padding: 8px 0; color: #64748b;">Mensualidad</td>
            <td style="padding: 8px 0; font-weight: 700;">${{ number_format($details['monthly_amount'], 2) }}</td>
        </tr>
        <tr>
            <td style="padding: 8px 0; color: #64748b;">Meses sin intereses</td>
            <td style="padding: 8px 0; font-weight: 600;">{{ $details['months_total'] }} meses</td>
        </tr>
        <tr>
            <td style="padding: 8px 0; color: #64748b;">Primer pago</td>
            <td style="padding: 8px 0;">{{ $details['first_due_date_formatted'] }}</td>
        </tr>
    </table>

    <h2 style="font-size: 16px; margin: 0 0 12px;">Calendario de pagos</h2>
    <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
        <thead>
            <tr style="background: #f1f5f9; text-align: left;">
                <th style="padding: 10px 8px; border-bottom: 1px solid #e2e8f0;">Mes</th>
                <th style="padding: 10px 8px; border-bottom: 1px solid #e2e8f0;">Fecha de pago</th>
                <th style="padding: 10px 8px; border-bottom: 1px solid #e2e8f0; text-align: right;">Monto</th>
                <th style="padding: 10px 8px; border-bottom: 1px solid #e2e8f0;">Estado</th>
            </tr>
        </thead>
        <tbody>
            @foreach ($details['installments'] as $installment)
                <tr>
                    <td style="padding: 10px 8px; border-bottom: 1px solid #e2e8f0;">Mes {{ $installment['number'] }}</td>
                    <td style="padding: 10px 8px; border-bottom: 1px solid #e2e8f0;">{{ $installment['due_date_formatted'] }}</td>
                    <td style="padding: 10px 8px; border-bottom: 1px solid #e2e8f0; text-align: right; font-variant-numeric: tabular-nums;">
                        ${{ number_format($installment['amount'], 2) }}
                    </td>
                    <td style="padding: 10px 8px; border-bottom: 1px solid #e2e8f0; color: {{ $installment['paid'] ? '#047857' : '#b45309' }};">
                        @if ($installment['paid'])
                            Pagado{{ $installment['paid_at_formatted'] ? ' ('.$installment['paid_at_formatted'].')' : '' }}
                        @else
                            Pendiente
                        @endif
                    </td>
                </tr>
            @endforeach
        </tbody>
    </table>

    <p style="margin: 24px 0 0; font-size: 13px; color: #94a3b8;">
        Este correo fue enviado desde {{ config('app.name') }}.
    </p>
</body>
</html>
