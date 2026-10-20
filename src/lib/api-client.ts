import type { Invoice, InvoiceDetail, InvoiceListResponse, ProblemDetails } from './types';
import type { InvoiceStatus, InvoiceTab } from './status';

export class ApiError extends Error {
  constructor(public problem: ProblemDetails) {
    super(problem.detail);
  }
}

async function unwrap<T>(response: Response): Promise<T> {
  const body = await response.json();
  if (!response.ok) throw new ApiError(body as ProblemDetails);
  return body as T;
}

// Error codes whose `detail` text is written to be shown to a reviewer
// (e.g. "Invoice is already APPROVED"). Anything else — a network failure,
// a thrown exception that isn't an ApiError, or an error code not on this
// list — falls back to a generic message instead. This is an allowlist, not
// a denylist: a new/forgotten error code fails closed (generic message)
// rather than failing open (leaking whatever text it happens to carry).
const USER_SAFE_CODES = new Set<ProblemDetails['code']>([
  'VALIDATION_ERROR',
  'NOT_FOUND',
  'INVALID_TRANSITION',
  'VERSION_CONFLICT',
]);

const DEFAULT_FALLBACK = 'Something went wrong. Please try again.';

// Single place every catch block in the app goes through to turn an error
// into UI text, so an internal/unexpected error (a DB error, a network
// failure, a bug) never reaches the user as raw text — only ever this
// fallback, or a message the server explicitly wrote for display. Covers
// Next.js's "expected errors" category (caught in event handlers); actual
// uncaught exceptions are handled separately by app/error.tsx.
export function getUserMessage(error: unknown, fallback: string = DEFAULT_FALLBACK): string {
  if (error instanceof ApiError && USER_SAFE_CODES.has(error.problem.code)) {
    return error.problem.detail;
  }
  return fallback;
}

export function fetchInvoices(tab: InvoiceTab, page: number, pageSize: number): Promise<InvoiceListResponse> {
  return fetch(`/api/invoices?tab=${tab}&page=${page}&pageSize=${pageSize}`).then((r) =>
    unwrap<InvoiceListResponse>(r),
  );
}

export function fetchInvoiceDetail(id: string): Promise<InvoiceDetail> {
  return fetch(`/api/invoices/${id}`).then((r) => unwrap<InvoiceDetail>(r));
}

export function updateInvoiceStatus(
  id: string,
  body: { status: InvoiceStatus; note?: string; version: number },
): Promise<Invoice> {
  return fetch(`/api/invoices/${id}/status`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  }).then((r) => unwrap<Invoice>(r));
}
