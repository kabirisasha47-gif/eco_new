/**
 * Android APK & TWA (Trusted Web Activity / Capacitor) configuration rules and generators.
 * Pure functions decoupled from UI for deterministic testing.
 */

export const APK_META = {
  packageId: "ir.ecosolar.app",
  appName: "اکوسولار",
  appFullName: "اکوسولار — مدیریت هوشمند انرژی خورشیدی",
  versionName: "1.0.0",
  versionCode: 1,
  minSdkVersion: 24,
  targetSdkVersion: 35,
  compileSdkVersion: 35,
  themeColor: "#F4F4F4",
  backgroundColor: "#F4F4F4",
  splashColor: "#F5C800",
  keystoreAlias: "ecosolar-key",
  defaultSha256:
    "FA:C6:17:45:DC:09:03:78:6F:B9:ED:E6:2A:96:2B:39:9F:73:48:F0:BB:6F:89:9B:83:32:66:75:91:03:3B:9C",
} as const;

export type ApkBuildMethod = "webapk" | "bubblewrap-twa" | "capacitor-native";

export interface ApkMethodSpec {
  id: ApkBuildMethod;
  title: string;
  badge: string;
  sizeEstimateMb: number;
  summary: string;
  requirements: string[];
}

export const APK_BUILD_METHODS: ApkMethodSpec[] = [
  {
    id: "webapk",
    title: "نصب مستقیم WebAPK",
    badge: "فوری • بدون نیاز به کامپیوتر",
    sizeEstimateMb: 1.8,
    summary:
      "نصب مستقیم روی گوشی اندروید از طریق موتور WebAPK مرورگر کروم با آیکون اختصاصی، اجرای تمام‌صفحه (Standalone) و کش آفلاین.",
    requirements: [
      "مرورگر Chrome یا Samsung Internet روی اندروید",
      "پشتیبانی خودکار از بروزرسانی آنی و کارکرد آفلاین",
    ],
  },
  {
    id: "bubblewrap-twa",
    title: "فایل نصبی رسمی TWA",
    badge: "استاندارد کافه‌بازار و مایکت",
    sizeEstimateMb: 3.4,
    summary:
      "تولید فایل نصبی امضاشده (Signed Release APK) با ابزار رسمی گوگل (Bubblewrap و PWABuilder) متصل به دامنه برنامه.",
    requirements: [
      "Node.js و ابزار @bubblewrap/cli یا سرویس PWABuilder",
      "فایل کلید امضا (android.keystore) و تأییدیه assetlinks.json",
    ],
  },
  {
    id: "capacitor-native",
    title: "پروژه بومی Capacitor",
    badge: "بسته کامل آفلاین",
    sizeEstimateMb: 12.5,
    summary:
      "بسته‌بندی کامل فایل‌های استاتیک برنامه درون پروژه بومی اندروید (Gradle) قابل کامپایل مستقیم در Android Studio.",
    requirements: [
      "Android Studio یا Android SDK Command-line Tools",
      "اجرای اسکریپت خودکار build-apk.sh برای خروجی app-release.apk",
    ],
  },
];

export interface ApkReadinessInput {
  hasManifest: boolean;
  hasServiceWorker: boolean;
  hasMaskableIcons: boolean;
  hasAssetLinks: boolean;
  isHttpsOrLocalhost: boolean;
}

export interface ApkReadinessResult {
  readyForWebApk: boolean;
  readyForSignedTwa: boolean;
  scorePct: number;
  passedCount: number;
  totalCount: number;
}

export function evaluateApkReadiness(input: ApkReadinessInput): ApkReadinessResult {
  const checks = [
    input.hasManifest,
    input.hasServiceWorker,
    input.hasMaskableIcons,
    input.hasAssetLinks,
    input.isHttpsOrLocalhost,
  ];
  const passedCount = checks.filter(Boolean).length;
  const totalCount = checks.length;
  const scorePct = Math.round((passedCount / totalCount) * 100);

  return {
    readyForWebApk:
      input.hasManifest &&
      input.hasServiceWorker &&
      input.hasMaskableIcons &&
      input.isHttpsOrLocalhost,
    readyForSignedTwa: checks.every(Boolean),
    scorePct,
    passedCount,
    totalCount,
  };
}

