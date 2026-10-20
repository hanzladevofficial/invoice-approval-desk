import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { updateInvoiceStatus } from '@/lib/invoice-service';
import { toProblemResponse } from '@/lib/problem';
import { ValidationError } from '@/lib/errors';

const bodySchema = z
  .object({
    status: z.enum(['APPROVED', 'REJECTED']),
    note: z.string().trim().max(500).optional(),
    version: z.number().int().positive(),
  })
  .superRefine((value, ctx) => {
    if (value.status === 'REJECTED' && !value.note) {
      ctx.addIssue({ code: 'custom', path: ['note'], message: 'A reason is required to reject an invoice' });
    }
  });

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const instance = `/api/invoices/${id}/status`;

  try {
    const json = await request.json().catch(() => {
      throw new ValidationError([{ path: 'body', message: 'Body must be valid JSON' }]);
    });
    const body = bodySchema.parse(json);

    const invoice = await updateInvoiceStatus(id, body);
    return NextResponse.json(invoice);
  } catch (error) {
    return toProblemResponse(error, instance);
  }
}
