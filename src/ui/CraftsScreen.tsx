// The Crafts screen 艺 (design § Professions, Where crafts live; K1's talk and its mockup): a hub
// with a page a craft, Alchemy first. The page holds the furnace and the recipes known on the left,
// the bench's queue, the tray and the last batches in the middle, and mastery by family and the
// soul gate on the right. Which hours are Craft hours stays on Routine. Queued only: the hands-on
// fire control is K3's.
import { useState } from 'react';
import type { Recipe } from '../content/catalogs/types.ts';
import { CRAFTS, CRAFT_IDS, FAMILIES, FAMILY_IDS, recipe } from '../content/crafts.ts';
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
  familyLevel,
  holdOdds,
  knownRecipes,
  liftOdds,
  liftOf,
  moveOnBench,
  nextLevelAt,
  planInputs,
  queueBatches,
  takeTray,
  toolFor,
  toolsHeld,
  unqueue,
  yieldOf,
} from '../core/crafts.ts';
import { ratesHere } from '../core/life.ts';
import { withPlayer, type Cultivator } from '../core/state.ts';
import { formatPercent } from './format.ts';
import { itemTag } from './itemWords.ts';
import { go } from './nav.ts';
import { useGame } from './store.ts';

/** Hours to a tenth, as the bench counts them. */
const round1 = (h: number) => Math.round(h * 10) / 10;

/** The crafts K1 builds; the rest show as pages yet to open. */
const BUILT: readonly CraftId[] = ['alchemy'];

export function CraftsScreen() {
  const game = useGame((s) => s.game);
  const applyLife = useGame((s) => s.applyLife);
  const [page, setPage] = useState<CraftId>('alchemy');
  const [pick, setPick] = useState<string | null>(null);
  const [why, setWhy] = useState<string | null>(null);
  if (!game) return null;
  const c = game.player;
  const hours = ratesHere(game).count.craft;
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
          <h2 className="panel-heading">The furnace</h2>
          <Tools c={c} craft={page} />
          <h2 className="panel-heading">Recipes known</h2>
          <Recipes c={c} craft={page} pick={pick} onPick={setPick} />
          {pick && <RecipeCard c={c} r={recipe(pick)} onQueue={queue} />}
          {why && <p className="warn">{why}</p>}
        </section>
        <section className="panel crafts-bench">
          <h2 className="panel-heading">The bench</h2>
          <Bench c={c} onChange={change} />
          <Tray c={c} onTake={() => change(takeTray)} />
          <Recent c={c} />
        </section>
        <section className="panel crafts-right">
          <h2 className="panel-heading">Mastery by family</h2>
          <Families c={c} craft={page} />
          <h2 className="panel-heading">The soul gate</h2>
          <SoulGate c={c} />
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
        You carry no {CRAFTS[craft].tool}. Refiners sell them; a crude clay furnace is 30 low.
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
  if (known.length === 0)
    return (
      <p className="muted">
        None yet. A recipe slip 丹方 is read on study hours, as a formula is; every alchemy shop
        sells the Qi-Gathering Pill’s.
      </p>
    );
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
  onQueue,
}: {
  c: Cultivator;
  r: Recipe;
  onQueue: (id: string, n: number) => void;
}) {
  const plan = planInputs(c, r);
  const lift = liftOf(c, r, plan.above, toolFor(c, r));
  const lands = liftOdds(r, lift)
    .map((x) => `${rarity(x.rarity).name.toLowerCase()} ${formatPercent(x.chance)}`)
    .join(', ');
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
        {round1(batchHours(c, r))} craft hours · holds {formatPercent(holdOdds(c, r))} ·{' '}
        {yieldOf(c, r)} pills · {lands}
      </p>
      <p className="muted">
        The Bag fills {batchesHeld(c, r)} batch{batchesHeld(c, r) === 1 ? '' : 'es'}
        {plan.above ? ', every herb a rarity above the floor' : ''}.
      </p>
      <div className="crafts-actions">
        <button type="button" className="button" onClick={() => onQueue(r.output, 1)}>
          Queue a batch
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
          const r = recipe(e.recipe);
          const inTool = i === 0 && front?.recipe === e.recipe;
          const share = inTool ? front.hours / batchHours(c, r) : 0;
          return (
            <li key={`${e.recipe}-${i}`} className="crafts-entry">
              <div className="crafts-entry-top">
                <span>
                  {item(e.recipe).name} ×{e.batches}
                </span>
                <span className="muted">
                  {inTool ? `${round1(front.hours)} of ${round1(batchHours(c, r))} h` : 'waiting'}
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
          A batch of {item(front.recipe).name} finishes in the furnace: {round1(front.hours)} of{' '}
          {round1(batchHours(c, recipe(front.recipe)))} h.
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
            {b.made
              ? `${b.count} ${item(b.made).name}, ${rarity(item(b.made).rarity).name.toLowerCase()}`
              : b.blew
                ? `${item(b.recipe).name}: the furnace burst, the herbs lost`
                : `${item(b.recipe).name}: the batch failed, the herbs lost`}
          </li>
        ))}
      </ul>
    </>
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
      Brews tier {g.reach}
      {g.reach > g.tier ? `, your soul a tier ahead of your realm` : ''}
      {g.matched
        ? ' · your soul keeps pace: ×1.25 the odds, half the blow-ups'
        : ' · your soul lags your realm'}
    </p>
  );
}
