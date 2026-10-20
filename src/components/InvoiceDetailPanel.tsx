'use client';

import { useEffect, useRef, useState } from 'react';
import { StatusBadge } from './StatusBadge';
import { formatMoney } from '@/lib/money';
import { isTerminal } from '@/lib/status';
import { getUserMessage } from '@/lib/api-client';
import type { InvoiceDetail } from '@/lib/types';

function formatDate(iso: string) {
  return new Date(iso + 'T00:00:00').toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function formatDateTime(iso: string) {
  return new Date(iso).toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

export function InvoiceDetailPanel({
  invoice,
  loading,
  onClose,
  onDecide,
  onSelectDuplicateOf,
}: {
  invoice: InvoiceDetail | null;
  loading: boolean;
  onClose: () => void;
  onDecide: (status: 'APPROVED' | 'REJECTED', note?: string) => Promise<void>;
  onSelectDuplicateOf: (id: string) => void;
}) {
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    panelRef.current?.focus();
  }, [invoice?.id]);

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [onClose]);

  if (!invoice && !loading) return null;

  return (
    <div
      ref={panelRef}
      tabIndex={-1}
      role="dialog"
      aria-label={invoice ? `Invoice ${invoice.invoiceNumber} details` : 'Invoice details'}
      className="flex h-full w-full flex-col overflow-y-auto bg-white outline-none"
    >
      <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
        <h2 className="text-sm font-semibold text-slate-900">Invoice details</h2>
        <button
          onClick={onClose}
          aria-label="Close"
          className="rounded-md p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600 cursor-pointer"
        >
          ✕
        </button>
      </div>

      {loading || !invoice ? (
        <div className="flex-1 animate-pulse space-y-4 p-5">
          <div className="h-5 w-2/3 rounded bg-slate-100" />
          <div className="h-4 w-1/3 rounded bg-slate-100" />
          <div className="h-20 rounded bg-slate-100" />
        </div>
      ) : (
        <div className="flex flex-1 flex-col gap-6 p-5">
          <div>
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-base font-semibold text-slate-900">{invoice.vendorName}</p>
                <p className="text-sm text-slate-500">{invoice.invoiceNumber}</p>
              </div>
              <StatusBadge status={invoice.status} />
            </div>
            {invoice.description && <p className="mt-2 text-sm text-slate-600">{invoice.description}</p>}
          </div>

          <dl className="grid grid-cols-2 gap-x-4 gap-y-3 rounded-lg bg-slate-50 p-4 text-sm">
            <div>
              <dt className="text-xs text-slate-500">Amount</dt>
              <dd className="font-medium tabular-nums text-slate-900">
                {formatMoney(invoice.amountCents, invoice.currency)}
              </dd>
            </div>
            <div>
              <dt className="text-xs text-slate-500">Currency</dt>
              <dd className="font-medium text-slate-900">{invoice.currency}</dd>
            </div>
            <div>
              <dt className="text-xs text-slate-500">Invoice date</dt>
              <dd className="font-medium text-slate-900">{formatDate(invoice.invoiceDate)}</dd>
            </div>
            <div>
              <dt className="text-xs text-slate-500">Due date</dt>
              <dd className="font-medium text-slate-900">{formatDate(invoice.dueDate)}</dd>
            </div>
          </dl>

          {invoice.duplicateOf && (
            <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm">
              <p className="font-medium text-amber-900">Possible duplicate</p>
              <p className="mt-1 text-amber-800">{invoice.reviewReason}</p>
              <button
                onClick={() => onSelectDuplicateOf(invoice.duplicateOf!.id)}
                className="mt-2 text-sm font-medium text-amber-900 underline underline-offset-2 cursor-pointer"
              >
                View original invoice →
              </button>
            </div>
          )}

          {invoice.status === 'REJECTED' && invoice.decisionNote && (
            <div className="rounded-lg border border-rose-200 bg-rose-50 p-4 text-sm">
              <p className="font-medium text-rose-900">Rejection reason</p>
              <p className="mt-1 text-rose-800">{invoice.decisionNote}</p>
            </div>
          )}

          {!isTerminal(invoice.status) && (
            // Keyed by invoice id so the reject-form's local state (draft
            // note, "rejecting" mode) resets via remount when a different
            // invoice is opened, rather than needing an effect to reset it.
            <DecisionActions key={invoice.id} onDecide={onDecide} />
          )}

          <div className="border-t border-slate-100 pt-5">
            <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500">History</h3>
            <ol className="mt-3 space-y-3">
              {invoice.history.map((entry) => (
                <li key={entry.id} className="flex items-start gap-3 text-sm">
                  <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-slate-300" />
                  <div>
                    <p className="text-slate-700">
                      {entry.fromStatus ? (
                        <>
                          <StatusLabel status={entry.fromStatus} /> → <StatusLabel status={entry.toStatus} />
                        </>
                      ) : (
                        <>
                          Received as <StatusLabel status={entry.toStatus} />
                        </>
                      )}
                    </p>
                    {entry.note && <p className="text-slate-500">&ldquo;{entry.note}&rdquo;</p>}
                    <p className="text-xs text-slate-400">
                      {formatDateTime(entry.changedAt)} · {entry.actor}
                    </p>
                  </div>
                </li>
              ))}
            </ol>
          </div>
        </div>
      )}
    </div>
  );
}

