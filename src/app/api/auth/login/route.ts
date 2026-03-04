import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";

// POST /api/auth/login — find or create user by phone number
export async function POST(req: NextRequest) {
  try {
    const { phone } = await req.json();

    if (!phone || typeof phone !== "string") {
      return NextResponse.json({ error: "Phone number is required" }, { status: 400 });
    }

    const normalized = phone.replace(/[^\d+]/g, "");

    // Get current tax year (default to 2025 for now)
    const currentYear = await prisma.taxYear.findFirst({
      where: { year: 2025 },
    });

    if (!currentYear) {
      return NextResponse.json(
        { error: "Tax year not configured" },
        { status: 500 }
      );
    }

    const user = await prisma.user.upsert({
      where: { phone: normalized },
      update: {},
      create: {
        phone: normalized,
        currentTaxYearId: currentYear.id,
      },
      include: {
        receipts: {
          orderBy: { createdAt: "desc" },
        },
        currentTaxYear: true,
      },
    });

    return NextResponse.json({ user });
  } catch (error) {
    console.error("[auth/login]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
