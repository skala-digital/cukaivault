"use client";

import { create } from "zustand";
import {
  computeTaxSummary,
  buildReceiptReliefsMap,
  type TaxSummary,
  type TaxProfile,
} from "@/lib/tax-calculator";

export interface ReceiptItem {
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

export interface UserProfile extends TaxProfile {
  id: string;
  phone: string;
  fullName?: string | null;
  isMuslim: boolean;
  employmentType: "EMPLOYED" | "SELF_EMPLOYED";
  grossIncome: number;
  totalReliefs: number;
  currentTaxYearId: string;
}

export interface TaxYear {
  id: string;
  year: number;
  filingStartDate: string;
  filingEndDate: string;
  isActive: boolean;
}

interface TaxState {
  user: UserProfile | null;
  receipts: ReceiptItem[];
  summary: TaxSummary | null;
  currentTaxYear: TaxYear | null;
  availableYears: TaxYear[];

  // Actions
  setUser: (user: UserProfile) => void;
  setGrossIncome: (amount: number) => void;
  setIsMuslim: (isMuslim: boolean) => void;
  setProfile: (partial: Partial<UserProfile>) => void;
  setCurrentTaxYear: (taxYear: TaxYear) => void;
  setAvailableYears: (years: TaxYear[]) => void;
  addReceipt: (receipt: ReceiptItem) => void;
  removeReceipt: (id: string) => void;
  setReceipts: (receipts: ReceiptItem[]) => void;
  recalculate: () => void;
  reset: () => void;
}

export const useTaxStore = create<TaxState>((set, get) => ({
  user: null,
  receipts: [],
  summary: null,
  currentTaxYear: null,
  availableYears: [],

  setUser: (user) => {
    set({ user });
    get().recalculate();
  },

  setGrossIncome: (amount) => {
    const user = get().user;
    if (!user) return;
    set({ user: { ...user, grossIncome: amount } });
    get().recalculate();
  },

  setIsMuslim: (isMuslim) => {
    const user = get().user;
    if (!user) return;
    set({ user: { ...user, isMuslim } });
    get().recalculate();
  },

  setProfile: (partial) => {
    const user = get().user;
    if (!user) return;
    set({ user: { ...user, ...partial } });
    get().recalculate();
  },

  setCurrentTaxYear: (taxYear) => {
    set({ currentTaxYear: taxYear });
  },

  setAvailableYears: (years) => {
    set({ availableYears: years });
  },

  addReceipt: (receipt) => {
    set((state) => ({ receipts: [receipt, ...state.receipts] }));
    get().recalculate();
  },

  removeReceipt: (id) => {
    set((state) => ({
      receipts: state.receipts.filter((r) => r.id !== id),
    }));
    get().recalculate();
  },

  setReceipts: (receipts) => {
    set({ receipts });
    get().recalculate();
  },

  recalculate: () => {
    const { user, receipts } = get();
    if (!user) return;
    const receiptReliefsMap = buildReceiptReliefsMap(receipts);
    const totalReliefs = Object.values(receiptReliefsMap).reduce(
      (s, v) => s + v,
      0
    );
    const summary = computeTaxSummary(
      user.grossIncome,
      receiptReliefsMap,
      user.isMuslim,
      {
        epfContribution: user.epfContribution,
        lifeInsurance: user.lifeInsurance,
        medicalInsurance: user.medicalInsurance,
        hasSpouseRelief: user.hasSpouseRelief,
        childrenUnder18: user.childrenUnder18,
        childrenTertiary: user.childrenTertiary,
      }
    );
    set({ summary, user: { ...user, totalReliefs } });
  },

  reset: () => set({ user: null, receipts: [], summary: null }),
}));
