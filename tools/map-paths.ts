// Where the travel map's art lives (docs/art-pipeline.md § The travel map). The pipeline's working
// files, a region's guide, painting, fits and detail tiles, are in art/map/<region>/ (the upscaled
// tiles and the references git-ignored, rebuilt by the tools); what the game loads, the painting as
// webp and the tiles' chunk pyramids, is in public/map/<region>/, served as it is, a chunk at a time.
import { existsSync, readdirSync, readFileSync } from 'node:fs';

/** The pipeline's working folder for a region. */
export const workDir = (region: string) => `art/map/${region}`;
/** What ships for a region: public/map/<region>/, loaded by the Map a chunk at a time. */
export const shipDir = (region: string) => `public/map/${region}`;

export const guidePng = (region: string) => `${workDir(region)}/guide.png`;
export const guideJson = (region: string) => `${workDir(region)}/guide.json`;
export const paintingPng = (region: string) => `${workDir(region)}/painting.png`;
export const tilesJson = (region: string) => `${workDir(region)}/tiles.json`;

// A5.3: each fixed place painted into the map has its own folder under places/, named in English
// (Jan's call), in "To paint" until its painting is laid in and in "Done" after: crop.png (the cut
// square, tools/map-crop.ts), place.json (its frame and id), prompt.txt (tools/map-prompt.ts) and
// painted.png (Jan's ChatGPT painting). Jan attaches the crop and the prompt together.

/** Where a region's place folders live. */
export const placesDir = (region: string) => `${workDir(region)}/places`;
export const TO_PAINT = 'To paint';
export const DONE = 'Done';

/** A place's folder name: its English name, without what Windows forbids in a file name. */
export const folderName = (name: string) => name.replace(/[<>:"/\\|?*]/g, '').trim();

export interface PlaceFolder {
  id: string;
  name: string;
  /** The folder, from the repo root. */
  dir: string;
  done: boolean;
}

/** Every place folder of a region, to paint and done, read from each one's place.json. */
export function placeFolders(region: string): PlaceFolder[] {
  const out: PlaceFolder[] = [];
  for (const [sub, done] of [
    [TO_PAINT, false],
    [DONE, true],
  ] as const) {
    const root = `${placesDir(region)}/${sub}`;
    if (!existsSync(root)) continue;
    for (const f of readdirSync(root)) {
      const json = `${root}/${f}/place.json`;
      if (!existsSync(json)) continue;
      const p = JSON.parse(readFileSync(json, 'utf8')) as { place: string; name: string };
      out.push({ id: p.place, name: p.name, dir: `${root}/${f}`, done });
    }
  }
  return out;
}

/** A place's folder by its id, if it has been cut. */
export const placeFolder = (region: string, id: string) =>
  placeFolders(region).find((p) => p.id === id);
