// P3.9c's check on GLM by hand: `npm run goin:fight` (loads .env.local). A fight inside the scene
// played through the real pipeline as the go-in screen plays it: a cutpurse knifes you on
// Pacified Fort's free market and you fight back over ten exchanges, each told as a beat, some
// typed (one asking for what you can't do), the town's watch joining on the 5th; then a Waking
// Thunder young master falls low and his backer's projection arrives and asks for face. Writes
// docs/spike/p3.9c-fight.md with the cost of the ten exchanges. About 30 calls, a few cents.
import { writeFileSync } from 'node:fs';
import atlasJson from '../src/content/generated/atlas.json';
import { atlasOf, type AtlasEntry } from '../src/ai/context.ts';
import { fightActionOf, interpretFight } from '../src/ai/interpret.ts';
import { envKey, keyedProvider } from '../src/ai/keys.ts';
import { narrate } from '../src/ai/narrate.ts';
import { CostMeter } from '../src/ai/openrouter.ts';
import { exchangeOutcome, fightEndOutcome } from '../src/ai/outcome.ts';
import { sceneView, toneText, wordsFor } from '../src/ai/scene.ts';
import type { GoInLength } from '../src/content/goin.ts';
import { combatant } from '../src/core/combat/combatant.ts';
import type { Fight } from '../src/core/combat/fight.ts';
import { faceAsked } from '../src/core/combat/joins.ts';
import { goInPlace } from '../src/core/goinPlace.ts';
import { enterAt } from '../src/core/map/gate.ts';
import { placeById } from '../src/core/map/region.ts';
import { ensureMap, mapOf } from '../src/core/map/travel.ts';
import { fightEnd, openFight, playTurn, type YourAction } from '../src/core/played.ts';
import { finishFight, fightStart } from '../src/core/playFight.ts';
import { plainActor, type Actor } from '../src/core/resolver/actor.ts';
import { step } from '../src/core/resolver/plan.ts';
import { newLife, withPlayer, type GameState } from '../src/core/state.ts';

const keys = envKey(process.env);
if (!keys.key()) {
  console.error('No OPENROUTER_API_KEY. Put it in .env.local and run `npm run goin:fight`.');
  process.exit(1);
}
const meter = new CostMeter();
const ai = { provider: keyedProvider(keys, { appTitle: 'Severed Heaven P3.9c' }), meter };
const atlas = atlasOf(atlasJson.entries as unknown as AtlasEntry[]);

const out: string[] = [
  '# P3.9c: the fight inside the scene on GLM',
  '',
  `Run ${new Date().toISOString()}.`,
  '',
];
const say = (line = '') => {
  console.log(line);
  out.push(line);
};

const FORT = 'pacified-fort';

/** Lin Ye at the free market of Pacified Fort, at a layer, at 戌. */
function atTheMarket(seed: string, stage: number): GameState {
  let s = ensureMap(
    newLife({ name: 'Lin Ye', seed, origin: { id: 'conscript', choice: 'along' } }),
  );
  const p = s.player;
  s = withPlayer(s, {
    ...p,
    stones: 200,
    qi: { ...p.qi, stage },
    body: { ...p.body, stage: Math.ceil(stage / 2) },
    soul: { ...p.soul, stage: Math.ceil(stage / 2) },
  });
  const place = placeById(mapOf(s)!, FORT)!;
  const stood: GameState = {
    ...s,
    map: { ...s.map!, at: [place.x, place.y], course: null, notice: { n: 0, next: 1e9 } },
  };
  const r = enterAt(stood, mapOf(s)!, place);
  if (!r.ok) throw new Error(r.reason);
  const evening = { ...r.state, calendar: { day: Math.floor(r.state.calendar.day) + 10.5 / 12 } };
  const doors = [{ id: 'stall', name: 'the free market', art: 'stall', group: 'market' }];
  const g = goInPlace(evening, { place, doors, door: 'stall' });
  if (typeof g === 'string') throw new Error(g);
  return g;
}

