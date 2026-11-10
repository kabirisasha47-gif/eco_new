import { describe, expect, it } from "vitest";

import {
  APK_META,
  evaluateApkReadiness,
  generateAndroidManifestXml,
  generateAssetLinksJson,
  generateCapacitorConfigJson,
  generateTwaManifestJson,
} from "./apk-config";

describe("APK config generators", () => {
  it("evaluates WebAPK and TWA readiness", () => {
    const status = evaluateApkReadiness({
      hasManifest: true,
      hasServiceWorker: true,
      hasMaskableIcons: true,
      hasAssetLinks: true,
      isHttpsOrLocalhost: true,
    });
    expect(status.readyForWebApk).toBe(true);
    expect(status.readyForSignedTwa).toBe(true);
    expect(status.scorePct).toBe(100);
  });

  it("generates valid TWA manifest, Capacitor config, AssetLinks, and AndroidManifest.xml", () => {
    const twa = JSON.parse(generateTwaManifestJson("https://ecosolar.ir"));
    expect(twa.packageId).toBe(APK_META.packageId);
    expect(twa.webManifestUrl).toBe("https://ecosolar.ir/manifest.webmanifest");

    const cap = JSON.parse(generateCapacitorConfigJson("https://ecosolar.ir"));
    expect(cap.appId).toBe(APK_META.packageId);

    const links = JSON.parse(generateAssetLinksJson());
    expect(links[0].target.package_name).toBe(APK_META.packageId);

    const xml = generateAndroidManifestXml("https://ecosolar.ir");
    expect(xml).toContain(`package="${APK_META.packageId}"`);
  });
});
