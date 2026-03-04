"use client";

import { useEffect, useRef, useState, ElementType } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { CircularMeter } from "@/components/CircularMeter";
import { ReceiptUpload } from "@/components/ReceiptUpload";
import { TaxProfileSheet } from "@/components/TaxProfileSheet";
import { ReliefTracker } from "@/components/ReliefTracker";
import { VaultFeed } from "@/components/VaultFeed";
import { ThemeToggle } from "@/components/ThemeToggle";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useTaxStore } from "@/store/useTaxStore";
import { RELIEF_LABELS } from "@/lib/tax-calculator";
import { formatRM } from "@/lib/utils";
import {
  ChevronRight,
  User,
  ShoppingBag,
  HeartPulse,
  GraduationCap,
  PiggyBank,
  Baby,
  FileText,
} from "lucide-react";

/** Map receipt category → Lucide icon component */
const CATEGORY_ICONS: Record<string, ElementType> = {
  LIFESTYLE: ShoppingBag,
  MEDICAL: HeartPulse,
  EDUCATION: GraduationCap,
  SSPN: PiggyBank,
  CHILDCARE: Baby,
  OTHER: FileText,
};

export default function DashboardPage() {
  const router = useRouter();
  const {
    user,
    receipts,
    summary,
    setUser,
    setGrossIncome,
    addReceipt,
    removeReceipt,
    setReceipts,
  } = useTaxStore();

  const [incomeInput, setIncomeInput] = useState("");
  const [syncing, setSyncing] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [availableYears, setAvailableYears] = useState<
    Array<{ id: string; year: number; filingEndDate: string }>
  >([]);
  const incomeDebounce = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Auto-restore session from localStorage
  useEffect(() => {
    const userId = localStorage.getItem("cg_user_id");
    if (!userId) {
      router.replace("/");
      return;
    }
    if (user) return;

    fetch(`/api/user/${userId}`)
      .then((r) => r.json())
      .then(({ user: u }) => {
        if (!u) {
          router.replace("/");
          return;
        }
        setUser({
          id: u.id,
          phone: u.phone,
          fullName: u.fullName ?? undefined,
          isMuslim: u.isMuslim,
          employmentType: u.employmentType ?? "EMPLOYED",
          grossIncome: Number(u.grossIncome),
          totalReliefs: Number(u.totalReliefs),
          currentTaxYearId: u.currentTaxYearId,
          epfContribution: Number(u.epfContribution ?? 0),
          lifeInsurance: Number(u.lifeInsurance ?? 0),
          medicalInsurance: Number(u.medicalInsurance ?? 0),
          hasSpouseRelief: Boolean(u.hasSpouseRelief),
          childrenUnder18: Number(u.childrenUnder18 ?? 0),
          childrenTertiary: Number(u.childrenTertiary ?? 0),
        });
        setIncomeInput(
          Number(u.grossIncome) > 0 ? String(Number(u.grossIncome)) : "",
        );
        setReceipts(
          (u.receipts ?? []).map((r: Record<string, unknown>) => ({
            id: r.id,
            amount: Number(r.amount),
            category: String(r.category),
            imageUrl: r.imageUrl as string | null,
            isVerified: Boolean(r.isVerified),
            createdAt: String(r.createdAt),
          })),
        );
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Fetch available tax years
  useEffect(() => {
    fetch("/api/tax-years")
      .then((r) => r.json())
      .then(({ years }) => {
        setAvailableYears(years || []);
      });
  }, []);

  const handleIncomeChange = (val: string) => {
    setIncomeInput(val);
    if (incomeDebounce.current) clearTimeout(incomeDebounce.current);
    incomeDebounce.current = setTimeout(async () => {
      const amount = parseFloat(val) || 0;
      setGrossIncome(amount);
      if (!user) return;
      await fetch(`/api/user/${user.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ grossIncome: amount }),
      });
    }, 600);
  };

  const handleYearSwitch = async (taxYearId: string) => {
    if (!user || !taxYearId) return;
    setSyncing(true);
    try {
      // Update user's currentTaxYearId
      await fetch(`/api/user/${user.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentTaxYearId: taxYearId }),
      });
      // Reload user data to get receipts for new year
      const res = await fetch(`/api/user/${user.id}`);
      const { user: u } = await res.json();
      setUser({
        ...user,
        currentTaxYearId: u.currentTaxYearId,
      });
      setReceipts(
        (u.receipts ?? []).map((r: Record<string, unknown>) => ({
          id: r.id,
          amount: Number(r.amount),
          category: String(r.category),
          imageUrl: r.imageUrl as string | null,
          isVerified: Boolean(r.isVerified),
          createdAt: String(r.createdAt),
        })),
      );
      toast.success("Switched tax year");
    } catch {
      toast.error("Failed to switch year");
    } finally {
      setSyncing(false);
    }
  };

  const handleReceiptScanned = async (data: {
    amount: number;
    category: string;
    imageUrl?: string;
  }) => {
    if (!user) return;
    setSyncing(true);
    try {
      const res = await fetch("/api/receipts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: user.id, ...data }),
      });
      const { receipt } = await res.json();
      addReceipt({
        id: receipt.id,
        amount: Number(receipt.amount),
        category: receipt.category,
        imageUrl: receipt.imageUrl,
        isVerified: receipt.isVerified,
        createdAt: receipt.createdAt,
      });
      toast.success(`Receipt added: ${formatRM(Number(receipt.amount), 2)}`);
    } catch {
      toast.error("Failed to save receipt.");
    } finally {
      setSyncing(false);
    }
  };

  const handleDeleteReceipt = async (id: string) => {
    try {
      await fetch(`/api/receipts/${id}`, { method: "DELETE" });
      removeReceipt(id);
      toast.success("Receipt removed.");
    } catch {
      toast.error("Failed to delete receipt.");
    }
  };

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-muted-foreground text-sm animate-pulse">
          Loading…
        </div>
      </div>
    );
  }

  const taxPayable = summary?.taxPayable ?? 0;
  const taxBeforeReceipts = summary?.taxBeforeReceipts ?? 0;
  const zakatNeeded = summary?.zakatNeeded ?? 0;
  const donationNeeded = summary?.donationNeededForTierDrop ?? 0;
  const actionAmount = user.isMuslim ? zakatNeeded : donationNeeded;
  const isSettled = taxPayable === 0;

  // Calculate savings from receipts: meter shows tax reduction progress
  // Shows how much tax you've saved by adding receipt-based reliefs
  const meterPct =
    taxBeforeReceipts > 0
      ? Math.min(
          100,
          ((taxBeforeReceipts - taxPayable) / taxBeforeReceipts) * 100,
        )
      : 0;

  return (
    <div className="min-h-screen flex flex-col">
      {/* ── Header ─────────────────────────────────────────── */}
      <header className="border-b px-4 sm:px-6 py-3 flex items-center justify-between gap-3">
        <h1 className="font-bold text-base">CukaiVault</h1>
        {/* Tax year selector */}
        <div className="text-center shrink-0">
          <p className="text-[9px] text-muted-foreground uppercase tracking-wide mb-1">
            Tax Year
          </p>
          <div className="relative">
            <select
              className="appearance-none text-sm font-semibold bg-card border border-input rounded-md px-3 py-1.5 pr-8 cursor-pointer hover:bg-accent transition-colors focus:outline-none focus:ring-2 focus:ring-ring"
              value={user.currentTaxYearId || ""}
              onChange={(e) => handleYearSwitch(e.target.value)}
              disabled={syncing}
            >
              {availableYears.map((y) => (
                <option key={y.id} value={y.id}>
                  {y.year}
                </option>
              ))}
            </select>
            <ChevronRight className="absolute right-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none rotate-90" />
          </div>
          {/* {availableYears.find((y) => y.id === user.currentTaxYearId) && (
              <p className="text-[9px] text-muted-foreground mt-1">
                Filing by:{" "}
                {new Date(
                  availableYears.find((y) => y.id === user.currentTaxYearId)!
                    .filingEndDate,
                ).toLocaleDateString("en-MY", {
                  day: "numeric",
                  month: "short",
                  year: "numeric",
                })}
              </p>
            )} */}
        </div>
        <div className="flex items-center gap-1">
          <ThemeToggle />
          <Button
            variant="ghost"
            size="sm"
            className="text-xs text-muted-foreground"
            onClick={() => {
              localStorage.removeItem("cg_user_id");
              router.replace("/");
            }}
          >
            Sign out
          </Button>
        </div>
      </header>

      {/* ── Two-column layout ──────────────────────────────── */}
      <div className="flex-1 grid lg:grid-cols-[minmax(380px,1fr)_minmax(360px,480px)]">
        {/* ══════════════════════════════════════════════════
            LEFT PANEL
            Row 1 : Meter  +  Est Tax / stat cards
            Row 2 : Donation / Zakat note
            Row 3 : Income input
            Row 4 : Profile summary
        ════════════════════════════════════════════════════ */}
        <div className="lg:border-r lg:overflow-y-auto lg:sticky lg:top-0 lg:h-[calc(100vh-49px)]">
          <div className="px-4 sm:px-6 py-5 space-y-5">
            {/* ROW 1 — Meter + Tax Summary */}
            <div className="grid grid-cols-[auto_1fr] gap-4 items-center">
              <CircularMeter
                size={140}
                strokeWidth={14}
                percentage={meterPct}
                centerLabel={formatRM(taxPayable)}
                centerSub="Tax"
                settled={isSettled}
              />
              <div className="space-y-2 min-w-0">
                {/* Tax Year + Filing Deadline */}
                <div className="flex items-center justify-between gap-2 mb-1">
                  {/* <div>
                    <p className="text-[11px] text-muted-foreground uppercase tracking-wide">
                      Est. Tax Payable
                    </p>
                    <p className="text-2xl font-bold tabular-nums leading-tight">
                      {formatRM(taxPayable, 2)}
                    </p>
                    {isSettled && (
                      <Badge className="bg-green-500 text-white text-[10px] mt-1">
                        🎉 RM0 Tax!
                      </Badge>
                    )}
                  </div> */}
                  {/* ROW 4 — Profile summary */}
                  <button
                    onClick={() => setProfileOpen(true)}
                    className="w-full text-left group mb-2"
                  >
                    <div className="flex items-center gap-3 px-3 py-3 rounded-xl border bg-card hover:bg-muted/40 transition-colors">
                      {/* Avatar bubble */}
                      <div className="shrink-0 w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center">
                        <User className="h-4 w-4 text-primary" />
                      </div>
                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate leading-tight">
                          {user.fullName || user.phone}
                        </p>
                        <div className="flex items-center gap-1 mt-1 flex-wrap">
                          <Badge
                            variant="secondary"
                            className="text-[9px] h-4 px-1.5"
                          >
                            {user.isMuslim ? "Muslim" : "Non-Muslim"}
                          </Badge>
                          <Badge
                            variant="outline"
                            className="text-[9px] h-4 px-1.5"
                          >
                            {user.employmentType === "EMPLOYED"
                              ? "Employed"
                              : "Self-Employed"}
                          </Badge>
                          {user.grossIncome > 0 && (
                            <span className="text-[10px] text-muted-foreground">
                              {formatRM(user.grossIncome)} / yr
                            </span>
                          )}
                        </div>
                      </div>
                      {/* Arrow */}
                      <div className="shrink-0 flex items-center gap-0.5 text-[10px] text-muted-foreground">
                        <span className="hidden sm:inline">Edit</span>
                        <ChevronRight className="h-3.5 w-3.5 group-hover:translate-x-0.5 transition-transform" />
                      </div>
                    </div>
                  </button>
                </div>
                {/* Stat cards */}
                {summary && (
                  <div className="grid grid-cols-3 rounded-lg border bg-muted/20 divide-x divide-border text-center overflow-hidden">
                    <div className="py-2 px-1">
                      <p className="text-[9px] text-muted-foreground uppercase tracking-wide leading-tight">
                        Chargeable
                      </p>
                      <p className="text-[11px] font-semibold tabular-nums mt-0.5">
                        {formatRM(summary.chargeableIncome)}
                      </p>
                    </div>
                    <div className="py-2 px-1">
                      <p className="text-[9px] text-muted-foreground uppercase tracking-wide leading-tight">
                        Reliefs
                      </p>
                      <p className="text-[11px] font-semibold tabular-nums mt-0.5">
                        {formatRM(summary.totalReliefs)}
                      </p>
                    </div>
                    <div className="py-2 px-1">
                      <p className="text-[9px] text-muted-foreground uppercase tracking-wide leading-tight">
                        Eff.&nbsp;Rate
                      </p>
                      <p className="text-[11px] font-semibold tabular-nums mt-0.5">
                        {(summary.effectiveRate * 100).toFixed(1)}%
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* ROW 2 — Donation / Zakat note */}
            {!isSettled && actionAmount > 0 && (
              <Card className="px-4 py-3 bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800">
                <p className="text-xs font-semibold text-amber-700 dark:text-amber-300 mb-0.5">
                  {user.isMuslim ? "⚡ Zakat to Zero" : "💡 Donation Tier-Drop"}
                </p>
                <p className="text-sm text-amber-900 dark:text-amber-100">
                  {user.isMuslim
                    ? `Pay ${formatRM(zakatNeeded, 2)} in Zakat to offset your full tax.`
                    : `Donate ${formatRM(donationNeeded, 2)} → drop to ${((summary?.targetBracketRate ?? 0) * 100).toFixed(0)}% bracket.`}
                </p>
              </Card>
            )}

            {/* ROW 3 — Annual income */}
            <div className="space-y-1.5">
              <Label htmlFor="income" className="text-xs">
                Annual Gross Income (RM)
              </Label>
              <Input
                id="income"
                type="number"
                placeholder="e.g. 72000"
                value={incomeInput}
                onChange={(e) => handleIncomeChange(e.target.value)}
                inputMode="numeric"
                className="h-10"
              />
            </div>
          </div>
        </div>

        {/* ══════════════════════════════════════════════════
            RIGHT PANEL
            Row 1 : Add receipt
            Row 2 : Tabs — Relief Tracker | Receipts
        ════════════════════════════════════════════════════ */}
        <div className="px-4 sm:px-6 py-5 space-y-4">
          {/* ROW 1 — Add receipt */}
          <ReceiptUpload
            userId={user.id}
            onScanned={handleReceiptScanned}
            disabled={syncing}
          />

          {/* ROW 2 — Tabs */}
          <Tabs defaultValue="tracker" className="w-full">
            <TabsList className="w-full">
              <TabsTrigger value="tracker" className="flex-1">
                Relief Tracker
              </TabsTrigger>
              <TabsTrigger value="receipts" className="flex-1">
                Receipts
                {receipts.length > 0 && (
                  <Badge
                    variant="secondary"
                    className="ml-1.5 text-[10px] py-0"
                  >
                    {receipts.length}
                  </Badge>
                )}
              </TabsTrigger>
            </TabsList>

            {/* Relief Tracker tab */}
            <TabsContent value="tracker" className="mt-4">
              <ReliefTracker />
            </TabsContent>

            {/* Receipts tab */}
            <TabsContent value="receipts" className="mt-4">
              {receipts.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-10">
                  No receipts yet. Add one above.
                </p>
              ) : (
                <div className="space-y-2">
                  {receipts.map((r) => {
                    const Icon = CATEGORY_ICONS[r.category] ?? FileText;
                    return (
                      <div
                        key={r.id}
                        className="flex items-center gap-3 px-3 py-2.5 rounded-xl border bg-card hover:bg-muted/30 transition-colors"
                      >
                        {/* Category icon bubble */}
                        <div className="shrink-0 w-8 h-8 rounded-lg bg-primary/8 flex items-center justify-center">
                          <Icon className="h-4 w-4 text-primary/70" />
                        </div>
                        {/* Info */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5 min-w-0">
                            <span className="text-sm font-semibold tabular-nums">
                              {formatRM(r.amount, 2)}
                            </span>
                            {r.isVerified && (
                              <span className="text-[9px] text-green-600 font-medium">
                                ✓
                              </span>
                            )}
                          </div>
                          <p className="text-[11px] text-muted-foreground truncate mt-0.5 leading-tight">
                            {RELIEF_LABELS[r.category] ?? r.category}
                            <span className="mx-1">·</span>
                            {new Date(r.createdAt).toLocaleDateString("en-MY")}
                          </p>
                        </div>
                        {/* Delete */}
                        <button
                          onClick={() => handleDeleteReceipt(r.id)}
                          className="shrink-0 text-muted-foreground/50 hover:text-destructive transition-colors p-1 rounded"
                          aria-label="Delete receipt"
                        >
                          <span className="text-base leading-none">×</span>
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </TabsContent>
          </Tabs>

          <Separator />
          <VaultFeed />
        </div>
      </div>

      {/* Profile sheet — controlled from profile summary row */}
      <TaxProfileSheet open={profileOpen} onOpenChange={setProfileOpen} />
    </div>
  );
}
