#!/usr/bin/env bash
# ==============================================================================
# اسکریپت ساخت خودکار فایل نصبی اندروید (APK) — اکوسولار (EcoSolar)
# Package ID: ir.ecosolar.app
# Version: 1.0.0 (code 1)
# ==============================================================================
set -euo pipefail

APP_ORIGIN="${1:-http://localhost:3000}"

echo "==> [1/4] بررسی پیش‌نیازها (Node.js / Java JDK)..."
command -v node >/dev/null 2>&1 || { echo "Node.js یافت نشد. لطفاً Node.js 20+ نصب کنید."; exit 1; }
command -v keytool >/dev/null 2>&1 || { echo "Java keytool یافت نشد. لطفاً JDK 17+ نصب کنید."; exit 1; }

if [ ! -f "./android.keystore" ]; then
  echo "==> [2/4] ساخت کلید امضای دیجیتال اندروید (android.keystore)..."
  keytool -genkeypair -v \
    -keystore ./android.keystore \
    -alias ecosolar-key \
    -keyalg RSA -keysize 2048 -validity 10000 \
    -storepass ecosolar1405 -keypass ecosolar1405 \
    -dname "CN=EcoSolar, OU=Energy, O=EcoSolar, L=Isfahan, S=Isfahan, C=IR"
else
  echo "==> [2/4] فایل کلید امضا (android.keystore) موجود است."
fi

echo "==> [3/4] مقداردهی پروژه اندروید با Bubblewrap TWA..."
npx --yes @bubblewrap/cli@latest update --manifest="./twa-manifest.json" || \
  npx --yes @bubblewrap/cli@latest init --manifest="${APP_ORIGIN}/manifest.webmanifest"

echo "==> [4/4] کامپایل و امضای فایل APK نهایی..."
npx --yes @bubblewrap/cli@latest build

echo "=============================================================================="
echo "✅ ساخت فایل اندروید با موفقیت انجام شد!"
echo "📦 فایل خروجی: ./app-release-signed.apk (آماده نصب روی گوشی و انتشار در بازار/مایکت)"
echo "=============================================================================="
