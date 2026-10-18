// Where the travel map's art lives (docs/art-pipeline.md § The travel map). The pipeline's working
// files, a region's guide, painting, fits and detail tiles, are in art/map/<region>/ (the upscaled
// tiles and the references git-ignored, rebuilt by the tools); what the game loads, the painting as
// webp and the tiles' chunk pyramids, is in public/map/<region>/, served as it is, a chunk at a time.

/** The pipeline's working folder for a region. */
export const workDir = (region: string) => `art/map/${region}`;
/** What ships for a region: public/map/<region>/, loaded by the Map a chunk at a time. */
export const shipDir = (region: string) => `public/map/${region}`;

export const guidePng = (region: string) => `${workDir(region)}/guide.png`;
export const guideJson = (region: string) => `${workDir(region)}/guide.json`;
export const paintingPng = (region: string) => `${workDir(region)}/painting.png`;
export const tilesJson = (region: string) => `${workDir(region)}/tiles.json`;
