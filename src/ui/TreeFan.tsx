// A tree drawn as an opening fan (design § UI and screens, The trees are opening fans), in the
// gilded look: learned nodes and paths in gilt, a node you can buy now ringed in the accent with
// its cost, locked ones dark iron, the starter and capstone medallions with a hanzi. All nine
// realm bands are drawn, the ones not yet written empty. The manuals grafted on the tree are
// jewels in each band's crown (design § Cultivation, Where manuals live); a click blooms one into
// a ring of its nodes. Drag and pinch to move, wheel and pinch to zoom; the screen opens on the
// band you cultivate in, and a ladder of the realms jumps to any band. A hostless manual's own
// tree draws as a small fan in the same look (OwnFan). A node's card hangs beside it on hover,
// and a click pins it open with Learn (NodeTip.tsx); a double click learns it at once.
import {
  memo,
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
} from 'react';
import { MANUAL_KINDS, type Manual } from '../content/manuals.ts';
import type { AnyNode } from '../content/nodes.ts';
import { rarity } from '../content/rarity.ts';
import { REALMS } from '../content/realms.ts';
import { tierNodes, type Tree } from '../content/trees/index.ts';
import { manualReady } from '../core/manuals.ts';
import type { Cultivator } from '../core/state.ts';
import { canLearn, hasLearned, nodeSealed, tierOwned } from '../core/trees.ts';
import { learnedCount, nodeMark } from './bookcase.ts';
import { formatNumber, LADDER_LABELS } from './format.ts';
import { hereTier, jewelTip, nodeState, nodeTip, type TipWords } from './fanWords.ts';
import { NodeTip } from './NodeTip.tsx';
import { viewAt, type Point, type Size, type View } from './panzoom.ts';
import { useGame } from './store.ts';
import {
  bandArc,
  bandFocus,
  bloom,
  BLOOM_DISC,
  BLOOM_LABEL,
  BLOOM_RING,
  fan,
  JEWEL,
  LEVEL,
  LABEL_W,
  nameBox,
  NODE_SIZE,
  OWN_LABEL_W,
  OWN_NAME_W,
  OWN_R,
  ownFan,
  placeTip,
  ROW,
  type Band,
  type Fan,
  type FanEdge,
  type FanNode,
  type Jewel,
} from './treeLayout.ts';
import { useNodeTip } from './useNodeTip.ts';
import { BUTTON_STEP, usePanZoom } from './usePanZoom.ts';
import { rectIn } from './stage.ts';

/** The canvas zooms from the whole of Tribulation Transcendence to a close look at one node. */
const RANGE = { min: 0.14, max: 1.8 };
/** Past this many nodes a jewel counts them ("3/9") instead of a pip each. */
const PIPS_SHOWN = 6;
/** A bloom's nodes are drawn a little smaller than the tree's. */
const BLOOM_SIZE = { minor: 14, notable: 20 } as const;

const rarityVar = (m: Manual) =>
  ({ '--rarity-color': `var(--rarity-${m.rarity})` }) as CSSProperties;

/**
 * The view on a band, at 100% so the names read without zooming in (Jan's call after P2.8): Qi
 * Condensation keeps the hub low and centred, where its starter stands; a band further out
 * centres its peak.
 */
function bandView(f: Fan, tier: number, s: Size): View {
  if (tier === 1) return viewAt(1, f.hub, { x: s.w / 2, y: s.h - 56 });
  return viewAt(1, bandFocus(f, tier), { x: s.w / 2, y: s.h / 2 });
}

/** A view on a jewel, bloomed: near the middle, above where a node's details open. */
const jewelView = (j: Point, s: Size): View => viewAt(1, j, { x: s.w / 2, y: s.h * 0.42 });

/** The words a band's name carries: "Tier 1 · Qi Condensation 炼气 · 72 manuals". */
function bandName(b: Band, manuals: number): string {
  const r = REALMS[b.tier - 1]!;
  const count = manuals ? ` · ${manuals} ${manuals === 1 ? 'manual' : 'manuals'}` : '';
  return `Tier ${b.tier} · ${r.name} ${r.hanzi}${count}`;
}

