import puppeteer from 'puppeteer';
import * as cheerio from 'cheerio';
import { z } from 'zod';

const TaxRulesSchema = z.object({
  year: z.number(),
  taxBrackets: z.array(z.object({ 
    max: z.number(), 
    rate: z.number() 
  })),
  reliefCaps: z.record(z.string(), z.number()),
  filingStartDate: z.string(),
  filingEndDate: z.string()
});

export type TaxRules = z.infer<typeof TaxRulesSchema>;

export async function scrapeLHDN(year: number): Promise<TaxRules> {
  const browser = await puppeteer.launch({ 
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  
  const page = await browser.newPage();
  
  try {
    // Scrape tax brackets
    await page.goto('https://www.hasil.gov.my/individu/kitaran-cukai-individu/lapor-pendapatan/kadar-cukai/', {
      waitUntil: 'networkidle2',
      timeout: 30000
    });
    
    await page.waitForSelector('.tab-content', { timeout: 10000 });
    
    // Try to click year tab if exists
    try {
      const buttonSelector = `button:has-text("${year}")`;
      await page.waitForSelector(buttonSelector, { timeout: 5000 });
      await page.click(buttonSelector);
      await new Promise(resolve => setTimeout(resolve, 2000));
    } catch {
      console.log(`Year ${year} tab not found, using latest available`);
    }
    
    const bracketsHtml = await page.content();
    const taxBrackets = parseTaxBrackets(bracketsHtml);
    
    // Scrape relief caps
    await page.goto('https://www.hasil.gov.my/individu/kitaran-cukai-individu/lapor-pendapatan/pelepasan-cukai/', {
      waitUntil: 'networkidle2'
    });
    
    await page.waitForSelector('.tab-content', { timeout: 10000 });
    
    try {
      const buttonSelector = `button:has-text("TAHUN TAKSIRAN ${year}")`;
      await page.waitForSelector(buttonSelector, { timeout: 5000 });
      await page.click(buttonSelector);
      await new Promise(resolve => setTimeout(resolve, 2000));
    } catch {
      console.log(`Relief caps for year ${year} tab not found, using latest`);
    }
    
    const reliefsHtml = await page.content();
    const reliefCaps = parseReliefCaps(reliefsHtml);
    
    // Filing dates (estimate based on typical Malaysian tax year)
    const nextYear = year + 1;
    const filingStartDate = `${nextYear}-03-01T00:00:00.000Z`;
    const filingEndDate = `${nextYear}-04-30T23:59:59.999Z`;
    
    const data = {
      year,
      taxBrackets,
      reliefCaps,
      filingStartDate,
      filingEndDate
    };
    
    // Validate with Zod
    return TaxRulesSchema.parse(data);
    
  } finally {
    await browser.close();
  }
}

function parseTaxBrackets(html: string) {
  const $ = cheerio.load(html);
  const brackets: Array<{max: number, rate: number}> = [];
  
  // Find tables in active tab
  $('table').each((i, table) => {
    $(table).find('tr').each((j, row) => {
      if (j === 0) return; // Skip header
      
      const cells = $(row).find('td');
      if (cells.length < 2) return;
      
      const rangeText = $(cells[0]).text().trim();
      const rateText = $(cells[1]).text().trim();
      
      // Parse "RM 5,001 - RM 20,000" or similar formats
      const numbers = rangeText.match(/[\d,]+/g);
      if (!numbers || numbers.length === 0) return;
      
      // Get the upper bound (max)
      const max = parseInt(numbers[numbers.length - 1].replace(/[^\d]/g, ''));
      if (isNaN(max) || max === 0) return;
      
      // Parse rate "1%" -> 0.01
      const rateMatch = rateText.match(/([\d.]+)/);
      if (!rateMatch) return;
      
      const rate = parseFloat(rateMatch[1]) / 100;
      if (isNaN(rate)) return;
      
      brackets.push({ max, rate });
    });
  });
  
  // If parsing failed, return default 2025/2026 brackets
  if (brackets.length === 0) {
    console.log('Using fallback tax brackets');
    return [
      { max: 5000, rate: 0 },
      { max: 20000, rate: 0.01 },
      { max: 35000, rate: 0.03 },
      { max: 50000, rate: 0.06 },
      { max: 70000, rate: 0.11 },
      { max: 100000, rate: 0.19 },
      { max: 150000, rate: 0.25 },
      { max: 250000, rate: 0.26 },
      { max: 400000, rate: 0.27 },
      { max: 1000000, rate: 0.28 },
      { max: 9999999999, rate: 0.30 }
    ];
  }
  
  return brackets;
}

function parseReliefCaps(html: string) {
  const $ = cheerio.load(html);
  const caps: Record<string, number> = {};
  
  // Map common LHDN terms to our categories
  const mapping: Record<string, string[]> = {
    LIFESTYLE: ['gaya hidup', 'lifestyle', 'buku', 'internet', 'komputer', 'sukan'],
    MEDICAL: ['perubatan', 'kesihatan', 'medical', 'pemeriksaan', 'rawatan'],
    EDUCATION: ['pendidikan', 'education', 'yuran', 'pengajian', 'tertiari'],
    SSPN: ['sspn', 'simpanan pendidikan'],
    CHILDCARE: ['jagaan anak', 'childcare', 'tadika', 'taska', 'penjagaan']
  };
  
  $('table').each((i, table) => {
    $(table).find('tr').each((j, row) => {
      const cells = $(row).find('td');
      if (cells.length < 2) return;
      
      const description = $(cells[0]).text().toLowerCase().trim();
      const amountText = $(cells[1]).text().trim();
      
      // Extract amount "RM 2,500" -> 2500
      const amountMatch = amountText.match(/[\d,]+/);
      if (!amountMatch) return;
      
      const amount = parseInt(amountMatch[0].replace(/[^\d]/g, ''));
      if (isNaN(amount) || amount === 0) return;
      
      // Match to our categories
      for (const [category, keywords] of Object.entries(mapping)) {
        if (keywords.some(kw => description.includes(kw))) {
          // Keep the highest amount if multiple matches
          if (!caps[category] || caps[category] < amount) {
            caps[category] = amount;
          }
          break;
        }
      }
    });
  });
  
  // Return defaults if parsing failed
  if (Object.keys(caps).length === 0) {
    console.log('Using fallback relief caps');
    return {
      LIFESTYLE: 2500,
      MEDICAL: 10000,
      EDUCATION: 7000,
      SSPN: 8000,
      CHILDCARE: 3000
    };
  }
  
  // Ensure all categories exist with defaults if missing
  return {
    LIFESTYLE: caps.LIFESTYLE || 2500,
    MEDICAL: caps.MEDICAL || 10000,
    EDUCATION: caps.EDUCATION || 7000,
    SSPN: caps.SSPN || 8000,
    CHILDCARE: caps.CHILDCARE || 3000
  };
}
