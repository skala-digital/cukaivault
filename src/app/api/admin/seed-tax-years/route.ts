import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
// import { scrapeLHDN } from '@/lib/lhdn-scraper'; // Will enable scraping later

const ADMIN_EMAILS = process.env.ADMIN_EMAILS?.split(',').map(e => e.trim()) || ['zarulizham97@gmail.com'];

// Malaysia tax brackets 2025/2026 (default, will be updated by scraper)
const TAX_BRACKETS_DEFAULT = [
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
];

// Relief caps per LHDN (default, will be updated by scraper)
const RELIEF_CAPS_DEFAULT = {
  LIFESTYLE: 2500,
  MEDICAL: 10000,
  EDUCATION: 7000,
  SSPN: 8000,
  CHILDCARE: 3000,
  OTHER: 0,
};

export async function POST() {
  try {
    // Check authentication
    const session = await auth();
    if (!session?.user?.email || !ADMIN_EMAILS.includes(session.user.email)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if tax years already exist
    const existingCount = await prisma.taxYear.count();
    if (existingCount > 0) {
      return NextResponse.json({
        message: 'Tax years already exist',
        count: existingCount
      }, { status: 200 });
    }

    // Create default tax years
    const currentYear = new Date().getFullYear();
    const taxYears = [];

    for (let i = 0; i < 2; i++) {
      const year = currentYear + i;
      taxYears.push({
        id: `ty-${year}`,
        year,
        filingStartDate: new Date(`${year + 1}-03-01T00:00:00.000Z`),
        filingEndDate: new Date(`${year + 1}-04-30T23:59:59.999Z`),
        taxBrackets: JSON.stringify(TAX_BRACKETS_DEFAULT),
        reliefCaps: JSON.stringify(RELIEF_CAPS_DEFAULT),
        isActive: true,
      });
    }

    await prisma.taxYear.createMany({ data: taxYears });

    // TODO: Add LHDN scraper integration later
    // Currently using default tax brackets and relief caps

    return NextResponse.json({
      success: true,
      message: 'Tax years created successfully',
      years: taxYears.map(ty => ty.year),
      scrapedFromLHDN: false,
      data: 'Using default values'
    });

  } catch (error: any) {
    console.error('❌ Seed tax years error:', error);
    return NextResponse.json({
      error: 'Failed to seed tax years',
      details: error.message
    }, { status: 500 });
  }
}

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.email || !ADMIN_EMAILS.includes(session.user.email)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const count = await prisma.taxYear.count();
    const taxYears = await prisma.taxYear.findMany({
      orderBy: { year: 'desc' },
      take: 5
    });

    return NextResponse.json({
      count,
      taxYears: taxYears.map(ty => ({
        id: ty.id,
        year: ty.year,
        isActive: ty.isActive
      }))
    });

  } catch (error: any) {
    return NextResponse.json({
      error: 'Failed to fetch tax years',
      details: error.message
    }, { status: 500 });
  }
}
