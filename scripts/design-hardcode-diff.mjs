#!/usr/bin/env node
import { execFileSync } from "node:child_process";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";

const base = process.env.DESIGN_QA_BASE || process.argv[2] || "origin/main";
const ROOT = "src";
const EXTS = new Set([".css", ".scss", ".tsx", ".jsx", ".ts", ".js"]);
const patterns = [
  ["hex", /(?<![\w&])#[0-9a-fA-F]{3,8}\b/g],
  ["px", /(?<![\w.])\d+(?:\.\d+)?px\b/g],
  ["time", /(?<![\w.])\d+(?:\.\d+)?m?s\b/g],
  ["font-family", /font-family\s*:\s*(?!.*var\()/gi],
  ["tailwind-palette", /\b(?:bg|text|border|ring|ring-offset|fill|stroke|from|via|to|divide|outline|decoration|accent|caret|placeholder|shadow)-(?:slate|gray|zinc|neutral|stone|red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose)-(?:50|100|200|300|400|500|600|700|800|900|950)\b/g],
];

function walk(dir) {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    if (path.includes("node_modules")) return [];
    if (statSync(path).isDirectory()) return walk(path);
    return EXTS.has(path.slice(path.lastIndexOf("."))) ? [path] : [];
  });
}

function scan(text) {
  const counts = new Map();
  for (const line of text.split(/\r?\n/)) {
    if (line.includes("ds-allow-hardcode") || /var\(--|theme\(|--[\w-]+\s*:/.test(line)) continue;
    const media = /@media|@container/.test(line);
    for (const [kind, pattern] of patterns) {
      if (media && (kind === "px" || kind === "time")) continue;
      pattern.lastIndex = 0;
      for (const match of line.matchAll(pattern)) {
        if (kind === "px" && (match[0] === "0px" || match[0] === "1px")) continue;
        const key = `${kind}:${match[0].toLowerCase()}`;
        counts.set(key, (counts.get(key) || 0) + 1);
      }
    }
  }
  return counts;
}

function baseText(file) {
  const rel = relative(process.cwd(), file).replaceAll("\\", "/");
  try { return execFileSync("git", ["show", `${base}:${rel}`], { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] }); }
  catch { return ""; }
}

const increases = [];
for (const file of walk(ROOT)) {
  const current = scan(readFileSync(file, "utf8"));
  const previous = scan(baseText(file));
  for (const [key, count] of current) {
    const before = previous.get(key) || 0;
    if (count > before) increases.push(`${relative(process.cwd(), file)}: ${key} ${before} -> ${count}`);
  }
}

if (increases.length) {
  console.error(`Design QA FAIL: ${increases.length} hardcoded design value increase(s) vs ${base}.`);
  for (const issue of increases) console.error(`  ${issue}`);
  process.exit(1);
}
console.log(`Design QA PASS: no hardcoded design value count increased vs ${base}.`);
