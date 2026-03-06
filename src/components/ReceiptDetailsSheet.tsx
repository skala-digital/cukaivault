"use client";

import { useState } from "react";
import { formatRM } from "@/lib/utils";
import { RELIEF_LABELS } from "@/lib/tax-calculator";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import {
  X,
  Edit3,
  Check,
  Trash2,
  Image as ImageIcon,
  AlertTriangle,
  CheckCircle2,
} from "lucide-react";
import { toast } from "sonner";

interface Receipt {
  id: string;
  amount: number;
  category: string;
  imageUrl?: string | null;
  isVerified: boolean;
  confidence?: number | null;
  ocrMethod?: string | null;
  needsVerification?: boolean;
  createdAt: string;
}

interface ReceiptDetailsSheetProps {
  receipt: Receipt | null;
  onClose: () => void;
  onUpdate: (receiptId: string, updates: Partial<Receipt>) => Promise<void>;
  onDelete: (receiptId: string) => Promise<void>;
}

const CATEGORY_OPTIONS = [
  { value: "LIFESTYLE", label: "Lifestyle" },
  { value: "MEDICAL", label: "Medical & Health" },
  { value: "EDUCATION", label: "Education Fees" },
  { value: "SSPN", label: "SSPN Savings" },
  { value: "CHILDCARE", label: "Childcare" },
  { value: "OTHER", label: "Other" },
];

