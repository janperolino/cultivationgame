// The Trees screen (design § UI and screens): the Qi, Body and Soul trees and the combat Daos on a
// canvas you drag and zoom, in nine tier bands of branching paths, sealed tiers dimmed, with a
// re-centre button. The manuals you hold graft beside their host trees, each a cluster in its tier
// band with a name plate and a dotted bracket, joined to none of the tree's nodes (design §
// Cultivation, Where manuals live); the Manuals category holds those with no tree to stand beside
// and the bookcase of every manual held (Bookcase.tsx). A node's details open in an overlay on the
// canvas.
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { MANUAL_KINDS, manual, type Manual } from '../content/manuals.ts';
import { MASTERY } from '../content/mastery.ts';
import { anyNode, type AnyNode } from '../content/nodes.ts';
import { REALMS } from '../content/realms.ts';
import { statInfo } from '../content/stats.ts';
import { technique } from '../content/techniques.ts';
import {
  branchOf,
  TIER_COUNT,
  tierNode,
  tierNodes,
  TREE_CATEGORIES,
  treeNode,
  treeOf,
  type Tree,
  type TreeCategory,
  type TreeNode,
} from '../content/trees/index.ts';
import { copyManual, copyOfManual } from '../content/copies.ts';
import { graftsOn, hostlessManuals } from '../core/manuals.ts';
import { bookcaseManuals } from '../core/reading.ts';
import { methodMastery } from '../core/methods.ts';
import type { Cultivator } from '../core/state.ts';
import { mastery } from '../core/techniques.ts';
import { newIds, shownTrees, treeOpen } from '../core/seen.ts';
import { canLearn, hasLearned, nodeSealed, tierOwned, treeTotals } from '../core/trees.ts';
import { Bookcase, HostlessView } from './Bookcase.tsx';
import { formatEffect, formatNumber, LADDER_LABELS } from './format.ts';
import { LearnAction, ManualName, ManualNodeRow, NodeEffects } from './ManualNodes.tsx';
import { hostWords, sealWords, wakeWords } from './manualWords.ts';
import { useNav } from './nav.ts';
import {
  clampView,
  pan,
  pinch,
  viewAt,
  zoomAt,
  type Point,
  type Size,
  type View,
} from './panzoom.ts';
import { useGame } from './store.ts';
import {
  layout,
  NODE_HALF_W,
  TREE_W,
  UNCHARTED,
  UNIT,
  type Graft,
  type Layout,
} from './treeLayout.ts';
import { Why } from './widgets.tsx';

/** Moves under this many pixels are a tap, not a drag. */
const TAP = 6;
/** Zoom per wheel notch and per button press. */
const WHEEL_STEP = 0.0015;
const BUTTON_STEP = 1.25;

const SHAPE: Record<TreeNode['kind'], number> = {
  minor: 24,
  notable: 36,
  starter: 44,
  capstone: 52,
};

/** A selection on the canvas: a node's id, or a manual's name plate as `manual:<id>`. */
const PLATE = 'manual:';

type NodeState = 'learned' | 'available' | 'locked';

function nodeState(c: Cultivator, n: AnyNode): NodeState {
  if (hasLearned(c, n.id)) return 'learned';
  const check = canLearn(c, n.id);
  // Short only of insight still reads as reachable: the path is open.
  return check.ok || check.reason.startsWith('Needs') ? 'available' : 'locked';
}

/** A curve from one node to the next, leaving and arriving along the longer axis. */
function edgePath(a: Point, b: Point): string {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  return Math.abs(dy) >= Math.abs(dx) * 0.6
    ? `M${a.x} ${a.y}C${a.x} ${a.y + dy / 2} ${b.x} ${b.y - dy / 2} ${b.x} ${b.y}`
    : `M${a.x} ${a.y}C${a.x + dx / 2} ${a.y} ${b.x - dx / 2} ${b.y} ${b.x} ${b.y}`;
}

