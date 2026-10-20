import type { InvoiceStatus } from './status';

export interface Invoice {
  id: string;
  vendorName: string;
  invoiceNumber: string;
  description: string | null;
  amountCents: number;
  currency: string;
  invoiceDate: string;
  dueDate: string;
  status: InvoiceStatus;
  reviewReason: string | null;
  duplicateOfId: string | null;
  decisionNote: string | null;
  decidedAt: string | null;
  version: number;
  createdAt: string;
  updatedAt: string;
}

export interface StatusHistoryEntry {
  id: number;
  fromStatus: InvoiceStatus | null;
  toStatus: InvoiceStatus;
  note: string | null;
  actor: string;
  changedAt: string;
}

export interface InvoiceDetail extends Invoice {
  history: StatusHistoryEntry[];
  duplicateOf: Pick<Invoice, 'id' | 'vendorName' | 'invoiceNumber' | 'status'> | null;
}

export type StatusCounts = Record<InvoiceStatus, number>;

export interface InvoiceListResponse {
  data: Invoice[];
  meta: { total: number; counts: StatusCounts; page: number; pageSize: number; totalPages: number };
}

export interface ErrorCode {
  code:
    | 'VALIDATION_ERROR'
    | 'NOT_FOUND'
    | 'INVALID_TRANSITION'
    | 'VERSION_CONFLICT'
    | 'INTERNAL_ERROR';
}

export interface ProblemDetails {
  type: string;
  title: string;
  status: number;
  detail: string;
  code: ErrorCode['code'];
  errors?: { path: string; message: string }[];
  currentStatus?: InvoiceStatus;
  requestedStatus?: InvoiceStatus;
  allowed?: InvoiceStatus[];
  expectedVersion?: number;
  currentVersion?: number;
}
