import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";

// GET /api/receipts?userId=xxx
export async function GET(req: NextRequest) {
  const userId = req.nextUrl.searchParams.get("userId");
  if (!userId) {
    return NextResponse.json({ error: "userId required" }, { status: 400 });
  }
  const receipts = await prisma.receipt.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json({ receipts });
}

// POST /api/receipts — create a new receipt
export async function POST(req: NextRequest) {
  try {
    const { userId, amount, category, imageUrl, taxYearId } = await req.json();

    if (!userId || !amount || !category) {
      return NextResponse.json(
        { error: "userId, amount and category are required" },
        { status: 400 }
      );
    }

    // If no taxYearId provided, use user's current tax year
    let finalTaxYearId = taxYearId;
    if (!finalTaxYearId) {
      const user = await prisma.user.findUnique({ where: { id: userId } });
      finalTaxYearId = user?.currentTaxYearId;
    }

    if (!finalTaxYearId) {
      return NextResponse.json(
        { error: "No tax year specified" },
        { status: 400 }
      );
    }

    const receipt = await prisma.receipt.create({
      data: {
        userId,
        taxYearId: finalTaxYearId,
        amount: parseFloat(amount),
        category,
        imageUrl,
      },
    });

    // Update user's totalReliefs aggregate for this tax year
    const allReceipts = await prisma.receipt.findMany({
      where: { userId, taxYearId: finalTaxYearId },
    });
    const totalReliefs = allReceipts.reduce(
      (sum: number, r: { amount: unknown }) => sum + Number(r.amount),
      0
    );
    await prisma.user.update({ where: { id: userId }, data: { totalReliefs } });

    return NextResponse.json({ receipt }, { status: 201 });
  } catch (error) {
    console.error("[receipts POST]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