/** The tier to open on: the lowest with something to learn, else the highest charted. */
function focusTier(c: Cultivator, t: Tree): number {
  for (let tier = 1; tier <= TIER_COUNT; tier++) {
    const nodes = tierNodes(t, tier);
    if (nodes.some((n) => !hasLearned(c, n.id) && nodeState(c, n) === 'available')) return tier;
  }
  return Math.max(1, ...t.nodes.map((n) => n.tier));
}

/** The zoom a tree opens at: its own width fitted to the screen, between 0.55 and 1. */
const homeZoom = (screen: Size) => Math.min(1, Math.max(0.55, screen.w / TREE_W));

function homeView(c: Cultivator, t: Tree, l: Layout, screen: Size): View {
  const starter = tierNode(t, focusTier(c, t), 'starter');
  const y = starter ? l.top[starter.tier]! : 0;
  return viewAt(homeZoom(screen), { x: TREE_W / 2, y }, { x: screen.w / 2, y: 8 });
}

/** A view with a graft's name plate near the top, below the zoom buttons, as centred as it can. */
function graftView(g: Graft, screen: Size): View {
  return viewAt(homeZoom(screen), { x: g.x + g.width / 2, y: g.y }, { x: screen.w / 2, y: 60 });
}

function Bands({ c, tree, l, own }: { c: Cultivator; tree: Tree; l: Layout; own: boolean }) {
  const ladderName = LADDER_LABELS[tree.ladder].toLowerCase();
  return Array.from({ length: TIER_COUNT }, (_, i) => {
    const tier = i + 1;
    const r = REALMS[i]!;
    const nodes = tierNodes(tree, tier);
    const charted = nodes.length > 0;
    const sealed = charted && nodeSealed(c, nodes[0]!);
    const capstone = tierNode(tree, tier, 'capstone');
    const tall = l.bandHeight[tier]! > UNCHARTED * UNIT;
    const status = !charted
      ? `Not yet charted${tall ? '; manuals grafted here' : ''}.`
      : !own
        ? `Its own nodes open with your ${ladderName}`
        : sealed
          ? `Sealed until your ${ladderName} reaches ${r.name}`
          : capstone && hasLearned(c, capstone.id)
            ? `${tierOwned(c, tree, tier)} of ${nodes.length} · capstone learned`
            : `${tierOwned(c, tree, tier)} of ${nodes.length} learned`;
    return (
      <div
        key={tier}
        className={`tree-band ${charted ? '' : 'is-empty'} ${sealed ? 'is-sealed' : ''}`}
        style={{ top: l.top[tier], height: l.bandHeight[tier], width: l.width }}
      >
        <div className="tree-band-head">
          <span className="tier-label">
            Tier {tier} · {r.name} <span className="hanzi">{r.hanzi}</span>
          </span>
          <span className="caption">{status}</span>
        </div>
      </div>
    );
  });
}

/** A manual's own edges, from each node to the ones it grows from, at the given positions. */
function graftEdges(c: Cultivator, m: Manual, at: (id: string) => Point) {
  return m.nodes.flatMap((n) =>
    n.requires.map((req) => {
      const lit = hasLearned(c, req) && hasLearned(c, n.id);
      const open = hasLearned(c, req) && !lit;
      return (
        <path
          key={`${req}-${n.id}`}
          d={edgePath(at(req), at(n.id))}
          className={lit ? 'is-lit' : open ? 'is-open' : ''}
        />
      );
    }),
  );
}

/** A dotted bracket down a graft's left side: it belongs to this band, not to any node. */
function bracketPath(b: Graft['bracket']): string {
  return `M${b.x + 10} ${b.top}H${b.x}V${b.bottom}H${b.x + 10}`;
}

