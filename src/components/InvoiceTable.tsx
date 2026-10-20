import { StatusBadge } from './StatusBadge';
import { formatMoney } from '@/lib/money';
import type { Invoice } from '@/lib/types';

function formatDate(iso: string) {
  return new Date(iso + 'T00:00:00').toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

export function InvoiceTable({
  invoices,
  selectedId,
  onSelect,
  emptyLabel,
}: {
  invoices: Invoice[];
  selectedId?: string;
  onSelect: (id: string) => void;
  emptyLabel: string;
}) {
  if (invoices.length === 0) {
    return (
      <div className="flex flex-1 items-center justify-center py-24 text-sm text-slate-400">
        {emptyLabel}
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left text-sm">
        <thead className="border-b border-slate-200 text-xs text-slate-500">
          <tr>
            <th className="px-3 py-2.5 font-medium sm:px-4">Vendor</th>
            <th className="hidden px-4 py-2.5 font-medium sm:table-cell">Invoice #</th>
            <th className="hidden px-4 py-2.5 font-medium md:table-cell">Due date</th>
            <th className="px-3 py-2.5 text-right font-medium sm:px-4">Amount</th>
            <th className="px-3 py-2.5 font-medium sm:px-4">Status</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {invoices.map((invoice) => (
            <tr
              key={invoice.id}
              tabIndex={0}
              onClick={() => onSelect(invoice.id)}
              onKeyDown={(e) => e.key === 'Enter' && onSelect(invoice.id)}
              aria-selected={invoice.id === selectedId}
              className={`cursor-pointer outline-none transition-colors hover:bg-slate-50 focus-visible:bg-slate-50 ${
                invoice.id === selectedId ? 'bg-slate-50' : ''
              }`}
            >
              <td className="px-3 py-3 font-medium text-slate-900 sm:px-4">
                {invoice.vendorName}
                <span className="block text-xs font-normal text-slate-400 sm:hidden">
                  {invoice.invoiceNumber}
                </span>
              </td>
              <td className="hidden px-4 py-3 text-slate-500 sm:table-cell">{invoice.invoiceNumber}</td>
              <td className="hidden px-4 py-3 text-slate-500 md:table-cell">{formatDate(invoice.dueDate)}</td>
              <td className="px-3 py-3 text-right tabular-nums text-slate-900 sm:px-4">
                {formatMoney(invoice.amountCents, invoice.currency)}
              </td>
              <td className="px-3 py-3 sm:px-4">
                <StatusBadge status={invoice.status} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function InvoiceTableSkeleton() {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left text-sm">
        <thead className="border-b border-slate-200 text-xs text-slate-500">
          <tr>
            <th className="px-3 py-2.5 font-medium sm:px-4">Vendor</th>
            <th className="hidden px-4 py-2.5 font-medium sm:table-cell">Invoice #</th>
            <th className="hidden px-4 py-2.5 font-medium md:table-cell">Due date</th>
            <th className="px-3 py-2.5 text-right font-medium sm:px-4">Amount</th>
            <th className="px-3 py-2.5 font-medium sm:px-4">Status</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {Array.from({ length: 5 }).map((_, i) => (
            <tr key={i} className="animate-pulse">
              <td className="px-3 py-3 sm:px-4">
                <div className="h-4 w-32 rounded bg-slate-100" />
                <div className="mt-1.5 h-3 w-16 rounded bg-slate-100 sm:hidden" />
              </td>
              <td className="hidden px-4 py-3 sm:table-cell">
                <div className="h-4 w-16 rounded bg-slate-100" />
              </td>
              <td className="hidden px-4 py-3 md:table-cell">
                <div className="h-4 w-20 rounded bg-slate-100" />
              </td>
              <td className="px-3 py-3 sm:px-4">
                <div className="ml-auto h-4 w-16 rounded bg-slate-100" />
              </td>
              <td className="px-3 py-3 sm:px-4">
                <div className="h-5 w-20 rounded-full bg-slate-100" />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
