#!/bin/sh
set -e

# Set default DATABASE_URL if not provided
export DATABASE_URL="${DATABASE_URL:-file:/app/prisma/prod.db}"

echo "🔍 DATABASE_URL: $DATABASE_URL"

# Run database migrations
echo "📦 Running database migrations..."
if ! DATABASE_URL="$DATABASE_URL" npx prisma migrate deploy; then
    echo "⚠️  Migration failed, regenerating Prisma Client..."
    npx prisma generate
    DATABASE_URL="$DATABASE_URL" npx prisma migrate deploy
fi

echo "✅ Migrations complete. Starting Next.js..."
exec node_modules/.bin/next start
