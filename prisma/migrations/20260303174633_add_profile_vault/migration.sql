-- CreateTable
CREATE TABLE "VaultEntry" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "title" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "summary" TEXT NOT NULL,
    "source" TEXT NOT NULL DEFAULT 'LHDN',
    "category" TEXT NOT NULL DEFAULT 'GENERAL',
    "scrapedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_User" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "phone" TEXT NOT NULL,
    "fullName" TEXT,
    "isMuslim" BOOLEAN NOT NULL DEFAULT true,
    "employmentType" TEXT NOT NULL DEFAULT 'EMPLOYED',
    "grossIncome" DECIMAL NOT NULL DEFAULT 0,
    "totalReliefs" DECIMAL NOT NULL DEFAULT 0,
    "epfContribution" DECIMAL NOT NULL DEFAULT 0,
    "lifeInsurance" DECIMAL NOT NULL DEFAULT 0,
    "medicalInsurance" DECIMAL NOT NULL DEFAULT 0,
    "hasSpouseRelief" BOOLEAN NOT NULL DEFAULT false,
    "childrenUnder18" INTEGER NOT NULL DEFAULT 0,
    "childrenTertiary" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
INSERT INTO "new_User" ("createdAt", "grossIncome", "id", "isMuslim", "phone", "totalReliefs") SELECT "createdAt", "grossIncome", "id", "isMuslim", "phone", "totalReliefs" FROM "User";
DROP TABLE "User";
ALTER TABLE "new_User" RENAME TO "User";
CREATE UNIQUE INDEX "User_phone_key" ON "User"("phone");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE UNIQUE INDEX "VaultEntry_url_key" ON "VaultEntry"("url");
