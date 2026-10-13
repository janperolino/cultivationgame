// The Trees screen (design § UI and screens): the Qi, Body and Soul trees and the combat Daos on a
// canvas you drag and zoom, in nine tier bands of branching paths, sealed tiers dimmed, with a
// re-centre button. The manuals you hold graft beside their host trees, each a cluster in its tier
// band with a name plate and a dotted bracket, joined to none of the tree's nodes (design §
// Cultivation, Where manuals live); the Manuals category holds those with no host and a shelf of
// every manual held. A node's details open in an overlay on the canvas.
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { MANUAL_KIND_IDS, MANUAL_KINDS, manual, type Manual } from '../content/manuals.ts';
import { MASTERY } from '../content/mastery.ts';
import { anyNode, type AnyNode } from '../content/nodes.ts';
import { REALMS } from '../content/realms.ts';
import { statInfo } from '../content/stats.ts';
import {
  branchOf,
  TIER_COUNT,
  tierNode,
  tierNodes,
  BIG_THREE,
  TREE_CATEGORIES,
  tree as treeById,
  treeNode,
  treeOf,
  type Tree,
  type TreeCategory,
  type TreeNode,
} from '../content/trees/index.ts';
import { ladderOpen } from '../core/cultivation.ts';
import { graftsOn, heldManuals, hostlessManuals } from '../core/manuals.ts';
import { methodMastery } from '../core/methods.ts';
import type { Cultivator } from '../core/state.ts';
import { mastery } from '../core/techniques.ts';
import { canLearn, hasLearned, nodeSealed, tierOwned } from '../core/trees.ts';
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
  cluster,
  layout,
  NODE_HALF_W,
  TREE_W,
  UNCHARTED,
  UNIT,
  type Cluster,
  type Graft,
  type Layout,
} from './treeLayout.ts';

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