/** Under a band's name: how much of it is learned, or why it is sealed or empty. */
function bandStatus(c: Cultivator, t: Tree, b: Band, own: boolean, here: number): string {
  const nodes = tierNodes(t, b.tier);
  const ladder = LADDER_LABELS[t.ladder].toLowerCase();
  const mark = b.tier === here ? 'you are here · ' : b.tier === here + 1 ? 'next · ' : '';
  if (!b.charted) return `${mark}not yet charted`;
  if (!own) return `${mark}its own nodes open with your ${ladder}`;
  if (b.tier > here)
    return `${mark}sealed until your ${ladder} reaches ${REALMS[b.tier - 1]!.name}`;
  return `${mark}${tierOwned(c, t, b.tier)} of ${nodes.length} learned`;
}

/**
 * An edge's look: lit when both ends are learned, open when its start is, iron otherwise. A
 * bloom's edge from its heart (the manual itself) starts learned.
 */
function edgeClass(c: Cultivator, e: Pick<FanEdge, 'from' | 'to'>, root?: string): string {
  const from = e.from === root || hasLearned(c, e.from);
  if (from && hasLearned(c, e.to)) return 'is-lit';
  return from ? 'is-open' : 'is-iron';
}

/** Edges as paths, a lit one with a fine bright core over its gilt. */
function EdgePaths({
  c,
  edges,
  root,
}: {
  c: Cultivator;
  edges: readonly FanEdge[];
  root?: string;
}) {
  return edges.map((e) => {
    const cls = edgeClass(c, e, root);
    return (
      <g key={`${e.from}-${e.to}`}>
        <path className={`fan-edge ${cls}`} d={e.d} />
        {cls === 'is-lit' && <path className="fan-edge-core" d={e.d} />}
      </g>
    );
  });
}

/** What a card tells of: a node, hanging at a point, or a jewel. */
type Hover = { kind: 'node'; id: string; at: Point; size: number } | { kind: 'jewel'; id: string };

/** The card's controls (useNodeTip), as the shapes on a fan use them. */
interface TipControl {
  enter: (h: Hover) => void;
  leave: () => void;
  pin: (h: Hover) => void;
  /** The node whose card is pinned open, selected. */
  pinned: string | null;
}

/** A node as a gilded shape: a ring, a notable's double rim, a medallion with a hanzi. */
function NodeShape({
  c,
  n,
  at,
  size,
  medallion,
  tips,
  tipAt,
  onFocusNode,
}: {
  c: Cultivator;
  n: AnyNode;
  at: Point;
  size: number;
  medallion: boolean;
  tips: TipControl;
  /** Where its card hangs, when that isn't `at` (a bloom's node, in the world). */
  tipAt?: Point;
  onFocusNode?: (p: Point) => void;
}) {
  const state = nodeState(c, n);
  const sealed = nodeSealed(c, n);
  const selected = tips.pinned === n.id;
  // Buyable now: a first node's beacon rings these (ui/beacons.ts, theme.css).
  const buyable = state === 'available' && canLearn(c, n.id).ok;
  const learnNode = useGame((s) => s.learnNode);
  const ended = useGame((s) => !!s.game?.ended);
  const hover: Hover = { kind: 'node', id: n.id, at: tipAt ?? at, size };
  return (
    <button
      type="button"
      className={`fan-node is-${n.kind} is-${state}${buyable ? ' is-buyable' : ''}${sealed ? ' is-sealed' : ''}${medallion ? ' is-medallion' : ''}${selected ? ' is-selected' : ''}`}
      style={{ left: at.x - size / 2, top: at.y - size / 2, width: size, height: size }}
      aria-pressed={selected}
      aria-label={`${n.name}, ${n.kind}, ${state}${sealed ? ', sealed' : ''}${state === 'available' ? `, ${n.cost} insight` : ''}`}
      onClick={() => tips.pin(hover)}
      // A double click learns a node you can buy now, the card's Learn without the trip (Jan's note).
      onDoubleClick={() => buyable && !ended && learnNode(n.id)}
      onPointerEnter={(e) => e.pointerType === 'mouse' && tips.enter(hover)}
      onPointerLeave={tips.leave}
      onFocus={() => {
        tips.enter(hover);
        onFocusNode?.(at);
      }}
      onBlur={tips.leave}
    >
      {medallion && (
        <span className="fan-node-glyph hanzi" aria-hidden="true">
          {n.hanzi.slice(-1)}
        </span>
      )}
    </button>
  );
}

