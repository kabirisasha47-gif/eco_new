import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Check, Clock, Lock } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";

import { Sheet } from "@/components/eco/Sheet";
import { Footnote, InkButton, Screen, SunMark, SunPanel } from "@/components/eco/ui";
import { faDigits, faTimer } from "@/lib/fa";
import { useEco } from "@/lib/eco-store";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "ورود به اکوسولار | مدیریت هوشمند انرژی خورشیدی" },
      { name: "description", content: "ورود با شماره موبایل و کد یکبار مصرف به اپلیکیشن اکوسولار." },
      { property: "og:title", content: "ورود به اکوسولار" },
      { property: "og:description", content: "ورود با شماره موبایل و کد یکبار مصرف به اپلیکیشن اکوسولار." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: LoginScreen,
});

const RESEND_SECONDS = 92;
const toLatin = (s: string) => s.replace(/[۰-۹]/g, (d) => String("۰۱۲۳۴۵۶۷۸۹".indexOf(d))).replace(/[٠-٩]/g, (d) => String("٠١٢٣٤٥٦٧٨٩".indexOf(d)));

function formatPhone(p: string) {
  // 09133457781 -> ۰۹۱۳ ۳۴۵ ۷۷۸۱
  const d = p.replace(/\D/g, "");
  return faDigits([d.slice(0, 4), d.slice(4, 7), d.slice(7)].filter(Boolean).join(" "));
}

