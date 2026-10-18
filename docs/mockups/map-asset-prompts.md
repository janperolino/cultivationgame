# The Map's standing pieces: GPT prompts (A5)

Jan's call in A5's talk: the land juts out of the map, and that is GPT's job. Code keeps the ground (the lit relief by terrain), the roads, the fog, the seals and the names. GPT paints the things that stand on it, as sprite sheets: the code puts one piece at each of the 260 marks it already places by the world seed, nearest the bottom drawn last so peaks overlap the land behind them, fixed in the world and growing with zoom.

The reference is `art/concepts/map-1.webp`, GPT's painting of the March of Pacified Borders that Jan picked ("WOAH THESE LOOK GOOD", the map only): dark peaks, pine woods and cliffs standing out of a night map, cyan rivers, clouds round it. `art/concepts/map-2.webp` is the ground the code draws under them (relief with contour lines, the region's real outline). Jan's first four inspirations are beside this file as `map-inspo-1.jpg` to `map-inspo-4.jpg`.

## How to run them

1. Attach `art/concepts/map-1.webp` to every prompt: it is both the look and the idea.
2. Run one sheet per chat, so a drift in one doesn't follow into the next. Ask for 1536×1024.
3. If GPT gives transparency, fine. Otherwise the flat magenta background is keyed out (`"key": "#FF00FF"`): magenta, not green, since half these pieces are woods.
4. When it drifts: "Same sheet, but every piece stands on the bottom of its cell", "Same, but no ground under them and no shadows", "Same, but the same light from the upper left on every piece", "Same, but keep them apart, none touching".
5. Save each pick to `art/inbox/` by its id (`map-mountains.png`, and so on).

## What every sheet keeps

- **The view.** A high three-quarter view, looking down at about 40°, as on an illustrated map: you see the front face and a little of the top. Every sheet the same angle.
- **The light.** From the upper left (the north-west), the same as the code's relief.
- **The foot.** Each piece's base sits on the bottom edge of its cell and fades out softly into nothing: no ground slab, no plinth, no cast shadow, no reflection. The code paints the ground under it.
- **The scale.** Within a sheet the pieces share one scale, about as tall as each other except where the prompt says.
- **No text, no seals, no labels, no people, no roads.**

## The style block (pasted in every prompt, word for word)

> STYLE: SEVERED HEAVEN, GILDED VOID. Painted Chinese fantasy game art for a night-dark illustrated world map: deep void black #040507 around everything, the land in dark, desaturated, moonlit tones (slate and blue-grey stone, deep pine green, muted ochre and umber earth, dark teal water), soft mist in the hollows, fine painterly detail, calm restrained lighting from the upper left, a faint cool rim of starlight, occasional tiny warm lantern points on buildings only. Antique gold #d9b46a appears only as small accents on roofs and gates. No neon, no glow haze, no saturated greens, no bright daylight.

## The sheets

Every prompt opens the same way:

> Create a sprite sheet AS AN ASSET, 1536x1024: 8 separate standing map pieces on a flat pure #FF00FF magenta background with no shading or shadow (or a transparent background), on an even 4x2 grid of 384 px cells, each piece centered left to right in its cell with its base resting on the bottom of the cell and a 10% margin at the sides and top, none touching. The pieces are seen from a high three-quarter view looking down at about 40 degrees, like the standing mountains, woods and towns of an illustrated fantasy map Match the attached map painting exactly: its pieces, palette, light and level of detail; paint them as if cut out of it. [STYLE BLOCK] Each piece's base fades out softly into nothing: no ground slab, no plinth, no cast shadow, no reflection. The same light from the upper left and the same scale on every piece. No text, no labels, no seals, no people, no roads, no grid lines, no watermark. Pieces, left to right, top to bottom:

followed by the sheet's list.

**map-mountains** (8): 1. a single sharp peak with a light snow cap; 2. a tall twin peak; 3. a long ridge of three peaks; 4. a massive broad peak, the tallest, its top in a thin wisp of cloud; 5. a jagged dark crag; 6. a peak with a small waterfall down its face; 7. a low mountain shoulder, half the height; 8. a cluster of three narrow spires.

