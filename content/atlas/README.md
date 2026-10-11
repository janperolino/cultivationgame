# Severed Heaven atlas

`entries.json` holds the world: 795 entries, all still draft. It has been the source of truth since 2026-10-11, when it came over from the claude.ai atlas, which is now a frozen archive. Edit it directly, or run `node tools/atlas-serve.cjs` and open http://localhost:4321 to browse and edit it on the map; the page saves straight to this file.

## Scale

A flat disc 1,000,000 li across (radius 500,000; 1 li = 0.5 km), centered on the Ladder Stump at (0, 0). x runs east and y runs south, in li. A kingdom is 5,000–15,000 li across, a region 40,000–80,000 and a continent 200,000–300,000.

## Fields

| Field | Meaning |
| --- | --- |
| `id` | stable id, such as `qm-bianhuang` |
| `name` | English-first name, such as "The Border Wilds" |
| `pinyin`, `hanzi`, `meaning` | flavor under the name; `meaning` is rare |
| `kind` | world, continent, sea, region, kingdom, power, city, landmark, forbidden, realm (secret realm), route, era, event, race, cosmos |
| `parent` | id of the containing entry, so nesting is built in |
| `status` | `draft` or `canon` |
| `summary` | one or two sentences; the line GLM gets as a brief |
| `lore` | what the world believes; may hold `[[Name]]` links |
| `truth` | what is actually true, hidden from players |
| `notes` | author notes and open questions |
| `tags` | free-text tags; `starting kingdom` and `starting city` mark possible birthplaces |
| `way` | orthodox, demonic, buddhist, ghost, wild, sea, neutral or void (mostly on powers) |
| `terrain` | on continents, regions, seas and a few forbidden lands: plains, hills, mountains, forest, jungle, marsh, desert, steppe, ice, tundra, volcanic, plateau, twilight, islands, coast, canyon, karst, sea |
| `top` | the strongest being awake and present, counting everything inside the entry, as free text "Realm (note)"; sleepers and seals go in the note; a parent is never below its strongest awake child; empty means no cultivator of note, and unknown is a deliberate mystery; `npm run atlas:build` parses it into a strict realm plus a note |
| `map` | `x`, `y`; `r` radius in li; continents also have `rx`, `ry`, `rot`, `seed` and `rough`; powers have `sphere`, the radius of their influence in li; lines have `path` (a list of [x, y]), `style` (river, ridge, span, array, wall, road) and `width`; `inner` on the Rim is the inner radius of its ring |
| `years` | `{ from, to }` in years, negative meaning years ago (eras and events); `from` is null for the Unrecorded |
| `order`, `editedBy`, `editedAt` | bookkeeping |

## Shapes

Shapes aren't stored. The atlas draws them on the fly from the fields, and `tools/atlas-geo.cjs` reproduces that code exactly:

- Continents: a seeded noisy ellipse (`blob`) from `map`.
- Land regions: Voronoi cells around the region centers inside each continent. The page clips them to the coast with an SVG clip path; the tool returns them unclipped.
- Sea regions: circles of radius `map.r`.
- Kingdoms and forbidden lands: small blobs seeded from a hash of the id. The Scar is the exception: the page draws it as a circle from `map.r`, and the tool skips it.
- Straits (`sea` entries) carry a radius too, but neither the page nor the tool draws them yet.

`npm run atlas:build` saves these as fixed outlines in `src/content/generated/atlas.json`, rounded to 10 li, so the game never has to recompute them. It clips land region cells to the coast, and stores The Scar as a circle and the Rim as a ring.
