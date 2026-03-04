import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

// GET /api/tax-years — fetch all active tax years
export async function GET() {
  const years = await prisma.taxYear.findMany({
    where: { isActive: true },
    orderBy: { year: "desc" },
  });
  return NextResponse.json({ years });
}
