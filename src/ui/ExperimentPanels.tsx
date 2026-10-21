// Experimenting on a craft's page (K7; design § Professions, Experimentation; Jan's take B of
// `docs/mockups/experiment-study.html`): the left column flips to a shelf of the Bag's ingredients
// grouped by what they carry, the middle shows the bench's mouth with a ring for each thing thrown
// in and what the bench reads of them (what they lean to, whether anything written lies close, the
// odds), and the right says what each property makes in this craft. Queued, a throw runs at no
// hand; sat at, the craft's own scene plays, and the hand lifts what comes out on a hit.
import { PROPERTIES, type Property } from '../content/crafts.ts';
import { ELEMENT_INFO, type Element } from '../content/elements.ts';
import {
  EXPERIMENT,
  FOUND_MAKES,
  TALISMAN_SHEET,
  type ExperimentCraft,
  type FoundEffect,
} from '../content/found.ts';
import { baseOf, hasItem, item } from '../content/items.ts';
import {
  experimentHours,
  setsHeld,
  target,
  thrown,
  tryOdds,
  type Throw,
} from '../core/experiment.ts';
import type { Cultivator } from '../core/state.ts';
import { kinds, type Tossed } from './experiment.ts';
import { formatPercent } from './format.ts';

/** What each page calls its tool. */
const MOUTH: Record<ExperimentCraft, { tool: string }> = {
  alchemy: { tool: 'furnace' },
  refining: { tool: 'forge' },
  talismans: { tool: 'brush' },
};

/** What each effect is, in a few words, for the page. */
const MAKES: Record<FoundEffect, string> = {
  qi: 'a qi pill',
  body: 'a body pill',
  soul: 'a soul pill',
  replenish: 'qi back in a fight',
  mend: 'wounds closed',
  cleanse: 'a poison drawn out',
  searing: 'a strike of its element, fire if none',
  freezing: 'a strike of its element, ice if none',
  piercing: 'a strike of its element',
  ward: 'a ward over your qi shield',
  bind: 'a foe held a breath',
  flee: 'an escape through earth or water',
  stride: 'twice the pace a day',
  veil: 'a hiding talisman',
  blade: 'a sword',
  armor: 'armor that turns its element',
  pouch: 'a storage pouch',
  rope: 'a binding rope, kept',
};

/** The Bag's ingredients, by thing at its tier, with how many you hold. */
function ingredients(c: Cultivator, craft: ExperimentCraft): { thing: string; n: number }[] {
  const sheet = craft === 'talismans' ? TALISMAN_SHEET.map((i) => i.thing) : [];
  const held = new Map<string, number>();
  for (const [id, n] of Object.entries(c.items)) {
    if (n <= 0 || !hasItem(id)) continue;
    const it = item(id);
    const base = baseOf(id);
    if (!it.uses.ingredient || it.damaged || sheet.includes(base) || it.tier !== item(base).tier)
      continue;
    held.set(base, (held.get(base) ?? 0) + n);
  }
  return [...held].map(([thing, n]) => ({ thing, n }));
}

function Dot({ element }: { element?: Element | null }) {
  return <span className={`exp-dot is-${element ?? 'none'}`} aria-hidden="true" />;
}

