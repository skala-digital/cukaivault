import { defineConfig } from "prisma/config";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    // Switch to process.env.DATABASE_URL (mysql://) for production
    url: "file:./prisma/dev.db",
  },
});
