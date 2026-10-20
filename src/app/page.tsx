'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { InvoiceTabs } from '@/components/InvoiceTabs';
import { InvoiceTable, InvoiceTableSkeleton } from '@/components/InvoiceTable';
import { InvoiceDetailPanel } from '@/components/InvoiceDetailPanel';
import { Toast } from '@/components/Toast';
import { fetchInvoices, fetchInvoiceDetail, updateInvoiceStatus, getUserMessage } from '@/lib/api-client';
import type { InvoiceTab } from '@/lib/status';
import type { Invoice, InvoiceDetail, StatusCounts } from '@/lib/types';

const EMPTY_LABELS: Record<InvoiceTab, string> = {
  processing: 'No invoices waiting to be processed.',
  needs_review: 'Nothing flagged for review right now.',
  decided: 'No decisions have been made yet.',
};

const WEB_PAGE_SIZE = 10;
const MOBILE_PAGE_SIZE = 5;

function usePageSize() {
  const [pageSize, setPageSize] = useState(WEB_PAGE_SIZE);

  useEffect(() => {
    const mql = window.matchMedia('(min-width: 640px)');
    const sync = () => setPageSize(mql.matches ? WEB_PAGE_SIZE : MOBILE_PAGE_SIZE);
    sync();
    mql.addEventListener('change', sync);
    return () => mql.removeEventListener('change', sync);
  }, []);

  return pageSize;
}

export default function Home() {
  const [tab, setTab] = useState<InvoiceTab>('processing');
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [counts, setCounts] = useState<StatusCounts>();
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalInTab, setTotalInTab] = useState(0);
  const [listLoading, setListLoading] = useState(true);
  const [listError, setListError] = useState<string | null>(null);

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [detail, setDetail] = useState<InvoiceDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  const [toast, setToast] = useState<{ message: string; tone: 'success' | 'error' } | null>(null);

  const pageSize = usePageSize();

  const loadList = useCallback((currentTab: InvoiceTab, currentPage: number, currentPageSize: number) => {
    setListLoading(true);
    setListError(null);
    fetchInvoices(currentTab, currentPage, currentPageSize)
      .then((res) => {
        // The current page can go stale (e.g. the last invoice on the last
        // page just got decided and moved to a different tab) — step back
        // one page rather than showing an empty page that isn't actually page 1.
        if (res.data.length === 0 && currentPage > 1) {
          setPage(currentPage - 1);
          return;
        }
        setInvoices(res.data);
        setCounts(res.meta.counts);
        setTotalPages(res.meta.totalPages);
        setTotalInTab(res.meta.total);
      })
      .catch((err) => setListError(getUserMessage(err, 'Failed to load invoices.')))
      .finally(() => setListLoading(false));
  }, []);

  useEffect(() => {
    // Synchronizing with the server on tab/page change — the React-docs
    // pattern for data fetching in an effect, which necessarily sets loading
    // state synchronously before the fetch resolves.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadList(tab, page, pageSize);
  }, [tab, page, pageSize, loadList]);

  const prevPageSize = useRef(pageSize);
  useEffect(() => {
    // Crossing the mobile/desktop breakpoint changes page size, so page 2 at
    // the old size may no longer mean anything — jump back to page 1.
    if (prevPageSize.current !== pageSize) {
      prevPageSize.current = pageSize;
      setPage(1);
    }
  }, [pageSize]);

  function changeTab(nextTab: InvoiceTab) {
    setTab(nextTab);
    setPage(1);
  }

  const openInvoice = useCallback((id: string) => {
    setSelectedId(id);
    setDetailLoading(true);
    fetchInvoiceDetail(id)
      .then(setDetail)
      .catch((err) =>
        setToast({ message: getUserMessage(err, 'Failed to load invoice details.'), tone: 'error' }),
      )
      .finally(() => setDetailLoading(false));
  }, []);

  async function handleDecide(status: 'APPROVED' | 'REJECTED', note?: string) {
    if (!detail) return;
    await updateInvoiceStatus(detail.id, { status, note, version: detail.version });
    setToast({ message: `Invoice ${status === 'APPROVED' ? 'approved' : 'rejected'}.`, tone: 'success' });
    setSelectedId(null);
    setDetail(null);
    loadList(tab, page, pageSize);
  }

  const rangeStart = totalInTab === 0 ? 0 : (page - 1) * pageSize + 1;
  const rangeEnd = Math.min(page * pageSize, totalInTab);

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-1 flex-col px-4 py-6 sm:px-6 sm:py-8">
      <header className="mb-4 sm:mb-6">
        <h1 className="text-lg font-semibold text-slate-900 sm:text-xl">Invoice approval desk</h1>
        <p className="mt-1 text-sm text-slate-500">Review incoming invoices and decide what gets paid.</p>
      </header>

      <div className="flex flex-1 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        {/* On mobile, the list and the detail panel are mutually exclusive full-width
            views; from md up they sit side by side. */}
        <div
          className={`min-w-0 flex-1 flex-col ${selectedId ? 'hidden md:flex' : 'flex'}`}
        >
          <div className="overflow-x-auto px-2">
            <InvoiceTabs active={tab} counts={counts} onChange={changeTab} />
          </div>

          <div className="flex-1 overflow-y-auto">
            {listLoading ? (
              <InvoiceTableSkeleton />
            ) : listError ? (
              <div className="flex flex-1 items-center justify-center py-24 text-sm text-rose-600">
                {listError}
              </div>
            ) : (
              <InvoiceTable
                invoices={invoices}
                selectedId={selectedId ?? undefined}
                onSelect={openInvoice}
                emptyLabel={EMPTY_LABELS[tab]}
              />
            )}
          </div>

          {!listLoading && !listError && totalInTab > 0 && (
            <div className="flex items-center justify-between border-t border-slate-100 px-4 py-2.5 text-sm text-slate-500">
              <span>
                {rangeStart}–{rangeEnd} of {totalInTab}
              </span>
              <div className="flex gap-1">
                <button
                  onClick={() => setPage((p) => p - 1)}
                  disabled={page <= 1}
                  className="rounded-md border border-slate-200 px-2.5 py-1 font-medium text-slate-600 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40 cursor-pointer"
                >
                  Prev
                </button>
                <span className="px-1 tabular-nums">
                  {page} / {totalPages}
                </span>
                <button
                  onClick={() => setPage((p) => p + 1)}
                  disabled={page >= totalPages}
                  className="rounded-md border border-slate-200 px-2.5 py-1 font-medium text-slate-600 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40 cursor-pointer"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>

        {selectedId && (
          <div className="w-full shrink-0 md:w-[26rem] md:border-l md:border-slate-200">
            <InvoiceDetailPanel
              invoice={detail}
              loading={detailLoading}
              onClose={() => {
                setSelectedId(null);
                setDetail(null);
              }}
              onDecide={handleDecide}
              onSelectDuplicateOf={openInvoice}
            />
          </div>
        )}
      </div>

      {toast && <Toast message={toast.message} tone={toast.tone} onDismiss={() => setToast(null)} />}
    </div>
  );
}
