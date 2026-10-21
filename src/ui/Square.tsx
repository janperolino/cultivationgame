// The square (design § Story cards and events, The square; docs/mockups/card-popout-study.html;
// F1): a card or an encounter read in one square about 720 px wide over Cultivate or the Map, the
// screen behind dimmed under a still gradient, never a blur. After a choice the outcome shows in
// the same square, with what it gave and took, and Go on closes it; Later puts it back as a stub.
// A fight takes the stage (Fights you play) and the square closes. Its still comes with A11; until
// then it opens without one.
import { useEffect, useRef, useState } from 'react';
import { statInfo } from '../content/stats.ts';
import { encounterTemplate } from '../content/encounters/index.ts';
import { viewCard, type CardView } from '../core/cards.ts';
import { endGuide } from './guide.ts';
import { EncounterCard } from './EncounterCard.tsx';
import { cueGains, deltas } from './feel.ts';
import { formatNumber } from './format.ts';
import { GainRow } from './Gains.tsx';
import { carryGains, closeSquare, popUp, showResult, useSquare } from './square.ts';
import { useGame } from './store.ts';

/** A check's verdict after the choice: your attribute against the card's number, no roll. */
const VERDICT_WORDS = { clear: 'Clear', close: 'Close', short: 'Short' } as const;

function Choices({ open, onChose }: { open: CardView; onChose: (error: string | null) => void }) {
  const { chooseCard } = useGame.getState();
  return (
    <div className="choices">
      {open.choices.map((c) => (
        <button
          key={c.index}
          type="button"
          className="button choice"
          disabled={!c.check.ok}
          onClick={() => {
            endGuide('first-card');
            onChose(chooseCard(open.uid, c.index, open.title));
          }}
          onContextMenu={(e) => {
            // A sure fight plays on the stage anyway on a right-click (Fights you play).
            if (!c.fight?.sure || !c.check.ok) return;
            e.preventDefault();
            endGuide('first-card');
            onChose(chooseCard(open.uid, c.index, open.title, true));
          }}
        >
          <strong>{c.label}</strong>
          {c.choice.cost?.stones ? (
            <span className="caption">{c.choice.cost.stones} spirit stones</span>
          ) : null}
          {c.choice.check && c.comparison && (
            <span className="caption">
              {statInfo(c.choice.check.attribute).name} {c.comparison.yours} against{' '}
              {c.comparison.against} · {c.comparison.verdict}
            </span>
          )}
          {c.fight && (
            <span className="caption">
              Fight · {c.fight.words} ·{' '}
              {c.fight.sure ? 'sure: right-click to play it' : 'you play it'}
            </span>
          )}
          {!c.check.ok && <span className="caption warn">{c.check.reason}</span>}
        </button>
      ))}
    </div>
  );
}

function Later() {
  return (
    <button type="button" className="button button-quiet square-later" onClick={closeSquare}>
      Later
    </button>
  );
}

/**
 * The card a step goes on with, the one that popped up for not waiting, or the oldest; its outcome
 * once chosen.
 */
