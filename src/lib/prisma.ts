import { PrismaClient } from "@prisma/client";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import Database from "better-sqlite3";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

function createPrismaClient() {
  // Extract file path from DATABASE_URL (format: file:./path/to/db.db)
  const dbPath = process.env.DATABASE_URL?.replace("file:", "") || "./prisma/dev.db";
  
  const db = new Database(dbPath);
  const adapter = new PrismaBetterSqlite3(db);
  
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
