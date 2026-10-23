// The go-in screen's store (P3.9; design § UI and screens, The go-in screen; § The resolver, The
// pipeline). The life holds the scene (core/goin.ts); this runs a turn from your words to its
// telling: the interpreter's plan, or two or three readings as buttons; a refusal back in the box
// with no tick spent; a plan at stake waiting for Do it; the rounds; the narrator streaming at the
// length the moment takes, with Tell it when it can't be had; the chronicler every ten turns and on
// leaving; and the leaving card. A fight the scene opens is played on the Combat screen, and its
// end comes back here to be told (ui/fight.ts). Every step saves.
import { create } from 'zustand';
import { atlasOf, type Atlas, type AtlasEntry } from '../ai/context.ts';
import {
  FALLBACK_LINE,
  fightActionOf,
  interpret,
  interpretFight,
  type FightAction,
  type Reading,
} from '../ai/interpret.ts';
import { CHRONICLE_EVERY, chronicle, narrate } from '../ai/narrate.ts';
import { exchangeOutcome, fightEndOutcome, outcomeOf } from '../ai/outcome.ts';
import { combatantIn, type Fight } from '../core/combat/fight.ts';
import { sceneView, settingText, toneText, wordsFor } from '../ai/scene.ts';
import type { GoInLength } from '../content/goin.ts';
import { ACTS, COSTS, SHORTS } from '../content/resolver.ts';
import {
  addTurn,
  checkPlan,
  chronicleScene,
  clearPending,
  endScene,
  everyoneAdult,
  goInCard,
  goInHere,
  goInTemplate,
  keepTelling,
  lastAct,
  leave,
  leavingCard,
  retell,
  runTurn,
  sceneExit,
  sceneSetting,
  setPending,
  templatedLine,
  tickWords,
  type LeavingCard,
  type SceneFightBack,
} from '../core/goin.ts';
import type { FightEnd } from '../core/played.ts';
import { keepLasts } from '../core/voices.ts';
import {
  crowdHere,
  engageAimed,
  goInPlace,
  sitLecture,
  type PlaceDoor,
} from '../core/goinPlace.ts';
import { faceId } from '../core/crowd.ts';
import { NEW_SPOT } from '../content/goin.ts';
import { placeById, type MapPlace, type RegionMap } from '../core/map/region.ts';
import { mapOf } from '../core/map/travel.ts';
import { doorsOf } from './placeDoors.ts';
import { nameOf } from '../core/people.ts';
import { realmOfActor } from '../core/resolver/actor.ts';
import { fighterOf } from '../core/resolver/scene.ts';
import { REALM_IDS, realmIndex } from '../content/realms.ts';
import { opinion } from '../core/resolver/opinion.ts';
import type { Plan } from '../core/resolver/plan.ts';
import type { Scene, StepResult } from '../core/resolver/scene.ts';
import type { GameState, GoInTurn } from '../core/state.ts';
import { gameAi, hasKey, meter } from './ai.ts';
import {
  act,
  leaveFight,
  setSceneFightBack,
  setSceneTurn,
  useFight,
  type Exchange,
} from './fight.ts';
import { currentFight, foeNames } from '../core/playFight.ts';
import { addNotMeant, spendToday, useSettings } from './settings.ts';
import { useGame } from './store.ts';

let atlas: Atlas | null = null;

/** The atlas the context reads, loaded the first time you go in (it is the game's biggest file). */
export async function loadAtlas(): Promise<Atlas> {
  if (!atlas) {
    const m = (await import('../content/generated/atlas.json')) as unknown as {
      default: { entries: AtlasEntry[] };
    };
    atlas = atlasOf(m.default.entries);
    useGoIn.setState({ atlasReady: true });
  }
  return atlas;
}

export function atlasNow(): Atlas | null {
  return atlas;
}

