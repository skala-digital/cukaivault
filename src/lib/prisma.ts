import { PrismaClient } from "@prisma/client";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

function createPrismaClient() {
  // Extract file path from DATABASE_URL (format: file:./path/to/db.db)
  const dbUrl = process.env.DATABASE_URL || "file:./prisma/dev.db";
  
  // Adapter expects URL format: file:./path/to/db.db
  const adapter = new PrismaBetterSqlite3({ url: dbUrl });
  
  return new PrismaClient({
    adapter,
    log: process.env.NODE_ENV === "development" ? ["query", "error", "warn"] : ["error"],
  });
}

// Attach to globalThis in development to prevent exhausting connections on HMR.
export const prisma = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