function LoginScreen() {
  const { state, update } = useEco();
  const navigate = useNavigate();
  const [step, setStep] = useState<"phone" | "otp">("phone");
  const [phone, setPhone] = useState(state.phone);
  const [digits, setDigits] = useState<string[]>(Array(6).fill(""));
  const [agree, setAgree] = useState(true);
  const [seconds, setSeconds] = useState(RESEND_SECONDS);
  const [consentOpen, setConsentOpen] = useState(false);
  const inputs = useRef<(HTMLInputElement | null)[]>([]);
  const resentOnce = useRef(false);

  useEffect(() => {
    if (step !== "otp" || seconds <= 0) return;
    const t = setInterval(() => setSeconds((s) => s - 1), 1000);
    return () => clearInterval(t);
  }, [step, seconds]);

  const phoneValid = /^09\d{9}$/.test(phone);
  const code = digits.join("");
  const canSubmit = code.length === 6 && agree;

  function sendCode() {
    if (!phoneValid) {
      toast.error("شماره موبایل باید ۱۱ رقم و با ۰۹ شروع شود");
      return;
    }
    update({ phone });
    if (step === "otp") resentOnce.current = true;
    window.__lovableEvents?.track?.("project.login_code_requested", { resend: step === "otp" });
    setStep("otp");
    setSeconds(RESEND_SECONDS);
    setDigits(Array(6).fill(""));
    toast.success(`کد ۶ رقمی به ${formatPhone(phone)} ارسال شد`, { description: "در نسخه نمایشی هر کد ۶ رقمی پذیرفته می‌شود." });
    setTimeout(() => inputs.current[0]?.focus(), 50);
  }

  function setDigit(i: number, raw: string) {
    const v = toLatin(raw).replace(/\D/g, "");
    if (v.length > 1) {
      // paste
      const next = [...digits];
      v.slice(0, 6 - i).split("").forEach((c, k) => (next[i + k] = c));
      setDigits(next);
      inputs.current[Math.min(5, i + v.length)]?.focus();
      return;
    }
    const next = [...digits];
    next[i] = v;
    setDigits(next);
    if (v && i < 5) inputs.current[i + 1]?.focus();
  }

  function submit() {
    if (!canSubmit) return;
    update({ loggedIn: true });
    window.__lovableEvents?.track?.("project.otp_completed", { resent: resentOnce.current });
    toast.success("خوش آمدید! ورود با موفقیت انجام شد");
    navigate({ to: "/dashboard" });
  }

  return (
    <Screen>
      <section className="flex flex-1 flex-col items-center justify-center px-6 pb-4 pt-16 text-center">
        <div className="grid size-36 place-items-center rounded-full bg-sun">
          <SunMark className="size-20 text-ink" />
        </div>
        <h1 className="mt-6 text-4xl font-black">اکوسولار</h1>
        <p className="mt-2 text-sm text-muted-foreground">مدیریت هوشمند انرژی خورشیدی شما</p>
      </section>

      <SunPanel className="flex-none pt-7">
        <h2 className="text-2xl font-extrabold">ورود با شماره موبایل</h2>

        {step === "phone" ? (
          <>
            <p className="mt-2 text-sm text-foreground/75">شماره موبایل خود را وارد کنید تا کد تأیید ارسال شود</p>
            <label className="mt-5 block">
              <span className="sr-only">شماره موبایل</span>
              <input
                inputMode="numeric"
                dir="ltr"
                autoComplete="tel"
                value={faDigits(phone)}
                onChange={(e) => setPhone(toLatin(e.target.value).replace(/\D/g, "").slice(0, 11))}
                placeholder="۰۹۱۳ ۰۰۰ ۰۰۰۰"
                className="h-16 w-full rounded-2xl bg-card px-5 text-center text-2xl font-black tracking-[0.2em] outline-none focus:ring-2 focus:ring-ink"
              />
            </label>
            <InkButton className="mt-6 w-full flex-none" onClick={sendCode} disabled={!phoneValid}>
              دریافت کد تأیید
            </InkButton>
          </>
        ) : (
          <>
            <div className="mt-2 flex items-center justify-between gap-3 text-sm">
              <span className="text-foreground/80">کد ۶ رقمی به {formatPhone(phone)} پیامک شد</span>
              <button
                type="button"
                onClick={() => setStep("phone")}
                className="shrink-0 border-b-2 border-ink/60 pb-0.5 font-extrabold"
              >
                ویرایش شماره
              </button>
            </div>

            <div className="mt-6 flex justify-between gap-2" dir="rtl">
              {digits.map((d, i) => (
                <input
                  key={i}
                  ref={(el) => {
                    inputs.current[i] = el;
                  }}
                  aria-label={`رقم ${faDigits(i + 1)}`}
                  inputMode="numeric"
                  autoComplete={i === 0 ? "one-time-code" : "off"}
                  value={d ? faDigits(d) : ""}
                  onChange={(e) => setDigit(i, e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Backspace" && !digits[i] && i > 0) inputs.current[i - 1]?.focus();
                    if (e.key === "Enter") submit();
                  }}
                  className="h-16 w-full min-w-0 rounded-2xl bg-card text-center text-2xl font-black outline-none focus:ring-2 focus:ring-ink"
                />
              ))}
            </div>

            <div className="mt-4 flex justify-center text-sm text-foreground/75">
              {seconds > 0 ? (
                <span className="flex items-center gap-1.5">
                  <Clock className="size-4" /> ارسال مجدد کد تا {faTimer(seconds)}
                </span>
              ) : (
                <button type="button" onClick={sendCode} className="flex items-center gap-1.5 font-extrabold underline underline-offset-4">
                  <Clock className="size-4" /> ارسال مجدد کد
                </button>
              )}
            </div>
          </>
        )}

        <div className="mt-6 flex gap-3 rounded-3xl bg-card p-4">
          <button
            type="button"
            role="checkbox"
            aria-checked={agree}
            aria-label="موافقت با شرایط"
            onClick={() => setAgree((a) => !a)}
            className={cn(
              "mt-0.5 grid size-7 shrink-0 place-items-center rounded-lg transition",
              agree ? "bg-ink text-ink-foreground" : "border-2 border-track-strong bg-card",
            )}
          >
            {agree ? <Check className="size-4" strokeWidth={3} /> : null}
          </button>
          <div className="text-sm leading-7 text-foreground/85">
            با شرایط استفاده و رضایت‌نامه اشتراک داده قبض و انشعاب برق موافقم.
            <button
              type="button"
              onClick={() => setConsentOpen(true)}
              className="block border-b-2 border-ink/50 font-extrabold leading-6 text-foreground"
            >
              مشاهده متن رضایت‌نامه
            </button>
          </div>
        </div>

        {step === "otp" ? (
          <InkButton className="mt-6 w-full flex-none" onClick={submit} disabled={!canSubmit}>
            تأیید و ورود
          </InkButton>
        ) : null}

        <Footnote icon={<Lock className="size-3.5" fill="currentColor" />} className="mt-5">
          داده‌ها فقط در سرورهای داخل کشور نگهداری می‌شود
        </Footnote>
      </SunPanel>

      <Sheet open={consentOpen} onOpenChange={setConsentOpen} title="رضایت‌نامه اشتراک داده" description="نسخه ۱,۲ — آبان ۱۴۰۵">
        <div className="space-y-3 text-sm leading-7 text-foreground/85">
          <p>با تأیید این رضایت‌نامه، به اکوسولار اجازه می‌دهید اطلاعات قبض برق، شناسه قبض و مشخصات انشعاب شما را از شرکت توزیع دریافت و برای تحلیل مصرف و طراحی نیروگاه استفاده کند.</p>
          <p>داده‌ها فقط در سرورهای داخل کشور نگهداری می‌شوند و بدون اجازه شما با هیچ شخص ثالثی به اشتراک گذاشته نمی‌شوند.</p>
          <p>هر زمان بخواهید می‌توانید این رضایت را از بخش پروفایل لغو کنید.</p>
        </div>
        <InkButton
          className="mt-5 w-full flex-none"
          onClick={() => {
            setAgree(true);
            setConsentOpen(false);
          }}
        >
          خواندم و موافقم
        </InkButton>
      </Sheet>
    </Screen>
  );
}