/** A node's name, and its cost when it can be bought now. */
function NodeLabel({
  c,
  n,
  style,
  cls,
}: {
  c: Cultivator;
  n: AnyNode;
  style: CSSProperties;
  cls: string;
}) {
  const state = nodeState(c, n);
  return (
    <span
      className={`fan-label ${cls} is-${state}${nodeSealed(c, n) ? ' is-sealed' : ''}`}
      style={style}
      aria-hidden="true"
    >
      {n.name}
      {state === 'available' && <span className="fan-label-cost">{formatNumber(n.cost)}</span>}
    </span>
  );
}

/** Where a tree node's label sits, by the side the layout chose. */
function labelStyle(p: FanNode): CSSProperties {
  const half = p.size / 2;
  if (p.beside === 'right')
    return { left: p.x + half + 6, top: p.y, width: LABEL_W, transform: 'translateY(-50%)' };
  if (p.beside === 'left')
    return {
      left: p.x - half - 6 - LABEL_W,
      top: p.y,
      width: LABEL_W,
      transform: 'translateY(-50%)',
    };
  if (p.beside === 'over')
    return {
      left: p.x - LABEL_W / 2,
      top: p.y - half - 2,
      width: LABEL_W,
      transform: 'translateY(-100%)',
    };
  return { left: p.x - LABEL_W / 2, top: p.y + half + 2, width: LABEL_W };
}

/** A manual's pips under its jewel: lit learned, ringed ready; past six, "3/9". */
function Pips({ c, m, sealed }: { c: Cultivator; m: Manual; sealed: boolean }) {
  if (m.nodes.length > PIPS_SHOWN) {
    return (
      <span className="jewel-count">
        {learnedCount(c, m)}/{m.nodes.length}
      </span>
    );
  }
  return m.nodes.map((n) => {
    const mark = nodeMark(c, n);
    return (
      <span
        key={n.id}
        className={`jewel-pip is-${sealed && mark !== 'learned' ? 'sealed' : mark}`}
      />
    );
  });
}

/** A manual in its band's crown: a diamond in its rarity's color, its pips under it. */
function JewelButton({
  c,
  m,
  j,
  sealed,
  open,
  fresh,
  onOpen,
  tips,
}: {
  c: Cultivator;
  m: Manual;
  j: Jewel;
  sealed: boolean;
  open: boolean;
  fresh: boolean;
  onOpen: (id: string) => void;
  tips: TipControl;
}) {
  const ready = !sealed && manualReady(c, m);
  const hover: Hover = { kind: 'jewel', id: m.id };
  const kind = MANUAL_KINDS[m.kind].name.toLowerCase();
  return (
    <>
      <button
        type="button"
        className={`jewel${ready ? ' is-ready' : ''}${sealed ? ' is-sealed' : ''}${open ? ' is-open' : ''}${fresh ? ' is-new' : ''}`}
        style={{ ...rarityVar(m), left: j.x - JEWEL / 2, top: j.y - JEWEL / 2 }}
        aria-expanded={open}
        aria-label={`${m.name}, ${rarity(m.rarity).name.toLowerCase()} ${kind}, ${learnedCount(c, m)} of ${m.nodes.length} learned${ready ? ', one ready' : ''}`}
        onClick={() => onOpen(m.id)}
        onPointerEnter={(e) => e.pointerType === 'mouse' && tips.enter(hover)}
        onPointerLeave={tips.leave}
        onFocus={() => tips.enter(hover)}
        onBlur={tips.leave}
      >
        <span className="jewel-gem" aria-hidden="true" />
      </button>
      <span
        className="jewel-pips"
        style={{ left: j.x - 24, top: j.y + JEWEL / 2 }}
        aria-hidden="true"
      >
        <Pips c={c} m={m} sealed={sealed} />
      </span>
    </>
  );
}

/**
 * A jewel opened in place: a disc over its neighbours, the jewel at its heart, its nodes on a
 * ring above it with their names outward, and its name below. The heart closes it.
 */