function Edges({ c, tree, l, own }: { c: Cultivator; tree: Tree; l: Layout; own: boolean }) {
  return (
    <svg className="tree-edges" width={l.width} height={l.height} aria-hidden="true">
      {(own ? tree.nodes : []).flatMap((n) =>
        n.requires.map((req) => {
          const from = treeNode(req);
          const lit = hasLearned(c, req) && hasLearned(c, n.id);
          const open = hasLearned(c, req) && !lit;
          const crossTier = from.tier !== n.tier;
          return (
            <path
              key={`${req}-${n.id}`}
              d={edgePath(l.pos(from), l.pos(n))}
              className={`${lit ? 'is-lit' : open ? 'is-open' : ''} ${crossTier ? 'is-tier' : ''}`}
            />
          );
        }),
      )}
      {l.grafts.map((g) => (
        <g key={g.manual.id}>
          <path className="graft-bracket" d={bracketPath(g.bracket)} />
          {graftEdges(c, g.manual, (id) => l.graftPos.get(id)!)}
        </g>
      ))}
    </svg>
  );
}

/** "Art · at Glimpse · 0 of 1": the plate's second line. */
function plateCaption(c: Cultivator, m: Manual): string {
  const learned = m.nodes.filter((n) => hasLearned(c, n.id)).length;
  const level = m.technique
    ? ` · at ${MASTERY[mastery(c, m.technique).level]!.name}`
    : m.method
      ? ` · at ${MASTERY[methodMastery(c, m.method).level]!.name}`
      : '';
  return `${MANUAL_KINDS[m.kind].name}${level} · ${learned} of ${m.nodes.length}`;
}

/** A graft's name plate: the kind's glyph, the name in its rarity's color, and where it stands. */
function Plate({
  c,
  m,
  style,
  selected,
  fresh,
  onSelect,
}: {
  c: Cultivator;
  m: Manual;
  style: React.CSSProperties;
  selected: boolean;
  /** A manual still new: the plate glows until selected. */
  fresh: boolean;
  onSelect: (id: string) => void;
}) {
  return (
    <button
      type="button"
      className={`graft-plate ${selected ? 'is-selected' : ''}${fresh ? ' is-new' : ''}`}
      style={style}
      aria-pressed={selected}
      onClick={() => onSelect(PLATE + m.id)}
    >
      <span className="graft-plate-name">
        <ManualName m={m} />
      </span>
      <span className="caption">{plateCaption(c, m)}</span>
    </button>
  );
}

function NodeButton({
  c,
  n,
  at,
  selected,
  onSelect,
  onFocusNode,
}: {
  c: Cultivator;
  n: AnyNode;
  at: Point;
  selected: boolean;
  onSelect: (id: string) => void;
  onFocusNode: (p: Point) => void;
}) {
  const state = nodeState(c, n);
  const sealed = nodeSealed(c, n);
  const size = SHAPE[n.kind];
  return (
    <button
      type="button"
      className={`tree-node is-${n.kind} is-${state} ${sealed ? 'is-sealed' : ''} ${selected ? 'is-selected' : ''}`}
      style={{ left: at.x - NODE_HALF_W, top: at.y - size / 2 }}
      aria-pressed={selected}
      aria-label={`${n.name}, ${n.kind}, ${state}${sealed ? ', sealed' : ''}`}
      onClick={() => onSelect(n.id)}
      onFocus={() => onFocusNode(at)}
    >
      <span className="tree-node-shape" style={{ width: size, height: size }} aria-hidden="true" />
      <span className="tree-node-name">{n.name}</span>
      {state === 'available' && <span className="tree-node-cost">{formatNumber(n.cost)}</span>}
    </button>
  );
}

