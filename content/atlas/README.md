# Severed Heaven atlas

`entries.json` holds the world: 795 entries. The Border Wilds and its nine children are canon since D2 (2026-10-12), and since P3.1 (2026-10-15) carry every field below; the rest are draft and take the P3.1 fields in the atlas fill. It has been the source of truth since 2026-10-11, when it came over from the claude.ai atlas, which is now a frozen archive. Edit it directly, or run `node tools/atlas-serve.cjs` and open http://localhost:4321 to browse and edit it on the map; the page saves straight to this file.

## Scale

A flat disc 1,000,000 li across (radius 500,000; 1 li = 0.5 km), centered on the Ladder Stump at (0, 0). x runs east and y runs south, in li. A kingdom is 5,000–15,000 li across, a region 40,000–80,000 and a continent 200,000–300,000.

**Write at that size** (A5.2). A kingdom is the size of Australia and a region five times Earth's land, so nothing in the atlas is sized for mortals on foot: a written town is the seat of a county the size of a country, a wall is thousands of li long, and the grand things are what cultivation built. Before writing an entry, read design § World bible, The world at its true size and How many live there, and give every place and power `prosperity`, `population`, `size` and `fromAbove` by them. The Border Wilds are the worked example.

## Fields

| Field | Meaning |
| --- | --- |
| `id` | stable id, such as `qm-bianhuang` |
| `name` | English-first name, such as "The Border Wilds" |
| `pinyin`, `hanzi`, `meaning` | flavor under the name; `meaning` is rare |
| `kind` | world, continent, sea, region, kingdom, power, city, landmark, forbidden, realm (secret realm), route, era, event, race, cosmos, site |
| `parent` | id of the containing entry, so nesting is built in |
| `status` | `draft` or `canon` |
| `summary` | one or two sentences; the line GLM gets as a brief |
| `lore` | what the world believes; may hold `[[Name]]` links |
| `truth` | what is actually true, hidden from players |
| `notes` | author notes and open questions |
| `tags` | free-text tags; `starting kingdom` and `starting city` mark possible birthplaces, and `famous` (places only) marks what every start in the region hears of |
| `way` | orthodox, demonic, buddhist, ghost, wild, sea, neutral or void (mostly on powers) |
| `terrain` | on any place: plains, hills, mountains, forest, jungle, marsh, desert, steppe, ice, tundra, volcanic, plateau, twilight, islands, coast, canyon, karst, sea. A place without one takes its nearest ancestor's (a kingdom its region's), and `npm run atlas:build` writes the resolved terrain into the generated atlas, so give one only where the place differs from its region |
| `qiDensity` | on any place: how rich its spirit qi runs, 1 to 9 (barren, sparse, thin, modest, ordinary, rich, abundant, blessed, heaven-touched). A place without one takes its nearest ancestor's, ordinary (5) when none is written; `npm run atlas:build` writes it resolved on every place. It rises toward a continent's heart and its great powers' seats and falls at the frontiers: the Border Wilds are 3, the Soul-Lost Stone Forest 5. It sets what lives at a land's edge, and the travel map counts the depth up from there (design § The world, Depth and qi density) |
| `prosperity` | on a place or power: how rich it is, 1 to 9 (ruined, destitute, poor, humble, ordinary, comfortable, prosperous, rich, opulent). A place without one takes its parent's. It starts near the land's qi density and trade lifts it. It sets an array's rating where `access` gives none (3 Qi Condensation, 4–5 Foundation, 6–7 Core Formation, 8 Nascent Soul, 9 Deity Transformation), a market's purse and how many mortals a kingdom's land holds (design § World bible, The world at its true size) |
| `population` | on a place or power: about how many live there, `{ mortals, qi, foundation, core, nascent, deity, void }`, any left out; a kingdom or region counts its whole land, a city its seat, a power its members. Follow the numbers in design § World bible, How many live there |
| `size` | on a place or power: li across its built or held ground, or li long for a wall, a road or a river work |
| `fromAbove` | on a place or power: one line on what shows from the map's height (about 3 km a pixel), in what cultivation built: cliff walls, array domes, beacon pillars, sect peaks. A place painted into the map is painted from it |
| `site` | on kind `site` only, its sub-kind: town, village, cave, den, ruin, shrine, herb-valley, spring, falls (a waterfall), peak, camp, hut, mine, tomb (graves), tree (an ancient one), stele, heart (a wild's centre), checkpoint or ferry. Generated sites are the same record, kept in the save; a hand-written one may sit in the atlas |
| `hidden` | on a place: `true` when a Soul check or divine sense finds it, or a realm id (`"core-formation"`) when only a soul at that realm finds it; left out when anyone can see it |
| `access` | on a gated place or a secret realm (see below) |
| `ties` | on any entry: a list of `{ to, kind, open, why }` (see Ties as data) |
| `features` | on a place: a list of `{ name, tags }`, the tagged things its scenes build from; tags are fire, burnable, height, fall, water, crossing, cover, witnesses, fragile, dark and narrow, and the travel and encounter phases add more |
| `top` | the strongest being awake and present, counting everything inside the entry, as free text "Realm (note)"; sleepers and seals go in the note; a parent is never below its strongest awake child; empty means no cultivator of note, and unknown is a deliberate mystery; `npm run atlas:build` parses it into a strict realm plus a note |
| `map` | `x`, `y`; `r` radius in li; continents also have `rx`, `ry`, `rot`, `seed` and `rough`; powers have `sphere`, the radius of their influence in li; lines have `path` (a list of [x, y]), `style` (river, ridge, span, array, wall, road) and `width`; `inner` on the Rim is the inner radius of its ring |
| `years` | `{ from, to }` in years, negative meaning years ago (eras and events); `from` is null for the Unrecorded |
| `order`, `editedBy`, `editedAt` | bookkeeping |

**Access.** One object; give only what applies. Forcing your way in is always possible to a realm above the array's rating, at a cost in standing.

| Key | Meaning |
| --- | --- |
| `by` | what opens it: any of token, rank, invitation, toll |
| `of` | whose token, rank or invitation, or who takes the toll; the entry itself when left out |
| `rank` | the rank that opens it, free text until M5's ranks; required with `rank` in `by` |
| `toll` | `{ stones, grade }`, grade low, mid, high or top; required with `toll` in `by` |
| `array` | the array's realm rating |
| `below` | secret realms: only cultivators below this realm enter |
| `needs` | secret realms: any one of beast-blood, bonded-beast (the list grows with the realms) |
| `cycle` | secret realms: `{ every, days, anchor }`, open `days` days every `every` years, counted from an opening in world year `anchor` |

The Realm of Mingled Blood: `{ "by": ["toll"], "of": "qm-yeqiao-hui", "toll": { "stones": 10, "grade": "low" }, "below": "foundation-establishment", "needs": ["beast-blood", "bonded-beast"], "cycle": { "every": 7, "days": 30, "anchor": 3110 } }`.

## Shapes

Shapes aren't stored. The atlas draws them on the fly from the fields, and `tools/atlas-geo.cjs` reproduces that code exactly:

- Continents: a seeded noisy ellipse (`blob`) from `map`.
- Land regions: Voronoi cells around the region centers inside each continent. The page clips them to the coast with an SVG clip path; the tool returns them unclipped.
- Sea regions: circles of radius `map.r`.
- Kingdoms and forbidden lands: small blobs seeded from a hash of the id. The Scar is the exception: the page draws it as a circle from `map.r`, and the tool skips it.
- Straits (`sea` entries) carry a radius too, but neither the page nor the tool draws them yet.

`npm run atlas:build` saves these as fixed outlines in `src/content/generated/atlas.json`, rounded to 10 li, so the game never has to recompute them. It clips land region cells to the coast, and stores The Scar as a circle and the Rim as a ring.

## How things connect

Places, powers, people and plots tie together the way the Beast Court and the Border Wilds do: the Gate raids across the strait for beast cores, the Night Bridge Society moves cubs and eggs at low tide, and the beasts raid back, while the truth underneath is that old beasts are waking and driving the young north, and the Gate's master once killed a Court prince. Settled in D3 (2026-10-14); every session and every agent writing the atlas reads this first.

**The guide**

- **Ties run on wants.** Every tie says who wants what from whom: cores, cubs, a debt, revenge, a secret.
- **Both sides act.** Write what each side does about it. A tie only one side acts on is decoration.
- **A public layer and a hidden one.** `lore` says one thing and `truth` another, with at most one secret an entry.
- **Grow from the map.** Look along the strait, the road, the river, the shared vein or the border before reaching for famous names.
- **Walk outward, don't reach up.** Tie to the parent, the siblings and the neighbors first; a tie to a far, famous power needs a reason the near ones can't give.
- **Mostly ordinary.** Most ties are trade, marriage, debt or a feud over water, so the rare dramatic one lands.
- **Every region's big tie touches at least one of its starts.**
- **The test:** each side can say the tie in one sentence from its own view.

**The workflow.** Before writing an entry, list its neighbors: its parent, its siblings, the powers whose sphere covers it and the routes through it. Tie it to one or two of them in `ties`, and write the tie on both ends. The Border Wilds and its nine children are the worked example.

**Ties as data** (P3.1). `ties` on any entry: each names another entry (`to`), a kind (enemy, ally, trade, kin, patron, debt, feud or secret), whether it is `open` or hidden, and a one-line `why` from this entry's side, and both entries carry it with the same kind and open. One tie a pair: the hidden layer of an open tie goes in `truth`, and `open: false` is for a tie nobody outside knows of. `npm run atlas:build` stops on a tie to an entry that doesn't exist, and warns on a tie written on one end only, ends that disagree, an empty why, and a canon entry with no tie; untied drafts are counted by kind until the atlas fill reaches them. The editor writes the other end for you, with an empty why to fill there.

**In play, nothing new is invented.** Generated people and plots draw on the ties already there (a rogue's grudge against a named power, a merchant's debt to a sect), and neither the generator nor GLM makes up a new conflict. Rumors and plot encounters travel along ties, so a quarrel between the Gate and the Herders sends their people across your road.
