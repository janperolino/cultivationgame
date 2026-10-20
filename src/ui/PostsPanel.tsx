// Jobs on the screens (O4, the talk's mockup): the post card in Routine's column, under the methods,
// naming the work, its giver and hall, its shift, pay and perk, the month's shifts kept and missed
// and the way out; and the work a place offers, taken at its door on the place screen.
import { useState } from 'react';
import { BRANCHES } from '../content/hours.ts';
import { isHire, type Job } from '../content/jobs.ts';
import { canTakeJob, jobPay, jobsAt, jobsView, quitJob, takeJob } from '../core/jobs.ts';
import { houseOf, organization, theName } from '../core/organizations.ts';
import { realmOf, type GameState } from '../core/state.ts';
import type { RegionMap } from '../core/map/region.ts';
import { useGame } from './store.ts';

const plural = (n: number, w: string) => `${n} ${w}${n === 1 ? '' : 's'}`;

/** A shift in words: its branches and the time of day they run. */
function shiftWords(hours: readonly number[]): string {
  if (!hours.length) return 'on the road';
  const first = BRANCHES[hours[0]!]!;
  const last = BRANCHES[hours[hours.length - 1]!]!;
  return `${hours.map((h) => BRANCHES[h]!.hanzi).join(' ')} · ${first.time} to ${last.time}`;
}

/** The posts and hires you hold, in Routine's column. */
export function PostsPanel({ game }: { game: GameState }) {
  const mapAct = useGame((s) => s.mapAct);
  const [asking, setAsking] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const rows = jobsView(game);
  if (!rows.length) return null;
  return (
    <section className="panel posts-panel" aria-labelledby="posts-heading">
      <h2 id="posts-heading" className="panel-heading">
        {rows.length === 1 ? 'Your post' : 'Your work'}
      </h2>
      {rows.map((j) => (
        <article key={j.id} className="post">
          <h3 className="post-name">
            {j.name} <span className="hanzi">{j.hanzi}</span>
          </h3>
          <p className="caption post-giver">
            {j.giver.charAt(0).toUpperCase() + j.giver.slice(1)}
            {j.hall !== j.giver ? ` · ${j.hall}` : ''}
            {j.hire ? ' · a hire' : ''}
          </p>
          <dl className="post-rows">
            <dt>Shift</dt>
            <dd>
              <span className="hanzi">{shiftWords(j.shift)}</span>
            </dd>
            <dt>Pay</dt>
            <dd>{j.pay}</dd>
            <dt>Perk</dt>
            <dd>{j.perk}</dd>
            <dt>This month</dt>
            <dd>
              {j.drilling
                ? 'at drill until layer 4'
                : `${plural(Math.floor(j.kept), 'shift')} kept${j.missed >= 1 ? `, ${Math.floor(j.missed)} missed` : ''}${j.here ? '' : ' · away from the post'}`}
            </dd>
          </dl>
          <div className="post-leave">
            {asking === j.id ? (
              <>
                <span className="caption">{j.leaving}</span>
                <button
                  type="button"
                  className="danger"
                  onClick={() => {
                    setError(mapAct((s) => quitJob(s, j.id)));
                    setAsking(null);
                  }}
                >
                  Leave it
                </button>
                <button type="button" onClick={() => setAsking(null)}>
                  Keep it
                </button>
              </>
            ) : (
              <button type="button" onClick={() => setAsking(j.id)}>
                Leave the work
              </button>
            )}
          </div>
        </article>
      ))}
      {error && <p className="warn">{error}</p>}
    </section>
  );
}

/** Who gives a job, in words: the power, or the hall when none stands behind it. */
function giverOf(j: Job): string {
  const g = j.power && !isHire(j) ? theName(houseOf(j.power)) : j.hall;
  return g.charAt(0).toUpperCase() + g.slice(1);
}

/** The work a place offers at its doors (O4): each with its shift and pay, and take or why not. */
export function WorkHere({ game, map, place }: { game: GameState; map: RegionMap; place: string }) {
  const mapAct = useGame((s) => s.mapAct);
  const [error, setError] = useState<string | null>(null);
  const jobs = jobsAt(place, map);
  if (!jobs.length) return <p className="place-note">No work is given here.</p>;
  const realm = realmOf(game.player);
  return (
    <section className="place-work" aria-label="Work here">
      <ul className="place-work-list">
        {jobs.map((j) => {
          const held = game.player.jobs.some((h) => h.id === j.id);
          const can = canTakeJob(game, j.id);
          const pay = jobPay(j, realm);
          const currency =
            j.power && !isHire(j) ? organization(houseOf(j.power)).preset.currency.name : null;
          const payWords = [
            pay.points > 0 && currency ? `${pay.points} ${currency}` : null,
            pay.stones > 0 ? `${pay.stones} low` : null,
          ]
            .filter(Boolean)
            .join(' and ');
          return (
            <li key={j.id} className="place-work-row">
              <span className="place-work-name">
                {j.name} <span className="hanzi">{j.hanzi}</span>
              </span>
              <span className="caption">
                {giverOf(j)} · <span className="hanzi">{shiftWords(j.shift)}</span> · {payWords} a
                duty day · {j.perk}
                {j.danger && ' · dangerous: a raid each month the shifts are kept'}
              </span>
              {held ? (
                <span className="caption">yours</span>
              ) : (
                <button
                  type="button"
                  disabled={!can.ok || !!game.ended}
                  title={can.ok ? undefined : can.reason}
                  onClick={() => setError(mapAct((s) => takeJob(s, j.id)))}
                >
                  Take it
                </button>
              )}
              {!held && !can.ok && <span className="caption muted">{can.reason}</span>}
            </li>
          );
        })}
      </ul>
      {error && <p className="warn">{error}</p>}
    </section>
  );
}