function BloomDisc({
  c,
  m,
  j,
  sealed,
  tips,
  onClose,
}: {
  c: Cultivator;
  m: Manual;
  j: Jewel;
  sealed: boolean;
  tips: TipControl;
  onClose: () => void;
}) {
  const b = useMemo(() => bloom(m), [m]);
  const mid = BLOOM_DISC / 2;
  return (
    <div
      className={`bloom${sealed ? ' is-sealed' : ''}`}
      style={{
        ...rarityVar(m),
        left: j.x - mid,
        top: j.y - mid,
        width: BLOOM_DISC,
        height: BLOOM_DISC,
      }}
      role="group"
      aria-label={`${m.name}, opened`}
    >
      <svg className="bloom-lines" width={BLOOM_DISC} height={BLOOM_DISC} aria-hidden="true">
        <g transform={`translate(${mid} ${mid})`}>
          <circle className="bloom-ring" r={BLOOM_RING} />
          <EdgePaths c={c} edges={b.edges} root={m.id} />
        </g>
      </svg>
      {b.nodes.map((p) => {
        const size = BLOOM_SIZE[p.node.kind];
        const at = { x: mid + p.x, y: mid + p.y };
        const rad = (p.out * Math.PI) / 180;
        return (
          <span key={p.node.id}>
            <NodeShape
              c={c}
              n={p.node}
              at={at}
              size={size}
              medallion={false}
              tips={tips}
              tipAt={{ x: j.x - mid + at.x, y: j.y - mid + at.y }}
            />
            <NodeLabel
              c={c}
              n={p.node}
              cls="is-bloom"
              style={{
                left: mid + BLOOM_LABEL * Math.cos(rad) - 40,
                top: mid + (BLOOM_LABEL - 4) * Math.sin(rad),
                width: 80,
                transform: 'translateY(-50%)',
              }}
            />
          </span>
        );
      })}
      <button
        type="button"
        className="jewel is-heart is-open"
        style={{ left: mid - JEWEL / 2, top: mid - JEWEL / 2 }}
        aria-label={`Close ${m.name}`}
        onClick={onClose}
      >
        <span className="jewel-gem" aria-hidden="true" />
      </button>
      <span className={`bloom-name rarity-${m.rarity}`} style={{ top: mid + 24 }}>
        {m.name}
      </span>
    </div>
  );
}

/** The realms to jump to, as a dropdown, "you are here" and "next" marked. */
function RealmLadder({ here, onGo }: { here: number; onGo: (tier: number) => void }) {
  const mark = (tier: number) => (tier === here ? 'you are here' : tier === here + 1 ? 'next' : '');
  return (
    <nav className="fan-ladder" aria-label="Go to a realm">
      <select
        className="fan-ladder-select"
        aria-label="Go to a realm"
        value=""
        onChange={(e) => {
          if (e.target.value) onGo(Number(e.target.value));
        }}
      >
        <option value="">Go to a realm…</option>
        {REALMS.map((r, i) => (
          <option key={r.id} value={i + 1}>
            {i + 1} · {r.name} {r.hanzi}
            {mark(i + 1) ? ` (${mark(i + 1)})` : ''}
          </option>
        ))}
      </select>
    </nav>
  );
}

/**
 * Everything drawn in the world: the bands, the edges, the nodes and their labels, the jewels and
 * a bloom. Memoized, so a drag or a zoom, which only moves the world's transform, never redraws it.
 */