export function normalizeOriginHost(originOrUrl: string): { origin: string; host: string } {
  const trimmed = originOrUrl.trim() || "https://ecosolar.ir";
  try {
    const parsed = new URL(trimmed.startsWith("http") ? trimmed : `https://${trimmed}`);
    return {
      origin: parsed.origin,
      host: parsed.host,
    };
  } catch {
    return {
      origin: "https://ecosolar.ir",
      host: "ecosolar.ir",
    };
  }
}

export function generateTwaManifestJson(originUrl: string, packageId = APK_META.packageId): string {
  const { origin, host } = normalizeOriginHost(originUrl);
  const manifest = {
    packageId,
    host,
    name: APK_META.appName,
    launcherName: APK_META.appName,
    display: "standalone",
    orientation: "portrait",
    themeColor: APK_META.themeColor,
    navigationColor: "#1E1E1E",
    navigationColorDark: "#1E1E1E",
    navigationDividerColor: "#E5E5E5",
    navigationDividerColorDark: "#1E1E1E",
    backgroundColor: APK_META.backgroundColor,
    enableNotifications: true,
    startUrl: "/",
    iconUrl: `${origin}/icon-512.png`,
    maskableIconUrl: `${origin}/icon-512.png`,
    appVersion: APK_META.versionName,
    appVersionCode: APK_META.versionCode,
    signingKey: {
      path: "./android.keystore",
      alias: APK_META.keystoreAlias,
    },
    generatorApp: "bubblewrap-cli",
    webManifestUrl: `${origin}/manifest.webmanifest`,
    fallbackType: "customtabs",
    enableSiteSettingsShortcut: true,
    isChromeOSOnly: false,
  };
  return JSON.stringify(manifest, null, 2);
}

export function generateCapacitorConfigJson(
  originUrl?: string,
  packageId = APK_META.packageId,
): string {
  const config: Record<string, unknown> = {
    appId: packageId,
    appName: APK_META.appName,
    webDir: "dist/client",
    bundledWebRuntime: false,
    android: {
      buildOptions: {
        keystorePath: "android.keystore",
        keystoreAlias: APK_META.keystoreAlias,
        releaseType: "APK",
      },
      backgroundColor: APK_META.backgroundColor.toLowerCase(),
      allowMixedContent: false,
    },
    plugins: {
      SplashScreen: {
        launchShowDuration: 1200,
        backgroundColor: APK_META.splashColor.toLowerCase(),
        androidScaleType: "CENTER_CROP",
        showSpinner: false,
      },
    },
  };

  if (originUrl) {
    const { origin } = normalizeOriginHost(originUrl);
    config["server"] = {
      url: origin,
      cleartext: origin.startsWith("http://"),
    };
  }

  return JSON.stringify(config, null, 2);
}

export function generateAssetLinksJson(
  packageId = APK_META.packageId,
  sha256Fingerprint = APK_META.defaultSha256,
): string {
  const payload = [
    {
      relation: ["delegate_permission/common.handle_all_urls"],
      target: {
        namespace: "android_app",
        package_name: packageId,
        sha256_cert_fingerprints: [sha256Fingerprint.trim() || APK_META.defaultSha256],
      },
    },
  ];
  return JSON.stringify(payload, null, 2);
}

