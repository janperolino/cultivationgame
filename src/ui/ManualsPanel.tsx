// Manuals on the Character screen (design § Cultivation, Manuals; § UI and screens, Character):
// every manual held, by kind, and a manual's nodes in an overlay to learn with insight. A loose
// manual's nodes unseal as its ladder reaches their tier; a method's own nodes as the method's
// mastery grows.
import { useState } from 'react';
import { MANUAL_KIND_IDS, MANUAL_KINDS, manual, type ManualNode } from '../content/manuals.ts';
import { MASTERY } from '../content/mastery.ts';
import { REALMS } from '../content/realms.ts';
import { statInfo } from '../content/stats.ts';
import { heldManuals } from '../core/manuals.ts';
import { methodMastery } from '../core/methods.ts';
import type { Cultivator } from '../core/state.ts';
import { canLearn, hasLearned, nodeSealed } from '../core/trees.ts';
import { formatEffect, formatNumber, LADDER_LABELS } from './format.ts';
import { useGame } from './store.ts';

/** When a sealed manual node will work, in words. */
function sealWords(c: Cultivator, n: ManualNode): string {
  const m = manual(n.manual);
  if (m.method && n.mastery !== undefined) {
    const now = MASTERY[methodMastery(c, m.method).level]!.name;
    return `Sealed until the method reaches ${MASTERY[n.mastery]!.name} (it stands at ${now}).`;
  }
  return `Sealed until your ${LADDER_LABELS[m.ladder].toLowerCase()} reaches ${REALMS[n.tier - 1]!.name}.`;
}

function ManualNodeRow({ c, n }: { c: Cultivator; n: ManualNode }) {
  const learnNode = useGame((s) => s.learnNode);
  const ended = useGame((s) => !!s.game?.ended);
  const learned = hasLearned(c, n.id);
  const sealed = nodeSealed(c, n);
  const check = canLearn(c, n.id);
  return (
    <li className={`manual-node ${learned ? 'is-learned' : ''}`}>
      <div>
        <strong>{n.name}</strong> <span className="hanzi muted">{n.hanzi}</span>
        {n.kind === 'notable' && <span className="caption"> · notable</span>}
      </div>
      <p className="muted">{n.text}</p>
      <ul className="effects">
        {n.effects.map((e) => (
          <li key={e.stat} title={statInfo(e.stat).what}>
            {formatEffect(e)}
          </li>
        ))}
      </ul>
      {sealed && <p className="caption">{sealWords(c, n)}</p>}
      <div className="actions">
        {learned ? (
          <span className="accent">Learned{sealed ? ', sealed for now' : ''}.</span>
        ) : (
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
        )}
      </div>
    </li>
  );
}

function ManualOverlay({ c, id, onClose }: { c: Cultivator; id: string; onClose: () => void }) {
  const m = manual(id);
  return (
    <section className="node-overlay is-inline" aria-live="polite" aria-label={m.name}>
      <div className="node-overlay-head">
        <h3 className="panel-heading">
          <span className={`rarity-${m.rarity}`}>{m.name}</span>{' '}
          <span className="hanzi">{m.hanzi}</span>
        </h3>
        <button type="button" className="icon-button" aria-label="Close" onClick={onClose}>
          ×
        </button>
      </div>
      <p className="caption">
        {MANUAL_KINDS[m.kind].name} · {m.pinyin} · from {m.source}
      </p>
      <ul className="manual-nodes">
        {m.nodes.map((n) => (
          <ManualNodeRow key={n.id} c={c} n={n} />
        ))}
      </ul>
    </section>
  );
}

export function ManualsPanel({ c }: { c: Cultivator }) {
  const [open, setOpen] = useState<string | null>(null);
  const held = heldManuals(c);
  return (
    <section className="panel">
      <h2 className="panel-heading">Manuals</h2>
      <p className="caption">
        Nodes the world gives you. They stack with the trees and with each other, and never unlock
        one another.
      </p>
      {held.length === 0 ? (
        <p className="muted spaced">You hold no manual yet.</p>
      ) : (
        MANUAL_KIND_IDS.filter((k) => held.some((m) => m.kind === k)).map((k) => (
          <div key={k} className="manual-kind">
            <h3 className="sub-heading">
              {MANUAL_KINDS[k].plural} <span className="hanzi muted">{MANUAL_KINDS[k].hanzi}</span>
            </h3>
            <ul className="manual-list">
              {held
                .filter((m) => m.kind === k)
                .map((m) => {
                  const learned = m.nodes.filter((n) => hasLearned(c, n.id)).length;
                  return (
                    <li key={m.id}>
                      <button
                        type="button"
                        className="manual-open"
                        aria-expanded={open === m.id}
                        onClick={() => setOpen(open === m.id ? null : m.id)}
                      >
                        <span className={`rarity-${m.rarity}`}>{m.name}</span>{' '}
                        <span className="hanzi muted">{m.hanzi}</span>
                        <span className="caption">
                          {' '}
                          · {learned} of {m.nodes.length} learned
                        </span>
                      </button>
                      {open === m.id && (
                        <ManualOverlay c={c} id={m.id} onClose={() => setOpen(null)} />
                      )}
                    </li>
                  );
                })}
            </ul>
          </div>
        ))
      )}
    </section>
  );
}