const FanWorld = memo(function FanWorld({
  c,
  tree,
  f,
  here,
  own,
  grafts,
  open,
  fresh,
  tips,
  onOpen,
  onCloseBloom,
  onFocusNode,
}: {
  c: Cultivator;
  tree: Tree;
  f: Fan;
  here: number;
  own: boolean;
  grafts: readonly Manual[];
  open: string | null;
  fresh: ReadonlySet<string>;
  tips: TipControl;
  onOpen: (id: string, j: Jewel) => void;
  onCloseBloom: () => void;
  onFocusNode: (p: Point) => void;
}) {
  const manualsIn = (tier: number) => grafts.filter((m) => m.tier === tier).length;
  const opened = open ? grafts.find((m) => m.id === open) : undefined;
  return (
    <>
      <div className="fan-bg">
        <svg className="fan-lines is-world" width={f.width} height={f.height} aria-hidden="true">
          {f.bands.map((b) => (
            <g key={b.tier} className={b.tier > here ? 'is-sealed' : undefined}>
              <path
                className="fan-band-edge"
                d={bandArc(b.outer, Math.min(LEVEL, b.span + 4), f.hub)}
              />
              {Array.from({ length: b.rows }, (_, k) => (
                <path
                  key={k}
                  className="fan-crown-row"
                  d={bandArc(b.rim + k * ROW, Math.min(LEVEL, b.span + 2), f.hub)}
                />
              ))}
              {!b.charted && (
                <circle className="fan-capstone-place" cx={b.capstone.x} cy={b.capstone.y} r={20} />
              )}
            </g>
          ))}
          {own && <EdgePaths c={c} edges={f.edges} />}
        </svg>
        {f.bands.map((b) => {
          const box = nameBox(b);
          return (
            <span
              key={b.tier}
              className={`fan-band-name${b.nameInward ? ' is-inward' : ''}${b.tier > here ? ' is-sealed' : ''}${b.tier === here ? ' is-here' : ''}`}
              style={{ left: box.x, top: box.y, width: box.w, fontSize: b.nameSize }}
            >
              {bandName(b, manualsIn(b.tier))}
              <span className="fan-band-status">{bandStatus(c, tree, b, own, here)}</span>
            </span>
          );
        })}
        {own &&
          [...f.nodes.values()].map((p) => (
            <NodeLabel
              key={p.node.id}
              c={c}
              n={p.node}
              cls={`is-${p.beside}`}
              style={labelStyle(p)}
            />
          ))}
      </div>
      {own &&
        [...f.nodes.values()].map((p) => (
          <NodeShape
            key={p.node.id}
            c={c}
            n={p.node}
            at={p}
            size={NODE_SIZE[p.node.kind]}
            medallion={p.node.kind === 'starter' || p.node.kind === 'capstone'}
            tips={tips}
            onFocusNode={onFocusNode}
          />
        ))}
      {grafts.map((m) => {
        const j = f.jewels.get(m.id)!;
        return (
          <JewelButton
            key={m.id}
            c={c}
            m={m}
            j={j}
            sealed={m.tier > here}
            open={open === m.id}
            fresh={fresh.has(m.id)}
            onOpen={(id) => onOpen(id, j)}
            tips={tips}
          />
        );
      })}
      {opened && (
        <BloomDisc
          c={c}
          m={opened}
          j={f.jewels.get(opened.id)!}
          sealed={opened.tier > here}
          tips={tips}
          onClose={onCloseBloom}
        />
      )}
    </>
  );
});

/**
 * The canvas for one tree. Remount it (a `key`) to open on another tree or another jewel: it opens
 * on `focus`'s jewel, bloomed, when given; on the first graft when the tree's own nodes are shut;
 * else on the band you cultivate in.
 */