export function generateAndroidManifestXml(
  originUrl: string,
  packageId = APK_META.packageId,
): string {
  const { origin, host } = normalizeOriginHost(originUrl);
  return `<?xml version="1.0" encoding="utf-8"?>
<manifest xmlns:android="http://schemas.android.com/apk/res/android"
    package="${packageId}"
    android:versionCode="${APK_META.versionCode}"
    android:versionName="${APK_META.versionName}">

    <uses-permission android:name="android.permission.INTERNET" />
    <uses-permission android:name="android.permission.ACCESS_NETWORK_STATE" />
    <uses-permission android:name="android.permission.POST_NOTIFICATIONS" />

    <application
        android:allowBackup="true"
        android:icon="@mipmap/ic_launcher"
        android:roundIcon="@mipmap/ic_launcher_round"
        android:label="${APK_META.appName}"
        android:supportsRtl="true"
        android:theme="@style/Theme.EcoSolar.Standalone">

        <meta-data
            android:name="asset_statements"
            android:resource="@string/asset_statements" />

        <activity
            android:name="com.google.androidbrowserhelper.trusted.LauncherActivity"
            android:exported="true"
            android:screenOrientation="portrait"
            android:theme="@style/Theme.LauncherActivity">

            <meta-data
                android:name="android.support.customtabs.trusted.DEFAULT_URL"
                android:value="${origin}/" />

            <meta-data
                android:name="android.support.customtabs.trusted.STATUS_BAR_COLOR"
                android:resource="@color/colorPrimary" />

            <meta-data
                android:name="android.support.customtabs.trusted.SPLASH_IMAGE_DRAWABLE"
                android:resource="@drawable/splash" />

            <meta-data
                android:name="android.support.customtabs.trusted.SPLASH_SCREEN_BACKGROUND_COLOR"
                android:resource="@color/colorSplash" />

            <meta-data
                android:name="android.support.customtabs.trusted.SPLASH_SCREEN_FADE_OUT_DURATION"
                android:value="300" />

            <meta-data
                android:name="android.support.customtabs.trusted.FILE_PROVIDER_AUTHORITY"
                android:value="${packageId}.fileprovider" />

            <intent-filter>
                <action android:name="android.intent.action.MAIN" />
                <category android:name="android.intent.category.LAUNCHER" />
            </intent-filter>

            <intent-filter android:autoVerify="true">
                <action android:name="android.intent.action.VIEW" />
                <category android:name="android.intent.category.DEFAULT" />
                <category android:name="android.intent.category.BROWSABLE" />
                <data
                    android:scheme="https"
                    android:host="${host}" />
            </intent-filter>
        </activity>
    </application>
</manifest>
`;
}

export function generateBuildApkScript(originUrl: string, packageId = APK_META.packageId): string {
  const { origin } = normalizeOriginHost(originUrl);
  return `#!/usr/bin/env bash
# ==============================================================================
# اسکریپت ساخت خودکار فایل نصبی اندروید (APK) — اکوسولار (EcoSolar)
# Package ID: ${packageId}
# Version: ${APK_META.versionName} (code ${APK_META.versionCode})
# ==============================================================================
set -euo pipefail

echo "==> [1/4] بررسی پیش‌نیازها (Node.js / Java JDK)..."
command -v node >/dev/null 2>&1 || { echo "Node.js یافت نشد. لطفاً Node.js 20+ نصب کنید."; exit 1; }
command -v keytool >/dev/null 2>&1 || { echo "Java keytool یافت نشد. لطفاً JDK 17+ نصب کنید."; exit 1; }

if [ ! -f "./android.keystore" ]; then
  echo "==> [2/4] ساخت کلید امضای دیجیتال اندروید (android.keystore)..."
  keytool -genkeypair -v \\
    -keystore ./android.keystore \\
    -alias ${APK_META.keystoreAlias} \\
    -keyalg RSA -keysize 2048 -validity 10000 \\
    -storepass ecosolar1405 -keypass ecosolar1405 \\
    -dname "CN=EcoSolar, OU=Energy, O=EcoSolar, L=Isfahan, S=Isfahan, C=IR"
else
  echo "==> [2/4] فایل کلید امضا (android.keystore) موجود است."
fi

echo "==> [3/4] مقداردهی پروژه اندروید با Bubblewrap TWA..."
npx --yes @bubblewrap/cli@latest update --manifest="./twa-manifest.json" || \\
  npx --yes @bubblewrap/cli@latest init --manifest="${origin}/manifest.webmanifest"

echo "==> [4/4] کامپایل و امضای فایل APK نهایی..."
npx --yes @bubblewrap/cli@latest build

echo "=============================================================================="
echo "✅ ساخت فایل اندروید با موفقیت انجام شد!"
echo "📦 فایل خروجی: ./app-release-signed.apk (آماده نصب روی گوشی و انتشار در بازار/مایکت)"
echo "=============================================================================="
`;
}
