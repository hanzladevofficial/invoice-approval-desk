import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { listInvoices } from '@/lib/invoice-service';
import { toProblemResponse } from '@/lib/problem';
import { STATUSES } from '@/lib/status';

const querySchema = z.object({
  tab: z.enum(['processing', 'needs_review', 'decided']).optional(),
  status: z
    .string()
    .optional()
    .transform((value) =>
      value
        ?.split(',')
        .map((s) => s.trim().toUpperCase())
        .filter(Boolean),
    )
    .pipe(z.array(z.enum(STATUSES as [string, ...string[]])).optional()),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(50).default(10),
});

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  try {
    const query = querySchema.parse({
      tab: searchParams.get('tab') ?? undefined,
      status: searchParams.get('status') ?? undefined,
      page: searchParams.get('page') ?? undefined,
      pageSize: searchParams.get('pageSize') ?? undefined,
    });

    const result = await listInvoices({
      tab: query.tab,
      statuses: query.status as (typeof STATUSES)[number][] | undefined,
      page: query.page,
      pageSize: query.pageSize,
    });

    return NextResponse.json(result);
  } catch (error) {
    return toProblemResponse(error, '/api/invoices');
  }
}
