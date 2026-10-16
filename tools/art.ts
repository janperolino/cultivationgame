// `npm run art` (docs/art-pipeline.md, Ingest): inbox to source to webp, budgets checked. Fails on
// a missing source, a file over budget or a broken manifest. `npm run art -- --root <dir>` runs it
// on another folder holding an art/manifest.json.

import { runArt } from './art-lib.ts';

const at = process.argv.indexOf('--root');
const root = at >= 0 ? process.argv[at + 1]! : process.cwd();

const report = await runArt(root);
for (const f of report.moved) console.log(`moved   inbox/${f} to source/`);
for (const w of report.written)
  console.log(`wrote   ${w.file}  ${w.kb.toFixed(1)} KB of ${w.budgetKB} KB`);
if (report.written.length === 0 && report.errors.length === 0)
  console.log('The manifest names no assets yet.');
for (const e of report.errors) console.error(`error   ${e}`);
if (report.errors.length) process.exit(1);
