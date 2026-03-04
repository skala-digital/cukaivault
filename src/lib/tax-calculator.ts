/**
 * CukaiVault — Malaysian Income Tax Calculator (YA 2025 / LHDN 2026 Filing)
 *
 * ESTIMATION TOOL ONLY — Not certified tax advice.
 *
 * Muslim Track  : Zakat offsets tax payable 1:1 (up to 100%)
 * Non-Muslim Track: Suggest donation to drop into a lower tax bracket
 */

/** YA 2025 progressive tax brackets (chargeable income in RM) */
const TAX_BRACKETS = [
  { min: 0,         max: 5_000,     rate: 0     },
  { min: 5_001,     max: 20_000,    rate: 0.01  },
  { min: 20_001,    max: 35_000,    rate: 0.03  },
  { min: 35_001,    max: 50_000,    rate: 0.08  },
  { min: 50_001,    max: 70_000,    rate: 0.13  },
  { min: 70_001,    max: 100_000,   rate: 0.21  },
  { min: 100_001,   max: 250_000,   rate: 0.24  },
  { min: 250_001,   max: 400_000,   rate: 0.245 },
  { min: 400_001,   max: 600_000,   rate: 0.25  },
  { min: 600_001,   max: 1_000_000, rate: 0.26  },
  { min: 1_000_001, max: Infinity,  rate: 0.28  },
];

/** Receipt-based relief category caps (RM) */
export const RELIEF_CAPS: Record<string, number> = {
  LIFESTYLE: 2_500,
  MEDICAL:  10_000,
  EDUCATION: 7_000,
  SSPN:      8_000,
  CHILDCARE: 3_000,
  OTHER:         0,
};

/** Profile-based relief caps (RM) */
export const PROFILE_RELIEF_CAPS: Record<string, number> = {
  EPF:            4_000,
  LIFE:           3_000,
  MEDICAL_INS:    3_000,
  SPOUSE:         4_000,
  CHILD_UNDER_18: 2_000,
  CHILD_TERTIARY: 8_000,
};

/** Self & personal relief always applied */
export const DEFAULT_SELF_RELIEF = 9_000;

/** User profile for profile-based reliefs */
export interface TaxProfile {
  epfContribution:  number;
  lifeInsurance:    number;
  medicalInsurance: number;
  hasSpouseRelief:  boolean;
  childrenUnder18:  number;
  childrenTertiary: number;
}

export interface ReliefLineItem {
  label:     string;
  used:      number;
  cap:       number;
  remaining: number;
}

export interface ReliefSuggestion {
  label:           string;
  tip:             string;
  remaining:       number;
  potentialSaving: number;
}

export interface TaxSummary {
  grossIncome:               number;
  totalReliefs:              number;
  profileRelief:             number;
  chargeableIncome:          number;
  taxPayable:                number;
  taxBeforeReceipts:         number;
  effectiveRate:             number;
  marginalRate:              number;
  zakatNeeded:               number;
  donationNeededForTierDrop: number;
  targetBracketRate:         number | null;
  reliefBreakdown:           Record<string, ReliefLineItem>;
  reliefSuggestions:         ReliefSuggestion[];
}

export function computeTax(chargeableIncome: number): number {
  if (chargeableIncome <= 0) return 0;
  let tax = 0;
  for (const { min, max, rate } of TAX_BRACKETS) {
    if (chargeableIncome <= min - 1) break;
    const taxable = Math.min(chargeableIncome, max) - (min - 1);
    tax += taxable * rate;
  }
  return Math.max(0, tax);
}

function getMarginalRate(chargeableIncome: number): number {
  for (let i = TAX_BRACKETS.length - 1; i >= 0; i--) {
    if (chargeableIncome >= TAX_BRACKETS[i].min) return TAX_BRACKETS[i].rate;
  }
  return 0;
}

/** Aggregate receipt amounts per category, capped at RELIEF_CAPS */
export function buildReceiptReliefsMap(
  receipts: { category: string; amount: number }[]
): Record<string, number> {
  const raw: Record<string, number> = {};
  for (const r of receipts) {
    const cat = r.category?.toUpperCase() ?? "OTHER";
    raw[cat] = (raw[cat] ?? 0) + r.amount;
  }
  const capped: Record<string, number> = {};
  for (const [cat, total] of Object.entries(raw)) {
    const cap = RELIEF_CAPS[cat];
    if (cap === undefined) {
      capped["OTHER"] = (capped["OTHER"] ?? 0) + total;
    } else if (cap === 0) {
      capped[cat] = total;
    } else {
      capped[cat] = Math.min(total, cap);
    }
  }
  return capped;
}

const RECEIPT_CAT_LABELS: Record<string, string> = {
  LIFESTYLE: "Lifestyle",
  MEDICAL:   "Medical & Health",
  EDUCATION: "Education Fees",
  SSPN:      "SSPN Savings",
  CHILDCARE: "Childcare",
  OTHER:     "Other",
};

