"use client";

import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ExternalLink, RefreshCw, Newspaper } from "lucide-react";
import { toast } from "sonner";

interface VaultEntry {
  id: string;
  title: string;
  url: string;
  summary: string;
  source: string;
  category: string;
  scrapedAt: string;
}

export function VaultFeed() {
  const [entries, setEntries] = useState<VaultEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [syncing, setSyncing] = useState(false);

  async function load() {
    setLoading(true);
    try {
      const res = await fetch("/api/vault");
      const data = await res.json();
      setEntries(data.entries ?? []);
    } catch {
      // silently fail — vault is non-critical
    } finally {
      setLoading(false);
    }
  }

  async function handleSync() {
    setSyncing(true);
    try {
      const res = await fetch("/api/vault/sync", { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      toast.success(`Synced ${data.synced} LHDN entries`);
      load();
    } catch (e) {
      toast.error((e as Error).message ?? "Sync failed");
    } finally {
      setSyncing(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <Newspaper className="h-4 w-4 text-blue-500" />
          <h3 className="text-sm font-semibold">LHDN Vault</h3>
        </div>
        <Button
          variant="outline"
          size="sm"
          className="gap-1.5 h-7 text-xs"
          disabled={syncing}
          onClick={handleSync}
        >
          <RefreshCw className={`h-3 w-3 ${syncing ? "animate-spin" : ""}`} />
          {syncing ? "Syncing…" : "Sync"}
        </Button>
      </div>

      {loading && (
        <div className="text-xs text-muted-foreground text-center py-4">
          Loading LHDN news…
        </div>
      )}

      {!loading && entries.length === 0 && (
        <div className="text-xs text-muted-foreground text-center py-6 border rounded-lg">
          No entries yet. Press <strong>Sync</strong> to fetch latest LHDN news.
        </div>
      )}

      <div className="space-y-2">
        {entries.map((e) => (
          <Card key={e.id} className="hover:bg-muted/40 transition-colors">
            <CardContent className="p-3 space-y-1.5">
              <div className="flex items-start justify-between gap-2">
                <p className="text-sm font-medium leading-snug line-clamp-2">
                  {e.title}
                </p>
                <a
                  href={e.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="shrink-0 text-muted-foreground hover:text-foreground"
                >
                  <ExternalLink className="h-3.5 w-3.5" />
                </a>
              </div>
              {e.summary && (
                <p className="text-xs text-muted-foreground line-clamp-2">
                  {e.summary}
                </p>
              )}
              <div className="flex items-center gap-1.5">
                <Badge variant="secondary" className="text-[10px] py-0">
                  {e.category}
                </Badge>
                <span className="text-[10px] text-muted-foreground">
                  {new Date(e.scrapedAt).toLocaleDateString("en-MY", {
                    day: "numeric",
                    month: "short",
                    year: "numeric",
                  })}
                </span>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