/** The shelf: what you carry that could go in, grouped by its first property, this craft's first. */
export function Shelf({
  c,
  craft,
  tossed,
  onAdd,
}: {
  c: Cultivator;
  craft: ExperimentCraft;
  tossed: Tossed;
  onAdd: (thing: string) => void;
}) {
  const all = ingredients(c, craft);
  if (all.length === 0)
    return (
      <p className="muted">
        You carry nothing to throw in. Herbs, materials and beast parts all carry something.
      </p>
    );
  const row = FOUND_MAKES[craft];
  const first = (thing: string) => item(thing).uses.ingredient!.properties[0]!;
  const groups = [...new Set(all.map((x) => first(x.thing)))].sort(
    (a, b) => Number(!row[a]) - Number(!row[b]) || PROPERTIES.indexOf(a) - PROPERTIES.indexOf(b),
  );
  return (
    <div className="exp-shelf">
      {groups.map((p) => (
        <div key={p} className="exp-group">
          <h3 className="panel-heading">{p}</h3>
          <ul className="crafts-list">
            {all
              .filter((x) => first(x.thing) === p)
              .map(({ thing, n }) => {
                const it = item(thing);
                const more = it.uses.ingredient!.properties.slice(1);
                const isIn = tossed.some((t) => t.thing === thing);
                return (
                  <li key={thing}>
                    <button
                      type="button"
                      className={`exp-pick${isIn ? ' is-in' : ''}`}
                      onClick={() => onAdd(thing)}
                    >
                      <span>
                        <Dot element={it.element} />
                        {it.name}
                        {more.map((m) => (
                          <span key={m} className="exp-tag">
                            {m}
                          </span>
                        ))}
                      </span>
                      <span className="muted">{n}</span>
                    </button>
                  </li>
                );
              })}
          </ul>
        </div>
      ))}
    </div>
  );
}

/** The bench's mouth: a ring for each thing thrown in, the read, the odds and the buttons. */
export function Mouth({
  c,
  craft,
  tossed,
  sets,
  onSets,
  onCount,
  onEmpty,
  onQueue,
  onSit,
  why,
}: {
  c: Cultivator;
  craft: ExperimentCraft;
  tossed: Tossed;
  sets: number;
  onSets: (n: number) => void;
  onCount: (thing: string, by: number) => void;
  onEmpty: () => void;
  onQueue: () => void;
  onSit: () => void;
  why: string | null;
}) {
  const t: Throw = { craft, inputs: tossed };
  const aim = target(c, t);
  const odds = tryOdds(c, t, aim, sets);
  const words = MOUTH[craft];
  const rings = Array.from({ length: kinds(craft) }, (_, i) => tossed[i] ?? null);
  const can = aim.kind === 'written' || aim.kind === 'made';
  return (
    <div className="exp-mouth">
      {craft === 'talismans' && (
        <p className="muted">
          The sheet: {TALISMAN_SHEET.map((i) => `${i.count} ${item(i.thing).name}`).join(' and ')}.
          Into the ink:
        </p>
      )}
      <div className="exp-rings">
        {rings.map((r, i) =>
          r ? (
            <div key={r.thing} className="exp-ring">
              <span className="exp-ring-name">
                <Dot element={item(r.thing).element} />
                {item(r.thing).name}
              </span>
              <span className="exp-count">
                <button type="button" aria-label="One fewer" onClick={() => onCount(r.thing, -1)}>
                  −
                </button>
                <b>{r.count}</b>
                <button
                  type="button"
                  aria-label="One more"
                  disabled={r.count >= EXPERIMENT.most}
                  onClick={() => onCount(r.thing, 1)}
                >
                  +
                </button>
              </span>
            </div>
          ) : (
            <div key={`empty-${i}`} className="exp-ring is-empty">
              empty
            </div>
          ),
        )}
      </div>
      <Read c={c} t={t} />
      {can && (
        <>
          <div className="exp-sets" role="group" aria-label="Sets at once">
            {Array.from({ length: EXPERIMENT.sets }, (_, i) => i + 1).map((n) => (
              <button
                key={n}
                type="button"
                className={n === sets ? 'is-on' : ''}
                onClick={() => onSets(n)}
              >
                ×{n}
              </button>
            ))}
          </div>
          <p>
            <strong>{formatPercent(odds.chance)}</strong>{' '}
            <span className="muted">
              {sets > 1
                ? `over ${odds.tries.toFixed(1)} tries, ${formatPercent(odds.perTry)} a try`
                : 'a try'}
              {odds.misses > 0
                ? `, ${odds.misses} miss${odds.misses === 1 ? '' : 'es'} on this set adding ${Math.round(odds.pity * 100)} points`
                : ''}{' '}
              · {thrown(t).reduce((n, i) => n + i.count, 0) * sets} things ·{' '}
              {Math.round(experimentHours(c, t) * 10) / 10} craft hours · the Bag holds{' '}
              {setsHeld(c, t)}
            </span>
          </p>
        </>
      )}
      {why && <p className="warn">{why}</p>}
      <div className="crafts-actions exp-actions">
        <button type="button" className="button" disabled={!can} onClick={onQueue}>
          Queue the experiment
        </button>
        <button type="button" className="button button-quiet" disabled={!can} onClick={onSit}>
          Sit at the {words.tool}
        </button>
        <button
          type="button"
          className="button button-quiet"
          disabled={tossed.length === 0}
          onClick={onEmpty}
        >
          Empty it
        </button>
      </div>
    </div>
  );
}

