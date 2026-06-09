/** Logo por defecto del sistema (sidebar, header, login). */
export const DEFAULT_APP_LOGO_URL = '/images/logoreparto.webp';

/** Misma imagen en la pantalla de login (como sisventas). */
export const LOGIN_LOGO_URL = DEFAULT_APP_LOGO_URL;

export function resolveAppLogoUrl(customLogoUrl?: string | null): string {
    return customLogoUrl?.trim() ? customLogoUrl : DEFAULT_APP_LOGO_URL;
}