interface GoInUi {
  /** What is running: reading your words, telling a turn, or leaving. */
  busy: 'reading' | 'telling' | 'leaving' | null;
  /** The turn being told: your words, and the prose as it streams. */
  saying: string | null;
  streaming: string;
  /** The text box. */
  words: string;
  /** Two or three readings of your words, as buttons. */
  readings: Reading[] | null;
  /** A line at the box: a refusal, the words that didn't take shape, a key missing. */
  note: string | null;
  /** The daily warning, once a day past the sum set. */
  warn: string | null;
  /** The card shown once the scene has ended. */
  leaving: LeavingCard | null;
  atlasReady: boolean;
}

export const useGoIn = create<GoInUi>()(() => ({
  busy: null,
  saying: null,
  streaming: '',
  words: '',
  readings: null,
  note: null,
  warn: null,
  leaving: null,
  atlasReady: false,
}));

const game = (): GameState | null => useGame.getState().game;

function apply(next: GameState): void {
  useGame.getState().applyLife(() => next);
  void useGame.getState().saveNow();
}

// ── Doors ────────────────────────────────────────────────────────────────────────────────────

/**
 * Opens a scene by a door and tells you going in; the reason when it can't. The dev console's door
 * opens without a key, the turns told by the engine's plain lines, so the screen can be looked at.
 */
function openBy(door: (s: GameState) => GameState | string, needKey = true): string | null {
  const s = game();
  if (!s) return 'No life is open.';
  if (needKey && !hasKey()) return 'Going in needs an OpenRouter key: add one in Settings.';
  const r = door(s);
  if (typeof r === 'string') return r;
  useGoIn.setState({ leaving: null, note: null, readings: null, words: '', warn: null });
  apply(r);
  void tellOpening();
  return null;
}

/** An encounter card's Go in. */
export function goInto(encId: string): string | null {
  return openBy((s) => goInCard(s, encId));
}

/** Go in here, on the map's bar once you've stopped. */
export function goInHereNow(): string | null {
  return openBy(goInHere);
}

/** A place's streets or one of its doors, from its screen (P3.9b). */
export function goInDoor(d: PlaceDoor): string | null {
  return openBy((s) => goInPlace(s, d));
}

/** Go in at a place's door, or its streets with none, as its screen lays its doors out. */
export function goInAt(
  map: RegionMap,
  place: MapPlace,
  door: string | null,
  person?: string,
  opening?: string,
): string | null {
  const s = game();
  if (!s) return 'No life is open.';
  const doors = doorsOf(s, map, place).map((d) => ({
    id: d.id,
    name: d.name,
    art: d.art,
    group: d.group,
  }));
  return goInDoor({
    place,
    doors,
    door,
    ...(person ? { person } : {}),
    ...(opening ? { opening } : {}),
  });
}

/** The dev console's `goin <template>`. */
export function goInDev(template: string): string | null {
  // Inside a place (P3.9b): `place:` its streets, `place:<door>` a door, without a key.
  if (template.startsWith('place:')) {
    const s = game();
    const map = s?.map ? mapOf(s) : null;
    const place = map && s?.map?.inside ? placeById(map, s.map.inside) : null;
    if (!s || !map || !place) return 'Enter a place first.';
    const doors = doorsOf(s, map, place).map((d) => ({
      id: d.id,
      name: d.name,
      art: d.art,
      group: d.group,
    }));
    // A door by its counter's key or by its piece on the sheet: `goin stall`, `goin inn`.
    const want = template.slice(6);
    const door = want ? (doors.find((d) => d.id === want || d.art === want)?.id ?? want) : null;
    return openBy((x) => goInPlace(x, { place, doors, door }), false);
  }
  return openBy((s) => (template === 'here' ? goInHere(s) : goInTemplate(s, template)), false);
}

// ── Telling ──────────────────────────────────────────────────────────────────────────────────