function withActor(s: GameState, a: Actor): GameState {
  const g = s.goin!;
  return { ...s, goin: { ...g, scene: { ...g.scene, actors: [...g.scene.actors, a] } } };
}

/** Someone in the frame starts a fight: the cutpurse at you, or you at the young master. */
function opens(s: GameState, actor: string, target: string): { s: GameState; f: Fight } {
  const from = { kind: 'scene', actor, step: step('attack', { target }) } as const;
  const opened = openFight(s, from, fightStart(s, from))!;
  return { s: opened, f: fightStart(opened, from)! };
}

/** One exchange, played and told as the go-in screen tells it, at a beat. */
async function exchange(
  s0: GameState,
  f0: Fight,
  said: string,
  action: YourAction,
  why: string | null,
): Promise<{ s: GameState; f: Fight; cost: number }> {
  const r = playTurn(s0, f0, action)!;
  const f = r.turn.fight;
  const s = r.state;
  const view = sceneView(s, atlas);
  const o = exchangeOutcome(view, { ...r.turn, fight: f, why, face: !!action.face });
  const lines = o.plain;
  const from = meter.cost;
  const length: GoInLength = 'beat';
  const n = await narrate(ai, view, o, {
    words: wordsFor(length, r.turn.came.length > 0),
    before: toneText(false),
  });
  const cost = meter.cost - from;
  say(
    `**Exchange ${f.turn} · ${said}**${n.fellBack !== 'none' ? ` (fell back: ${n.fellBack})` : ''} · $${cost.toFixed(4)}`,
  );
  say('');
  say(`> ${n.prose.replace(/\n+/g, ' ')}`);
  say('');
  say(`\`${lines.join(' · ')}\``);
  say('');
  return { s, f, cost };
}

/** Your typed words, read by the fight interpreter and made legal. */
async function typed(s: GameState, f: Fight, words: string) {
  const r = await interpretFight(ai, sceneView(s, atlas), words);
  if (r.kind === 'fallback') {
    say(`*${words}* → fell back: ${r.reason}`);
    say('');
    return null;
  }
  const a = fightActionOf(f, s.player.id, r.turn, null);
  say(
    `*${words}* → ${JSON.stringify(r.turn.main)}${r.turn.minor ? ` + ${JSON.stringify(r.turn.minor)}` : ''} · creativity ${r.turn.creativity} · feasible ${r.turn.feasible}${a.why ? ` · plays as ${a.action.main?.type}: ${a.why}` : ''}`,
  );
  say('');
  return a;
}

/** The fight's end, handed back and told once at the fight's length. */
async function ended(s: GameState, f: Fight): Promise<void> {
  const back = finishFight(s, f)!;
  const view = sceneView(back.state, atlas);
  const o = fightEndOutcome(
    view,
    f,
    back.end,
    back.scene!.before,
    back.state.goin!.scene,
    back.scene!.results,
    [back.scene!.text],
  );
  const from = meter.cost;
  const n = await narrate(ai, view, o, { words: wordsFor('fight'), before: toneText(false) });
  say(`**The fight ends: ${back.end}** · $${(meter.cost - from).toFixed(4)}`);
  say('');
  say(`> ${n.prose.replace(/\n+/g, ' ')}`);
  say('');
}

// ── A cutpurse on the free market ────────────────────────────────────────────────────────────

