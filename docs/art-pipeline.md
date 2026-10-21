# Art pipeline: GPT draws, Claude builds

Severed Heaven keeps its look, the black void, gilt gold, qi cyan and a quiet cosmic sky, and grows richer in it. GPT (image generation in ChatGPT or Codex) paints concept screens and the still art inside them. Claude writes all the code. GPT writes none.

What comes from the Jade Sanctuary prototype (Jan's Codex test, 2026-10-16, kept outside the repo) is its structure, not its jade colors: solid carved panels with real ornament at their corners instead of thin outline boxes, one painted scene at the heart of a screen, and one bright card for the thing that waits on you. The prototype also showed what to avoid: it stretched each panel image to fill its box, so the gold corners and the parchment's mountains warp whenever a panel is not the 3:4 GPT drew. Frames here are 9-slice, and paintings never stretch.

## The loop

1. **Concept.** Claude writes a concept prompt for one screen (template A) with the screen's real content, and attaches a screenshot of the current build as the content reference. Jan runs it, two to four takes, and picks one or asks GPT for edits. The pick is saved in `art/concepts/<screen>-<n>.webp` and committed, since it is the reference the build is held to.
   **Room to grow** (Jan's call, 2026-10-21): a screen is painted now, not once its features stop changing, so the concept leaves room for what later phases add: a tab more in a row, a column that scrolls inside, a quiet zone in the scene, a panel's place. Only the backdrop and the ornaments are paint; a later feature slots in as code in the kit with no repaint. The talk goes over what later phases might add (How each session runs) and the prompt names that room. A screen that doesn't exist yet is built in the kit by the phase that adds it, which paints nothing; painting it is an A phase Jan takes up when he gets to it, with no fixed slot (Jan's call: "I'll do it when I get to it").
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
| The seated figure, its sun, shadow, qi and breakthrough scene | it shows state, and every player looks different: a scene paints the place and at most a featureless black silhouette on the seat, which then is the figure, the code's own shape kept unseen exactly over it for the qi to run in (A3) |
| The map's geometry, fog, roads, marks and labels | they come from the atlas; art gives the map only terrain surfaces, cloud stills and marker sprites |
| The day wheel, the trees' fans, the Chronicle river, the cracks | drawn from data |
| Anything that animates | art never moves |

Art can also be content: an item, beast, card or encounter entry names an art id, and missing art shows nothing, never a broken image (§ Content art, A11).

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
  map/<region>/   committed: the travel map's guide, painting, fits and detail tiles (A5.1;
                  the upscaled tiles and references ignored, rebuilt by the tools)
public/map/<region>/  committed: what the Map loads, the painting as webp and the tiles' chunks
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