/** Details for a manual's node: what it does, which manual it belongs to, when it wakes. */
function ManualNodeDetail({ c, id, onClose }: { c: Cultivator; id: string; onClose: () => void }) {
  const n = anyNode(id);
  if (n.home !== 'manual') return null;
  const m = manual(n.manual);
  const sealed = nodeSealed(c, n);
  return (
    <section className="node-overlay" aria-live="polite" aria-label={n.name}>
      <div className="node-overlay-head">
        <h2 className="panel-heading">
          {n.name} <span className="hanzi">{n.hanzi}</span>
        </h2>
        <button type="button" className="icon-button" aria-label="Close" onClick={onClose}>
          ×
        </button>
      </div>
      <p className="muted">{n.text}</p>
      <NodeEffects n={n} />
      <p className="caption spaced">
        {n.kind} of <span className={`rarity-${m.rarity}`}>{m.name}</span>, the{' '}
        {MANUAL_KINDS[m.kind].name.toLowerCase()} · {formatNumber(n.cost)} insight. It grows from
        none of the tree's nodes.
      </p>
      {sealed && <p className="warn">{sealWords(c, n)}</p>}
      <div className="actions">
        <LearnAction c={c} n={n} />
      </div>
    </section>
  );
}

/** Details for a manual as a whole, from its name plate: where it comes from and its nodes. */
function ManualDetail({ c, id, onClose }: { c: Cultivator; id: string; onClose: () => void }) {
  const m = manual(id);
  return (
    <section className="node-overlay" aria-live="polite" aria-label={m.name}>
      <div className="node-overlay-head">
        <h2 className="panel-heading">
          <ManualName m={m} />
        </h2>
        <button type="button" className="icon-button" aria-label="Close" onClick={onClose}>
          ×
        </button>
      </div>
      <p className="caption">
        {MANUAL_KINDS[m.kind].name} · {m.pinyin} · {m.technique ? '' : 'from '}
        {m.source}
      </p>
      <p className="caption">
        {hostWords(m)}. {wakeWords(m)}
      </p>
      <ul className="manual-nodes">
        {m.nodes.map((n) => (
          <ManualNodeRow key={n.id} c={c} n={n} />
        ))}
      </ul>
    </section>
  );
}

/** Whatever is selected: a manual's plate, a manual's node or a tree's node. */
function Detail({ c, id, onClose }: { c: Cultivator; id: string; onClose: () => void }) {
  if (id.startsWith(PLATE)) {
    return <ManualDetail c={c} id={id.slice(PLATE.length)} onClose={onClose} />;
  }
  if (anyNode(id).home === 'manual') {
    return <ManualNodeDetail c={c} id={id} onClose={onClose} />;
  }
  return <NodeDetail c={c} id={id} onClose={onClose} />;
}

function NodeDetail({ c, id, onClose }: { c: Cultivator; id: string; onClose: () => void }) {
  const learnNode = useGame((s) => s.learnNode);
  const ended = useGame((s) => !!s.game?.ended);
  const n = treeNode(id);
  const learned = hasLearned(c, id);
  const sealed = nodeSealed(c, n);
  const check = canLearn(c, id);
  const realmName = REALMS[n.tier - 1]!.name;
  const branch = branchOf(n);
  const where =
    n.kind === 'starter'
      ? `the tier's starter${n.requires.length ? `, opened by ${treeNode(n.requires[0]!).name}` : ''}`
      : n.kind === 'capstone'
        ? `the tier's capstone, opened by ${n.requires.map((r) => treeNode(r).name).join(', ')}`
        : `${n.kind} on ${branch?.name ?? 'a branch'}${branch?.gate ? ', one of the capstone’s branches' : ', a side path'}`;

  return (
    <section className="node-overlay" aria-live="polite" aria-label={n.name}>
      <div className="node-overlay-head">
        <h2 className="panel-heading">
          {n.name} <span className="hanzi">{n.hanzi}</span>
        </h2>
        <button type="button" className="icon-button" aria-label="Close" onClick={onClose}>
          ×
        </button>
      </div>
      <p className="muted">{n.text}</p>
      <ul className="effects">
        {n.effects.map((e) => {
          const info = statInfo(e.stat);
          return (
            <li key={e.stat} title={info.what}>
              {formatEffect(e)}
              {info.arrives && (
                <span className="caption"> · counts once {info.arrives} arrives</span>
              )}
            </li>
          );
        })}
      </ul>
      <p className="caption spaced">
        Tier {n.tier} ({realmName}), {where} · {formatNumber(n.cost)} insight
      </p>
      {sealed && (
        <p className="warn">
          Sealed: it can be learned now, but does nothing until your{' '}
          {LADDER_LABELS[treeOf(id).ladder].toLowerCase()} reaches {realmName}.
        </p>
      )}
      <div className="actions">
        {learned ? (
          <span className="accent">Learned{sealed ? ', sealed for now' : ''}.</span>
        ) : (
          <>
            <button
              type="button"
              className="button"
              disabled={!check.ok || ended}
              onClick={() => learnNode(id)}
            >
              Learn · {formatNumber(n.cost)} insight
            </button>
            {!check.ok && <span className="caption">{check.reason}</span>}
          </>
        )}
      </div>
    </section>
  );
}

