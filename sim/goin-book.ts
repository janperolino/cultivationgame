// P3.9w's check on GLM by hand: `npm run goin:book` (loads .env.local). The world book played
// through the real pipeline as the go-in screen plays it: a mortal innkeeper in Pacified Fort and an
// elder of the Beast-Butcher Gate in its hall, each asked about Foundation Pills, answering from
// different entries; the lines each got from the book; and Wait until dawn at the inn. Writes
// docs/spike/p3.9w-book.md. About 12 calls, a few cents.
import { writeFileSync } from 'node:fs';
import atlasJson from '../src/content/generated/atlas.json';
import { atlasOf, type AtlasEntry } from '../src/ai/context.ts';
import { interpret } from '../src/ai/interpret.ts';
import { envKey, keyedProvider } from '../src/ai/keys.ts';
import { narrate } from '../src/ai/narrate.ts';
import { CostMeter } from '../src/ai/openrouter.ts';
import { outcomeOf } from '../src/ai/outcome.ts';
import { sceneView, settingText, toneText, wordsFor } from '../src/ai/scene.ts';
import type { GoInLength, WaitUntil } from '../src/content/goin.ts';
import type { DoorRef } from '../src/core/frames.ts';
import {
  addTurn,
  checkPlan,
  keepTelling,
  runTurn,
  sceneSetting,
  waitUntilTurn,
} from '../src/core/goin.ts';
import { goInPlace, hourWords } from '../src/core/goinPlace.ts';
import { enterAt } from '../src/core/map/gate.ts';
import { placeById } from '../src/core/map/region.ts';
import { ensureMap, mapOf } from '../src/core/map/travel.ts';
import { joinPower } from '../src/core/orgs/membership.ts';
import { plainActor } from '../src/core/resolver/actor.ts';
import type { Scene, StepResult } from '../src/core/resolver/scene.ts';
import { TICKS_PER_DAY } from '../src/content/resolver.ts';
import { newLife, withPlayer, type GameState } from '../src/core/state.ts';
import { keepLasts } from '../src/core/voices.ts';

const keys = envKey(process.env);
if (!keys.key()) {
  console.error('No OPENROUTER_API_KEY. Put it in .env.local and run `npm run goin:book`.');
  process.exit(1);
}
const meter = new CostMeter();
const ai = { provider: keyedProvider(keys, { appTitle: 'Severed Heaven P3.9w' }), meter };
const atlas = atlasOf(atlasJson.entries as unknown as AtlasEntry[]);

const out: string[] = [
  '# P3.9w: the world book on GLM',
  '',
  `Run ${new Date().toISOString()}.`,
  '',
];
const say = (line = '') => {
  console.log(line);
  out.push(line);
};

const FORT = 'pacified-fort';
const GATE = 'qm-tushou-men';
const INN: DoorRef[] = [{ id: 'inn', name: 'the inn', art: 'inn', group: 'hear' }];

/** A layer-5 life inside a place at a double-hour (子 = 0), a Gate outer disciple if `member`. */
function at(seed: string, id: string, branch: number, member = false): GameState {
  let s = ensureMap(
    newLife({ name: 'Han Li', seed, origin: { id: 'conscript', choice: 'along' } }),
  );
  const p = s.player;
  s = withPlayer(s, { ...p, stones: 40, silver: 80, qi: { ...p.qi, stage: 5 } });
  if (member) {
    const j = joinPower(s.world, s.player.id, GATE, s.calendar.day);
    if (j.ok) s = { ...s, world: j.world };
  }
  const place = placeById(mapOf(s)!, id)!;
  const stood: GameState = {
    ...s,
    map: { ...s.map!, at: [place.x, place.y], course: null, notice: { n: 0, next: 1e9 } },
  };
  const r = enterAt(stood, mapOf(s)!, place);
  if (!r.ok) throw new Error(r.reason);
  return { ...r.state, calendar: { day: Math.floor(r.state.calendar.day) + (branch + 0.5) / 12 } };
}

/** The lines the context gives each person present: their regard by realm and their book. */
function bookLines(s: GameState, said: string, about: readonly string[]) {
  const view = sceneView(s, atlas, { said, about });
  const lines = view.scene
    .split('\n')
    .filter((l) =>
      /^- (stranger|face|keeper|gate)|By realm|Of this|Knows nothing|realm as you read/.test(l),
    );
  say('```');
  for (const l of lines) say(l);
  say('```');
  say('');
}

