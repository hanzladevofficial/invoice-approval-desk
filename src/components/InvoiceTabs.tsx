import { INVOICE_TABS, type InvoiceTab } from '@/lib/status';
import type { StatusCounts } from '@/lib/types';

function countFor(tab: (typeof INVOICE_TABS)[number], counts: StatusCounts | undefined) {
  if (!counts) return undefined;
  return tab.statuses.reduce((sum, status) => sum + counts[status], 0);
}

export function InvoiceTabs({
  active,
  counts,
  onChange,
}: {
  active: InvoiceTab;
  counts?: StatusCounts;
  onChange: (tab: InvoiceTab) => void;
}) {
  return (
    <div role="tablist" aria-label="Invoice status" className="flex gap-1 border-b border-slate-200">
      {INVOICE_TABS.map((tab) => {
        const isActive = tab.key === active;
        const count = countFor(tab, counts);
        return (
          <button
            key={tab.key}
            role="tab"
            aria-selected={isActive}
            onClick={() => onChange(tab.key)}
            className={`relative px-4 py-2.5 text-sm font-medium transition-colors cursor-pointer ${
              isActive ? 'text-slate-900' : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            <span className="flex items-center gap-2">
              {tab.label}
              {count !== undefined && (
                <span
                  className={`rounded-full px-1.5 py-0.5 text-xs tabular-nums ${
                    isActive ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-500'
                  }`}
                >
                  {count}
                </span>
              )}
            </span>
            {isActive && <span className="absolute inset-x-0 -bottom-px h-0.5 rounded-full bg-slate-900" />}
          </button>
        );
      })}
    </div>
  );
}
