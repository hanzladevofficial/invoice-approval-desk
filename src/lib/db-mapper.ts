import type { Invoice, StatusHistoryEntry } from './types';

// Raw row shapes as returned by supabase-js (snake_case, matching the SQL columns).
export interface InvoiceRow {
  id: string;
  vendor_name: string;
  vendor_name_normalized: string;
  invoice_number: string;
  invoice_number_normalized: string;
  description: string | null;
  amount_cents: number;
  currency: string;
  invoice_date: string;
  due_date: string;
  status: Invoice['status'];
  review_reason: string | null;
  duplicate_of_id: string | null;
  decision_note: string | null;
  decided_at: string | null;
  version: number;
  created_at: string;
  updated_at: string;
}

export interface HistoryRow {
  id: number;
  from_status: Invoice['status'] | null;
  to_status: Invoice['status'];
  note: string | null;
  actor: string;
  changed_at: string;
}

export function toInvoice(row: InvoiceRow): Invoice {
  return {
    id: row.id,
    vendorName: row.vendor_name,
    invoiceNumber: row.invoice_number,
    description: row.description,
    amountCents: row.amount_cents,
    currency: row.currency,
    invoiceDate: row.invoice_date,
    dueDate: row.due_date,
    status: row.status,
    reviewReason: row.review_reason,
    duplicateOfId: row.duplicate_of_id,
    decisionNote: row.decision_note,
    decidedAt: row.decided_at,
    version: row.version,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function toHistoryEntry(row: HistoryRow): StatusHistoryEntry {
  return {
    id: row.id,
    fromStatus: row.from_status,
    toStatus: row.to_status,
    note: row.note,
    actor: row.actor,
    changedAt: row.changed_at,
  };
}
