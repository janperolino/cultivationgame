// Runs one Node sim by name: `npm run sim -- <name>` runs sim/<name>.ts.
// Sims import src/core and src/content directly, never React or the network.
import { readdirSync } from 'node:fs';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { dirname, join } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));
const sims = readdirSync(here)
  // spike.ts calls OpenRouter, so it has its own script: npm run spike.
  .filter(
    (f) => f.endsWith('.ts') && !['run.ts', 'spike.ts'].includes(f) && !f.endsWith('.test.ts'),
  )
  .map((f) => f.slice(0, -3));

const name = process.argv[2];
if (!name || !sims.includes(name)) {
  console.log(name ? `No sim named "${name}".` : 'Usage: npm run sim -- <name>');
  console.log(
    sims.length ? `Sims: ${sims.join(', ')}` : 'No sims yet (sim/pacing.ts arrives in P1.2).',
  );
  process.exit(name ? 1 : 0);
}
await import(pathToFileURL(join(here, `${name}.ts`)).href);
