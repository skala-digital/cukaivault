"use client";

import { useEffect, useState } from "react";
import { useTaxStore } from "@/store/useTaxStore";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function TaxProfileSheet({ open, onOpenChange }: Props) {
  const { user, setProfile, setIsMuslim } = useTaxStore();

  const [form, setForm] = useState({
    fullName: user?.fullName ?? "",
    isMuslim: user?.isMuslim ?? true,
    employmentType: user?.employmentType ?? "EMPLOYED",
    epfContribution: String(user?.epfContribution ?? 0),
    lifeInsurance: String(user?.lifeInsurance ?? 0),
    medicalInsurance: String(user?.medicalInsurance ?? 0),
    hasSpouseRelief: user?.hasSpouseRelief ?? false,
    childrenUnder18: String(user?.childrenUnder18 ?? 0),
    childrenTertiary: String(user?.childrenTertiary ?? 0),
  });

  // Sync form when user loads from API
  useEffect(() => {
    if (!user) return;
    setForm({
      fullName: user.fullName ?? "",
      isMuslim: user.isMuslim,
      employmentType: user.employmentType,
      epfContribution: String(user.epfContribution),
      lifeInsurance: String(user.lifeInsurance),
      medicalInsurance: String(user.medicalInsurance),
      hasSpouseRelief: user.hasSpouseRelief,
      childrenUnder18: String(user.childrenUnder18),
      childrenTertiary: String(user.childrenTertiary),
    });
  }, [user?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  async function handleSave() {
    setIsMuslim(form.isMuslim);
    setProfile({
      fullName: form.fullName || undefined,
      employmentType: form.employmentType as "EMPLOYED" | "SELF_EMPLOYED",
      epfContribution: parseFloat(form.epfContribution) || 0,
      lifeInsurance: parseFloat(form.lifeInsurance) || 0,
      medicalInsurance: parseFloat(form.medicalInsurance) || 0,
      hasSpouseRelief: form.hasSpouseRelief,
      childrenUnder18: parseInt(form.childrenUnder18) || 0,
      childrenTertiary: parseInt(form.childrenTertiary) || 0,
    });
    if (user?.id) {
      await fetch(`/api/user/${user.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fullName: form.fullName || null,
          isMuslim: form.isMuslim,
          employmentType: form.employmentType,
          epfContribution: parseFloat(form.epfContribution) || 0,
          lifeInsurance: parseFloat(form.lifeInsurance) || 0,
          medicalInsurance: parseFloat(form.medicalInsurance) || 0,
          hasSpouseRelief: form.hasSpouseRelief,
          childrenUnder18: parseInt(form.childrenUnder18) || 0,
          childrenTertiary: parseInt(form.childrenTertiary) || 0,
        }),
      });
    }
    onOpenChange(false);
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="bottom"
        className="max-h-[92vh] overflow-y-auto rounded-t-2xl px-5 sm:px-6 pb-8"
      >
        {/* Drag handle */}
        <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-muted" />
        <SheetHeader className="mb-5 text-left">
          <SheetTitle className="text-lg">Tax Profile</SheetTitle>
          <p className="text-sm text-muted-foreground">
            Improves your LHDN tax estimate accuracy.
          </p>
        </SheetHeader>

        <div className="space-y-6">
          {/* Personal */}
          <div className="space-y-4">
            <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground border-b pb-1.5">
              Personal
            </p>
            <div className="space-y-1.5">
              <Label htmlFor="fullName">Full Name (optional)</Label>
              <Input
                id="fullName"
                placeholder="Your name"
                value={form.fullName}
                onChange={(e) => setForm({ ...form, fullName: e.target.value })}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Religion</Label>
              <div className="flex gap-2">
                {([true, false] as const).map((val) => (
                  <Button
                    key={String(val)}
                    size="sm"
                    variant={form.isMuslim === val ? "default" : "outline"}
                    onClick={() => setForm({ ...form, isMuslim: val })}
                  >
                    {val ? "Muslim" : "Non-Muslim"}
                  </Button>
                ))}
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Employment Type</Label>
              <div className="flex gap-2">
                {(["EMPLOYED", "SELF_EMPLOYED"] as const).map((t) => (
                  <Button
                    key={t}
                    size="sm"
                    variant={form.employmentType === t ? "default" : "outline"}
                    onClick={() => setForm({ ...form, employmentType: t })}
                  >
                    {t === "EMPLOYED" ? "Employed" : "Self-Employed"}
                  </Button>
                ))}
              </div>
            </div>
          </div>

          <Separator />

          {/* EPF & Insurance */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 border-b pb-1.5">
              <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
                EPF & Insurance
              </p>
              <Badge variant="secondary" className="text-[9px] h-4 px-1.5">
                Annual
              </Badge>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="epf">
                  EPF{" "}
                  <span className="text-muted-foreground text-xs">
                    (cap RM 4,000)
                  </span>
                </Label>
                <Input
                  id="epf"
                  type="number"
                  min={0}
                  max={4000}
                  value={form.epfContribution}
                  onChange={(e) =>
                    setForm({ ...form, epfContribution: e.target.value })
                  }
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="life">
                  Life Insurance{" "}
                  <span className="text-muted-foreground text-xs">
                    (cap RM 3,000)
                  </span>
                </Label>
                <Input
                  id="life"
                  type="number"
                  min={0}
                  max={3000}
                  value={form.lifeInsurance}
                  onChange={(e) =>
                    setForm({ ...form, lifeInsurance: e.target.value })
                  }
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="medical">
                  Medical Insurance{" "}
                  <span className="text-muted-foreground text-xs">
                    (cap RM 3,000)
                  </span>
                </Label>
                <Input
                  id="medical"
                  type="number"
                  min={0}
                  max={3000}
                  value={form.medicalInsurance}
                  onChange={(e) =>
                    setForm({ ...form, medicalInsurance: e.target.value })
                  }
                />
              </div>
            </div>
          </div>

          <Separator />

          {/* Dependants */}
          <div className="space-y-4">
            <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground border-b pb-1.5">
              Dependants
            </p>
            <div className="flex items-center justify-between">
              <Label>
                Spouse relief{" "}
                <span className="text-muted-foreground text-xs">
                  (RM 4,000)
                </span>
              </Label>
              <Button
                size="sm"
                variant={form.hasSpouseRelief ? "default" : "outline"}
                onClick={() =>
                  setForm({ ...form, hasSpouseRelief: !form.hasSpouseRelief })
                }
              >
                {form.hasSpouseRelief ? "Yes" : "No"}
              </Button>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="childUnder18">
                  Children under 18{" "}
                  <span className="text-muted-foreground text-xs">
                    (RM 2,000 each)
                  </span>
                </Label>
                <Input
                  id="childUnder18"
                  type="number"
                  min={0}
                  value={form.childrenUnder18}
                  onChange={(e) =>
                    setForm({ ...form, childrenUnder18: e.target.value })
                  }
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="childTertiary">
                  Children in tertiary{" "}
                  <span className="text-muted-foreground text-xs">
                    (RM 8,000 each)
                  </span>
                </Label>
                <Input
                  id="childTertiary"
                  type="number"
                  min={0}
                  value={form.childrenTertiary}
                  onChange={(e) =>
                    setForm({ ...form, childrenTertiary: e.target.value })
                  }
                />
              </div>
            </div>
          </div>

          <Button size="lg" className="w-full mt-2" onClick={handleSave}>
            Save Profile
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
