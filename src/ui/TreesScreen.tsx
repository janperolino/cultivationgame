// The Trees screen (design § UI and screens): the Qi, Body and Soul trees as a pannable graph in
// nine tier bands, sealed nodes dimmed. Pick a node to see what it does and learn it.
import { useEffect, useRef, useState } from 'react';
import { REALMS } from '../content/realms.ts';
import { statInfo } from '../content/stats.ts';
import {
  TIER_COLS,
  TIER_COUNT,
  TIER_ROWS,
  TREES,
  tierNodes,
  treeNode,
  treeOf,
  type Tree,
  type TreeNode,
} from '../content/trees/index.ts';
import { openSlots } from '../core/cultivation.ts';
import type { Cultivator } from '../core/state.ts';
import {
  canLearn,
  hasLearned,
  nodeSealed,
  tierHeld,
  tierHoldCount,
  tierOwned,
} from '../core/trees.ts';
import { formatEffect, formatNumber, LADDER_LABELS } from './format.ts';
import { useGame } from './store.ts';

const CELL_W = 124;
const CELL_H = 76;
const NODE_W = 108;
const NODE_H = 50;
const BAND_HEAD = 30;
const GRAPH_W = TIER_COLS * CELL_W;

type NodeState = 'learned' | 'available' | 'locked';

function nodeState(c: Cultivator, n: TreeNode): NodeState {
  if (hasLearned(c, n.id)) return 'learned';
  const check = canLearn(c, n.id);
  // Short only of insight still reads as reachable: the path is open.
  return check.ok || check.reason.startsWith('Needs') ? 'available' : 'locked';
}

function centre(n: TreeNode) {
  return { x: n.at[0] * CELL_W + CELL_W / 2, y: n.at[1] * CELL_H + CELL_H / 2 };
}

