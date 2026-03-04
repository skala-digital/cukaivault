import { prisma } from '@/lib/prisma';
import { scrapeLHDN } from '@/lib/lhdn-scraper';
import { verifyAdminAuth } from '@/lib/admin-auth';
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  // Verify admin authentication
  const { authorized, email } = await verifyAdminAuth();
  if (!authorized || !email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  
  const { year } = await request.json();
  const targetYear = year || new Date().getFullYear() + 1;
  const startTime = Date.now();
  
  try {
    // 1. Scrape LHDN
    console.log(`[SYNC] Starting scrape for year ${targetYear}...`);
    const rules = await scrapeLHDN(targetYear);
    console.log(`[SYNC] Scrape complete:`, rules);
    
    // 2. Update or create TaxYear
    const existing = await prisma.taxYear.findUnique({
      where: { year: targetYear }
    });
    
    if (existing) {
      await prisma.taxYear.update({
        where: { year: targetYear },
        data: {
          taxBrackets: JSON.stringify(rules.taxBrackets),
          reliefCaps: JSON.stringify(rules.reliefCaps),
          filingStartDate: new Date(rules.filingStartDate),
          filingEndDate: new Date(rules.filingEndDate)
        }
      });
      console.log(`[SYNC] Updated existing tax year ${targetYear}`);
    } else {
      await prisma.taxYear.create({
        data: {
          year: targetYear,
          taxBrackets: JSON.stringify(rules.taxBrackets),
          reliefCaps: JSON.stringify(rules.reliefCaps),
          filingStartDate: new Date(rules.filingStartDate),
          filingEndDate: new Date(rules.filingEndDate),
          isActive: true
        }
      });
      console.log(`[SYNC] Created new tax year ${targetYear}`);
    }
    
    // 3. Log success
    const duration = Date.now() - startTime;
    await prisma.syncLog.create({
      data: {
        year: targetYear,
        status: 'SUCCESS',
        details: JSON.stringify(rules),
        duration,
        triggeredBy: email
      }
    });
    
    console.log(`[SYNC] Success! Duration: ${duration}ms`);
    
    return NextResponse.json({
      success: true,
      year: targetYear,
      duration,
      rules
    });
    
  } catch (error) {
    // Log failure
    const duration = Date.now() - startTime;
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    
    console.error(`[SYNC] Failed:`, error);
    
    await prisma.syncLog.create({
      data: {
        year: targetYear,
        status: 'FAILED',
        details: JSON.stringify({ error: errorMessage, stack: error instanceof Error ? error.stack : undefined }),
        duration,
        triggeredBy: email
      }
    });
    
    return NextResponse.json({
      error: 'Sync failed',
      details: errorMessage
    }, { status: 500 });
  }
}
