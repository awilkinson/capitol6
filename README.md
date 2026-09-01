# Capitol 6

A clickable redesign prototype for [Capitol 6 Theatres](https://www.capitol6.ca) — the independent six-screen cinema at 805 Yates Street in Victoria, British Columbia.

It keeps the Capitol 6 name and rebuilds everything else, around a reimagined seat-selection and checkout flow. Nothing is wired to a real backend: no payment is taken, no seat is really held, no email is sent.

## Try it

```bash
node tools/build-standalone.mjs && npx serve dist
```

Start on the homepage, tap a showtime, and go through to the confirmation screen. That path is the point of the whole thing.

## What's in the booking flow

Pick your party size first, then tap any seat and it takes the best contiguous run around it — or hit **Best available** and it finds the strongest block in the house. The seat map is drawn as a room rather than a grid: rows arc toward a lit screen that spills light onto the front rows, loveseat pairs sit joined in the back row, and wheelchair positions with companion seating are bookable directly on the cross-aisle.

A sightline model scores every seat by row depth and distance from centre, which drives both the auto-picker and the faint "best sightlines" band. Discounts apply themselves — matinee, Tuesday, seniors Monday — and the winning rule is named before you pay. Seats are held for seven minutes against a live countdown, concessions can be pre-ordered to your seat, and the ticket comes back as a wallet-style pass.

## Accuracy

Real, verified against the live site and press coverage:

- Address, both phone numbers, the full ticket price card, box-office hours
- Six auditoriums totalling 502 power recliners, and the 1921 → 1981 → 2013 → 2016 history
- The **Rewards Club** as it actually works: 15,000 points redeems a free admission on non no-pass engagements, reward dollars expire after 60 days
- The refund policy: 60 minutes before showtime, ticket price only, service and convenience fees non-refundable, by phone with a confirmation number
- The eight films actually on screen as of 31 August 2026, with verified runtimes, directors, casts, release dates and synopses, carrying BC classifications rather than the American ratings quoted in US press

Illustrative, and labelled as such in the footer:

- **Showtimes.** Generated to be plausible and internally consistent — matinees before 4pm, gaps that fit each film's real runtime, busier Tuesdays. The live schedule is on capitol6.ca and the 778-265-7988 hotline.
- **Seat occupancy.** Deterministic per screening, so a given show always looks the same.
- **Private screening prices.** Placeholder; studio licensing is quoted per title and headcount.

## Artwork

The page ships with typographic title plates and a vector wordmark that draws the numeral 6 as a projector aperture — the bowl is the lens, the ascending stroke is the beam, the dot inside is the lamp. Both are finished designs, not placeholders, and the page is complete without anything below.

`tools/generate-art.mjs` upgrades them:

```bash
node tools/generate-art.mjs --logo      # logo via gpt-image-2
node tools/generate-art.mjs --posters   # real distributor poster art via TMDB
node tools/generate-art.mjs --art       # original key art via gpt-image-2
```

It shrinks the results and injects them into `index.html` as data URIs. `POSTERS` and `LOGO` fall back to the built-in designs for anything missing, so a partial run degrades cleanly.

Keys come from the environment, never the repo:

```bash
export OPENAI_API_KEY="$(op read 'op://Dev Credentials/OPENAI_API_KEY/credential')"
export TMDB_API_KEY="$(op read 'op://Dev Credentials/TMDB_API_KEY/credential')"
```

On studio key art: it's the distributor's copyright. A real cinema site displays it under the licence that comes with booking the film, and pulls the files from the distributor or TMDB — that's `--posters`. `--art` is the alternative that touches no studio assets and no actor likenesses.

## Layout

```
index.html                   the prototype — page content only (see below)
tools/build-standalone.mjs   wraps it into a complete document in dist/
tools/generate-art.mjs       logo and poster generation
```

`index.html` deliberately has no `<!doctype>`, `<html>`, `<head>` or `<body>`. It's authored to publish as a Claude Artifact, which supplies that skeleton at publish time. `build-standalone.mjs` adds it back — including the viewport meta, without which a phone renders the page at desktop width — for hosting anywhere static.

Everything is one file: no build step, no framework, no dependencies. Design tokens are CSS custom properties at the top; the JS below is a small hash-free router with one delegated click handler.

## Design

Dark and warm — near-black grounds biased brown rather than grey, warm bone text, and a single amber accent used as *emitted* light (glow, spill, gradient) rather than flat fill. Instrument Serif carries film titles the way cinemas actually set them, Archivo carries the interface, DM Mono carries showtimes, seat labels and prices.

Committed to a single dark theme on purpose: a lit auditorium doesn't have a light mode, and the seat map depends on glow to read. Every colour is painted explicitly so the page holds on any host background.

## Testing

Driven in Chromium at 390 / 768 / 1440px. Each pass checks no horizontal overflow on any view, correct seat counts and row geometry across all six houses, several hundred seat-selection scenarios spanning every house and party size from 1 to 8, the discount rules, and a full run from browsing to confirmation — with the console watched for errors throughout.
