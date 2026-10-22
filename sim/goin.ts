// P3.9's check on GLM by hand: `npm run goin` (loads .env.local). The road's scenes played through
// the real pipeline, as the go-in screen plays them (ui/goin.ts): going in told over where you
// stand, your words read by the interpreter, the at-stake rule, the rounds, a fight played out on
// the engine and handed back, Wait for whoever its noise called, and the chronicler's last line.
// Writes docs/spike/p3.9-road.md. About 40 calls, ten to fifteen cents.
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
import {
  addTurn,
  checkPlan,
  endScene,
  goInHere,
  goInTemplate,
  keepTelling,
  runTurn,
  sceneSetting,
  templatedLine,
  waitTurn,
  type TurnRun,
} from '../src/core/goin.ts';
import { ensureMap } from '../src/core/map/travel.ts';
import { fightEnd, playTurn } from '../src/core/played.ts';
import { finishFight, fightStart } from '../src/core/playFight.ts';
import type { Scene, StepResult } from '../src/core/resolver/scene.ts';
import { newLife, withPlayer, type GameState } from '../src/core/state.ts';

const keys = envKey(process.env);
if (!keys.key()) {
  console.error('No OPENROUTER_API_KEY. Put it in .env.local and run `npm run goin`.');
  process.exit(1);
}
const meter = new CostMeter();
const ai = { provider: keyedProvider(keys, { appTitle: 'Severed Heaven P3.9' }), meter };
const atlas = atlasOf(atlasJson.entries as unknown as AtlasEntry[]);

const out: string[] = ['# P3.9: the road on GLM', '', `Run ${new Date().toISOString()}.`, ''];
const say = (line = '') => {
  console.log(line);
  out.push(line);
};

const life = (): GameState =>
  ensureMap(
    newLife({ name: 'Han Li', seed: 'road-glm', origin: { id: 'conscript', choice: 'along' } }),
  );
const layer = (s: GameState, stage: number, realm = 'qi-condensation' as const): GameState =>
  withPlayer(s, {
    ...s.player,
    qi: { ...s.player.qi, realm, stage },
    body: { ...s.player.body, stage: Math.ceil(stage / 2) },
    soul: { ...s.player.soul, stage: Math.ceil(stage / 2) },
  });

/** Tells a turn as the screen does, and keeps it. */
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
  const words = n.prose.split(/\s+/).filter(Boolean).length;
  say(
    `**${said ?? 'Going in'}** · ${length} (${wordsFor(length).join('–')} words asked, ${words} told${n.fellBack !== 'none' ? `, fell back: ${n.fellBack}` : ''}) · $${(meter.cost - from).toFixed(4)}`,
  );
  say('');
  say(`> ${n.prose.replace(/\n+/g, ' ')}`);
  say('');
  say(`Choices: ${n.choices.join(' · ')}`);
  say('');
  return keepTelling(addTurn(s, { said, told: n.prose, line: '' }), {
    choices: n.choices,
    notes: n.notes,
  });
}

/** Your words, read and run as the screen runs them: refused, waiting at stake, or straight. */
async function typed(s: GameState, words: string): Promise<GameState> {
  const r = await interpret(ai, sceneView(s, atlas), words);
  if (r.kind !== 'plan') {
    say(`**${words}** → ${r.kind}: ${r.reason}`);
    say('');
    return s;
  }
  const reading = r.readings[0]!;
  const readings = r.readings.map(
    (x) => `"${x.label}" (${x.plan.steps.map((st) => st.act).join(', ')})`,
  );
  const c = checkPlan(s, reading.plan);
  say(
    `*${words}* → ${readings.join(' | ')}${c.refused ? ` · refused: ${c.refused}` : ''}${c.stake ? ' · at stake: waits for Do it' : ' · runs straight through'}`,
  );
  say('');
  if (c.refused) return s;
  const t = runTurn(s, reading.plan);
  if (t.fight) return fought(t, words);
  return tell(t.state, words, t.before, t.results, c.stake ? 'stake' : 'plain', [], t.stopped);
}

