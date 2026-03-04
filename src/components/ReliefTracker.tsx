"use client";

import { useState } from "react";
import { useTaxStore } from "@/store/useTaxStore";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { formatRM } from "@/lib/utils";
import {
  Trash2,
  ShoppingBag,
  HeartPulse,
  GraduationCap,
  PiggyBank,
  Baby,
  FileText,
} from "lucide-react";
import type { ElementType } from "react";

const CAT_ICONS: Record<string, ElementType> = {
  LIFESTYLE: ShoppingBag,
  MEDICAL: HeartPulse,
  EDUCATION: GraduationCap,
  SSPN: PiggyBank,
  CHILDCARE: Baby,
  OTHER: FileText,
};

function pct(used: number, cap: number) {
  if (cap <= 0) return 0;
  return Math.min(100, Math.round((used / cap) * 100));
}

export function ReliefTracker() {
  const summary = useTaxStore((s) => s.summary);
  const receipts = useTaxStore((s) => s.receipts);
  const removeReceipt = useTaxStore((s) => s.removeReceipt);
  const [openCategory, setOpenCategory] = useState<string | null>(null);

  if (!summary) return null;
  const items = Object.entries(summary.reliefBreakdown);
  if (items.length === 0) return null;

  const savingMap = Object.fromEntries(
    summary.reliefSuggestions.map((s) => [s.label, s]),
  );

  const sheetReceipts = openCategory
    ? receipts.filter((r) => r.category.toUpperCase() === openCategory)
    : [];

  const sheetLabel = openCategory
    ? (summary.reliefBreakdown[openCategory]?.label ?? openCategory)
    : "";

  return (
    <>
      <div className="space-y-4">
        <p className="text-xs text-muted-foreground">
          Estimation only — not certified tax advice.
        </p>

        {items.map(([key, item]) => {
          const p = pct(item.used, item.cap);
          const full = p >= 100;
          const suggestion = savingMap[item.label];
          const catCount = receipts.filter(
            (r) => r.category.toUpperCase() === key,
          ).length;

          return (
            <div key={key} className="space-y-1.5">
              {/* Label row */}
              <div className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="font-medium">{item.label}</span>
                  {catCount > 0 && (
                    <button
                      onClick={() => setOpenCategory(key)}
                      className="text-[10px] text-primary underline underline-offset-2 hover:opacity-70 transition-opacity"
                    >
                      ({catCount} receipt{catCount !== 1 ? "s" : ""})
                    </button>
                  )}
                </div>
                <span className="text-muted-foreground tabular-nums shrink-0 ml-2">
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

              {/* Bar */}
              <Progress
                value={p}
                className={`h-2 ${full ? "opacity-50" : ""}`}
              />

              {/* Saving nudge */}
              {!full && suggestion && suggestion.potentialSaving > 0 && (
                <p className="text-[11px] text-muted-foreground">
                  Add{" "}
                  <span className="font-semibold text-foreground">
                    {formatRM(item.remaining)}
                  </span>{" "}
                  more →{" "}
                  <span className="font-semibold text-green-600 dark:text-green-400">
                    save {formatRM(suggestion.potentialSaving)} in tax
                  </span>
                </p>
              )}
            </div>
          );
        })}
      </div>

      {/* Per-category receipt drawer */}
      <Sheet
        open={openCategory !== null}
        onOpenChange={(o) => !o && setOpenCategory(null)}
      >
        <SheetContent
          side="bottom"
          className="max-h-[75vh] overflow-y-auto rounded-t-2xl px-5 sm:px-6 pb-8"
        >
          {/* Drag handle */}
          <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-muted" />
          <SheetHeader className="mb-5 text-left">
            <SheetTitle className="text-base">{sheetLabel} Receipts</SheetTitle>
          </SheetHeader>

          {sheetReceipts.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-10">
              No receipts in this category.
            </p>
          ) : (
            <div className="space-y-2 pb-2">
              {sheetReceipts.map((r) => {
                const Icon =
                  (openCategory ? CAT_ICONS[openCategory] : null) ?? FileText;
                return (
                  <div
                    key={r.id}
                    className="flex items-center gap-3 px-3 py-3 rounded-xl border bg-card"
                  >
                    {/* Icon bubble */}
                    <div className="shrink-0 w-9 h-9 rounded-lg bg-primary/8 flex items-center justify-center">
                      <Icon className="h-4 w-4 text-primary/70" />
                    </div>
                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <p className="text-sm font-semibold tabular-nums">
                          {formatRM(r.amount, 2)}
                        </p>
                        {r.isVerified && (
                          <span className="text-[10px] text-green-600 font-medium">
                            ✓ Verified
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-muted-foreground mt-0.5">
                        {new Date(r.createdAt).toLocaleDateString("en-MY", {
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                        })}
                      </p>
                    </div>
                    {/* Delete */}
                    <button
                      onClick={async () => {
                        try {
                          await fetch(`/api/receipts/${r.id}`, {
                            method: "DELETE",
                          });
                          removeReceipt(r.id);
                        } catch {
                          /* silent */
                        }
                      }}
                      className="shrink-0 p-1.5 rounded-lg text-muted-foreground/60 hover:text-destructive hover:bg-destructive/10 transition-colors"
                      aria-label="Delete receipt"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </SheetContent>
      </Sheet>
    </>
  );
}
