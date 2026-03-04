# Admin Dashboard Setup Guide

## Current Status

✅ All code files created
⚠️ Need to install dependencies (disk space required)
⚠️ Need to setup Google OAuth credentials
⚠️ Need to run database migration

---

## Step 1: Free Up Disk Space

Your disk is currently 100% full. You need to free up at least 2GB of space to install dependencies.

**Quick ways to free space:**

```bash
# Clean Homebrew cache
brew cleanup --prune=all

# Clean yarn cache (already done)
yarn cache clean

# Clean node_modules in other projects
# Find large directories:
du -sh ~/Projects/*/node_modules | sort -h | tail -10

# Delete old Time Machine snapshots
tmutil listlocalsnapshots /
sudo tmutil deletelocalsnapshots <snapshot-date>
```

---

## Step 2: Install Dependencies

Once you have space, install the required packages:

```bash
cd /Users/zarulrahim/Projects/CukaiGate

# Install NextAuth, Puppeteer, Cheerio, Zod
yarn add next-auth@beta puppeteer cheerio zod

# Or use npm
npm install next-auth@beta puppeteer cheerio zod
```

---

## Step 3: Setup Google OAuth

### 3.1 Go to Google Cloud Console

Visit: https://console.cloud.google.com/

### 3.2 Create/Select Project

- Create a new project or select existing "CukaiVault"

### 3.3 Enable Google+ API

- Go to "APIs & Services" > "Library"
- Search for "Google+ API" or "Google Identity"
- Click "Enable"

### 3.4 Create OAuth 2.0 Credentials

- Go to "APIs & Services" > "Credentials"
- Click "Create Credentials" > "OAuth client ID"
- Application type: **Web application**
- Name: **CukaiVault Admin**
- Authorized JavaScript origins:
  ```
  http://localhost:3000
  ```
- Authorized redirect URIs:
  ```
  http://localhost:3000/api/auth/callback/google
  ```
- Click "Create"
- **Copy** the Client ID and Client Secret

### 3.5 Configure OAuth Consent Screen

- Go to "OAuth consent screen"
- User Type: **External**
- App name: **CukaiVault Admin**
- User support email: **zarulizham97@gmail.com**
- Developer contact: **zarulizham97@gmail.com**
- Add test users: **zarulizham97@gmail.com**
- Save

---

## Step 4: Setup Environment Variables

Create `.env.local` file in project root:

```bash
# Copy example
cp .env.example .env.local

# Edit with your values
nano .env.local
```

**Required values:**

```env
# From Google Cloud Console (Step 3.4)
GOOGLE_CLIENT_ID=your_client_id_here.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your_client_secret_here

# Generate a random secret:
# Run: openssl rand -base64 32
AUTH_SECRET=paste_generated_secret_here

# Admin email (already set)
ADMIN_EMAILS=zarulizham97@gmail.com

# Local development URL
NEXTAUTH_URL=http://localhost:3000
```

---

## Step 5: Run Database Migration

Update the database schema to include admin tables:

```bash
yarn prisma migrate dev --name add-admin-system
```

This creates:

- `AdminSession` table for storing auth sessions
- `SyncLog` table for tracking LHDN sync operations
- Adds `email`, `googleId`, `isAdmin` fields to `User` table

---

## Step 6: Start Development Server

```bash
yarn dev
```

---

## Step 7: Login to Admin Dashboard

1. Open browser: **http://localhost:3000/admin/login**
2. Click "Continue with Google"
3. Sign in with **zarulizham97@gmail.com**
4. ✅ You should land on admin dashboard!

---

## Step 8: Sync Tax Rules

Once logged in:

1. Go to **LHDN Sync** tab
2. Set year to **2026**
3. Click **"Sync Tax Rules"** button
4. Wait 30-60 seconds for scraping to complete
5. ✅ Check **Sync Logs** tab to see results

The scraper will:

- Visit LHDN website
- Extract tax brackets for 2026
- Extract relief caps (lifestyle, medical, education, SSPN, childcare)
- Save to database
- Make available to all users in year selector

---

## Troubleshooting

### "Unauthorized" error when logging in

- Check that `ADMIN_EMAILS` includes your email exactly
- Verify email in Google OAuth consent screen test users

### Puppeteer fails to launch

- Install Chrome dependencies:

  ```bash
  # macOS
  brew install chromium

  # Or use system Chrome
  export PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true
  export PUPPETEER_EXECUTABLE_PATH=/Applications/Google\ Chrome.app/Contents/MacOS/Google\ Chrome
  ```

### "Module not found: Can't resolve 'next-auth'"

- You haven't installed dependencies yet (Step 2)
- Run: `yarn add next-auth@beta`

### Database errors

- Run migrations: `yarn prisma migrate dev`
- Regenerate client: `yarn prisma generate`

---

## File Structure

```
src/
├── auth.ts                          # NextAuth configuration
├── lib/
│   ├── admin-auth.ts               # Admin verification middleware
│   └── lhdn-scraper.ts             # LHDN website scraper
├── app/
│   ├── admin/
│   │   ├── login/
│   │   │   └── page.tsx            # Google OAuth login page
│   │   └── page.tsx                # Admin dashboard (sync, users, logs)
│   └── api/
│       ├── auth/[...nextauth]/
│       │   └── route.ts            # NextAuth API routes
│       └── admin/
│           ├── sync-tax-rules/
│           │   └── route.ts        # POST - Trigger LHDN sync
│           ├── users/
│           │   └── route.ts        # GET - List all users
│           └── sync-logs/
│               └── route.ts        # GET - List sync history
prisma/
└── schema.prisma                   # Updated with admin models
```

---

## Security Notes

⚠️ **Admin Access**

- Only emails in `ADMIN_EMAILS` can login
- Regular users cannot access `/admin` routes
- Sessions expire automatically
- All admin actions are logged

🔒 **Production Considerations**

- Use HTTPS in production
- Set `NEXTAUTH_URL` to your domain
- Update OAuth redirect URIs in Google Console
- Keep `AUTH_SECRET` confidential
- Consider adding rate limiting to sync API

---

## Next Steps

After completing setup:

1. Test syncing tax rules for 2026
2. Add more admin emails if needed (comma-separated in `ADMIN_EMAILS`)
3. Schedule automatic syncs (optional - see below)
4. Deploy to production

### Optional: Automated Sync (Future)

For automatic daily syncs, you can:

- Add Vercel Cron job
- Use GitHub Actions scheduled workflow
- Setup server cron job

---

## Support

If you encounter issues:

1. Check console logs for errors
2. Verify all environment variables are set
3. Ensure database migrations ran successfully
4. Check Google OAuth configuration

**Admin Dashboard URL:** http://localhost:3000/admin
**Admin Login URL:** http://localhost:3000/admin/login
