import test from "node:test";
import assert from "node:assert/strict";

import {
  APK_BUILD_METHODS,
  APK_META,
  evaluateApkReadiness,
  generateAndroidManifestXml,
  generateAssetLinksJson,
  generateBuildApkScript,
  generateCapacitorConfigJson,
  generateExpoConfigJson,
  generateTwaManifestJson,
  normalizeOriginHost,
} from "./apk-config";
import { generateQrMatrix } from "./qr-code";

test("APK_META defines standard Android package identifier and SDK versions", () => {
  assert.equal(APK_META.packageId, "ir.ecosolar.app");
  assert.equal(APK_META.versionName, "1.0.0");
  assert.equal(APK_META.versionCode, 1);
  assert.equal(APK_META.minSdkVersion, 24);
  assert.equal(APK_BUILD_METHODS.length, 3);
});

test("evaluateApkReadiness calculates readiness percentage and flags accurately", () => {
  const full = evaluateApkReadiness({
    hasManifest: true,
    hasServiceWorker: true,
    hasMaskableIcons: true,
    hasAssetLinks: true,
    isHttpsOrLocalhost: true,
  });
  assert.equal(full.readyForWebApk, true);
  assert.equal(full.readyForSignedTwa, true);
  assert.equal(full.scorePct, 100);
  assert.equal(full.passedCount, 5);

  const partial = evaluateApkReadiness({
    hasManifest: true,
    hasServiceWorker: true,
    hasMaskableIcons: true,
    hasAssetLinks: false,
    isHttpsOrLocalhost: true,
  });
  assert.equal(partial.readyForWebApk, true);
  assert.equal(partial.readyForSignedTwa, false);
  assert.equal(partial.scorePct, 80);
});

test("normalizeOriginHost extracts clean origin and host from URLs", () => {
  const res = normalizeOriginHost("https://app.ecosolar.ir/dashboard?x=1");
  assert.equal(res.origin, "https://app.ecosolar.ir");
  assert.equal(res.host, "app.ecosolar.ir");

  const bare = normalizeOriginHost("ecosolar.ir");
  assert.equal(bare.origin, "https://ecosolar.ir");
  assert.equal(bare.host, "ecosolar.ir");
});

test("generateTwaManifestJson and generateCapacitorConfigJson produce valid JSON with packageId", () => {
  const twa = JSON.parse(generateTwaManifestJson("https://app.ecosolar.ir", "ir.ecosolar.app"));
  assert.equal(twa.packageId, "ir.ecosolar.app");
  assert.equal(twa.host, "app.ecosolar.ir");
  assert.equal(twa.display, "standalone");
  assert.equal(twa.webManifestUrl, "https://app.ecosolar.ir/manifest.webmanifest");

  const cap = JSON.parse(generateCapacitorConfigJson("https://app.ecosolar.ir", "ir.ecosolar.app"));
  assert.equal(cap.appId, "ir.ecosolar.app");
  assert.equal(cap.server.url, "https://app.ecosolar.ir");
});

test("generateAssetLinksJson, generateAndroidManifestXml, and generateBuildApkScript include package metadata", () => {
  const links = JSON.parse(generateAssetLinksJson("ir.ecosolar.app", "AA:BB:CC"));
  assert.equal(links[0].target.package_name, "ir.ecosolar.app");
  assert.deepEqual(links[0].target.sha256_cert_fingerprints, ["AA:BB:CC"]);

  const xml = generateAndroidManifestXml("https://app.ecosolar.ir", "ir.ecosolar.app");
  assert.ok(xml.includes('package="ir.ecosolar.app"'));
  assert.ok(xml.includes('android:host="app.ecosolar.ir"'));

  const sh = generateBuildApkScript("https://app.ecosolar.ir", "ir.ecosolar.app");
  assert.ok(sh.includes("#!/usr/bin/env bash"));
  assert.ok(sh.includes("@bubblewrap/cli"));
});

test("generateQrMatrix and generateExpoConfigJson produce valid scannable matrix and Expo EAS config", () => {
  const matrix = generateQrMatrix(
    "https://ais-pre-3bpimaq7uatkznzvx27b7y-49660861717.us-east1.run.app/apk",
  );
  assert.ok(matrix.length >= 21);
  assert.equal(matrix.length, matrix[0]?.length);
  // Top-left finder corner is always dark (true)
  assert.equal(matrix[0]?.[0], true);

  const expo = JSON.parse(generateExpoConfigJson("https://ecosolar.ir", "ir.ecosolar.app"));
  assert.equal(expo.expo.android.package, "ir.ecosolar.app");
  assert.equal(expo.eas.build.preview.android.buildType, "apk");
});
