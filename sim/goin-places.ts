// P3.9b's check on GLM by hand: `npm run goin:places` (loads .env.local). Places and people played
// through the real pipeline as the go-in screen plays them: the playbook's stall, its theft of your
// own sect's Foundation Pill the night before the tournament and a break-in at a stranger's house;
// a city's districts costing their ticks; a Foundation fight heard across a town; a person met last
// week naming what you did in their own voice; and "remember when" with a past that never happened.
// Writes docs/spike/p3.9b-places.md. About 40 calls, ten to fifteen cents.
import { writeFileSync } from 'node:fs';
import atlasJson from '../src/content/generated/atlas.json';
import { atlasOf, type AtlasEntry } from '../src/ai/context.ts';
import { interpret } from '../src/ai/interpret.ts';
import { envKey, keyedProvider } from '../src/ai/keys.ts';
import { chronicle, narrate } from '../src/ai/narrate.ts';
import { CostMeter } from '../src/ai/openrouter.ts';
import { outcomeOf } from '../src/ai/outcome.ts';
import { sceneView, settingText, toneText, wordsFor } from '../src/ai/scene.ts';
import type { GoInLength } from '../src/content/goin.ts';
import { combatantIn, type Fight } from '../src/core/combat/fight.ts';
import type { DoorRef } from '../src/core/frames.ts';
import {
  addTurn,
  checkPlan,
  endScene,
  keepTelling,
  runTurn,
  sceneSetting,
  templatedLine,
  type TurnRun,
} from '../src/core/goin.ts';
import { crowdHere, goInPlace } from '../src/core/goinPlace.ts';
import { enterAt } from '../src/core/map/gate.ts';
import { placeById } from '../src/core/map/region.ts';
import { ensureMap, mapOf } from '../src/core/map/travel.ts';
import { joinPower } from '../src/core/orgs/membership.ts';
import { fightEnd, playTurn } from '../src/core/played.ts';
import { finishFight, fightStart } from '../src/core/playFight.ts';
import type { Scene, StepResult } from '../src/core/resolver/scene.ts';
import { newLife, withPlayer, type GameState } from '../src/core/state.ts';
import { keepLasts } from '../src/core/voices.ts';

const keys = envKey(process.env);
if (!keys.key()) {
  console.error('No OPENROUTER_API_KEY. Put it in .env.local and run `npm run goin:places`.');
  process.exit(1);
}
const meter = new CostMeter();
const ai = { provider: keyedProvider(keys, { appTitle: 'Severed Heaven P3.9b' }), meter };
const atlas = atlasOf(atlasJson.entries as unknown as AtlasEntry[]);

const out: string[] = [
  '# P3.9b: places and people on GLM',
  '',
  `Run ${new Date().toISOString()}.`,
  '',
];
const say = (line = '') => {
  console.log(line);
  out.push(line);
};

const FORT = 'pacified-fort';
const CITY = 'qm-shoukou-cheng';
const GATE = 'qm-tushou-men';

const TOWN_DOORS: DoorRef[] = [
  { id: 'stall', name: 'the free market', art: 'stall', group: 'market' },
  { id: 'alchemy', name: 'Pill Street', art: 'alchemy', group: 'market' },
  { id: 'teahouse', name: 'the Quiet Moon teahouse', art: 'teahouse', group: 'hear' },
  { id: 'inn', name: 'the inn', art: 'inn', group: 'hear' },
  { id: 'board', name: 'the bounty board', art: 'board', group: 'work' },
];

