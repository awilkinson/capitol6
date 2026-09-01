# Capitol 6

A clickable redesign prototype for [Capitol 6 Theatres](https://www.capitol6.ca) — the independent six-screen cinema at 805 Yates Street in Victoria, British Columbia.

It keeps the Capitol 6 name and rebuilds everything else, around a reimagined seat-selection and checkout flow. Nothing is wired to a real backend: no payment is taken, no seat is really held, no email is sent.

## Try it

```bash
node tools/build-standalone.mjs && npx serve dist
```

Start on the homepage, tap a showtime, and go through to the confirmation screen. That path is the point of the whole thing. It is built phone-first — try it at 390px wide.

## What's in the booking flow

Pick your party size first, then tap any seat and it takes the best contiguous run around it — or hit **Best available** and it finds the strongest block in the house. The seat map is drawn as a room rather than a grid: rows arc toward a lit screen that spills light onto the front rows, loveseat pairs sit joined in the back row, and wheelchair positions with companion seating are bookable directly on the cross-aisle.

A sightline model scores every seat by row depth and distance from centre, which drives both the auto-picker and the faint "best sightlines" band. Discounts apply themselves — Tuesday, matinee, Monday seniors — and the winning rule is named before you pay. Seats are held for seven minutes against a live countdown, concessions can be pre-ordered to your seat, and the ticket comes back as a wallet-style pass.

## What's real

Everything below was taken from capitol6.ca on **Tuesday 1 September 2026**:

- **The six films on screen** — Spider-Man: Brand New Day, The Odyssey, The Dog Stars, Teenage Sex and Death at Camp Miasma, Tony, Finding Emily — with the theatre's own runtimes, BC classifications, directors, casts and distributor synopses, plus the Dog Stars photosensitivity advisory.
- **Every showtime the theatre had posted**: Tuesday 1 – Thursday 3 September for the current films. The theatre publishes a few days at a time, so Friday onward reads as "not posted yet" rather than being invented.
- **Five coming-soon titles with advance tickets on sale** and their real advance schedules: Oasis: Don't Look Back in Anger and Practical Magic 2 (10 Sep), Resident Evil (17 Sep), Heart of the Beast (24 Sep), Avengers: Doomsday (17 Dec).
- **The price card, pre-tax**: adult $11.43 matinee / $15.00 evening, senior $11.43, child $10.48, 3D +$2.86, Monday senior special $8.10, Tuesday discount day $8.33 ($11.19 in 3D). The checkout maths uses these.
- **The refund policy** (60 minutes before showtime, ticket price only, by phone on 778-265-9749 with a confirmation number), the box office hours (opens 15 minutes before the first show, closes 15 minutes after the last), the address and both phone numbers.
- **The posters and stills** are the distributors' own key art — posters pulled at full resolution, the 16:9 stills from the theatre's site — shrunk and embedded in the page.
- Six auditoriums totalling 502 power recliners, and the 1921 → 1981 → 2013 → 2016 history, verified earlier against press coverage.

Illustrative, and labelled as such in the footer:

- **Which house a film plays in.** The live site doesn't say, so each title is given one auditorium.
- **Seat occupancy.** Deterministic per screening, so a given show always looks the same.
- **The $1.50 online booking fee, the concession menu and the private-screening prices.** The real site charges a non-refundable convenience fee through its ticketing vendor but doesn't publish the amount.

## Artwork

`assets/logo.png` is the new wordmark: CAPITOL in 1920s marquee lettering with the 6 set inside a lens ring, generated with `gpt-image-2`, then cropped and flattened to the site's single amber. Three alternates live in `assets/logo-variants/` — the one with the 6 drawn as a projector aperture and light beam is `assets/logo-alt.png`. Swap the file and re-run the injector to change it.

```bash
node tools/inject-art.mjs      # packs assets/ into index.html as data: URIs
node tools/generate-art.mjs --logo   # regenerate logo candidates into assets/generated/
```

The published page can't load images from other hosts, so the art travels inside `index.html` — about 3 MB for the logo, eleven posters and eleven stills. `inject-art.mjs` is idempotent; it replaces its own block.

Keys come from the environment, never the repo:

```bash
export OPENAI_API_KEY="$(op read 'op://Dev Credentials/OPENAI_API_KEY/credential')"
```

On studio key art: it's the distributor's copyright. A real cinema site displays it under the licence that comes with booking the film.

## Layout

```
index.html                   the prototype — page content only (see below)
assets/                      logo, posters, backdrops (sources for the injector)
tools/inject-art.mjs         packs assets/ into index.html
tools/build-standalone.mjs   wraps it into a complete document in dist/
tools/generate-art.mjs       logo / key-art generation via gpt-image-2
```

`index.html` deliberately has no `<!doctype>`, `<html>`, `<head>` or `<body>`. It's authored to publish as a Claude Artifact, which supplies that skeleton at publish time. `build-standalone.mjs` adds it back — including the viewport meta, without which a phone renders the page at desktop width — for hosting anywhere static.

Everything is one file: no build step, no framework, no dependencies. Design tokens are CSS custom properties at the top; the JS below is a small hash-free router with one delegated click handler. Films and their posted showtimes are a plain data table near the top of the script — update `FILMS` when the theatre posts a new week.

## Design

Dark and warm — near-black grounds biased brown rather than grey, warm bone text, and a single amber accent used as *emitted* light (glow, spill, gradient) rather than flat fill. Instrument Serif carries film titles the way cinemas actually set them, Archivo carries the interface, DM Mono carries showtimes, seat labels and prices. Distributor stills sit behind the hero and each film page, masked down into the ground.

On phones the poster wall becomes a list — poster left, title and tappable showtimes right — so all six films and their times fit on two screens. The hero drops its poster and lets the still carry the picture, with today's showtimes on the first screen. The booking rail becomes a bottom sheet.

Committed to a single dark theme on purpose: a lit auditorium doesn't have a light mode, and the seat map depends on glow to read. Every colour is painted explicitly so the page holds on any host background.

## Testing

Driven in Chromium at 390 and 1440px. Each pass screenshots every view, checks for horizontal overflow, watches the console, walks the full booking flow to the confirmation, and asserts the Tuesday price for two adults (2 × $8.33 + 2 × $1.50 fee + 5% GST = $20.64).
