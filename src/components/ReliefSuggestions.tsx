"use client";

import { useTaxStore } from "@/store/useTaxStore";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatRM } from "@/lib/utils";
import { Lightbulb } from "lucide-react";

export function ReliefSuggestions() {
  const summary = useTaxStore((s) => s.summary);
  if (!summary || summary.reliefSuggestions.length === 0) return null;

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-1.5">
        <Lightbulb className="h-4 w-4 text-yellow-500" />
        <h3 className="text-sm font-semibold">Relief Opportunities</h3>
      </div>
      <p className="text-xs text-muted-foreground">
        Estimation only — not certified tax advice.
      </p>
      <div className="space-y-2">
        {summary.reliefSuggestions.map((s, i) => (
          <Card key={i} className="border-yellow-200 dark:border-yellow-900">
            <CardContent className="p-3 flex items-start justify-between gap-3">
              <div className="space-y-0.5 min-w-0">
                <p className="text-sm font-medium truncate">{s.label}</p>
                <p className="text-xs text-muted-foreground">{s.tip}</p>
              </div>
              <div className="text-right shrink-0">
                <Badge
                  variant="outline"
                  className="text-green-600 border-green-300 text-xs whitespace-nowrap"
                >
                  Save ~{formatRM(s.potentialSaving)}
                </Badge>
                <p className="text-[10px] text-muted-foreground mt-0.5">
                  {formatRM(s.remaining)} room left
                </p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
