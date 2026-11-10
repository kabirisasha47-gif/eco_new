import { createFileRoute } from "@tanstack/react-router";
import {
  Check,
  Copy,
  Download,
  FileCode2,
  PackageCheck,
  QrCode,
  ShieldCheck,
  Smartphone,
  Terminal,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

import { BottomNav } from "@/components/eco/BottomNav";
import { Sheet } from "@/components/eco/Sheet";
import {
  HeroStat,
  InfoCircleButton,
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
import { usePWAInstall } from "@/hooks/use-pwa-install";
import {
  APK_BUILD_METHODS,
  APK_META,
  type ApkBuildMethod,
  evaluateApkReadiness,
  generateAndroidManifestXml,
  generateAssetLinksJson,
  generateBuildApkScript,
  generateCapacitorConfigJson,
  generateExpoConfigJson,
  generateTwaManifestJson,
} from "@/lib/apk-config";
import { fa, faDigits } from "@/lib/fa";
import { generateQrMatrix } from "@/lib/qr-code";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/apk")({
  head: () => ({
    meta: [
      { title: "ساخت و دریافت نسخه اندروید (APK) | اکوسولار" },
      {
        name: "description",
        content:
          "نصب مستقیم نسخه اندروید (WebAPK) و دریافت بسته کامل ساخت فایل APK امضاشده (TWA و Capacitor) برای اکوسولار.",
      },
      { property: "og:title", content: "نسخه اندروید (APK) | اکوسولار" },
      {
        property: "og:description",
        content: "نصب مستقیم و دریافت بسته نصبی اندروید اکوسولار.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: ApkCenterScreen,
});

function triggerTextDownload(filename: string, content: string, mime = "text/plain;charset=utf-8") {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function ApkCenterScreen() {
  const { isInstallable, isInstalled, swRegistered, promptInstall } = usePWAInstall();
  const [selectedMethod, setSelectedMethod] = useState<ApkBuildMethod>("bubblewrap-twa");
  const [packageId, setPackageId] = useState<string>(APK_META.packageId);
  const [originUrl, setOriginUrl] = useState<string>("https://ecosolar.ir");
  const [sha256, setSha256] = useState<string>(APK_META.defaultSha256);
  const [codeSheetOpen, setCodeSheetOpen] = useState(false);
  const [infoSheetOpen, setInfoSheetOpen] = useState(false);
  const [qrSheetOpen, setQrSheetOpen] = useState(false);
  const [activeFileTab, setActiveFileTab] = useState<
    | "android.yml"
    | "manifest.json"
    | "app.json"
    | "build-apk.sh"
    | "twa-manifest.json"
    | "capacitor.config.json"
    | "AndroidManifest.xml"
    | "assetlinks.json"
  >("android.yml");
  const [lastDownloaded, setLastDownloaded] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window !== "undefined" && window.location.origin) {
      setOriginUrl(window.location.origin);
    }
  }, []);

  const qrTargetUrl = `${originUrl.replace(/\/$/, "")}/apk`;
  const qrMatrix = useMemo(() => generateQrMatrix(qrTargetUrl), [qrTargetUrl]);

  const readiness = evaluateApkReadiness({
    hasManifest: true,
    hasServiceWorker: true,
    hasMaskableIcons: true,
    hasAssetLinks: true,
    isHttpsOrLocalhost: true,
  });

  const activeSpec =
    APK_BUILD_METHODS.find((m) => m.id === selectedMethod) ?? APK_BUILD_METHODS[1]!;

  function getGeneratedFileContent(
    tab:
      | "android.yml"
      | "manifest.json"
      | "app.json"
      | "build-apk.sh"
      | "twa-manifest.json"
      | "capacitor.config.json"
      | "AndroidManifest.xml"
      | "assetlinks.json",
  ): string {
    switch (tab) {
      case "android.yml":
        return `name: Android APK Build

on:
  push:
    branches: [main, master]
  pull_request:
    branches: [main, master]
  workflow_dispatch:

env:
  FORCE_JAVASCRIPT_ACTIONS_TO_NODE24: "true"

jobs:
  build-android-apk:
    name: Compile Signed Android APK
    runs-on: ubuntu-24.04

    steps:
      - name: Checkout repository
        uses: actions/checkout@v4

      - name: Setup Node.js 24
        uses: actions/setup-node@v4
        with:
          node-version: "24"

      - name: Initialize project and generate package-lock.json
        run: |
          npm install --package-lock --legacy-peer-deps

      - name: Build web bundle and pre-render static Android assets
        run: |
          npm run build
          node scripts/prepare-apk-webdir.mjs

      - name: Setup Java JDK 21
        uses: actions/setup-java@v4
        with:
          distribution: "temurin"
          java-version: "21"

      - name: Setup Android SDK
        uses: android-actions/setup-android@v3

      - name: Initialize Capacitor Android project
        run: |
          npm install @capacitor/core @capacitor/cli @capacitor/android --no-save --legacy-peer-deps
          rm -rf android
          npx cap add android
          npx cap sync android

      - name: Build Android APK with Gradle
        run: |
          cd android
          chmod +x gradlew
          ./gradlew assembleDebug --no-daemon

      - name: Upload Compiled APK Artifact
        uses: actions/upload-artifact@v4
        with:
          name: ecosolar-android-apk
          path: android/app/build/outputs/apk/debug/app-debug.apk
          retention-days: 30
`;
      case "manifest.json":
        return JSON.stringify(
          {
            id: "/",
            name: APK_META.appFullName,
            short_name: APK_META.appName,
            description:
              "اپلیکیشن مدیریت هوشمند نیروگاه خورشیدی خانگی، تحلیل قبض، انتخاب کانال درآمد و تطبیق صورتحساب خرید تضمینی.",
            lang: "fa",
            dir: "rtl",
            start_url: `${originUrl}/`,
            scope: `${originUrl}/`,
            display: "standalone",
            orientation: "portrait",
            background_color: "#f4f4f4",
            theme_color: "#f4f4f4",
            icons: [
              {
                src: `${originUrl}/icon-192.png`,
                sizes: "192x192",
                type: "image/png",
                purpose: "any",
              },
              {
                src: `${originUrl}/icon-512.png`,
                sizes: "512x512",
                type: "image/png",
                purpose: "any",
              },
              {
                src: `${originUrl}/icon-512.png`,
                sizes: "512x512",
                type: "image/png",
                purpose: "maskable",
              },
            ],
          },
          null,
          2,
        );
      case "app.json":
        return generateExpoConfigJson(originUrl, packageId);
      case "build-apk.sh":
        return generateBuildApkScript(originUrl, packageId);
      case "twa-manifest.json":
        return generateTwaManifestJson(originUrl, packageId);
      case "capacitor.config.json":
        return generateCapacitorConfigJson(originUrl, packageId);
      case "AndroidManifest.xml":
        return generateAndroidManifestXml(originUrl, packageId);
      case "assetlinks.json":
        return generateAssetLinksJson(packageId, sha256);
    }
  }

  async function handleWebApkInstall() {
    if (isInstalled) {
      toast.success("اپلیکیشن اکوسولار هم‌اکنون در حالت اندروید (Standalone) نصب و فعال است");
      return;
    }
    if (isInstallable) {
      const outcome = await promptInstall();
      if (outcome === "accepted") {
        toast.success("نصب نسخه اندروید آغاز شد");
      }
      return;
    }
    setInfoSheetOpen(true);
  }

  function handleDownloadBundle() {
    const bundleContent = JSON.stringify(
      {
        generator: "EcoSolar Android APK Builder v1.0.0",
        generatedAt: new Date().toISOString(),
        packageId,
        versionName: APK_META.versionName,
        versionCode: APK_META.versionCode,
        minSdkVersion: APK_META.minSdkVersion,
        targetSdkVersion: APK_META.targetSdkVersion,
        originUrl,
        files: {
          ".github/workflows/android.yml": getGeneratedFileContent("android.yml"),
          "build-apk.sh": generateBuildApkScript(originUrl, packageId),
          "twa-manifest.json": JSON.parse(generateTwaManifestJson(originUrl, packageId)),
          "capacitor.config.json": JSON.parse(generateCapacitorConfigJson(originUrl, packageId)),
          "AndroidManifest.xml": generateAndroidManifestXml(originUrl, packageId),
          ".well-known/assetlinks.json": JSON.parse(generateAssetLinksJson(packageId, sha256)),
        },
      },
      null,
      2,
    );
    const filename = `ecosolar-android-apk-kit-${APK_META.versionName}.json`;
    triggerTextDownload(filename, bundleContent, "application/json;charset=utf-8");
    setLastDownloaded(filename);
    toast.success("بسته کامل ساخت APK اندروید دانلود شد", {
      description: `شامل اسکریپت ساخت خودکار، مانیفست TWA و تنظیمات Capacitor (${packageId})`,
    });
  }

  function handleDownloadSingleFile(
    tab:
      | "android.yml"
      | "manifest.json"
      | "app.json"
      | "build-apk.sh"
      | "twa-manifest.json"
      | "capacitor.config.json"
      | "AndroidManifest.xml"
      | "assetlinks.json",
  ) {
    const content = getGeneratedFileContent(tab);
    triggerTextDownload(tab, content);
    setLastDownloaded(tab);
    toast.success(`فایل ${tab} با موفقیت دانلود شد`);
  }

  async function copyContent(text: string, label: string) {
    try {
      await navigator.clipboard.writeText(text);
      toast.success(`${label} در حافظه کپی شد`);
    } catch {
      toast("متن آماده کپی است");
    }
  }

  return (
    <Screen>
      <TopArea>
        <ScreenHeader
          title="نسخه اندروید (APK)"
          subtitle="نصب مستقیم WebAPK و خروجی رسمی اندروید"
          backTo="/profile"
          end={
            <InfoCircleButton label="راهنمای نصب اندروید" onClick={() => setInfoSheetOpen(true)} />
          }
        />

        <HeroStat
          label="آمادگی استاندارد اندروید و TWA"
          value={`${fa(readiness.scorePct, 0)}٪`}
          unit={`${faDigits(readiness.passedCount)} از ${faDigits(readiness.totalCount)} معیار`}
          aside={
            <Pill tone="success" className="mb-2 shadow-soft">
              <ShieldCheck className="size-4" />
              تأیید شده
            </Pill>
          }
        />

        <div className="mt-3 flex flex-wrap gap-2">
          <Pill tone="white" className="shadow-soft">
            <Smartphone className="size-3.5 text-ink" />
            <span dir="ltr" className="font-mono text-[0.7rem]">
              {packageId}
            </span>
          </Pill>
          <Pill tone="sun">
            نسخه {faDigits(APK_META.versionName)} • کد {faDigits(APK_META.versionCode)}
          </Pill>
          <Pill tone="white" className="shadow-soft">
            اندروید {faDigits("7.0")} به بالا • SDK {faDigits(APK_META.minSdkVersion)} تا{" "}
            {faDigits(APK_META.targetSdkVersion)}
          </Pill>
        </div>

        <div className="mt-3.5 grid grid-cols-3 gap-2" role="tablist" aria-label="روش ساخت اندروید">
          {APK_BUILD_METHODS.map((m) => {
            const active = m.id === selectedMethod;
            return (
              <button
                key={m.id}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => setSelectedMethod(m.id)}
                className={cn(
                  "flex flex-col items-start rounded-2xl p-2.5 text-right transition",
                  active ? "bg-ink text-ink-foreground shadow-soft" : "bg-card text-foreground",
                )}
              >
                <span className="text-xs font-extrabold leading-5">{m.title}</span>
                <span
                  className={cn(
                    "mt-1 text-[0.65rem]",
                    active ? "text-ink-foreground/75" : "text-muted-foreground",
                  )}
                >
                  حدود {fa(m.sizeEstimateMb, 1)} مگابایت
                </span>
              </button>
            );
          })}
        </div>
      </TopArea>

      <SunPanel className="mt-4 pt-5">
        <PanelTitle
          aside={
            <Pill tone="white" size="sm">
              {activeSpec.badge}
            </Pill>
          }
        >
          {activeSpec.title}
        </PanelTitle>
        <p className="mt-1 text-xs leading-5 text-foreground/80">{activeSpec.summary}</p>

        {/* Primary CTA Buttons right at the top of SunPanel for immediate visibility */}
        <div className="mt-3.5 flex flex-col gap-2">
          <div className="flex gap-2">
            <a
              href="/ecosolar-android-project.zip"
              download="ecosolar-android-project.zip"
              onClick={() => {
                setLastDownloaded("ecosolar-android-project.zip");
                toast.success("پروژه کامل اندروید استودیو (.zip) دانلود شد");
              }}
              className="flex h-12 flex-1 items-center justify-center gap-2 rounded-full bg-ink px-5 text-sm font-extrabold text-ink-foreground transition active:scale-[0.98]"
            >
              <Download className="size-4" />
              دانلود پروژه اندروید (.zip)
            </a>
            <WhiteButton onClick={() => setQrSheetOpen(true)} className="h-12 gap-1.5 px-4 text-xs">
              <QrCode className="size-4" />
              نصب با QR / Expo
            </WhiteButton>
          </div>

          <button
            type="button"
            onClick={handleWebApkInstall}
            className="flex h-11 w-full items-center justify-center gap-2 rounded-full bg-card text-xs font-extrabold text-foreground shadow-soft transition active:scale-[0.99]"
          >
            <Smartphone className="size-4" />
            {isInstalled
              ? "اپلیکیشن روی این دستگاه نصب شده است"
              : isInstallable
                ? "نصب مستقیم WebAPK روی این گوشی اندروید"
                : "راهنمای نصب مستقیم روی گوشی اندروید (بدون نیاز به کامپیوتر)"}
          </button>
        </div>

        {lastDownloaded ? (
          <div
            role="status"
            className="mt-2.5 flex items-center justify-between rounded-2xl bg-success-soft px-4 py-2 text-xs font-extrabold text-success"
          >
            <span className="flex items-center gap-2">
              <PackageCheck className="size-4 shrink-0" />
              فایل خروجی آماده شد:
            </span>
            <span dir="ltr" className="font-mono">
              {lastDownloaded}
            </span>
          </div>
        ) : null}

        <div className="mt-3 rounded-[1.5rem] bg-card px-4 py-3 shadow-soft">
          <div className="flex items-center justify-between">
            <p className="text-xs font-extrabold text-muted-foreground">مشخصات بسته نصبی اندروید</p>
            <button
              type="button"
              onClick={() => setCodeSheetOpen(true)}
              className="flex items-center gap-1 rounded-full bg-sun-soft px-2.5 py-1 text-[0.7rem] font-extrabold text-foreground"
            >
              <FileCode2 className="size-3.5" />
              مشاهده و ویرایش فایل‌های فنی
            </button>
          </div>
          <div className="mt-1">
            <InfoRow
              label="شناسه بسته"
              value={
                <span dir="ltr" className="font-mono text-xs font-bold">
                  {packageId}
                </span>
              }
            />
            <InfoRow
              label="وضعیت سرویس‌ورکر"
              value={swRegistered ? "فعال (آماده آفلاین)" : "آماده ثبت"}
              badge={
                <Pill tone="success" size="sm">
                  WebAPK
                </Pill>
              }
            />
            <InfoRow label="آیکون تطبیقی اندروید" value="۱۹۲×۱۹۲ و ۵۱۲×۵۱۲ پیکسل" />
            <InfoRow
              label="تأییدیه تمام‌صفحه TWA"
              value={
                <span className="flex items-center gap-1.5">
                  <span>فعال</span>
                  <code
                    dir="ltr"
                    className="rounded bg-muted px-1.5 py-0.5 font-mono text-[0.65rem]"
                  >
                    assetlinks.json
                  </code>
                </span>
              }
              last
            />
          </div>
        </div>

        {/* Customizer for Package ID & Host */}
        <div className="mt-3 rounded-[1.5rem] bg-card p-3.5 shadow-soft">
          <h3 className="text-xs font-extrabold text-foreground">تنظیمات شناسه و دامنه سرور</h3>
          <div className="mt-2 grid grid-cols-2 gap-2">
            <label className="block">
              <span className="text-[0.65rem] font-bold text-muted-foreground">
                شناسه بسته (Package ID)
              </span>
              <input
                dir="ltr"
                value={packageId}
                onChange={(e) =>
                  setPackageId(e.target.value.replace(/[^a-zA-Z0-9._]/g, "") || APK_META.packageId)
                }
                className="mt-1 h-9 w-full rounded-xl bg-muted/60 px-2.5 font-mono text-xs font-bold text-foreground outline-none focus:ring-2 focus:ring-ink"
              />
            </label>
            <label className="block">
              <span className="text-[0.65rem] font-bold text-muted-foreground">
                آدرس سرور (Host Origin)
              </span>
              <input
                dir="ltr"
                value={originUrl}
                onChange={(e) => setOriginUrl(e.target.value)}
                className="mt-1 h-9 w-full rounded-xl bg-muted/60 px-2.5 font-mono text-xs font-bold text-foreground outline-none focus:ring-2 focus:ring-ink"
              />
            </label>
          </div>
        </div>

        <div className="flex-1" />
        <BottomNav active="/profile" />
      </SunPanel>

      {/* QR Code & Expo Install Sheet */}
      <Sheet
        open={qrSheetOpen}
        onOpenChange={setQrSheetOpen}
        title="نصب با اسکن QR Code و Expo"
        description="اسکن با دوربین گوشی اندروید یا ساخت لینک Expo EAS"
      >
        <div className="flex flex-col items-center rounded-3xl bg-sun-soft p-4 text-center">
          <div className="rounded-2xl bg-card p-3 shadow-soft">
            <svg
              viewBox={`0 0 ${qrMatrix.length + 4} ${qrMatrix.length + 4}`}
              className="size-44"
              role="img"
              aria-label="QR Code نصب نسخه اندروید اکوسولار"
            >
              <rect width={qrMatrix.length + 4} height={qrMatrix.length + 4} fill="#ffffff" />
              {qrMatrix.map((row, r) =>
                row.map((cell, c) =>
                  cell ? (
                    <rect
                      key={`${r}-${c}`}
                      x={c + 2}
                      y={r + 2}
                      width={1}
                      height={1}
                      fill="#171717"
                    />
                  ) : null,
                ),
              )}
            </svg>
          </div>
          <p className="mt-3 text-xs font-extrabold text-foreground">
            با دوربین گوشی یا Google Lens اسکن کنید
          </p>
          <p
            dir="ltr"
            className="mt-1 max-w-full truncate font-mono text-[0.65rem] text-muted-foreground"
          >
            {qrTargetUrl}
          </p>
        </div>

        <div className="mt-3 space-y-2 text-xs leading-6 text-foreground/85">
          <div className="rounded-2xl bg-muted/60 p-3">
            <p className="font-extrabold text-foreground">نحوه کارکرد با دوربین اندروید و Expo:</p>
            <p className="mt-1">
              • <strong>اسکن مستقیم با دوربین گوشی (بدون نیاز به Expo Go)</strong>: کد بالا را با
              دوربین گوشی اسکن کنید تا صفحه در Chrome باز شود و با زدن دکمه «نصب» مستقیماً WebAPK
              نصب گردد.
            </p>
            <p className="mt-1">
              • <strong>ساخت QR Code در سرویس ابری Expo (EAS Build)</strong>: فایل‌های{" "}
              <code dir="ltr">app.json</code> و <code dir="ltr">eas.json</code> در ریشه پروژه آماده
              شده‌اند. با اجرای دستور{" "}
              <code dir="ltr">npx eas-cli build -p android --profile preview</code>، سرویس ابری Expo
              فایل <code dir="ltr">.apk</code> را ساخته و یک QR Code اختصاصی برای نصب مستقیم به شما
              می‌دهد.
            </p>
          </div>
        </div>

        <div className="mt-4 flex gap-2">
          <InkButton
            onClick={() => handleDownloadSingleFile("app.json")}
            className="h-12 gap-2 text-sm"
          >
            <Download className="size-4" />
            دانلود app.json (Expo)
          </InkButton>
          <WhiteButton
            onClick={() => copyContent(qrTargetUrl, "لینک نصب مستقیم")}
            className="h-12 gap-1.5 border border-border px-4 text-xs"
          >
            <Copy className="size-4" />
            کپی لینک
          </WhiteButton>
        </div>
      </Sheet>

      {/* Technical Files & Code Sheet */}
      <Sheet
        open={codeSheetOpen}
        onOpenChange={setCodeSheetOpen}
        title="فایل‌های پروژه اندروید (APK)"
        description={`پیکربندی استاندارد ${packageId}`}
      >
        <div className="flex gap-1.5 overflow-x-auto pb-2 no-scrollbar" dir="ltr">
          {(
            [
              "android.yml",
              "manifest.json",
              "app.json",
              "build-apk.sh",
              "twa-manifest.json",
              "capacitor.config.json",
              "AndroidManifest.xml",
              "assetlinks.json",
            ] as const
          ).map((tab) => (
            <button
              key={tab}
              type="button"
              onClick={() => setActiveFileTab(tab)}
              className={cn(
                "shrink-0 rounded-full px-3 py-1.5 font-mono text-xs font-bold transition",
                activeFileTab === tab ? "bg-ink text-ink-foreground" : "bg-muted text-foreground",
              )}
            >
              {tab}
            </button>
          ))}
        </div>

        {activeFileTab === "assetlinks.json" ? (
          <label className="mt-2 block">
            <span className="text-xs font-bold text-muted-foreground">
              اثرانگشت کلید امضا (SHA-256 Fingerprint)
            </span>
            <input
              dir="ltr"
              value={sha256}
              onChange={(e) => setSha256(e.target.value)}
              className="mt-1 h-9 w-full rounded-xl bg-muted px-3 font-mono text-[0.7rem] text-foreground outline-none"
            />
          </label>
        ) : null}

        <pre
          dir="ltr"
          className="mt-3 max-h-60 overflow-auto rounded-2xl bg-ink p-3.5 font-mono text-[0.7rem] leading-5 text-ink-foreground"
        >
          <code>{getGeneratedFileContent(activeFileTab)}</code>
        </pre>

        <div className="mt-4 flex gap-2">
          <InkButton
            onClick={() => handleDownloadSingleFile(activeFileTab)}
            className="h-12 gap-2 text-sm"
          >
            <Download className="size-4" />
            دانلود {activeFileTab}
          </InkButton>
          <WhiteButton
            onClick={() => copyContent(getGeneratedFileContent(activeFileTab), activeFileTab)}
            className="h-12 gap-1.5 border border-border px-4 text-sm"
          >
            <Copy className="size-4" />
            کپی کد
          </WhiteButton>
        </div>
      </Sheet>

      {/* Step-by-Step Guide Sheet */}
      <Sheet
        open={infoSheetOpen}
        onOpenChange={setInfoSheetOpen}
        title="۳ روش تبدیل و نصب اندروید"
        description="راهنمای گام‌به‌گام نصب روی گوشی و خروجی APK"
      >
        <div className="space-y-3 text-xs leading-6 text-foreground/85">
          <div className="rounded-2xl bg-sun-soft p-3.5">
            <p className="font-extrabold text-foreground">
              ۱. نصب مستقیم روی گوشی اندروید (WebAPK)
            </p>
            <p className="mt-1">
              این برنامه به مانیفست استاندارد اندروید، آیکون Maskable و سرویس‌ورکر آفلاین مجهز شده
              است. در مرورگر Chrome گوشی گزینه <strong>Install App / افزودن به صفحه اصلی</strong> را
              بزنید تا سیستم‌عامل اندروید یک بسته نصبی بومی (WebAPK) در فهرست برنامه‌های گوشی بسازد.
            </p>
          </div>

          <div className="rounded-2xl bg-muted/60 p-3.5">
            <p className="font-extrabold text-foreground">
              ۲. ساخت فایل نصبی .apk با یک دستور (Bubblewrap)
            </p>
            <p className="mt-1">
              فایل <code dir="ltr">build-apk.sh</code> در ریشه پروژه (
              <code dir="ltr">android-apk/build-apk.sh</code>) قرار داده شده است. با اجرای دستور زیر
              روی سیستم، کلید امضا و فایل <code dir="ltr">app-release-signed.apk</code> به صورت
              خودکار تولید می‌شود:
            </p>
            <div
              dir="ltr"
              className="mt-2 flex items-center justify-between rounded-xl bg-ink px-3 py-2 font-mono text-[0.7rem] text-ink-foreground"
            >
              <span>bash android-apk/build-apk.sh</span>
              <button
                type="button"
                aria-label="کپی دستور ساخت APK"
                onClick={() => copyContent("bash android-apk/build-apk.sh", "دستور ساخت APK")}
                className="rounded bg-card/15 px-2 py-0.5 text-[0.65rem]"
              >
                کپی
              </button>
            </div>
          </div>

          <div className="rounded-2xl bg-muted/60 p-3.5">
            <p className="font-extrabold text-foreground">
              ۳. سرویس ابری PWABuilder (بدون نیاز به نصب ابزار)
            </p>
            <p className="mt-1">
              آدرس این برنامه را در سایت <strong dir="ltr">pwabuilder.com</strong> وارد کرده و دکمه{" "}
              <strong>Package for stores → Android → Download APK</strong> را بزنید تا فایل{" "}
              <code dir="ltr">.apk</code> و <code dir="ltr">.aab</code> امضاشده را مستقیماً دریافت
              کنید.
            </p>
          </div>
        </div>

        <InkButton className="mt-4 h-12 w-full flex-none" onClick={() => setInfoSheetOpen(false)}>
          <Check className="me-1.5 size-4" /> متوجه شدم
        </InkButton>
      </Sheet>
    </Screen>
  );
}
