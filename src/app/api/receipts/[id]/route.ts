import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";

// DELETE /api/receipts/[id]
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const receipt = await prisma.receipt.findUnique({ where: { id } });
  if (!receipt) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await prisma.receipt.delete({ where: { id } });

  // Recalculate totalReliefs for user
  const remaining = await prisma.receipt.findMany({
    where: { userId: receipt.userId },
  });
  const totalReliefs = remaining.reduce((s: number, r: { amount: unknown }) => s + Number(r.amount), 0);
  await prisma.user.update({
    where: { id: receipt.userId },
    data: { totalReliefs },
  });

  return NextResponse.json({ success: true });
}
