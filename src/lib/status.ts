export type InvoiceStatus = 'PROCESSING' | 'NEEDS_REVIEW' | 'APPROVED' | 'REJECTED';

export const STATUSES: InvoiceStatus[] = ['PROCESSING', 'NEEDS_REVIEW', 'APPROVED', 'REJECTED'];

export const STATUS_LABELS: Record<InvoiceStatus, string> = {
  PROCESSING: 'Processing',
  NEEDS_REVIEW: 'Needs review',
  APPROVED: 'Approved',
  REJECTED: 'Rejected',
};

export type InvoiceTab = 'processing' | 'needs_review' | 'decided';

export const INVOICE_TABS: { key: InvoiceTab; label: string; statuses: InvoiceStatus[] }[] = [
  { key: 'processing', label: 'Processing', statuses: ['PROCESSING'] },
  { key: 'needs_review', label: 'Needs review', statuses: ['NEEDS_REVIEW'] },
  { key: 'decided', label: 'Approved / Rejected', statuses: ['APPROVED', 'REJECTED'] },
];

// The single source of truth for legal status transitions. Enforced by the
// API (PATCH /api/invoices/:id/status) and read by the UI to decide which
// actions to show, so the two can never disagree.
const TRANSITIONS: Record<InvoiceStatus, InvoiceStatus[]> = {
  PROCESSING: ['APPROVED', 'REJECTED'],
  NEEDS_REVIEW: ['APPROVED', 'REJECTED'],
  APPROVED: [],
  REJECTED: [],
};

export function allowedTransitions(from: InvoiceStatus): InvoiceStatus[] {
  return TRANSITIONS[from];
}

export function canTransition(from: InvoiceStatus, to: InvoiceStatus): boolean {
  return TRANSITIONS[from].includes(to);
}

export function isTerminal(status: InvoiceStatus): boolean {
  return TRANSITIONS[status].length === 0;
}
