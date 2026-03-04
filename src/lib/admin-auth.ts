import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export async function verifyAdminAuth() {
  const session = await auth();
  
  if (!session?.user?.email) {
    return { authorized: false, email: null, user: null };
  }
  
  // Verify user is admin in database
  const user = await prisma.user.findUnique({
    where: { email: session.user.email },
    select: {
      id: true,
      email: true,
      fullName: true,
      isAdmin: true
    }
  });
  
  if (!user || !user.isAdmin) {
    return { authorized: false, email: null, user: null };
  }
  
  return {
    authorized: true,
    email: user.email!,
    user
  };
}
