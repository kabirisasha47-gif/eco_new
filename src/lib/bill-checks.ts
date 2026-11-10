/**
 * Shared (client + server safe) shape of an AI-extracted electricity bill and the
 * deterministic consistency rules applied on top of the model's own findings.
 */

export type Confidence = "high" | "medium" | "low";

export type BillField = "billId" | "period" | "peakKwh" | "midKwh" | "lowKwh" | "totalKwh" | "amountRial";

export interface ExtractedBill {
  isElectricityBill: boolean;
  billId: string | null;
  period: string | null;
  periodDays: number | null;
  peakKwh: number | null;
  midKwh: number | null;
  lowKwh: number | null;
  totalKwh: number | null;
  amountRial: number | null;
  confidence: Record<BillField, Confidence>;
  issues: { field: BillField | "general"; message: string }[];
}

export interface BillIssue {
  field: BillField | "general";
  message: string;
  source: "rule" | "ai";
}

/** Allowed gap between the sum of tariff tiers and the printed total consumption. */
export const TIER_SUM_TOLERANCE_PCT = 2;
/** Plausible average residential price range (rial per kWh) for the pilot region. */
export const PRICE_PER_KWH_RANGE = { min: 300, max: 2_500_000 };
/** Typical billing period length in days. */
export const PERIOD_DAYS_RANGE = { min: 25, max: 70 };
/** Iranian electricity bill IDs (شناسه قبض) are 13 digits. */
export const BILL_ID_LENGTH = 13;

const FIELD_LABEL: Record<BillField, string> = {
  billId: "شناسه قبض",
  period: "دوره صورتحساب",
  peakKwh: "مصرف اوج",
  midKwh: "مصرف میان‌باری",
  lowKwh: "مصرف کم‌باری",
  totalKwh: "مصرف کل",
  amountRial: "مبلغ کل قبض",
};

export function fieldLabel(f: BillField | "general") {
  return f === "general" ? "کلی" : FIELD_LABEL[f];
}

/** Deterministic checks; never depends on the model's judgement. */
export function checkBillConsistency(b: ExtractedBill): BillIssue[] {
  const issues: BillIssue[] = [];
  const add = (field: BillIssue["field"], message: string) => issues.push({ field, message, source: "rule" });

  if (!b.isElectricityBill) {
    add("general", "تصویر شبیه قبض برق نیست؛ لطفاً عکس واضح قبض برق را بارگذاری کنید.");
    return issues;
  }

  const required: BillField[] = ["billId", "period", "peakKwh", "midKwh", "lowKwh", "amountRial"];
  for (const f of required) {
    if (b[f] === null || b[f] === "") add(f, `${FIELD_LABEL[f]} در تصویر خوانده نشد.`);
  }

  if (b.billId !== null && b.billId.replace(/\D/g, "").length !== BILL_ID_LENGTH) {
    add("billId", `شناسه قبض باید ${BILL_ID_LENGTH} رقم باشد.`);
  }

  for (const f of ["peakKwh", "midKwh", "lowKwh", "totalKwh", "amountRial"] as const) {
    const v = b[f];
    if (v !== null && v < 0) add(f, `${FIELD_LABEL[f]} نمی‌تواند منفی باشد.`);
  }

  const tiers = [b.peakKwh, b.midKwh, b.lowKwh];
  const tierSum = tiers.every((t) => t !== null) ? (tiers as number[]).reduce((a, c) => a + c, 0) : null;

  if (tierSum !== null && b.totalKwh !== null && b.totalKwh > 0) {
    const gapPct = (Math.abs(tierSum - b.totalKwh) / b.totalKwh) * 100;
    if (gapPct > TIER_SUM_TOLERANCE_PCT) {
      add("totalKwh", `جمع مصرف اوج، میان‌باری و کم‌باری (${tierSum}) با مصرف کل (${b.totalKwh}) همخوانی ندارد.`);
    }
  }

  if (b.peakKwh !== null && tierSum !== null && tierSum > 0 && b.peakKwh > tierSum * 0.6) {
    add("peakKwh", "سهم مصرف اوج بیش از ۶۰٪ کل مصرف است؛ مقدار را بررسی کنید.");
  }

  const energy = b.totalKwh ?? tierSum;
  if (energy !== null && energy > 0 && b.amountRial !== null && b.amountRial > 0) {
    const perKwh = b.amountRial / energy;
    if (perKwh < PRICE_PER_KWH_RANGE.min || perKwh > PRICE_PER_KWH_RANGE.max) {
      add("amountRial", "نسبت مبلغ قبض به مصرف غیرعادی است؛ مبلغ یا مصرف را بررسی کنید.");
    }
  }

  if (b.periodDays !== null && (b.periodDays < PERIOD_DAYS_RANGE.min || b.periodDays > PERIOD_DAYS_RANGE.max)) {
    add("period", `طول دوره صورتحساب (${b.periodDays} روز) غیرمعمول است.`);
  }

  return issues;
}

/** Merge rule findings with the model's issues, dropping duplicates on the same field. */
export function mergeIssues(b: ExtractedBill): BillIssue[] {
  const rules = checkBillConsistency(b);
  const ruleFields = new Set(rules.map((r) => r.field));
  const ai = b.issues
    .filter((i) => i.message.trim().length > 0 && !ruleFields.has(i.field))
    .map((i) => ({ ...i, source: "ai" as const }));
  return [...rules, ...ai];
}

/** 0..100 overall extraction confidence. */
export function overallConfidence(conf: Record<BillField, Confidence>): number {
  const score: Record<Confidence, number> = { high: 1, medium: 0.75, low: 0.4 };
  const vals = Object.values(conf);
  if (vals.length === 0) return 0;
  return Math.round((vals.reduce((a, c) => a + score[c], 0) / vals.length) * 100);
}
