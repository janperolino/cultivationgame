// Writes a place's art request into Jan's cross-agent folder (A6; its README holds the protocol),
// from the place's brief (tools/place-brief.ts), so Codex can paint it with Jan's go-ahead:
// request.md with the prompts in order, the place's world-map painting copied in as the reference,
// and an empty outputs/ for the PNGs.
//   npx tsx tools/place-request.ts "<Place>"            (its folder name in art/places/To paint/)
// After Codex is done, copy outputs/*.png into art/inbox/ and run `npm run art`.
import { copyFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const COMMS = process.env.CROSS_AGENT_COMMS ?? 'C:/Users/janpe/CMPTProjects/cross-agent comms';
const place = process.argv[2];
if (!place) throw new Error('Name the place: npx tsx tools/place-request.ts "<Place>"');
const brief = join('art', 'places', 'To paint', place, 'brief.md');
if (!existsSync(brief)) throw new Error(`No brief at ${brief}; run npx tsx tools/place-brief.ts`);
const text = readFileSync(brief, 'utf8');

const files = [...text.matchAll(/^- `(place-[^`]+\.png)`$/gm)].map((m) => m[1]!);
const ref = /\*\*Attach this to every run\*\*[^`]*`([^`]+)`/.exec(text)?.[1];
const job = join(COMMS, 'places', place);
mkdirSync(join(job, 'outputs'), { recursive: true });
if (ref) copyFileSync(ref, join(job, 'reference-world-map.png'));

const prompts = text
  .slice(text.indexOf('## 1. The banner'))
  .split('\n')
  .filter((l) => !l.startsWith('If ChatGPT drifts'))
  .join('\n')
  .replace(/^Pieces, in order:/m, 'For Claude, the pieces in order:');

writeFileSync(
  join(job, 'request.md'),
  [
    `# Request: ${text
      .split('\n')[0]!
      .replace(/^# /, '')
      .replace(/, the art brief$/, '')}, its banner and door sheets`,
    '',
    'From: Claude (the A6 session of Severed Heaven). Jan gives the go-ahead.',
    '',
    `**Make ${files.length} images**, one per prompt below, in order, in one conversation: the banner first, then the door sheets, so the sheets keep the banner's look.`,
    '',
    ...(ref
      ? [
          '- **Attach `reference-world-map.png` (in this folder) to every run.** It is the place as painted on the game’s world map; the pictures are the same place up close.',
        ]
      : [
          '- This place has no world-map painting yet: follow the prompts’ ITS LOOK and SCALE closely, and use the banner as the reference for the sheets.',
        ]),
    '- Each image is **1536×1024, landscape**. The door sheets are an even **3×3 grid** (rows 341/342/341), edge to edge, with no borders, gaps, labels or text. Empty cells are plain dark mist.',
    '- **No text, letters or numbers** anywhere in any image.',
    '- Save each image as a PNG in `outputs/` under exactly these names:',
    ...files.map((f, i) => `  ${i + 1}. \`${f}\``),
    '- When all are saved, write `done.md` here: the files made, and anything that went wrong or that you changed.',
    '',
    'Don’t edit anything else in this folder or anywhere else.',
    '',
    '---',
    '',
    prompts,
  ].join('\n'),
);
console.log(
  `Wrote ${join(job, 'request.md')} (${files.length} images${ref ? ', reference copied' : ''})`,
);