**`npm run art`** is `tools/art.ts` run with tsx, with sharp as a dev dependency: Node only, so it runs in PowerShell (Jan's machine has no Python). It moves each `inbox/<id>.png` to `source/`, resizes, cuts sheets into pieces, keys out a green screen, writes webp, and fails when a file is over budget, a screen's art passes 800 KB or a manifest asset has no source. The manifest's `maps` lists each painted region of the travel map with its own budget, at most 60 MB (A5.1, raised from 25 in A5.3): the run fails when a region's `public/map/<region>/` has no `painting.webp` or passes its budget. The manifest is `{ "assets": [ ... ] }`, checked before anything is written; a concept's budget is 600 KB. `npm run art -- --root <dir>` runs it on another folder. The prompts live in the manifest, so an asset can be redrawn whenever its original is lost.

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

> Use case: ui-mockup. Create ONE polished desktop game screen for Severed Heaven 断天, a literary cultivation RPG, a 16:9 landscape PC monitor screen at 1920x1080 proportions, straight-on actual UI with real readable text. Keep everything the player needs inside the centre 90% of the width; the outer edges carry only scenery. The attached screenshot is the current screen: keep its content and controls, redesign its look and layout. [STYLE BLOCK] STRUCTURE: build the screen from solid carved panels with real ornament at their corners, not thin outline boxes; one painted scene is the heart of the screen; the one thing waiting on the player is the brightest panel; [layout for this screen, e.g. "character slab left, scene center, card right, routine rail above a bottom navigation"]. CONTENT, use exactly, English first with small hanzi: [the screen's real copy and numbers from the build]. Nothing over the painted scene except [list]. ROOM TO GROW: [what later phases add here, e.g. "the tab row has space for two more tabs; the right column scrolls inside its panel"]. No invented mechanics, no extra stats, no presentation captions.

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

**When GPT drifts**, ask in the same chat: "Same image, but remove all text", "Same, but make each edge plain and even between the corners", "Same, but empty the center", "Same, but take the person out". Two things it does that ingest has to meet (A2): a frame comes with a transparent margin round the panel, so trim it before measuring the slice; and an ornament sheet rarely keeps its grid, a long piece running into its neighbour's cell, so re-lay the pieces by the gaps between them onto an even grid before `npm run art` cuts it.

## Worked example: Cultivate

A sketch of the cut list for Cultivate, the home screen (the Abode until P3.7's fix), in the jade prototype's structure, painted in the gilded void. Its final form waits on a picked concept.

| Id | Kind | What | GPT size → ships | Slice | Budget |
|---|---|---|---|---|---|
| cultivate-scene | scene | the cave abode (as built in A3: a cliff hall open on misty peaks, the black silhouette on its dais) | 1536×1024 → 1536×1024 | — | 300 KB |
| common-slab | frame | obsidian slab, gold double rule, fretwork corners | 1024×1024 → 512×512 | 64 | 150 KB |
| common-card | frame | the bright card: ivory silk in a gilt frame | 1024×1536 → 512×768 | 64 | 150 KB |
| common-card-ink | scene | an ink-wash mountain strip for the card's foot, fading to transparent upward | 1536×1024 → 600×400 | — | 80 KB |
| common-nav | surface | dark obsidian grain for the navigation bar | 1024×1024 → 512×512 | — | 120 KB |
| common-seals | ornament | a red seal, a gilt divider, a corner stud, a small diamond | 4×1 sheet of 256 cells | — | 30 KB each |

Stays code: the name, pronouns, realm, bars and numbers, recent events, the seated figure with its sun and qi, Attention, Gather qi, the card's title, text and choices, the routine strip, and the navigation's labels and icons.

## Settled with Jan (2026-10-16)

1. **The card that waits on you.** First settled as ivory silk with ink wash in a gilt frame; in A2's study Jan chose it dark like the panels, edged in hairlines, its first choice in the accent (`docs/mockups/shell-study.html`).
2. **The glass.** The cracks stay code, since they flare on a breakthrough and are seeded per life, and the void sky surface lies under them in place of today's flat black.
3. **The walking rim light** goes; a panel that waits on you keeps a still accent glow. A2 also dropped the 9-slice slab frames for single CSS hairlines (Jan: thin and sleek over carved), so frames as art are for a screen that wants one.
4. **Where the rule lives.** design.md § Look, rewritten in A2.

## Content art (A11)

Jan's call, 2026-10-21: the things inside the screens get pictures, trickled in like A5.4 whenever there is ChatGPT time, never blocking a phase.

- **The hook.** An item, beast, enemy, card or encounter entry may name an `art` id. One without falls back to its kind's picture (every pill shows a pill, every talisman a talisman), and a missing file shows nothing. Rarity stays code, the rim and glow the game draws, so one icon serves every rarity.
- **Item icons:** about 290 items, painted as ornament sheets (template F) of 16 on a 4×4 grid of 256 px cells, one object a cell on transparent, lit as the style block says, no frame or rim of its own; about 19 sheets, kind by kind; shipped at 128 px (64 on the stage). Shown in the Bag, shop rows, recipes, loot and the +n on gains.
- **Beasts and enemies:** 35, a painted bust each, on 2×2 sheets of 512 px cells (9 sheets), shipped at 512; shown in the square and on the fight screen.
- **Vignettes:** about 40 scenes (template E, landscape) shared by tag across the cards and encounters: a road ambush, a herb find, ruins, a sect gate, an elder, a storm, a night camp and so on; each card or encounter names one; shown at 720×380 in the square (design § Story cards and events, The square), so painted landscape and shipped at 1440×760, about 150 KB.
- **Portraits by type** (Jan's call, 2026-10-21: faces now): about 48, a man or a woman, young, middle-aged or old, and eight kinds (cultivator, merchant, scholar, farmer, guard, elder, rogue, beast-tamer), busts on 2×2 sheets of 512 px cells (12), shipped at 512. A person's seed picks one that fits; the cast list (design § Still to design, NPC depth) brings the cast's own faces and other races', which replace them.
- **Places paint their own** (A6): a banner scene and the doors as one sheet, a 3×3 grid of door scenes, about two runs a place, never a picture shared by kind; the five inspo favorites (`docs/mockups/inspo/`) are the layouts, not the light.
- **Order:** items first (the Bag and shops show the most), then faces, beasts, then vignettes. About 80 ChatGPT runs in all, each loaded only when shown.

## Sound (S1)

Jan's call, 2026-10-21. The same split as the art: Jan gathers or generates, Claude writes the cue list and the code.

- **Where it comes from.** Effects and ambience free first: CC0 (Kenney's audio packs, Sonniss's GDC bundles, Freesound's and OpenGameArt's CC0), CC-BY with its credit line kept, never a NonCommercial licence (it would bar Steam) or a file whose source is unclear. Music by AI on a paid plan that grants its use (Suno or Udio) in Chinese instruments, guzheng, dizi, erhu, pipa, guqin and xiao, with free tracks where good ones turn up. Steam would want the AI music disclosed beside the art.
- **The cue list.** Claude writes it per phase: each cue's id, the engine event it plays on, and search terms for a free sound or a prompt for the music.
- **Files.** `sound/inbox/` (ignored) for what Jan drops, named by cue id; `sound/manifest.json` (committed): each sound's id, kind (music, ambience or effect), source URL, licence and credit; `npm run sound` writes MP3s under `src/ui/sound/` and fails on a sound with no licence or credit, or over budget.
- **Budgets, as loading hygiene:** a track about 3 MB at 128 kbps, streamed when first played; an ambience loop about 1 MB; an effect under 50 KB, loaded with its screen.
- **Credits:** the manifest's credits are listed in Settings.

## The overhaul

`plan.md` runs the pipeline as phases A1 to A10 (the backlog since 2026-10-18; A10 Crafts added 2026-10-21): A1 builds the stage and `npm run art`, A2 the shell and the shared kit (and rewrites design.md § Look), then the screens one or a few at a time, painted now with room to grow; a new screen is built in the kit by its phase and waits for an A phase, taken up when Jan gets to it.

## The travel map: a region painted whole (A5)

Jan's call in A5: the Map's land is painted, not drawn. Stamped sprites on a code ground read as stickers; a whole painting holds together. Each region is painted once by GPT from a guide drawn off the atlas, then sharpened in detail tiles for the close zoom, so the map shows one picture at every zoom. The places stand on it as transparent pieces and the roads, seals, names and fog stay code. The look is **take D**: the peaks and stone pillars jut up out of the map with real height and shadow, at half the scale of Jan's first painting, tilted about 50° like a carved relief model, moonlit but clear, in a xianxia mood (seas of cloud round the karst, ink-wash ridges, faint cyan qi). The Border Wilds' is `docs/mockups/map-takes/bw-take-D.png`.

The land a painting shows is the region's own: the wild tracts' cells are seeded by the region's `landSeed`, the same in every world, so one painting fits every save (save v29). What stands on the land (sites, road bends, hearts) still varies by world, which is why places are pieces, not paint.

**For a region** (the key is `OPENROUTER_API_KEY` in `.env.local`; images are `openai/gpt-5.4-image-2`, about $0.21 each):

| Step | Tool | Cost |
|---|---|---|
| 1. Content: the region's atlas fields, towns, roads and `landSeed` (a region file and a content entry, as the Border Wilds has) | by hand | the atlas fill |
| 2. Guide: the region from the atlas, each terrain a flat color, roads red, a symbol a kind of place, the sea and neighbours | `npx tsx tools/map-guide.ts <region>` | free |
| 3. Painting, take D, attaching the finished neighbours' paintings so the borders match | `npx tsx tools/map-paint.ts region <region> art/map/<region>/painting.png --take D` | ~$0.20 |
| 4. Fit: GPT squashes and shifts; the fit lays the painted sea and land beyond on the guide's | `npx tsx tools/map-fit.ts <region>` | seconds |
| 5. Tiles: a grid at 25 li a pixel, overlapping a tenth, skipping a tile under 8% region; each a guide and a reference cut from the fitted painting | `npx tsx tools/map-guide.ts <region> --tiles` | free |
| 6. Each tile painted again closer, with the cultivation details, then fitted by color with its tone | `map-paint.ts tile <region> <id>`, then `map-fit.ts <region> --tile <id>` | ~$0.21 a tile |
| 7. Each tile upscaled 4× (Real-ESRGAN x4plus, Qualcomm's ONNX build in `tools/models/`, git-ignored) and cut into a pyramid of 512 px chunks with its tone and feathered edges baked in | `map-upscale.ts`, then `map-chunks.ts <region> <id>` | ~7 min a tile on Jan's PC |
| 7b. A tile GPT got wrong (A5.1: Stone Eyes' karst painted as a lake): paint the wrong thing out of its reference, repaint with a note saying what is there, fit, upscale and chunk it, then lay it back into the region painting so the old one can't show where tiles fade | `map-paint.ts tile <region> <id> --ref <fixed ref> --note "<what it is>"`, then `map-patch.ts <region> <id>` | ~$0.21 a tile |
| 8. Ship: `map-chunks.ts` writes the painting as webp and the chunks to `public/map/<region>/` and each pyramid into `tiles.json`; add the region to the manifest's `maps` and run `npm run art` for its budget | `npx tsx tools/map-chunks.ts <region> [<tile> ...]` | seconds |

The working files are in `art/map/<region>/` (`tools/map-paths.ts`): `guide.png` and `guide.json` (its frame, and the fit once painted), `painting.png`, `tiles.json` (each tile's frame, fit, tone and pyramid) and `tile-<id>.png` with its guide; the references and the upscaled tiles are git-ignored. A region is painted, to the game, once its guide has a fit.

The Border Wilds took 8 tiles; South of the Tides would take about 10. So about $2 to $3 and an hour a region, almost all of it the upscale running in the background.

**How the map draws it** (`src/ui/map/art.ts`, the fog in `src/ui/map/fog.ts`, both from the study `docs/mockups/map-ground-study.ts`): each painting through its fit, cut to its region plus the sea, so neighbours meet edge to edge and the coast's surf stays; the tiles over it at every zoom, each from the pyramid level the zoom needs and only its chunks on screen, so the land never changes as you zoom and a frame costs one to two milliseconds; the zoom stops at about 0.16 px a li, where the upscaled tiles run out. Close in, the places painted in and the site pieces are the next tier of detail.

## Places painted into the map (A5.3)

A fixed place, an atlas place or a written town, is painted into the land itself, never stood on it as a piece (A5.1's dioramas read as stickers). Seeded sites move between worlds, so they can't be painted in: most stay seals, and the few that read as land from that height (herb valleys, springs, waterfalls, ancient trees) stand as transparent pieces, several variants a kind, a site picking one by its id and spot (`src/ui/map/draw.ts`).

**The scale rule, and Jan's grandeur.** A square is about 3,000 km across, 6 li (3 km) a pixel, so an ordinary wall, roof or town is smaller than a pixel. What shows is what cultivation built, and it is drawn larger than life, as the painting draws its peaks (Jan's call: the truly big things look grander, art over strict scale): tiered pagodas, palace halls with upturned golden eaves, pavilions on cliff edges, carved stairs and jade bridges, walls as tall as cliffs, formation arrays as domes or rings of runes, spirit-fire as pillars, beast-king skulls the size of hills. Chinese cultivation-game xianxia, never medieval and never sci-fi: rock stays crags and cliffs, never silos or machines. ChatGPT paints larger than it is asked, so the prompt asks small and caps it at a fifth of the image.

**Each place has its own folder** (`tools/map-paths.ts`), named in English, in `art/map/<region>/places/To paint/` until it is laid in and in `Done/` after: `crop.png`, `prompt.txt`, `place.json` (its frame and id) and `painted.png`. Jan attaches the crop and the prompt together in ChatGPT and edits from there, and drops the result anywhere in `To paint/` under ChatGPT's own name: the tool matches it to its crop by the edge the prompt keeps and files it. A painting for a place already done replaces it, the old one kept in `places/takes/` (git-ignored).

| Step | Tool | Cost |
|---|---|---|
| 1. Cut the place's square into its folder: 6,000 li at 1,024 px, every covering x4 tile blended and toned; a place longer than a square as a strip (`--size 7000x10500`, 1,024 × 1,536 px); the prompt written beside it | `npx tsx tools/map-crop.ts <region> <place> [--size <w>x<h>]` | free |
| 2. Jan paints the place into its centre in ChatGPT, the crop and prompt attached; the result dropped in `To paint/` | ChatGPT | Jan's plan |
| 3. Lay every painted place back, in the order they were painted: loose paintings filed, each fitted to its crop (scale, shift and tone, by its untouched edge), its middle and whatever GPT changed laid into the painting, the tiles and their x4 with a feathered mask, its glow baked, the chunks shipped, and the new ones moved to `Done/` | `npx tsx tools/map-place.ts <region> [--check]` | about four minutes in all |

The tool starts each run from the unpainted tiles and painting it keeps in `places/unpainted/` (git-ignored), so a run can be repeated; a tile painted or upscaled again since the last run is taken as its new unpainted self. `--check` stops before laying anything and writes `unpainted/<place>-check.jpg`, the painting as it would be laid with its glow. Cut a place before painting it in, since a cut after shows the painted place, and where two squares overlap, cut the later one after the earlier is laid in, so its painting keeps the first.

**The glow.** What GPT changed is the place's shape, found by comparing the painting with its crop once both are softened (GPT redraws the land's texture everywhere; only the place changes its colour and light). An outline traced from it read badly, since GPT's added mist makes a ragged edge, so the shape is baked into a soft gold glow instead (Jan's call), `public/map/<region>/places/<place>-glow.webp`, gathered at the place's rim. The map draws it static, with a screen blend, always close in where the seal gives way, and on hover from afar.

**The prompt** is written from the place's data, never by hand (Jan's call: it should carry everything the game knows); `npx tsx tools/map-prompt.ts <region> <place> ...` writes it again after the data changes. It gives the crop's size in km, says to paint the place into the centre and keep the outer 15% pixel for pixel, paints from its `fromAbove`, sizes it (about 170 px for a city, 130 for a seat or sect, 80 for a village, never past a fifth of the image; a long landmark runs the image's length, a land bigger than the crop fills it), says a city or seat is lived in (filled with halls, pagodas, terraced streets and lamp light) and a sect's seat is crowned with halls, states the style, and gives for mood its name, its way for a sect, where it stands, its summary, lore, features, people and the region's own `fromAbove`. So a place's look is set by its `fromAbove` and lore: to paint it differently, change those (Pacified Fort became a war city that way; Beast-Butcher Gate's "blood-red sect array" pulled it toward demonic though it is orthodox).

**The API was tried and set aside** (Jan's call): `map-paint.ts place <region> <place>` paints from the same crop and prompt through OpenRouter at about $0.25 and two minutes a place. It kept the land better than ChatGPT but painted the places less well, so places are ChatGPT's.
