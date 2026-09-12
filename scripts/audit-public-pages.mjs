#!/usr/bin/env node
import axe from "axe-core";
import { chromium } from "playwright";

const baseUrl = process.argv[2] || "http://127.0.0.1:4177";
const routes = ["/login", "/signup", "/route-that-does-not-exist"];
const browser = await chromium.launch({ channel: "chrome" }).catch(() => chromium.launch());
const failures = [];

for (const route of routes) {
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  await page.goto(`${baseUrl}${route}`, { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(500);
  await page.addScriptTag({ content: axe.source });
  const result = await page.evaluate(async () => {
    return window.axe.run(document, {
      runOnly: { type: "tag", values: ["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"] },
    });
  });
  if (result.violations.length) {
    for (const violation of result.violations) {
      const nodeDetails = violation.nodes.map((node) => {
        const target = node.target?.join(" > ") || "unknown target";
        const html = node.html?.replace(/\s+/g, " ").trim() || "unknown html";
        const summary = node.failureSummary?.replace(/\s+/g, " ").trim() || "no failure summary";
        return `target=${target} | html=${html} | ${summary}`;
      }).join(" || ");
      failures.push(`${route}: axe ${violation.id} (${violation.impact || "unknown"}) x${violation.nodes.length} :: ${nodeDetails}`);
    }
  }
  const title = await page.title();
  if (!title || title === "WatSUB-Project Management") failures.push(`${route}: SPA title was not updated`);
  await page.close();
}

for (const width of [320, 414]) {
  const page = await browser.newPage({ viewport: { width, height: 820 } });
  await page.goto(`${baseUrl}/login`, { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(300);
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  if (overflow > 1) failures.push(`/login @${width}px: horizontal overflow +${overflow}px`);
  await page.close();
}
const motionPage = await browser.newPage({ viewport: { width: 1280, height: 900 } });
await motionPage.emulateMedia({ reducedMotion: "reduce" });
await motionPage.goto(`${baseUrl}/login`, { waitUntil: "domcontentloaded" });
await motionPage.waitForTimeout(400);
const moving = await motionPage.evaluate(() => {
  return [...document.querySelectorAll("body *")].filter((element) => {
    const style = getComputedStyle(element);
    if (style.display === "none" || style.visibility === "hidden") return false;
    const animationSeconds = Math.max(...style.animationDuration.split(",").map((value) => parseFloat(value) || 0));
    const transitionSeconds = Math.max(...style.transitionDuration.split(",").map((value) => parseFloat(value) || 0));
    return (style.animationName !== "none" && animationSeconds > 0.1)
      || (/transform|width|height|top|left|all/.test(style.transitionProperty) && transitionSeconds > 0.1);
  }).length;
});
if (moving) failures.push(`/login reduced-motion: ${moving} element(s) still moving`);
await motionPage.close();
await browser.close();

if (failures.length) {
  console.error(`Browser Design QA FAIL: ${failures.length} issue(s)`);
  for (const failure of failures) console.error(`  ${failure}`);
  process.exit(1);
}
console.log(`Browser Design QA PASS: axe, SPA title, 320/414px reflow, and reduced-motion all passed.`);
