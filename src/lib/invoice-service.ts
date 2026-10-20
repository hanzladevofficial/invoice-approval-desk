import { supabaseAdmin } from './supabase/server';
import { toInvoice, toHistoryEntry, type InvoiceRow, type HistoryRow } from './db-mapper';
import { allowedTransitions, INVOICE_TABS, STATUSES, type InvoiceStatus, type InvoiceTab } from './status';
import { NotFoundError, InvalidTransitionError, VersionConflictError } from './errors';
import type { Invoice, InvoiceDetail, InvoiceListResponse, StatusCounts } from './types';

export async function listInvoices(filter: {
  tab?: InvoiceTab;
  statuses?: InvoiceStatus[];
  page: number;
  pageSize: number;
}): Promise<InvoiceListResponse> {
  let query = supabaseAdmin
    .from('invoices')
    .select('*', { count: 'exact' })
    .order('created_at', { ascending: false });

  const statuses = filter.tab
    ? INVOICE_TABS.find((t) => t.key === filter.tab)?.statuses
    : filter.statuses;

  if (statuses?.length) {
    query = query.in('status', statuses);
  }

  const from = (filter.page - 1) * filter.pageSize;
  const to = from + filter.pageSize - 1;
  query = query.range(from, to);

  const { data, error, count } = await query;
  if (error) throw error;

  const rows = (data ?? []) as InvoiceRow[];
  const counts = await getStatusCounts();
  const total = count ?? 0;

  return {
    data: rows.map(toInvoice),
    meta: {
      total,
      counts,
      page: filter.page,
      pageSize: filter.pageSize,
      totalPages: Math.max(1, Math.ceil(total / filter.pageSize)),
    },
  };
}

async function getStatusCounts(): Promise<StatusCounts> {
  const { data, error } = await supabaseAdmin.from('invoices').select('status');
  if (error) throw error;

  const counts = Object.fromEntries(STATUSES.map((s) => [s, 0])) as StatusCounts;
  for (const row of data ?? []) {
    counts[row.status as InvoiceStatus]++;
  }
  return counts;
}

export async function getInvoiceDetail(id: string): Promise<InvoiceDetail> {
  const { data: invoiceRow, error: invoiceError } = await supabaseAdmin
    .from('invoices')
    .select('*')
    .eq('id', id)
    .maybeSingle();

  if (invoiceError) throw invoiceError;
  if (!invoiceRow) throw new NotFoundError();

  const row = invoiceRow as InvoiceRow;

  const { data: historyData, error: historyError } = await supabaseAdmin
    .from('invoice_status_history')
    .select('*')
    .eq('invoice_id', id)
    .order('changed_at', { ascending: true });
  if (historyError) throw historyError;

  let duplicateOf: InvoiceDetail['duplicateOf'] = null;
  if (row.duplicate_of_id) {
    const { data: originalRow } = await supabaseAdmin
      .from('invoices')
      .select('id, vendor_name, invoice_number, status')
      .eq('id', row.duplicate_of_id)
      .maybeSingle();
    if (originalRow) {
      duplicateOf = {
        id: originalRow.id,
        vendorName: originalRow.vendor_name,
        invoiceNumber: originalRow.invoice_number,
        status: originalRow.status,
      };
    }
  }

  return {
    ...toInvoice(row),
    history: ((historyData ?? []) as HistoryRow[]).map(toHistoryEntry),
    duplicateOf,
  };
}

export async function updateInvoiceStatus(
  id: string,
  input: { status: InvoiceStatus; note?: string; version: number },
): Promise<Invoice> {
  const { data, error } = await supabaseAdmin.rpc('update_invoice_status', {
    p_id: id,
    p_expected_version: input.version,
    p_to_status: input.status,
    p_note: input.note ?? null,
    p_actor: 'reviewer',
  });

  if (error) {
    const message = error.message ?? '';
    if (message.includes('invoice_not_found')) throw new NotFoundError();

    const versionConflict = message.match(/version_conflict:(\d+),(\d+)/);
    if (versionConflict) {
      throw new VersionConflictError(Number(versionConflict[2]), Number(versionConflict[1]));
    }

    const invalidTransition = message.match(/invalid_transition:(\w+),(\w+)/);
    if (invalidTransition) {
      const current = invalidTransition[1] as InvoiceStatus;
      throw new InvalidTransitionError(current, invalidTransition[2] as InvoiceStatus, allowedTransitions(current));
    }

    throw error;
  }

  return toInvoice(data as InvoiceRow);
}
