// The Trees screen (design § UI and screens): the Qi, Body and Soul trees on a canvas you drag and
// zoom, in nine tier bands of branching paths, sealed tiers dimmed, with a re-centre button. A
// node's details open in an overlay on the canvas.
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { REALMS } from '../content/realms.ts';
import { statInfo } from '../content/stats.ts';
import {
  branchOf,
  TIER_COUNT,
  TIER_DEPTH,
  TIER_HALF_WIDTH,
  tierNode,
  tierNodes,
  TREES,
  treeNode,
  treeOf,
  type Tree,
  type TreeNode,
} from '../content/trees/index.ts';
import { ladderOpen } from '../core/cultivation.ts';
import type { Cultivator } from '../core/state.ts';
import { canLearn, hasLearned, nodeSealed, tierOwned } from '../core/trees.ts';
import { formatEffect, formatNumber, LADDER_LABELS } from './format.ts';
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

/** Pixels per layout unit at zoom 1. */
const UNIT = 60;
/** Room either side of a tier's widest node, in units. */
const SIDE = 1.3;
/** A charted band: its heading, the gap above the starter, the nodes, the gap below. */
const HEAD = 1.1;
const ABOVE = 1;
const BELOW = 1.1;
const CHARTED = HEAD + ABOVE + TIER_DEPTH + BELOW;
const UNCHARTED = 1.2;
const WORLD_W = (TIER_HALF_WIDTH + SIDE) * 2 * UNIT;
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

type NodeState = 'learned' | 'available' | 'locked';

function nodeState(c: Cultivator, n: TreeNode): NodeState {
  if (hasLearned(c, n.id)) return 'learned';
  const check = canLearn(c, n.id);
  // Short only of insight still reads as reachable: the path is open.
  return check.ok || check.reason.startsWith('Needs') ? 'available' : 'locked';
}

interface Layout {
  /** Each tier's band top, in world pixels, index 1..9. */
  top: number[];
  height: number;
  pos: (n: TreeNode) => Point;
}

function layout(t: Tree): Layout {
  const top: number[] = [0];
  let y = 0;
  for (let tier = 1; tier <= TIER_COUNT; tier++) {
    top[tier] = y;
    y += (tierNodes(t, tier).length ? CHARTED : UNCHARTED) * UNIT;
  }
  return {
    top,
    height: y,
    pos: (n) => ({
      x: (n.at[0] + TIER_HALF_WIDTH + SIDE) * UNIT,
      y: top[n.tier]! + (HEAD + ABOVE + n.at[1]) * UNIT,
    }),
  };
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

function homeView(c: Cultivator, t: Tree, l: Layout, screen: Size): View {
  const k = Math.min(1, Math.max(0.55, screen.w / WORLD_W));
  const starter = tierNode(t, focusTier(c, t), 'starter');
  const y = starter ? l.pos(starter).y - (HEAD + ABOVE) * UNIT : 0;
  return viewAt(k, { x: WORLD_W / 2, y }, { x: screen.w / 2, y: 8 });
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
    const status = !charted
      ? 'Not yet charted.'
      : sealed
        ? `Sealed until your ${ladderName} reaches ${r.name}`
        : capstone && hasLearned(c, capstone.id)
          ? `${tierOwned(c, tree, tier)} of ${nodes.length} · capstone learned`
          : `${tierOwned(c, tree, tier)} of ${nodes.length} learned`;
    return (
      <div
        key={tier}
        className={`tree-band ${charted ? '' : 'is-empty'} ${sealed ? 'is-sealed' : ''}`}
        style={{
          top: l.top[tier],
          height: (charted ? CHARTED : UNCHARTED) * UNIT,
          width: WORLD_W,
        }}
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

function Edges({ c, tree, l }: { c: Cultivator; tree: Tree; l: Layout }) {
  return (
    <svg className="tree-edges" width={WORLD_W} height={l.height} aria-hidden="true">
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
    </svg>
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
  n: TreeNode;
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
      style={{ left: at.x - 55, top: at.y - size / 2 }}
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

/** The canvas: drag to pan, wheel or pinch to zoom, tap a node to open its details. */
function TreeCanvas({ c, tree }: { c: Cultivator; tree: Tree }) {
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
  const l = useMemo(() => layout(tree), [tree]);
  const world = useMemo(() => ({ w: WORLD_W, h: l.height }), [l]);

  // A new tree opens on its home view with nothing selected, and so does the first measurement.
  const ready = screen.w > 0;
  const [shown, setShown] = useState({ tree: '', ready: false });
  if (shown.tree !== tree.id || shown.ready !== ready) {
    setShown({ tree: tree.id, ready });
    setSelected(null);
    setView(ready ? homeView(c, tree, l, screen) : null);
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
              width: WORLD_W,
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
      {selected && <NodeDetail c={c} id={selected} onClose={() => setSelected(null)} />}
    </div>
  );
}

export function TreesScreen() {
  const game = useGame((s) => s.game);
  const [treeId, setTreeId] = useState('qi');
  if (!game) return null;
  const c = game.player;
  const trees = TREES.filter((t) => ladderOpen(c, t.ladder));
  const tree = trees.find((t) => t.id === treeId) ?? trees[0]!;

  return (
    <section className="panel">
      <div className="tree-top">
        <div className="seg" role="group" aria-label="Tree">
          {trees.map((t) => (
            <button
              key={t.id}
              type="button"
              aria-pressed={t.id === tree.id}
              onClick={() => setTreeId(t.id)}
            >
              {t.name} <span className="hanzi">{t.hanzi}</span>
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
      <p className="caption spaced">
        {tree.what} Drag to move, wheel or pinch to zoom, and tap a node for its details.
      </p>
      <TreeCanvas c={c} tree={tree} />
    </section>
  );
}