/** "asked · clear · ½ hour", and the numbers behind it for its "?". */
function lineOf(
  s: GameState,
  results: readonly StepResult[],
  ticks: number,
): { line: string; why?: string } {
  const mine = results.filter((r) => r.actor === s.player.id);
  const last = mine[mine.length - 1];
  // A fight's end, played on the stage, whoever started it.
  const fought = results.find((r) => r.fight);
  if (!last && !fought) return { line: `you wait · ${tickWords(Math.max(1, ticks))}` };
  if (fought?.fight) {
    const me = s.goin?.scene.actors.find((a) => a.id === s.player.id);
    const how =
      fought.fight.winner === null
        ? 'nobody stands'
        : fought.fight.winner === me?.side
          ? 'your side stands'
          : 'their side stands';
    return { line: `a fight · ${how} · ${fought.fight.turns} turns` };
  }
  const l = last!;
  const parts: string[] = [ACTS[l.step.act].name];
  let why: string | undefined;
  if (l.refused) parts.push(`can’t: ${l.refused}`);
  else if (l.check) {
    parts.push(l.check.verdict);
    if (l.cost) parts.push(COSTS[l.cost]);
    if (l.short) parts.push(SHORTS[l.short]);
    why = `yours ${l.check.yours.toFixed(2)} against ${l.check.theirs.toFixed(2)}`;
  } else parts.push('nothing at stake');
  parts.push(tickWords(Math.max(1, ticks)));
  return { line: parts.join(' · '), ...(why ? { why } : {}) };
}

interface Telling {
  said: string | null;
  before: Scene;
  results: readonly StepResult[];
  stopped?: string | null;
  length: GoInLength;
  arrival?: boolean;
  /** Engine lines the outcome adds: a card's exit, a fall, a flight. */
  extra?: readonly string[];
  read?: string;
  /** The quiet line, when the engine's own isn't it: a fight's exchange (P3.9c). */
  line?: { line: string; why?: string };
  /** A fight's exchange inside the scene, its number. */
  exchange?: number;
  /** The outcome as the narrator gets it, when it isn't the round's: a fight's exchange. */
  outcome?: (view: ReturnType<typeof sceneView>) => ReturnType<typeof outcomeOf>;
}

/** The meter's cost of a call made since `from`. */
const spentSince = (from: number) => Math.max(0, meter.cost - from);

/**
 * Tells a turn: the outcome as the narrator gets it, streamed at the length the moment takes;
 * keeps the turn, the choices, the notes and the cost; the chronicler every ten turns. A narrator
 * that can't be had leaves the engine's plain lines with Tell it.
 */
async function tell(t: Telling): Promise<void> {
  const s0 = game();
  if (!s0?.goin) return;
  const from = meter.cost;
  useGoIn.setState({ busy: 'telling', saying: t.said, streaming: '' });
  try {
    const a = await loadAtlas();
    const s = game()!;
    const g = s.goin!;
    const view = sceneView(s, a);
    const out = t.outcome
      ? t.outcome(view)
      : outcomeOf(view, t.before, g.scene, t.results, t.stopped ?? null);
    if (t.extra?.length) {
      out.plain.push(...t.extra);
      out.text += `\n${t.extra.map((l) => `- ${l}`).join('\n')}`;
    }
    const set = sceneSetting(s);
    // Going in: the engine's own line, should the narrator not be had, is the card's opening.
    if (t.said === null) {
      out.text += '\n- You go in.';
      out.plain.push(
        set?.opening ??
          (g.place
            ? `You step into ${g.title}.`
            : 'You stop where you stand and take in the land.'),
      );
    }
    const before = [
      ...(t.said === null && set ? [settingText(set)] : []),
      toneText(useSettings.getState().mature && everyoneAdult(s)),
    ].join('\n\n');
    const n = await narrate(gameAi, view, out, {
      words: wordsFor(t.length, t.arrival),
      before,
      onProse: (p) => useGoIn.setState((u) => ({ streaming: u.streaming + p })),
    });
    const ticks = g.scene.tick - t.before.tick;
    const turn: GoInTurn = {
      said: t.said,
      told: n.prose,
      ...(t.said === null ? { line: 'you go in' } : (t.line ?? lineOf(s, t.results, ticks))),
      length: t.length,
      ...(t.exchange ? { exchange: t.exchange } : {}),
      ...(t.read ? { read: t.read } : {}),
      ...(n.fellBack === 'prose' ? { outcome: out.text } : {}),
    };
    let next = keepTelling(addTurn(game()!, turn), { choices: n.choices, notes: n.notes });
    // What lasts of the turn's people: their lines, their word for you, a memory's own words, a moment.
    next = keepLasts(next, n.lasts, t.results);
    if (next.goin!.since >= CHRONICLE_EVERY) next = await sumUp(next);
    apply(keepTelling(next, { cost: spentSince(from) }));
  } finally {
    const warn = spendToday(spentSince(from));
    useGoIn.setState({
      busy: null,
      saying: null,
      streaming: '',
      ...(warn ? { warn: `Going in has passed $${useSettings.getState().warnAt} today.` } : {}),
    });
  }
  if (game()?.goin?.ending) await finish();
}

