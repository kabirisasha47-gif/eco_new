import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { Camera, Check, CircleCheck, Info, Loader2, Pencil, Sparkles, TriangleAlert } from "lucide-react";
import { useRef, useState } from "react";
import { toast } from "sonner";

import { Sheet } from "@/components/eco/Sheet";
import { Footnote, IconCircle, InkButton, Pill, Screen, ScreenHeader, SunPanel, TopArea, WhiteButton } from "@/components/eco/ui";
import { extractBill } from "@/lib/bill-ai.functions";
import { fieldLabel, mergeIssues, overallConfidence, type BillField, type BillIssue } from "@/lib/bill-checks";
import { useEco, type BillData } from "@/lib/eco-store";
import { fa, faDigits } from "@/lib/fa";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/bill")({
  head: () => ({
    meta: [
      { title: "تأیید اطلاعات قبض | اکوسولار" },
      { name: "description", content: "بارگذاری عکس قبض برق، استخراج خودکار مصرف با هوش مصنوعی و بررسی ناسازگاری‌ها." },
      { property: "og:title", content: "تأیید اطلاعات قبض | اکوسولار" },
      { property: "og:description", content: "بارگذاری عکس قبض برق و استخراج خودکار مصرف با هوش مصنوعی." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: BillScreen,
});

type FieldKey = keyof BillData;

const FIELDS: { key: FieldKey; ai: BillField; label: string; unit?: string; numeric: boolean }[] = [
  { key: "id", ai: "billId", label: "شناسه قبض", numeric: false },
  { key: "period", ai: "period", label: "دوره صورتحساب", numeric: false },
  { key: "peak", ai: "peakKwh", label: "مصرف اوج", unit: "kWh", numeric: true },
  { key: "mid", ai: "midKwh", label: "مصرف میان‌باری", unit: "kWh", numeric: true },
  { key: "low", ai: "lowKwh", label: "مصرف کم‌باری", unit: "kWh", numeric: true },
  { key: "total", ai: "amountRial", label: "مبلغ کل قبض", unit: "ریال", numeric: true },
];

const AI_TO_KEY: Partial<Record<BillField, FieldKey>> = Object.fromEntries(FIELDS.map((f) => [f.ai, f.key]));

const toLatin = (s: string) => s.replace(/[۰-۹]/g, (d) => String("۰۱۲۳۴۵۶۷۸۹".indexOf(d)));

function display(key: FieldKey, v: string | number) {
  if (key === "id") return faDigits(v);
  if (typeof v === "number") return fa(v, 0, false);
  return v;
}

/** Downscale a photo in the browser so uploads stay small and fast. */
async function photoToDataUrl(file: File, maxSide = 1600): Promise<string> {
  const url = URL.createObjectURL(file);
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const el = new Image();
      el.onload = () => resolve(el);
      el.onerror = () => reject(new Error("bad image"));
      el.src = url;
    });
    const scale = Math.min(1, maxSide / Math.max(img.naturalWidth, img.naturalHeight));
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(img.naturalWidth * scale);
    canvas.height = Math.round(img.naturalHeight * scale);
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("no canvas");
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    return canvas.toDataURL("image/jpeg", 0.85);
  } finally {
    URL.revokeObjectURL(url);
  }
}

