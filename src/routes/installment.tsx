import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { ChevronLeft, Pencil, TriangleAlert } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { Sheet } from "@/components/eco/Sheet";
import { Gauge, HBar } from "@/components/eco/charts";
import { InkButton, PanelTitle, Pill, Screen, ScreenHeader, SunPanel, TopArea } from "@/components/eco/ui";
import { Slider } from "@/components/ui/slider";
import {
  coverageByYear,
  coverageRatio,
  maxCoverableLoan,
  MONTHLY_FIT_INCOME,
  monthlyInstallment,
} from "@/lib/eco-calc";
import { useEco } from "@/lib/eco-store";
import { fa, faFixed } from "@/lib/fa";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/installment")({
  head: () => ({
    meta: [
      { title: "پوشش قسط وام | اکوسولار" },
      { name: "description", content: "شبیه‌ساز چندساله پوشش قسط وام ساتبا با درآمد خرید تضمینی." },
      { property: "og:title", content: "پوشش قسط وام | اکوسولار" },
      { property: "og:description", content: "شبیه‌ساز چندساله پوشش قسط وام با درآمد نیروگاه." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: InstallmentScreen,
});

const M = 1_000_000;
const B = 1_000_000_000;

function InstallmentScreen() {
  const { state, update } = useEco();
  const navigate = useNavigate();
  const [loanOpen, setLoanOpen] = useState(false);
  const [strategy, setStrategy] = useState<1 | 2 | 3 | null>(state.strategy);
  const [draft, setDraft] = useState(state.loan);

  const { amount, rate, months } = state.loan;
  const installment = monthlyInstallment(amount, rate, months);
  const income = MONTHLY_FIT_INCOME;
  const ratio = coverageRatio(income, installment);
  const gap = Math.max(0, installment - income);
  const years = coverageByYear(ratio);
  const maxLoan = maxCoverableLoan(income, rate, months);
  const longerMonths = Math.min(120, months * 2);
  const longerRatio = coverageRatio(income, monthlyInstallment(amount, rate, longerMonths));

  const strategies = [
    {
      id: 1 as const,
      title: "وام کمتر با آورده نقدی بیشتر",
      desc: `سقف قابل پوشش با درآمد سال اول حدود ${faFixed(maxLoan / B, 2)} میلیارد ریال`,
    },
    {
      id: 2 as const,
      title: "افزایش مدت بازپرداخت",
      desc: `با ${fa(longerMonths)} ماه پوشش به ${fa(Math.round(longerRatio * 100))}٪ می‌رسد؛ از طریق بانک‌های همکار جایگزین`,
    },
    {
      id: 3 as const,
      title: "پرداخت مابه‌التفاوت ماهانه",
      desc: `حدود ${fa(gap / M, 1)} میلیون ریال در ماه در سال اول`,
    },
  ];

  return (
    <Screen>
      <TopArea>
        <ScreenHeader title="پوشش قسط وام" subtitle="شبیه‌ساز چندساله" backTo="/channel" />

        <div className="mt-5 flex justify-center">
          <button
            type="button"
            onClick={() => {
              setDraft(state.loan);
              setLoanOpen(true);
            }}
            className="flex h-10 items-center gap-3 rounded-full bg-card px-5 text-sm font-extrabold shadow-soft"
          >
            وام ساتبا {fa(amount / B, 2)} میلیارد ریال، سود {fa(rate)}٪، {fa(months)} ماه
            <Pencil className="size-3.5" fill="currentColor" />
          </button>
        </div>

        <Gauge ratio={ratio} label="پوشش قسط سال اول" />

        <div className="mt-4 grid grid-cols-2 gap-3">
          <div className="rounded-3xl bg-card p-4 shadow-soft">
            <p className="text-xs text-muted-foreground">درآمد ماهانه FIT</p>
            <p className="num mt-2 text-base font-extrabold">{faFixed(income / M, 2)} میلیون ریال</p>
          </div>
          <div className="rounded-3xl bg-card p-4 shadow-soft">
            <p className="text-xs text-muted-foreground">قسط ماهانه</p>
            <p className="num mt-2 text-base font-extrabold">{faFixed(installment / M, 2)} میلیون ریال</p>
          </div>
        </div>

        {gap > 0 ? (
          <div className="mt-3 flex justify-center">
            <Pill tone="danger" className="h-10 text-sm">
              <TriangleAlert className="size-4" />
              شکاف ماهانه حدود {faFixed(gap / M, 2)} میلیون ریال
            </Pill>
          </div>
        ) : (
          <div className="mt-3 flex justify-center">
            <Pill tone="success" className="h-10 text-sm">درآمد کل قسط را پوشش می‌دهد</Pill>
          </div>
        )}

        <div className="mt-5 flex items-center justify-between gap-2">
          <h2 className="text-lg font-extrabold">مسیر چندساله</h2>
          <Pill tone="sun" size="sm" className="h-7 px-3 font-medium">سناریو، فرض تعدیل ۵۰٪ سالانه نرخ</Pill>
        </div>
        <div className="mt-3 grid grid-cols-3 gap-3">
          {years.map((r, i) => (
            <div key={i}>
              <div className="flex justify-between text-xs">
                <span className="text-muted-foreground">سال {fa(i + 1)}</span>
                <span className="num font-extrabold">{fa(Math.round(r * 100))}٪</span>
              </div>
              <div className="mt-1.5">
                <HBar ratio={r} className={i === 0 ? "bg-sun-deep" : "bg-sun"} />
              </div>
            </div>
          ))}
        </div>
      </TopArea>

      <SunPanel>
        <PanelTitle aside={<span className="text-xs text-foreground/70">سه راهکار</span>}>چه کار کنم؟</PanelTitle>
        <div className="mt-2" role="radiogroup" aria-label="راهکارها">
          {strategies.map((s) => {
            const active = strategy === s.id;
            return (
              <button
                key={s.id}
                type="button"
                role="radio"
                aria-checked={active}
                onClick={() => setStrategy(s.id)}
                className={cn(
                  "mt-3 flex w-full items-center gap-3 rounded-[1.75rem] bg-card p-4 text-start transition",
                  active && "ring-2 ring-ink",
                )}
              >
                <span className="grid size-10 shrink-0 place-items-center rounded-full bg-ink text-sm font-black text-ink-foreground">
                  {fa(s.id)}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block font-extrabold">{s.title}</span>
                  <span className="mt-0.5 block text-xs text-muted-foreground">{s.desc}</span>
                </span>
                <ChevronLeft className="size-5 shrink-0" />
              </button>
            );
          })}
        </div>

        <InkButton
          className="mt-5 w-full flex-none"
          onClick={() => {
            if (!strategy) {
              toast.error("ابتدا یکی از سه راهکار را انتخاب کنید");
              return;
            }
            update({ strategy });
            toast.success(`راهکار ${fa(strategy)} ثبت شد`);
            navigate({ to: "/quotes" });
          }}
        >
          ادامه با راهکار انتخابی
        </InkButton>
      </SunPanel>

      <Sheet open={loanOpen} onOpenChange={setLoanOpen} title="ویرایش مشخصات وام" description="شبیه‌سازی بلافاصله به‌روز می‌شود.">
        <div className="space-y-6">
          <LoanSlider
            label="مبلغ وام"
            value={draft.amount}
            min={0.5 * B}
            max={5 * B}
            step={0.05 * B}
            format={(v) => `${fa(v / B, 2)} میلیارد ریال`}
            onChange={(v) => setDraft((d) => ({ ...d, amount: v }))}
          />
          <LoanSlider
            label="نرخ سود سالانه"
            value={draft.rate}
            min={0}
            max={30}
            step={0.5}
            format={(v) => `${fa(v, 1)}٪`}
            onChange={(v) => setDraft((d) => ({ ...d, rate: v }))}
          />
          <LoanSlider
            label="مدت بازپرداخت"
            value={draft.months}
            min={12}
            max={120}
            step={1}
            format={(v) => `${fa(v)} ماه`}
            onChange={(v) => setDraft((d) => ({ ...d, months: v }))}
          />
          <div className="rounded-3xl bg-card p-4 text-sm shadow-soft">
            قسط ماهانه: <b className="num">{faFixed(monthlyInstallment(draft.amount, draft.rate, draft.months) / M, 2)} میلیون ریال</b>
          </div>
          <InkButton
            className="w-full flex-none"
            onClick={() => {
              update({ loan: draft });
              setLoanOpen(false);
            }}
          >
            اعمال تغییرات
          </InkButton>
        </div>
      </Sheet>
    </Screen>
  );
}

function LoanSlider({
  label,
  value,
  min,
  max,
  step,
  format,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  format: (v: number) => string;
  onChange: (v: number) => void;
}) {
  return (
    <div>
      <div className="flex justify-between text-sm">
        <span className="text-muted-foreground">{label}</span>
        <span className="num font-extrabold">{format(value)}</span>
      </div>
      <Slider
        dir="rtl"
        className="mt-3"
        value={[value]}
        min={min}
        max={max}
        step={step}
        onValueChange={([v]) => onChange(v ?? value)}
        aria-label={label}
      />
    </div>
  );
}