/** The chronicler's summary of the turns since it last ran, kept for the next calls. */
async function sumUp(s: GameState): Promise<GameState> {
  const a = await loadAtlas();
  const g = s.goin!;
  const turns = g.turns
    .slice(-g.since)
    .map((t) => ({ said: t.said ?? 'You go in.', told: t.told }));
  const c = await chronicle(gameAi, sceneView(s, a), turns, {
    summary: g.summary || undefined,
    templated: templatedLine(s),
  });
  return keepTelling(s, { summary: c.summary, notes: c.notes });
}

async function tellOpening(): Promise<void> {
  const s = game();
  if (!s?.goin) return;
  const quiet = sceneSetting(s)?.quiet ?? false;
  await tell({
    said: null,
    before: s.goin.scene,
    results: [],
    length: quiet ? 'quiet' : 'opening',
  });
}

/** Tell it: the telling again, for a turn the narrator couldn't tell. */
export async function tellAgain(): Promise<void> {
  const s = game();
  const last = s?.goin?.turns.at(-1);
  if (!s?.goin || !last?.outcome) return;
  const from = meter.cost;
  useGoIn.setState({ busy: 'telling', saying: last.said, streaming: '' });
  try {
    const view = sceneView(s, await loadAtlas());
    const n = await narrate(
      gameAi,
      view,
      { text: last.outcome, plain: [last.told] },
      {
        words: wordsFor((last.length as GoInLength | undefined) ?? 'plain'),
        before: toneText(useSettings.getState().mature && everyoneAdult(s)),
        onProse: (p) => useGoIn.setState((u) => ({ streaming: u.streaming + p })),
      },
    );
    if (n.fellBack !== 'prose') {
      const { outcome: _told, ...rest } = last;
      void _told;
      apply(
        keepTelling(retell(game()!, { ...rest, told: n.prose }), {
          choices: n.choices,
          notes: n.notes,
          cost: spentSince(from),
        }),
      );
    }
  } finally {
    spendToday(spentSince(from));
    useGoIn.setState({ busy: null, saying: null, streaming: '' });
  }
}

// ── Your turn ────────────────────────────────────────────────────────────────────────────────

/** What a fight inside the scene left to tell once it ends: its last exchange, its lines. */
let fightTurn: { said: string; read?: string; extra?: string[] } | null = null;

/**
 * A fight opens inside the scene (P3.9c): the steps that led to it and the first sight of it, told
 * as a beat; the exchanges follow on the painting.
 */
function opensFight(
  said: string,
  before: Scene,
  results: readonly StepResult[],
  read?: string,
): void {
  const s = game()!;
  const f = currentFight(s);
  // Named as you know them: a stranger stays a stranger (P3.9c).
  const me = f && combatantIn(f, s.player.id);
  const foes =
    f && atlas && me
      ? f.combatants
          .filter((c) => c.side !== me.side)
          .map((c) => sceneView(s, atlas!).people[c.id]?.label ?? 'someone')
          .join(', ')
      : f
        ? foeNames(s, f)
        : 'them';
  void tell({
    said,
    before,
    results,
    length: 'beat',
    extra: [`A fight begins: you against ${foes}.`],
    line: { line: `a fight · against ${foes}` },
    ...(read ? { read } : {}),
  });
}

