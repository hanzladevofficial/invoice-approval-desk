import { NextRequest, NextResponse } from 'next/server';
import { getInvoiceDetail } from '@/lib/invoice-service';
import { toProblemResponse } from '@/lib/problem';

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    const invoice = await getInvoiceDetail(id);
    return NextResponse.json(invoice);
  } catch (error) {
    return toProblemResponse(error, `/api/invoices/${id}`);
  }
}
