import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { BatteryMedium } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { Sheet } from "@/components/eco/Sheet";
import { BarChart } from "@/components/eco/charts";
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
  Switch,
  TopArea,
} from "@/components/eco/ui";
import { ANNUAL_PRODUCTION_KWH, BATTERY_FIT_RATE, MIN_BATTERY_KWH, MONTHLY_PRODUCTION_KWH } from "@/lib/eco-calc";
import { useEco } from "@/lib/eco-store";
import { fa, faDigits, SHAMSI_MONTHS } from "@/lib/fa";

export const Route = createFileRoute("/design")({
  head: () => ({
    meta: [
      { title: "طرح پیشنهادی نیروگاه | اکوسولار" },
      { name: "description", content: "طراحی خودکار نیروگاه خورشیدی ۵ کیلوواتی با تولید ماهانه و مشخصات فنی." },
      { property: "og:title", content: "طرح پیشنهادی نیروگاه | اکوسولار" },
      { property: "og:description", content: "طراحی خودکار نیروگاه خورشیدی با تولید ماهانه و مشخصات فنی." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: DesignScreen,
});

function DesignScreen() {
  const { state, update } = useEco();
  const navigate = useNavigate();
  const [mode, setMode] = useState<"simple" | "detailed">("simple");
  const [month, setMonth] = useState(4);
  const [infoOpen, setInfoOpen] = useState(false);

  const data = MONTHLY_PRODUCTION_KWH.map((v, i) => ({ label: faDigits(i + 1), value: v }));

  return (
    <Screen>
      <TopArea>
        <ScreenHeader title="طرح پیشنهادی نیروگاه" subtitle="سرویس ۲ هوش مصنوعی" backTo="/optimize" />
        <HeroStat
          label="ظرفیت پیشنهادی"
          value="۵"
          unit="کیلووات پیک"
          aside={
            <DropdownPill
              label="سطح جزئیات"
              value={mode}
              onChange={setMode}
              options={[
                { value: "simple", label: "ساده" },
                { value: "detailed", label: "دقیق" },
              ]}
            />
          }
        />
        <div className="mt-3 flex flex-wrap gap-2">
          <Pill tone="sun" className="font-extrabold">
            تولید سالانه {fa(ANNUAL_PRODUCTION_KWH)} kWh
          </Pill>
          <Pill tone="white" className="font-medium text-foreground/70 shadow-soft">سایه‌اندازی ۶٪</Pill>
        </div>
        <BarChart
          data={data}
          max={900}
          ticks={[0, 450, 900]}
          selected={month}
          onSelect={setMonth}
          tooltip={(d, i) => `${SHAMSI_MONTHS[i]} ${fa(d.value)} kWh`}
          footLabel="ماه شمسی"
        />
      </TopArea>

      <SunPanel>
        <PanelTitle aside={<InfoCircleButton onClick={() => setInfoOpen(true)} />}>مشخصات طرح</PanelTitle>
        <div className="mt-2">
          <InfoRow label="پنل" value="۹ عدد ۵۵۰ وات" />
          <InfoRow label="اینورتر" value={state.battery ? "هیبرید ۵ کیلووات، ۲ MPPT" : "متصل به شبکه ۵ کیلووات، ۲ MPPT"} />
          <InfoRow label="مساحت لازم بام" value="۲۸ از ۶۴ متر مربع" />
          <InfoRow label="جهت و شیب" value="جنوب، ۳۰ درجه" last={mode === "simple"} />
          {mode === "detailed" ? (
            <>
              <InfoRow label="تلفات کل سیستم" value="۱۴٪" />
              <InfoRow label="ضریب عملکرد PR" value="۸۲٪" />
              <InfoRow label="ساعات آفتابی معادل" value="۴,۳ ساعت در روز" last />
            </>
          ) : null}
        </div>

        <div className="mt-3 flex items-center gap-3 rounded-[1.75rem] bg-card p-4">
          <span className="grid size-12 shrink-0 place-items-center rounded-full bg-sun-soft">
            <BatteryMedium className="size-5" fill="currentColor" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="font-extrabold">نسخه باتری‌دار</p>
            <p className="mt-0.5 text-xs text-muted-foreground">
              حداقل {fa(MIN_BATTERY_KWH, 1)} kWh باتری، شرط نرخ {fa(BATTERY_FIT_RATE, 0, false)} ریال
            </p>
            <p className="mt-0.5 text-[0.65rem] text-muted-foreground/80">شارژ باتری از شبکه مجاز نیست</p>
          </div>
          <Switch
            label="نسخه باتری‌دار"
            checked={state.battery}
            onChange={(v) => {
              update({ battery: v, channel: v ? "fit-battery" : state.channel === "fit-battery" ? "fit-base" : state.channel });
              toast(v ? "نسخه باتری‌دار فعال شد" : "نسخه بدون باتری انتخاب شد", {
                description: v ? "کانال خرید تضمینی باتری‌دار در دسترس است" : "کانال خرید تضمینی پایه پیشنهاد می‌شود",
              });
            }}
          />
        </div>

        <InkButton className="mt-5 w-full flex-none" onClick={() => navigate({ to: "/channel" })}>
          مقایسه کانال‌های درآمد
        </InkButton>
      </SunPanel>

      <Sheet open={infoOpen} onOpenChange={setInfoOpen} title="طرح چگونه محاسبه شد؟">
        <div className="space-y-3 text-sm leading-7 text-foreground/85">
          <p>ظرفیت بر اساس مصرف سالانه قبض، مساحت قابل استفاده بام و تابش خورشید در نجف‌آباد انتخاب شده است.</p>
          <p>تولید ماهانه با در نظر گرفتن ۶٪ سایه‌اندازی و ۱۴٪ تلفات سیستم برآورد شده است.</p>
        </div>
      </Sheet>
    </Screen>
  );
}
