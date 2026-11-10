import { describe, expect, it } from "vitest";

import { checkBillConsistency, mergeIssues, overallConfidence, type ExtractedBill } from "./bill-checks";

const base: ExtractedBill = {
  isElectricityBill: true,
  billId: "7810332190365",
  period: "مرداد تا مهر ۱۴۰۵",
  periodDays: 62,
  peakKwh: 312,
  midKwh: 638,
  lowKwh: 297,
  totalKwh: 1247,
  amountRial: 18_035_000,
  confidence: {
    billId: "high",
    period: "high",
    peakKwh: "high",
    midKwh: "high",
    lowKwh: "low",
    totalKwh: "high",
    amountRial: "high",
  },
  issues: [],
};

describe("bill consistency rules", () => {
  it("a consistent bill has no rule issues", () => {
    expect(checkBillConsistency(base)).toEqual([]);
  });

  it("flags tiers that do not add up to the printed total (more than 2% gap)", () => {
    const issues = checkBillConsistency({ ...base, totalKwh: 1300 });
    expect(issues.map((i) => i.field)).toContain("totalKwh");
  });

  it("accepts a tier/total gap within 2%", () => {
    expect(checkBillConsistency({ ...base, totalKwh: 1260 })).toEqual([]);
  });

  it("flags a bill id that is not 13 digits", () => {
    expect(checkBillConsistency({ ...base, billId: "78103321" }).map((i) => i.field)).toEqual(["billId"]);
  });

  it("flags unreadable required fields", () => {
    expect(checkBillConsistency({ ...base, lowKwh: null }).map((i) => i.field)).toContain("lowKwh");
  });

  it("flags an implausible amount per kWh", () => {
    expect(checkBillConsistency({ ...base, amountRial: 100 }).map((i) => i.field)).toContain("amountRial");
  });

  it("flags billing periods outside 25–70 days", () => {
    expect(checkBillConsistency({ ...base, periodDays: 120 }).map((i) => i.field)).toContain("period");
  });

  it("stops at a single issue when the photo is not an electricity bill", () => {
    const issues = checkBillConsistency({ ...base, isElectricityBill: false });
    expect(issues).toHaveLength(1);
    expect(issues[0]?.field).toBe("general");
  });

  it("drops model issues duplicated by a rule on the same field", () => {
    const merged = mergeIssues({
      ...base,
      totalKwh: 1300,
      issues: [
        { field: "totalKwh", message: "جمع مصرف درست نیست" },
        { field: "general", message: "گوشه قبض تار است" },
      ],
    });
    expect(merged.filter((i) => i.field === "totalKwh")).toHaveLength(1);
    expect(merged.some((i) => i.source === "ai" && i.field === "general")).toBe(true);
  });

  it("overall confidence: six high + one low = 91%", () => {
    expect(overallConfidence(base.confidence)).toBe(91);
  });
});
