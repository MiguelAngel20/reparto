<?php

namespace App\Support;

class UserSection
{
    public const DASHBOARD = 'dashboard';

    public const REPARTO = 'reparto';

    public const MANUAL_CAPTURE = 'manual_capture';

    public const COMPANY_BALANCE = 'company_balance';

    public const GASTO = 'gasto';

    public const CARD_ACCOUNT = 'card_account';

    public const PERSONAL_SERVICE = 'personal_service';

    public const CONTACTS = 'contacts';

    /**
     * @return list<string>
     */
    public static function all(): array
    {
        return [
            self::DASHBOARD,
            self::REPARTO,
            self::MANUAL_CAPTURE,
            self::COMPANY_BALANCE,
            self::GASTO,
            self::CARD_ACCOUNT,
            self::PERSONAL_SERVICE,
            self::CONTACTS,
        ];
    }

    /**
     * @return array<string, string>
     */
    public static function labels(): array
    {
        return [
            self::DASHBOARD => 'Dashboard',
            self::REPARTO => 'Iniciar jornada',
            self::MANUAL_CAPTURE => 'Captura manual',
            self::COMPANY_BALANCE => 'Cuenta empresa',
            self::GASTO => 'Gasto',
            self::CARD_ACCOUNT => 'Cuenta tarjeta',
            self::PERSONAL_SERVICE => 'Mis servicios',
            self::CONTACTS => 'Contactos',
        ];
    }

    public static function label(string $section): string
    {
        return self::labels()[$section] ?? $section;
    }

    public static function isGranular(string $section): bool
    {
        return $section === self::CARD_ACCOUNT;
    }

    /**
     * @return list<string>
     */
    public static function granularActions(string $section): array
    {
        if (! self::isGranular($section)) {
            return [];
        }

        return ['create', 'update', 'delete', 'payment', 'real_deposit'];
    }

    /**
     * @return array<string, string>
     */
    public static function granularActionLabels(string $section): array
    {
        if ($section !== self::CARD_ACCOUNT) {
            return [];
        }

        return [
            'create' => 'Crear compra',
            'update' => 'Editar',
            'delete' => 'Eliminar',
            'payment' => 'Abonar',
            'real_deposit' => 'Dinero real',
        ];
    }
}
