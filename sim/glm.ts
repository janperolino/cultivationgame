// P3.8's check on GLM by hand: `npm run glm` (loads .env.local). The playbook's sentences, some
// unclear ones and some tricks go through the real interpreter, then one step is told by the
// narrator and summed up by the chronicler, with every call on the cost meter. Writes
// docs/spike/p3.8-roles.md. About 20 calls, a few cents.
import { writeFileSync } from 'node:fs';
import atlasJson from '../src/content/generated/atlas.json';
import { previewStep, runPlan } from '../src/core/resolver/scene.ts';
import { step } from '../src/core/resolver/plan.ts';
import { atlasOf, buildView, type AtlasEntry } from '../src/ai/context.ts';
import { interpret, type Interpretation } from '../src/ai/interpret.ts';
import { envKey, keyedProvider } from '../src/ai/keys.ts';
import { chronicle, narrate } from '../src/ai/narrate.ts';
import { CostMeter, type ChatProvider } from '../src/ai/openrouter.ts';
import { outcomeOf } from '../src/ai/outcome.ts';
import {
  playbookScene,
  PLAYBOOK_SENTENCES,
  TRICK_SENTENCES,
  UNCLEAR_SENTENCES,
} from '../src/ai/playbook.ts';

const keys = envKey(process.env);
if (!keys.key()) {
  console.error('No OPENROUTER_API_KEY. Put it in .env.local and run `npm run glm`.');
  process.exit(1);
}
const meter = new CostMeter();
const glm = keyedProvider(keys, { appTitle: 'Severed Heaven P3.8' });
/** The last raw reply, shown beside a miss. */
let raw = '';
const provider: ChatProvider = {
  chat: (request, options) =>
    glm.chat(request, options).then((r) => {
      raw = r.text;
      return r;
    }),
};
const ai = { provider, meter };
const atlas = atlasOf(atlasJson.entries as unknown as AtlasEntry[]);
const { s, scene } = playbookScene();
const view = buildView({ state: s, scene, atlas });

const out: string[] = ['# P3.8: GLM roles by hand', '', `Run ${new Date().toISOString()}.`, ''];
const say = (line = '') => {
  console.log(line);
  out.push(line);
};

const shown = (r: Interpretation) => {
  if (r.kind !== 'plan') return `${r.kind}: ${r.reason}`;
  return r.readings
    .map(
      (x) =>
        `"${x.label}" → ${x.plan.steps.map((st) => `${st.act}${st.target ? `(${st.target})` : ''}`).join(', ')}`,
    )
    .join(' | ');
};

say('## The playbook');
let hits = 0;
for (const c of PLAYBOOK_SENTENCES) {
  const r = await interpret(ai, view, c.said);
  const acts =
    r.kind === 'plan' ? r.readings.map((x) => x.plan.steps.map((st) => st.act).join(',')) : [];
  const hit = acts.includes(c.acts.join(','));
  if (hit) hits++;
  say(`- ${hit ? 'match' : 'MISS'} · ${c.said}\n  ${shown(r)} (wanted ${c.acts.join(', ')})`);
  if (!hit) say(`  GLM: ${raw.replace(/\s+/g, ' ').replace(/"[a-z]+":null,? ?/g, '')}`);
}
say(`\n${hits} of ${PLAYBOOK_SENTENCES.length} read as the playbook's acts.`);

say('\n## Unclear');
let several = 0;
for (const said of UNCLEAR_SENTENCES) {
  const r = await interpret(ai, view, said);
  if (r.kind === 'plan' && r.readings.length >= 2) several++;
  say(`- ${said}\n  ${shown(r)}`);
}
say(`\n${several} of ${UNCLEAR_SENTENCES.length} gave two or three readings.`);

say('\n## Tricks');
let refused = 0;
for (const said of TRICK_SENTENCES) {
  const r = await interpret(ai, view, said);
  if (r.kind !== 'plan') refused++;
  say(`- ${said}\n  ${shown(r)}`);
}
say(`\n${refused} of ${TRICK_SENTENCES.length} read as nothing to do.`);

say('\n## Narrator and chronicler');
const bribe = step('threaten', { target: 'headman', show: ['weapon'] });
const run = runPlan(s, scene, { actor: s.player.id, steps: [bribe] });
const after = buildView({ state: run.state, scene: run.scene, atlas });
const outcome = outcomeOf(after, scene, run.scene, run.results, run.stopped);
say(`Preview: ${previewStep(s, scene, s.player.id, bribe).line}`);
say(outcome.text);
const told = await narrate(ai, after, outcome);
say(`\n${told.prose}\n\nChoices: ${told.choices.join(' · ')} (fell back: ${told.fellBack})`);
const sum = await chronicle(
  ai,
  after,
  [{ said: 'I draw my saber on the headman', told: told.prose }],
  {
    templated: 'You threatened the headman.',
  },
);
say(
  `\nSummary: ${sum.summary}\nChronicle: ${sum.line}\nNotes: ${sum.notes.map((n) => `${n.about}: ${n.note}`).join(' / ')}`,
);

say('\n## Cost');
say(`${meter.calls} calls, $${meter.cost.toFixed(4)}`);
for (const [role, r] of Object.entries(meter.byRole))
  say(`- ${role}: ${r.calls} calls, $${r.cost.toFixed(4)}`);

writeFileSync(new URL('../docs/spike/p3.8-roles.md', import.meta.url), out.join('\n') + '\n');