function CardSquare({ uid }: { uid?: number }) {
  const game = useGame((s) => s.game)!;
  const outcome = useGame((s) => s.cardOutcome);
  const { dismissCardOutcome } = useGame.getState();
  const [error, setError] = useState<string | null>(null);
  const pending = game.cards.pending.map((p) => viewCard(game, p));
  const top =
    (outcome?.goesOn && pending.find((v) => v.uid === outcome.uid)) ||
    pending.find((v) => v.uid === uid) ||
    pending[0];
  const head = top === pending[0];
  const empty = !outcome && !top;
  useEffect(() => {
    if (empty) closeSquare();
  }, [empty]);

  if (outcome) {
    return (
      <div className="square-body" aria-live="polite">
        <h2>{outcome.title}</h2>
        <p>{outcome.text}</p>
        {outcome.check && (
          <p className="caption">
            {VERDICT_WORDS[outcome.check.verdict]}: {outcome.check.yours} against{' '}
            {outcome.check.against}.
          </p>
        )}
        <GainRow gains={outcome.gains} />
        <div className="actions">
          <button
            type="button"
            className="button"
            onClick={() => {
              carryGains(outcome.gains);
              dismissCardOutcome();
              if (!outcome.goesOn) closeSquare();
            }}
          >
            Go on
          </button>
        </div>
      </div>
    );
  }
  if (!top) return null;
  return (
    <>
      <Later />
      {/* Keyed by card and step, so each new card or step mounts fresh. */}
      <div key={`${top.uid}-${top.stepNumber}`} className="square-body" data-guide="card">
        <p className="square-kicker">
          <span>{head ? 'Waiting' : 'It won’t wait'}</span>
          <b>
            {head
              ? `1 of ${formatNumber(pending.length)}`
              : `${formatNumber(pending.length)} waiting`}
          </b>
        </p>
        <h2>{top.title}</h2>
        <p>{top.text}</p>
        <Choices open={top} onChose={setError} />
        {error && <p className="warn spaced">{error}</p>}
      </div>
    </>
  );
}

/** An encounter on the road, read as the Map reads it; its outcome once an exit is taken. */
function EncounterSquare({ id }: { id: string }) {
  const game = useGame((s) => s.game)!;
  const mapAct = useGame((s) => s.mapAct);
  const result = useSquare((s) => s.result);
  const [error, setError] = useState<string | null>(null);
  const said = useRef<string | null>(null);
  const life = game.map;
  const enc = life?.encounters.find((e) => e.id === id);
  const gone = !result && !enc;
  useEffect(() => {
    if (gone) closeSquare();
  }, [gone]);

  if (result) {
    return (
      <div className="square-body" aria-live="polite">
        <h2>{result.title}</h2>
        <p>{result.text}</p>
        <GainRow gains={result.gains} />
        <div className="actions">
          <button
            type="button"
            className="button"
            onClick={() => {
              carryGains(result.gains);
              closeSquare();
            }}
          >
            Go on
          </button>
        </div>
      </div>
    );
  }
  if (!life || !enc) return null;
  const title = encounterTemplate(enc.template).title;
  // An exit's words land in the square with what it changed, rather than in the Map's line.
  const act = (change: Parameters<typeof mapAct>[0]) => {
    const before = useGame.getState().game;
    said.current = null;
    const why = mapAct(change);
    const after = useGame.getState().game;
    if (said.current !== null && before && after) {
      const changed = deltas(before, after);
      cueGains(changed);
      showResult({ title, text: said.current, gains: changed });
    } else setError(why);
    return why;
  };
  return (
    <>
      <Later />
      <div className="square-body is-encounter">
        <EncounterCard
          game={game}
          life={life}
          enc={enc}
          act={act}
          say={(t) => (said.current = t)}
        />
        {error && <p className="warn spaced">{error}</p>}
      </div>
    </>
  );
}

/** The square over the screen, on Cultivate and the Map; it pops up by itself only when it must. */
export function Square() {
  const game = useGame((s) => s.game);
  const open = useSquare((s) => s.open);
  const fight = !!game?.fight;
  // What you can't avoid pops up by itself: an encounter that stopped your road, an urgent card.
  useEffect(() => {
    if (game && !open) popUp(game);
  }, [game, open]);
  // A fight takes the stage; its hand-back is read there.
  useEffect(() => {
    if (fight) closeSquare();
  }, [fight]);
  if (!game || !open || game.ended) return null;
  return (
    <div className="square-scrim">
      <section
        className="square"
        role="dialog"
        aria-modal="true"
        aria-label={open.kind === 'card' ? 'A card' : 'An encounter'}
      >
        {open.kind === 'card' ? <CardSquare uid={open.uid} /> : <EncounterSquare id={open.id} />}
      </section>
    </div>
  );
}
