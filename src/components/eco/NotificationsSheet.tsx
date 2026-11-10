import { Link } from "@tanstack/react-router";
import { Clock, FileText, Gauge } from "lucide-react";

import { Sheet } from "./Sheet";

const ITEMS = [
  {
    icon: Gauge,
    title: "قرائت کنتور مهر ثبت شد",
    body: "تطبیق سه‌طرفه انجام شد؛ اختلاف ۲,۴٪ در محدوده مجاز است.",
    time: "۱۰ دقیقه پیش",
    to: "/income" as const,
  },
  {
    icon: Clock,
    title: "زمان بازدید شرکت توزیع",
    body: "پیشنهاد: سه‌شنبه ۲۰ آبان، ساعت ۱۰ تا ۱۲. لطفاً تأیید کنید.",
    time: "۲ ساعت پیش",
    to: "/case" as const,
  },
  {
    icon: FileText,
    title: "۳ پیش‌فاکتور جدید",
    body: "تأمین‌کنندگان برای طرح ۵ کیلوواتی قیمت ارسال کردند.",
    time: "دیروز",
    to: "/quotes" as const,
  },
];

export function NotificationsSheet({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
}) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange} title="اعلان‌ها" description="آخرین رویدادهای نیروگاه شما">
      <ul className="space-y-3">
        {ITEMS.map((it) => (
          <li key={it.title}>
            <Link
              to={it.to}
              onClick={() => onOpenChange(false)}
              className="flex gap-3 rounded-3xl bg-card p-4 shadow-soft"
            >
              <span className="grid size-11 shrink-0 place-items-center rounded-full bg-sun-soft">
                <it.icon className="size-5" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="flex items-center justify-between gap-2">
                  <span className="text-sm font-extrabold">{it.title}</span>
                  <span className="shrink-0 text-[0.65rem] text-muted-foreground">{it.time}</span>
                </span>
                <span className="mt-1 block text-xs leading-5 text-muted-foreground">{it.body}</span>
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </Sheet>
  );
}
