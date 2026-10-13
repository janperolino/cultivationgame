// A manual's nodes, wherever they show (design § Cultivation, Manuals and Where manuals live): on
// a graft beside its host tree, under the Manuals category, and an Art's under its technique on the
// Techniques screen. A loose manual's nodes unseal as its ladder reaches their tier, a method's as
// the method masters, and an Art's as its technique does.
import { MANUAL_KINDS, manual, type Manual, type ManualNode } from '../content/manuals.ts';
import type { AnyNode } from '../content/nodes.ts';
import { statInfo } from '../content/stats.ts';
import { technique } from '../content/techniques.ts';
import type { Cultivator } from '../core/state.ts';
import { canLearn, hasLearned, nodeSealed } from '../core/trees.ts';
import { formatEffect, formatNumber } from './format.ts';
import { sealWords } from './manualWords.ts';
import { useGame } from './store.ts';

/** A node's effects: the cultivator's, then an Art's on its technique alone. */
export function NodeEffects({ n }: { n: ManualNode | { effects: ManualNode['effects'] } }) {
  const own = 'own' in n ? (n.own ?? []) : [];
  const on = 'manual' in n ? manual(n.manual).technique : undefined;
  return (
    <ul className="effects">
      {n.effects.map((e) => {
        const info = statInfo(e.stat);
        return (
          <li key={e.stat} title={info.what}>
            {formatEffect(e)}
            {info.arrives && <span className="caption"> · counts once {info.arrives} arrives</span>}
          </li>
        );
      })}
      {own.map((e) => (
        <li key={`own-${e.stat}`} title={statInfo(e.stat).what}>
          {formatEffect(e)} on {on ? technique(on).name : 'the technique'} alone
        </li>
      ))}
    </ul>
  );
}

/** Learned, or a button to learn it with what's in the way. */
export function LearnAction({ c, n }: { c: Cultivator; n: AnyNode }) {
  const learnNode = useGame((s) => s.learnNode);
  const ended = useGame((s) => !!s.game?.ended);
  const check = canLearn(c, n.id);
  if (hasLearned(c, n.id)) {
    const sealed = nodeSealed(c, n);
    return <span className="accent">Learned{sealed ? ', sealed for now' : ''}.</span>;
  }
  return (
    <>
      <button
        type="button"
        className="button"
        disabled={!check.ok || ended}
        onClick={() => learnNode(n.id)}
      >
        Learn · {formatNumber(n.cost)} insight
      </button>
      {!check.ok && <span className="caption">{check.reason}</span>}
    </>
  );
}

/** One manual node as a row: name, text, effects, when it wakes, and learning it. */
export function ManualNodeRow({ c, n }: { c: Cultivator; n: ManualNode }) {
  const learned = hasLearned(c, n.id);
  const sealed = nodeSealed(c, n);
  return (
    <li className={`manual-node ${learned ? 'is-learned' : ''}`}>
      <div>
        <strong>{n.name}</strong> <span className="hanzi muted">{n.hanzi}</span>
        {n.kind === 'notable' && <span className="caption"> · notable</span>}
      </div>
      <p className="muted">{n.text}</p>
      <NodeEffects n={n} />
      {sealed && <p className="caption">{sealWords(c, n)}</p>}
      <div className="actions">
        <LearnAction c={c} n={n} />
      </div>
    </li>
  );
}

/** A manual's heading line: kind glyph, name in its rarity's color, hanzi. */
export function ManualName({ m }: { m: Manual }) {
  return (
    <>
      <span className="manual-glyph hanzi" aria-hidden="true">
        {MANUAL_KINDS[m.kind].glyph}
      </span>{' '}
      <span className={`rarity-${m.rarity}`}>{m.name}</span>{' '}
      <span className="hanzi muted">{m.hanzi}</span>
    </>
  );
}