function DecisionActions({
  onDecide,
}: {
  onDecide: (status: 'APPROVED' | 'REJECTED', note?: string) => Promise<void>;
}) {
  const [rejecting, setRejecting] = useState(false);
  const [note, setNote] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleApprove() {
    setSubmitting(true);
    setError(null);
    try {
      await onDecide('APPROVED');
    } catch (err) {
      setError(getUserMessage(err));
      setSubmitting(false);
    }
  }

  async function handleReject() {
    if (!note.trim()) return;
    setSubmitting(true);
    setError(null);
    try {
      await onDecide('REJECTED', note.trim());
    } catch (err) {
      setError(getUserMessage(err));
      setSubmitting(false);
    }
  }

  return (
    <div className="space-y-3 border-t border-slate-100 pt-5">
      {error && <p className="rounded-md bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</p>}

      {!rejecting ? (
        <div className="flex gap-2">
          <button
            onClick={handleApprove}
            disabled={submitting}
            className="flex-1 rounded-md bg-emerald-600 px-3 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-50 cursor-pointer"
          >
            {submitting ? 'Approving…' : 'Approve'}
          </button>
          <button
            onClick={() => setRejecting(true)}
            disabled={submitting}
            className="flex-1 rounded-md border border-rose-200 bg-white px-3 py-2 text-sm font-medium text-rose-700 hover:bg-rose-50 disabled:opacity-50 cursor-pointer"
          >
            Reject
          </button>
        </div>
      ) : (
        <div className="space-y-2">
          <label htmlFor="reject-note" className="text-xs font-medium text-slate-600">
            Reason for rejection
          </label>
          <textarea
            id="reject-note"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            rows={3}
            maxLength={500}
            placeholder="Why is this invoice being rejected?"
            className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm outline-none focus:border-slate-400"
          />
          <div className="flex gap-2">
            <button
              onClick={handleReject}
              disabled={submitting || !note.trim()}
              className="flex-1 rounded-md bg-rose-600 px-3 py-2 text-sm font-medium text-white hover:bg-rose-700 disabled:opacity-50 cursor-pointer"
            >
              {submitting ? 'Rejecting…' : 'Confirm rejection'}
            </button>
            <button
              onClick={() => {
                setRejecting(false);
                setNote('');
              }}
              disabled={submitting}
              className="rounded-md border border-slate-200 px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50 cursor-pointer"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function StatusLabel({ status }: { status: InvoiceDetail['status'] }) {
  return <span className="font-medium">{status.replace('_', ' ').toLowerCase()}</span>;
}