function TierBand({
  c,
  tree,
  tier,
  selected,
  onSelect,
}: {
  c: Cultivator;
  tree: Tree;
  tier: number;
  selected: string | null;
  onSelect: (id: string) => void;
}) {
  const nodes = tierNodes(tree, tier);
  const r = REALMS[tier - 1]!;
  const ladderName = LADDER_LABELS[tree.ladder].toLowerCase();
  const sealed = nodes.length > 0 && nodeSealed(c, nodes[0]!);
  const held = tierHeld(c, tree, tier);

  if (nodes.length === 0) {
    return (
      <div className="tier-band is-empty" style={{ width: GRAPH_W }}>
        <span className="tier-label">
          Tier {tier} · {r.name} <span className="hanzi">{r.hanzi}</span>
        </span>
        <span className="caption">Not yet charted.</span>
      </div>
    );
  }

  const height = TIER_ROWS * CELL_H;
  return (
    <div className={`tier-band ${sealed ? 'is-sealed' : ''}`} style={{ width: GRAPH_W }}>
      <div className="tier-head" style={{ height: BAND_HEAD }}>
        <span className="tier-label">
          Tier {tier} · {r.name} <span className="hanzi">{r.hanzi}</span>
        </span>
        <span className="caption">
          {sealed
            ? `Sealed until your ${ladderName} reaches ${r.name}`
            : held
              ? 'Held'
              : `${tierOwned(c, tree, tier)} of ${tierHoldCount(tree, tier)} to hold`}
        </span>
      </div>
      <div className="tier-grid" style={{ height }}>
        <svg className="tier-edges" width={GRAPH_W} height={height} aria-hidden="true">
          {nodes.flatMap((n) => {
            const to = centre(n);
            const lines = n.requires.map((req) => {
              const from = centre(treeNode(req));
              const lit = hasLearned(c, req) && hasLearned(c, n.id);
              return (
                <line
                  key={`${req}-${n.id}`}
                  x1={from.x}
                  y1={from.y}
                  x2={to.x}
                  y2={to.y}
                  className={lit ? 'is-lit' : undefined}
                />
              );
            });
            // A starter grows from the tier below, held.
            if (n.kind === 'starter' && tier > 1) {
              lines.push(
                <line
                  key={`below-${n.id}`}
                  x1={to.x}
                  y1={0}
                  x2={to.x}
                  y2={to.y}
                  className="is-tier"
                />,
              );
            }
            return lines;
          })}
        </svg>
        {nodes.map((n) => {
          const state = nodeState(c, n);
          const pos = centre(n);
          return (
            <button
              key={n.id}
              type="button"
              className={`tree-node is-${state} ${n.kind ? `is-${n.kind}` : ''} ${selected === n.id ? 'is-selected' : ''}`}
              style={{
                left: pos.x - NODE_W / 2,
                top: pos.y - NODE_H / 2,
                width: NODE_W,
                height: NODE_H,
              }}
              aria-pressed={selected === n.id}
              aria-label={`${n.name}, ${state}${sealed ? ', sealed' : ''}`}
              onClick={() => onSelect(n.id)}
            >
              <span className="tree-node-name">{n.name}</span>
              <span className="tree-node-cost">
                {state === 'learned' ? 'learned' : `${formatNumber(n.cost)} insight`}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

type Drag = { x: number; y: number; left: number; top: number; moved: boolean };

/** A scrolling area you can drag with the mouse to pan; touch scrolls it natively. */
function PanArea({ children, view }: { children: React.ReactNode; view: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const drag = useRef<Drag | null>(null);
  // Each new view opens centred sideways, where the starters sit, and at the top.
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.scrollLeft = (el.scrollWidth - el.clientWidth) / 2;
    el.scrollTop = 0;
  }, [view]);
  return (
    <div
      className="tree-graph"
      ref={ref}
      onPointerDown={(e) => {
        const el = ref.current;
        if (e.pointerType !== 'mouse' || e.button !== 0 || !el) return;
        drag.current = {
          x: e.clientX,
          y: e.clientY,
          left: el.scrollLeft,
          top: el.scrollTop,
          moved: false,
        };
      }}
      onPointerMove={(e) => {
        const d = drag.current;
        const el = ref.current;
        if (!d || !el) return;
        const dx = e.clientX - d.x;
        const dy = e.clientY - d.y;
        if (!d.moved && Math.hypot(dx, dy) < 5) return;
        d.moved = true;
        el.scrollLeft = d.left - dx;
        el.scrollTop = d.top - dy;
      }}
      // Cleared after the click that follows, so a drag never counts as a click.
      onPointerUp={() => setTimeout(() => (drag.current = null), 0)}
      onPointerLeave={() => (drag.current = null)}
      onClickCapture={(e) => {
        if (!drag.current?.moved) return;
        e.stopPropagation();
        e.preventDefault();
      }}
    >
      {children}
    </div>
  );
}

function NodeDetail({ c, id }: { c: Cultivator; id: string }) {
  const learnNode = useGame((s) => s.learnNode);
  const ended = useGame((s) => !!s.game?.ended);
  const n = treeNode(id);
  const learned = hasLearned(c, id);
  const sealed = nodeSealed(c, n);
  const check = canLearn(c, id);
  const realmName = REALMS[n.tier - 1]!.name;

  return (
    <section className="panel node-detail" aria-live="polite">
      <h2 className="panel-heading">
        {n.name} <span className="hanzi">{n.hanzi}</span>
      </h2>
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
        Tier {n.tier} ({realmName}){n.kind ? `, the tier's ${n.kind}` : ''} · {formatNumber(n.cost)}{' '}
        insight
        {n.requires.length > 0 &&
          ` · grows from ${n.requires.map((r) => treeNode(r).name).join(' and ')}`}
        {n.kind === 'starter' && n.tier > 1 && ` · needs tier ${n.tier - 1} held`}
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

export function TreesScreen() {
  const game = useGame((s) => s.game);
  const [treeId, setTreeId] = useState('qi');
  const [selected, setSelected] = useState<string | null>(null);
  if (!game) return null;
  const c = game.player;
  const open = openSlots(c);
  const trees = TREES.filter((t) => t.ladder === 'qi' || open.includes(t.ladder));
  const tree = trees.find((t) => t.id === treeId) ?? trees[0]!;
  const pick = selected && tree.nodes.some((n) => n.id === selected) ? selected : null;

  return (
    <>
      <section className="panel">
        <div className="tree-top">
          <div className="seg" role="group" aria-label="Tree">
            {trees.map((t) => (
              <button
                key={t.id}
                type="button"
                aria-pressed={t.id === tree.id}
                onClick={() => {
                  setTreeId(t.id);
                  setSelected(null);
                }}
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
        <p className="caption spaced">{tree.what}</p>
        <PanArea view={tree.id}>
          {Array.from({ length: TIER_COUNT }, (_, i) => (
            <TierBand
              key={i}
              c={c}
              tree={tree}
              tier={i + 1}
              selected={pick}
              onSelect={setSelected}
            />
          ))}
        </PanArea>
      </section>
      {pick ? (
        <NodeDetail c={c} id={pick} />
      ) : (
        <section className="panel">
          <p className="muted">
            Pick a node to see what it does. Learning costs only insight; a node above your level
            can be learned now and stays sealed until you grow into it.
          </p>
        </section>
      )}
    </>
  );
}
