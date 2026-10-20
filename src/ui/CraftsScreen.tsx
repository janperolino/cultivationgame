// The Crafts screen 艺 (design § Professions, Where crafts live; K1's talk and its mockup): a hub
// with a page a craft, Alchemy first. The page holds the furnace and the recipes known on the left,
// the bench's queue, the tray and the last batches in the middle, and mastery by family and the
// soul gate on the right. Which hours are Craft hours stays on Routine. A batch queued and left
// runs at no hand; sat at, it reads the steady hand (K3), and the land lends its own. Refining (K4)
// is its own page on the same bench: the forge, its recipes, tempering when you sit, and the pieces
// you carry or wear that a craft hour a tier at the forge would mend.
import { useEffect, useState } from 'react';
import type { Recipe } from '../content/catalogs/types.ts';
import { CRAFTS, CRAFT_IDS, FAMILIES, FAMILY_IDS, recipe, recipeFor } from '../content/crafts.ts';
import type { CraftId, FamilyId } from '../content/crafts.ts';
import { item } from '../content/items.ts';
import { MASTERY } from '../content/mastery.ts';
import { rarity } from '../content/rarity.ts';
import {
  batchHours,
  batchesHeld,
  benchWaits,
  craftReach,
  familyBatches,
  handLift,
  handReach,
  familyLevel,
  holdOdds,
  knownRecipes,
  landHand,
  liftOdds,
  liftOf,
  mendNeeds,
  frontHours,
  moveOnBench,
  nextLevelAt,
  planInputs,
  queueBatches,
  queueMend,
  takeTray,
  toMend,
  toolFor,
  toolsHeld,
  unqueue,
  yieldOf,
  type BenchSpot,
} from '../core/crafts.ts';
import { ratesHere } from '../core/life.ts';
import { benchSpot } from '../core/map/travel.ts';
import { withPlayer, type Cultivator } from '../core/state.ts';
import { formatPercent } from './format.ts';
import { sitDown, standUp, useFurnace } from './furnace.ts';
import { ForgeScene } from './ForgeScene.tsx';
import { FurnaceScene } from './FurnaceScene.tsx';
import { itemTag } from './itemWords.ts';
import { go } from './nav.ts';
import { useGame } from './store.ts';

/** Hours to a tenth, as the bench counts them. */
const round1 = (h: number) => Math.round(h * 10) / 10;

/** The crafts built so far (alchemy in K1, refining in K4); the rest show as pages yet to open. */
const BUILT: readonly CraftId[] = ['alchemy', 'refining'];

/** What each built craft's page calls its things. */
const WORDS: Partial<
  Record<
    CraftId,
    { at: string; hanzi: string; line: string; unit: [string, string]; none: string; slip: string }
  >
> = {
  alchemy: {
    at: 'At the furnace',
    hanzi: '守炉',
    line: 'Click the dark dross to burn it to ash; let the gold essence fall back into the pill. Every flick heats the furnace.',
    unit: ['pill', 'pills'],
    none: 'Refiners sell them; a crude clay furnace is 30 low.',
    slip: 'A recipe slip 丹方 is read on study hours, as a formula is; every alchemy shop sells the Qi-Gathering Pill’s.',
  },
  refining: {
    at: 'At the forge',
    hanzi: '炼器',
    line: 'Press a seal into each rune point as its glow passes orange: too hot it blurs, too cold it won’t take. On the last heat, quench the piece as it passes cherry.',
    unit: ['piece', 'pieces'],
    none: 'Refiners sell them; a crude iron forge is 60 low.',
    slip: 'A gear slip 器谱 is read on study hours, as a formula is; every refiner sells the Iron Sword’s.',
  },
};
const words = (k: CraftId) => WORDS[k] ?? WORDS.alchemy!;

