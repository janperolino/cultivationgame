// The Trees screen (design § UI and screens): the Qi, Body and Soul trees and the combat Daos,
// each an opening fan you drag and zoom (TreeFan.tsx), its manuals jewels in its bands' crowns
// (design § Cultivation, Where manuals live). The Manuals category holds those with no tree to
// stand beside, each a small fan of its own, and the bookcase of every manual held (Bookcase.tsx).
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { type Manual } from '../content/manuals.ts';
import { REALMS } from '../content/realms.ts';
import { technique } from '../content/techniques.ts';
import { TREE_CATEGORIES, type Tree, type TreeCategory } from '../content/trees/index.ts';
import { copyManual, copyOfManual } from '../content/copies.ts';
import { graftsOn, hostlessManuals } from '../core/manuals.ts';
import { bookcaseManuals } from '../core/reading.ts';
import type { Cultivator } from '../core/state.ts';
import { newIds, shownTrees, treeOpen } from '../core/seen.ts';
import { treeTotals } from '../core/trees.ts';
import { Bookcase, HostlessView } from './Bookcase.tsx';
import { formatEffect, formatNumber, LADDER_LABELS } from './format.ts';
import { useNav } from './nav.ts';
import { useGame } from './store.ts';
import { TreeFan } from './TreeFan.tsx';
import { Why } from './widgets.tsx';

/** A request to open on a manual's jewel; `seq` makes the same request twice move again. */
interface Focus {
  id: string;
  seq: number;
}

/**
 * The Manuals category: the manuals with no host tree on top, in the panel with the screen's
 * tabs, one tree at a time beside a list of them; the bookcase of every manual held in a panel of
 * its own below. A click on a spine opens its jewel on its host's fan, bloomed, or focuses its
 * own tree up here and scrolls to it.
 */
function ManualsView({
  head,
  c,
  focus,
  fresh,
  onOpen,
}: {
  /** The screen's tabs, atop the first panel. */
  head: ReactNode;
  c: Cultivator;
  focus: Focus | null;
  fresh: ReadonlySet<string>;
  onOpen: (m: Manual) => void;
}) {
  const see = useGame((s) => s.see);
  const top = useRef<HTMLDivElement>(null);
  const [focused, setFocused] = useState<string | null>(focus?.id ?? null);
  const [seen, setSeen] = useState(focus?.seq ?? -1);
  if (focus && focus.seq !== seen) {
    setSeen(focus.seq);
    setFocused(focus.id);
  }
  // A focus on a manual without a host lands up here; any other lands on its spine below.
  const hostless = hostlessManuals(c);
  const atTop = focus !== null && hostless.some((m) => m.id === focus.id);
  useEffect(() => {
    if (!focus) return;
    if (atTop) top.current?.scrollIntoView({ block: 'start' });
    see('manual', [focus.id]);
  }, [focus, atTop, see]);
  return (
    <>
      <section className="panel">
        {head}
        <div ref={top} className="manuals-top">
          <HostlessView
            c={c}
            list={hostless}
            focused={focused}
            fresh={fresh}
            onFocus={(m) => {
              setFocused(m.id);
              see('manual', [m.id]);
            }}
          />
        </div>
      </section>
      <section className="panel" aria-label="Bookcase">
        <Bookcase
          c={c}
          fresh={fresh}
          hostOpen={(m) => !!m.host}
          focus={focus && !atTop ? focus : null}
          onOpen={(m) => {
            see('manual', [m.id]);
            see('copy', [copyOfManual(m)]);
            onOpen(m);
          }}
        />
      </section>
    </>
  );
}

/** "Qi · 3 manuals" on the tree list. */
function graftCount(n: number): string {
  return n === 0 ? '' : ` · ${n} ${n === 1 ? 'manual' : 'manuals'}`;
}

/** "the Fist Dao", "the Soul tree". */
function treeWords(t: Tree): string {
  return `${t.name} ${t.dao ? 'Dao' : 'tree'}`;
}

/** What one tree gives, totted up by stat: the "?" by its name. */
function Totals({ c, tree }: { c: Cultivator; tree: Tree }) {
  const t = treeTotals(c, tree);
  const ladderName = LADDER_LABELS[tree.ladder].toLowerCase();
  return (
    <Why label={`What the ${treeWords(tree)} gives`}>
      <>
        <span className="tree-totals-head">Working now</span>
        <span>
          {t.working.length > 0 ? t.working.map(formatEffect).join(', ') : 'Nothing learned yet.'}
        </span>
        {t.sealed.map((x) => (
          <span key={x.tier}>
            {x.effects.map(formatEffect).join(', ')} waits for your {ladderName} to reach{' '}
            {REALMS[x.tier - 1]!.name}.
          </span>
        ))}
        {t.grafts.length > 0 && <span className="tree-totals-head">Grafted beside it</span>}
        {t.grafts.map((g) => {
          const on = g.manual.technique ? technique(g.manual.technique).name : '';
          const fx = [
            ...g.working.map(formatEffect),
            ...g.own.map((e) => `${formatEffect(e)} on ${on}`),
          ];
          return (
            <span key={g.manual.id}>
              <span className={`rarity-${g.manual.rarity}`}>{g.manual.name}</span> · {g.learned} of{' '}
              {g.manual.nodes.length}
              {fx.length > 0 && ` · ${fx.join(', ')}`}
              {g.waiting.length > 0 && ` · ${g.waiting.map(formatEffect).join(', ')} still asleep`}
            </span>
          );
        })}
      </>
    </Why>
  );
}

