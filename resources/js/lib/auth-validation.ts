const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export type AuthErrors = Record<string, string>;

export const LOGIN_AUTH_ERROR_MESSAGE =
    'El correo y/o la contraseña proporcionados no coinciden con nuestros registros.';

export const PASSWORD_MISMATCH_MESSAGE = 'Las contraseñas no coinciden.';

export function isLoginAuthError(emailError?: string): boolean {
    if (!emailError) {
        return false;
    }
    const msg = String(emailError);
    return msg.includes('no coinciden') || msg.includes('credenciales');
}

export function isPasswordMismatchError(errors: AuthErrors): boolean {
    return Object.values(errors).some((msg) =>
        String(msg).toLowerCase().includes('no coinciden'),
    );
}

export function validateLogin(data: {
    email: string;
    password: string;
}): AuthErrors {
    const errors: AuthErrors = {};

    if (!data.email.trim()) {
        errors.email = 'El correo electrónico es obligatorio.';
    } else if (!EMAIL_REGEX.test(data.email.trim())) {
        errors.email = 'Ingresa un correo electrónico válido.';
    }

    if (!data.password) {
        errors.password = 'La contraseña es obligatoria.';
    }

    return errors;
}

export type RegisterValidationResult = {
    fieldErrors: AuthErrors;
    bannerError: string | null;
};

export function validateRegister(data: {
    name: string;
    email: string;
    password: string;
    password_confirmation: string;
}): RegisterValidationResult {
    const fieldErrors: AuthErrors = {};

    if (!data.name.trim()) {
        fieldErrors.name = 'El nombre es obligatorio.';
    } else if (data.name.trim().length < 2) {
        fieldErrors.name = 'El nombre debe tener al menos 2 caracteres.';
    }

    if (!data.email.trim()) {
        fieldErrors.email = 'El correo electrónico es obligatorio.';
    } else if (!EMAIL_REGEX.test(data.email.trim())) {
        fieldErrors.email = 'Ingresa un correo electrónico válido.';
    }

    if (!data.password) {
        fieldErrors.password = 'La contraseña es obligatoria.';
    } else if (data.password.length < 8) {
        fieldErrors.password = 'La contraseña debe tener al menos 8 caracteres.';
    }

    if (!data.password_confirmation) {
        fieldErrors.password_confirmation = 'Debes confirmar tu contraseña.';
    }

    const passwordsFilled = Boolean(data.password && data.password_confirmation);
    const passwordsMismatch =
        passwordsFilled && data.password !== data.password_confirmation;

    const bannerError = passwordsMismatch ? PASSWORD_MISMATCH_MESSAGE : null;

    return { fieldErrors, bannerError };
}

export function validatePasswordChange(data: {
    password: string;
    password_confirmation: string;
}): RegisterValidationResult {
    const fieldErrors: AuthErrors = {};

    if (!data.password) {
        fieldErrors.password = 'La contraseña es obligatoria.';
    } else if (data.password.length < 8) {
        fieldErrors.password = 'La contraseña debe tener al menos 8 caracteres.';
    }

    if (!data.password_confirmation) {
        fieldErrors.password_confirmation = 'Debes confirmar tu contraseña.';
    }

    const passwordsFilled = Boolean(data.password && data.password_confirmation);
    const passwordsMismatch =
        passwordsFilled && data.password !== data.password_confirmation;

    const bannerError = passwordsMismatch ? PASSWORD_MISMATCH_MESSAGE : null;

    return { fieldErrors, bannerError };
}