/** What the bench reads of a throw: its lean, and what it would aim at. */
function Read({ c, t }: { c: Cultivator; t: Throw }) {
  const aim = target(c, t);
  if (aim.kind === 'empty')
    return (
      <p className="muted exp-read">
        Pick from the shelf. What you throw in is spent, hit or miss.
      </p>
    );
  const l = aim.lean;
  const tool = MOUTH[t.craft].tool;
  const counts = `${l.properties.map((p) => `${p.property} ${p.n}`).join(' · ')}${
    l.elements.length > 0
      ? `  ·  ${l.elements.map((e) => `${ELEMENT_INFO[e.element].name.toLowerCase()} ${e.n}`).join(' · ')}`
      : ''
  }`;
  const line =
    aim.kind === 'nothing'
      ? `What these carry makes nothing at the ${tool} yet.`
      : aim.kind === 'known'
        ? `These are your ${item(aim.recipe.output).name}’s.`
        : aim.kind === 'written'
          ? 'These stir like something written.'
          : `Nothing written answers these. The ${tool} would make its own: ${MAKES[aim.key.effect]}${
              aim.key.element ? ` of ${ELEMENT_INFO[aim.key.element].name.toLowerCase()}` : ''
            }${aim.key.toxic > 0 ? ', fierce with the toxic in it' : ''}.`;
  return (
    <div className="exp-read">
      <p className="exp-lean">
        {l.property ? (
          <>
            Leans <strong>{l.property}</strong>
            {l.element && (
              <>
                , of <Dot element={l.element} />
                {ELEMENT_INFO[l.element].name.toLowerCase()}
              </>
            )}
          </>
        ) : (
          'Leans to nothing this craft makes'
        )}
      </p>
      <p className="muted">{counts}</p>
      <p>{line}</p>
    </div>
  );
}

/** What each property makes in this craft, and the odds' rule. */
export function Reads({ craft }: { craft: ExperimentCraft }) {
  const row = Object.entries(FOUND_MAKES[craft]) as [Property, FoundEffect][];
  return (
    <>
      <p className="muted">
        What you throw in carries one element and one or two properties each. The{' '}
        {MOUTH[craft].tool} makes what most of it carries:
      </p>
      <ul className="crafts-list exp-reads">
        {row.map(([p, e]) => (
          <li key={p} className="crafts-entry-top">
            <span>{p}</span>
            <span className="muted">
              {MAKES[e]}
              {craft === 'talismans' && p === 'swift' ? ', or an escape of earth or water' : ''}
            </span>
          </li>
        ))}
        {craft === 'alchemy' && (
          <li className="crafts-entry-top">
            <span>toxic</span>
            <span className="muted">stronger, and more poison</span>
          </li>
        )}
      </ul>
      <p className="muted">
        A try finds at 25% two tiers below your craft Dao, 15% one below, 6% at it and 1.5% one
        above, times your mastery; each miss on a set adds a point. Found, a recipe is named once
        and laid on the Dao’s discoveries edge. One the {MOUTH[craft].tool} makes of its own comes
        white to blue, never past: gold and up are written by hand.
      </p>
    </>
  );
}