export function CraftsScreen() {
  const game = useGame((s) => s.game);
  const applyLife = useGame((s) => s.applyLife);
  const [page, setPage] = useState<CraftId>('alchemy');
  const [pick, setPick] = useState<string | null>(null);
  const [why, setWhy] = useState<string | null>(null);
  const sitting = useFurnace((f) => f.sitting);
  const satAt = useFurnace((f) => f.recipe);
  const satCraft = useFurnace((f) => f.craft);
  // Leaving the page stands you up: the furnace runs itself.
  useEffect(() => standUp, []);
  if (!game) return null;
  const c = game.player;
  // The work at the bench: the batch or mend in the tool, else the next queued, else the one you
  // sat down to; a mend is the forge's.
  const head = c.crafts.front ?? c.crafts.bench[0] ?? null;
  const atFurnace = head?.recipe ?? null;
  const headCraft: CraftId | null = head
    ? head.mend
      ? 'refining'
      : recipe(head.recipe).craft
    : null;
  const playing = atFurnace ?? (sitting ? satAt : null);
  const atCraft: CraftId = headCraft ?? satCraft ?? page;
  const family = head
    ? head.mend
      ? (recipeFor(head.mend)?.family ?? null)
      : recipe(head.recipe).family
    : null;
  const hours = ratesHere(game).count.craft;
  const spot = benchSpot(game);
  const change = (f: (c: Cultivator) => Cultivator) => applyLife((s) => withPlayer(s, f(s.player)));
  const queue = (id: string, n: number) => {
    let reason: string | null = null;
    change((p) => {
      const r = queueBatches(p, id, n);
      reason = r.reason;
      return r.cultivator;
    });
    setWhy(reason);
  };

  return (
    <div className="crafts">
      <nav className="crafts-pages" aria-label="Crafts">
        {CRAFT_IDS.map((k) => (
          <button
            key={k}
            type="button"
            className={`crafts-page${k === page ? ' is-current' : ''}`}
            disabled={!BUILT.includes(k)}
            title={BUILT.includes(k) ? undefined : 'Opens with its own phase.'}
            onClick={() => setPage(k)}
          >
            {CRAFTS[k].page} <span className="hanzi">{CRAFTS[k].hanzi}</span>
          </button>
        ))}
        <span className="crafts-hours">
          {hours > 0
            ? `${hours} craft hour${hours === 1 ? '' : 's'} a day`
            : 'No craft hours on the wheel'}
          {' · '}
          <button type="button" className="link-button" onClick={() => go('routine')}>
            set on Routine
          </button>
        </span>
      </nav>
      <div className="crafts-columns">
        <section className="panel crafts-left">
          <h2 className="panel-heading">The {CRAFTS[page].tool}</h2>
          <Tools c={c} craft={page} />
          <h2 className="panel-heading">Recipes known</h2>
          <Recipes c={c} craft={page} pick={pick} onPick={setPick} />
          {pick && <RecipeCard c={c} r={recipe(pick)} spot={spot} onQueue={queue} />}
          {why && <p className="warn">{why}</p>}
          {page === 'refining' && (
            <>
              <h2 className="panel-heading">To mend</h2>
              <Mends
                c={c}
                onMend={(thing) => {
                  let reason: string | null = null;
                  change((p) => {
                    const r = queueMend(p, thing);
                    reason = r.reason;
                    return r.cultivator;
                  });
                  setWhy(reason);
                }}
              />
            </>
          )}
          {sitting && (
            <>
              <h2 className="panel-heading">The bench</h2>
              <Bench c={c} onChange={change} />
              <Tray c={c} onTake={() => change(takeTray)} />
            </>
          )}
        </section>
        {sitting && (atCraft === 'refining' || playing) ? (
          <section className="panel crafts-furnace">
            <div className="crafts-furnace-top">
              <h2 className="panel-heading">
                {words(atCraft).at} <span className="hanzi">{words(atCraft).hanzi}</span>
              </h2>
              <button type="button" className="button button-quiet" onClick={standUp}>
                Stand up
              </button>
            </div>
            {atCraft === 'refining' ? (
              <ForgeScene key="forge" game={game} family={family} />
            ) : (
              <FurnaceScene key="furnace" game={game} recipe={recipe(playing!)} />
            )}
            <p className="crafts-furnace-line muted">{words(atCraft).line}</p>
            <BatchHand c={c} />
          </section>
        ) : (
          <section className="panel crafts-bench">
            <div className="crafts-furnace-top">
              <h2 className="panel-heading">The bench</h2>
              <button
                type="button"
                className="button"
                disabled={!head}
                title={head ? undefined : 'Queue a batch to sit at it.'}
                onClick={() => head && headCraft && sitDown(head.recipe, headCraft)}
              >
                Sit at the {CRAFTS[headCraft ?? page].tool}
              </button>
            </div>
            <Bench c={c} onChange={change} />
            <Tray c={c} onTake={() => change(takeTray)} />
            <Recent c={c} />
          </section>
        )}
        <section className="panel crafts-right">
          <h2 className="panel-heading">Mastery by family</h2>
          <Families c={c} craft={page} />
          <h2 className="panel-heading">The soul gate</h2>
          <SoulGate c={c} />
          <h2 className="panel-heading">Steady hands 稳手</h2>
          <SteadyHands c={c} craft={page} />
          <h2 className="panel-heading">The land</h2>
          <Land c={c} craft={page} spot={spot} />
          {sitting && <Recent c={c} />}
        </section>
      </div>
    </div>
  );
}

