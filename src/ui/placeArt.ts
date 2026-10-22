// A place's own pictures (A6; docs/art-pipeline.md § Places): its banner scene and its door sheets,
// painted by Jan in ChatGPT from the place's brief (art/places/…/brief.md) and cut by `npm run art`
// into src/ui/art/places/<place id>/, the banner as banner.webp and each sheet's pieces in a folder
// of their own, named by the door's piece (ui/placeDoors.ts `art`). Never a picture shared by kind:
// a place or door without its own yet shows the plain kit card, hatched, until its art arrives.

const files = import.meta.glob<string>('./art/places/**/*.webp', {
  eager: true,
  query: '?url',
  import: 'default',
});

interface PlaceArt {
  banner?: string;
  doors: Record<string, string>;
}

const byPlace = new Map<string, PlaceArt>();
for (const [path, url] of Object.entries(files)) {
  const m = /\.\/art\/places\/([^/]+)\/(?:(.+)\/)?([^/]+)\.webp$/.exec(path);
  if (!m) continue;
  const [, place, folder, name] = m;
  const art = byPlace.get(place!) ?? { doors: {} };
  if (!folder && name === 'banner') art.banner = url;
  else if (folder) art.doors[name!] = url;
  byPlace.set(place!, art);
}

/** A place's banner scene, if painted. */
export function bannerArt(place: string): string | undefined {
  return byPlace.get(place)?.banner;
}

/** A door's picture at a place, if painted. */
export function doorArt(place: string, piece: string): string | undefined {
  return byPlace.get(place)?.doors[piece];
}