function BillScreen() {
  const { state, update } = useEco();
  const navigate = useNavigate();
  const runExtract = useServerFn(extractBill);
  const [draft, setDraft] = useState<BillData>(state.bill);
  const [editing, setEditing] = useState<FieldKey | null>(null);
  const [manual, setManual] = useState(false);
  // Fields that still need the user's review (low confidence or inconsistent).
  const [needsReview, setNeedsReview] = useState<Set<FieldKey>>(
    () => new Set(state.lowConfidenceReviewed ? [] : (["low"] as FieldKey[])),
  );
  const [issueFields, setIssueFields] = useState<Set<FieldKey>>(new Set());
  const [issues, setIssues] = useState<BillIssue[] | null>(null);
  const [confidence, setConfidence] = useState(92);
  const [scanning, setScanning] = useState(false);
  const [photo, setPhoto] = useState<string | null>(null);
  const [source, setSource] = useState<"prefilled" | "ai_upload">("prefilled");
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [infoOpen, setInfoOpen] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const dirty = JSON.stringify(draft) !== JSON.stringify(state.bill);

  function reviewed(key: FieldKey) {
    setNeedsReview((s) => {
      if (!s.has(key)) return s;
      const n = new Set(s);
      n.delete(key);
      return n;
    });
  }

  async function onPhoto(file: File | undefined) {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast.error("فقط عکس (JPG، PNG یا WEBP) قابل بارگذاری است");
      return;
    }
    setScanning(true);
    try {
      const dataUrl = await photoToDataUrl(file);
      setPhoto(dataUrl);
      const res = await runExtract({ data: { imageDataUrl: dataUrl } });
      if (!res.ok) {
        toast.error("خواندن قبض ناموفق بود", { description: res.message });
        return;
      }
      const b = res.bill;
      const merged = mergeIssues(b);
      setIssues(merged);

      if (!b.isElectricityBill) {
        toast.error("این تصویر قبض برق نیست");
        return;
      }

      setDraft({
        id: b.billId?.replace(/\D/g, "") ?? "",
        period: b.period ?? "",
        peak: Math.round(b.peakKwh ?? 0),
        mid: Math.round(b.midKwh ?? 0),
        low: Math.round(b.lowKwh ?? 0),
        total: Math.round(b.amountRial ?? 0),
      });
      const flagged = new Set<FieldKey>();
      const withIssue = new Set<FieldKey>();
      for (const f of FIELDS) {
        if (b.confidence[f.ai] === "low" || b[f.ai] === null) flagged.add(f.key);
      }
      for (const i of merged) {
        const k = i.field === "general" ? undefined : AI_TO_KEY[i.field];
        // totalKwh is not a visible row; map it to the tier rows it depends on.
        const keys: FieldKey[] = k ? [k] : i.field === "totalKwh" ? ["peak", "mid", "low"] : [];
        keys.forEach((kk) => {
          flagged.add(kk);
          withIssue.add(kk);
        });
      }
      setNeedsReview(flagged);
      setIssueFields(withIssue);
      setConfidence(overallConfidence(b.confidence));
      setSource("ai_upload");
      setManual(false);
      setEditing(null);
      toast.success("قبض با هوش مصنوعی خوانده شد", {
        description: merged.length ? `${fa(merged.length)} مورد نیاز به بررسی دارد` : "ناسازگاری‌ای پیدا نشد",
      });
    } catch {
      toast.error("خواندن قبض ناموفق بود", { description: "اتصال را بررسی کنید و دوباره تلاش کنید." });
    } finally {
      setScanning(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  function setField(key: FieldKey, raw: string, numeric: boolean) {
    reviewed(key);
    setDraft((d) => ({
      ...d,
      [key]: numeric ? Number(toLatin(raw).replace(/\D/g, "") || 0) : key === "id" ? toLatin(raw).replace(/\D/g, "") : raw,
    }));
  }

  function save() {
    update((s) => ({
      bill: draft,
      billRevision: dirty ? s.billRevision + 1 : s.billRevision,
      lowConfidenceReviewed: true,
    }));
    window.__lovableEvents?.track?.("project.bill_confirmed", {
      source,
      edited: dirty,
      issue_count: issues?.length ?? 0,
    });
    toast.success(dirty ? `تغییرات با شماره بازبینی ${faDigits(state.billRevision + 1)} ذخیره شد` : "اطلاعات قبض تأیید شد");
    navigate({ to: "/optimize" });
  }

  function confirmAndContinue() {
    if (needsReview.size > 0) {
      setConfirmOpen(true);
      return;
    }
    save();
  }

  const pending = FIELDS.filter((f) => needsReview.has(f.key));

  return (
    <Screen>
      <TopArea>
        <ScreenHeader
          title="تأیید اطلاعات قبض"
          backTo="/dashboard"
          end={
            <IconCircle aria-label="راهنما" onClick={() => setInfoOpen(true)}>
              <Info className="size-5" />
            </IconCircle>
          }
        />

        <p className="mt-6 text-xs text-muted-foreground">مرحله ۲ از ۳ | قبض برق</p>
        <div className="mt-2 grid grid-cols-4 gap-2">
          {[0, 1, 2, 3].map((i) => (
            <span key={i} className={cn("h-1.5 rounded-full", i < 2 ? "bg-ink" : "bg-track")} />
          ))}
        </div>

        <div className="relative mt-5 h-48 overflow-hidden rounded-[1.75rem] bg-card shadow-soft">
          <button
            type="button"
            aria-label="بارگذاری عکس قبض"
            disabled={scanning}
            onClick={() => fileRef.current?.click()}
            className="absolute left-1/2 top-1/2 h-36 w-40 -translate-x-1/2 -translate-y-1/2"
          >
            {photo ? (
              <img src={photo} alt="عکس قبض" className="size-full rounded-lg object-cover" />
            ) : (
              <div className="size-full space-y-2.5 rounded-lg bg-background p-4">
                {[85, 100, 60, 90, 55, 80, 70].map((w, i) => (
                  <div key={i} className="ms-auto h-2 rounded-full bg-track" style={{ width: `${w}%` }} />
                ))}
              </div>
            )}
            {[
              "right-0 top-0 border-r-2 border-t-2",
              "left-0 top-0 border-l-2 border-t-2",
              "right-0 bottom-0 border-r-2 border-b-2",
              "left-0 bottom-0 border-l-2 border-b-2",
            ].map((c) => (
              <span key={c} className={cn("absolute size-8 border-sun-deep", c)} />
            ))}
            <span className={cn("absolute -inset-x-5 top-1/2 h-0.5 bg-sun-deep", scanning && "animate-scan")} />
          </button>
          <Pill tone={scanning ? "sun" : "success"} size="sm" className="absolute right-4 top-4 h-7 px-3 text-xs">
            {scanning ? <Loader2 className="size-3.5 animate-spin" /> : <span className="size-1.5 rounded-full bg-success" />}
            {scanning ? "هوش مصنوعی در حال خواندن قبض..." : `اطمینان استخراج ${fa(confidence)}٪`}
          </Pill>
          <button
            type="button"
            disabled={scanning}
            onClick={() => fileRef.current?.click()}
            className="absolute bottom-4 left-4 flex h-9 items-center gap-1.5 rounded-full bg-background px-3 text-xs font-extrabold disabled:opacity-50"
          >
            <Camera className="size-4" /> {photo ? "عکس مجدد" : "بارگذاری عکس قبض"}
          </button>
          <input
            ref={fileRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            capture="environment"
            className="hidden"
            onChange={(e) => void onPhoto(e.target.files?.[0])}
          />
        </div>
      </TopArea>

      <SunPanel>
        <h2 className="text-xl font-extrabold">داده‌های استخراج‌شده</h2>
        <p className="mt-1 text-xs text-foreground/75">هر مقدار را بررسی کنید؛ مبنای تحلیل همین داده‌هاست</p>

        <div className="mt-4 rounded-[1.75rem] bg-card px-3 py-1">
          {FIELDS.map((f, idx) => {
            const isEditing = manual || editing === f.key;
            const flagged = needsReview.has(f.key);
            const value = draft[f.key];
            return (
              <div
                key={f.key}
                className={cn(
                  "flex items-center gap-3 px-2 py-3",
                  idx < FIELDS.length - 1 && !flagged && "border-b border-border",
                  flagged && "my-1 rounded-2xl bg-warn-soft",
                )}
              >
                <span className="flex flex-1 items-center gap-2 text-xs text-muted-foreground">
                  {f.label}
                  {flagged ? (
                    <Pill tone="white" size="sm" className="text-warn">
                      {issueFields.has(f.key) ? "ناسازگار" : "اطمینان پایین"}
                    </Pill>
                  ) : null}
                </span>
                {isEditing ? (
                  <input
                    autoFocus={editing === f.key}
                    aria-label={f.label}
                    inputMode={f.numeric || f.key === "id" ? "numeric" : "text"}
                    value={typeof value === "number" ? faDigits(value) : f.key === "id" ? faDigits(value) : value}
                    onChange={(e) => setField(f.key, e.target.value, f.numeric)}
                    onKeyDown={(e) => e.key === "Enter" && setEditing(null)}
                    className="w-36 rounded-xl bg-background px-3 py-1.5 text-left text-sm font-extrabold outline-none focus:ring-2 focus:ring-sun-deep"
                    dir={f.numeric || f.key === "id" ? "ltr" : "rtl"}
                  />
                ) : (
                  <span className="num text-sm font-extrabold" dir={f.unit === "kWh" ? "ltr" : "rtl"}>
                    {value === "" ? "—" : f.unit ? `${display(f.key, value)} ${f.unit}` : display(f.key, value)}
                  </span>
                )}
                <button
                  type="button"
                  aria-label={editing === f.key ? `تأیید ${f.label}` : `ویرایش ${f.label}`}
                  onClick={() => {
                    reviewed(f.key);
                    setEditing(editing === f.key ? null : f.key);
                  }}
                  className={cn(
                    "grid size-8 shrink-0 place-items-center rounded-full",
                    flagged ? "bg-warn text-ink-foreground" : "bg-background",
                  )}
                >
                  {editing === f.key ? <Check className="size-4" /> : <Pencil className="size-3.5" fill="currentColor" />}
                </button>
              </div>
            );
          })}
        </div>

        {issues !== null ? (
          issues.length > 0 ? (
            <div className="mt-3 rounded-[1.75rem] bg-card p-4">
              <p className="flex items-center gap-2 text-sm font-extrabold">
                <TriangleAlert className="size-4 text-warn" /> ناسازگاری‌های شناسایی‌شده ({fa(issues.length)})
              </p>
              <ul className="mt-2 space-y-2">
                {issues.map((i, n) => (
                  <li key={n} className="flex gap-2 text-xs leading-6 text-foreground/85">
                    <span className="mt-1 shrink-0">
                      {i.source === "ai" ? <Sparkles className="size-3.5 text-sun-deep" /> : <span className="block size-2 translate-y-1 rounded-full bg-warn" />}
                    </span>
                    <span>
                      <b>{fieldLabel(i.field)}:</b> {faDigits(i.message)}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          ) : (
            <div className="mt-3 flex items-center gap-2 rounded-full bg-card px-4 py-3 text-xs font-bold text-success">
              <CircleCheck className="size-4" /> هوش مصنوعی ناسازگاری‌ای در قبض پیدا نکرد
            </div>
          )
        ) : null}

        <div className="mt-5 flex gap-3">
          <InkButton onClick={confirmAndContinue} disabled={scanning}>تأیید و ادامه</InkButton>
          <WhiteButton
            onClick={() => {
              setManual((m) => !m);
              setNeedsReview(new Set());
            }}
            className={cn(manual && "ring-2 ring-ink")}
          >
            {manual ? "پایان اصلاح" : "اصلاح دستی"}
          </WhiteButton>
        </div>
        <Footnote>
          هر اصلاح با شماره بازبینی ذخیره می‌شود و نسخه قبلی حفظ می‌ماند
          {state.billRevision > 1 ? ` (بازبینی فعلی: ${faDigits(state.billRevision)})` : ""}
        </Footnote>
      </SunPanel>

      <Sheet
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title="این موارد را بررسی کنید"
        description="مقادیر زیر اطمینان پایین دارند یا با بقیه قبض همخوانی ندارند. آیا با قبض شما مطابقت دارند؟"
      >
        <ul className="mb-4 space-y-2">
          {pending.map((f) => (
            <li key={f.key} className="flex justify-between rounded-2xl bg-card px-4 py-3 text-sm shadow-soft">
              <span className="text-muted-foreground">{f.label}</span>
              <span className="num font-extrabold" dir={f.unit === "kWh" ? "ltr" : "rtl"}>
                {draft[f.key] === "" ? "—" : f.unit ? `${display(f.key, draft[f.key])} ${f.unit}` : display(f.key, draft[f.key])}
              </span>
            </li>
          ))}
        </ul>
        <div className="flex gap-3">
          <InkButton
            onClick={() => {
              setNeedsReview(new Set());
              setConfirmOpen(false);
              save();
            }}
          >
            بله، درست است
          </InkButton>
          <WhiteButton
            className="bg-sun"
            onClick={() => {
              setConfirmOpen(false);
              const first = pending[0];
              if (first) {
                reviewed(first.key);
                setEditing(first.key);
              }
            }}
          >
            اصلاح مقدار
          </WhiteButton>
        </div>
      </Sheet>

      <Sheet open={infoOpen} onOpenChange={setInfoOpen} title="راهنمای تأیید قبض">
        <ul className="space-y-3 text-sm leading-7 text-foreground/85">
          <li>• روی کادر قبض یا «عکس مجدد» بزنید و از قبض برق خود عکس بگیرید یا عکس آن را انتخاب کنید.</li>
          <li>• هوش مصنوعی شناسه، دوره، مصرف اوج، میان‌باری، کم‌باری و مبلغ را استخراج می‌کند.</li>
          <li>• ردیف نارنجی یعنی اطمینان پایین است یا با بقیه قبض همخوانی ندارد؛ آن را با قبض مقایسه کنید.</li>
          <li>• برای اصلاح هر مقدار روی آیکن مداد بزنید یا «اصلاح دستی» را انتخاب کنید.</li>
        </ul>
      </Sheet>
    </Screen>
  );
}
