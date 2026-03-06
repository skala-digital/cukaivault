-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Receipt" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "taxYearId" TEXT NOT NULL,
    "amount" DECIMAL NOT NULL,
    "category" TEXT NOT NULL,
    "imageUrl" TEXT,
    "isVerified" BOOLEAN NOT NULL DEFAULT false,
    "confidence" REAL,
    "ocrMethod" TEXT,
    "rawOcrText" TEXT,
    "needsVerification" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Receipt_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Receipt_taxYearId_fkey" FOREIGN KEY ("taxYearId") REFERENCES "TaxYear" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_Receipt" ("amount", "category", "createdAt", "id", "imageUrl", "isVerified", "taxYearId", "userId") SELECT "amount", "category", "createdAt", "id", "imageUrl", "isVerified", "taxYearId", "userId" FROM "Receipt";
DROP TABLE "Receipt";
ALTER TABLE "new_Receipt" RENAME TO "Receipt";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
