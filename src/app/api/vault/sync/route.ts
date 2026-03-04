import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

interface ScrapedEntry {
  title: string;
  url: string;
  summary: string;
  category: string;
}

// POST /api/vault/sync — trigger Python scraper and upsert results
export async function POST() {
  try {
    const res = await fetch("http://127.0.0.1:8000/scrape", { method: "POST" });
    if (!res.ok) {
      const text = await res.text();
      return NextResponse.json(
        { error: `Scraper returned ${res.status}: ${text}` },
        { status: 502 }
      );
    }

    const { entries }: { entries: ScrapedEntry[] } = await res.json();

    const upserted = await Promise.all(
      entries.map((e) =>
        prisma.vaultEntry.upsert({
          where: { url: e.url },
          update: {
            title: e.title,
            summary: e.summary,
            category: e.category,
            scrapedAt: new Date(),
          },
          create: {
            title: e.title,
            url: e.url,
            summary: e.summary,
            source: "LHDN",
            category: e.category,
          },
        })
      )
    );

    return NextResponse.json({ synced: upserted.length });
  } catch (err) {
    console.error("[vault/sync]", err);
    return NextResponse.json({ error: "Sync failed" }, { status: 500 });
  }
}