**map-karst** (8): pillar karst like Zhangjiajie and Guilin. 1. one tall narrow stone pillar with a pine on top; 2. two pillars, one taller; 3. a cluster of five pillars of mixed heights; 4. a broad pillar with a flat wooded top; 5. a leaning pillar; 6. three short pillars in mist; 7. a pillar with a natural arch; 8. a tall cluster of seven pillars, the largest piece.

**map-hills** (8): low rolling hills, about a third the height of a mountain. 1. one round hill with grass; 2. two overlapping hills; 3. three hills in a row; 4. a hill with a few pines on its crown; 5. a terraced hill; 6. a rocky knoll; 7. a long low ridge; 8. a hill with a lone gnarled tree.

**map-forest** (8): dark temperate forest, pines and cypress with some broadleaf. 1. a dense clump of pines; 2. a wide stand of mixed trees; 3. three tall cypresses; 4. a small grove; 5. a long belt of pines; 6. a thick round copse with mist in it; 7. autumn-touched broadleaf, a few dark red leaves; 8. a large old forest mass, the largest piece.

**map-jungle** (8): dense southern jungle, palms, banyan and broad leaves, dark and humid. 1. a palm cluster; 2. a great banyan with hanging roots; 3. a dense tangle of broad-leaf trees; 4. tall trees with vines; 5. ferns and low palms; 6. a jungle mass with mist rising; 7. bamboo thicket; 8. a large jungle canopy, the largest piece.

**map-marsh** (8): low and flat, each piece wide rather than tall. 1. a tuft of reeds; 2. reeds round a small dark pool; 3. a dead tree standing in water; 4. lotus pads and reeds; 5. a long reed bed; 6. mangrove roots; 7. a pool with mist; 8. reeds with a few willows.

**map-coast** (8): 1. a sea stack; 2. a cliff headland; 3. dark rocks with a wave breaking; 4. a low rocky islet; 5. a curling wave crest; 6. a sandbar with driftwood; 7. a small lighthouse tower on rock; 8. a cluster of pine-topped rocks.

**map-plains** (8): small, low, quiet pieces, a quarter the height of a mountain. 1. tall grass tufts; 2. a lone tree; 3. a few scattered shrubs; 4. a wind-bent tree with grass; 5. a standing stone in grass; 6. a small patch of farmed fields with a hedge; 7. wildflowers in grass; 8. two trees together.

**map-places** (8), the settlements, each piece reads as its kind at a glance. 1. a walled city with a gate tower and many roofs, the largest piece; 2. a market town, a cluster of tiled roofs behind a low wall; 3. a village, a few thatched houses and a tree; 4. a sect's mountain gate, a pailou archway with pagoda roofs behind; 5. a fortified checkpoint with a watchtower; 6. a camp of tents round a fire pit; 7. a lone hut; 8. a ferry landing, a pier with a small boat.

**map-sites** (8), the wild places. 1. a cave mouth in a rock face; 2. a ruined temple, broken columns and a fallen roof; 3. a small roadside shrine with a lantern; 4. a waterfall dropping into a pool; 5. a mine entrance with timber props; 6. a field of old grave mounds; 7. a vast ancient tree; 8. a weathered stone stele.

**map-lairs** (4, a 2x2 grid of 512 px cells on a 1024x1024 sheet): a wild's heart, the beast king's ground, menacing and larger than the other sites. 1. a dark lair in a cleft of black rock, bones at its mouth; 2. a twisted grove round a glowing hollow (a faint muted cyan, the only glow on any sheet); 3. a crag with a great nest on it; 4. a black pool in a ring of standing stones.

## The ground, painted too

Jan, once the first sprites came back: the code's ground can't match them, they're high-definition. So GPT paints the ground as well, as seamless tiles, one per terrain. The code fills each terrain's area with its tile pinned to the world (it repeats, so it stays sharp at every zoom, and costs one fill per terrain a frame), lays the lit relief over it as light and shade, and blends the edges between terrains.

