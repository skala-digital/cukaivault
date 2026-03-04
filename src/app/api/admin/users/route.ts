import { prisma } from '@/lib/prisma';
import { verifyAdminAuth } from '@/lib/admin-auth';
import { NextResponse } from 'next/server';

export async function GET() {
  const { authorized } = await verifyAdminAuth();
  if (!authorized) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  
  const users = await prisma.user.findMany({
    select: {
      id: true,
      phone: true,
      email: true,
      fullName: true,
      grossIncome: true,
      createdAt: true,
      isAdmin: true
    },
    orderBy: { createdAt: 'desc' }
  });
  
  return NextResponse.json({ users });
}
