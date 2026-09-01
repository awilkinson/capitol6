#!/usr/bin/env node
/**
 * Capitol 6 — inject artwork into index.html as data: URIs
 *
 * Reads assets/posters/<id>.jpg, assets/backdrops/<id>.jpg and assets/logo.png
 * and writes them into the C6-ART block ahead of the page script, which reads
 * window.C6_POSTERS, window.C6_BACKDROPS and window.C6_LOGO.
 *
 * The published Artifact blocks images from every external host, so the art
 * has to travel inside the page. Keep the shrunken files small: posters at
 * 480px wide and backdrops at 960px keep all 23 images to about 2.5 MB.
 *
 *   node tools/inject-art.mjs
 */
import { readFileSync, writeFileSync, readdirSync, existsSync } from "node:fs";
import { join, dirname, basename, extname } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const HTML = join(ROOT, "index.html");

const dataUri = (file) => {
  const ext = extname(file).slice(1).toLowerCase();
  const mime = ext === "png" ? "image/png" : ext === "webp" ? "image/webp" : "image/jpeg";
  return `data:${mime};base64,${readFileSync(file).toString("base64")}`;
};
const dirMap = (dir) => {
  const out = {};
  if (!existsSync(dir)) return out;
  for (const f of readdirSync(dir)) {
    if (!/\.(jpe?g|png|webp)$/i.test(f)) continue;
    out[basename(f, extname(f))] = dataUri(join(dir, f));
  }
  return out;
};

const posters = dirMap(join(ROOT, "assets", "posters"));
const backdrops = dirMap(join(ROOT, "assets", "backdrops"));
const logoFile = join(ROOT, "assets", "logo.png");
const logo = existsSync(logoFile) ? dataUri(logoFile) : null;

const OPEN = "<!-- C6-ART:START -->";
const CLOSE = "<!-- C6-ART:END -->";
let html = readFileSync(HTML, "utf8");
const existing = html.match(new RegExp(`${OPEN}[\\s\\S]*?${CLOSE}\\n?`));
if (existing) html = html.replace(existing[0], "");

const block = `${OPEN}
<script>
window.C6_LOGO = ${JSON.stringify(logo)};
window.C6_POSTERS = ${JSON.stringify(posters)};
window.C6_BACKDROPS = ${JSON.stringify(backdrops)};
</script>
${CLOSE}
`;
const anchor = "<script>\n\"use strict\";";
if (!html.includes(anchor)) { console.error("Could not find the main script tag in index.html."); process.exit(1); }
html = html.replace(anchor, block + anchor);
writeFileSync(HTML, html);

const kb = Math.round(Buffer.byteLength(block) / 1024);
console.log(`Injected ${Object.keys(posters).length} posters, ${Object.keys(backdrops).length} backdrops${logo ? " and the logo" : ""} (${kb} KB). index.html is now ${Math.round(Buffer.byteLength(html) / 1024)} KB.`);
