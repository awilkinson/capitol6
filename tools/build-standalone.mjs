#!/usr/bin/env node
/**
 * index.html is the Artifact source: it holds page content only, because the
 * Artifact host wraps it in <!doctype html><head>…</head><body> at publish time.
 * That makes it an incomplete document for anywhere else — notably it has no
 * viewport meta, so a phone would render it at desktop width.
 *
 * This wraps it into a complete, self-contained page in dist/ that you can host
 * anywhere static: Vercel, Netlify, GitHub Pages, S3, a USB stick.
 *
 *   node tools/build-standalone.mjs
 *   npx serve dist
 */
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const body = readFileSync(join(ROOT, "index.html"), "utf8");

const html = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<meta name="description" content="A concept redesign prototype for Capitol 6 Theatres, Victoria BC. Unaffiliated with the cinema; no tickets are sold here.">
<meta name="robots" content="noindex, nofollow">
<meta name="theme-color" content="#0B0A09">
<style>
  :root{ color-scheme: dark; }
  body{ margin:0; background:#0B0A09; }
  img{ max-width:100%; }
  [hidden]{ display:none !important; }
</style>
</head>
<body>
${body}
</body>
</html>
`;

mkdirSync(join(ROOT, "dist"), { recursive: true });
writeFileSync(join(ROOT, "dist", "index.html"), html);

// A concept redesign carrying a real cinema's name must never be indexed as
// though it were the real Capitol 6.
writeFileSync(join(ROOT, "dist", "robots.txt"), "User-agent: *\nDisallow: /\n");
console.log(`dist/index.html — ${(Buffer.byteLength(html) / 1024).toFixed(0)} KB`);