Every prompt (attach `art/concepts/map-1.webp` and one finished sprite sheet, so the ground matches the pieces standing on it):

> Create a SEAMLESS TILEABLE texture, 1024x1024, the GROUND of a night-dark illustrated fantasy world map, seen straight from above, as under the attached map painting's mountains and woods. Match the attached images' palette, light and level of detail exactly. [STYLE BLOCK] Texture: [the terrain]. It must tile on all four sides with no visible seam: even density everywhere, no focal point, no single big feature, no vignette, no border, no paths or roads, no buildings, no text. Flat top-down, no perspective, no horizon.

**map-ground-karst**: grey-blue limestone ground seen from above, crowded with the tops of small stone pillars and sinkholes, moss in the cracks.
**map-ground-mountains**: bare slate rock and scree from above, ridged and cracked, patches of snow in the hollows.
**map-ground-hills**: rolling dry grass and earth from above, umber and muted ochre, small rocks and scrub.
**map-ground-plains**: short dark grass and soft earth from above, faint field strips, very quiet.
**map-ground-forest**: a dense pine canopy seen from straight above, deep teal-green, dark gaps between crowns.
**map-ground-jungle**: a thick broad-leaf canopy from straight above, dark green, humid, tangled.
**map-ground-marsh**: dark wet ground from above, pools of black-teal water among reeds and mud.
**map-ground-coast**: pale grey sand and dark wet rock from above, thin bands of surf foam.

## The region painted whole, from a guide

Jan, after seeing the pieces stood on the code's ground: "they look terrible". Stamped pieces read as stickers, each on its own puff of mist, on ground that isn't theirs; map-1 works because it is one painting. So GPT paints each region whole, held to the atlas by a guide.

Jan's call after GPT's own advice: the terrain is painted whole (painted apart it reads as stickers), and the places stand on it as transparent pieces the code places at the atlas's spots, sharp at every zoom and swapped when a place changes. So the region painting has no buildings, no roads and no clearings (Jan's calls): roads stay code since the fog knows each road apart, and places come and go (seeded sites, M4's abodes, M5's sects), so each piece brings its own patch of ground instead.

