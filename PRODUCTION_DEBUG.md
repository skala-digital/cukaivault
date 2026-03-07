# Production Debugging Guide

## Required Environment Variables

Ensure these are set in your production environment:

```bash
# Authentication (CRITICAL)
AUTH_SECRET=your-random-32-char-string
GOOGLE_CLIENT_ID=your-google-oauth-client-id
GOOGLE_CLIENT_SECRET=your-google-oauth-client-secret

# Domain Configuration
NEXTAUTH_URL=https://your-production-domain.com
AUTH_TRUST_HOST=your-production-domain.com

# Database
DATABASE_URL=your-production-database-url

# Admin Configuration
ADMIN_EMAILS=your-admin-email@gmail.com,another-admin@gmail.com
```

## Common Production Issues

### 1. Infinite Redirect Loops

**Symptoms:**

- Browser keeps redirecting between login and dashboard
- Console shows repeated middleware logs
- Session appears to not persist

**Debug Steps:**

1. Check browser Network tab for redirect responses (302/307)
2. Check server logs for middleware logging
3. Verify AUTH_SECRET is set and consistent
4. Ensure NEXTAUTH_URL matches your production domain exactly
5. Check if cookies are being set with proper domain

**Console Debugging:**

```javascript
// In browser console, check session storage
localStorage.clear();
sessionStorage.clear();
// Clear all cookies for the domain
```

### 2. Session Cookie Issues

**Symptoms:**

- Login succeeds but session immediately lost
- Auth middleware shows no session despite login

**Solutions:**

- Ensure HTTPS is properly configured
- Check cookie domain configuration
- Verify AUTH_TRUST_HOST matches your domain
- Check SameSite cookie policy with your hosting provider

### 3. Database Connection Issues

**Symptoms:**

- User registration fails silently
- Dashboard API returns 500 errors
- No user data loads after login

**Debug:**

- Check DATABASE_URL connection string
- Verify Prisma migrations are applied in production
- Check database user permissions

## Debugging Commands

```bash
# Check environment variables
echo $AUTH_SECRET | wc -c  # Should be 32+ characters
echo $NEXTAUTH_URL          # Should match your domain
echo $DATABASE_URL          # Should be valid connection string

# Test database connection
npx prisma db pull          # Should succeed

# Check Next.js build
npm run build              # Should complete without auth errors
```

## Monitoring

Add these logs to track the issue:

1. **Browser Console:** Look for auth-related errors
2. **Server Logs:** Check for middleware redirect patterns
3. **Network Tab:** Track redirect chains and cookie setting
4. **Database Logs:** Verify user creation/lookup queries

## Quick Fixes

1. **Clear all browser data** for your domain
2. **Restart your production server** after env var changes
3. **Check NEXTAUTH_URL** matches exactly (no trailing slashes)
4. **Verify Google OAuth redirect URIs** include your production domain
5. **Test with incognito mode** to rule out cached data

## Contact Developer

If loops persist after these fixes, provide:

- Browser console logs (with auth debugging enabled)
- Server middleware logs (showing redirect pattern)
- Environment variable configuration (sanitized)
- Network tab showing redirect sequence
