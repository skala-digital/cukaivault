import { defineConfig } from "prisma/config";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    // Use DATABASE_URL from environment, fallback to dev.db for local development
    url: process.env.DATABASE_URL || "file:./prisma/dev.db",
  },
});
