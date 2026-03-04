"use client";

import { useTaxStore } from "@/store/useTaxStore";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { formatRM } from "@/lib/utils";

function pct(used: number, cap: number) {
  if (cap <= 0) return 0;
  return Math.min(100, Math.round((used / cap) * 100));
}

export function ReliefProgressBars() {
  const summary = useTaxStore((s) => s.summary);
  if (!summary) return null;

  const items = Object.values(summary.reliefBreakdown);
  if (items.length === 0) return null;

  return (
    <div className="space-y-3">
      <h3 className="text-sm font-semibold">Relief Utilisation</h3>
      {items.map((item) => {
        const p = pct(item.used, item.cap);
        const full = p >= 100;
        return (
          <div key={item.label} className="space-y-1">
            <div className="flex items-center justify-between text-xs">
              <span className="font-medium">{item.label}</span>
              <span className="text-muted-foreground">
                {formatRM(item.used)} / {formatRM(item.cap)}
                {full && (
                  <Badge
                    variant="secondary"
                    className="ml-1.5 text-[10px] py-0"
                  >
                    Maxed
                  </Badge>
                )}
              </span>
            </div>
            <Progress value={p} className={`h-2 ${full ? "opacity-60" : ""}`} />
          </div>
        );
      })}
    </div>
  );
}
