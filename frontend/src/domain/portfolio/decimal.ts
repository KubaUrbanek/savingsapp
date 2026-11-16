/** Decimal text is validated before conversion; no silent money rounding. */
export function decimalText(value: unknown): string {
  return String(value ?? '')
    .trim()
    .replace(/[\s\u00a0\u202f]/g, '')
    .replace(',', '.');
}
export function moneyInput(value: unknown): number | null {
  const text = decimalText(value);
  if (!/^\d+(?:\.\d{1,2})?$/.test(text)) return null;
  const number = Number(text);
  if (!Number.isSafeInteger(Math.round(number * 100))) return null;
  const cents = (value: string) => {
    const [whole = '0', fraction = ''] = value.split('.');
    return BigInt(whole) * 100n + BigInt(fraction.padEnd(2, '0'));
  };
  // A safe integer after multiplication alone can still lose a cent in JSON serialization.
  return cents(text) === cents(String(number)) ? number : null;
}
export function percentageTotal(values: unknown[]): string | null {
  const texts = values.map(decimalText);
  if (
    texts.some(
      (text) =>
        !/^\d+(?:\.\d+)?$/.test(text) || Number(text) > 100 || (text.split('.')[1]?.replace(/0+$/, '').length ?? 0) > 50
    )
  )
    return null;
  const scale = Math.max(0, ...texts.map((text) => text.split('.')[1]?.length ?? 0));
  const total = texts.reduce(
    (sum, text) => sum + BigInt(text.replace('.', '') + '0'.repeat(scale - (text.split('.')[1]?.length ?? 0))),
    0n
  );
  const digits = total.toString().padStart(scale + 1, '0');
  return scale ? (digits.slice(0, -scale) + '.' + digits.slice(-scale)).replace(/\.?0+$/, '') || '0' : digits;
}
