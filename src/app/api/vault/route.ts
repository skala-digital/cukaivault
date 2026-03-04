import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

// GET /api/vault — return latest 20 LHDN vault entries
export async function GET() {
  const entries = await prisma.vaultEntry.findMany({
    orderBy: { scrapedAt: "desc" },
    take: 20,
  });
  return NextResponse.json({ entries });
}
