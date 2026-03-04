import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";

// GET /api/user/[id]
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const user = await prisma.user.findUnique({
    where: { id },
    include: {
      receipts: {
        where: { taxYearId: (await prisma.user.findUnique({ where: { id } }))?.currentTaxYearId },
        orderBy: { createdAt: "desc" },
      },
      currentTaxYear: true,
    },
  });
  if (!user) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ user });
}

// PATCH /api/user/[id] — update profile fields
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await req.json();

  const allowed = [
    "grossIncome",
    "isMuslim",
    "fullName",
    "employmentType",
    "epfContribution",
    "lifeInsurance",
    "medicalInsurance",
    "hasSpouseRelief",
    "childrenUnder18",
    "childrenTertiary",
    "currentTaxYearId",
  ] as const;

  const data: Record<string, unknown> = {};
  for (const key of allowed) {
    if (key in body) data[key] = body[key];
  }

  const user = await prisma.user.update({ where: { id }, data });
  return NextResponse.json({ user });
}
