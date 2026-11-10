import { createFileRoute } from "@tanstack/react-router";
import { Check, Clock, TriangleAlert } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { Sheet } from "@/components/eco/Sheet";
import {
  DropdownPill,
  Footnote,
  HeroStat,
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
import { canLockEnergy, invoiceGross, meterDiscrepancyPct } from "@/lib/eco-calc";
import { useEco } from "@/lib/eco-store";
import { fa, faDigits, faFixed } from "@/lib/fa";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/income")({
  head: () => ({
    meta: [
      { title: "درآمد و تطبیق کنتور | اکوسولار" },
      { name: "description", content: "صورتحساب خرید تضمینی بر پایه کنتور رسمی توزیع و تطبیق سه‌طرفه با اینورتر." },
      { property: "og:title", content: "درآمد و تطبیق کنتور | اکوسولار" },
      { property: "og:description", content: "صورتحساب خرید تضمینی بر پایه کنتور رسمی توزیع." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: IncomeScreen,
});

type MonthKey = "mehr" | "shahrivar" | "mordad";

const MONTHS: Record<MonthKey, { name: string; inverter: number; meter: number; issued: string; dayOf: number }> = {
  mehr: { name: "مهر", inverter: 657, meter: 641, issued: "۵ آبان ۱۴۰۵", dayOf: 11 },
  shahrivar: { name: "شهریور", inverter: 742, meter: 731, issued: "۴ مهر ۱۴۰۵", dayOf: 41 },
  mordad: { name: "مرداد", inverter: 815, meter: 768, issued: "۳ شهریور ۱۴۰۵", dayOf: 72 },
};

const LOCKED_RATE = 58540;

function IncomeScreen() {
  const { state, update } = useEco();
  const [month, setMonth] = useState<MonthKey>("mehr");
  const [reportOpen, setReportOpen] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [reportText, setReportText] = useState("");

  const m = MONTHS[month];
  const diff = meterDiscrepancyPct(m.inverter, m.meter);
  const locked = canLockEnergy(m.inverter, m.meter);
  const billing = locked ? m.meter : 0;
  const gross = invoiceGross(m.meter, LOCKED_RATE);
  const paid = state.paidMonths.includes(month);

  const bars = [
    { label: "اینورتر", sub: "پایش فنی", value: m.inverter, cls: "bg-sun" },
    { label: "کنتور توزیع", sub: "مرجع", value: m.meter, cls: "bg-sun-deep" },
    { label: "مبنای صورتحساب", sub: locked ? "قفل‌شده" : "در انتظار بررسی", value: billing, cls: "bg-ink" },
  ];

  return (
    <Screen>
      <TopArea>
        <ScreenHeader title={`درآمد ${m.name} ۱۴۰۵`} subtitle="صورتحساب خرید تضمینی" backTo="/dashboard" />
        <HeroStat
          label="مبلغ قابل دریافت از ساتبا"
          value={faFixed(gross / 1e6, 2)}
          unit="میلیون ریال"
          aside={
            <DropdownPill
              label="ماه"
              value={month}
              onChange={setMonth}
              options={(Object.keys(MONTHS) as MonthKey[]).map((k) => ({ value: k, label: MONTHS[k].name }))}
            />
          }
        />
        <div className="mt-3">
          <Pill tone="sun" className="font-extrabold">مبنا: کنتور رسمی توزیع، {fa(m.meter)} kWh</Pill>
        </div>

        <div className="mt-5 flex justify-between text-[10px] text-muted-foreground" dir="ltr">
          <span>kWh</span>
        </div>
        <div className="relative mt-2 flex h-52 gap-2">
          <div className="relative w-7 shrink-0 text-[10px] text-muted-foreground">
            {[0, 350, 700].map((t) => (
              <span key={t} className="absolute right-0 -translate-y-1/2" style={{ top: `${(1 - t / 750) * 100}%` }}>
                {fa(t)}
              </span>
            ))}
          </div>
          <div className="relative flex-1">
            {[0, 350, 700].map((t) => (
              <div key={t} className="absolute inset-x-0 border-t border-dashed border-track-strong" style={{ top: `${(1 - t / 750) * 100}%` }} />
            ))}
            <div className="absolute inset-0 flex items-end justify-around gap-5 px-2">
              {bars.map((b) => (
                <div key={b.label} className="flex h-full w-full max-w-20 flex-col items-center justify-end">
                  <span className="num mb-2 text-sm font-black">{fa(b.value)}</span>
                  <span className={cn("block w-full rounded-2xl transition-all duration-700", b.cls)} style={{ height: `${(b.value / 750) * 100}%` }} />
                </div>
              ))}
            </div>
          </div>
        </div>
        <div className="mt-2 flex gap-2">
          <div className="w-7 shrink-0" />
          <div className="flex flex-1 justify-around gap-5 px-2">
            {bars.map((b) => (
              <div key={b.label} className="w-full max-w-24 text-center">
                <p className="text-xs font-extrabold">{b.label}</p>
                <p className="text-[0.65rem] text-muted-foreground">{b.sub}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-4 flex justify-center">
          {locked ? (
            <Pill tone="success" className="h-10 text-sm">
              <Check className="size-4" strokeWidth={3} /> اختلاف {fa(Math.abs(diff), 1)}٪ در محدوده مجاز، انرژی قفل شد
            </Pill>
          ) : (
            <Pill tone="danger" className="h-10 text-sm">
              <TriangleAlert className="size-4" /> اختلاف {fa(Math.abs(diff), 1)}٪ خارج از محدوده؛ نیاز به بررسی
            </Pill>
          )}
        </div>
      </TopArea>

      <SunPanel>
        <PanelTitle aside={<Pill tone={paid ? "success" : "ink"} size="sm" className="h-8 px-4 text-xs">{paid ? "پرداخت‌شده" : "صادرشده"}</Pill>}>
          صورتحساب
        </PanelTitle>
        <div className="mt-2">
          <InfoRow label="انرژی مبنا" value={`${fa(m.meter)} kWh`} />
          <InfoRow label="نرخ قفل‌شده قرارداد" value={`${fa(LOCKED_RATE, 0, false)} ریال`} />
          <InfoRow label="مبلغ ناخالص" value={`${fa(gross, 0, false)} ریال`} />
          <InfoRow label="تاریخ صدور" value={m.issued} last />
        </div>
        <div className="mt-2 flex items-center gap-2 rounded-full bg-card px-4 py-3.5 text-xs font-bold text-warn">
          <Clock className="size-4 shrink-0" />
          {paid ? <span className="text-success">وجه دریافت و تأیید شد</span> : <span>روز {faDigits(m.dayOf)} از صدور | تأخیر معمول ساتبا ۲ تا ۳ ماه</span>}
        </div>
        <div className="mt-5 flex gap-3">
          <InkButton disabled={paid} onClick={() => setConfirmOpen(true)}>
            {paid ? "دریافت تأیید شد" : "تأیید دریافت وجه"}
          </InkButton>
          <WhiteButton onClick={() => setReportOpen(true)}>گزارش مغایرت</WhiteButton>
        </div>
        <Footnote>واریز مستقیم ساتبا به شبای شما؛ اکوسولار وجهی نگه نمی‌دارد</Footnote>
      </SunPanel>

      <Sheet open={confirmOpen} onOpenChange={setConfirmOpen} title="تأیید دریافت وجه" description={`آیا مبلغ ${fa(gross)} ریال بابت صورتحساب ${m.name} به حساب شما واریز شده است؟`}>
        <div className="flex gap-3">
          <InkButton
            onClick={() => {
              update((s) => ({ paidMonths: [...s.paidMonths, month] }));
              setConfirmOpen(false);
              toast.success("دریافت وجه ثبت شد", { description: `صورتحساب ${m.name} تسویه شد` });
            }}
          >
            بله، دریافت کردم
          </InkButton>
          <WhiteButton className="bg-sun" onClick={() => setConfirmOpen(false)}>
            هنوز نه
          </WhiteButton>
        </div>
      </Sheet>

      <Sheet open={reportOpen} onOpenChange={setReportOpen} title="گزارش مغایرت" description="مغایرت را شرح دهید؛ کارشناس انطباق ظرف ۲ روز کاری بررسی می‌کند.">
        <textarea
          value={reportText}
          onChange={(e) => setReportText(e.target.value)}
          rows={4}
          placeholder="مثلاً: عدد کنتور توزیع با قرائت من مطابقت ندارد"
          className="w-full rounded-3xl bg-card p-4 text-sm shadow-soft outline-none focus:ring-2 focus:ring-sun-deep"
        />
        <InkButton
          className="mt-4 w-full flex-none"
          disabled={reportText.trim().length < 5}
          onClick={() => {
            const id = `MR-${Date.now().toString().slice(-6)}`;
            update((s) => ({ reports: [...s.reports, { id, month, text: reportText.trim() }] }));
            setReportText("");
            setReportOpen(false);
            toast.success("گزارش ثبت شد", { description: `کد پیگیری: ${faDigits(id)}` });
          }}
        >
          ارسال گزارش
        </InkButton>
      </Sheet>
    </Screen>
  );
}
