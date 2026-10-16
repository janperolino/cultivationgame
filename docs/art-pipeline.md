# Art pipeline: GPT draws, Claude builds

Severed Heaven keeps its look, the black void, gilt gold, qi cyan and a quiet cosmic sky, and grows richer in it. GPT (image generation in ChatGPT or Codex) paints concept screens and the still art inside them. Claude writes all the code. GPT writes none.

What comes from the Jade Sanctuary prototype (Jan's Codex test, 2026-10-16, kept outside the repo) is its structure, not its jade colors: solid carved panels with real ornament at their corners instead of thin outline boxes, one painted scene at the heart of a screen, and one bright card for the thing that waits on you. The prototype also showed what to avoid: it stretched each panel image to fill its box, so the gold corners and the parchment's mountains warp whenever a panel is not the 3:4 GPT drew. Frames here are 9-slice, and paintings never stretch.

## The loop

1. **Concept.** Claude writes a concept prompt for one screen (template A) with the screen's real content, and attaches a screenshot of the current build as the content reference. Jan runs it, two to four takes, and picks one or asks GPT for edits. The pick is saved in `art/concepts/<screen>-<n>.webp` and committed, since it is the reference the build is held to.
2. **Cut list.** Claude reads the pick and writes the cut list (template B): what is art and what is code, and for each asset its id, kind, size, slice insets, budget and prompt. Jan says yes or edits.
3. **Assets.** Jan runs each asset prompt (templates C to F) with the concept attached, so GPT matches it, and drops the PNG in `art/inbox/` named by its asset id (`cultivate-scene.png`).
4. **Ingest.** `npm run art` moves the inbox files to `art/source/`, writes `src/ui/art/<screen>/<id>.webp` as the manifest says, checks the budgets and prints the sizes.
5. **Build.** Claude builds the screen: frames as `border-image`, surfaces as backgrounds, scenes as images, ornaments as images, everything else code.
6. **Compare.** Claude screenshots the build in the browser pane at 1920×1080, beside the concept, lists the differences in a line each, fixes them and compares once more. Then Jan signs off. Where the concept invented content (wrong numbers, a stat or mechanic the game lacks), the game wins.

## What is art and what is code

Art is the still set. Code is everything that reads state, changes, moves, or that a player recolors.

| Always code | Why |
|---|---|
| All text and numbers | GPT's are placeholders and often wrong; the game's copy is the game's |
| Bars, buttons and their states | they change |
| The accent on anything you can act on, and the qi cyan on qi | players recolor both in Settings; paint can't follow |
| Icons | SVG, drawn after the concept's style, tinted by tokens |
| The seated figure, its sun, shadow, qi and breakthrough scene | it shows state, and every player looks different: scenes paint the place, never the cultivator |
| The map's geometry, fog, roads, marks and labels | they come from the atlas; art gives the map only terrain surfaces, cloud stills and marker sprites |
| The day wheel, the trees' fans, the Chronicle river, the cracks | drawn from data |
| Anything that animates | art never moves |

Art can also be content, later: an item, place or beast entry names an art id, and missing art shows nothing, never a broken image. No phase does this yet.

## Asset kinds

GPT draws at its own sizes (1024×1024, 1536×1024, 1024×1536, larger where offered); each kind asks for the nearest. Screens are laid out on the stage (design.md § UI and screens, The stage): 1080 tall, 1920 wide at 16:9, everything needed inside the centre 1728, scaled as one to the window. Assets ship at twice the size they show at on the stage, so the gold stays sharp up to 4K.

| Kind | What it is | GPT makes | Ships as | Budget |
|---|---|---|---|---|
| frame | a panel's border, 9-slice | the panel on transparent, ornament only in the four corners and an even band between them, plain center | webp q90 with alpha | 150 KB |
| surface | a seamless tile: void sky, obsidian grain, gilt leaf | 1024×1024, tiling on all four sides | webp q80, 512 or 1024 square | 120 KB |
| scene | a still illustration with clear zones for text and for what code draws | the slot's shape, full-bleed | webp q84, up to 1600 on the long side | 300 KB |
| ornament | small pieces: seals, dividers, corner studs, waypoint diamonds | a sheet on an even grid, transparent (or flat #00FF00 to key out) | each piece cut, webp q90 with alpha | 30 KB |
| concept | a whole screen, reference only, never shipped | 16:9, the widest GPT offers, cropped to 16:9 | `art/concepts/`, 1920×1080 q80 | — |

A screen's art stays under 800 KB, shared assets counted once.

**Frames in CSS.** A frame drawn at 1024 with 128 px corners shows its corners at 64 px:

```css
.slab {
  border: 64px solid transparent;
  border-image: url('./art/common/slab.webp') 128 fill / 64px stretch;
}
```

`fill` paints the plain center, `stretch` pulls the even bands between corners, and the corners never scale with the panel. Padding inside sets the text clear of the gilt.

## Files and names

```
art/
  manifest.json   committed: every asset, its kind, size, slices, budget and prompt
  concepts/       committed: the picked concepts
  inbox/          ignored by git: Jan drops PNGs here
  source/         ignored by git: the originals, kept by ingest
src/ui/art/
  common/         shared frames, surfaces and ornaments
  <screen>/       one screen's own
```

Ids are kebab-case with the screen first, `cultivate-scene`, `common-slab`, `map-markers`; the file is the id. An asset renamed is renamed in the manifest and the CSS together. Art lives under `src/ui/art/` and is referenced from CSS, so Vite hashes it and the build works under a subpath.

A manifest entry:

```json
{
  "id": "common-slab",
  "kind": "frame",
  "out": "src/ui/art/common/slab.webp",
  "width": 512,
  "slice": 64,
  "quality": 90,
  "budgetKB": 150,
  "concept": "cultivate-2",
  "prompt": "Template C. Obsidian slab with an antique gold double rule..."
}
```

An ornament sheet adds `"cells": [cols, rows]` and `"pieces": ["map-marker-known", "map-marker-rumored", ...]`; a green-screen one adds `"key": "#00FF00"`.

**`npm run art`** is `tools/art.ts` run with tsx, with sharp as a dev dependency: Node only, so it runs in PowerShell (Jan's machine has no Python). It moves each `inbox/<id>.png` to `source/`, resizes, cuts sheets into pieces, keys out a green screen, writes webp, and fails when a file is over budget or a manifest asset has no source. The prompts live in the manifest, so an asset can be redrawn whenever its original is lost.

## Paint cost

- Art is static. No `backdrop-filter`, no `filter: blur` over art, and no looping animation of opacity, transform or filter on anything larger than a button.
- Backgrounds use `background-attachment: scroll`, never `fixed`, which repaints on every scroll.
- One scene per screen. Text over a scene sits on a static CSS gradient scrim, never a blur.
- Reduced motion needs nothing from art, since art never moves.

## Prompt templates

Every prompt carries the style block word for word, so the assets agree with each other.

**Style block**

> STYLE: SEVERED HEAVEN, GILDED VOID. Deep void black #040507 with a very quiet cosmic sky: sparse fine stars and faint dark nebula, never behind text. Panels are obsidian, near-black with a subtle lacquer sheen, framed in antique gold filigree #d9b46a: fine double rules, cloud-scroll and fretwork corners, small gold diamond studs. Qi is a muted cyan light #7fc7d9, used sparingly, like light leaking through hairline cracks. Warm ivory #e9e5da type, a refined serif display face with small brush hanzi beside English. Painted Chinese fantasy game art: rich detail in the ornament, calm restrained lighting, no neon, no glow haze over panels. Straight-on, orthographic, no perspective, no device frame, no watermark.

**A. Concept, one screen**

> Use case: ui-mockup. Create ONE polished desktop game screen for Severed Heaven 断天, a literary cultivation RPG, a 16:9 landscape PC monitor screen at 1920x1080 proportions, straight-on actual UI with real readable text. Keep everything the player needs inside the centre 90% of the width; the outer edges carry only scenery. The attached screenshot is the current screen: keep its content and controls, redesign its look and layout. [STYLE BLOCK] STRUCTURE: build the screen from solid carved panels with real ornament at their corners, not thin outline boxes; one painted scene is the heart of the screen; the one thing waiting on the player is the brightest panel; [layout for this screen, e.g. "character slab left, scene center, card right, routine rail above a bottom navigation"]. CONTENT, use exactly, English first with small hanzi: [the screen's real copy and numbers from the build]. Nothing over the painted scene except [list]. No invented mechanics, no extra stats, no presentation captions.

**B. Cut list** (Claude writes it, Jan reads it)

| Id | Kind | What | GPT size → ships | Slice | Budget |
|---|---|---|---|---|---|

followed by a line naming everything on the screen that stays code.

**C. Frame**

> Create ONE game UI panel frame AS AN ASSET for a coded interface, [1024x1024 / 1024x1536], straight-on, flat even lighting. [STYLE BLOCK] The frame: [from the concept, e.g. "an obsidian slab with an antique gold double rule and fretwork corners with a small diamond stud"]. For slicing: all ornament sits inside the four corner squares of 128 px; between the corners each edge is a plain even band with no motif, so it can be stretched; the four corners mirror each other; the center is plain dark obsidian and completely empty. Transparent outside the panel's edge. NO TEXT, no icons, no figures, nothing in the center, no watermark.

**D. Surface**

> Create a SEAMLESS TILEABLE texture, 1024x1024, for a game UI background. [STYLE BLOCK] Texture: [e.g. "the void sky: sparse fine stars and the faintest dark nebula"]. It must tile on all four sides with no visible seam: even density everywhere, no focal point, no vignette, no border, no text.

**E. Scene**

> Create a [portrait 1024x1536 / landscape 1536x1024] illustration AS AN ASSET, placed behind real HTML text and buttons. Use the attached concept's [part] as the reference. [STYLE BLOCK] Scene: [the place]. Paint the place only: no people, no cultivator, no creatures unless named here. Keep clear: [e.g. "the top 15% is quiet sky for a title; the floor from 55% to 95% height, center, is open, where the game draws the seated figure"]. Full-bleed, no frame, no sidebars. NO TEXT, NO LETTERS, NO NUMBERS, NO UI, NO symbols, no watermark.

**F. Ornament sheet**

> Create a sprite sheet AS AN ASSET: [N] separate game UI ornaments on a TRANSPARENT background (if transparency is not possible, a flat pure #00FF00 background with no shading or shadow), on an even [cols]x[rows] grid of [256] px cells, each piece centered in its cell with a 10% margin, none touching. [STYLE BLOCK] Pieces, left to right, top to bottom: 1. [a gold diamond waypoint, known], 2. [...]. The same light direction and the same gold on every piece. No text, no labels, no grid lines.

**When GPT drifts**, ask in the same chat: "Same image, but remove all text", "Same, but make each edge plain and even between the corners", "Same, but empty the center", "Same, but take the person out".

## Worked example: Cultivate

A sketch of the cut list for Cultivate, the home screen (the Abode until P3.7's fix), in the jade prototype's structure, painted in the gilded void. Its final form waits on a picked concept.

| Id | Kind | What | GPT size → ships | Slice | Budget |
|---|---|---|---|---|---|
| cultivate-scene | scene | a moon gate court open to the starry void, gold-inlaid stone floor, lanterns, no figure | 1024×1536 → 800×1200 | — | 300 KB |
| common-slab | frame | obsidian slab, gold double rule, fretwork corners | 1024×1024 → 512×512 | 64 | 150 KB |
| common-card | frame | the bright card: ivory silk in a gilt frame | 1024×1536 → 512×768 | 64 | 150 KB |
| common-card-ink | scene | an ink-wash mountain strip for the card's foot, fading to transparent upward | 1536×1024 → 600×400 | — | 80 KB |
| common-nav | surface | dark obsidian grain for the navigation bar | 1024×1024 → 512×512 | — | 120 KB |
| common-seals | ornament | a red seal, a gilt divider, a corner stud, a small diamond | 4×1 sheet of 256 cells | — | 30 KB each |

Stays code: the name, pronouns, realm, bars and numbers, recent events, the seated figure with its sun and qi, Attention, Gather qi, the card's title, text and choices, the routine strip, and the navigation's labels and icons.

## Settled with Jan (2026-10-16)

1. **The bright card.** The card that waits on you is ivory silk with ink wash in a gilt frame, the brightest thing on the screen, as the prototype's parchment was, since it reads at once as "this waits on you".
2. **The glass.** The cracks stay code, since they flare on a breakthrough and are seeded per life, and the void sky surface lies under them in place of today's flat black.
3. **The walking rim light.** design.md § Look's slow light walking round each panel's rim, a looping animation, goes with the gilt frames; a panel that waits on you keeps a still accent rim.
4. **Where the rule lives.** When the first screen lands, a design pass rewrites § Look as the gilded void with carved panels; until then this file is the pipeline, and § Look stands.

## The overhaul

`plan.md` runs the pipeline as phases A1 to A9, before P3.8: A1 builds the stage and `npm run art`, A2 the shell and the shared kit (and rewrites design.md § Look), then the screens one or a few at a time.