interface Gesture {
  /** Pointers down on the canvas, by id, where they are now. */
  pointers: Map<number, Point>;
  /** Where the gesture started and the view then; reset whenever a finger joins or lifts. */
  start: Map<number, Point>;
  view: View;
  /** True once the pointers moved far enough to be a drag, so the click that follows is not a tap. */
  moved: boolean;
}

/** A request to centre on a manual's graft; `seq` makes the same request twice move again. */
interface Focus {
  id: string;
  seq: number;
}

/** The canvas: drag to pan, wheel or pinch to zoom, tap a node to open its details. */
function TreeCanvas({
  c,
  tree,
  grafts,
  focus,
  own,
  fresh,
}: {
  c: Cultivator;
  tree: Tree;
  grafts: readonly Manual[];
  focus: Focus | null;
  /** Whether the tree's own nodes are drawn: false before its ladder opens, grafts alone. */
  own: boolean;
  /** Manuals still new: their plates glow. */
  fresh: ReadonlySet<string>;
}) {
  const box = useRef<HTMLDivElement>(null);
  const [screen, setScreen] = useState<Size>({ w: 0, h: 0 });
  const [view, setView] = useState<View | null>(null);
  const [selected, setSelected] = useState<string | null>(null);
  // The tree on the canvas is the tab selected, so it is seen; so is a manual whose plate or
  // node is selected.
  const see = useGame((s) => s.see);
  useEffect(() => {
    see('tree', [tree.id]);
  }, [see, tree.id]);
  useEffect(() => {
    if (!selected) return;
    if (selected.startsWith(PLATE)) see('manual', [selected.slice(PLATE.length)]);
    else {
      const n = anyNode(selected);
      if (n.home === 'manual') see('manual', [n.manual]);
    }
  }, [see, selected]);
  const gesture = useRef<Gesture>({
    pointers: new Map(),
    start: new Map(),
    view: { x: 0, y: 0, k: 1 },
    moved: false,
  });
  // The grafts change only when a manual is gained or lost, so the layout keys on their ids.
  const graftKey = grafts.map((m) => m.id).join(',');
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const l = useMemo(() => layout(tree, grafts), [tree, graftKey]);
  const world = useMemo(() => ({ w: l.width, h: l.height }), [l]);

  // A new tree opens on its home view with nothing selected, and so does the first measurement;
  // a request to focus a graft opens on its name plate, selected.
  const ready = screen.w > 0;
  // A tree whose own nodes are shut opens on its first graft instead.
  const start = (s: Size) =>
    !own && l.grafts[0] ? graftView(l.grafts[0], s) : homeView(c, tree, l, s);
  const [shown, setShown] = useState({ tree: '', ready: false, focus: -1 });
  const focusSeq = focus?.seq ?? -1;
  if (shown.tree !== tree.id || shown.ready !== ready || shown.focus !== focusSeq) {
    setShown({ tree: tree.id, ready, focus: focusSeq });
    const g = focus ? l.grafts.find((x) => x.manual.id === focus.id) : undefined;
    setSelected(g ? PLATE + g.manual.id : null);
    setView(ready ? (g ? graftView(g, screen) : start(screen)) : null);
  }

  const apply = useCallback(
    (v: View) => setView(screen.w ? clampView(v, world, screen) : v),
    [screen, world],
  );
  const recentre = () => {
    if (ready) setView(start(screen));
  };

  // The observer reports the size once on its own when it starts, then on every resize.
  useLayoutEffect(() => {
    const el = box.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setScreen({ w: el.clientWidth, h: el.clientHeight }));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // The wheel needs a listener that is not passive, to keep the page from scrolling.
  useEffect(() => {
    const el = box.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const r = el.getBoundingClientRect();
      const at = { x: e.clientX - r.left, y: e.clientY - r.top };
      const lines = e.deltaMode === 1 ? 16 : 1;
      setView((v) =>
        v ? clampView(zoomAt(v, Math.exp(-e.deltaY * lines * WHEEL_STEP), at), world, screen) : v,
      );
    };
    el.addEventListener('wheel', onWheel, { passive: false });
    return () => el.removeEventListener('wheel', onWheel);
  }, [world, screen]);

  const local = (e: React.PointerEvent): Point => {
    const r = box.current!.getBoundingClientRect();
    return { x: e.clientX - r.left, y: e.clientY - r.top };
  };
  const restart = () => {
    const g = gesture.current;
    g.start = new Map(g.pointers);
    g.view = view!;
  };

  const zoomButton = (f: number) => {
    if (view) apply(zoomAt(view, f, { x: screen.w / 2, y: screen.h / 2 }));
  };
  const keepInView = (p: Point) => {
    if (!view) return;
    const sx = p.x * view.k + view.x;
    const sy = p.y * view.k + view.y;
    if (sx < 40 || sx > screen.w - 40 || sy < 40 || sy > screen.h - 40) {
      apply(viewAt(view.k, p, { x: screen.w / 2, y: screen.h / 3 }));
    }
  };

  return (
    <div className="tree-canvas-wrap">
      <div
        ref={box}
        className="tree-canvas"
        // Focus can scroll even a clipped box; the canvas moves by its view alone.
        onScroll={(e) => {
          e.currentTarget.scrollLeft = 0;
          e.currentTarget.scrollTop = 0;
        }}
        onPointerDown={(e) => {
          if (e.pointerType === 'mouse' && e.button !== 0) return;
          const g = gesture.current;
          // A mouse has one pointer; one released outside the canvas before a drag began left
          // no pointerup here, so it must not linger as a second finger.
          if (e.pointerType === 'mouse') g.pointers.clear();
          if (g.pointers.size === 0) g.moved = false;
          g.pointers.set(e.pointerId, local(e));
          restart();
        }}
        onPointerMove={(e) => {
          const g = gesture.current;
          if (!g.pointers.has(e.pointerId) || !view) return;
          g.pointers.set(e.pointerId, local(e));
          const ids = [...g.pointers.keys()];
          if (ids.length >= 2) {
            const [a, b] = ids as [number, number];
            g.moved = true;
            apply(
              pinch(
                g.view,
                g.start.get(a)!,
                g.start.get(b)!,
                g.pointers.get(a)!,
                g.pointers.get(b)!,
              ),
            );
            return;
          }
          const p = g.pointers.get(e.pointerId)!;
          const s = g.start.get(e.pointerId)!;
          if (!g.moved && Math.hypot(p.x - s.x, p.y - s.y) < TAP) return;
          if (!g.moved) {
            g.moved = true;
            // From here the canvas owns the pointer, so a drag that leaves it keeps going. A
            // pointer lifted in the same instant can no longer be captured, which is harmless.
            try {
              e.currentTarget.setPointerCapture(e.pointerId);
            } catch {
              /* already released */
            }
          }
          apply(pan(g.view, p.x - s.x, p.y - s.y));
        }}
        onPointerUp={(e) => {
          gesture.current.pointers.delete(e.pointerId);
          restart();
        }}
        onPointerCancel={(e) => {
          gesture.current.pointers.delete(e.pointerId);
          restart();
        }}
        onClickCapture={(e) => {
          if (!gesture.current.moved) return;
          e.stopPropagation();
          e.preventDefault();
          gesture.current.moved = false;
        }}
        onClick={(e) => {
          // A tap on empty canvas closes the details.
          if (e.target === e.currentTarget || (e.target as Element).closest('.tree-world-bg')) {
            setSelected(null);
          }
        }}
      >
        {view && (
          <div
            className="tree-world"
            style={{
              width: l.width,
              height: l.height,
              transform: `translate(${view.x}px, ${view.y}px) scale(${view.k})`,
            }}
          >
            <div className="tree-world-bg">
              <Bands c={c} tree={tree} l={l} own={own} />
              <Edges c={c} tree={tree} l={l} own={own} />
            </div>
            {(own ? tree.nodes : []).map((n) => (
              <NodeButton
                key={n.id}
                c={c}
                n={n}
                at={l.pos(n)}
                selected={selected === n.id}
                onSelect={setSelected}
                onFocusNode={keepInView}
              />
            ))}
            {l.grafts.map((g) => (
              <div key={g.manual.id} className="graft">
                <Plate
                  c={c}
                  m={g.manual}
                  style={{ left: g.x, top: g.y, width: g.width }}
                  selected={selected === PLATE + g.manual.id}
                  fresh={fresh.has(g.manual.id)}
                  onSelect={setSelected}
                />
                {g.nodes.map(({ node }) => (
                  <NodeButton
                    key={node.id}
                    c={c}
                    n={node}
                    at={l.graftPos.get(node.id)!}
                    selected={selected === node.id}
                    onSelect={setSelected}
                    onFocusNode={keepInView}
                  />
                ))}
              </div>
            ))}
          </div>
        )}
      </div>
      <div className="tree-tools" role="group" aria-label="View">
        <button
          type="button"
          className="icon-button"
          aria-label="Zoom in"
          onClick={() => zoomButton(BUTTON_STEP)}
        >
          +
        </button>
        <button
          type="button"
          className="icon-button"
          aria-label="Zoom out"
          onClick={() => zoomButton(1 / BUTTON_STEP)}
        >
          −
        </button>
        <button type="button" className="button tree-recentre" onClick={recentre}>
          Re-centre
        </button>
      </div>
      {selected && <Detail c={c} id={selected} onClose={() => setSelected(null)} />}
    </div>
  );
}

