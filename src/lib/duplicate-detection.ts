import { distance } from 'fastest-levenshtein';

// How many single-character edits (insert/delete/substitute) still count as
// "the same value, probably typo'd" rather than a genuinely different one.
// Invoice numbers are short and dense — even one stray character changes
// what it refers to — so it gets a tighter budget than the vendor name.
const VENDOR_NAME_MAX_DISTANCE = 2;
const INVOICE_NUMBER_MAX_DISTANCE = 1;

export interface DuplicateCandidate {
  id: string;
  vendorName: string;
  invoiceNumber: string;
  vendorNameNormalized: string;
  invoiceNumberNormalized: string;
}

export interface DuplicateMatch {
  candidate: DuplicateCandidate;
  exact: boolean;
}

// Finds the first existing invoice that's either an exact normalized match
// or close enough on both fields to be the same bill with a typo. Never
// returns a fuzzy match on only one field — a typo'd invoice number from an
// unrelated vendor, or vice versa, isn't a duplicate.
export function findDuplicate(
  vendorNameNormalized: string,
  invoiceNumberNormalized: string,
  candidates: DuplicateCandidate[],
): DuplicateMatch | null {
  for (const candidate of candidates) {
    const vendorDistance = distance(vendorNameNormalized, candidate.vendorNameNormalized);
    const invoiceNumberDistance = distance(invoiceNumberNormalized, candidate.invoiceNumberNormalized);

    if (vendorDistance === 0 && invoiceNumberDistance === 0) {
      return { candidate, exact: true };
    }
    if (vendorDistance <= VENDOR_NAME_MAX_DISTANCE && invoiceNumberDistance <= INVOICE_NUMBER_MAX_DISTANCE) {
      return { candidate, exact: false };
    }
  }
  return null;
}
