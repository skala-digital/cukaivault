"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useSession, signOut } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Loader2, RefreshCw, Users, FileText, LogOut } from "lucide-react";

interface SyncLog {
  id: string;
  year: number;
  status: string;
  details: string;
  duration: number;
  triggeredBy: string;
  createdAt: string;
}

interface User {
  id: string;
  phone: string;
  email?: string;
  fullName?: string;
  grossIncome: number;
  createdAt: string;
  isAdmin: boolean;
}

export default function AdminDashboard() {
  const router = useRouter();
  const { data: session, status } = useSession();
  const [syncing, setSyncing] = useState(false);
  const [syncYear, setSyncYear] = useState(2026);
  const [syncLogs, setSyncLogs] = useState<SyncLog[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (status === "loading") return;

    if (status === "unauthenticated") {
      router.push("/admin/login");
      return;
    }

    if (session) {
      fetchData();
    }
  }, [session, status, router]);

  const fetchData = async () => {
    try {
      // Fetch sync logs
      const logsRes = await fetch("/api/admin/sync-logs");
      if (logsRes.ok) {
        const { logs } = await logsRes.json();
        setSyncLogs(logs || []);
      }

      // Fetch users
      const usersRes = await fetch("/api/admin/users");
      if (usersRes.ok) {
        const { users } = await usersRes.json();
        setUsers(users || []);
      }
    } catch (error) {
      console.error("Failed to fetch data:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSync = async () => {
    setSyncing(true);

    try {
      const res = await fetch("/api/admin/sync-tax-rules", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ year: syncYear }),
      });

      const data = await res.json();

      if (data.success) {
        toast.success(`Tax rules synced for ${data.year}!`, {
          description: `Completed in ${(data.duration / 1000).toFixed(1)}s`,
        });
        fetchData(); // Refresh logs
      } else {
        toast.error("Sync failed", {
          description: data.details || "Unknown error",
        });
      }
    } catch (error) {
      toast.error("Network error", {
        description: "Could not connect to LHDN website",
      });
    } finally {
      setSyncing(false);
    }
  };

  const handleLogout = () => {
    signOut({ callbackUrl: "/admin/login" });
  };

  if (loading || status === "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-muted/30">
      {/* Header */}
      <header className="border-b bg-card px-6 py-4 sticky top-0 z-10">
        <div className="flex items-center justify-between max-w-7xl mx-auto">
          <div>
            <h1 className="text-2xl font-bold">CukaiVault Admin</h1>
            <p className="text-sm text-muted-foreground">
              Logged in as {session?.user?.email}
            </p>
          </div>
          <Button variant="outline" size="sm" onClick={handleLogout}>
            <LogOut className="mr-2 h-4 w-4" />
            Logout
          </Button>
        </div>
      </header>

      {/* Main Content */}
      <div className="p-6 max-w-7xl mx-auto">
        <Tabs defaultValue="sync" className="space-y-6">
          <TabsList>
            <TabsTrigger value="sync">
              <RefreshCw className="mr-2 h-4 w-4" />
              LHDN Sync
            </TabsTrigger>
            <TabsTrigger value="users">
              <Users className="mr-2 h-4 w-4" />
              Users ({users.length})
            </TabsTrigger>
            <TabsTrigger value="logs">
              <FileText className="mr-2 h-4 w-4" />
              Sync Logs
            </TabsTrigger>
          </TabsList>

          {/* Sync Tab */}
          <TabsContent value="sync">
            <Card className="p-6">
              <h2 className="text-xl font-semibold mb-2">
                Sync LHDN Tax Rules
              </h2>
              <p className="text-sm text-muted-foreground mb-6">
                Scrape the latest tax brackets, relief caps, and filing
                deadlines from LHDN official website. This process takes 30-60
                seconds.
              </p>

              <div className="flex items-end gap-4 mb-6">
                <div className="flex-1 max-w-xs">
                  <Label htmlFor="syncYear">Tax Year</Label>
                  <Input
                    id="syncYear"
                    type="number"
                    value={syncYear}
                    onChange={(e) =>
                      setSyncYear(parseInt(e.target.value) || 2026)
                    }
                    min={2020}
                    max={2030}
                  />
                </div>
                <Button onClick={handleSync} disabled={syncing} size="lg">
                  {syncing ? (
                    <>
                      <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                      Syncing from LHDN...
                    </>
                  ) : (
                    <>
                      <RefreshCw className="mr-2 h-5 w-5" />
                      Sync Tax Rules
                    </>
                  )}
                </Button>
              </div>

              {/* Last sync info */}
              {syncLogs[0] && (
                <div className="p-4 bg-muted rounded-lg border">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium">Last Sync</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        Year {syncLogs[0].year} • {syncLogs[0].status} •{" "}
                        {new Date(syncLogs[0].createdAt).toLocaleString()} (
                        {(syncLogs[0].duration / 1000).toFixed(1)}s)
                      </p>
                    </div>
                    <div
                      className={`px-3 py-1 rounded-full text-xs font-medium ${
                        syncLogs[0].status === "SUCCESS"
                          ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                          : "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
                      }`}
                    >
                      {syncLogs[0].status}
                    </div>
                  </div>
                </div>
              )}
            </Card>
          </TabsContent>

          {/* Users Tab */}
          <TabsContent value="users">
            <Card className="p-6">
              <h2 className="text-xl font-semibold mb-4">User Management</h2>
              <div className="space-y-2 max-h-[600px] overflow-y-auto">
                {users.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-8">
                    No users yet
                  </p>
                ) : (
                  users.map((user) => (
                    <div
                      key={user.id}
                      className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                    >
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <p className="font-medium">
                            {user.fullName || user.phone}
                          </p>
                          {user.isAdmin && (
                            <span className="px-2 py-0.5 bg-primary/10 text-primary text-xs rounded-full">
                              Admin
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">
                          {user.email || user.phone} • Joined{" "}
                          {new Date(user.createdAt).toLocaleDateString()}
                        </p>
                      </div>
                      <div className="text-right text-sm">
                        <p className="font-medium">
                          RM {Number(user.grossIncome)?.toLocaleString() || 0}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Annual Income
                        </p>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </Card>
          </TabsContent>

          {/* Logs Tab */}
          <TabsContent value="logs">
            <Card className="p-6">
              <h2 className="text-xl font-semibold mb-4">Sync History</h2>
              <div className="space-y-2 max-h-[600px] overflow-y-auto">
                {syncLogs.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-8">
                    No sync logs yet
                  </p>
                ) : (
                  syncLogs.map((log) => (
                    <div key={log.id} className="p-4 border rounded-lg">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-sm font-medium">
                            Year {log.year}
                          </span>
                          <span
                            className={`text-xs px-2 py-1 rounded-full ${
                              log.status === "SUCCESS"
                                ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                                : "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
                            }`}
                          >
                            {log.status}
                          </span>
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {new Date(log.createdAt).toLocaleString()} •{" "}
                          {(log.duration / 1000).toFixed(1)}s
                        </div>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Triggered by {log.triggeredBy}
                      </p>
                    </div>
                  ))
                )}
              </div>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
