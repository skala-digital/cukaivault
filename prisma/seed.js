const Database = require("better-sqlite3");
const { resolve } = require("path");

const db = new Database(resolve(process.cwd(), "prisma/dev.db"));

// Malaysia tax brackets 2025/2026 (in force as of 2024 budget)
const TAX_BRACKETS_2025 = JSON.stringify([
  { max: 5000, rate: 0 },
  { max: 20000, rate: 0.01 },
  { max: 35000, rate: 0.03 },
  { max: 50000, rate: 0.06 },
  { max: 70000, rate: 0.11 },
  { max: 100000, rate: 0.19 },
  { max: 250000, rate: 0.25 },
  { max: 400000, rate: 0.26 },
  { max: 600000, rate: 0.28 },
  { max: 1000000, rate: 0.28 },
  { max: 2000000, rate: 0.28 },
  { max: Infinity, rate: 0.30 },
]);

// Relief caps per LHDN 2025/2026
const RELIEF_CAPS = JSON.stringify({
  LIFESTYLE: 2500,
  MEDICAL: 10000,
  EDUCATION: 7000,
  SSPN: 8000,
  CHILDCARE: 3000,
  OTHER: 0,
});

const taxYears = [
  {
    id: "ty-2025",
    year: 2025,
    filingStartDate: "2026-03-01T00:00:00.000Z",
    filingEndDate: "2026-04-30T23:59:59.999Z",
    taxBrackets: TAX_BRACKETS_2025,
    reliefCaps: RELIEF_CAPS,
    isActive: true,
  },
  {
    id: "ty-2026",
    year: 2026,
    filingStartDate: "2027-03-01T00:00:00.000Z",
    filingEndDate: "2027-04-30T23:59:59.999Z",
    taxBrackets: TAX_BRACKETS_2025, // Same as 2025 for now
    reliefCaps: RELIEF_CAPS,
    isActive: true,
  },
];

console.log("🌱 Seeding tax years...");

for (const ty of taxYears) {
  const existing = db
    .prepare("SELECT id FROM TaxYear WHERE year = ?")
    .get(ty.year);
  if (existing) {
    console.log(`  ✓ Tax year ${ty.year} already exists`);
    continue;
  }

  db.prepare(
    `INSERT INTO TaxYear (id, year, filingStartDate, filingEndDate, taxBrackets, reliefCaps, isActive, createdAt)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(
    ty.id,
    ty.year,
    ty.filingStartDate,
    ty.filingEndDate,
    ty.taxBrackets,
    ty.reliefCaps,
    ty.isActive ? 1 : 0,
    new Date().toISOString()
  );

  console.log(`  ✓ Created tax year ${ty.year}`);
}

console.log("✅ Seed complete");
db.close();
