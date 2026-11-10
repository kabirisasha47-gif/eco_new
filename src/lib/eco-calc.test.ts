import { describe, expect, it } from "vitest";

import {
  ANNUAL_PRODUCTION_KWH,
  canLockEnergy,
  CHANNELS,
  channelsConflict,
  coverageByYear,
  coverageRatio,
  DEFAULT_LOAN,
  invoiceGross,
  meterDiscrepancyPct,
  MONTHLY_FIT_INCOME,
  monthlyInstallment,
} from "./eco-calc";
import { fa } from "./fa";

describe("EcoSolar rules", () => {
  it("annual production of the 5 kWp design is 7,884 kWh", () => {
    expect(ANNUAL_PRODUCTION_KWH).toBe(7884);
  });

  it("battery FIT channel earns about 718.8 million rial per year", () => {
    const battery = CHANNELS.find((c) => c.id === "fit-battery")!;
    expect(battery.annualMillion.toFixed(1)).toBe("718.8");
  });

  it("feed-in tariff and self-supply cannot share one connection", () => {
    expect(channelsConflict("fit-battery", "self")).toBe(true);
    expect(channelsConflict("fit-base", "fit-battery")).toBe(false);
  });

  it("default loan leaves first-year coverage at 41%", () => {
    const inst = monthlyInstallment(DEFAULT_LOAN.amount, DEFAULT_LOAN.rate, DEFAULT_LOAN.months);
    expect(Math.round(coverageRatio(MONTHLY_FIT_INCOME, inst) * 100)).toBe(41);
  });

  it("multi-year coverage grows 50% per year: 41% -> 62% -> 92%", () => {
    expect(coverageByYear(0.41).map((r) => Math.round(r * 100))).toEqual([41, 62, 92]);
  });

  it("Mehr inverter 657 vs meter 641 is a 2.4% difference and energy locks", () => {
    expect(meterDiscrepancyPct(657, 641).toFixed(1)).toBe("2.4");
    expect(canLockEnergy(657, 641)).toBe(true);
    expect(canLockEnergy(815, 768)).toBe(false);
  });

  it("invoice uses meter kWh × locked rate: 641 × 58,540 = 37,524,140 rial", () => {
    expect(invoiceGross(641, 58540)).toBe(37_524_140);
  });

  it("formats numbers with Persian digits and separators", () => {
    expect(fa(3032000000)).toBe("۳٬۰۳۲٬۰۰۰٬۰۰۰");
    expect(fa(718.776, 1)).toBe("۷۱۸,۸");
  });
});