/**
 * The Manuals category: the manuals with no host tree on top, one tree at a time beside a list of
 * them, and the bookcase of every manual held below. A click on a spine opens its graft, or
 * focuses its own tree up here and scrolls to it.
 */
function ManualsView({
  c,
  focus,
  fresh,
  onOpen,
}: {
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

  return (
    <section className="panel">
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
      {onManuals ? (
        <ManualsView c={c} focus={focus} fresh={freshBooks} onOpen={openManual} />
      ) : (
        <>
          <h3 className="tree-title">
            The {treeWords(tree)} <span className="hanzi">{tree.hanzi}</span>{' '}
            <Totals c={c} tree={tree} />
          </h3>
          {!own && (
            <p className="tree-shut">
              The {treeWords(tree)}’s own nodes open with your{' '}
              {LADDER_LABELS[tree.ladder].toLowerCase()} ladder; until then it holds the manuals
              grafted beside it.
            </p>
          )}
          <p className="caption spaced">
            {tree.dao &&
              `Holding a tier, half its nodes owned, multiplies Accuracy and Attack on its actions by ×1.05. `}
            {tree.what} Drag to move, wheel or pinch to zoom, and tap a node for its details.
            {grafts.length > 0 &&
              ' The manuals you hold stand to the right, grafted beside the tree but joined to none of its nodes.'}
          </p>
          <TreeCanvas
            c={c}
            tree={tree}
            grafts={grafts}
            focus={focus && pick === tree.id ? focus : null}
            own={own}
            fresh={freshManuals}
          />
        </>
      )}
    </section>
  );
}
