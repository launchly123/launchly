# Portfolio scroll assets

## How these were made

Captured headless from the live site, not hand-screenshotted:

- `scratchpad/capture-tiled.js` — drives Brave headless, walks the page to
  trigger every lazy loader, neutralises fixed/sticky elements, then captures in
  3600px tiles and stitches them with sharp.

Two things make the naive approach fail, and both cost real debugging time:

1. **`fullPage: true` corrupts past ~16384px.** That's Chromium's max texture
   size. The deMiguel homepage is 16988px tall, so a single fullPage capture
   duplicated the header and hero into the tail and truncated Visítanos. Tiling
   under the ceiling is the fix.
2. **Puppeteer's `clip` is document-relative, not viewport-relative.** Scrolling
   to a tile and passing `y: 0` captures the top of the page every time. The clip
   `y` must be the absolute document offset.

Fixed/sticky elements are pinned to their document position before tiling —
otherwise the site's sticky header reappears in every tile, stamping a row of
duplicate headers down the stitched image.

## Files

| File | Dimensions | Size | Used for |
|---|---|---|---|
| `demiguel-scroll.webp` | 1200 × 14157 | 526 KB | Desktop scrub |
| `demiguel-scroll-mobile.webp` | 560 × 6606 | 152 KB | Phone / tablet |

The mobile variant is not just a bandwidth saving. The desktop image is 17
megapixels — roughly 68 MB once decoded to RGBA — which is at the edge of what
older iPhones will decode before Safari drops the image entirely.

## Anchor positions

Measured from the live DOM (`scratchpad/measure.js`), in the **1200px-wide
exported image's** coordinate space — these are where callouts should pin:

| Anchor | y in exported image |
|---|---|
| EN/ES language toggle | 37 |
| WhatsApp reserve button | 31 |
| First COP menu price | 2284 |
| Google Maps embed | 13851 |

Section offsets: `historia` 738 · `parrilla` 1387 · `menu` 2035 · `brunch` 5236 ·
`postres` 6823 · `vinos` 7527 · `bebidas` 10620 · `galeria` 12195 ·
`visitanos` 13251 · total height 14157.

## Known flaw

The Google Maps embed renders as an empty grey box. It's a cross-origin iframe
and does not paint in headless Chromium. It sits at y≈13851, near the very
bottom of the image. Either leave it, trim the image before `visitanos`, or drop
in a real map screenshot over that region.

## Refreshing after the client site changes

```bash
cd <scratchpad> && node capture-tiled.js && node measure.js
```

Then re-encode both WebP variants and re-check the anchor table above — the
offsets move whenever deMiguel's content changes.