function Tools({ c, craft }: { c: Cultivator; craft: CraftId }) {
  const tools = toolsHeld(c, craft);
  if (tools.length === 0)
    return (
      <p className="muted">
        You carry no {CRAFTS[craft].tool}. {words(craft).none}
      </p>
    );
  return (
    <ul className="crafts-list">
      {tools.map((t) => (
        <li key={t.id} className="crafts-tool">
          <span className={`rarity-${t.rarity}`}>
            {t.name} <span className="hanzi">{t.hanzi}</span>
          </span>
          <span className="muted">
            {itemTag(t)} · {t.cracked ? 'cracked: a refiner mends it' : 'whole'}
          </span>
        </li>
      ))}
    </ul>
  );
}

function Recipes({
  c,
  craft,
  pick,
  onPick,
}: {
  c: Cultivator;
  craft: CraftId;
  pick: string | null;
  onPick: (id: string) => void;
}) {
  const known = knownRecipes(c).filter((r) => r.craft === craft);
  if (known.length === 0) return <p className="muted">None yet. {words(craft).slip}</p>;
  return (
    <ul className="crafts-list">
      {known.map((r) => (
        <li key={r.output}>
          <button
            type="button"
            className={`crafts-recipe${pick === r.output ? ' is-selected' : ''}`}
            onClick={() => onPick(r.output)}
          >
            <span>{item(r.output).name}</span>
            <span className="muted">{FAMILIES[r.family].name.toLowerCase()}</span>
          </button>
        </li>
      ))}
    </ul>
  );
}

/** What a batch of the picked recipe takes and makes, and the buttons that queue it. */
function RecipeCard({
  c,
  r,
  spot,
  onQueue,
}: {
  c: Cultivator;
  r: Recipe;
  spot: BenchSpot | null;
  onQueue: (id: string, n: number) => void;
}) {
  const plan = planInputs(c, r);
  const land = landHand(r, spot);
  const tool = toolFor(c, r);
  const odds = (hand: number) =>
    liftOdds(r, liftOf(c, r, plan.above, tool, hand, land))
      .map((x) => `${rarity(x.rarity).name.toLowerCase()} ${formatPercent(x.chance)}`)
      .join(', ');
  const lands = odds(0);
  return (
    <div className="crafts-card">
      <p>
        {r.inputs.map((i, n) => (
          <span key={i.thing}>
            {n > 0 && ' + '}
            {i.count} {item(i.thing).name}
          </span>
        ))}
      </p>
      <p className="muted">
        {round1(batchHours(c, r))} craft hours · holds {formatPercent(holdOdds(c, r, land))} ·{' '}
        {yieldOf(c, r)} {words(r.craft).unit[yieldOf(c, r) === 1 ? 0 : 1]} · {lands}
      </p>
      <p className="muted">Sat at with a full hand: {odds(1)}.</p>
      <p className="muted">
        The Bag fills {batchesHeld(c, r)} batch{batchesHeld(c, r) === 1 ? '' : 'es'}
        {plan.above ? ', every input a rarity above the floor' : ''}.
      </p>
      <div className="crafts-actions">
        <button type="button" className="button" onClick={() => onQueue(r.output, 1)}>
          Queue a {r.craft === 'alchemy' ? 'batch' : 'piece'}
        </button>
        <button type="button" className="button button-quiet" onClick={() => onQueue(r.output, 5)}>
          Queue five
        </button>
      </div>
    </div>
  );
}