export function ReceiptDetailsSheet({
  receipt,
  onClose,
  onUpdate,
  onDelete,
}: ReceiptDetailsSheetProps) {
  const [editMode, setEditMode] = useState(false);
  const [editAmount, setEditAmount] = useState("");
  const [editCategory, setEditCategory] = useState("");
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const handleEditStart = () => {
    if (!receipt) return;
    setEditAmount(String(receipt.amount));
    setEditCategory(receipt.category);
    setEditMode(true);
  };

  const handleEditCancel = () => {
    setEditMode(false);
    setEditAmount("");
    setEditCategory("");
  };

  const handleSave = async () => {
    if (!receipt) return;
    const amount = parseFloat(editAmount);
    if (isNaN(amount) || amount <= 0) {
      toast.error("Invalid amount");
      return;
    }

    setSaving(true);
    try {
      await onUpdate(receipt.id, {
        amount,
        category: editCategory,
      });
      setEditMode(false);
      toast.success("Receipt updated");
    } catch (error) {
      toast.error("Failed to update receipt");
    } finally {
      setSaving(false);
    }
  };

  const handleVerifyToggle = async () => {
    if (!receipt) return;
    setSaving(true);
    try {
      await onUpdate(receipt.id, {
        isVerified: !receipt.isVerified,
        needsVerification: false,
      });
      toast.success(receipt.isVerified ? "Unverified" : "Verified ✓");
    } catch (error) {
      toast.error("Failed to update");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!receipt) return;
    if (!confirm("Delete this receipt? This action cannot be undone.")) return;

    setDeleting(true);
    try {
      await onDelete(receipt.id);
      onClose();
      toast.success("Receipt deleted");
    } catch (error) {
      toast.error("Failed to delete");
    } finally {
      setDeleting(false);
    }
  };

  return (
    <Sheet open={!!receipt} onOpenChange={(open) => !open && onClose()}>
      <SheetContent className="w-full sm:max-w-xl overflow-y-auto pb-8">
        {receipt && (
          <>
            <SheetHeader className="space-y-3">
              <SheetTitle className="flex items-center justify-between">
                <span>Receipt Details</span>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={onClose}
                  className="h-8 w-8"
                >
                  <X className="h-4 w-4" />
                </Button>
              </SheetTitle>
              <SheetDescription>
                View and edit receipt information
              </SheetDescription>
            </SheetHeader>

            <div className="mt-6 space-y-6 pb-6">
              {/* Receipt Image */}
              {receipt.imageUrl ? (
                <div className="space-y-3">
                  <Label className="text-sm font-semibold">Receipt Image</Label>
                  <div className="border-2 rounded-xl overflow-hidden bg-muted/30 shadow-sm">
                    <img
                      src={receipt.imageUrl}
                      alt="Receipt"
                      className="w-full h-auto object-contain max-h-[450px]"
                    />
                  </div>
                </div>
              ) : (
                <div className="flex items-center justify-center gap-2 py-12 border-2 border-dashed rounded-xl bg-muted/20 text-muted-foreground">
                  <ImageIcon className="h-5 w-5" />
                  <span className="text-sm">No image uploaded</span>
                </div>
              )}

              <Separator />

              {/* Amount & Category */}
              {editMode ? (
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="edit-amount">Amount (RM)</Label>
                    <Input
                      id="edit-amount"
                      type="number"
                      step="0.01"
                      value={editAmount}
                      onChange={(e) => setEditAmount(e.target.value)}
                      placeholder="0.00"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="edit-category">Category</Label>
                    <select
                      id="edit-category"
                      value={editCategory}
                      onChange={(e) => setEditCategory(e.target.value)}
                      className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm"
                    >
                      {CATEGORY_OPTIONS.map((opt) => (
                        <option key={opt.value} value={opt.value}>
                          {opt.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="flex gap-2">
                    <Button
                      onClick={handleSave}
                      disabled={saving}
                      className="flex-1"
                    >
                      {saving ? "Saving..." : "Save Changes"}
                    </Button>
                    <Button
                      variant="outline"
                      onClick={handleEditCancel}
                      disabled={saving}
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="space-y-5">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <Label className="text-xs text-muted-foreground uppercase tracking-wide">
                        Amount
                      </Label>
                      <p className="text-3xl font-bold mt-1.5">
                        {formatRM(receipt.amount)}
                      </p>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleEditStart}
                      className="gap-1.5 mt-6"
                    >
                      <Edit3 className="h-3.5 w-3.5" />
                      Edit
                    </Button>
                  </div>

                  <div>
                    <Label className="text-xs text-muted-foreground uppercase tracking-wide">
                      Category
                    </Label>
                    <p className="text-lg font-semibold mt-1.5">
                      {RELIEF_LABELS[receipt.category] ?? receipt.category}
                    </p>
                  </div>

                  <div>
                    <Label className="text-xs text-muted-foreground uppercase tracking-wide">
                      Date Added
                    </Label>
                    <p className="text-sm mt-1.5 font-medium">
                      {new Date(receipt.createdAt).toLocaleDateString("en-MY", {
                        day: "numeric",
                        month: "long",
                        year: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </p>
                  </div>
                </div>
              )}

              <Separator />

              {/* OCR Metadata */}
              {(receipt.ocrMethod || receipt.confidence != null) && (
                <>
                  <div className="space-y-3">
                    <Label className="text-sm font-semibold">
                      OCR Information
                    </Label>

                    <div className="flex flex-wrap gap-2">
                      {receipt.ocrMethod && (
                        <Badge
                          variant="outline"
                          className="text-xs font-medium"
                        >
                          Method: {receipt.ocrMethod}
                        </Badge>
                      )}
                      {receipt.confidence != null && (
                        <Badge
                          variant={
                            receipt.confidence >= 0.8 ? "default" : "secondary"
                          }
                          className={
                            receipt.confidence < 0.8
                              ? "bg-yellow-100 dark:bg-yellow-900/20 text-yellow-700 dark:text-yellow-400"
                              : ""
                          }
                        >
                          {Math.round(receipt.confidence * 100)}% confidence
                        </Badge>
                      )}
                    </div>

                    {receipt.needsVerification && (
                      <div className="flex items-start gap-3 p-4 rounded-xl bg-yellow-50 dark:bg-yellow-950/20 border-2 border-yellow-200 dark:border-yellow-800">
                        <AlertTriangle className="h-5 w-5 text-yellow-600 shrink-0 mt-0.5" />
                        <div className="flex-1">
                          <p className="text-sm font-semibold text-yellow-900 dark:text-yellow-100">
                            Verification Recommended
                          </p>
                          <p className="text-xs text-yellow-700 dark:text-yellow-300 mt-1">
                            This receipt had low confidence. Please verify the
                            amount and category.
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                  <Separator />
                </>
              )}

              {/* Actions */}
              <div className="space-y-3 pt-2">
                <Button
                  variant={receipt.isVerified ? "outline" : "default"}
                  className="w-full gap-2 h-11 text-sm font-semibold"
                  onClick={handleVerifyToggle}
                  disabled={saving}
                >
                  {receipt.isVerified ? (
                    <>
                      <Check className="h-4 w-4" />
                      Verified
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="h-4 w-4" />
                      Mark as Verified
                    </>
                  )}
                </Button>

                <Button
                  variant="destructive"
                  className="w-full gap-2 h-11 text-sm font-semibold"
                  onClick={handleDelete}
                  disabled={deleting}
                >
                  <Trash2 className="h-4 w-4" />
                  {deleting ? "Deleting..." : "Delete Receipt"}
                </Button>
              </div>
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}
