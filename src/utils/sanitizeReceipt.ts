/**
 * Utility to sanitize and format receipt text and addresses safely
 * Preserves user-inputted addresses, cities, and words without stripping any user data.
 */
export function cleanReceiptText(text?: string | null): string {
  if (!text) return '';
  return text.trim();
}

/**
 * Formats full receipt address based strictly on user input in Modul Struk.
 * Combines address and city without duplicating the city name if already present in address.
 */
export function formatReceiptAddress(config?: { address?: string | null; city?: string | null } | null): string {
  if (!config) return '';
  const addr = (config.address || '').trim();
  const city = (config.city || '').trim();

  if (addr && city) {
    if (addr.toLowerCase().includes(city.toLowerCase())) {
      return addr;
    }
    return `${addr}, ${city}`;
  }
  return addr || city || '';
}