export function TreeFan({
  c,
  tree,
  grafts: given,
  focus,
  own,
  fresh,
}: {
  c: Cultivator;
  tree: Tree;
  grafts: readonly Manual[];
  /** A manual to open on, bloomed. */
  focus: string | null;
  /** Whether the tree's own nodes are drawn: false before its ladder opens, grafts alone. */
  own: boolean;
  /** Manuals still new: their jewels glow. */
  fresh: ReadonlySet<string>;
}) {
  // The grafts change only when a manual is gained or lost, so the layout keys on their ids.
  const graftKey = given.map((m) => m.id).join(',');
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const grafts = useMemo(() => given, [graftKey]);
  const f = useMemo(() => fan(tree, grafts), [tree, grafts]);
  const world = useMemo(() => ({ w: f.width, h: f.height }), [f]);
  const here = hereTier(c, tree);
  const focused = focus ? f.jewels.get(focus) : undefined;
  const first = !own && grafts[0] ? f.jewels.get(grafts[0].id) : undefined;
  const home = (s: Size) =>
    focused ? jewelView(focused, s) : first ? jewelView(first, s) : bandView(f, here, s);
  const { box, view, screen, handlers, zoomBy, show } = usePanZoom(world, home, {
    range: RANGE,
    floor: true,
  });
  const [open, setOpen] = useState<string | null>(focused ? focus : null);
  const tip = useNodeTip<Hover>();

  // The handlers the world holds keep one identity, reading the latest view and bloom from refs.
  const showRef = useRef(show);
  const openRef = useRef(open);
  useLayoutEffect(() => {
    showRef.current = show;
    openRef.current = open;
  });
  const pinnedId = tip.pinned?.id ?? null;
  const { enter, leave, pin, clear } = tip;
  const tips = useMemo<TipControl>(
    () => ({ enter, leave, pin, pinned: pinnedId }),
    [enter, leave, pin, pinnedId],
  );
  const onOpen = useCallback(
    (id: string, j: Jewel) => {
      clear();
      const opening = openRef.current !== id;
      setOpen(opening ? id : null);
      // Opened from far out, the view comes in to read the bloom.
      if (opening) showRef.current((s, v) => (v && v.k >= 0.9 ? v : jewelView(j, s)));
    },
    [clear],
  );
  const onCloseBloom = useCallback(() => {
    setOpen(null);
    clear();
  }, [clear]);
  const keepInView = useCallback(
    (p: Point) =>
      showRef.current((s, v) => {
        if (!v) return viewAt(1, p, { x: s.w / 2, y: s.h / 3 });
        const sx = p.x * v.k + v.x;
        const sy = p.y * v.k + v.y;
        return sx < 40 || sx > s.w - 40 || sy < 40 || sy > s.h - 40
          ? viewAt(v.k, p, { x: s.w / 2, y: s.h / 3 })
          : v;
      }),
    [],
  );

  // The tree on the canvas is the tab selected, so it is seen; so is a manual opened.
  const see = useGame((s) => s.see);
  useEffect(() => {
    see('tree', [tree.id]);
  }, [see, tree.id]);
  useEffect(() => {
    if (open) see('manual', [open]);
  }, [see, open]);

  const goBand = (tier: number) => {
    setOpen(null);
    clear();
    show((s) => bandView(f, tier, s));
  };

  // The card, in screen pixels beside what it tells of, so it reads at any zoom.
  let card: { words: TipWords; node?: AnyNode; at: Point; half: number } | null = null;
  const shown = tip.shown;
  if (shown && view) {
    const toScreen = (p: Point) => ({ x: p.x * view.k + view.x, y: p.y * view.k + view.y });
    if (shown.kind === 'jewel') {
      const m = grafts.find((x) => x.id === shown.id);
      const j = f.jewels.get(shown.id);
      if (m && j) {
        card = {
          words: jewelTip(c, m, m.tier > here),
          at: toScreen(j),
          half: (JEWEL / 2) * view.k,
        };
      }
    } else {
      const n =
        f.nodes.get(shown.id)?.node ??
        grafts.flatMap((m) => m.nodes).find((x) => x.id === shown.id);
      if (n) {
        card = {
          words: nodeTip(c, n),
          node: n,
          at: toScreen(shown.at),
          half: (shown.size / 2) * view.k,
        };
      }
    }
  }

  return (
    <div
      className="tree-canvas-wrap"
      onKeyDown={(e) => {
        if (e.key !== 'Escape') return;
        if (tip.pinned) clear();
        else if (open) setOpen(null);
        else return;
        e.stopPropagation();
      }}
    >
      <div
        ref={box}
        className="tree-canvas fan-canvas"
        // Focus can scroll even a clipped box; the canvas moves by its view alone.
        onScroll={(e) => {
          e.currentTarget.scrollLeft = 0;
          e.currentTarget.scrollTop = 0;
        }}
        {...handlers}
        onClick={(e) => {
          // A tap on empty canvas closes the card and the bloom.
          if (e.target === e.currentTarget || (e.target as Element).closest('.fan-bg')) {
            clear();
            setOpen(null);
          }
        }}
      >
        {view && (
          <div
            className="tree-world"
            style={{
              width: f.width,
              height: f.height,
              transform: `translate(${view.x}px, ${view.y}px) scale(${view.k})`,
            }}
          >
            <FanWorld
              c={c}
              tree={tree}
              f={f}
              here={here}
              own={own}
              grafts={grafts}
              open={open}
              fresh={fresh}
              tips={tips}
              onOpen={onOpen}
              onCloseBloom={onCloseBloom}
              onFocusNode={keepInView}
            />
          </div>
        )}
      </div>
      {card && (
        <NodeTip
          c={c}
          words={card.words}
          node={card.node}
          style={placeTip(card.at, card.half, screen)}
          pinned={!!tip.pinned && tip.pinned.id === shown?.id}
          onClose={clear}
          handlers={tip.cardHandlers}
        />
      )}
      <div className="fan-tools">
        <div className="tree-tools" role="group" aria-label="View">
          {view && <span className="fan-zoom">{Math.round(view.k * 100)}%</span>}
          <button
            type="button"
            className="icon-button"
            aria-label="Zoom in"
            onClick={() => zoomBy(BUTTON_STEP)}
          >
            +
          </button>
          <button
            type="button"
            className="icon-button"
            aria-label="Zoom out"
            onClick={() => zoomBy(1 / BUTTON_STEP)}
          >
            −
          </button>
          <button type="button" className="button tree-recentre" onClick={() => goBand(here)}>
            Re-centre
          </button>
        </div>
        <RealmLadder here={here} onGo={goBand} />
      </div>
    </div>
  );
}

