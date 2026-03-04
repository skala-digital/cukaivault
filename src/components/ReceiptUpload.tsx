"use client";

import { useRef, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { RELIEF_LABELS } from "@/lib/tax-calculator";
import { Camera, Pencil, ArrowLeft, Loader2 } from "lucide-react";

interface ReceiptUploadProps {
  userId: string;
  onScanned: (data: {
    amount: number;
    category: string;
    imageUrl?: string;
  }) => void;
  disabled?: boolean;
}

const CATEGORIES = Object.entries(RELIEF_LABELS).map(([value, label]) => ({
  value,
  label,
}));

export function ReceiptUpload({ onScanned, disabled }: ReceiptUploadProps) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);

  // Manual fallback form
  const [manualAmount, setManualAmount] = useState("");
  const [manualCategory, setManualCategory] = useState("LIFESTYLE");
  const [mode, setMode] = useState<"scan" | "manual">("scan");

  const handleFile = async (file: File) => {
    const previewUrl = URL.createObjectURL(file);
    setPreview(previewUrl);
    setScanning(true);

    try {
      const fd = new FormData();
      fd.append("file", file);

      const res = await fetch("/api/ocr", { method: "POST", body: fd });

      if (!res.ok) throw new Error("OCR failed");

      const { amount, category } = await res.json();

      if (!amount || !category) throw new Error("Incomplete OCR result");

      toast.success(
        `Detected: RM${amount} — ${RELIEF_LABELS[category] ?? category}`,
      );
      onScanned({ amount: parseFloat(amount), category, imageUrl: previewUrl });
      setOpen(false);
      setPreview(null);
    } catch (err) {
      toast.error("Couldn't read receipt automatically. Use manual entry.");
      setMode("manual");
      console.error(err);
    } finally {
      setScanning(false);
    }
  };

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const amount = parseFloat(manualAmount);
    if (!amount || amount <= 0) {
      toast.error("Enter a valid amount.");
      return;
    }
    onScanned({ amount, category: manualCategory });
    setManualAmount("");
    setOpen(false);
    setPreview(null);
    setMode("scan");
  };

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button
          variant="outline"
          className="w-full h-11 border-dashed gap-2"
          disabled={disabled}
        >
          <span>📎</span> Add Receipt / Relief
        </Button>
      </SheetTrigger>

      <SheetContent
        side="bottom"
        className="rounded-t-2xl px-5 sm:px-6 pb-8 max-w-md mx-auto"
      >
        {/* Drag handle */}
        <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-muted" />
        <SheetHeader className="mb-5 text-left">
          <SheetTitle className="text-base">Add a Receipt</SheetTitle>
        </SheetHeader>

        {mode === "scan" && (
          <div className="space-y-3">
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              capture="environment"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) handleFile(f);
                e.target.value = "";
              }}
            />

            {/* Scan CTA */}
            <button
              onClick={() => fileRef.current?.click()}
              disabled={scanning}
              className="w-full flex flex-col items-center justify-center gap-3 py-8 rounded-2xl border-2 border-dashed border-primary/30 bg-primary/5 hover:bg-primary/10 transition-colors disabled:opacity-60"
            >
              {scanning ? (
                <Loader2 className="h-8 w-8 text-primary animate-spin" />
              ) : (
                <Camera className="h-8 w-8 text-primary" />
              )}
              <div className="text-center">
                <p className="text-sm font-semibold">
                  {scanning ? "Scanning receipt…" : "Snap or Upload Receipt"}
                </p>
                <p className="text-[11px] text-muted-foreground mt-0.5">
                  {scanning
                    ? "Analysing with AI — just a moment"
                    : "Photo, gallery or file — AI will extract the details"}
                </p>
              </div>
            </button>

            {/* Divider */}
            <div className="flex items-center gap-3">
              <div className="flex-1 h-px bg-border" />
              <span className="text-[10px] uppercase tracking-widest text-muted-foreground">
                or
              </span>
              <div className="flex-1 h-px bg-border" />
            </div>

            <Button
              variant="outline"
              className="w-full gap-2"
              onClick={() => setMode("manual")}
              disabled={scanning}
            >
              <Pencil className="h-3.5 w-3.5" />
              Enter manually
            </Button>
          </div>
        )}

        {mode === "manual" && (
          <form onSubmit={handleManualSubmit} className="space-y-5">
            <div className="space-y-1.5">
              <Label htmlFor="mamount" className="text-xs font-medium">
                Amount (RM)
              </Label>
              <Input
                id="mamount"
                type="number"
                inputMode="decimal"
                placeholder="e.g. 250.00"
                value={manualAmount}
                onChange={(e) => setManualAmount(e.target.value)}
                className="h-11 text-base"
                autoFocus
              />
            </div>

            <div className="space-y-2">
              <Label className="text-xs font-medium">Relief Category</Label>
              <div className="grid grid-cols-2 gap-2">
                {CATEGORIES.map((c) => (
                  <button
                    key={c.value}
                    type="button"
                    onClick={() => setManualCategory(c.value)}
                    className={`px-3 py-2.5 rounded-xl border text-sm font-medium text-left transition-colors ${
                      manualCategory === c.value
                        ? "bg-primary text-primary-foreground border-primary"
                        : "bg-background hover:bg-muted/50 border-border text-foreground"
                    }`}
                  >
                    {c.label}
                  </button>
                ))}
              </div>
            </div>

            <Button type="submit" size="lg" className="w-full mt-1">
              Add Relief
            </Button>
            <Button
              type="button"
              variant="ghost"
              className="w-full gap-1.5 text-muted-foreground"
              onClick={() => setMode("scan")}
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              Back to scan
            </Button>
          </form>
        )}
      </SheetContent>
    </Sheet>
  );
}
