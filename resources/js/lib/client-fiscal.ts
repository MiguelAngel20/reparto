/** Estado de campos fiscales compartido entre crear/editar cliente */
export type ClientFiscalFormState = {
    rfc: string;
    razon_social: string;
    codigo_postal: string;
    regimen_fiscal: string;
    uso_cfdi: string;
    pais: string;
    tipo_persona: "" | "fisica" | "moral";
    nombre_fiscal: string;
    apellidos_fiscal: string;
    calle: string;
    no_exterior: string;
    no_interior: string;
    colonia: string;
    municipio: string;
    ciudad: string;
    localidad: string;
    estado: string;
    numregidtrib: string;
    email2: string;
    email3: string;
};

export const emptyClientFiscalState = (): ClientFiscalFormState => ({
    rfc: "",
    razon_social: "",
    codigo_postal: "",
    regimen_fiscal: "",
    uso_cfdi: "G03",
    pais: "MEX",
    tipo_persona: "moral",
    nombre_fiscal: "",
    apellidos_fiscal: "",
    calle: "",
    no_exterior: "",
    no_interior: "",
    colonia: "",
    municipio: "",
    ciudad: "",
    localidad: "",
    estado: "",
    numregidtrib: "",
    email2: "",
    email3: "",
});

/** RFC genérico nacional / extranjero (público en general) */
export const RFC_PUBLICO_GENERAL = "XAXX010101000";
export const RFC_EXTRANJERO = "XEXX010101000";

const RFC_PATTERN =
    /^([A-ZÑ&]{3,4}\d{6}[A-Z0-9]{3}|XAXX010101000|XEXX010101000)$/i;

export type SatCatalogOption = {
    clave: string;
    descripcion: string;
};

export function validateClientFiscalFields(
    fiscal: ClientFiscalFormState,
    options: { requireFiscal: boolean; isDefault?: boolean }
): Record<string, string> {
    const errors: Record<string, string> = {};

    if (!options.requireFiscal || options.isDefault) {
        return errors;
    }

    if (!fiscal.rfc.trim()) {
        errors.rfc = "El RFC es requerido para facturación";
    } else if (!RFC_PATTERN.test(fiscal.rfc.trim())) {
        errors.rfc = "El RFC no tiene un formato válido";
    }

    if (!fiscal.razon_social.trim()) {
        errors.razon_social = "La razón social es requerida para facturación";
    }

    if (!fiscal.codigo_postal.trim()) {
        errors.codigo_postal = "El código postal fiscal es requerido";
    } else if (!/^\d{5}$/.test(fiscal.codigo_postal.trim())) {
        errors.codigo_postal = "El código postal debe tener 5 dígitos";
    }

    if (!fiscal.regimen_fiscal) {
        errors.regimen_fiscal = "El régimen fiscal es requerido";
    }

    if (!fiscal.pais.trim()) {
        errors.pais = "El país es requerido";
    }

    if (fiscal.tipo_persona === "fisica") {
        if (!fiscal.nombre_fiscal.trim()) {
            errors.nombre_fiscal = "El nombre es requerido para persona física";
        }
        if (!fiscal.apellidos_fiscal.trim()) {
            errors.apellidos_fiscal = "Los apellidos son requeridos para persona física";
        }
    }

    if (fiscal.email2.trim()) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(fiscal.email2)) {
            errors.email2 = "El correo alternativo no es válido";
        }
    }

    if (fiscal.email3.trim()) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(fiscal.email3)) {
            errors.email3 = "El segundo correo alternativo no es válido";
        }
    }

    return errors;
}

export function fiscalFieldsToPayload(fiscal: ClientFiscalFormState): Record<string, string | null> {
    return {
        rfc: fiscal.rfc.trim().toUpperCase() || null,
        razon_social: fiscal.razon_social.trim() || null,
        codigo_postal: fiscal.codigo_postal.trim() || null,
        regimen_fiscal: fiscal.regimen_fiscal || null,
        uso_cfdi: fiscal.uso_cfdi || null,
        pais: fiscal.pais.trim().toUpperCase() || "MEX",
        tipo_persona: fiscal.tipo_persona || null,
        nombre_fiscal: fiscal.nombre_fiscal.trim() || null,
        apellidos_fiscal: fiscal.apellidos_fiscal.trim() || null,
        calle: fiscal.calle.trim() || null,
        no_exterior: fiscal.no_exterior.trim() || null,
        no_interior: fiscal.no_interior.trim() || null,
        colonia: fiscal.colonia.trim() || null,
        municipio: fiscal.municipio.trim() || null,
        ciudad: fiscal.ciudad.trim() || null,
        localidad: fiscal.localidad.trim() || null,
        estado: fiscal.estado.trim() || null,
        numregidtrib: fiscal.numregidtrib.trim() || null,
        email2: fiscal.email2.trim() || null,
        email3: fiscal.email3.trim() || null,
    };
}

export function fiscalFromClient(client: Partial<ClientFiscalFormState>): ClientFiscalFormState {
    return {
        rfc: client.rfc ?? "",
        razon_social: client.razon_social ?? "",
        codigo_postal: client.codigo_postal ?? "",
        regimen_fiscal: client.regimen_fiscal ?? "",
        uso_cfdi: client.uso_cfdi ?? "G03",
        pais: client.pais ?? "MEX",
        tipo_persona: (client.tipo_persona as ClientFiscalFormState["tipo_persona"]) || "moral",
        nombre_fiscal: client.nombre_fiscal ?? "",
        apellidos_fiscal: client.apellidos_fiscal ?? "",
        calle: client.calle ?? "",
        no_exterior: client.no_exterior ?? "",
        no_interior: client.no_interior ?? "",
        colonia: client.colonia ?? "",
        municipio: client.municipio ?? "",
        ciudad: client.ciudad ?? "",
        localidad: client.localidad ?? "",
        estado: client.estado ?? "",
        numregidtrib: client.numregidtrib ?? "",
        email2: client.email2 ?? "",
        email3: client.email3 ?? "",
    };
}