/** Runs a plan as the turn, or opens the fight it reaches; then tells it. */
async function run(plan: Plan, said: string, read?: string, stake = false): Promise<void> {
  const s = game();
  if (!s?.goin) return;
  const r = runTurn(s, plan);
  apply(r.state);
  if (r.fight) {
    opensFight(said, r.before, r.results, read);
    return;
  }
  const surprise = r.results.some((x) => x.surprise);
  await tell({
    said,
    before: r.before,
    results: r.results,
    stopped: r.stopped,
    length: stake ? 'stake' : 'plain',
    arrival: r.arrivals || surprise,
    ...(read ? { read } : {}),
  });
}

/** A reading picked or the only one: refused back to the box, waiting at stake, or run. */
async function choose(reading: Reading, words: string): Promise<void> {
  const s = game();
  if (!s?.goin) return;
  useGoIn.setState({ readings: null });
  const c = checkPlan(s, reading.plan);
  if (c.refused) {
    // Nothing happens and no tick passes: your words stay in the box.
    useGoIn.setState({ note: `You can’t: ${c.refused}.`, words });
    return;
  }
  if (c.stake) {
    apply(setPending(s, words, reading.label, reading.plan));
    useGoIn.setState({ words: '' });
    return;
  }
  useGoIn.setState({ words: '' });
  await run(reading.plan, words, reading.label);
}

/** Your words: the interpreter's plan, two or three readings, or a line back at the box. */
export async function say(words: string): Promise<void> {
  const text = words.trim();
  const s = game();
  if (!text || !s?.goin || useGoIn.getState().busy) return;
  if (!hasKey()) {
    useGoIn.setState({ note: 'Going in needs an OpenRouter key: add one in Settings.' });
    return;
  }
  if (s.fight?.from.kind === 'scene') return sayInFight(text);
  useGoIn.setState({ busy: 'reading', note: null, readings: null, words: text });
  const from = meter.cost;
  try {
    const view = sceneView(s, await loadAtlas());
    const r = await interpret(gameAi, view, text);
    apply(keepTelling(game()!, { cost: spentSince(from) }));
    if (r.kind === 'fallback') {
      useGoIn.setState({ note: FALLBACK_LINE });
      return;
    }
    if (r.kind === 'nothing') {
      useGoIn.setState({ note: r.reason });
      return;
    }
    if (r.readings.length > 1) {
      useGoIn.setState({ readings: r.readings });
      return;
    }
    useGoIn.setState({ busy: null });
    await choose(r.readings[0]!, text);
  } catch (e) {
    useGoIn.setState({ note: `The words don’t reach anyone: ${(e as Error).message}` });
  } finally {
    spendToday(spentSince(from));
    if (useGoIn.getState().busy === 'reading') useGoIn.setState({ busy: null });
  }
}

/**
 * Your words in a fight inside the scene (P3.9c): P3.8's fight interpreter reads one turn, made
 * legal against the fight; one beyond you plays as the closest legal action and says why. Words it
 * can't read stay in the box, and no exchange passes.
 */
async function sayInFight(text: string): Promise<void> {
  const s = game()!;
  const f = useFight.getState().fight;
  if (!f) return;
  useGoIn.setState({ busy: 'reading', note: null, readings: null, words: text });
  const from = meter.cost;
  let read: FightAction | undefined;
  try {
    const r = await interpretFight(gameAi, sceneView(s, await loadAtlas()), text);
    apply(keepTelling(game()!, { cost: spentSince(from) }));
    if (r.kind === 'fallback') {
      useGoIn.setState({ note: r.reason });
      return;
    }
    read = fightActionOf(f, s.player.id, r.turn, useFight.getState().target);
  } catch (e) {
    useGoIn.setState({ note: `The words don’t reach anyone: ${(e as Error).message}` });
    return;
  } finally {
    spendToday(spentSince(from));
    useGoIn.setState({ busy: null });
  }
  if (!read) return;
  useGoIn.setState({ words: '' });
  act(read.action, text, read.why);
}