function Bands({ c, tree, l }: { c: Cultivator; tree: Tree; l: Layout }) {
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

function Edges({ c, tree, l }: { c: Cultivator; tree: Tree; l: Layout }) {
  return (
    <svg className="tree-edges" width={l.width} height={l.height} aria-hidden="true">
      {tree.nodes.flatMap((n) =>
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
  onSelect,
}: {
  c: Cultivator;
  m: Manual;
  style: React.CSSProperties;
  selected: boolean;
  onSelect: (id: string) => void;
}) {
  return (
    <button
      type="button"
      className={`graft-plate ${selected ? 'is-selected' : ''}`}
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
function ManualNodeDetail({
  c,
  id,
  inline,
  onClose,
}: {
  c: Cultivator;
  id: string;
  inline?: boolean;
  onClose: () => void;
}) {
  const n = anyNode(id);
  if (n.home !== 'manual') return null;
  const m = manual(n.manual);
  const sealed = nodeSealed(c, n);
  return (
    <section
      className={`node-overlay ${inline ? 'is-inline' : ''}`}
      aria-live="polite"
      aria-label={n.name}
    >
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
function ManualDetail({
  c,
  id,
  inline,
  onClose,
}: {
  c: Cultivator;
  id: string;
  inline?: boolean;
  onClose: () => void;
}) {
  const m = manual(id);
  return (
    <section
      className={`node-overlay ${inline ? 'is-inline' : ''}`}
      aria-live="polite"
      aria-label={m.name}
    >
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
function Detail({
  c,
  id,
  inline,
  onClose,
}: {
  c: Cultivator;
  id: string;
  inline?: boolean;
  onClose: () => void;
}) {
  if (id.startsWith(PLATE)) {
    return <ManualDetail c={c} id={id.slice(PLATE.length)} inline={inline} onClose={onClose} />;
  }
  if (anyNode(id).home === 'manual') {
    return <ManualNodeDetail c={c} id={id} inline={inline} onClose={onClose} />;
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
}: {
  c: Cultivator;
  tree: Tree;
  grafts: readonly Manual[];
  focus: Focus | null;
}) {
  const box = useRef<HTMLDivElement>(null);
  const [screen, setScreen] = useState<Size>({ w: 0, h: 0 });
  const [view, setView] = useState<View | null>(null);
  const [selected, setSelected] = useState<string | null>(null);
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
  const [shown, setShown] = useState({ tree: '', ready: false, focus: -1 });
  const focusSeq = focus?.seq ?? -1;
  if (shown.tree !== tree.id || shown.ready !== ready || shown.focus !== focusSeq) {
    setShown({ tree: tree.id, ready, focus: focusSeq });
    const g = focus ? l.grafts.find((x) => x.manual.id === focus.id) : undefined;
    setSelected(g ? PLATE + g.manual.id : null);
    setView(ready ? (g ? graftView(g, screen) : homeView(c, tree, l, screen)) : null);
  }

  const apply = useCallback(
    (v: View) => setView(screen.w ? clampView(v, world, screen) : v),
    [screen, world],
  );
  const recentre = () => {
    if (ready) setView(homeView(c, tree, l, screen));
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
              <Bands c={c} tree={tree} l={l} />
              <Edges c={c} tree={tree} l={l} />
            </div>
            {tree.nodes.map((n) => (
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

/** A manual drawn on its own, off the canvas: its plate, its nodes and their edges. */
function ClusterBox({
  c,
  k,
  selected,
  onSelect,
}: {
  c: Cultivator;
  k: Cluster;
  selected: string | null;
  onSelect: (id: string) => void;
}) {
  const at = new Map(k.nodes.map((n) => [n.node.id, n.at]));
  return (
    <div className="graft-box" style={{ width: k.width, height: k.height }}>
      <svg className="tree-edges" width={k.width} height={k.height} aria-hidden="true">
        {graftEdges(c, k.manual, (id) => at.get(id)!)}
      </svg>
      <Plate
        c={c}
        m={k.manual}
        style={{ left: 0, top: 0, width: k.width }}
        selected={selected === PLATE + k.manual.id}
        onSelect={onSelect}
      />
      {k.nodes.map(({ node, at: p }) => (
        <NodeButton
          key={node.id}
          c={c}
          n={node}
          at={p}
          selected={selected === node.id}
          onSelect={onSelect}
          onFocusNode={() => {}}
        />
      ))}
    </div>
  );
}

/**
 * The Manuals category: the manuals with no host tree as small trees of their own on top, and a
 * shelf of every manual held by kind below, each a link to its graft.
 */
function ManualsView({
  c,
  focus,
  onOpen,
}: {
  c: Cultivator;
  focus: Focus | null;
  onOpen: (m: Manual) => void;
}) {
  const [selected, setSelected] = useState<string | null>(null);
  const [focused, setFocused] = useState(-1);
  if (focus && focus.seq !== focused) {
    setFocused(focus.seq);
    setSelected(PLATE + focus.id);
  }
  const hostless = hostlessManuals(c);
  const held = heldManuals(c);
  return (
    <>
      <h3 className="sub-heading">Without a host tree</h3>
      {hostless.length === 0 ? (
        <p className="muted spaced">
          Scriptures and Inheritances land here, and any manual with no one tree to graft beside.
        </p>
      ) : (
        <>
          <p className="caption">
            Manuals with no one tree to graft beside stand here as small trees of their own.
          </p>
          <div className="graft-row">
            {hostless.map((m) => (
              <ClusterBox
                key={m.id}
                c={c}
                k={cluster(m)}
                selected={selected}
                onSelect={setSelected}
              />
            ))}
          </div>
        </>
      )}
      {selected && <Detail c={c} id={selected} inline onClose={() => setSelected(null)} />}
      <h3 className="sub-heading spaced">The shelf</h3>
      {held.length === 0 ? (
        <p className="muted spaced">You hold no manual yet.</p>
      ) : (
        MANUAL_KIND_IDS.filter((k) => held.some((m) => m.kind === k)).map((k) => (
          <div key={k} className="manual-kind">
            <h4 className="caption">
              {MANUAL_KINDS[k].plural} <span className="hanzi">{MANUAL_KINDS[k].hanzi}</span>
            </h4>
            <ul className="manual-list">
              {held
                .filter((m) => m.kind === k)
                .map((m) => (
                  <li key={m.id}>
                    <button type="button" className="manual-open" onClick={() => onOpen(m)}>
                      <ManualName m={m} />
                      <span className="caption">
                        {' '}
                        · {m.nodes.filter((n) => hasLearned(c, n.id)).length} of {m.nodes.length}{' '}
                        learned ·{' '}
                        {m.host ? `beside ${treeById(m.host).name}, tier ${m.tier}` : 'above'}
                      </span>
                    </button>
                  </li>
                ))}
            </ul>
          </div>
        ))
      )}
    </>
  );
}

/** "Qi · 3 manuals" on the tree list. */
function graftCount(n: number): string {
  return n === 0 ? '' : ` · ${n} ${n === 1 ? 'manual' : 'manuals'}`;
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
  // Pick a category, then a tree in it. The big three open with their ladders; the combat Daos
  // once a first technique opens combat; Manuals with a first manual; the rest show as coming.
  const open = (t: Tree) =>
    t.dao ? game.unlocks.includes('combat') : BIG_THREE.includes(t) && ladderOpen(c, t.ladder);
  const categories = TREE_CATEGORIES.map((k) => ({ ...k, trees: k.trees.filter(open) }));
  const all = categories.flatMap((k) => k.trees);
  const anyManual = heldManuals(c).length > 0;
  const onManuals = pick === MANUALS_PICK && anyManual;
  const tree = all.find((t) => t.id === pick) ?? all[0]!;
  const current = onManuals
    ? categories.find((k) => k.id === MANUALS_PICK)!
    : categories.find((k) => k.trees.includes(tree))!;
  const usable = (k: TreeCategory) => k.trees.length > 0 || (k.id === MANUALS_PICK && anyManual);
  const shut = (k: TreeCategory) =>
    usable(k) ? null : (k.opens ?? (k.id === 'daos' ? 'with a first technique' : ''));
  const openManual = (m: Manual) => {
    localSeq.current -= 1;
    setPick(m.host && all.some((t) => t.id === m.host) ? m.host : MANUALS_PICK);
    setFocus({ id: m.id, seq: localSeq.current });
  };

  return (
    <section className="panel">
      <div className="tree-top">
        <div className="seg" role="group" aria-label="Kind of tree">
          {categories.map((k) => (
            <button
              key={k.id}
              type="button"
              aria-pressed={k.id === current.id}
              disabled={!usable(k)}
              title={shut(k) ?? undefined}
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
      {categories.some((k) => shut(k)) && (
        <p className="caption">
          {categories
            .filter((k) => shut(k))
            .map((k) => `${k.name} ${shut(k)}`)
            .join(' · ')}
        </p>
      )}
      {onManuals ? (
        <ManualsView c={c} focus={focus} onOpen={openManual} />
      ) : (
        <>
          <p className="caption spaced">
            {tree.dao &&
              `Holding a tier, half its nodes owned, multiplies Accuracy and Attack on its actions by ×1.05. `}
            {tree.what} Drag to move, wheel or pinch to zoom, and tap a node for its details.
            {graftsOn(c, tree.id).length > 0 &&
              ' The manuals you hold stand to the right, grafted beside the tree but joined to none of its nodes.'}
          </p>
          <TreeCanvas
            c={c}
            tree={tree}
            grafts={graftsOn(c, tree.id)}
            focus={focus && pick === tree.id ? focus : null}
          />
        </>
      )}
    </section>
  );
}
