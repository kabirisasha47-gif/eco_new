import { createFileRoute } from "@tanstack/react-router";
import { Camera, Check, CircleCheck, Clock, FileText } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { BottomNav } from "@/components/eco/BottomNav";
import { Sheet } from "@/components/eco/Sheet";
import { ActionCard, HeroStat, InkButton, PanelTitle, Pill, Screen, ScreenHeader, SunPanel, TopArea, WhiteButton } from "@/components/eco/ui";
import { useEco } from "@/lib/eco-store";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/case")({
  head: () => ({
    meta: [
      { title: "پرونده نیروگاه | اکوسولار" },
      { name: "description", content: "پیگیری مراحل مجوز، بازدید شرکت توزیع و نصب پیمانکار نیروگاه خورشیدی." },
      { property: "og:title", content: "پرونده نیروگاه | اکوسولار" },
      { property: "og:description", content: "پیگیری مراحل مجوز و نصب نیروگاه خورشیدی." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: CaseScreen,
});

type StepState = "done" | "current" | "todo";

const STEPS: { title: string; note: string; state: StepState; docs?: boolean }[] = [
  { title: "ثبت درخواست", note: "تکمیل شد، ۱۲ مهر", state: "done" },
  { title: "تشکیل پرونده در مهرسان", note: "تکمیل شد، ۱۵ مهر", state: "done" },
  { title: "بارگذاری مدارک مالکیت و شبا", note: "تأیید شد، ۱۸ مهر", state: "done", docs: true },
  { title: "بازدید فنی شرکت توزیع", note: "در جریان، مسئول: شرکت توزیع اصفهان", state: "current" },
  { title: "نصب و راه‌اندازی", note: "پیمانکار منتخب مناقصه", state: "todo" },
  { title: "تست و نصب کنتور دوطرفه", note: "شرکت توزیع", state: "todo" },
  { title: "شروع بهره‌برداری", note: "فعال‌سازی قرارداد و پایش", state: "todo" },
];

const INSTALL_STAGES = ["تحویل تجهیزات", "سازه", "نصب پنل", "سیم‌کشی", "راه‌اندازی"];

const DOCS = [
  { name: "سند مالکیت ملک", date: "۱۸ مهر" },
  { name: "کارت ملی مالک", date: "۱۸ مهر" },
  { name: "شماره شبا به نام مالک", date: "۱۸ مهر" },
  { name: "آخرین قبض برق", date: "۱۶ مهر" },
];

function CaseScreen() {
  const { state, update } = useEco();
  const [docsOpen, setDocsOpen] = useState(false);
  const [visitOpen, setVisitOpen] = useState(false);

  return (
    <Screen>
      <TopArea>
        <ScreenHeader title="پرونده نیروگاه" subtitle="کد رهگیری مهرسان ۰۴۱۲-۷۷۸۱۵" backTo="/quotes" />
        <HeroStat
          label="مرحله جاری"
          value="۴ از ۷"
          aside={
            state.visitConfirmed ? (
              <Pill tone="success" className="mb-2 h-10 text-sm">
                <span className="size-2 rounded-full bg-success" /> بازدید زمان‌بندی شد
              </Pill>
            ) : (
              <Pill tone="warn" className="mb-2 h-10 text-sm">
                <span className="size-2 rounded-full bg-warn" /> در انتظار بازدید
              </Pill>
            )
          }
        />
        <div className="mt-3">
          <Pill tone="white" className="font-medium shadow-soft">
            <Clock className="size-4" /> مهلت بازدید شرکت توزیع: ۳ روز کاری
          </Pill>
        </div>

        <ol className="mt-6">
          {STEPS.map((s, i) => (
            <li key={s.title} className="relative flex gap-3 pb-4 last:pb-0">
              {i < STEPS.length - 1 ? (
                <span
                  className={cn(
                    "absolute right-[13px] top-7 h-[calc(100%-12px)] w-0.5",
                    s.state === "done" ? "bg-ink" : "bg-track-strong",
                  )}
                />
              ) : null}
              <span
                className={cn(
                  "relative z-10 grid size-7 shrink-0 place-items-center rounded-full",
                  s.state === "done" && "bg-ink text-ink-foreground",
                  s.state === "current" && "border-[3px] border-sun-deep bg-card",
                  s.state === "todo" && "border-2 border-track-strong bg-card",
                )}
              >
                {s.state === "done" ? <Check className="size-3.5" strokeWidth={3} /> : null}
                {s.state === "current" ? <span className="size-3 rounded-full bg-sun-deep" /> : null}
              </span>
              <div className="min-w-0 flex-1">
                <p className={cn("font-extrabold", s.state === "todo" && "text-foreground/40")}>{s.title}</p>
                <p className={cn("text-xs text-muted-foreground", s.state === "todo" && "opacity-70")}>{s.note}</p>
              </div>
              {s.docs ? (
                <button type="button" onClick={() => setDocsOpen(true)} className="self-center text-xs font-extrabold underline-offset-4 hover:underline">
                  مدارک
                </button>
              ) : null}
              {s.state === "current" ? (
                <Pill tone="sun" size="sm" className="h-7 self-center bg-sun px-3 text-xs">جاری</Pill>
              ) : null}
            </li>
          ))}
        </ol>
      </TopArea>

      <SunPanel>
        <PanelTitle aside={<span className="num text-sm font-extrabold">۰ از ۵</span>}>مراحل نصب پیمانکار</PanelTitle>
        <div className="mt-4 grid grid-cols-5 gap-2">
          {INSTALL_STAGES.map((s) => (
            <div key={s} className="text-center">
              <span className="block h-2.5 rounded-full bg-card" />
              <span className="mt-2 block text-[0.65rem] text-foreground/70">{s}</span>
            </div>
          ))}
        </div>
        <p className="mt-3 flex items-center gap-1.5 text-xs text-foreground/75">
          <Camera className="size-4" /> هر مرحله با عکس دارای زمان و موقعیت تأیید می‌شود
        </p>

        {state.visitConfirmed ? (
          <ActionCard
            icon={<CircleCheck className="size-5 text-success" />}
            title="زمان بازدید تأیید شد"
            subtitle="سه‌شنبه ۲۰ آبان، ساعت ۱۰ تا ۱۲"
            onClick={() => setVisitOpen(true)}
          />
        ) : (
          <ActionCard
            icon={<Clock className="size-5" />}
            title="زمان بازدید را تأیید کنید"
            subtitle="پیشنهاد شرکت توزیع: سه‌شنبه ۲۰ آبان، ۱۰ تا ۱۲"
            onClick={() => setVisitOpen(true)}
          />
        )}

        <div className="flex-1" />
        <BottomNav active="/case" />
      </SunPanel>

      <Sheet open={docsOpen} onOpenChange={setDocsOpen} title="مدارک بارگذاری‌شده" description="همه مدارک توسط کارشناس تأیید شده‌اند.">
        <ul className="space-y-2">
          {DOCS.map((d) => (
            <li key={d.name} className="flex items-center gap-3 rounded-2xl bg-card p-3 shadow-soft">
              <span className="grid size-10 place-items-center rounded-full bg-sun-soft">
                <FileText className="size-4" />
              </span>
              <span className="flex-1 text-sm font-bold">{d.name}</span>
              <Pill tone="success" size="sm">تأیید، {d.date}</Pill>
            </li>
          ))}
        </ul>
      </Sheet>

      <Sheet open={visitOpen} onOpenChange={setVisitOpen} title="بازدید فنی شرکت توزیع" description="کارشناس برای بررسی بام و انشعاب مراجعه می‌کند. لطفاً در زمان بازدید در محل حضور داشته باشید.">
        <div className="rounded-3xl bg-card p-4 shadow-soft">
          <p className="text-xs text-muted-foreground">زمان پیشنهادی</p>
          <p className="mt-1 text-lg font-extrabold">سه‌شنبه ۲۰ آبان ۱۴۰۵</p>
          <p className="text-sm">ساعت ۱۰ تا ۱۲</p>
        </div>
        <div className="mt-5 flex gap-3">
          <InkButton
            onClick={() => {
              update({ visitConfirmed: true });
              setVisitOpen(false);
              toast.success("زمان بازدید تأیید شد", { description: "یادآوری یک روز قبل برای شما ارسال می‌شود" });
            }}
          >
            {state.visitConfirmed ? "تأیید شده" : "تأیید زمان"}
          </InkButton>
          <WhiteButton
            className="bg-sun"
            onClick={() => {
              update({ visitConfirmed: false });
              setVisitOpen(false);
              toast("درخواست تغییر زمان ارسال شد", { description: "شرکت توزیع زمان جدید پیشنهاد می‌دهد" });
            }}
          >
            درخواست تغییر
          </WhiteButton>
        </div>
      </Sheet>
    </Screen>
  );
}
