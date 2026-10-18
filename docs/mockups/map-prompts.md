# Map prompts (A5)

What to run in GPT for the Map, ready to paste. The map is two layers of art under the code: **the terrain painting**, one per region, and **the place pieces**, transparent, that the code stands at each place. Roads, seals, names and the fog stay code. (How we got here: `map-asset-prompts.md`.)

## 1. The terrain painting

One chat per region, at the guide's size. Paint the Border Wilds first.

| Region | Attach, in this order | Size | Save as |
|---|---|---|---|
| The Border Wilds | `art/map/qm-bianhuang/guide.png`, `art/concepts/map-1.webp` | 1024x1536 | `art/map/qm-bianhuang/painting.png` |
| The Medicine Ridges | `art/map/qm-yaoling/guide.png`, `art/concepts/map-1.webp`, the Border Wilds painting | 1536x1024 | `art/map/qm-yaoling/painting.png` |

```
Repaint the first attached image, a flat color layout guide, as a finished painted fantasy world map, night and moonlit, with the readable regions and rich painted terrain of the second attached image. Same framing and size as the guide. Keep the guide's layout EXACTLY: the coastlines, the borders between areas, the ridges and the rivers stay in the same place and the same shape.

SCALE: this is a whole country seen from very high above, thousands of miles across. Mountains, hills and karst are small and many, a fine texture of countless tiny peaks, never a few giant ones; a forest is a carpet of tiny trees; mist lies in long thin bands in the valleys.

AREAS read at a glance: each colored area is clearly its own terrain, with its own color and texture and soft but clear edges. The thin black lines are borders: paint them as faint dark seams, not walls. Colors: slate blue = karst, forests of thin stone pillars; grey = mountains, and a wide grey band is a mountain ridge, a long range of many small peaks that runs on across borders; steel blue line = a river winding in its valley; tan = rolling dry hills; pale olive = open grassland; soft green = green hills terraced with herb gardens and apricot groves; dark green = pine forest; teal = marsh, reeds and dark water; pale sand = rocky coast and dunes; mauve = blighted dead gardens, grey and withered; navy = the dark sea; flat dark grey = the land beyond, paint it as plain dark lowland in shadow, low detail.

NO PLACES AND NO ROADS: ignore the white symbols and the red lines and paint the land under them as it is around them. No buildings, no towns, no lights, no paths: only the land itself.

The land is flat to its edges and runs straight on into the land beyond: NO cliffs round it, NO floating island, NO raised slab. Only where the land meets the sea is there a coast, with surf and a few sea cliffs.

Palette: night-dark and moonlit, desaturated; slate and blue-grey stone, deep pine green, muted ochre and umber earth, dark teal water, soft mist, a faint cool rim of starlight. No neon, no glow haze, no bright daylight.

NO TEXT, no labels, no letters, no symbols left as flat shapes, no compass, no scale bar, no frame, no UI.
```

For the Medicine Ridges, add at the end:

```
The third attached image is the painting of the land next door, the Border Wilds, which this guide shows along its lower left. Paint that part to match it, and carry its light, palette, scale and level of detail on across the border without a seam. Jade Screen Ridge, the grey band, runs from here across the border into it.
```

## 1b. The detail tiles, for zooming in

The region painting is sharp from far off and soft up close. For the close zoom each region is cut into overlapping tiles, painted again at about 25 li a pixel, three times sharper, and the map fades from the region painting to the tiles as you zoom in. The wilds' terrain is the same in every world now (the region's land seed), so a painting fits every save.

The Border Wilds' 8 tiles are in `art/map/qm-bianhuang/` (moved there in A5.1): for each tile id (`0-0` to `1-3`, column then row) a `tile-<id>-guide.png` and a `tile-<id>-ref.png`, the region painting cut to that tile. One chat per tile, 1536x1024 landscape.

| Attach, in this order | Save as | Then run |
|---|---|---|
| `tile-<id>-ref.png`, `tile-<id>-guide.png`, `art/concepts/map-1.webp` | `art/map/qm-bianhuang/tile-<id>.png` | `npx tsx tools/map-fit.ts qm-bianhuang --tile <id>` |

```
The first attached image is a blurry close-up of a painted fantasy world map. Repaint it sharp and finely detailed at the same size, as if seen through a much better lens: keep EVERYTHING where it is. Every coastline, every edge between terrains, every field of stone pillars, hill, ridge, forest, lake, marsh and patch of mist stays in the same place, shape, size and color. Add only fine detail: individual stone pillars and pines, rock faces, grass and scree, ripples on water, wisps of mist.

The second attached image is the layout guide for this same area (slate blue = karst pillar forests, grey band = mountain ridge, tan = dry rolling hills, pale olive = grassland, dark green = pine forest, teal = marsh and dark water, pale sand = rocky coast, navy = the sea, flat dark grey = the land beyond). Use it only to keep the terrains true; never draw its flat colors, lines or symbols. The third attached image shows the level of painted detail and the palette wanted.

SCALE: this is still a vast land seen from very high above; a stone pillar or a peak is small, and there are many of them, never a few giant ones.

NO PLACES AND NO ROADS: no buildings, no towns, no lights, no paths, no symbols. Night-dark and moonlit, desaturated, the same palette as the first image. NO TEXT, no labels, no compass, no frame, no UI.
```

## 2. The place pieces

One image each, transparent background. Attach `art/concepts/map-1.webp` and the region's terrain painting. Save in `art/inbox/` by the id.

A place shows the first piece it has: **its own** (`map-place-<id>`), else **its kind on its terrain** (`map-place-<kind>-<terrain>`), else **its kind** (`map-place-<kind>`), else only its seal.

```
Create ONE map landmark AS AN ASSET on a TRANSPARENT background, 1024x1024, centered, its base on the lower third. Painted Chinese fantasy game art, night-dark and moonlit, desaturated, fine painterly detail, calm light from the upper left, a faint cool rim of starlight, warm lantern points only on buildings, antique gold only as small accents on roofs and gates. The same slightly oblique high view and the same scale of detail as the landmarks of the first attached image, and the palette and moonlight of the second, the land it will stand on.
The landmark: [THE PIECE].
Where it stands: [THE GROUND].
It stands on a small irregular patch of that ground (earth, rocks, a few trees, as the place would have) that fades out softly at its edges to transparent, so it settles into the land beneath. No text, no labels, no roads, no markers, no frame.
```

### The test set

| Id | The piece | The ground |
|---|---|---|
| `map-place-pacified-fort` | Pacified Fort 安边堡, the Gongsun garrison's seat and its cadet school: square stone walls on a low rise with a watchtower on every corner, a drill yard, banners, a few roofs inside | dry rolling hills, tan and umber, scrub |
| `map-place-town-hills` | a market town, a tight cluster of tiled roofs inside a low wall, one warm light | dry rolling hills |
| `map-place-cave-karst` | a dark cave mouth at the foot of a stone pillar, a faint path to it | karst: grey stone pillars, pines and mist |

### Later, as the map needs them

Kinds: city, town, village, sect, fort, checkpoint, ruin, shrine, cave, den, camp, hut, mine, graves, spring, waterfall, tree, stele, heart, realm. Terrains: karst, hills, plains, forest, marsh, coast, mountains, jungle. The named places (each atlas place and written town) get their own, drawn for where they stand.
