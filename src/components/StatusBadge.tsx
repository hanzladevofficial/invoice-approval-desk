import { STATUS_LABELS, type InvoiceStatus } from '@/lib/status';

const STYLES: Record<InvoiceStatus, string> = {
  PROCESSING: 'bg-slate-100 text-slate-700 ring-slate-600/10',
  NEEDS_REVIEW: 'bg-amber-100 text-amber-800 ring-amber-600/20',
  APPROVED: 'bg-emerald-100 text-emerald-800 ring-emerald-600/20',
  REJECTED: 'bg-rose-100 text-rose-700 ring-rose-600/10',
};

export function StatusBadge({ status }: { status: InvoiceStatus }) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset ${STYLES[status]}`}
    >
      {STATUS_LABELS[status]}
    </span>
  );
}