/** A life at a layer (or Foundation), inside a place, at a double-hour (子 = 0). */
function at(seed: string, id: string, branch: number, foundation = false): GameState {
  let s = ensureMap(
    newLife({ name: 'Han Li', seed, origin: { id: 'conscript', choice: 'along' } }),
  );
  const p = s.player;
  s = withPlayer(s, {
    ...p,
    stones: 200,
    silver: 80,
    items: { ...p.items, 'beast-hide': 3 },
    qi: foundation
      ? { ...p.qi, realm: 'foundation-establishment', stage: 3 }
      : { ...p.qi, stage: 5 },
    body: foundation
      ? { ...p.body, realm: 'foundation-establishment', stage: 1 }
      : { ...p.body, stage: 3 },
    soul: foundation
      ? { ...p.soul, realm: 'foundation-establishment', stage: 1 }
      : { ...p.soul, stage: 3 },
  });
  if (id === GATE) {
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

function door(s: GameState, id: string, d: string | null, doors = TOWN_DOORS): GameState | null {
  const r = goInPlace(s, { place: placeById(mapOf(s)!, id)!, doors, door: d });
  if (typeof r === 'string') {
    say(`Can't go in: ${r}`);
    return null;
  }
  return r;
}

/** Tells a turn as the screen does, keeps it and what lasts of its people. */
async function tell(
  s: GameState,
  said: string | null,
  before: Scene,
  results: readonly StepResult[],
  length: GoInLength,
  extra: string[] = [],
  stopped: string | null = null,
): Promise<GameState> {
  const view = sceneView(s, atlas);
  const o = outcomeOf(view, before, s.goin!.scene, results, stopped);
  if (extra.length) {
    o.plain.push(...extra);
    o.text += `\n${extra.map((l) => `- ${l}`).join('\n')}`;
  }
  const set = sceneSetting(s);
  if (said === null) o.text += '\n- You go in.';
  const from = meter.cost;
  const n = await narrate(ai, view, o, {
    words: wordsFor(length),
    before: [...(said === null && set ? [settingText(set)] : []), toneText(false)].join('\n\n'),
  });
  say(
    `**${said ?? 'Going in'}** · ${length}${n.fellBack !== 'none' ? ` (fell back: ${n.fellBack})` : ''} · $${(meter.cost - from).toFixed(4)}`,
  );
  say('');
  say(`> ${n.prose.replace(/\n+/g, ' ')}`);
  say('');
  const lasts = [
    ...n.lasts.said.map((x) => `said "${x.line}"`),
    ...n.lasts.address.map((x) => `calls you "${x.address}"`),
    ...n.lasts.felt.map((x) => `felt "${x.felt}"`),
    ...(n.lasts.moment ? [`a moment: ${n.lasts.moment.reason} (${n.lasts.moment.sign})`] : []),
  ];
  if (lasts.length) {
    say(`Kept: ${lasts.join(' · ')}`);
    say('');
  }
  const next = keepTelling(addTurn(s, { said, told: n.prose, line: '' }), {
    choices: n.choices,
    notes: n.notes,
  });
  return keepLasts(next, n.lasts, results);
}

async function typed(s: GameState, words: string): Promise<GameState> {
  const r = await interpret(ai, sceneView(s, atlas), words);
  if (r.kind !== 'plan') {
    say(`**${words}** → ${r.kind}: ${r.reason}`);
    say('');
    return s;
  }
  const reading = r.readings[0]!;
  const readings = r.readings.map(
    (x) =>
      `"${x.label}" (${x.plan.steps.map((st) => `${st.act}${st.target ? ` → ${st.target}` : ''}${st.as ? ` "${st.as}"` : ''}`).join(', ')})`,
  );
  const c = checkPlan(s, reading.plan);
  say(
    `*${words}* → ${readings.join(' | ')}${c.refused ? ` · refused: ${c.refused}` : ''}${c.stake ? ' · at stake' : ' · straight through'}`,
  );
  say('');
  if (c.refused) return s;
  const tick = s.goin!.scene.tick;
  const t = runTurn(s, reading.plan);
  if (t.fight) return fought(t, words);
  const moved = t.state.goin!.scene.tick - tick;
  const verdicts = t.results
    .filter((x) => x.actor === s.player.id)
    .map((x) => `${x.step.act} ${x.check?.verdict ?? 'unchecked'}`);
  say(
    `(engine: ${verdicts.join(', ') || 'no round'}${t.stopped ? `; stopped: ${t.stopped}` : ''}; ${moved} ticks; at ${t.state.goin!.place?.at ?? '-'})`,
  );
  say('');
  return tell(t.state, words, t.before, t.results, c.stake ? 'stake' : 'plain', [], t.stopped);
}

async function fought(t: TurnRun, said: string): Promise<GameState> {
  let s = t.state;
  let f: Fight = fightStart(s, s.fight!.from)!;
  for (let i = 0; i < 80 && fightEnd(f, s.player.id) === null; i++) {
    const me = combatantIn(f, s.player.id)!;
    const foe = f.combatants.find((c) => c.side !== me.side && c.state === 'fighting')!;
    const r = playTurn(s, f, { main: { type: 'strike', target: foe.id } })!;
    s = r.state;
    f = r.turn.fight;
  }
  const back = finishFight(s, f)!;
  say(
    `(the fight, played on the engine: ${back.end}; log: ${back.state.goin?.scene.log.filter((l) => l.includes('The whole')).join(' ') || 'nothing heard'})`,
  );
  say('');
  return tell(back.state, said, back.scene!.before, back.scene!.results, 'fight', [
    back.scene!.text,
  ]);
}

async function leave(s: GameState): Promise<GameState> {
  const g = s.goin!;
  const c = await chronicle(
    ai,
    sceneView(s, atlas),
    g.turns.map((t) => ({ said: t.said ?? 'You go in.', told: t.told })),
    { templated: templatedLine(s) },
  );
  say(`Leaving card's line: *${c.line}*${c.fellBack ? ' (templated)' : ''}`);
  say('');
  return endScene(s, 'left');
}

async function play(
  title: string,
  s0: GameState | null,
  turns: string[],
): Promise<GameState | null> {
  say(`## ${title}`);
  say('');
  if (!s0) return null;
  const crowd = crowdHere(s0);
  say(
    `(the crowd: about ${crowd.count}; faces: ${crowd.faces.map((f) => f.line).join('; ') || 'none'})`,
  );
  say('');
  let s = await tell(s0, null, s0.goin!.scene, [], 'opening');
  for (const w of turns) {
    if (!s.goin || s.goin.ending) break;
    s = await typed(s, w);
  }
  return s.goin ? leave(s) : s;
}

await play(
  'The stall (Pacified Fort’s free market, 巳)',
  door(at('stall', FORT, 5), FORT, 'stall'),
  [
    'Spread a mat, lay out my three beast hides and wait for buyers',
    'Tell them these hides would make good boot leather',
    'Sell them a hide for two spirit stones',
  ],
);

await play(
  'Your own sect’s Foundation Pill, the night before the tournament (the Gate, 子)',
  door(at('pill', GATE, 0, true), GATE, 'elders', [
    { id: 'elders', name: 'the elders’ hall', art: 'elders', group: 'hall' },
  ]),
  [
    'Wait in the shadows until the steward dozes off',
    'Slip into the treasury unseen and take one Foundation Pill',
    'Take one Foundation Pill from the shelves and slip out',
  ],
);

await play(
  'A break-in at a stranger’s house (Pacified Fort, 子)',
  door(at('break-in', FORT, 0, true), FORT, null),
  [
    'Go to a merchant’s house off the market street',
    'Force the lock quietly and take the silver inside',
  ],
);

await play(
  'A city’s districts (the City of the Guarded Mouth, 午)',
  door(at('districts', CITY, 6), CITY, 'teahouse'),
  ['Walk over to the market quarter', 'Go back to the teahouse'],
);

await play(
  'A Foundation fight heard across a town (Pacified Fort, 午)',
  door(at('noise', FORT, 6, true), FORT, null),
  ['Shove the off-duty spearman and beat him in a fight in the middle of the street'],
);

// A person met last week names what you did, in their own voice.
{
  let s = await play(
    'Last week at the teahouse (Pacified Fort, 申)',
    door(at('week', FORT, 8), FORT, 'teahouse'),
    ['Buy the keeper a pot of their best tea and ask what news there is of the Black Pine road'],
  );
  if (s) {
    s = { ...s, calendar: { day: s.calendar.day + 7 } };
    await play('A week on, the same teahouse', door(s, FORT, 'teahouse'), [
      'Ask the keeper if they remember me',
      'Remember when I pulled your son out of the river last spring?',
    ]);
  }
}

say('## The meter');
say('');
say(`${meter.calls} calls, $${meter.cost.toFixed(4)}.`);
for (const [role, r] of Object.entries(meter.byRole))
  say(`- ${role}: ${r.calls} calls, $${r.cost.toFixed(4)}`);
writeFileSync('docs/spike/p3.9b-places.md', `${out.join('\n')}\n`);
