const OCR_DIGIT_MAP: Record<string, string> = {
    O: '0',
    o: '0',
    D: '0',
    Q: '0',
    I: '1',
    l: '1',
    i: '1',
    '|': '1',
    S: '5',
    s: '5',
    B: '8',
    G: '6',
    Z: '2',
};

function onlyDigits(value: string): string {
    return value.replace(/\D+/g, '');
}

function normalizeOcrChunk(value: string): string {
    return value
        .split('')
        .map((char) => OCR_DIGIT_MAP[char] ?? char)
        .join('')
        .replace(/[^\d]/g, '');
}

function looksLikeJoinedPrices(digits: string): boolean {
    return digits.length === 10 && digits.slice(3, 5) === '00' && digits.slice(8, 10) === '00';
}

function looksLikeDate(digits: string): boolean {
    return /^(0[1-9]|[12]\d|3[01])(0[1-9]|1[0-2])20\d{2}/.test(digits)
        || /^20\d{2}(0[1-9]|1[0-2])(0[1-9]|[12]\d|3[01])/.test(digits);
}

function toMexicanPhone(digits: string): string | null {
    let value = digits;

    if (value.startsWith('52') && value.length === 12) {
        value = value.slice(2);
    }

    if (value.startsWith('1') && value.length === 11) {
        value = value.slice(1);
    }

    if (value.length !== 10) {
        return null;
    }

    // En México el número a 10 dígitos empieza en 2-9. "1440014400" nace de $144.00.
    if (
        !/^[2-9]/.test(value)
        || /^(\d)\1{9}$/.test(value)
        || looksLikeJoinedPrices(value)
        || looksLikeDate(value)
    ) {
        return null;
    }

    return value;
}

function stripMoneyAmounts(text: string): string {
    return text
        .replace(/\$\s*/g, ' ')
        .replace(/\b\d{1,6}[.,]\d{2}\b/g, ' ')
        .replace(/\b\d{1,4}\s+00\b/g, ' ');
}

function isPriceOrItemLine(line: string): boolean {
    return /p\.?\s*u\.?|impte|importe|total|pza|m\.?\s*n\.?|rfc|suc\.|domicilio/i.test(line);
}

function addPhone(phones: string[], seen: Set<string>, digits: string): void {
    const phone = toMexicanPhone(digits);
    if (!phone || seen.has(phone)) {
        return;
    }

    seen.add(phone);
    phones.push(phone);
}

function phonesFromDigitRun(run: string): string[] {
    const digits = normalizeOcrChunk(run);
    const phones: string[] = [];
    const seen = new Set<string>();

    if (digits.length < 10) {
        return phones;
    }

    if (digits.length === 10) {
        addPhone(phones, seen, digits);
        return phones;
    }

    // "520" + "9631815092" suele quedar pegado. El teléfono va al final.
    if (digits.length <= 14) {
        addPhone(phones, seen, digits.slice(-10));
        addPhone(phones, seen, digits);
        return phones;
    }

    for (let index = 0; index <= digits.length - 10; index += 1) {
        addPhone(phones, seen, digits.slice(index, index + 10));
    }

    return phones;
}

function collectPhones(text: string): string[] {
    const phones: string[] = [];
    const seen = new Set<string>();
    const cleaned = stripMoneyAmounts(text);
    const runs = cleaned.match(/(?:[\dOoIl|SsBGZQ][ \t-]*){10,16}/g) ?? [];

    for (const run of runs) {
        for (const phone of phonesFromDigitRun(run)) {
            if (seen.has(phone)) {
                continue;
            }

            seen.add(phone);
            phones.push(phone);
        }
    }

    const grouped =
        cleaned.match(
            /[\dOoIl|SsBGZQ]{2,3}[ \t-]+[\dOoIl|SsBGZQ]{3,4}[ \t-]+[\dOoIl|SsBGZQ]{4}/g,
        ) ?? [];

    for (const match of grouped) {
        addPhone(phones, seen, normalizeOcrChunk(match));
    }

    return phones;
}

function sectionAfter(text: string, pattern: RegExp): string | null {
    const parts = text.split(pattern);
    if (parts.length < 2) {
        return null;
    }

    return parts.slice(1).join('\n');
}