/** Flee, from a fight inside the scene: the engine's flight, against their Speed. */
export function fleeFight(): void {
  act({ main: { type: 'flee' } }, 'Flee');
}

/** Give face to the projection that asked for it: it takes its charge away. */
export function giveFaceNow(): void {
  act({ face: true }, 'Give face');
}

/**
 * An exchange of a fight inside the scene, told as a beat of a sentence or two (P3.9c); the last
 * exchange is told with the fight's end, once, at the fight's length.
 */
function tellExchange(x: Exchange): void {
  const s = game();
  if (!s?.goin) return;
  // The fight's last exchange is told with its end; its lines named as your context names them.
  const extra = atlas
    ? exchangeOutcome(sceneView(s, atlas), x).plain
    : x.lines.map((l) => `${l.head}: ${l.line}`);
  if (x.end) {
    fightTurn = { said: x.said, extra };
    leaveFight();
    return;
  }
  // The quiet line names people as your context does, never a stranger's name (P3.9c).
  const plain = atlas ? exchangeOutcome(sceneView(s, atlas), x).plain : null;
  const mine = plain
    ? plain.filter((l) => l.startsWith('you: ')).map((l) => l.slice(5))
    : x.lines.filter((l) => l.mine).map((l) => l.line);
  void tell({
    said: x.said,
    before: s.goin.scene,
    results: [],
    length: 'beat',
    arrival: x.came.length > 0,
    outcome: (view) => exchangeOutcome(view, x),
    exchange: x.fight.turn,
    line: {
      line: [...(x.why ? [`can’t: ${x.why}`] : []), ...mine].join(' · ') || 'the exchange',
      why: plain ? plain.join(' / ') : x.lines.map((l) => `${l.head} · ${l.line}`).join(' / '),
    },
  });
}

setSceneTurn(tellExchange, () => !!useGoIn.getState().busy);

/** One of the readings, picked. */
export function pickReading(r: Reading): void {
  void choose(r, useGoIn.getState().words);
}

/** Do it: the plan at stake runs. */
export function doIt(): void {
  const p = game()?.goin?.pending;
  if (!p || useGoIn.getState().busy) return;
  void run(p.plan, p.words, p.label, true);
}

/** Change it: the plan is dropped and your words go back in the box. */
export function changeIt(): void {
  const s = game();
  const p = s?.goin?.pending;
  if (!s || !p) return;
  apply(clearPending(s));
  useGoIn.setState({ words: p.words });
}

/** Wait: to the next arrival, when someone is on the way. */
export function wait(): void {
  const s = game();
  if (!s?.goin || useGoIn.getState().busy) return;
  void run({ actor: s.player.id, steps: [{ verb: 'rest', act: 'wait' }] }, 'Wait');
}

/** A move inside a place, clicked (P3.9b): a door here, another district's street, a room. */
export function moveNow(frame: string, name: string): void {
  const s = game();
  if (!s?.goin || useGoIn.getState().busy) return;
  void run(
    { actor: s.player.id, steps: [{ verb: 'go', act: 'enter', target: frame }] },
    `Go to ${name}`,
  );
}

/**
 * The dev console's `goin fight` (P3.9c): you attack someone in your frame, by id or the first
 * stranger, so a fight inside the scene can be looked at without a key.
 */
