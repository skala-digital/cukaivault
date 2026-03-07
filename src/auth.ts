import NextAuth from "next-auth";
import Google from "next-auth/providers/google";

const ADMIN_EMAILS = process.env.ADMIN_EMAILS?.split(',').map(e => e.trim()) || ['zarulizham97@gmail.com'];

// Lazy-load Prisma to avoid Edge Runtime issues in middleware
function getPrisma() {
  return require("@/lib/prisma").prisma;
}

export const { handlers, signIn, signOut, auth } = NextAuth({
  trustHost: true, // ← CRITICAL: Required for production behind proxy
  secret: process.env.AUTH_SECRET,
  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
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
  cookies: {
    sessionToken: {
      name: process.env.NODE_ENV === 'production' 
        ? `__Secure-next-auth.session-token`
        : `next-auth.session-token`,
      options: {
        httpOnly: true,
        sameSite: 'lax',
        path: '/',
        secure: process.env.NODE_ENV === 'production',
        domain: process.env.NODE_ENV === 'production' ? process.env.AUTH_TRUST_HOST : undefined
      }
    }
  },
  pages: {
    signIn: '/'
  },
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

        // Allow registration even without tax years (user can still login)
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
            currentTaxYearId: currentTaxYear?.id || null // Allow null if no tax years
          }
        });

        if (!currentTaxYear) {
          console.log(`⚠️ User registered without tax year: ${user.email} - Admin needs to sync tax years`);
        } else {
          console.log(`✅ User registered: ${user.email} (admin: ${isAdmin})`);
        }
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
    async jwt({ token, user, account }) {
      if (user) {
        token.email = user.email;
        token.sub = user.id;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user && token.email) {
        session.user.email = token.email as string;
        session.user.id = token.sub as string;
      }
      return session;
    },
    async redirect({ url, baseUrl }) {
      console.log('🔄 Auth redirect:', { url, baseUrl });
      
      // Handle relative URLs
      if (url.startsWith('/')) {
        const fullUrl = new URL(url, baseUrl);
        url = fullUrl.toString();
      }
      
      // If URL is within our domain
      if (url.startsWith(baseUrl)) {
        const pathname = new URL(url).pathname;
        
        // Prevent infinite redirects - if already on dashboard, stay there
        if (pathname === '/dashboard') {
          return url;
        }
        
        // If redirecting to homepage or login, go to dashboard instead
        if (pathname === '/' || pathname === '' || pathname === '/login') {
          return `${baseUrl}/dashboard`;
        }
        
        // Allow other authenticated routes (admin, etc.)
        return url;
      }
      
      // External URLs or fallback - go to dashboard
      return `${baseUrl}/dashboard`;
    }
  }
});