/**
 * A hostless manual's own tree as a small fan (design § UI and screens, A manual's own tree): its
 * first node at the bottom, its tier bands in ascending order, each named for its realm. Its nodes
 * act as a tree's do: a card beside one on hover or focus, pinned open by a click, with Learn. Too
 * wide for its box, it scrolls sideways, opening centred.
 */
export function OwnFan({ c, m }: { c: Cultivator; m: Manual }) {
  const f = useMemo(() => ownFan(m), [m]);
  const tip = useNodeTip<Hover>();
  const wrap = useRef<HTMLDivElement>(null);
  const scroller = useRef<HTMLDivElement>(null);
  const fanBox = useRef<HTMLDivElement>(null);
  // Where the fan sits in the wrap, so a card can hang beside a node; it moves as the fan scrolls.
  const [offset, setOffset] = useState({ x: 0, y: 0, w: 0 });
  const measure = () => {
    const a = wrap.current && rectIn(wrap.current);
    const b = fanBox.current && rectIn(fanBox.current);
    if (a && b) setOffset({ x: b.left - a.left, y: b.top - a.top, w: a.width });
  };
  useLayoutEffect(() => {
    const s = scroller.current;
    if (s) s.scrollLeft = (s.scrollWidth - s.clientWidth) / 2;
    measure();
    const ro = new ResizeObserver(measure);
    if (wrap.current) ro.observe(wrap.current);
    return () => ro.disconnect();
  }, [f]);
  const tips: TipControl = {
    enter: tip.enter,
    leave: tip.leave,
    pin: tip.pin,
    pinned: tip.pinned?.id ?? null,
  };
  const shown = tip.shown?.kind === 'node' ? tip.shown : null;
  const node = shown ? m.nodes.find((n) => n.id === shown.id) : undefined;
  return (
    <div
      ref={wrap}
      className="own-fan-wrap"
      onKeyDown={(e) => {
        if (e.key === 'Escape' && tip.pinned) {
          tip.clear();
          e.stopPropagation();
        }
      }}
    >
      <div ref={scroller} className="own-fan-scroll" onScroll={measure}>
        <div
          ref={fanBox}
          className="own-fan"
          style={{ width: f.width, height: f.height }}
          onClick={(e) => {
            if (e.target === e.currentTarget) tip.clear();
          }}
        >
          <svg className="fan-lines" width={f.width} height={f.height} aria-hidden="true">
            {f.bands.map((b) => (
              <path key={b.tier} className="fan-band-edge" d={bandArc(b.outer, b.half, f.hub)} />
            ))}
            <EdgePaths c={c} edges={f.edges} />
          </svg>
          {f.bands.map((b) => (
            <span
              key={b.tier}
              className="own-fan-band"
              style={{ left: b.name.x - OWN_NAME_W, top: b.name.y, width: OWN_NAME_W }}
            >
              Tier {b.tier} · <span className="hanzi">{REALMS[b.tier - 1]!.hanzi}</span>
              <span className="own-fan-band-realm">{REALMS[b.tier - 1]!.name}</span>
            </span>
          ))}
          {f.nodes.map((p) => (
            <span key={p.node.id}>
              <NodeShape
                c={c}
                n={p.node}
                at={p}
                size={p.node.kind === 'notable' ? NODE_SIZE.notable : OWN_R * 2}
                medallion={false}
                tips={tips}
              />
              <NodeLabel
                c={c}
                n={p.node}
                cls="is-under"
                style={{ left: p.x - OWN_LABEL_W / 2, top: p.y + OWN_R + 4, width: OWN_LABEL_W }}
              />
            </span>
          ))}
        </div>
      </div>
      {shown && node && (
        <NodeTip
          c={c}
          words={nodeTip(c, node)}
          node={node}
          style={placeTip({ x: shown.at.x + offset.x, y: shown.at.y + offset.y }, shown.size / 2, {
            w: offset.w,
            h: Infinity,
          })}
          pinned={tip.pinned?.id === shown.id}
          onClose={tip.clear}
          handlers={tip.cardHandlers}
        />
      )}
    </div>
  );
}
