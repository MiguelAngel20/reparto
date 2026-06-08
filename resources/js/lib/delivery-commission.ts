export function sumListPrices(items: { price: string }[]): number {
    return items.reduce((sum, item) => sum + (parseFloat(item.price) || 0), 0);
}

export function calculatePurchaseCharge(purchaseAmount: number, serviceCost: number) {
    return Math.round((purchaseAmount + serviceCost) * 100) / 100;
}

export function calculateCommission(serviceCost: number, percentage: number) {
    const userCommission = Math.round(serviceCost * (percentage / 100) * 100) / 100;
    const clikioCommission = Math.round((serviceCost - userCommission) * 100) / 100;

    return { userCommission, clikioCommission };
}

export function formatDuration(seconds: number): string {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;

    if (h > 0) {
        return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
    }

    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}