const RECEIPT_CAT_TIPS: Record<string, string> = {
  LIFESTYLE: "Books, internet, computers, sports equipment (max RM 2,500)",
  MEDICAL:   "Medical check-up, dental, vaccination, special needs aids (max RM 10,000)",
  EDUCATION: "Fees at approved institutions for self (max RM 7,000)",
  SSPN:      "Skim Simpanan Pendidikan Nasional deposits (max RM 8,000)",
  CHILDCARE: "Government- or MFCS-registered childcare fees (max RM 3,000)",
};

export function computeTaxSummary(
  grossIncome: number,
  receiptReliefsMap: Record<string, number>,
  isMuslim: boolean,
  profile: TaxProfile
): TaxSummary {
  const receiptTotalRelief = Object.values(receiptReliefsMap).reduce((s, v) => s + v, 0);

  const epfCapped  = Math.min(profile.epfContribution,  PROFILE_RELIEF_CAPS.EPF);
  const lifeCapped = Math.min(profile.lifeInsurance,     PROFILE_RELIEF_CAPS.LIFE);
  const medCapped  = Math.min(profile.medicalInsurance,  PROFILE_RELIEF_CAPS.MEDICAL_INS);
  const spouseR    = profile.hasSpouseRelief ? PROFILE_RELIEF_CAPS.SPOUSE : 0;
  const childR     = profile.childrenUnder18  * PROFILE_RELIEF_CAPS.CHILD_UNDER_18;
  const childTerR  = profile.childrenTertiary * PROFILE_RELIEF_CAPS.CHILD_TERTIARY;
  const profileRelief = epfCapped + lifeCapped + medCapped + spouseR + childR + childTerR;

  const totalReliefs     = DEFAULT_SELF_RELIEF + profileRelief + receiptTotalRelief;
  const chargeableIncome = Math.max(0, grossIncome - totalReliefs);
  const taxPayable       = computeTax(chargeableIncome);
  
  // Calculate tax before receipt-based reliefs (for meter progress)
  const chargeableBeforeReceipts = Math.max(0, grossIncome - DEFAULT_SELF_RELIEF - profileRelief);
  const taxBeforeReceipts = computeTax(chargeableBeforeReceipts);
  
  const effectiveRate    = grossIncome > 0 ? taxPayable / grossIncome : 0;
  const marginalRate     = getMarginalRate(chargeableIncome);
  const zakatNeeded      = isMuslim ? taxPayable : 0;

  let donationNeededForTierDrop = 0;
  let targetBracketRate: number | null = null;
  if (!isMuslim && taxPayable > 0) {
    const idx = TAX_BRACKETS.findIndex(
      ({ min, max }) => chargeableIncome >= min && chargeableIncome <= max
    );
    if (idx > 1) {
      const prev = TAX_BRACKETS[idx - 1];
      donationNeededForTierDrop = chargeableIncome - prev.max;
      targetBracketRate = prev.rate;
    }
  }

  // Relief breakdown for progress bars
  const reliefBreakdown: Record<string, ReliefLineItem> = {};
  for (const [cat, cap] of Object.entries(RELIEF_CAPS)) {
    if (cap === 0) continue;
    const used = receiptReliefsMap[cat] ?? 0;
    reliefBreakdown[cat] = {
      label:     RECEIPT_CAT_LABELS[cat] ?? cat,
      used,
      cap,
      remaining: Math.max(0, cap - used),
    };
  }
  reliefBreakdown["EPF"] = {
    label: "EPF Contribution",
    used: epfCapped,
    cap: PROFILE_RELIEF_CAPS.EPF,
    remaining: Math.max(0, PROFILE_RELIEF_CAPS.EPF - epfCapped),
  };
  reliefBreakdown["LIFE"] = {
    label: "Life Insurance",
    used: lifeCapped,
    cap: PROFILE_RELIEF_CAPS.LIFE,
    remaining: Math.max(0, PROFILE_RELIEF_CAPS.LIFE - lifeCapped),
  };
  reliefBreakdown["MEDICAL_INS"] = {
    label: "Medical Insurance",
    used: medCapped,
    cap: PROFILE_RELIEF_CAPS.MEDICAL_INS,
    remaining: Math.max(0, PROFILE_RELIEF_CAPS.MEDICAL_INS - medCapped),
  };

  // Ranked suggestions by potential tax saving
  const suggestions: ReliefSuggestion[] = [];
  for (const [cat, item] of Object.entries(reliefBreakdown)) {
    if (item.remaining <= 0) continue;
    const tip = RECEIPT_CAT_TIPS[cat];
    if (!tip) continue;
    suggestions.push({
      label:           item.label,
      tip,
      remaining:       item.remaining,
      potentialSaving: item.remaining * marginalRate,
    });
  }
  suggestions.sort((a, b) => b.potentialSaving - a.potentialSaving);
  const reliefSuggestions = suggestions.slice(0, 5);

  return {
    grossIncome,
    totalReliefs,
    profileRelief,
    chargeableIncome,
    taxPayable,
    taxBeforeReceipts,
    effectiveRate,
    marginalRate,
    zakatNeeded,
    donationNeededForTierDrop,
    targetBracketRate,
    reliefBreakdown,
    reliefSuggestions,
  };
}

/** Relief category display names */
export const RELIEF_LABELS: Record<string, string> = { ...RECEIPT_CAT_LABELS };
