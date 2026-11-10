import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Clock, Lock } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

import { DropdownPill, Footnote, HeroStat, InkButton, PanelTitle, Pill, Screen, ScreenHeader, SunPanel, TopArea } from "@/components/eco/ui";
import { useEco } from "@/lib/eco-store";
import { fa, faFixed, faTimer } from "@/lib/fa";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/quotes")({
  head: () => ({
    meta: [
      { title: "پیش‌فاکتورهای تجهیزات | اکوسولار" },
      { name: "description", content: "مقایسه پیش‌فاکتورهای تأمین‌کنندگان دارای گواهی ساتبا برای طرح ۵ کیلوواتی." },
      { property: "og:title", content: "پیش‌فاکتورهای تجهیزات | اکوسولار" },
      { property: "og:description", content: "مقایسه پیش‌فاکتورهای تأمین‌کنندگان دارای گواهی ساتبا." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: QuotesScreen,
});

interface Quote {
  id: string;
  supplier: string;
  items: string;
  price: number;
  rating: number;
  certified: boolean;
  /** seconds of validity left at page load; 0 = expired */
  validSeconds: number;
}

const QUOTES: Quote[] = [
  { id: "a", supplier: "تأمین‌کننده الف", items: "پنل ۹ عدد، اینورتر ۵ کیلووات، سازه و کابل", price: 3_032_000_000, rating: 4.7, certified: true, validSeconds: 5 * 3600 + 32 * 60 + 10 },
  { id: "b", supplier: "تأمین‌کننده ب", items: "پنل ۹ عدد، اینورتر ۵ کیلووات، سازه و کابل", price: 3_061_000_000, rating: 4.5, certified: true, validSeconds: 27 * 3600 + 15 * 60 },
  { id: "c", supplier: "تأمین‌کننده ج", items: "پنل ۹ عدد، اینورتر ۵ کیلووات، سازه و کابل", price: 3_028_000_000, rating: 4.2, certified: true, validSeconds: 0 },
];

type Sort = "default" | "price" | "rating";

function QuotesScreen() {
  const { state, update } = useEco();
  const navigate = useNavigate();
  const [sort, setSort] = useState<Sort>("default");
  const [selected, setSelected] = useState<string | null>(state.quoteId);
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    const t = setInterval(() => setElapsed((e) => e + 1), 1000);
    return () => clearInterval(t);
  }, []);

  const quotes = useMemo(() => {
    const list = QUOTES.map((q) => ({ ...q, left: Math.max(0, q.validSeconds - elapsed) }));
    if (sort === "price") list.sort((a, b) => a.price - b.price);
    if (sort === "rating") list.sort((a, b) => b.rating - a.rating);
    return list;
  }, [sort, elapsed]);

  const valid = quotes.filter((q) => q.left > 0);
  const lowest = valid.length ? Math.min(...valid.map((q) => q.price)) : 0;
  const selectedQuote = quotes.find((q) => q.id === selected && q.left > 0);

  return (
    <Screen>
      <TopArea>
        <ScreenHeader title="پیش‌فاکتورهای تجهیزات" subtitle="استعلام قیمت طرح ۵ کیلووات" backTo="/installment" />
        <HeroStat
          label="کمترین قیمت معتبر"
          value={faFixed(lowest / 1e9, 2)}
          unit="میلیارد ریال"
          aside={
            <DropdownPill
              label="مرتب‌سازی"
              value={sort}
              onChange={setSort}
              options={[
                { value: "default", label: "مرتب‌سازی" },
                { value: "price", label: "ارزان‌ترین" },
                { value: "rating", label: "بیشترین امتیاز" },
              ]}
            />
          }
        />
        <div className="mt-3">
          <Pill tone="sun" className="font-extrabold">{fa(QUOTES.length)} پیش‌فاکتور دریافت شد</Pill>
        </div>
      </TopArea>

      <SunPanel>
        <PanelTitle aside={<span className="text-[0.65rem] text-foreground/70">اعتبار محدود به دلیل نوسان ارز</span>}>
          مقایسه فهرست تجهیزات
        </PanelTitle>

        <div className="mt-2" role="radiogroup" aria-label="پیش‌فاکتورها">
          {quotes.map((q) => {
            const expired = q.left <= 0;
            const active = selected === q.id && !expired;
            return (
              <button
                key={q.id}
                type="button"
                role="radio"
                aria-checked={active}
                aria-disabled={expired}
                onClick={() => {
                  if (expired) {
                    toast.error("این پیش‌فاکتور منقضی شده و قابل انتخاب نیست");
                    return;
                  }
                  setSelected(q.id);
                }}
                className={cn(
                  "mt-3 block w-full rounded-[1.75rem] p-4 text-start transition",
                  expired ? "bg-sun-wash" : "bg-card",
                  active && "ring-2 ring-ink",
                )}
              >
                <span className="flex items-center gap-2">
                  <span
                    className={cn(
                      "grid size-6 shrink-0 place-items-center rounded-full border-2",
                      expired ? "border-track-strong" : "border-ink",
                    )}
                  >
                    {active ? <span className="size-3 rounded-full bg-ink" /> : null}
                  </span>
                  <span className={cn("font-extrabold", expired && "text-foreground/50")}>{q.supplier}</span>
                  <Pill tone={expired ? "muted" : "success"} size="sm">گواهی ساتبا</Pill>
                  <span className={cn("ms-auto text-xs font-bold", expired && "text-foreground/40")}>امتیاز {fa(q.rating, 1)}</span>
                </span>
                <span className={cn("mt-2 block ps-8 text-xs text-muted-foreground", expired && "opacity-60")}>{q.items}</span>
                <span className="mt-3 flex items-center justify-between ps-8">
                  <span className={cn("num text-base font-black", expired && "text-foreground/40 line-through")}>
                    {fa(q.price)} ریال
                  </span>
                  {expired ? (
                    <Pill tone="danger" size="sm" className="h-7 px-3 text-xs">منقضی شده</Pill>
                  ) : (
                    <Pill tone="warn" size="sm" className="h-7 px-3 text-xs">
                      <Clock className="size-3.5" /> اعتبار تا {faTimer(q.left, true)}
                    </Pill>
                  )}
                </span>
              </button>
            );
          })}
        </div>

        <Footnote icon={<Lock className="size-3.5" fill="currentColor" />}>پرداخت مستقیم از بانک عامل به تأمین‌کننده انجام می‌شود</Footnote>

        <InkButton
          className="mt-4 w-full flex-none"
          disabled={!selectedQuote}
          onClick={() => {
            if (!selectedQuote) return;
            update({ quoteId: selectedQuote.id, orderPlaced: true });
            window.__lovableEvents?.track?.("project.order_placed", {
              supplier_id: selectedQuote.id,
              price_rank: [...valid].sort((a, b) => a.price - b.price).findIndex((q) => q.id === selectedQuote.id) + 1,
              order_value_rial: selectedQuote.price,
            });
            toast.success("سفارش ثبت شد", { description: `${selectedQuote.supplier} — ${fa(selectedQuote.price)} ریال` });
            navigate({ to: "/case" });
          }}
        >
          انتخاب و ثبت سفارش
        </InkButton>
        <Footnote>پیش‌فاکتور منقضی به سفارش تبدیل نمی‌شود</Footnote>
      </SunPanel>
    </Screen>
  );
}