/** A fight the turn opened, struck out on the engine as a player would, handed back and told. */
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
  say(`(the fight, played on the engine: ${back.end})`);
  say('');
  return tell(back.state, said, back.scene!.before, back.scene!.results, 'fight', [
    back.scene!.text,
  ]);
}

async function leaveAndSum(s: GameState): Promise<void> {
  const g = s.goin!;
  const c = await chronicle(
    ai,
    sceneView(s, atlas),
    g.turns.map((t) => ({ said: t.said ?? 'You go in.', told: t.told })),
    { templated: templatedLine(s) },
  );
  say(`Leaving card's line: *${c.line}*${c.fellBack ? ' (templated)' : ''}`);
  say('');
  endScene(s, 'left');
}

async function card(template: string, s0: GameState, turns: string[]): Promise<void> {
  say(`## ${template}`);
  say('');
  const r = goInTemplate(s0, template);
  if (typeof r === 'string') {
    say(`Can't go in: ${r}`);
    return;
  }
  let s = await tell(r, null, r.goin!.scene, [], sceneSetting(r)?.quiet ? 'quiet' : 'opening');
  for (const w of turns) {
    if (!s.goin || s.goin.ending) break;
    s = await typed(s, w);
  }
  if (s.goin) await leaveAndSum(s);
}

// A card of each kind.
await card('ditch-bandits', layer(life(), 3), [
  'Tell them to climb out of the ditch and go home before someone gets hurt',
  'Chat with the one holding the rope about the road ahead',
]);
await card('salt-mule-train', layer(life(), 3), [
  'Ask the peddler what news there is from the road behind him',
  'Buy some salt from him',
]);
await card('pine-deserters', layer(life(), 4), [
  'Read their realms',
  'Tell them I am no one worth robbing',
]);
await card('clover-in-the-grass', layer(life(), 3), ['Look around the hollow carefully']);
await card('qi-tide-off-the-downs', layer(life(), 3), ['Sit and breathe with the tide']);
await card('home-comes-up-the-road', layer(life(), 3), ['Sit with them and ask after home']);

// The playbook's road cases: a fight's noise drawing strangers.
say('## A fight’s noise draws strangers');
say('');
{
  const strong = withPlayer(layer(life(), 3), {
    ...layer(life(), 3).player,
    qi: { ...layer(life(), 3).player.qi, realm: 'foundation-establishment', stage: 3 },
    body: { ...layer(life(), 3).player.body, realm: 'foundation-establishment', stage: 1 },
    soul: { ...layer(life(), 3).player.soul, realm: 'foundation-establishment', stage: 1 },
  });
  const r = goInTemplate(strong, 'ditch-bandits');
  if (typeof r !== 'string') {
    let s = await tell(r, null, r.goin!.scene, [], 'opening');
    s = await typed(s, 'Kick the nearest one out of the ditch and break his arm');
    for (let i = 0; i < 6 && s.goin && !s.goin.ending; i++) {
      const w = waitTurn(s);
      s = w.state;
      if (w.arrivals) {
        s = await tell(s, 'Wait', w.before, w.results, 'plain', [], w.stopped);
        break;
      }
    }
    if (s.goin) await leaveAndSum(s);
  }
}

// Walking away from your abode with nothing.
say('## Walking away from your abode with nothing');
say('');
{
  const s0 = withPlayer(layer(life(), 3), { ...layer(life(), 3).player, items: {} });
  const r = goInHere(s0);
  if (typeof r !== 'string') {
    let s = await tell(r, null, r.goin!.scene, [], 'quiet');
    s = await typed(
      s,
      'I leave everything behind and walk away from my abode without looking back',
    );
    if (s.goin) await leaveAndSum(s);
  }
}

say('## The meter');
say('');
say(`${meter.calls} calls, $${meter.cost.toFixed(4)}.`);
for (const [role, r] of Object.entries(meter.byRole))
  say(`- ${role}: ${r.calls} calls, $${r.cost.toFixed(4)}`);
writeFileSync('docs/spike/p3.9-road.md', `${out.join('\n')}\n`);
