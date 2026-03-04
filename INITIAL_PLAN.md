# 🚀 Project: CukaiGate (Zero-Tax Optimizer)

**Tagline:** Your frictionless gateway to a estimated RM0 tax bill.

**Version:** 1.0 (March 2026)

**Core Value:** Optimizing wealth through Zakat (Muslim) and LHDN-Approved Charities (Non-Muslim).

**Direction:**

Design: Friendly mobile app because we will focus on mobile user and will use it in webview in react-native in the future

---

## 🛠️ 1. Enhanced Tech Stack (The "Senior" Stack)

- **Frontend:** Next.js 15+ (App Router), TypeScript, Tailwind CSS, shadcn/ui.
- **PWA:** `Serwist` for offline-first capabilities and WebOTP (Auto-fill SMS code).
- **State Management:** `Zustand` (for real-time Tax Meter updates).
- **Database (Local):** SQLite + Prisma ORM (for rapid local iteration).
- **Database (Production):** MySQL (for ACID compliance on financial transactions).
- **Auth:** Passwordless OTP via **MoceanAPI** (High delivery rate for Malaysian Telcos).
- **AI/OCR:** Python FastAPI + Gemini Vision API (to categorize receipts into 2026 LHDN categories).
- **Payments:** Billplz / ToyyibPay (FPX Split-payment integration).

---

## 🗄️ 2. Database Schema (Prisma)

```prisma
datasource db {
  provider = "sqlite" // Change to "mysql" for production
  url      = "file:./dev.db"
}

generator client {
  provider = "prisma-client-js"
}

model User {
  id                String    @id @default(uuid())
  phone             String    @unique
  isMuslim          Boolean   @default(true)
  grossIncome       Decimal   @default(0)
  totalReliefs      Decimal   @default(0)
  receipts          Receipt[]
  transactions      Transaction[]
  createdAt         DateTime  @default(now())
}

model Receipt {
  id           String   @id @default(uuid())
  userId       String
  user         User     @relation(fields: [userId], references: [id])
  amount       Decimal
  category     String   // Maps to LHDN Reliefs (e.g., LIFESTYLE, MEDICAL)
  imageUrl     String?
  isVerified   Boolean  @default(false)
  createdAt    DateTime @default(now())
}

model Transaction {
  id              String   @id @default(uuid())
  userId          String
  user            User     @relation(fields: [userId], references: [id])
  principalAmount Decimal  // Net to Zakat/NGO
  platformFee     Decimal  @default(1.50)
  type            String   // ZAKAT_HARTA | DONATION_NGO
  status          String   @default("INITIATED")
  createdAt       DateTime @default(now())
}
```

---

## 🧠 3. Ecosystem & Logic Flow

### A. Frictionless Capture (The Input)

- **Manual Snap:** User snaps a photo of a receipt. Python AI extracts `Amount` and `Category`.
- **E-Invoice Sync:** (Future) Direct pull from LHDN MyInvois API.
- **Outcome:** The user's "Relief Progress Bar" fills up in real-time.

### B. The "Zero-Tax" Algorithm (The Engine)

- **Muslim Track:** If `Tax_Payable > 0`, CukaiGate suggests an exact Zakat amount to reach RM0 tax.
- **Non-Muslim Track:** Calculates the "Tier-Drop" point. Suggests a donation to drop into a lower 15% or 19% tax bracket.

### C. Monetization & Impact (The Output)

- **Processing Fee:** RM1.50 markup per transaction for the convenience of optimization.
- **Wakalah (Agent):** Collects ~1% commission from Zakat bodies for facilitating the collection.
- **Outcome:** Government receives verified Zakat/Donation; User hits Zero-Tax; CukaiGate scales.

---

## 🚀 4. Phase-by-Phase Vibe Coding Instructions

### Phase 1: The "Live Meter" Foundation

- Initialize Next.js 15, Prisma, and Zustand.
- _AI Prompt:_ "Build the CukaiGate dashboard with a circular progress bar (Tax Meter) that updates in real-time as users enter income and reliefs. Use Zustand for state and shadcn for the UI."

### Phase 2: AI Receipt Audit

- Build the Python FastAPI service for OCR.
- _AI Prompt:_ "Create a FastAPI endpoint that takes a receipt image, uses Gemini Vision to extract the total amount and LHDN relief category, and returns JSON. Connect this to the Next.js upload button."

### Phase 3: FPX & Production MySQL

- Switch database to MySQL. Setup Billplz FPX webhooks.
- _AI Prompt:_ "Configure a split-payment logic where RM1.50 is sent to our account and the rest to the Zakat body. Update the transaction status based on the FPX success webhook."