function Bench({
  c,
  onChange,
}: {
  c: Cultivator;
  onChange: (f: (c: Cultivator) => Cultivator) => void;
}) {
  const { bench, front } = c.crafts;
  const waits = benchWaits(c);
  if (bench.length === 0 && !front)
    return <p className="muted">Nothing queued. Pick a recipe and queue a batch.</p>;
  return (
    <>
      <ol className="crafts-list">
        {bench.map((e, i) => {
          const inTool = i === 0 && front?.recipe === e.recipe && front.mend === e.mend;
          const hours = inTool
            ? frontHours(c, front)
            : e.mend
              ? mendNeeds(e.mend).hours
              : batchHours(c, recipe(e.recipe));
          const share = inTool ? front.hours / hours : 0;
          return (
            <li key={`${e.recipe}-${i}`} className="crafts-entry">
              <div className="crafts-entry-top">
                <span>
                  {e.mend ? `Mend: ${item(e.mend).name}` : `${item(e.recipe).name} ×${e.batches}`}
                </span>
                <span className="muted">
                  {inTool ? `${round1(front.hours)} of ${round1(hours)} h` : 'waiting'}
                </span>
              </div>
              {inTool && (
                <div className="crafts-bar" aria-hidden="true">
                  <div style={{ width: `${Math.round(share * 100)}%` }} />
                </div>
              )}
              <div className="crafts-actions">
                <button
                  type="button"
                  className="button button-quiet"
                  disabled={i === 0 || (i === 1 && !!front)}
                  onClick={() => onChange((p) => moveOnBench(p, i, -1))}
                >
                  Up
                </button>
                <button
                  type="button"
                  className="button button-quiet"
                  disabled={i === bench.length - 1 || inTool}
                  onClick={() => onChange((p) => moveOnBench(p, i, 1))}
                >
                  Down
                </button>
                <button
                  type="button"
                  className="button button-quiet"
                  onClick={() => onChange((p) => unqueue(p, i))}
                >
                  {inTool ? 'Stop after this one' : 'Take off'}
                </button>
              </div>
            </li>
          );
        })}
      </ol>
      {front && !bench.some((e) => e.recipe === front.recipe) && (
        <p className="muted">
          {front.mend
            ? `${item(front.mend).name} is mended at the forge`
            : `A batch of ${item(front.recipe).name} finishes`}
          : {round1(front.hours)} of {round1(frontHours(c, front))} h.
        </p>
      )}
      {waits && <p className="crafts-waits">{waits}</p>}
    </>
  );
}

function Tray({ c, onTake }: { c: Cultivator; onTake: () => void }) {
  const tray = Object.entries(c.crafts.tray);
  if (tray.length === 0) return null;
  return (
    <div className="crafts-tray">
      <h3 className="panel-heading">The tray</h3>
      <p className="muted">The Bag had no room, so these wait by the furnace.</p>
      <ul className="crafts-list">
        {tray.map(([id, n]) => (
          <li key={id} className={`rarity-${item(id).rarity}`}>
            {n} {item(id).name}
          </li>
        ))}
      </ul>
      <button type="button" className="button" onClick={onTake}>
        Take into the Bag
      </button>
    </div>
  );
}

function Recent({ c }: { c: Cultivator }) {
  const recent = c.crafts.recent;
  if (recent.length === 0) return null;
  return (
    <>
      <h3 className="panel-heading">The last batches</h3>
      <ul className="crafts-list crafts-recent">
        {recent.map((b, i) => (
          <li key={i} className={b.made ? `rarity-${item(b.made).rarity}` : 'crafts-failed'}>
            {b.mend && b.made
              ? `${item(b.made).name}, mended`
              : b.made
                ? `${b.count} ${item(b.made).name}, ${rarity(item(b.made).rarity).name.toLowerCase()}${b.hand ? `, played at a ${b.hand.toFixed(2)} hand` : ''}`
                : b.blew
                  ? `${item(b.recipe).name}: the ${toolWord(b.recipe)} burst, the inputs lost`
                  : `${item(b.recipe).name}: the batch failed, the inputs lost`}
          </li>
        ))}
      </ul>
    </>
  );
}

/** The tool a made thing's recipe works in: the furnace or the forge. */
function toolWord(thing: string): string {
  const r = recipeFor(thing);
  return r ? CRAFTS[r.craft].tool : 'furnace';
}

/** The pieces you carry or wear that need mending, and what each takes at the forge. */
function Mends({ c, onMend }: { c: Cultivator; onMend: (thing: string) => void }) {
  const list = toMend(c);
  if (list.length === 0) return <p className="muted">Nothing you carry or wear needs mending.</p>;
  return (
    <ul className="crafts-list">
      {list.map((thing) => {
        const need = mendNeeds(thing);
        return (
          <li key={thing} className="crafts-tool">
            <span>{item(thing).name}</span>
            <span className="muted">
              {need.hours} h · 1 {item(need.input).name}{' '}
              <button type="button" className="link-button" onClick={() => onMend(thing)}>
                mend
              </button>
            </span>
          </li>
        );
      })}
    </ul>
  );
}

