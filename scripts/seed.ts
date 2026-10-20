// Seeds 6 sample invoices, one a deliberate duplicate, through the same
// duplicate-detection and status-transition logic the app uses live — so the
// duplicate is caught by the real rule, not hard-coded.
//
// Run with: npm run db:seed

import { config } from 'dotenv';
import { createClient } from '@supabase/supabase-js';

config({ path: '.env.local' });
import { normalizeVendorName, normalizeInvoiceNumber } from '../src/lib/normalize';
import { findDuplicate, type DuplicateCandidate } from '../src/lib/duplicate-detection';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

interface SeedInvoice {
  vendorName: string;
  invoiceNumber: string;
  description: string;
  amountCents: number;
  currency: string;
  invoiceDate: string;
  dueDate: string;
  decide?: { status: 'APPROVED' | 'REJECTED'; note?: string };
}

const SEED_INVOICES: SeedInvoice[] = [
  {
    vendorName: 'Acme Supplies Ltd.',
    invoiceNumber: 'INV-1001',
    description: 'Office supplies — Q1 restock',
    amountCents: 125_000,
    currency: 'USD',
    invoiceDate: '2026-09-01',
    dueDate: '2026-09-30',
  },
  {
    vendorName: 'Globex Corporation',
    invoiceNumber: 'GX-778',
    description: 'Cloud hosting — September',
    amountCents: 56_040,
    currency: 'USD',
    invoiceDate: '2026-09-05',
    dueDate: '2026-10-05',
  },
  {
    vendorName: 'Initech',
    invoiceNumber: '2026-0042',
    description: 'Consulting services',
    amountCents: 399_999,
    currency: 'USD',
    invoiceDate: '2026-09-10',
    dueDate: '2026-10-10',
  },
  {
    vendorName: 'Umbrella Corp',
    invoiceNumber: 'U-55',
    description: 'Lab equipment maintenance',
    amountCents: 8_900,
    currency: 'USD',
    invoiceDate: '2026-08-15',
    dueDate: '2026-09-14',
    decide: { status: 'APPROVED' },
  },
  {
    vendorName: 'Stark Industries',
    invoiceNumber: 'SI-900',
    description: 'R&D contract — phase 2',
    amountCents: 1_200_000,
    currency: 'USD',
    invoiceDate: '2026-08-01',
    dueDate: '2026-08-31',
    decide: { status: 'REJECTED', note: 'Contract terms not finalized; resubmit after sign-off' },
  },
  {
    // Deliberate duplicate of row 1: same bill, different formatting.
    vendorName: 'ACME Supplies Limited',
    invoiceNumber: 'inv 1001',
    description: 'Office supplies — Q1 restock',
    amountCents: 125_000,
    currency: 'USD',
    invoiceDate: '2026-09-01',
    dueDate: '2026-09-30',
  },
];

async function main() {
  console.log('Clearing existing invoices...');
  await supabase.from('invoice_status_history').delete().gte('id', 0);
  await supabase.from('invoices').delete().neq('id', '00000000-0000-0000-0000-000000000000');

  for (const seed of SEED_INVOICES) {
    const vendorNameNormalized = normalizeVendorName(seed.vendorName);
    const invoiceNumberNormalized = normalizeInvoiceNumber(seed.invoiceNumber);

    const { data: candidateRows } = await supabase
      .from('invoices')
      .select('id, vendor_name, invoice_number, vendor_name_normalized, invoice_number_normalized');

    const candidates: DuplicateCandidate[] = (candidateRows ?? []).map((row) => ({
      id: row.id,
      vendorName: row.vendor_name,
      invoiceNumber: row.invoice_number,
      vendorNameNormalized: row.vendor_name_normalized,
      invoiceNumberNormalized: row.invoice_number_normalized,
    }));

    const match = findDuplicate(vendorNameNormalized, invoiceNumberNormalized, candidates);
    const existing = match?.candidate;
    const initialStatus = match ? 'NEEDS_REVIEW' : 'PROCESSING';

    const { data: inserted, error: insertError } = await supabase
      .from('invoices')
      .insert({
        vendor_name: seed.vendorName,
        vendor_name_normalized: vendorNameNormalized,
        invoice_number: seed.invoiceNumber,
        invoice_number_normalized: invoiceNumberNormalized,
        description: seed.description,
        amount_cents: seed.amountCents,
        currency: seed.currency,
        invoice_date: seed.invoiceDate,
        due_date: seed.dueDate,
        status: initialStatus,
        duplicate_of_id: existing?.id ?? null,
        review_reason: existing
          ? match!.exact
            ? `Possible duplicate of ${existing.vendorName} ${existing.invoiceNumber}: same vendor and invoice number`
            : `Possible duplicate of ${existing.vendorName} ${existing.invoiceNumber}: vendor and invoice number closely match (possible typo)`
          : null,
      })
      .select()
      .single();

    if (insertError) throw insertError;

    await supabase.from('invoice_status_history').insert({
      invoice_id: inserted.id,
      from_status: null,
      to_status: initialStatus,
      note: null,
      actor: 'seed',
    });

    console.log(`Seeded ${seed.vendorName} / ${seed.invoiceNumber} → ${initialStatus}`);

    if (seed.decide) {
      const { error: rpcError } = await supabase.rpc('update_invoice_status', {
        p_id: inserted.id,
        p_expected_version: inserted.version,
        p_to_status: seed.decide.status,
        p_note: seed.decide.note ?? null,
        p_actor: 'seed',
      });
      if (rpcError) throw rpcError;
      console.log(`  → decided ${seed.decide.status}`);
    }
  }

  console.log('Done.');
}

main().then(
  () => process.exit(0),
  (error) => {
    console.error(error);
    process.exit(1);
  },
);
