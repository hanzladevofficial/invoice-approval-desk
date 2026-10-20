// Strips legal suffixes and punctuation so near-duplicate vendor names match:
// "Acme Supplies Ltd." and "ACME Supplies Limited" normalize to the same key.
const LEGAL_SUFFIXES = /\b(ltd|limited|llc|inc|incorporated|corp|corporation|co|company)\b\.?/gi;

export function normalizeVendorName(name: string): string {
  return name
    .toUpperCase()
    .replace(LEGAL_SUFFIXES, '')
    .replace(/[^A-Z0-9]+/g, ' ')
    .trim()
    .replace(/\s+/g, ' ');
}

export function normalizeInvoiceNumber(invoiceNumber: string): string {
  return invoiceNumber.toUpperCase().replace(/[^A-Z0-9]/g, '');
}
