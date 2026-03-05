const { PrismaClient } = require('@prisma/client');
const { PrismaBetterSqlite3 } = require('@prisma/adapter-better-sqlite3');

// Set up SQLite adapter for production
const dbUrl = process.env.DATABASE_URL || 'file:/app/prisma/prod.db';
const adapter = new PrismaBetterSqlite3({ url: dbUrl });

const prisma = new PrismaClient({ adapter });

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

async function main() {
  console.log('🌱 Seeding tax years...');

  // Check if tax years already exist
  const existingTaxYears = await prisma.taxYear.count();
  if (existingTaxYears > 0) {
    console.log(`✅ Database already has ${existingTaxYears} tax years. Skipping seed.`);
    return;
  }

  // Create tax years
  await prisma.taxYear.createMany({
    data: [
      {
        id: 'ty-2025',
        year: 2025,
        filingStartDate: new Date('2026-03-01T00:00:00.000Z'),
        filingEndDate: new Date('2026-04-30T23:59:59.999Z'),
        taxBrackets: TAX_BRACKETS_2025,
        reliefCaps: RELIEF_CAPS,
        isActive: true,
      },
      {
        id: 'ty-2026',
        year: 2026,
        filingStartDate: new Date('2027-03-01T00:00:00.000Z'),
        filingEndDate: new Date('2027-04-30T23:59:59.999Z'),
        taxBrackets: TAX_BRACKETS_2025,
        reliefCaps: RELIEF_CAPS,
        isActive: true,
      },
    ],
  });

  console.log('✅ Seeded 2 tax years (2025, 2026)');
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
