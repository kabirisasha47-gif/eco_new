import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";

import { DEFAULT_LOAN, type ChannelId } from "./eco-calc";

export interface BillData {
  id: string;
  period: string;
  peak: number;
  mid: number;
  low: number;
  total: number;
}

export type PlanId = "economy" | "balanced" | "comfort";

export interface EcoState {
  phone: string;
  loggedIn: boolean;
  bill: BillData;
  billRevision: number;
  lowConfidenceReviewed: boolean;
  plan: PlanId;
  planAccepted: boolean;
  battery: boolean;
  channel: ChannelId;
  channelConfirmed: boolean;
  loan: { amount: number; rate: number; months: number };
  strategy: 1 | 2 | 3 | null;
  quoteId: string | null;
  orderPlaced: boolean;
  visitConfirmed: boolean;
  paidMonths: string[];
  reports: { id: string; month: string; text: string }[];
}

export const DEFAULT_STATE: EcoState = {
  phone: "09133457781",
  loggedIn: false,
  bill: {
    id: "7810332190365",
    period: "مرداد تا مهر ۱۴۰۵",
    peak: 312,
    mid: 638,
    low: 297,
    total: 1_803_500_000,
  },
  billRevision: 1,
  lowConfidenceReviewed: false,
  plan: "balanced",
  planAccepted: false,
  battery: false,
  channel: "fit-battery",
  channelConfirmed: false,
  loan: DEFAULT_LOAN,
  strategy: null,
  quoteId: "a",
  orderPlaced: false,
  visitConfirmed: false,
  paidMonths: [],
  reports: [],
};

const STORAGE_KEY = "ecosolar-state-v1";

interface EcoContextValue {
  state: EcoState;
  update: (patch: Partial<EcoState> | ((s: EcoState) => Partial<EcoState>)) => void;
  reset: () => void;
}

const EcoContext = createContext<EcoContextValue | null>(null);

export function EcoProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<EcoState>(DEFAULT_STATE);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (raw) setState({ ...DEFAULT_STATE, ...(JSON.parse(raw) as Partial<EcoState>) });
    } catch {
      /* ignore corrupt storage */
    }
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {
      /* storage full or unavailable */
    }
  }, [state, hydrated]);

  const update = useCallback<EcoContextValue["update"]>((patch) => {
    setState((s) => ({ ...s, ...(typeof patch === "function" ? patch(s) : patch) }));
  }, []);

  const reset = useCallback(() => setState(DEFAULT_STATE), []);

  const value = useMemo(() => ({ state, update, reset }), [state, update, reset]);
  return <EcoContext.Provider value={value}>{children}</EcoContext.Provider>;
}

export function useEco() {
  const ctx = useContext(EcoContext);
  if (!ctx) throw new Error("useEco must be used inside EcoProvider");
  return ctx;
}
