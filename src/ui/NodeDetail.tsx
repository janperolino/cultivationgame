// A node's details, wherever a fan draws it (design § UI and screens, The trees are opening fans):
// the overlay a click opens, with Learn, and the card a hover or focus shows beside a node or a
// manual's jewel (its words in fanWords.ts). A tree's nodes and a manual's share them, on the trees and on a hostless
// manual's own fan.
import { MANUAL_KINDS, manual } from '../content/manuals.ts';
import { anyNode } from '../content/nodes.ts';
import { REALMS } from '../content/realms.ts';
import { branchOf, treeNode, treeOf } from '../content/trees/index.ts';
import type { Cultivator } from '../core/state.ts';
import { nodeSealed } from '../core/trees.ts';
import { formatNumber, LADDER_LABELS } from './format.ts';
import { LearnAction, NodeEffects } from './ManualNodes.tsx';
import { sealWords } from './manualWords.ts';

function Head({ title, onClose }: { title: React.ReactNode; onClose: () => void }) {
  return (
    <div className="node-overlay-head">
      <h2 className="panel-heading">{title}</h2>
      <button type="button" className="icon-button" aria-label="Close" onClick={onClose}>
        ×
      </button>
    </div>
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
      <Head
        title={
          <>
            {n.name} <span className="hanzi">{n.hanzi}</span>
          </>
        }
        onClose={onClose}
      />
      <p className="muted">{n.text}</p>
      <NodeEffects n={n} />
      <p className="caption spaced">
        {n.kind} of <span className={`rarity-${m.rarity}`}>{m.name}</span>, the{' '}
        {MANUAL_KINDS[m.kind].name.toLowerCase()} · {formatNumber(n.cost)} insight.
        {m.host ? ' It grows from none of the tree’s nodes.' : ''}
      </p>
      {sealed && <p className="warn">{sealWords(c, n)}</p>}
      <div className="actions">
        <LearnAction c={c} n={n} />
      </div>
    </section>
  );
}

/** "the tier's starter, opened by …", "minor on the Breath branch, a side path". */
function whereWords(id: string): string {
  const n = treeNode(id);
  const branch = branchOf(n);
  if (n.kind === 'starter') {
    return `the tier's starter${n.requires.length ? `, opened by ${treeNode(n.requires[0]!).name}` : ''}`;
  }
  if (n.kind === 'capstone') {
    return `the tier's capstone, opened by ${n.requires.map((r) => treeNode(r).name).join(', ')}`;
  }
  return `${n.kind} on ${branch?.name ?? 'a branch'}${branch?.gate ? ', one of the capstone’s branches' : ', a side path'}`;
}

function TreeNodeDetail({ c, id, onClose }: { c: Cultivator; id: string; onClose: () => void }) {
  const n = treeNode(id);
  const sealed = nodeSealed(c, n);
  const realmName = REALMS[n.tier - 1]!.name;
  return (
    <section className="node-overlay" aria-live="polite" aria-label={n.name}>
      <Head
        title={
          <>
            {n.name} <span className="hanzi">{n.hanzi}</span>
          </>
        }
        onClose={onClose}
      />
      <p className="muted">{n.text}</p>
      <NodeEffects n={n} />
      <p className="caption spaced">
        Tier {n.tier} ({realmName}), {whereWords(id)} · {formatNumber(n.cost)} insight
      </p>
      {sealed && (
        <p className="warn">
          Sealed: it can be learned now, but does nothing until your{' '}
          {LADDER_LABELS[treeOf(id).ladder].toLowerCase()} reaches {realmName}.
        </p>
      )}
      <div className="actions">
        <LearnAction c={c} n={n} />
      </div>
    </section>
  );
}

/** The overlay for whichever node is selected, a tree's or a manual's. */
export function NodeDetail({ c, id, onClose }: { c: Cultivator; id: string; onClose: () => void }) {
  return anyNode(id).home === 'manual' ? (
    <ManualNodeDetail c={c} id={id} onClose={onClose} />
  ) : (
    <TreeNodeDetail c={c} id={id} onClose={onClose} />
  );
}