const MANUALS_PICK = 'manuals';

export function TreesScreen() {
  const game = useGame((s) => s.game);
  // A link from another screen opens on a tree or the Manuals category, centred on a manual.
  const target = useNav((s) => s.trees);
  const navSeq = useNav((s) => s.seq);
  const [pick, setPick] = useState(target?.pick ?? 'qi');
  const [focus, setFocus] = useState<Focus | null>(
    target?.focus ? { id: target.focus, seq: navSeq } : null,
  );
  const [seen, setSeen] = useState(target ? navSeq : -1);
  if (target && navSeq !== seen) {
    setSeen(navSeq);
    setPick(target.pick);
    setFocus(target.focus ? { id: target.focus, seq: navSeq } : null);
  }
  useEffect(() => {
    if (target) useNav.setState({ trees: null });
  }, [target]);
  const localSeq = useRef(0);

  if (!game) return null;
  const c = game.player;
  // Pick a category, then a tree in it. Only what you have touched shows (core/seen.ts): the big
  // three with their ladders or a manual grafted on them, a combat Dao once something of it is
  // held; a category once it holds a tree, and Manuals with a first manual.
  const shown = shownTrees(c);
  const anyManual = bookcaseManuals(c).length > 0;
  const categories = TREE_CATEGORIES.map((k) => ({
    ...k,
    trees: k.trees.filter((t) => shown.includes(t)),
  })).filter((k) => k.trees.length > 0 || (k.id === MANUALS_PICK && anyManual));
  const all = categories.flatMap((k) => k.trees);
  const onManuals = pick === MANUALS_PICK && anyManual;
  const tree = all.find((t) => t.id === pick) ?? all[0]!;
  const current = onManuals
    ? categories.find((k) => k.id === MANUALS_PICK)!
    : categories.find((k) => k.trees.includes(tree))!;
  const freshTrees = new Set(newIds(game, 'tree'));
  const freshManuals = new Set(newIds(game, 'manual'));
  // A new copy glows on its spine like a new manual.
  const freshBooks = new Set([
    ...freshManuals,
    ...newIds(game, 'copy').map((id) => copyManual(id).id),
  ]);
  const categoryNew = (k: TreeCategory) =>
    k.trees.some((t) => freshTrees.has(t.id)) ||
    (k.id === MANUALS_PICK &&
      (hostlessManuals(c).some((m) => freshManuals.has(m.id)) || newIds(game, 'copy').length > 0));
  const openManual = (m: Manual) => {
    localSeq.current -= 1;
    setPick(m.host ?? MANUALS_PICK);
    setFocus({ id: m.id, seq: localSeq.current });
  };
  const own = treeOpen(c, tree);
  const grafts = graftsOn(c, tree.id);
  const treeFocus = focus && pick === tree.id ? focus : null;

  const head = (
    <>
      <div className="tree-top">
        <div className="seg" role="group" aria-label="Kind of tree">
          {categories.map((k) => (
            <button
              key={k.id}
              type="button"
              className={categoryNew(k) && k.id !== current.id ? 'is-new' : undefined}
              aria-pressed={k.id === current.id}
              onClick={() => {
                setFocus(null);
                setPick(k.id === MANUALS_PICK ? MANUALS_PICK : k.trees[0]!.id);
              }}
            >
              {k.name} <span className="hanzi">{k.hanzi}</span>
            </button>
          ))}
        </div>
        <span
          className="value"
          title="Insight ever earned counts toward breakthroughs; spending never delays them."
        >
          {formatNumber(c.insight.current)} insight to spend
        </span>
      </div>
      {!onManuals && (
        <div className="tree-pick">
          <div className="seg" role="group" aria-label={current.name}>
            {current.trees.map((t) => (
              <button
                key={t.id}
                type="button"
                className={freshTrees.has(t.id) ? 'is-new' : undefined}
                aria-pressed={t.id === tree.id}
                onClick={() => {
                  setFocus(null);
                  setPick(t.id);
                }}
              >
                {t.name} <span className="hanzi">{t.hanzi}</span>
                <span className="caption">{graftCount(graftsOn(c, t.id).length)}</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </>
  );
  if (onManuals) {
    return <ManualsView head={head} c={c} focus={focus} fresh={freshBooks} onOpen={openManual} />;
  }
  return (
    <section className="panel">
      {head}
      <h3 className="tree-title">
        The {treeWords(tree)} <span className="hanzi">{tree.hanzi}</span>{' '}
        <Totals c={c} tree={tree} />
      </h3>
      {!own && (
        <p className="tree-shut">
          The {treeWords(tree)}’s own nodes open with your{' '}
          {LADDER_LABELS[tree.ladder].toLowerCase()} ladder; until then it holds the manuals grafted
          beside it.
        </p>
      )}
      <p className="caption spaced">
        {tree.dao &&
          `Holding a tier, half its nodes owned, multiplies Accuracy and Attack on its actions by ×1.05. `}
        {tree.what} Drag to move, wheel or pinch to zoom, and tap a node for its details.
        {grafts.length > 0 &&
          ' The manuals you hold are jewels in each band’s crown, joined to none of its nodes; tap one to open it.'}
      </p>
      <TreeFan
        key={`${tree.id}:${treeFocus?.seq ?? 'home'}`}
        c={c}
        tree={tree}
        grafts={grafts}
        focus={treeFocus?.id ?? null}
        own={own}
        fresh={freshManuals}
      />
    </section>
  );
}
