"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Loader2, RefreshCw, AlertCircle, CheckCircle2 } from "lucide-react";

interface TaxYear {
  id: string;
  year: number;
  isActive: boolean;
  filingStartDate: string;
  filingEndDate: string;
}

export default function AdminTaxYearsPage() {
  const [taxYears, setTaxYears] = useState<TaxYear[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const fetchTaxYears = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/tax-years");
      if (!res.ok) throw new Error("Failed to fetch tax years");
      const data = await res.json();
      setTaxYears(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSyncTaxYears = async () => {
    try {
      setSyncing(true);
      setError(null);
      setSuccess(null);

      const res = await fetch("/api/admin/sync-tax-rules", {
        method: "POST",
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Sync failed");
      }

      const data = await res.json();
      setSuccess(data.message || "Tax years synced successfully!");
      
      // Refresh tax years list
      await fetchTaxYears();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSyncing(false);
    }
  };

  useEffect(() => {
    fetchTaxYears();
  }, []);

  return (
    <div className="container mx-auto py-8 max-w-4xl">
      <div className="mb-6">
        <h1 className="text-3xl font-bold">Tax Years Management</h1>
        <p className="text-muted-foreground mt-2">
          Manage tax years and compliance rules from LHDN
        </p>
      </div>

      {/* Status Messages */}
      {error && (
        <Card className="p-4 mb-4 bg-destructive/10 border-destructive">
          <div className="flex items-center gap-2 text-destructive">
            <AlertCircle className="h-5 w-5" />
            <p className="font-medium">{error}</p>
          </div>
        </Card>
      )}

      {success && (
        <Card className="p-4 mb-4 bg-green-50 border-green-200 dark:bg-green-950/20">
          <div className="flex items-center gap-2 text-green-600 dark:text-green-400">
            <CheckCircle2 className="h-5 w-5" />
            <p className="font-medium">{success}</p>
          </div>
        </Card>
      )}

      {/* Sync Button */}
      <Card className="p-6 mb-6">
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-xl font-semibold mb-2">
              Sync from LHDN Website
            </h2>
            <p className="text-sm text-muted-foreground mb-4">
              Automatically scrape and update tax brackets, relief caps, and
              filing deadlines from the official LHDN website.
            </p>
            {taxYears.length === 0 && !loading && (
              <p className="text-sm text-amber-600 dark:text-amber-400 font-medium">
                ⚠️ No tax years configured. Users can login but won't see tax
                calculations until you sync.
              </p>
            )}
          </div>
          <Button
            onClick={handleSyncTaxYears}
            disabled={syncing}
            size="lg"
            className="ml-4"
          >
            {syncing ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Syncing...
              </>
            ) : (
              <>
                <RefreshCw className="mr-2 h-4 w-4" />
                Sync Tax Years
              </>
            )}
          </Button>
        </div>
      </Card>

      {/* Tax Years List */}
      <Card className="p-6">
        <h2 className="text-xl font-semibold mb-4">Current Tax Years</h2>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : taxYears.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <p className="mb-2">No tax years configured yet.</p>
            <p className="text-sm">
              Click "Sync Tax Years" above to import from LHDN.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {taxYears.map((ty) => (
              <div
                key={ty.id}
                className="flex items-center justify-between p-4 border rounded-lg"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold">Tax Year {ty.year}</h3>
                    {ty.isActive && (
                      <span className="px-2 py-0.5 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 text-xs font-medium rounded">
                        Active
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground mt-1">
                    Filing: {new Date(ty.filingStartDate).toLocaleDateString()} -{" "}
                    {new Date(ty.filingEndDate).toLocaleDateString()}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