say('## A cutpurse knifes you on the free market (Pacified Fort, 戌)');
say('');
{
  const tough = combatant({
    id: 'cutpurse',
    name: 'a cutpurse',
    side: 'them',
    rungs: {
      qi: { realm: 'qi-condensation', stage: 5, grade: 0 },
      body: { realm: 'qi-condensation', stage: 4, grade: 0 },
      soul: { realm: 'qi-condensation', stage: 3, grade: 0 },
    },
  });
  // Tough enough to stand ten exchanges, so the watch comes on the 5th.
  const cutpurse = plainActor({
    id: 'cutpurse',
    name: 'a cutpurse',
    side: 'them',
    realm: { realm: 'qi-condensation', stage: 5 },
    combatant: { ...tough, hp: tough.maxHp * 2, maxHp: tough.maxHp * 2 },
  });
  const s0 = withActor(atTheMarket('cutpurse', 7), cutpurse);
  let { s, f } = opens(s0, 'cutpurse', s0.player.id);
  say(
    `(features in the fight: ${f.features.map((x) => `${x.name} [${x.tags.join(', ')}]`).join('; ') || 'none'})`,
  );
  say(
    `(joins: ${(f.joins ?? []).map((j) => `${j.who.name} on ${j.turn ?? 'its charge falling'}`).join('; ') || 'none'})`,
  );
  say('');
  const plan: (string | YourAction)[] = [
    'Catch his wrist and break it',
    { main: { type: 'strike', target: 'cutpurse' } },
    'Duck into the press of buyers and hit him from behind the crowd',
    { main: { type: 'defend' } },
    'Rip out his golden core with my bare hand',
    { main: { type: 'strike', target: 'cutpurse' } },
    'Tell him to drop the knife before the watch takes his hand',
    { main: { type: 'strike', target: 'cutpurse' } },
    { main: { type: 'strike', target: 'cutpurse' } },
    'Sweep his legs and drive my fist into his throat',
  ];
  let cost = 0;
  for (const p of plan) {
    if (fightEnd(f, s.player.id)) break;
    let action: YourAction;
    let why: string | null = null;
    let said: string;
    if (typeof p === 'string') {
      const a = await typed(s, f, p);
      if (!a) continue;
      action = a.action;
      why = a.why;
      said = p;
    } else {
      action = p;
      said = p.main?.type ?? 'act';
    }
    const x = await exchange(s, f, said, action, why);
    s = x.s;
    f = x.f;
    cost += x.cost;
  }
  say(`(${f.turn} exchanges told at a beat: $${cost.toFixed(4)})`);
  say('');
  if (fightEnd(f, s.player.id)) await ended(s, f);
  else say(`(the fight still runs after ${f.turn} exchanges)`);
  say('');
}

// ── A young master's backer ──────────────────────────────────────────────────────────────────

say('## A Waking Thunder young master and his backer (Pacified Fort, 戌)');
say('');
{
  // He started it, already hurt from a duel before you met him: under half his HP.
  const q = { realm: 'qi-condensation' as const, stage: 6, grade: 0 };
  const body = combatant({
    id: 'zhao',
    name: 'Zhao Qian',
    side: 'them',
    rungs: { qi: q, body: q, soul: q },
  });
  const zhao = plainActor({
    id: 'zhao',
    name: 'Zhao Qian',
    side: 'them',
    realm: { realm: 'qi-condensation', stage: 6 },
    backer: { id: 'han', name: 'Elder Han', realm: { realm: 'core-formation', stage: 1 } },
    combatant: { ...body, hp: Math.round(body.maxHp * 0.45) },
  });
  const s0 = withActor(atTheMarket('backer', 9), zhao);
  let { s, f } = opens(s0, 'zhao', s0.player.id);
  let gave = false;
  for (let i = 0; i < 12 && !fightEnd(f, s.player.id); i++) {
    const asked = faceAsked(f);
    const action: YourAction = asked
      ? { face: true }
      : { main: { type: 'strike', target: 'zhao' } };
    const x = await exchange(s, f, asked ? 'Give face' : 'strike', action, null);
    s = x.s;
    f = x.f;
    if (asked) gave = true;
  }
  if (fightEnd(f, s.player.id)) await ended(s, f);
  say(gave ? '(you gave face)' : '(the projection never asked)');
  say('');
}

say('## The meter');
say('');
say(`${meter.calls} calls, $${meter.cost.toFixed(4)}.`);
for (const [role, r] of Object.entries(meter.byRole))
  say(`- ${role}: ${r.calls} calls, $${r.cost.toFixed(4)}`);
writeFileSync('docs/spike/p3.9c-fight.md', `${out.join('\n')}\n`);
