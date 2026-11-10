import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Check } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { Sheet } from "@/components/eco/Sheet";
import { TempPlanChart, type SetpointStep } from "@/components/eco/charts";
import {
  DropdownPill,
  HeroStat,
  InfoCircleButton,
  InfoRow,
  InkButton,
  PanelTitle,
  Pill,
  Screen,
  ScreenHeader,
  SunPanel,
  TopArea,
  WhiteButton,
} from "@/components/eco/ui";
import { RATE_TABLE_VERSION } from "@/lib/eco-calc";
import { useEco, type PlanId } from "@/lib/eco-store";
import { fa } from "@/lib/fa";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/optimize")({
  head: () => ({
    meta: [
      { title: "بهینه‌سازی مصرف | اکوسولار" },
      { name: "description", content: "برنامه دمایی هوشمند بر پایه پیش‌بینی هوا و تعرفه برای کاهش مصرف برق." },
      { property: "og:title", content: "بهینه‌سازی مصرف | اکوسولار" },
      { property: "og:description", content: "برنامه دمایی هوشمند برای کاهش مصرف برق." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: OptimizeScreen,
});

const PLANS: Record<PlanId, { name: string; desc: string; saving: number; kwh: number; preCool: number; peakTemp: number }> = {
  economy: { name: "اقتصادی", desc: "بیشترین صرفه‌جویی، دمای اوج ۲۸ درجه", saving: 34, kwh: 228, preCool: 23, peakTemp: 28 },
  balanced: { name: "متعادل", desc: "پیشنهاد هوش مصنوعی برای خانه شما", saving: 28, kwh: 188, preCool: 24, peakTemp: 27 },
  comfort: { name: "راحتی", desc: "تغییر دمای کمتر، صرفه‌جویی کمتر", saving: 17, kwh: 114, preCool: 24, peakTemp: 26 },
};

function stepsFor(plan: PlanId): SetpointStep[] {
  const p = PLANS[plan];
  return [
    { from: 0, to: 10, temp: 26 },
    { from: 10, to: 16.5, temp: 25 },
    { from: 16.5, to: 19, temp: p.preCool },
    { from: 19, to: 23, temp: p.peakTemp },
    { from: 23, to: 24, temp: 26 },
  ];
}

function OptimizeScreen() {
  const { state, update } = useEco();
  const navigate = useNavigate();
  const [day, setDay] = useState<"today" | "tomorrow">("today");
  const [plan, setPlan] = useState<PlanId>(state.plan);
  const [optionsOpen, setOptionsOpen] = useState(false);
  const [infoOpen, setInfoOpen] = useState(false);

  const p = PLANS[plan];
  const shift = day === "tomorrow" ? 1.5 : 0;
  const saving = day === "tomorrow" ? p.saving + 2 : p.saving;

  return (
    <Screen>
      <TopArea>
        <ScreenHeader title="بهینه‌سازی مصرف" subtitle="سرویس ۱ هوش مصنوعی" backTo="/bill" />
        <HeroStat
          label="صرفه‌جویی برآوردی ماهانه"
          value={`${fa(saving)}٪`}
          unit={<span dir="rtl">حدود {fa(p.kwh)} kWh در ماه</span>}
          aside={
            <DropdownPill
              label="روز"
              value={day}
              onChange={setDay}
              options={[
                { value: "today", label: "امروز" },
                { value: "tomorrow", label: "فردا" },
              ]}
            />
          }
        />
        <div className="mt-3">
          <Pill tone="sun">سناریو، مبتنی بر پیش‌بینی دمای {day === "today" ? "فردا" : "پس‌فردا"}</Pill>
        </div>
        <TempPlanChart steps={stepsFor(plan)} shift={shift} preCool={p.preCool} />
      </TopArea>

      <SunPanel>
        <PanelTitle aside={<InfoCircleButton onClick={() => setInfoOpen(true)} />}>چرا این پیشنهاد؟</PanelTitle>
        <div className="mt-2">
          <InfoRow label="ضریب حساسیت دمایی" value="۰,۰۷ بر هر درجه" />
          <InfoRow label="منبع دما" value="پیش‌بینی هواشناسی نجف‌آباد" />
          <InfoRow label="تجهیز اصلی" value="کولر گازی ۲,۲ کیلووات" />
          <InfoRow label="نسخه جدول نرخ" value={RATE_TABLE_VERSION} last />
        </div>
        <div className="mt-3 rounded-full bg-card px-4 py-3 text-center text-xs font-bold" dir="ltr">
          E = P × t × (1 + α·|T_amb − T_set|)
        </div>
        <div className="mt-5 flex gap-3">
          <InkButton
            onClick={() => {
              update({ plan, planAccepted: true });
              toast.success(`برنامه «${p.name}» فعال شد`, { description: `پیش‌سرمایش ${fa(p.preCool)} درجه پیش از اوج تعرفه` });
              navigate({ to: "/design" });
            }}
          >
            پذیرش برنامه
          </InkButton>
          <WhiteButton onClick={() => setOptionsOpen(true)}>گزینه‌های دیگر</WhiteButton>
        </div>
      </SunPanel>

      <Sheet open={optionsOpen} onOpenChange={setOptionsOpen} title="گزینه‌های برنامه دمایی" description="یکی را انتخاب کنید؛ نمودار بلافاصله به‌روز می‌شود.">
        <div className="space-y-3">
          {(Object.keys(PLANS) as PlanId[]).map((id) => {
            const it = PLANS[id];
            const active = id === plan;
            return (
              <button
                key={id}
                type="button"
                onClick={() => {
                  setPlan(id);
                  setOptionsOpen(false);
                }}
                className={cn(
                  "flex w-full items-center gap-3 rounded-3xl bg-card p-4 text-start shadow-soft",
                  active && "ring-2 ring-ink",
                )}
              >
                <span className={cn("grid size-7 place-items-center rounded-full", active ? "bg-ink text-ink-foreground" : "border-2 border-track-strong")}>
                  {active ? <Check className="size-4" /> : null}
                </span>
                <span className="flex-1">
                  <span className="block font-extrabold">{it.name}</span>
                  <span className="block text-xs text-muted-foreground">{it.desc}</span>
                </span>
                <span className="num text-lg font-black">{fa(it.saving)}٪</span>
              </button>
            );
          })}
        </div>
      </Sheet>

      <Sheet open={infoOpen} onOpenChange={setInfoOpen} title="منطق محاسبه">
        <div className="space-y-3 text-sm leading-7 text-foreground/85">
          <p>مصرف کولر (E) از توان (P)، مدت کار (t) و اختلاف دمای بیرون با دمای تنظیم‌شده محاسبه می‌شود. ضریب α میزان حساسیت مصرف به هر درجه اختلاف است.</p>
          <p>با پیش‌سرمایش خانه پیش از ساعت اوج تعرفه (۱۹ تا ۲۳) و افزایش جزئی دما در اوج، مصرف در گران‌ترین ساعات کاهش می‌یابد.</p>
        </div>
      </Sheet>
    </Screen>
  );
}
