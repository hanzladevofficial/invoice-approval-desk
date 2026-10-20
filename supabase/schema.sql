-- Invoice Approval Desk — schema
-- Run once in the Supabase SQL Editor (or via `scripts/migrate.ts`).
-- Safe to re-run: every statement is guarded.

create extension if not exists pgcrypto;

do $$ begin
  create type invoice_status as enum ('PROCESSING', 'NEEDS_REVIEW', 'APPROVED', 'REJECTED');
exception
  when duplicate_object then null;
end $$;

create table if not exists invoices (
  id                         uuid primary key default gen_random_uuid(),
  vendor_name                text not null,
  vendor_name_normalized     text not null,
  invoice_number             text not null,
  invoice_number_normalized  text not null,
  description                text,
  amount_cents               bigint not null check (amount_cents >= 0),
  currency                   char(3) not null,
  invoice_date               date not null,
  due_date                   date not null check (due_date >= invoice_date),
  status                     invoice_status not null default 'PROCESSING',
  review_reason              text,
  duplicate_of_id            uuid references invoices (id),
  decision_note              text,
  decided_at                 timestamptz,
  version                    integer not null default 1,
  created_at                 timestamptz not null default now(),
  updated_at                 timestamptz not null default now()
);

create table if not exists invoice_status_history (
  id           bigint generated always as identity primary key,
  invoice_id   uuid not null references invoices (id) on delete cascade,
  from_status  invoice_status,
  to_status    invoice_status not null,
  note         text,
  actor        text not null,
  changed_at   timestamptz not null default now()
);

create index if not exists invoices_status_idx on invoices (status);
create index if not exists invoices_duplicate_key_idx on invoices (vendor_name_normalized, invoice_number_normalized);
create index if not exists invoices_duplicate_of_idx on invoices (duplicate_of_id);
create index if not exists history_invoice_idx on invoice_status_history (invoice_id, changed_at);

-- Row Level Security: locked down by default. The app never talks to these
-- tables with the anon/publishable key — only the server-side service-role
-- key (in Next.js Route Handlers), which bypasses RLS entirely. This means
-- even a leaked anon key grants no access to invoice data.
alter table invoices enable row level security;
alter table invoice_status_history enable row level security;

-- Approve/reject as one atomic, row-locked operation: the status update and
-- its audit row either both happen or neither does, and two reviewers acting
-- on the same invoice at once are serialized instead of racing. This is the
-- one place real concurrency safety matters (two humans could click Approve
-- within the same second); everything else in the app is plain CRUD and
-- doesn't need this.
create or replace function update_invoice_status(
  p_id uuid,
  p_expected_version integer,
  p_to_status invoice_status,
  p_note text,
  p_actor text
) returns invoices
language plpgsql
as $$
declare
  v_row invoices;
  v_from_status invoice_status;
begin
  select * into v_row from invoices where id = p_id for update;

  if not found then
    raise exception 'invoice_not_found' using errcode = 'P0002';
  end if;

  if v_row.version <> p_expected_version then
    raise exception 'version_conflict:%,%', v_row.version, p_expected_version using errcode = 'P0001';
  end if;

  if not (v_row.status in ('PROCESSING', 'NEEDS_REVIEW') and p_to_status in ('APPROVED', 'REJECTED')) then
    raise exception 'invalid_transition:%,%', v_row.status, p_to_status using errcode = 'P0001';
  end if;

  v_from_status := v_row.status;

  update invoices
  set status = p_to_status,
      decision_note = p_note,
      decided_at = now(),
      version = version + 1,
      updated_at = now()
  where id = p_id
  returning * into v_row;

  insert into invoice_status_history (invoice_id, from_status, to_status, note, actor)
  values (p_id, v_from_status, p_to_status, p_note, p_actor);

  return v_row;
end;
$$;