function phonesNearDash(text: string): string[] {
    const phones: string[] = [];
    const seen = new Set<string>();
    const matches = stripMoneyAmounts(text).matchAll(/[-–—=]\s*((?:[\dOoIl|][ \t]*){10,12})/g);

    for (const match of matches) {
        const phone = toMexicanPhone(normalizeOcrChunk(match[1] ?? ''));
        if (!phone || seen.has(phone)) {
            continue;
        }

        seen.add(phone);
        phones.push(phone);
    }

    return phones;
}

export function extractClientPhoneFromTicketText(ocrText: string): string | null {
    const text = ocrText.replace(/\r/g, '\n');
    const addressBlock = sectionAfter(text, /direcci[oó0]n\s*:?/i);
    const clientBlock = sectionAfter(text, /cliente\s*:?/i);
    const withoutPriceLines = text
        .split('\n')
        .filter((line) => !isPriceOrItemLine(line))
        .join('\n');

    for (const block of [addressBlock, clientBlock, withoutPriceLines, text]) {
        if (!block) {
            continue;
        }

        const dashed = phonesNearDash(block);
        if (dashed.length > 0) {
            return dashed[0];
        }

        const phones = collectPhones(block);
        if (phones.length > 0) {
            return phones[0];
        }
    }

    return null;
}

export function formatTicketPhone(phone: string): string {
    const digits = onlyDigits(phone);
    if (digits.length !== 10) {
        return phone;
    }

    return `${digits.slice(0, 3)} ${digits.slice(3, 6)} ${digits.slice(6)}`;
}

async function preprocessTicketImage(file: File): Promise<HTMLCanvasElement> {
    const bitmap = await createImageBitmap(file);
    const minWidth = 1600;
    const scale = bitmap.width < minWidth ? minWidth / bitmap.width : 1;
    const canvas = document.createElement('canvas');
    canvas.width = Math.round(bitmap.width * scale);
    canvas.height = Math.round(bitmap.height * scale);
    const ctx = canvas.getContext('2d');

    if (!ctx) {
        bitmap.close();
        return canvas;
    }

    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    bitmap.close();

    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const pixels = imageData.data;
    const grays: number[] = [];
    const sample: number[] = [];

    for (let i = 0; i < pixels.length; i += 4) {
        const gray = 0.299 * pixels[i] + 0.587 * pixels[i + 1] + 0.114 * pixels[i + 2];
        grays.push(gray);
        if (grays.length % 11 === 0) {
            sample.push(gray);
        }
    }

    sample.sort((a, b) => a - b);
    const p5 = sample[Math.floor(sample.length * 0.05)] ?? 0;
    const p95 = sample[Math.floor(sample.length * 0.95)] ?? 255;
    const range = Math.max(p95 - p5, 1);

    for (let i = 0; i < grays.length; i += 1) {
        const stretched = ((grays[i] - p5) / range) * 255;
        const gray = Math.max(0, Math.min(255, stretched));
        const offset = i * 4;
        pixels[offset] = pixels[offset + 1] = pixels[offset + 2] = gray;
        pixels[offset + 3] = 255;
    }

    ctx.putImageData(imageData, 0, 0);
    return canvas;
}

export async function extractClientPhoneFromImage(file: File): Promise<string | null> {
    const canvas = await preprocessTicketImage(file);
    const { createWorker, PSM } = await import('tesseract.js');
    const worker = await createWorker('eng');

    try {
        const passes: Array<Record<string, string>> = [
            {
                tessedit_pageseg_mode: PSM.SINGLE_BLOCK,
                preserve_interword_spaces: '1',
                user_defined_dpi: '300',
                tessedit_char_whitelist: '',
            },
            {
                tessedit_pageseg_mode: PSM.SPARSE_TEXT,
                preserve_interword_spaces: '1',
                user_defined_dpi: '300',
                tessedit_char_whitelist: '',
            },
            {
                tessedit_pageseg_mode: PSM.SINGLE_BLOCK,
                user_defined_dpi: '300',
                tessedit_char_whitelist: '0123456789-+ ',
            },
        ];

        for (const params of passes) {
            await worker.setParameters(params);
            const { data } = await worker.recognize(canvas);
            const phone = extractClientPhoneFromTicketText(data.text ?? '');
            if (phone) {
                return phone;
            }
        }

        return null;
    } finally {
        await worker.terminate();
    }
}
