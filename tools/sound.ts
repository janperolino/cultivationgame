// `npm run sound` (docs/art-pipeline.md § Sound): inbox to source to MP3, licences, credits and
// budgets checked. Fails on a sound with no licence or credit, a NonCommercial one, a missing
// source or a file over budget. `npm run sound -- --root <dir>` runs it on another folder.

import { missing, runSound } from './sound-lib.ts';

const at = process.argv.indexOf('--root');
const root = at >= 0 ? process.argv[at + 1]! : process.cwd();

const report = runSound(root);
for (const f of report.moved) console.log(`moved   inbox/${f} to source/`);
for (const w of report.written)
  console.log(`wrote   ${w.file}  ${w.kb.toFixed(1)} KB of ${w.budgetKB} KB`);
for (const f of report.removed) console.log(`removed public/sound/${f}`);
if (report.kept.length) console.log(`kept    ${report.kept.length} unchanged`);
if (report.errors.length === 0) {
  const left = missing(root);
  console.log(
    left.length ? `${left.length} cues still without a sound.` : 'Every cue has a sound.',
  );
}
for (const e of report.errors) console.error(`error   ${e}`);
if (report.errors.length) process.exit(1);