function Families({ c, craft }: { c: Cultivator; craft: CraftId }) {
  const fams = FAMILY_IDS.filter(
    (f) => FAMILIES[f].craft === craft && (familyBatches(c, f) > 0 || brewable(c, f)),
  );
  if (fams.length === 0) return <p className="muted">No batches yet.</p>;
  return (
    <ul className="crafts-list">
      {fams.map((f) => {
        const level = familyLevel(c, f);
        const next = nextLevelAt(c, f);
        const done = familyBatches(c, f);
        return (
          <li key={f} className="crafts-family">
            <div className="crafts-entry-top">
              <span>
                {FAMILIES[f].name} <span className="hanzi">{FAMILIES[f].hanzi}</span>
              </span>
              <span>{MASTERY[level]!.name}</span>
            </div>
            <div className="crafts-bar" aria-hidden="true">
              <div style={{ width: `${next ? Math.min(100, (done / next) * 100) : 100}%` }} />
            </div>
            <span className="muted">
              {next ? `${Math.floor(done * 10) / 10} of ${next} batches` : 'Origin'}
            </span>
          </li>
        );
      })}
    </ul>
  );
}

/** A family with a recipe you know. */
function brewable(c: Cultivator, f: FamilyId): boolean {
  return knownRecipes(c).some((r) => r.family === f);
}

function SoulGate({ c }: { c: Cultivator }) {
  const g = craftReach(c);
  return (
    <p className="muted">
      Crafts tier {g.reach}
      {g.reach > g.tier ? `, your soul a tier ahead of your realm` : ''}
      {g.matched
        ? ' · your soul keeps pace: ×1.25 the odds, half the blow-ups'
        : ' · your soul lags your realm'}
    </p>
  );
}

/** Steady hands' reach, and what the Hand's nodes add when you play. */
function SteadyHands({ c, craft }: { c: Cultivator; craft: CraftId }) {
  const reach = handReach(c, craft);
  const full = handLift(c, craft, 1);
  return (
    <p className="muted">
      Reach {reach.toFixed(2)} of 2 bands
      {full > reach + 1e-9 ? `, ${full.toFixed(2)} with your hands’ craft` : ''}. Sat at, a batch
      lifts by your hand times this; queued, it runs at no hand.
    </p>
  );
}

/** What the land where you stand lends the bench. */
function Land({ c, craft, spot }: { c: Cultivator; craft: CraftId; spot: BenchSpot | null }) {
  const known = knownRecipes(c).filter((r) => r.craft === craft);
  const why = [...new Set(known.flatMap((r) => landHand(r, spot).why))];
  return (
    <p className="muted">
      {why.length > 0
        ? `Here: ${why.join(', ')}, +0.25 lift and +10 holding for what it serves.`
        : 'No earth fire here.'}{' '}
      Earth fire 地火 on volcanic land lends alchemy and refining +0.25 lift and +10 holding; a land
      of a recipe’s element does the same for it.
    </p>
  );
}

/** The batch in the furnace and the hand it has read so far. */
function BatchHand({ c }: { c: Cultivator }) {
  const front = c.crafts.front;
  if (!front)
    return (
      <p className="muted crafts-furnace-batch">
        Nothing on the bench yet: the next goes in on your next craft hour.
      </p>
    );
  const hours = frontHours(c, front);
  const mean = front.hours > 0 ? (front.hand ?? 0) / front.hours : 0;
  return (
    <div className="crafts-furnace-batch">
      <div className="crafts-entry-top">
        <span>{front.mend ? `Mending ${item(front.mend).name}` : item(front.recipe).name}</span>
        <span className="muted">
          {round1(front.hours)} of {round1(hours)} h
        </span>
      </div>
      <div className="crafts-bar" aria-hidden="true">
        <div style={{ width: `${Math.round((front.hours / hours) * 100)}%` }} />
      </div>
      <p className="muted">
        {front.mend
          ? 'A mend reads no hand: it only takes its hours.'
          : `It reads your hand over its hours: ${mean.toFixed(2)} so far. Away, it runs itself at no hand.`}
      </p>
    </div>
  );
}
