import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

// GET /api/user/me - Get current authenticated user
export async function GET() {
  const session = await auth();
  
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const user = await prisma.user.findUnique({
    where: { email: session.user.email },
    include: {
      receipts: {
        where: { taxYearId: (await prisma.user.findUnique({ 
          where: { email: session.user.email } 
        }))?.currentTaxYearId },
        orderBy: { createdAt: "desc" },
      },
      currentTaxYear: true,
    },
  });

  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  return NextResponse.json({ user });
}
