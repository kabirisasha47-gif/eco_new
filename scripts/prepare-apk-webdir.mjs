import fs from "node:fs/promises";
import path from "node:path";

const ROUTES = [
  "/",
  "/apk",
  "/bill",
  "/case",
  "/channel",
  "/dashboard",
  "/design",
  "/income",
  "/installment",
  "/optimize",
  "/profile",
  "/quotes",
];

async function main() {
  const serverEntry = path.resolve(".output/server/index.mjs");
  const publicDir = path.resolve(".output/public");
  const distClientDir = path.resolve("dist/client");

  const mod = await import(serverEntry);
  const handler = mod.default;

  for (const route of ROUTES) {
    const res = await handler.fetch(new Request(`http://localhost${route}`), {});
    if (res.status === 200) {
      const html = await res.text();
      const targetDir = route === "/" ? publicDir : path.join(publicDir, route.replace(/^\//, ""));
      await fs.mkdir(targetDir, { recursive: true });
      await fs.writeFile(path.join(targetDir, "index.html"), html, "utf-8");
    }
  }

  await fs.rm(distClientDir, { recursive: true, force: true });
  await fs.mkdir(path.dirname(distClientDir), { recursive: true });
  await fs.cp(publicDir, distClientDir, { recursive: true });
  console.log("Prepared static Android webDir at dist/client with all routes pre-rendered.");
}

main().catch((err) => {
  console.error("Failed to prepare Android webDir:", err);
  process.exit(1);
});
