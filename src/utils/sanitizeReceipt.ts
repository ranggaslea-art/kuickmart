/**
 * Utility to sanitize receipt text and addresses
 * Removes "Jakarta Selatan" and "Jakarta Pusat" (case-insensitive) cleanly.
 */
export function cleanReceiptText(text?: string | null): string {
  if (!text) return '';
  return text
    .replace(/,\s*Jakarta\s*Selatan/gi, '')
    .replace(/Jakarta\s*Selatan/gi, '')
    .replace(/,\s*Jakarta\s*Pusat/gi, '')
    .replace(/Jakarta\s*Pusat/gi, '')
    .replace(/,\s*,/g, ',')
    .replace(/\s{2,}/g, ' ')
    .trim()
    .replace(/^,|,$/g, '')
    .trim();
}
