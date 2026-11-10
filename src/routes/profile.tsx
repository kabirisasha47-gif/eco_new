import { createFileRoute, Link, useNavigate, type LinkProps } from "@tanstack/react-router";
import { ChevronLeft, LogOut, User } from "lucide-react";
import { toast } from "sonner";

import { BottomNav } from "@/components/eco/BottomNav";
import { Screen, ScreenHeader, SunPanel, TopArea } from "@/components/eco/ui";
import { useEco } from "@/lib/eco-store";
import { faDigits } from "@/lib/fa";

export const Route = createFileRoute("/profile")({
  head: () => ({
    meta: [
      { title: "پروفایل و مسیر نیروگاه | اکوسولار" },
      { name: "description", content: "اطلاعات حساب و دسترسی سریع به همه مراحل مسیر نیروگاه خورشیدی." },
      { property: "og:title", content: "پروفایل | اکوسولار" },
      { property: "og:description", content: "اطلاعات حساب و مسیر نیروگاه خورشیدی." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: ProfileScreen,
});

const JOURNEY: { n: string; title: string; to: NonNullable<LinkProps["to"]> }[] = [
  { n: "۰۱", title: "ورود و OTP", to: "/" },
  { n: "۰۲", title: "داشبورد نیروگاه", to: "/dashboard" },
  { n: "۰۳", title: "تأیید قبض", to: "/bill" },
  { n: "۰۴", title: "بهینه‌سازی مصرف", to: "/optimize" },
  { n: "۰۵", title: "طرح نیروگاه", to: "/design" },
  { n: "۰۶", title: "کانال درآمد", to: "/channel" },
  { n: "۰۷", title: "پوشش قسط", to: "/installment" },
  { n: "۰۸", title: "پیش‌فاکتورها", to: "/quotes" },
  { n: "۰۹", title: "پرونده نیروگاه", to: "/case" },
  { n: "۱۰", title: "درآمد و تطبیق", to: "/income" },
];

function ProfileScreen() {
  const { state, reset } = useEco();
  const navigate = useNavigate();
  const p = state.phone;

  return (
    <Screen>
      <TopArea>
        <ScreenHeader title="پروفایل" subtitle="حساب کاربری و مسیر نیروگاه" backTo="/dashboard" />
        <div className="mt-6 flex items-center gap-4 rounded-[1.75rem] bg-card p-4 shadow-soft">
          <span className="grid size-14 place-items-center rounded-full bg-sun">
            <User className="size-6" fill="currentColor" />
          </span>
          <div className="flex-1">
            <p className="font-extrabold">پروسومر خانگی</p>
            <p className="num text-sm text-muted-foreground" dir="ltr">
              {faDigits(`${p.slice(0, 4)} ${p.slice(4, 7)} ${p.slice(7)}`)}
            </p>
          </div>
          <span className="text-xs text-muted-foreground">نجف‌آباد</span>
        </div>
      </TopArea>

      <SunPanel>
        <h2 className="text-xl font-extrabold">مسیر نیروگاه</h2>
        <p className="mt-1 text-xs text-foreground/75">از ورود تا صورتحساب مبتنی بر کنتور</p>
        <ul className="mt-3 space-y-2">
          {JOURNEY.map((j) => (
            <li key={j.n}>
              <Link to={j.to} className="flex items-center gap-3 rounded-full bg-card px-3 py-2.5">
                <span className="grid h-8 w-11 place-items-center rounded-full bg-sun text-xs font-black">{j.n}</span>
                <span className="flex-1 text-sm font-bold">{j.title}</span>
                <ChevronLeft className="size-4" />
              </Link>
            </li>
          ))}
        </ul>
        <button
          type="button"
          onClick={() => {
            reset();
            toast("از حساب خارج شدید");
            navigate({ to: "/" });
          }}
          className="mt-4 flex h-12 items-center justify-center gap-2 rounded-full bg-ink text-sm font-extrabold text-ink-foreground"
        >
          <LogOut className="size-4" /> خروج از حساب
        </button>
        <div className="flex-1" />
        <BottomNav active="/profile" />
      </SunPanel>
    </Screen>
  );
}
