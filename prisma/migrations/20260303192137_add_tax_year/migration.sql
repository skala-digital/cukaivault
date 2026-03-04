/*
  Warnings:

  - Added the required column `taxYearId` to the `Receipt` table without a default value. This is not possible if the table is not empty.
  - Added the required column `currentTaxYearId` to the `User` table without a default value. This is not possible if the table is not empty.

*/
-- CreateTable
CREATE TABLE "TaxYear" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "year" INTEGER NOT NULL,
    "filingStartDate" DATETIME NOT NULL,
    "filingEndDate" DATETIME NOT NULL,
    "taxBrackets" TEXT NOT NULL,
    "reliefCaps" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

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
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Receipt_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Receipt_taxYearId_fkey" FOREIGN KEY ("taxYearId") REFERENCES "TaxYear" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_Receipt" ("amount", "category", "createdAt", "id", "imageUrl", "isVerified", "userId") SELECT "amount", "category", "createdAt", "id", "imageUrl", "isVerified", "userId" FROM "Receipt";
DROP TABLE "Receipt";
ALTER TABLE "new_Receipt" RENAME TO "Receipt";
CREATE TABLE "new_User" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "phone" TEXT NOT NULL,
    "currentTaxYearId" TEXT NOT NULL,
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
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "User_currentTaxYearId_fkey" FOREIGN KEY ("currentTaxYearId") REFERENCES "TaxYear" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_User" ("childrenTertiary", "childrenUnder18", "createdAt", "employmentType", "epfContribution", "fullName", "grossIncome", "hasSpouseRelief", "id", "isMuslim", "lifeInsurance", "medicalInsurance", "phone", "totalReliefs") SELECT "childrenTertiary", "childrenUnder18", "createdAt", "employmentType", "epfContribution", "fullName", "grossIncome", "hasSpouseRelief", "id", "isMuslim", "lifeInsurance", "medicalInsurance", "phone", "totalReliefs" FROM "User";
DROP TABLE "User";
ALTER TABLE "new_User" RENAME TO "User";
CREATE UNIQUE INDEX "User_phone_key" ON "User"("phone");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE UNIQUE INDEX "TaxYear_year_key" ON "TaxYear"("year");
