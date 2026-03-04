-- CreateTable
CREATE TABLE "AdminSession" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "expiresAt" DATETIME NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "SyncLog" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "year" INTEGER NOT NULL,
    "status" TEXT NOT NULL,
    "details" TEXT NOT NULL,
    "duration" INTEGER NOT NULL,
    "triggeredBy" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_User" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "phone" TEXT NOT NULL,
    "email" TEXT,
    "googleId" TEXT,
    "isAdmin" BOOLEAN NOT NULL DEFAULT false,
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
INSERT INTO "new_User" ("childrenTertiary", "childrenUnder18", "createdAt", "currentTaxYearId", "employmentType", "epfContribution", "fullName", "grossIncome", "hasSpouseRelief", "id", "isMuslim", "lifeInsurance", "medicalInsurance", "phone", "totalReliefs") SELECT "childrenTertiary", "childrenUnder18", "createdAt", "currentTaxYearId", "employmentType", "epfContribution", "fullName", "grossIncome", "hasSpouseRelief", "id", "isMuslim", "lifeInsurance", "medicalInsurance", "phone", "totalReliefs" FROM "User";
DROP TABLE "User";
ALTER TABLE "new_User" RENAME TO "User";
CREATE UNIQUE INDEX "User_phone_key" ON "User"("phone");
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");
CREATE UNIQUE INDEX "User_googleId_key" ON "User"("googleId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE UNIQUE INDEX "AdminSession_token_key" ON "AdminSession"("token");
