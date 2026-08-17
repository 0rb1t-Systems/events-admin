/** Always show full precision with currency so amount cells never truncate mid-value. */
export function formatMoney(
    amount: number | string | null | undefined,
    currency = "USD"
): string {
    const n = Number(amount ?? 0);
    const value = Number.isFinite(n) ? n.toFixed(2) : "0.00";
    return `${value} ${currency}`;
}
