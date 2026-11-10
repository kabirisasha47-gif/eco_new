import { Link } from "@tanstack/react-router";
import { Download, Smartphone, WifiOff } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { useOnlineStatus, usePWAInstall } from "@/hooks/use-pwa-install";
import { APK_META } from "@/lib/apk-config";
import { faDigits } from "@/lib/fa";

import { Sheet } from "./Sheet";
import { InkButton } from "./ui";

export function OfflineBanner() {
  const isOnline = useOnlineStatus();
  if (isOnline) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className="mx-5 mt-3 flex items-center gap-2 rounded-2xl bg-warn-soft px-3.5 py-2 text-xs font-bold text-foreground shadow-soft"
    >
      <WifiOff className="size-4 shrink-0 text-warn" />
      <span>حالت آفلاین — داده‌های ذخیره شده در حافظه اندروید نمایش داده می‌شود</span>
    </div>
  );
}

export function PWAInstallBanner({ compact = false }: { compact?: boolean }) {
  const { isInstallable, isInstalled, isIOS, promptInstall } = usePWAInstall();
  const [guideOpen, setGuideOpen] = useState(false);

  if (isInstalled) {
    return null;
  }

  async function handleQuickInstall() {
    if (isInstallable) {
      const outcome = await promptInstall();
      if (outcome === "accepted") {
        toast.success("نصب اپلیکیشن اندروید اکوسولار آغاز شد");
      }
      return;
    }
    setGuideOpen(true);
  }

  return (
    <>
      <div className="flex items-center justify-between gap-2.5 rounded-[1.5rem] bg-card p-3 shadow-soft">
        <div className="flex min-w-0 items-center gap-2.5">
          <span className="grid size-10 shrink-0 place-items-center rounded-2xl bg-sun text-ink">
            <Smartphone className="size-5" />
          </span>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <p className=" whitespace-nowrap text-xs font-extrabold text-foreground">
                نسخه اندروید اکوسولار
              </p>
              <span
                dir="ltr"
                className="shrink-0 whitespace-nowrap rounded-full bg-sun-soft px-2 py-0.5 text-[0.65rem] font-extrabold text-foreground"
              >
                v{faDigits(APK_META.versionName)}
              </span>
            </div>
            {!compact ? (
              <p className="mt-0.5 whitespace-nowrap text-[0.7rem] text-muted-foreground">
                نصب مستقیم یا دریافت بسته نصبی APK
              </p>
            ) : null}
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-1.5">
          {isInstallable ? (
            <button
              type="button"
              onClick={handleQuickInstall}
              className="flex h-9 shrink-0 items-center gap-1 rounded-full bg-ink px-3 text-xs font-extrabold text-ink-foreground transition active:scale-95"
            >
              <Download className="size-3.5" />
              نصب
            </button>
          ) : null}
          <Link
            to="/apk"
            className="flex h-9 shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full bg-sun px-3.5 text-xs font-extrabold text-ink transition active:scale-95"
          >
            <Download className="size-3.5" />
            دریافت APK
          </Link>
        </div>
      </div>

      <Sheet
        open={guideOpen}
        onOpenChange={setGuideOpen}
        title="راهنمای نصب روی گوشی"
        description={`نسخه ${faDigits(APK_META.versionName)} • ${APK_META.packageId}`}
      >
        <div className="space-y-3 text-sm leading-7 text-foreground/85">
          {isIOS ? (
            <>
              <p>۱. در نوار پایین مرورگر Safari دکمه اشتراک‌گذاری (Share) را لمس کنید.</p>
              <p>
                ۲. گزینه Add to Home Screen را انتخاب کنید تا آیکون اکوسولار به صفحه اصلی اضافه شود.
              </p>
            </>
          ) : (
            <>
              <p>
                ۱. در مرورگر Chrome اندروید منوی سه‌نقطه بالا را باز کرده و گزینه «Install app» یا
                «افزودن به صفحه اصلی» را بزنید.
              </p>
              <p>
                ۲. برای دریافت بسته کامل APK (پروژه TWA / Capacitor آماده امضا و انتشار در
                کافه‌بازار)، به صفحه مرکز APK بروید.
              </p>
            </>
          )}
        </div>
        <div className="mt-5 flex gap-2">
          <Link
            to="/apk"
            onClick={() => setGuideOpen(false)}
            className="flex h-14 flex-1 items-center justify-center rounded-full bg-ink px-5 text-sm font-extrabold text-ink-foreground"
          >
            ورود به مرکز ساخت و دانلود APK
          </Link>
          <InkButton
            className="h-14 flex-none bg-muted px-5 text-sm text-foreground"
            onClick={() => setGuideOpen(false)}
          >
            بستن
          </InkButton>
        </div>
      </Sheet>
    </>
  );
}
