#!/usr/bin/env node
/**
 * Capitol 6 — artwork generator
 *
 * The remote container this prototype was built in has an egress policy that
 * returns 403 for api.openai.com, api.themoviedb.org and image.tmdb.org, so the
 * artwork could not be produced there. Run this on a machine that can reach them
 * (your Mac) and it injects the results straight into index.html as data: URIs.
 *
 * The page works fine without it — it falls back to typographic title plates and
 * the vector wordmark. This upgrades those, it doesn't rescue them.
 *
 *   node tools/generate-art.mjs --logo             # generate the logo (OpenAI)
 *   node tools/generate-art.mjs --posters          # real poster art (TMDB)
 *   node tools/generate-art.mjs --art              # original key art (OpenAI)
 *   node tools/generate-art.mjs --logo --posters   # both
 *
 * Keys are read from the environment, never from this file:
 *   OPENAI_API_KEY   required for --logo and --art
 *   TMDB_API_KEY     required for --posters   (free: themoviedb.org/settings/api)
 *
 * On a Mac set up per CLAUDE.md both already resolve through 1Password, so
 * `claude`/`claude-with-env` shells have them. Otherwise:
 *   export OPENAI_API_KEY="$(op read 'op://Dev Credentials/OPENAI_API_KEY/credential')"
 *
 * Note on "actual movie posters": studio key art is the distributor's
 * copyright. A real cinema site displays it under the licence that comes with
 * booking the film, and pulls the files from the distributor or from TMDB.
 * That is what --posters does. --art is the alternative: original artwork in a
 * poster idiom, no studio assets, no actor likenesses.
 */

import { writeFileSync, readFileSync, mkdirSync, existsSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const OUT = join(ROOT, "assets", "generated");
const HTML = join(ROOT, "index.html");

const argv = new Set(process.argv.slice(2));
const WANT = {
  logo: argv.has("--logo"),
  posters: argv.has("--posters"),
  art: argv.has("--art"),
};
if (!WANT.logo && !WANT.posters && !WANT.art) {
  console.error("Nothing to do. Pass --logo, --posters and/or --art.");
  process.exit(1);
}

/* The eight films actually on Capitol 6's screens as of 31 August 2026.
   tmdb: the exact title to search when pulling real distributor art.
   brief: the prompt for original key art, when generating instead. */
const FILMS = [
  {
    id: "spiderman",
    tmdb: "Spider-Man: Brand New Day",
    year: 2026,
    brief:
      "Original graphic movie poster art, vertical. A lone masked figure in a red and black bodysuit perched on a gargoyle high above a rain-slicked city at dusk, seen from behind and far away so no face is visible. Concentric web-like rings of light radiating behind them. Deep crimson and near-black palette, single amber light source. Painterly, cinematic, high contrast. No text, no lettering, no logos.",
  },
  {
    id: "odyssey",
    tmdb: "The Odyssey",
    year: 2026,
    brief:
      "Original graphic movie poster art, vertical. A small wooden ship dwarfed by an enormous cresting wave under a bronze sky, shot on 70mm, epic scale. Aegean blue to burnished bronze palette. Grain, painterly, mythic and austere. No text, no lettering, no logos, no faces.",
  },
  {
    id: "insidious",
    tmdb: "Insidious: Out of the Further",
    year: 2026,
    brief:
      "Original horror movie poster art, vertical. A red door standing open in a void of absolute black, a thin blade of sickly violet light spilling out across the floor. Nothing else. Deep purple and black palette. Minimal, dread-filled, high contrast. No text, no lettering, no logos, no faces.",
  },
  {
    id: "coyote",
    tmdb: "Coyote vs. Acme",
    year: 2026,
    brief:
      "Original animated-comedy poster art, vertical. A vast red-rock desert canyon at golden hour with a single impossibly long straight road, a tiny wooden crate abandoned in the middle of it casting a long shadow. Warm burnt-orange and gold palette, clean flat vector-illustration style, wry and empty. No text, no lettering, no logos, no characters.",
  },
  {
    id: "pawpatrol",
    tmdb: "PAW Patrol: The Dino Movie",
    year: 2026,
    brief:
      "Original children's animated adventure poster art, vertical. A lush tropical volcanic island seen from the air, palm jungle and a steaming caldera, dinosaur silhouettes among the trees, bright friendly 3D-animation lighting. Emerald green, turquoise and warm amber palette. Cheerful, no menace. No text, no lettering, no logos, no characters.",
  },
  {
    id: "dogstars",
    tmdb: "The Dog Stars",
    year: 2026,
    brief:
      "Original post-apocalyptic drama poster art, vertical. A tiny vintage biplane flying low over an endless empty prairie under an enormous pale sky, long grass, no buildings anywhere, one distant figure and a dog as specks. Muted sage green, dust and bone palette, natural light, Ridley Scott scale and stillness. No text, no lettering, no logos, no faces.",
  },
  {
    id: "findingemily",
    tmdb: "Finding Emily",
    year: 2026,
    brief:
      "Original romantic-comedy poster art, vertical. A cluttered student-union sound desk glowing under warm stage light, faders and cables, an empty stool, a paper napkin with a phone number on it in focus in the foreground. Warm rose, amber and deep plum palette. Intimate, hopeful, shallow depth of field. No text, no lettering, no logos, no faces.",
  },
  {
    id: "terminator2",
    tmdb: "Terminator 2: Judgment Day",
    year: 1991,
    brief:
      "Original science-fiction poster art, vertical. A chrome liquid-metal surface rippling and reforming, reflecting a burning orange sky and a chain-link fence. Abstract, no figure. Steel blue and molten orange palette, 1990s practical-effects sheen, high contrast. No text, no lettering, no logos, no faces.",
  },
];

const LOGO_PROMPT = `A modern, elegant logo for an independent six-screen cinema called "Capitol 6" in Victoria, British Columbia.

The mark: the numeral 6 rendered as a projector aperture — the round bowl of the 6 reads as a lens, and its ascending stroke sweeps upward and outward like a beam of projected light. Geometric, monoline, confident, perfectly balanced. A small solid dot sits inside the bowl as the lamp.

Style: minimal flat vector, a single warm amber colour (#E9B44C) on a transparent background. No gradients, no bevels, no drop shadows, no 3D. Crisp edges, generous negative space. It must read clearly at 24 pixels tall.

Mark only — absolutely no text, no letters, no words, no wordmark.`;

const need = (k) => {
  const v = process.env[k];
  if (!v) {
    console.error(`\nMissing ${k}.`);
    console.error(`  export ${k}="$(op read 'op://Dev Credentials/${k}/credential')"`);
    process.exit(1);
  }
  return v;
};

if (!existsSync(OUT)) mkdirSync(OUT, { recursive: true });

/* macOS ships sips, so no image dependencies. Posters render at ~330px wide at
   most, so 600x900 JPEG keeps all nine images to roughly a megabyte of base64 —
   the published page has a hard 16MB ceiling. */
function shrink(file, w, h, fmt = "jpeg") {
  const out = file.replace(/\.\w+$/, `.small.${fmt === "jpeg" ? "jpg" : fmt}`);
  try {
    execFileSync("sips", ["-s", "format", fmt, "-s", "formatOptions", "80",
      "-z", String(h), String(w), file, "--out", out], { stdio: "ignore" });
    return out;
  } catch {
    console.warn(`  (sips unavailable — embedding ${file} at full size)`);
    return file;
  }
}

const dataUri = (file) => {
  const ext = file.split(".").pop().toLowerCase();
  const mime = ext === "png" ? "image/png" : ext === "webp" ? "image/webp" : "image/jpeg";
  return `data:${mime};base64,${readFileSync(file).toString("base64")}`;
};

async function openaiImage(prompt, { size = "1024x1536", background = "auto" } = {}) {
  const body = { model: "gpt-image-2", prompt, size, quality: "high", n: 1 };
  if (background === "transparent") body.background = "transparent";

  let res = await fetch("https://api.openai.com/v1/images/generations", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${need("OPENAI_API_KEY")}` },
    body: JSON.stringify(body),
  });

  // Per CLAUDE.md: if gpt-image-2 rejects a parameter, drop the parameter —
  // never downgrade the model.
  if (!res.ok && background === "transparent") {
    delete body.background;
    res = await fetch("https://api.openai.com/v1/images/generations", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${need("OPENAI_API_KEY")}` },
      body: JSON.stringify(body),
    });
  }
  if (!res.ok) throw new Error(`OpenAI ${res.status}: ${(await res.text()).slice(0, 400)}`);

  const json = await res.json();
  const b64 = json.data?.[0]?.b64_json;
  if (!b64) throw new Error("No image returned");
  return Buffer.from(b64, "base64");
}

