import { NextResponse } from "next/server";
import { verifyAdminAuth } from "@/lib/admin-auth";
import { prisma } from "@/lib/prisma";
import { getDbSize } from "@/lib/storage-utils";

/**
 * GET /api/admin/stats
 * Returns system statistics for admin monitoring dashboard
 * - Total registered users
 * - Total receipts
 * - Database size
 */
export async function GET() {
  const { authorized } = await verifyAdminAuth();
  
  if (!authorized) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    // Get counts from database in parallel
    const [userCount, receiptCount, dbSize] = await Promise.all([
      prisma.user.count(),
      prisma.receipt.count(),
      getDbSize()
    ]);

    return NextResponse.json({
      users: userCount,
      receipts: receiptCount,
      dbSize,
      environment: process.env.NODE_ENV || 'development'
    });
  } catch (error) {
    console.error('[admin/stats] Error:', error);
    return NextResponse.json({ error: 'Failed to fetch stats' }, { status: 500 });
  }
}