export function fightDev(who?: string): string | null {
  const s = game();
  if (!s?.goin) return 'Go in first.';
  const target = s.goin.scene.actors.find(
    (a) =>
      a.state === 'present' &&
      !s.goin!.scene.players.includes(a.id) &&
      (who ? a.id === who || a.name.toLowerCase().includes(who.toLowerCase()) : a.side !== 'law'),
  );
  // Nobody made yet: one of the crowd's faces, made as it is aimed at (P3.9b).
  const face = target ? null : crowdHere(s)?.faces.find((x) => !who || x.line.includes(who));
  if (!target && !face) return 'Nobody here to fight.';
  void run(
    {
      actor: s.player.id,
      steps: [{ verb: 'fight', act: 'attack', target: target?.id ?? faceId(face!.key) }],
    },
    `Attack ${target?.name ?? face!.line}`,
  );
  return null;
}

/**
 * The dev console's `goin backer` (P3.9c): someone in your frame, the first stranger or by id,
 * gets a backer two realms up and is left hurt, so a projection can be looked at.
 */
export function backerDev(who?: string): string | null {
  const s0 = game();
  if (!s0?.goin) return 'Go in first.';
  // Nobody made yet: the crowd's first face is made into someone to back.
  const face = crowdHere(s0)?.faces[0];
  const s =
    face && !who && !s0.goin.scene.actors.some((x) => !s0.goin!.scene.players.includes(x.id))
      ? engageAimed(s0, [faceId(face.key)])
      : s0;
  const sc = s.goin!.scene;
  const a = sc.actors.find(
    (x) =>
      x.state === 'present' &&
      !sc.players.includes(x.id) &&
      (who ? x.id === who : x.side !== 'law'),
  );
  if (!a) return 'Nobody here to back.';
  const r = realmOfActor(a);
  const up = REALM_IDS[Math.min(REALM_IDS.length - 1, realmIndex(r.realm) + 2)]!;
  const backer = { id: `${a.id}-backer`, name: 'Elder Han', realm: { realm: up, stage: 1 } };
  const hurt = fighterOf(a);
  apply({
    ...s,
    goin: {
      ...s.goin!,
      // Hurt to under a third, so a few blows call the projection.
      scene: {
        ...sc,
        actors: sc.actors.map((x) =>
          x.id === a.id
            ? { ...x, backer, combatant: { ...hurt, hp: Math.ceil(hurt.maxHp * 0.3) } }
            : x,
        ),
      },
    },
  });
  return null;
}

/** Somewhere quiet: a made frame off where you stand, out of the crowd's eyes. */
export function quietNow(): void {
  const s = game();
  const here = s?.goin?.place?.frames.find((f) => f.id === s.goin!.place!.at);
  if (!s?.goin || !here || useGoIn.getState().busy) return;
  void run(
    {
      actor: s.player.id,
      steps: [
        { verb: 'go', act: 'enter', target: NEW_SPOT, as: `a quiet corner behind ${here.name}` },
      ],
    },
    'Somewhere quiet',
  );
}

/** The elder's lecture, sat (and a question asked), told as a turn. */
export function lectureNow(question: boolean): void {
  const s = game();
  if (!s?.goin || useGoIn.getState().busy) return;
  const r = sitLecture(s, question);
  if (typeof r === 'string') {
    useGoIn.setState({ note: r });
    return;
  }
  const before = s.goin.scene;
  apply(r.state);
  void tell({
    said: question ? 'Sit the lecture, and ask a question' : 'Sit the lecture',
    before,
    results: [],
    length: 'plain',
    extra: [r.text],
  });
}

/** A card's exit, clicked: the Combat screen, or the card settling as it always has. */
export function takeExit(i: number, label: string): void {
  const s = game();
  if (!s?.goin || useGoIn.getState().busy) return;
  const r = sceneExit(s, i);
  if (typeof r === 'string') {
    useGoIn.setState({ note: r });
    return;
  }
  const before = s.goin.scene;
  apply(r.state);
  if (r.fight) {
    opensFight(label, before, []);
    return;
  }
  void tell({ said: label, before, results: [], length: 'stake', extra: [r.text] });
}