async function tell(
  s: GameState,
  said: string | null,
  about: readonly string[],
  before: Scene,
  results: readonly StepResult[],
  length: GoInLength,
): Promise<GameState> {
  const view = sceneView(s, atlas, { ...(said ? { said } : {}), about });
  const o = outcomeOf(view, before, s.goin!.scene, results, null);
  const set = sceneSetting(s);
  if (said === null) o.text += '\n- You go in.';
  const from = meter.cost;
  const n = await narrate(ai, view, o, {
    words: wordsFor(length),
    said,
    before: [...(said === null && set ? [settingText(set)] : []), toneText(false)].join('\n\n'),
  });
  say(
    `**${said ?? 'Going in'}** · ${length}${n.fellBack !== 'none' ? ` (fell back: ${n.fellBack})` : ''} · $${(meter.cost - from).toFixed(4)}`,
  );
  say('');
  say(`> ${n.prose.replace(/\n+/g, ' ')}`);
  say('');
  const next = keepTelling(
    addTurn(s, { said, told: n.prose, line: '', ...(about.length ? { about: [...about] } : {}) }),
    { choices: n.choices, notes: n.notes },
  );
  return keepLasts(next, n.lasts, results);
}

async function typed(s: GameState, words: string): Promise<GameState> {
  const r = await interpret(ai, sceneView(s, atlas), words);
  if (r.kind !== 'plan') {
    say(`**${words}** → ${r.kind}: ${r.reason}`);
    return s;
  }
  const reading = r.readings[0]!;
  const about = r.about ?? [];
  const c = checkPlan(s, reading.plan);
  say(
    `*${words}* → ${reading.plan.steps.map((st) => `${st.act}${st.target ? ` → ${st.target}` : ''}`).join(', ')} · topics: ${about.join(', ') || 'none'}${c.refused ? ` · refused: ${c.refused}` : ''}`,
  );
  say('');
  if (c.refused) return s;
  bookLines(s, words, about);
  const t = runTurn(s, reading.plan);
  return tell(t.state, words, about, t.before, t.results, c.stake ? 'stake' : 'plain');
}

async function waited(s: GameState, hour: WaitUntil): Promise<GameState> {
  const t0 = s.goin!.scene.tick;
  const t = waitUntilTurn(s, hour);
  const g = t.state.goin!;
  say(
    `(Wait until ${hour}: ${g.scene.tick - t0} ticks, now ${hourWords(t.state.calendar.day + g.scene.tick / TICKS_PER_DAY)})`,
  );
  say('');
  return tell(t.state, `Wait until ${hour}`, [], t.before, t.results, 'plain');
}

// ── The mortal innkeeper ──────────────────────────────────────────────────────────────────────

const only = process.argv[2];
if (only !== 'gate') {
  say('## A mortal innkeeper in Pacified Fort, at 戌');
  say('');
  const r = goInPlace(at('book-inn', FORT, 10), {
    place: placeById(mapOf(at('book-inn', FORT, 10))!, FORT)!,
    doors: INN,
    door: 'inn',
  });
  if (typeof r === 'string') throw new Error(r);
  let s = await tell(r, null, [], r.goin!.scene, [], 'opening');
  s = await typed(s, 'Innkeeper, what does a Foundation Pill go for these days?');
  s = await typed(s, 'Has anyone in town ever had one?');
  await waited(s, 'dawn');
}

// ── An elder of the Gate ─────────────────────────────────────────────────────────────────────

say('## An elder of the Beast-Butcher Gate in its hall, at 巳, to an outer disciple');
say('');
{
  const base = at('book-gate', GATE, 5, true);
  const r = goInPlace(base, {
    place: placeById(mapOf(base)!, GATE)!,
    doors: [{ id: 'elders', name: 'the elders’ hall', art: 'elders', group: 'hall' }],
    door: 'elders',
  });
  if (typeof r === 'string') throw new Error(r);
  const elder = plainActor({
    id: 'gate-elder-tu',
    name: 'Elder Tu',
    side: 'gate',
    realm: { realm: 'core-formation', stage: 1 },
    power: GATE,
    looks: 'a grey-bearded elder in the Gate’s black robes, a saber across his knees',
  });
  // An outer disciple knows the Gate's elders by name.
  let s: GameState = {
    ...r,
    world: { ...r.world, known: [...r.world.known, `name:${elder.id}`] },
    goin: { ...r.goin!, scene: { ...r.goin!.scene, actors: [...r.goin!.scene.actors, elder] } },
  };
  s = await tell(s, null, [], s.goin!.scene, [], 'opening');
  s = await typed(
    s,
    '(bow) Elder Tu, what does a Foundation Pill go for, and how does a disciple like me ever get one?',
  );
  await typed(s, 'And Elder Tu, what does it take, after Foundation, to form a core?');
}

say(`Total: $${meter.cost.toFixed(4)} over ${meter.calls} calls.`);
writeFileSync('docs/spike/p3.9w-book.md', `${out.join('\n')}\n`);
