// Accessibility check: serves dist/ with the production server and runs axe-core on every page,
// in Hebrew and English. Exits with 1 if axe finds any WCAG 2.1 A/AA violation.
// Run after `npm run build`: npm run check:a11y
import { spawn } from "node:child_process";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { chromium } from "playwright";

const PORT = Number(process.env.A11Y_PORT ?? 4173);
const BASE = `http://localhost:${PORT}`;
const AXE_TAGS = ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"];
const LANGS = ["he", "en"];
const PARALLEL_PAGES = 4;
const axePath = createRequire(import.meta.url).resolve("axe-core/axe.min.js");

// Every page in the sitemap, plus /saved, which is not indexed.
function pagePaths() {
  const sitemap = readFileSync(new URL("../dist/sitemap.xml", import.meta.url), "utf8");
  const paths = [...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map(([, url]) => new URL(url).pathname);
  return [...new Set([...paths, "/saved"])];
}

// Starts server/server.mjs and resolves once it answers.
async function startServer() {
  const server = spawn(process.execPath, ["server/server.mjs"], { env: { ...process.env, PORT: String(PORT) }, stdio: "inherit" });
  for (let attempt = 0; attempt < 50; attempt++) {
    try {
      if ((await fetch(BASE)).ok) return server;
    } catch {
      // Not listening yet.
    }
    await new Promise((done) => setTimeout(done, 200));
  }
  server.kill();
  throw new Error(`Server did not start on port ${PORT}`);
}

async function checkPage(context, path) {
  const page = await context.newPage();
  try {
    await page.goto(BASE + path, { waitUntil: "load" });
    await page.waitForLoadState("networkidle").catch(() => {});
    await page.addScriptTag({ path: axePath });
    return await page.evaluate((tags) => window.axe.run(document, { runOnly: { type: "tag", values: tags } }).then((r) => r.violations), AXE_TAGS);
  } finally {
    await page.close();
  }
}

const server = await startServer();
const browser = await chromium.launch();
let failures = 0;
try {
  const paths = pagePaths();
  for (const lang of LANGS) {
    // Reduced motion shows the settled page, so fade-ins can't cause false contrast failures.
    const context = await browser.newContext({ reducedMotion: "reduce" });
    // The Google reviews widget is blocked so checks don't use up its 5,000 monthly views.
    await context.route(/elfsight/, (route) => route.abort());
    // The site keeps the chosen language in localStorage (see usePersistentState).
    await context.addInitScript((value) => localStorage.setItem("betak.lang", JSON.stringify(value)), lang);
    const queue = [...paths];
    const results = [];
    // A few pages at a time keeps the run short without overloading the runner.
    await Promise.all(
      Array.from({ length: PARALLEL_PAGES }, async () => {
        for (let path = queue.shift(); path; path = queue.shift()) results.push({ path, violations: await checkPage(context, path) });
      }),
    );
    for (const { path, violations } of results.sort((a, b) => a.path.localeCompare(b.path))) {
      if (violations.length === 0) continue;
      failures += violations.length;
      console.log(`\n✗ [${lang}] ${path}`);
      for (const v of violations) {
        console.log(`  ${v.id} (${v.impact}): ${v.help}\n    ${v.helpUrl}`);
        for (const node of v.nodes.slice(0, 5)) console.log(`    ${node.target.join(" ")}`);
      }
    }
    await context.close();
  }
  console.log(failures ? `\naxe found ${failures} violation(s).` : `\naxe: 0 violations on ${paths.length} pages in ${LANGS.join(" and ")}.`);
} finally {
  await browser.close();
  server.kill();
}
process.exit(failures ? 1 : 0);