/** Leave: walked out, a flight from whoever means to stop you, or refused when pinned. */
export function leaveNow(): void {
  const s = game();
  if (!s?.goin || useGoIn.getState().busy) return;
  const r = leave(s);
  if (!r.out && !r.turn) {
    useGoIn.setState({ note: r.text });
    return;
  }
  apply(r.state);
  if (r.turn?.fight) {
    opensFight('Leave', r.turn.before, r.turn.results);
    return;
  }
  if (r.turn) {
    void tell({
      said: 'Leave',
      before: r.turn.before,
      results: r.turn.results,
      stopped: r.turn.stopped,
      length: 'stake',
      extra: [r.text],
    });
    return;
  }
  // Walked out with nobody stopping you: straight to the leaving card.
  if (r.text !== 'You leave.') {
    void tell({
      said: 'Leave',
      before: s.goin.scene,
      results: [],
      length: 'plain',
      extra: [r.text],
    });
    return;
  }
  void finish();
}

/** Down: your last act, a plea or nothing; whoever stands over you decides. */
export function lastActNow(plea: boolean): void {
  const s = game();
  if (!s?.goin?.down || useGoIn.getState().busy) return;
  const r = lastAct(s, plea);
  apply(r.state);
  void tell({
    said: plea ? 'Beg' : 'Let it come',
    before: s.goin.scene,
    results: [],
    length: 'stake',
    extra: [r.text],
  });
}

/** "Not what I meant" on one of your turns: kept in the local log Settings exports. */
export function notMeant(turn: GoInTurn, meant: string): void {
  addNotMeant({ words: turn.said ?? '', read: turn.read ?? '', meant });
}

// ── A fight played on the stage comes back ───────────────────────────────────────────────────

setSceneFightBack((back: SceneFightBack, end: FightEnd, f: Fight) => {
  const t = fightTurn ?? { said: 'The fight' };
  fightTurn = null;
  const last = [...(t.extra ?? []), back.text, ...(end === 'lost' ? ['You are down.'] : [])];
  void tell({
    said: t.said,
    before: back.before,
    results: back.results,
    length: 'fight',
    arrival: false,
    // Its own outcome: how it ended, the sides, its last exchange, what the scene made of it.
    outcome: (view) =>
      fightEndOutcome(view, f, end, back.before, game()!.goin!.scene, back.results, last),
    ...(t.read ? { read: t.read } : {}),
  });
});

// ── Leaving ──────────────────────────────────────────────────────────────────────────────────

/**
 * The scene ends: the chronicler's last call gives the leaving card its line, the card is read
 * before the scene closes, the offline hours it banked land, and the card shows.
 */
async function finish(): Promise<void> {
  const s = game();
  if (!s?.goin) return;
  useGoIn.setState({ busy: 'leaving' });
  let line = templatedLine(s);
  const from = meter.cost;
  try {
    if (hasKey() && s.goin.turns.length) {
      const a = await loadAtlas();
      const g = s.goin;
      const c = await chronicle(
        gameAi,
        sceneView(s, a),
        g.turns
          .slice(-Math.max(1, g.since))
          .map((t) => ({ said: t.said ?? 'You go in.', told: t.told })),
        { summary: g.summary || undefined, templated: line },
      );
      line = c.line;
    }
  } catch {
    // The templated line stands.
  }
  spendToday(spentSince(from));
  const now = game()!;
  const banked = now.goin?.banked ?? 0;
  const after = chronicleScene(endScene(now), line);
  const card = leavingCard(now, after, line, {
    name: (id) => {
      const known = atlas ? sceneView(now, atlas).people[id]?.label : undefined;
      return known && known !== 'you' ? known : nameOf(now, id);
    },
    word: (id) => opinion(after.world, id, now.player.id, after.calendar.day).word,
  });
  apply(after);
  useGoIn.setState({ busy: null, leaving: card, readings: null, note: null, words: '' });
  if (banked > 0) useGame.getState().devAway(banked);
}

/** The leaving card read: back to where you went in from. */
export function dismissLeaving(): void {
  useGoIn.setState({ leaving: null });
}
