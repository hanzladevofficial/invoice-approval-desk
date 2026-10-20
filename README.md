# Invoice Approval Desk

A mini accounts-payable tool: invoices land in **Processing**, possible duplicates get routed to **Needs review**, and a reviewer approves or rejects each one. Built as a single Next.js app — API routes and UI together — backed by Supabase (Postgres).

## Stack

TypeScript, Next.js (App Router, Route Handlers as the API), Tailwind, Supabase/Postgres. No separate backend service — see [Project structure](#project-structure).

## Setup

1. **Install deps**
   ```bash
   npm install
   ```
2. **Create a Supabase project**, then copy `.env.example` to `.env.local` and fill in:
   - `NEXT_PUBLIC_SUPABASE_URL` — Settings → API
   - `SUPABASE_SERVICE_ROLE_KEY` — Settings → API Keys → **Secret key** (not the publishable one — this must stay server-side)
3. **Create the schema**: open the Supabase SQL Editor and run [`supabase/schema.sql`](supabase/schema.sql).
4. **Seed sample data**:
   ```bash
   npm run db:seed
   ```
   Inserts 6 invoices, one a deliberate duplicate (different formatting of the same vendor/invoice number), caught by the real duplicate-detection logic rather than hardcoded.
5. **Run it**:
   ```bash
   npm run dev
   ```
   → http://localhost:3000

Other commands: `npm run typecheck`, `npm run lint`, `npm run build`.

## What's in the box

- **Three tabs** with live counts: Processing, Needs review, Approved / Rejected. Paginated (10 per page on web, 5 on mobile) so the list stays usable as invoices pile up.
- **Detail panel** (not a separate page) with amounts, dates, full status history, and a link to the original invoice when a duplicate is flagged.
- **Approve / Reject**, persisted to Postgres. Rejecting requires a reason. Decided invoices are final.
- **Duplicate detection**: normalizes vendor name + invoice number so formatting differences don't slip through, and catches typos too (edit-distance match via `fastest-levenshtein`), not just exact repeats.
- **Concurrency safety**: the status update is row-locked and atomic with its audit entry (one Postgres function); a stale client gets a `409` instead of silently overwriting another reviewer's decision.
- Responsive: the list and the detail panel are two full-width views on mobile, side by side from tablet width up.

## API

Base path `/api`. Full writeup of the schema and status rules: [`docs/SCHEMA_AND_STATUS.md`](docs/SCHEMA_AND_STATUS.md).

| Method  | Path                   | Description                    |
| ------- | ---------------------- | -------------------------------- |
| `GET`   | `/invoices`            | List, filterable by `?tab=`     |
| `GET`   | `/invoices/:id`        | One invoice, with history       |
| `PATCH` | `/invoices/:id/status` | Approve/reject (`status`, `note`, `version`) |

Errors are [RFC 9457 Problem Details](https://www.rfc-editor.org/rfc/rfc9457) (`application/problem+json`), with a machine-readable `code`: `VALIDATION_ERROR`, `NOT_FOUND`, `INVALID_TRANSITION`, `VERSION_CONFLICT`, `INTERNAL_ERROR`.

## Project structure

```
src/lib/           Status machine, normalization, money formatting, Supabase client, invoice service
src/app/api/       Route Handlers: list / get / update-status
src/app/page.tsx   The UI: tabs, table, detail panel
src/components/    StatusBadge, InvoiceTable, InvoiceDetailPanel, Toast
supabase/schema.sql  Tables, indexes, RLS, the status-update function
scripts/seed.ts    Seeds 6 sample invoices through the real ingestion/duplicate logic
docs/SCHEMA_AND_STATUS.md  Schema + status writeup
```

## Why no separate Express API

Next.js Route Handlers (`src/app/api/**/route.ts`) are plain REST endpoints — curlable, independent of the UI — just colocated with it instead of a second service. For a two-endpoint-plus-one app, that's less to stand up and run than a monorepo with its own backend package, and nothing in the brief asked for them to be physically separate.

## Access model

All database access — reads included — goes through Route Handlers using Supabase's **secret** key. Row Level Security is enabled on both tables with no public policies, so the publishable (browser-exposed) key grants nothing; a leaked client-side key can't touch invoice data.

## Scope

This is an approval workflow for invoices that already exist — it doesn't create them. Out of scope, by design: authentication (there's one implicit `reviewer`/`seed` actor, no login), and reopening a final decision.

## If I had to build the full system

If time allowed for building this as a complete product rather than an approval desk bolted onto existing invoices, I wouldn't design the creation/generation side from scratch — I'd start from how real tools already do it. Concretely:

- Walk through the invoice creation and approval flows of **Bill.com**, **Ramp Bill Pay**, **Tipalti**, and **QuickBooks/Xero** (their demos, help docs, marketing pages) to see how each handles line items, tax, approval routing, and payment status — adopt what's clearly proven, skip what's over-built for a smaller team.
- Read an actual open-source codebase too (e.g. **Invoice Ninja**), since its schema and code are inspectable, not just its UI — a demo only shows the happy path, not the edge cases it had to solve.
- Check what users complain about for these tools (G2, Capterra, Reddit reviews) — the gaps people actually hit (multi-currency rounding, partial payments, voiding a sent invoice) are a better guide to what's hard than guessing upfront.

That research is what the plan below is actually built from, not a blind spec:

Generating and issuing invoices is a different, larger problem than approving ones that already arrived. What would need adding:

**Data model**
- Line items (qty × unit price × tax, per row), with totals computed once and stored immutably — not recalculated from a template that might change later
- Legally sequential, gapless invoice numbering (needs a serializing lock, not a plain DB sequence)
- A real lifecycle: `draft → issued → partially paid → paid → void/credited`, not just this app's 4 states
- Multi-currency with correct minor-unit handling (not every currency has 2 decimal places)
- Multi-tenancy: RLS keyed by organization, not just "server key vs nobody"

**Backend**
- Tax rules per jurisdiction (inclusive/exclusive pricing, multiple rates, consistent rounding so line totals and invoice totals always reconcile)
- Idempotency keys on invoice creation (a retried request must not double-create)
- PDF generation and storage as the immutable source of truth once an invoice is sent
- Payment tracking (partial payments, overpayment, reconciliation) and webhooks to accounting systems

**Frontend**
- Dynamic line-item editor with live, backend-matching totals
- Draft (editable) vs issued (locked) UI states, since an issued invoice is a legal document
- Locale-aware currency/date input and formatting
- Print/PDF preview before sending

None of this belongs in this repo — it's a different product built on the same TypeScript/Next.js/Postgres foundation, not an extension of the current schema.
