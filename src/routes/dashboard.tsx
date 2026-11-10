import { createFileRoute } from "@tanstack/react-router";
import { ChevronDown, ChevronUp, Eye, EyeOff, ReceiptText } from "lucide-react";
import { useState } from "react";

import { BottomNav } from "@/components/eco/BottomNav";
import { BarChart, ProductionChart } from "@/components/eco/charts";
import {
  ActionCard,
  DropdownPill,
  HeroStat,
  InfoRow,
  PanelTitle,
  Pill,
  Screen,
  ScreenHeader,
  SunPanel,
  TopArea,
} from "@/components/eco/ui";
import { BATTERY_FIT_RATE } from "@/lib/eco-calc";
import { fa, faDigits } from "@/lib/fa";

export const Route = createFileRoute("/dashboard")({
  head: () => ({
    meta: [
      { title: "نیروگاه من | داشبورد اکوسولار" },
      { name: "description", content: "تولید امروز، جریان انرژی و درآمد برآوردی نیروگاه خورشیدی ۵ کیلوواتی." },
      { property: "og:title", content: "نیروگاه من | اکوسولار" },
      { property: "og:description", content: "تولید امروز، جریان انرژی و درآمد برآوردی نیروگاه خورشیدی." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: DashboardScreen,
});

type Range = "day" | "week" | "month";

const WEEK = [
  { label: "ش", value: 19.4 },
  { label: "ی", value: 20.8 },
  { label: "د", value: 18.2 },
  { label: "س", value: 21.3 },
  { label: "چ", value: 20.5 },
  { label: "پ", value: 21.0 },
  { label: "ج", value: 20.1 },
];
const MONTH = Array.from({ length: 10 }, (_, i) => ({
  label: faDigits(i * 3 + 1),
  value: [58, 61, 63, 55, 60, 62, 64, 59, 57, 61][i] ?? 60,
}));

const RANGE_DATA: Record<Range, { label: string; value: number }> = {
  day: { label: "تولید امروز", value: 20.1 },
  week: { label: "تولید این هفته", value: WEEK.reduce((a, b) => a + b.value, 0) },
  month: { label: "تولید این ماه", value: MONTH.reduce((a, b) => a + b.value, 0) },
};

function DashboardScreen() {
  const [range, setRange] = useState<Range>("day");
  const [hideMoney, setHideMoney] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const [sel, setSel] = useState<number | undefined>(undefined);

  const produced = RANGE_DATA[range].value;
  const income = Math.round(produced * BATTERY_FIT_RATE * 0.55);

  return (
    <Screen>
      <TopArea>
        <ScreenHeader title="نیروگاه من" subtitle="۵ کیلووات | نجف‌آباد" start="user" />

        <HeroStat
          label={RANGE_DATA[range].label}
          value={fa(produced, 1)}
          unit="kWh"
          aside={
            <DropdownPill<Range>
              label="بازه زمانی"
              value={range}
              onChange={(v) => {
                setRange(v);
                setSel(undefined);
              }}
              options={[
                { value: "day", label: "روز" },
                { value: "week", label: "هفته" },
                { value: "month", label: "ماه" },
              ]}
            />
          }
        />

        <div className="mt-3">
          <Pill tone="white" className="shadow-soft">
            <span className="size-2 rounded-full bg-success animate-live" />
            زنده | ۲ دقیقه پیش | اینورتر
          </Pill>
        </div>

        {range === "day" ? (
          <ProductionChart />
        ) : (
          <BarChart
            data={range === "week" ? WEEK : MONTH}
            max={range === "week" ? 25 : 70}
            ticks={range === "week" ? [0, 12, 25] : [0, 35, 70]}
            selected={sel}
            onSelect={setSel}
            tooltip={(d) => `${fa(d.value, 1)} kWh`}
            height={170}
          />
        )}
      </TopArea>

      <SunPanel>
        <PanelTitle
          aside={
            <div className="flex h-11 items-center gap-1 rounded-full bg-card px-1.5">
              <button
                type="button"
                aria-label={collapsed ? "باز کردن" : "جمع کردن"}
                onClick={() => setCollapsed((c) => !c)}
                className="grid size-9 place-items-center rounded-full"
              >
                {collapsed ? <ChevronDown className="size-4" /> : <ChevronUp className="size-4" strokeWidth={3} />}
              </button>
              <button
                type="button"
                aria-label={hideMoney ? "نمایش مبالغ" : "پنهان کردن مبالغ"}
                onClick={() => setHideMoney((h) => !h)}
                className="grid size-9 place-items-center rounded-full"
              >
                {hideMoney ? <EyeOff className="size-5" /> : <Eye className="size-5" />}
              </button>
            </div>
          }
        >
          جریان انرژی امروز
        </PanelTitle>
        <p className="mt-1 text-xs text-foreground/75">داده اینورتر برای پایش است؛ مبنای صورتحساب کنتور رسمی توزیع است</p>

        {!collapsed ? (
          <div className="mt-2">
            <InfoRow label="تولید اینورتر" value={`${fa(produced, 1)} kWh`} />
            <InfoRow
              label="درآمد برآوردی امروز"
              value={
                <span className="flex items-center gap-2">
                  <Pill tone="white" size="sm">برآورد</Pill>
                  {hideMoney ? "••••••" : `${fa(income, 0, false)} ریال`}
                </span>
              }
            />
            <InfoRow label="بازده عملکرد PR" value="۸۲٪" last />
          </div>
        ) : null}

        <ActionCard
          to="/income"
          icon={<ReceiptText className="size-5" />}
          title="قرائت کنتور مهر رسید"
          subtitle="تطبیق سه‌طرفه و صورتحساب را ببینید"
        />

        <div className="flex-1" />
        <BottomNav active="/dashboard" />
      </SunPanel>
    </Screen>
  );
}
