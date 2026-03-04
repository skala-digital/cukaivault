import NextAuth from "next-auth";
import Google from "next-auth/providers/google";

const ADMIN_EMAILS = process.env.ADMIN_EMAILS?.split(',').map(e => e.trim()) || ['zarulizham97@gmail.com'];

// Lazy-load Prisma to avoid Edge Runtime issues in middleware
function getPrisma() {
  return require("@/lib/prisma").prisma;
}

export const { handlers, signIn, signOut, auth } = NextAuth({
  providers: [
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      authorization: {
        params: {
          prompt: "consent",
          access_type: "offline",
          response_type: "code"
        }
      }
    })
  ],
  callbacks: {
    async signIn({ user, account, profile }) {
      if (!user.email) return false;
      
      const prisma = getPrisma();
      
      // Determine if user should be admin
      const isAdmin = ADMIN_EMAILS.includes(user.email);
      
      // Check if user exists
      let dbUser = await prisma.user.findUnique({
        where: { email: user.email }
      });
      
      // Auto-register user if doesn't exist
      if (!dbUser) {
        // Get current active tax year for default assignment
        const currentTaxYear = await prisma.taxYear.findFirst({
          where: { isActive: true },
          orderBy: { year: 'desc' }
        });
        
        dbUser = await prisma.user.create({
          data: {
            phone: `+60-${Date.now()}`, // Placeholder phone
            email: user.email,
            googleId: account?.providerAccountId,
            fullName: user.name || user.email.split('@')[0],
            isAdmin,
            isMuslim: false,
            employmentType: 'EMPLOYED',
            grossIncome: 0,
            totalReliefs: 0,
            currentTaxYearId: currentTaxYear?.id || ''
          }
        });
        console.log(`✅ User registered: ${user.email} (admin: ${isAdmin})`);
      } else {
        // Update admin status if needed
        if (dbUser.isAdmin !== isAdmin) {
          await prisma.user.update({
            where: { email: user.email },
            data: { isAdmin }
          });
          console.log(`✅ User admin status updated: ${user.email} (admin: ${isAdmin})`);
        }
        // Update googleId if not set
        if (!dbUser.googleId && account?.providerAccountId) {
          await prisma.user.update({
            where: { email: user.email },
            data: { googleId: account.providerAccountId }
          });
        }
      }
      
      return true;
    },
    async jwt({ token, user }) {
      if (user) {
        token.email = user.email;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.email = token.email as string;
      }
      return session;
    }
  },
  pages: {
    signIn: '/'
  }
});
