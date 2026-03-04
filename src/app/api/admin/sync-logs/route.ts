import { prisma } from '@/lib/prisma';
import { verifyAdminAuth } from '@/lib/admin-auth';
import { NextResponse } from 'next/server';

export async function GET() {
  const { authorized } = await verifyAdminAuth();
  if (!authorized) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  
  const logs = await prisma.syncLog.findMany({
    orderBy: { createdAt: 'desc' },
    take: 50
  });
  
  return NextResponse.json({ logs });
}