The first painting (2026-10-17) held the guide well, but Jan's notes: the cities he liked in map-1 weren't there (the prompt asked for tiny roofs), the mountains were far too big for a land this size, the areas and places should read much more clearly, and it came as a floating slab with cliffs all round, where regions must join as one continent (Jan's call: joined land). The prompt below answers each.

**The guides.** `npx tsx tools/map-guide.ts <region> --draft docs/mockups/medicine-ridges-draft.json` draws a region from the atlas with its neighbours and the sea: `map-guide-qm-bianhuang.png` (the Border Wilds) and `map-guide-qm-yaoling.png` (the Medicine Ridges, next door across the Border Wilds' north-east edge, drafted for this test only). Each has a json saying where it sits in the world. GPT paints the whole frame, neighbours too; the code cuts each painting to its own region's outline, so no transparency is needed and two regions meet edge to edge.

**How to run.** One chat per region, at the guide's size (the Border Wilds portrait 1024x1536, the Medicine Ridges landscape 1536x1024). Save as `docs/mockups/map-painting-qm-bianhuang.png` and `docs/mockups/map-painting-qm-yaoling.png`. Paint the Border Wilds first: the Medicine Ridges' prompt attaches it, so the two match at their border.

Attach: 1. the region's guide, 2. `art/concepts/map-1.webp`, 3. the first Border Wilds painting (for its finish), and for the Medicine Ridges 4. the new Border Wilds painting.

> Repaint the first attached image, a flat color layout guide, as a finished painted fantasy world map, night and moonlit: the cities, readable regions and painted landmarks of the second attached image, with the rich painted finish of the third. Same framing and size as the guide. Keep the guide's layout EXACTLY: the coastlines, the borders between areas, every road and every symbol stay in the same place and the same shape.
> SCALE: this is a whole country seen from very high above, thousands of miles across. Mountains, hills and karst are small and many, a fine texture of countless tiny peaks, never a few giant ones; a forest is a carpet of tiny trees; mist lies in long thin bands in the valleys.
> AREAS read at a glance: each colored area is clearly its own terrain, with its own color and texture and soft but clear edges. The thin black lines are borders: paint them as faint dark seams, not walls. Colors: slate blue = karst, forests of thin stone pillars; grey = mountains, and a wide grey band is a mountain ridge, a long range of many small peaks that runs on across borders; steel blue line = a river winding in its valley; tan = rolling dry hills; pale olive = open grassland; soft green = green hills terraced with herb gardens and apricot groves; dark green = pine forest; teal = marsh, reeds and dark water; pale sand = rocky coast and dunes; mauve = blighted dead gardens, grey and withered; navy = the dark sea; flat dark grey = the land beyond, paint it as plain dark lowland in shadow, low detail.
> NO PLACES AND NO ROADS: ignore the white symbols and the red lines and paint the land under them as it is around them. No buildings, no towns, no lights, no paths: only the land itself.
> The land is flat to its edges and runs straight on into the land beyond: NO cliffs round it, NO floating island, NO raised slab. Only where the land meets the sea is there a coast, with surf and a few sea cliffs.
> NO TEXT, no labels, no letters, no symbols left as flat shapes, no compass, no scale bar, no frame, no UI.

For the Medicine Ridges, add at the end:

> The fourth attached image is the painting of the land next door, the Border Wilds, which this guide shows along its lower left. Paint that part to match it, and carry its light, palette, scale and level of detail on across the border without a seam.

## The places, as transparent pieces

What stands on the painted land at each place, with the code's seal and name over it. A place shows the first piece it has: **its own** (`map-place-<id>`), else **its kind on its terrain** (`map-place-<kind>-<terrain>`), else **its kind** (`map-place-<kind>`), else only its seal. Missing art never breaks the map.

- **Its own**: the named places, an atlas place or a written town, each drawn for where it stands (Pacified Fort on its rise in the hills, a ford on its river).
- **Kind on terrain**: everything else, the seeded sites most of all, so every cave in the karst is a karst cave. Kinds: city, town, village, sect, fort, checkpoint, ruin, shrine, cave, den, camp, hut, mine, graves, spring, waterfall, tree, stele, heart, realm. Terrains: karst, hills, plains, forest, marsh, coast, mountains, jungle. Made as the map needs them, not all at once.

Run each as its own image with a transparent background, attaching `art/concepts/map-1.webp` and the region's painting so it matches:

> Create ONE map landmark AS AN ASSET on a TRANSPARENT background, 1024x1024, centered, its base on the lower third. [STYLE BLOCK] The same slightly oblique high view and the same scale of detail as the landmarks of the first attached image, and the palette and moonlight of the second, the land it will stand on. The landmark: [the piece]. Where it stands: [the terrain and what is round it]. It stands on a small irregular patch of that ground (earth, rocks, a few trees, as the place would have) that fades out softly at its edges to transparent, so it settles into the land beneath. No text, no labels, no roads, no markers, no frame.

The test set:
- **map-place-pacified-fort**: Pacified Fort 安边堡, the Gongsun garrison's seat and its cadet school in the March of Pacified Borders: square stone walls on a low rise with a watchtower on every corner, a drill yard, banners, a few roofs inside. Where: dry rolling hills, tan and umber, scrub.
- **map-place-town-hills**: a market town, a tight cluster of tiled roofs inside a low wall, one warm light. Where: dry rolling hills.
- **map-place-cave-karst**: a dark cave mouth at the foot of a stone pillar, a faint path to it. Where: karst, grey stone pillars, pines and mist.

## What happens next

Claude cuts each sheet into its pieces (`npm run art`), checks them on the live map at every zoom and writes the manifest entries. Ten sheets of eight at about 25 KB a piece is near 2 MB, more than a screen's 800 KB: the pieces ship at the size they look right at, and if the Map needs more, that is Jan's call on its budget.
