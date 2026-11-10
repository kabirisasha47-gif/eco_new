import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { ChevronLeft, Eye, EyeOff, Info, TriangleAlert } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { Sheet } from "@/components/eco/Sheet";
import { HBar } from "@/components/eco/charts";
import {
  DropdownPill,
  Footnote,
  HeroStat,
  IconCircle,
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
import { ANNUAL_PRODUCTION_KWH, CHANNELS, type ChannelId } from "@/lib/eco-calc";
import { useEco } from "@/lib/eco-store";
import { fa } from "@/lib/fa";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/channel")({
  head: () => ({
    meta: [
      { title: "کانال فروش برق | اکوسولار" },
      { name: "description", content: "مقایسه کانال‌های درآمد: خرید تضمینی باتری‌دار، خرید تضمینی پایه و خودتأمین." },
      { property: "og:title", content: "کانال فروش برق | اکوسولار" },
      { property: "og:description", content: "مقایسه و انتخاب بهترین کانال فروش برق خورشیدی." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: ChannelScreen,
});

type Horizon = "1" | "5" | "20";
const HORIZON_LABEL: Record<Horizon, string> = { "1": "سال ۱", "5": "۵ سال", "20": "۲۰ سال" };

function ChannelScreen() {
  const { state, update } = useEco();
  const navigate = useNavigate();
  const [selected, setSelected] = useState<ChannelId>(state.channel);
  const [horizon, setHorizon] = useState<Horizon>("1");
  const [hideDetails, setHideDetails] = useState(false);
  const [whyOpen, setWhyOpen] = useState(false);
  const [sensOpen, setSensOpen] = useState(false);

  const channel = CHANNELS.find((c) => c.id === selected)!;
  const maxAnnual = Math.max(...CHANNELS.map((c) => c.annualMillion));
  const years = Number(horizon);
  const total = channel.annualMillion * years;
  const best = CHANNELS.reduce((a, b) => (a.annualMillion > b.annualMillion ? a : b));

  function choose() {
    const needsBattery = channel.requiresBattery && !state.battery;
    update({ channel: selected, channelConfirmed: true, battery: channel.requiresBattery ? true : state.battery });
    toast.success(`کانال «${channel.name}» انتخاب شد`, {
      description: needsBattery ? "نسخه باتری‌دار طرح نیز فعال شد" : undefined,
    });
    navigate({ to: "/installment" });
  }

  return (
    <Screen>
      <TopArea>
        <ScreenHeader title="کانال فروش برق" subtitle="نسخه نرخ: آبان ۱۴۰۵" backTo="/design" />
        <HeroStat
          label={selected === best.id ? "بهترین گزینه مجاز برای انشعاب شما" : `درآمد کانال ${channel.name}`}
          value={total >= 10000 ? fa(total / 1000, 1) : fa(total, 1)}
          unit={total >= 10000 ? `میلیارد ریال در ${years} سال` : years === 1 ? "میلیون ریال در سال" : `میلیون ریال در ${fa(years)} سال`}
          aside={
            <DropdownPill
              label="افق زمانی"
              value={horizon}
              onChange={setHorizon}
              options={(Object.keys(HORIZON_LABEL) as Horizon[]).map((h) => ({ value: h, label: HORIZON_LABEL[h] }))}
            />
          }
        />

        <div className="mt-5 space-y-4" role="radiogroup" aria-label="کانال‌های درآمد">
          {CHANNELS.map((c) => {
            const active = c.id === selected;
            return (
              <button
                key={c.id}
                type="button"
                role="radio"
                aria-checked={active}
                onClick={() => setSelected(c.id)}
                className="block w-full text-start"
              >
                <span className="flex items-center justify-between">
                  <span className="flex items-center gap-2 text-sm font-extrabold">
                    {c.name}
                    {c.id === best.id ? <Pill tone="ink" size="sm">پیشنهاد</Pill> : null}
                  </span>
                  <span className="num text-xs font-extrabold">{fa(c.annualMillion * years, 1)} م.ر</span>
                </span>
                <span className="mt-2 block">
                  <HBar
                    ratio={c.annualMillion / maxAnnual}
                    className={cn(active ? "bg-sun-deep" : c.isFeedInTariff ? "bg-sun" : "bg-track-strong")}
                  />
                </span>
              </button>
            );
          })}
        </div>

        <div className="mt-5 flex gap-3 rounded-3xl bg-warn-soft p-4">
          <TriangleAlert className="mt-0.5 size-6 shrink-0 text-warn" fill="currentColor" stroke="var(--warn-soft)" />
          <div>
            <p className="text-sm font-extrabold">خرید تضمینی و خودتأمین روی یک انشعاب ممکن نیست</p>
            <p className="mt-1 text-xs text-foreground/70">یکی را انتخاب کنید یا انشعاب جداگانه بگیرید</p>
          </div>
        </div>
      </TopArea>

      <SunPanel>
        <PanelTitle
          aside={
            <IconCircle aria-label={hideDetails ? "نمایش جزئیات" : "پنهان کردن جزئیات"} onClick={() => setHideDetails((h) => !h)}>
              {hideDetails ? <EyeOff className="size-5" /> : <Eye className="size-5" />}
            </IconCircle>
          }
        >
          جزئیات کانال منتخب
        </PanelTitle>
        {!hideDetails ? (
          <div className="mt-2">
            <InfoRow label="نرخ قرارداد" value={`${fa(channel.rate, 0, false)} ریال بر kWh`} />
            <InfoRow
              label="مدت قرارداد"
              value={channel.contractYears > 1 ? `${fa(channel.contractYears)} سال با تعدیل دوره‌ای` : "سالانه، قابل تمدید"}
            />
            <InfoRow
              label={channel.isFeedInTariff ? "تأخیر پرداخت ساتبا" : "زمان دریافت منفعت"}
              badge={channel.paymentDelay ? <Pill tone="white" size="sm" className="text-warn">ریسک نقدینگی</Pill> : null}
              value={channel.paymentDelay ?? "هم‌زمان با قبض"}
            />
            <InfoRow label="شرط فعال‌سازی" value={channel.activation} last />
          </div>
        ) : null}

        <button
          type="button"
          onClick={() => setWhyOpen(true)}
          className="mt-3 flex w-full items-center gap-2 rounded-full bg-card px-4 py-3.5 text-start text-xs"
        >
          <Info className="size-5 shrink-0" />
          <span className="flex-1">چرا این کانال؟ ورودی‌ها، فرضیات و گزینه‌های جایگزین</span>
          <ChevronLeft className="size-4" />
        </button>

        <div className="mt-5 flex gap-3">
          <InkButton onClick={choose}>انتخاب این کانال</InkButton>
          <WhiteButton onClick={() => setSensOpen(true)}>تحلیل حساسیت</WhiteButton>
        </div>
        <Footnote>اعداد براساس تولید {fa(ANNUAL_PRODUCTION_KWH)} kWh و نسخه فعال جدول نرخ است</Footnote>
      </SunPanel>

      <Sheet open={whyOpen} onOpenChange={setWhyOpen} title="چرا این کانال؟" description="مسیریاب کانال، گزینه‌ها را فقط پیشنهاد می‌دهد؛ تصمیم نهایی با شماست.">
        <div className="rounded-3xl bg-card px-4 py-1 shadow-soft">
          <InfoRow label="تولید سالانه" value={`${fa(ANNUAL_PRODUCTION_KWH)} kWh`} />
          <InfoRow label="نوع انشعاب" value="خانگی، تک‌فاز" />
          <InfoRow label="باتری در طرح" value={state.battery ? "دارد" : "ندارد"} />
          <InfoRow label="نسخه جدول نرخ" value="آبان ۱۴۰۵" last />
        </div>
        <p className="mt-4 text-sm leading-7 text-foreground/80">
          کانال باتری‌دار بیشترین درآمد را دارد اما نیازمند حداقل ۷,۵ کیلووات‌ساعت باتری است. خرید تضمینی پایه بدون باتری فعال می‌شود. خودتأمین درآمد نقدی ندارد و به‌صورت کاهش قبض است.
        </p>
      </Sheet>

      <Sheet open={sensOpen} onOpenChange={setSensOpen} title="تحلیل حساسیت" description={`درآمد سالانه ${channel.name} با تغییر تولید`}>
        <div className="space-y-4">
          {[-20, -10, 0, 10, 20].map((d) => {
            const v = channel.annualMillion * (1 + d / 100);
            return (
              <div key={d}>
                <div className="flex justify-between text-sm">
                  <span className="font-bold">تولید {d === 0 ? "مبنا" : `${d > 0 ? "+" : "−"}${fa(Math.abs(d))}٪`}</span>
                  <span className="num font-extrabold">{fa(v, 1)} م.ر</span>
                </div>
                <div className="mt-1.5">
                  <HBar ratio={v / (channel.annualMillion * 1.2)} className={d === 0 ? "bg-ink" : "bg-sun-deep"} />
                </div>
              </div>
            );
          })}
        </div>
      </Sheet>
    </Screen>
  );
}
