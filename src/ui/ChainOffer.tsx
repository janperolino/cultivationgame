// The origin's chain on Cultivate (design § The origin's chain; The opening, built: chains, rogue,
// knobs). Its next quest is offered where a waiting card sits, in a card's shape: the giver, their
// reason, what it gives and one button, since your origin's quests can't be refused. Its acts (the
// rogue's first work, the spar, the first big job) and its hand-in are buttons on Today's quest line,
// the first work beside the take-up button before the screen has built itself.
import { useState } from 'react';
import {
  actNow,
  chainOffer,
  doAct,
  firstWorkDone,
  handInHere,
  takeChainOffer,
} from '../core/chains.ts';
import { copyTitle, readDays } from '../content/copies.ts';
import { quest } from '../content/quests.ts';
import { readingCopy, readProgress } from '../core/reading.ts';
import { handInCheck, questState, stepsDone } from '../core/journal.ts';
import type { GameState } from '../core/state.ts';
import { useGame } from './store.ts';

/** The chain's next quest, as a card in the band's middle; null with none offered. */
export function ChainOfferCard({ game }: { game: GameState }) {
  const applyLife = useGame((s) => s.applyLife);
  const q = chainOffer(game);
  if (!q) return null;
  return (
    <article className="story is-arriving chain-offer" aria-labelledby="chain-offer">
      <p className="band-kicker">
        <span>Your origin</span>
        <span className="accent">{q.giver.name}</span>
      </p>
      <h3 id="chain-offer">{q.title}</h3>
      <p>{q.reason}</p>
      <p className="caption spaced">It gives {q.reward.text}.</p>
      <div className="actions">
        <button
          type="button"
          className="button"
          onClick={() =>
            applyLife((s) => {
              const r = takeChainOffer(s);
              return r.ok ? r.state : s;
            })
          }
        >
          Take it
        </button>
      </div>
    </article>
  );
}

/**
 * The buttons on Today's quest line: hand a chain quest in where its giver stands with you, or do
 * its step's act. Nothing when neither applies.
 */
export function QuestLineActs({ game }: { game: GameState }) {
  const applyLife = useGame((s) => s.applyLife);
  const [said, setSaid] = useState<string | null>(null);
  const id = game.journal.followed;
  const q = id ? questState(game, id) : undefined;
  if (!q || q.handed !== null) return null;
  const done = stepsDone(q);
  const act = actNow(game);
  if (done) {
    const check = handInCheck(game, q.id);
    if (!check.ok) return null;
    return (
      <button
        type="button"
        className="link-button accent"
        onClick={() =>
          applyLife((s) => {
            const r = handInHere(s, q.id);
            return r.ok ? r.state : s;
          })
        }
      >
        Hand it in
      </button>
    );
  }
  if (!act || act.quest.id !== q.id || 'work' in act.act) return null;
  return (
    <>
      <button
        type="button"
        className="link-button accent"
        onClick={() => {
          let why: string | null = null;
          applyLife((s) => {
            const r = doAct(s, q.id);
            if (typeof r === 'string') {
              why = r;
              return s;
            }
            return r;
          });
          setSaid(why);
        }}
      >
        {act.act.label} →
      </button>
      {said && <span className="warn"> {said}</span>}
    </>
  );
}

/** A rogue's first work, before the first breath: one button, lit by its guide's ring. */
export function FirstWorkButton({ game }: { game: GameState }) {
  const applyLife = useGame((s) => s.applyLife);
  const a = actNow(game);
  if (!a || !('work' in a.act)) {
    // Once done, what the work paid stays said here until the method is taken up.
    const done = firstWorkDone(game);
    if (!done || game.player.activeMethods.qi !== null) return null;
    const step = quest(String(done.data.quest)).steps.find((x) => x.act && 'work' in x.act);
    if (!step?.act || !('work' in step.act)) return null;
    const reading = readingCopy(game.player);
    return (
      <div className="first-work">
        <p className="caption">{step.act.text}</p>
        {reading && (
          <p className="caption accent">
            Reading {copyTitle(reading)}:{' '}
            {Math.round((readProgress(game.player, reading) / readDays(reading)) * 100)}%
          </p>
        )}
      </div>
    );
  }
  const id = a.quest.id;
  return (
    <div className="first-work">
      <p className="caption">{a.quest.steps[questState(game, id)?.step ?? 0]?.text}</p>
      <button
        type="button"
        className="button take-up"
        data-guide="first-work"
        onClick={() =>
          applyLife((s) => {
            const r = doAct(s, id);
            return typeof r === 'string' ? s : r;
          })
        }
      >
        {a.act.label}
      </button>
    </div>
  );
}
