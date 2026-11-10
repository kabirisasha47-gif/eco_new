/**
 * EcoSolar calculation rules. All rates are reference sample values (Aban 1405 rate table v3)
 * and live here in one place so screens never hard-code them.
 */

export const RATE_TABLE_VERSION = "آبان ۱۴۰۵، نسخه ۳";

/** Monthly production of the proposed 5 kWp plant, Shamsi months 1..12 (kWh). */
export const MONTHLY_PRODUCTION_KWH = [700, 760, 800, 820, 840, 790, 730, 650, 560, 480, 410, 344];

export const ANNUAL_PRODUCTION_KWH = MONTHLY_PRODUCTION_KWH.reduce((a, b) => a + b, 0);

export type ChannelId = "fit-battery" | "fit-base" | "self";

export interface Channel {
  id: ChannelId;
  name: string;
  /** Rial per kWh */
  rate: number;
  /** Annual revenue in million rial */
  annualMillion: number;
  contractYears: number;
  paymentDelay: string | null;
  activation: string;
  requiresBattery: boolean;
  isFeedInTariff: boolean;
}

export const BATTERY_FIT_RATE = 91169;
export const BASE_FIT_RATE = 45853;
export const SELF_SUPPLY_RATE = 49873;
export const MIN_BATTERY_KWH = 7.5;

export const CHANNELS: Channel[] = [
  {
    id: "fit-battery",
    name: "خرید تضمینی باتری‌دار",
    rate: BATTERY_FIT_RATE,
    annualMillion: (ANNUAL_PRODUCTION_KWH * BATTERY_FIT_RATE) / 1e6,
    contractYears: 20,
    paymentDelay: "۲ تا ۳ ماه",
    activation: `باتری حداقل ۷,۵ kWh`,
    requiresBattery: true,
    isFeedInTariff: true,
  },
  {
    id: "fit-base",
    name: "خرید تضمینی پایه",
    rate: BASE_FIT_RATE,
    annualMillion: (ANNUAL_PRODUCTION_KWH * BASE_FIT_RATE) / 1e6,
    contractYears: 20,
    paymentDelay: "۲ تا ۳ ماه",
    activation: "کنتور دوطرفه",
    requiresBattery: false,
    isFeedInTariff: true,
  },
  {
    id: "self",
    name: "خودتأمین",
    rate: SELF_SUPPLY_RATE,
    annualMillion: (ANNUAL_PRODUCTION_KWH * SELF_SUPPLY_RATE) / 1e6,
    contractYears: 1,
    paymentDelay: null,
    activation: "مصرف هم‌زمان در محل",
    requiresBattery: false,
    isFeedInTariff: false,
  },
];

/**
 * Feed-in tariff and self-supply can never run on the same grid connection.
 */
export function channelsConflict(a: ChannelId, b: ChannelId): boolean {
  const ca = CHANNELS.find((c) => c.id === a)!;
  const cb = CHANNELS.find((c) => c.id === b)!;
  return ca.isFeedInTariff !== cb.isFeedInTariff;
}

/** Standard annuity monthly installment. */
export function monthlyInstallment(principal: number, annualRatePct: number, months: number): number {
  if (months <= 0) return 0;
  const r = annualRatePct / 1200;
  if (r === 0) return principal / months;
  return (principal * r) / (1 - Math.pow(1 + r, -months));
}

/** Largest loan whose installment the given monthly income fully covers. */
export function maxCoverableLoan(monthlyIncome: number, annualRatePct: number, months: number): number {
  const r = annualRatePct / 1200;
  if (r === 0) return monthlyIncome * months;
  return (monthlyIncome * (1 - Math.pow(1 + r, -months))) / r;
}

/** Share of the installment covered by income, 0..1 (capped). */
export function coverageRatio(monthlyIncome: number, installment: number): number {
  if (installment <= 0) return 1;
  return Math.min(1, monthlyIncome / installment);
}

/** Annual rate adjustment assumed by the multi-year scenario. */
export const ANNUAL_RATE_ADJUSTMENT = 0.5;

/** Coverage per year assuming income grows by the annual rate adjustment. */
export function coverageByYear(firstYear: number, years = 3, growth = ANNUAL_RATE_ADJUSTMENT): number[] {
  return Array.from({ length: years }, (_, i) => Math.min(1, firstYear * Math.pow(1 + growth, i)));
}

/** Sample monthly FIT income used by the installment simulator (rial). */
export const MONTHLY_FIT_INCOME = 38_460_000;

export const DEFAULT_LOAN = { amount: 3_000_000_000, rate: 13, months: 40 };

/** Inverter vs. official distribution meter difference, as % of inverter reading. */
export function meterDiscrepancyPct(inverterKwh: number, meterKwh: number): number {
  if (inverterKwh <= 0) return 0;
  return ((inverterKwh - meterKwh) / inverterKwh) * 100;
}

/** Allowed inverter/meter difference before energy can be locked for billing. */
export const METER_TOLERANCE_PCT = 3;

export function canLockEnergy(inverterKwh: number, meterKwh: number): boolean {
  return Math.abs(meterDiscrepancyPct(inverterKwh, meterKwh)) <= METER_TOLERANCE_PCT;
}

/** Billing always uses the official distribution meter, never the inverter. */
export function invoiceGross(meterKwh: number, lockedRate: number): number {
  return Math.round(meterKwh * lockedRate);
}
