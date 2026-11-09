# Saber Workshop

A planner for LamaDiLuce Polaris sabers: assemble up to four weapons (swords, daggers, staffs) from
the store's parts or custom-coated ones, see each hilt rendered to scale, check it against the
official Polaris length classes, and compare them side by side.

**Live:** https://uapcent.github.io/saber-workshop/ (unofficial; not affiliated with LamaDiLuce)

## Running it

Built with React, TypeScript and Vite. Needs Node.js 20 or newer.

```bash
npm install
npm run dev        # http://localhost:5173
npm run build      # static site in dist/ (serve it from any web server)
npm run typecheck
```

Every push to `main` builds the site and publishes it to GitHub Pages (`.github/workflows/pages.yml`).

`legacy/index.html` is the original single-file version, kept for reference.

## Files

- `src/data/catalog.ts` – finishes, store prices, stock and product ids.
- `src/data/models.ts` – part models, styles, blade colors and presets.
- `src/lib/saber.ts` – store status, totals, length classes, warnings and share codes.
- `src/lib/geometry.ts`, `src/lib/color.ts` – outline paths and shading.
- `src/components/graphics/` – SVG rendering of hilts, blades and whole sabers.
- `src/components/` – top bar (saber tabs, Add saber menu), Parts and Saber panels, pinned saber, compare section, shopping list.
- `src/lib/storeFeed.ts` – the store-updates bell: reads lamadiluce.it's public WooCommerce product feed in the browser and compares it with the catalog (new hilt parts, stock and price changes).
- `src/state/workshop.ts` – app state (1 to 4 sabers, saved designs) and localStorage persistence.
- `docs/phone-layout.md` – notes for a future phone layout (not implemented).
- `data/profiles.json` – part outlines as `[x mm from the pommel side, radius mm]` pairs, imported by the app.
- `data/build_profiles.py` – regenerates `profiles.json` from the raw measurements.
- `data/details.json` – grooves, holes, knurling and ribs drawn inside the legacy parts' outlines.
- `data/build_details.py` – regenerates `details.json` from the size chart (needs Pillow).
- `reference/` – the official Polaris drawings the outlines were traced from. Not in the repository
  (LamaDiLuce's material): to rerun `build_details.py`, save the official "Polaris Modular Hilts" size
  chart (725 × 1024 px) as `reference/polaris-size-chart.png`.

Saved designs and share codes from the original version still work (same storage key and code format).

## Where the numbers come from

- **Prices and stock:** lamadiluce.it store, 9 Nov 2026 (in `src/data/catalog.ts`).
- **Finish colors:** sampled from the store's product photos (shadow, body and highlight tones of the
  part's pixels). EVO "Microtextured Color" finishes are drawn matte with a fine grain, thin rings glossy.
  Solar Flare is estimated (its only photo shows a lit saber).
- **EVO lengths (published):** emitter 64 mm (46 visible), main body 180 mm, Mini body 150 mm,
  pommel 52 mm (34 visible), Mini pommel 28 mm (20 visible), ring 10 mm × 38 mm,
  thin ring 3.3 mm, EVO coupler separates bodies by 70 mm.
- **Length classes:** Short 18–26 cm, Long 26–32 cm, Staff 41–54 cm, InCom tolerance ±2 mm.
- **Outlines:**
  - SSe-3 body/emitter, Pommel Adaptor masks: official exploded diagram (to scale, 110 px = 38 mm).
  - SSe-1, SSe-2, X2, Artiglio, SSe-1/2 emitters and pommels: official size chart (141 px = 200 mm).
  - EVO emitter, main body, pommel: measured from the product photos (Dark Matter), fitted to the
    published lengths and 38–39 mm diameters; the angled body photo is perspective-corrected.
  - NXT and EVO2 emitters: side silhouettes measured from the aluminum product photos, stretched to
    46 mm; their slots, fins and holes are placed by eye from the photos. Lengths are not published, so
    they stay marked "approx.".
  - EVO Mini body and Mini pommel are scaled from the EVO parts (marked "approx.").
- **Surface detail:**
  - Every corner of an outline is drawn as a turned edge, and each cone of the outline is shaded by
    the way it faces, so all parts get their machined lines automatically.
  - Legacy parts: grooves, holes and knurling are read from the size chart by `data/build_details.py`
    (1.4 mm per pixel); the SSe-3 body ribbing is entered by hand in the same script.
  - EVO emitter and main body: set screws, holes and band grooves read by eye from the lamadiluce.it
    product photos (`src/data/models.ts`).

## Improving accuracy

A straight side photo of a part (camera ~1 m away, zoomed, plain background) can be measured the
same way and dropped into `PHOTO` in `data/build_profiles.py` and run `python data/build_profiles.py`; the app picks up the new
`profiles.json` automatically.

## My saber (preset "Yin")

Polaris EVO Emitter, Main Body and Pommel in Dark Matter, LamaDiLuce Ring, Anima NXT, lens for
LED RGBW, brass mass, universal threaded plate, long Combat Ready blade.
