// A manual's nodes, wherever they show (design § Cultivation, Manuals and Where manuals live): in
// a jewel's bloom on its host's fan, on a hostless manual's own fan, and an Art's under its
// technique on the Techniques screen. A loose manual's nodes unseal as its ladder reaches their tier, a method's as
// the method masters, and an Art's as its technique does.
import { manual, type ManualNode } from '../content/manuals.ts';
import type { AnyNode } from '../content/nodes.ts';
import { statInfo } from '../content/stats.ts';
import { technique } from '../content/techniques.ts';
import type { Cultivator } from '../core/state.ts';
import { canLearn, hasLearned, nodeSealed } from '../core/trees.ts';
import { formatEffect, formatNumber } from './format.ts';
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