async function tmdbPoster(film) {
  const key = need("TMDB_API_KEY");
  const url = `https://api.themoviedb.org/3/search/movie?api_key=${key}` +
    `&query=${encodeURIComponent(film.tmdb)}&year=${film.year}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`TMDB ${res.status}`);
  const hit = (await res.json()).results?.[0];
  if (!hit?.poster_path) throw new Error(`no poster for ${film.tmdb}`);
  const img = await fetch(`https://image.tmdb.org/t/p/w780${hit.poster_path}`);
  if (!img.ok) throw new Error(`TMDB image ${img.status}`);
  return { buf: Buffer.from(await img.arrayBuffer()), overview: hit.overview, runtime: hit.id };
}

const posters = {};
let logo = null;

if (WANT.logo) {
  console.log("Logo — gpt-image-2, high quality…");
  const png = join(OUT, "logo.png");
  writeFileSync(png, await openaiImage(LOGO_PROMPT, { size: "1024x1024", background: "transparent" }));
  logo = dataUri(shrink(png, 256, 256, "png"));
  console.log("  saved assets/logo.png");
}

if (WANT.posters || WANT.art) {
  const source = WANT.posters ? "TMDB" : "gpt-image-2";
  console.log(`\nPosters — ${source}, ${FILMS.length} in parallel…`);
  const results = await Promise.allSettled(
    FILMS.map(async (f) => {
      const buf = WANT.posters ? (await tmdbPoster(f)).buf : await openaiImage(f.brief);
      const file = join(OUT, `${f.id}.${WANT.posters ? "jpg" : "png"}`);
      writeFileSync(file, buf);
      return [f.id, dataUri(shrink(file, 600, 900))];
    })
  );
  results.forEach((r, i) => {
    if (r.status === "fulfilled") { posters[r.value[0]] = r.value[1]; console.log(`  ✓ ${FILMS[i].tmdb}`); }
    else console.log(`  ✗ ${FILMS[i].tmdb} — ${r.reason.message}`);
  });
}

/* Injection now lives in tools/inject-art.mjs, which packs assets/logo.png,
   assets/posters/*.jpg and assets/backdrops/*.jpg into index.html together.
   This tool only writes files into assets/. */
if (logo) console.log("\nLogo saved. Clean it up (crop, flatten the colour), drop it at assets/logo.png, then run:  node tools/inject-art.mjs");
if (Object.keys(posters).length) console.log("\nPosters saved to assets/. Move the ones you want into assets/posters/<id>.jpg, then run:  node tools/inject-art.mjs");
