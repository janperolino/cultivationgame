// A shop's Commission tab 托 (K12, `docs/mockups/commission-study.html` take A): the month's
// notice with the market's line of why, a person asking for you by name from craft renown 3, the
// commissions you took here to hand in, and at an alchemy shop or a refiner, Made to order 订做.
import { useState } from 'react';
import { commissionAsk, days } from './commissionWords.ts';
import { COMMISSION } from '../content/commissions.ts';
import { DAYS_PER_MONTH } from '../content/calendar.ts';
import { item } from '../content/items.ts';
import {
  cantTake,
  carried,
  collectOrder,
  commissionsOf,
  handIn,
  makesToOrder,
  offeredAt,
  orderable,
  ordersAt,
  placeOrder,
  quote,
  takeCommission,
  type CommissionResult,
} from '../core/commissions.ts';
import { priceWords } from '../core/purse.ts';
import type { GameState } from '../core/state.ts';
import { formatPercent } from './format.ts';

type Act = (change: (s: GameState) => CommissionResult) => string | null;

export function CommissionCounter({
  game,
  shopId,
  act,
  say,
}: {
  game: GameState;
  shopId: string;
  act: Act;
  say: (t: string) => void;
}) {
  const offers = offeredAt(game, shopId);
  const month = Math.floor(game.calendar.day / DAYS_PER_MONTH);
  const mine = commissionsOf(game.player)
    .map((k, at) => ({ k, at }))
    .filter((x) => x.k.shop === shopId && !x.k.done && x.k.month === month);
  const handed = commissionsOf(game.player).some(
    (k) => k.shop === shopId && k.done && k.month === month,
  );
  const crafts = makesToOrder(shopId);
  return (
    <div className="place-rows commission">
      {offers.length === 0 && mine.length === 0 && (
        <p className="muted">
          {handed
            ? 'This month’s commission is handed in: the next notice goes up as the month turns.'
            : 'No commission is posted here this month: nothing it makes runs short.'}
        </p>
      )}
      {offers.map((o) => {
        const why = cantTake(game.player, o);
        return (
          <div key={o.kind} className={`commission-notice${o.grade ? ' graded' : ''}`}>
            <span className="commission-stamp">
              {o.kind === 'named' ? '名' : o.grade ? '品' : '托'}
            </span>
            <span>
              <span className="commission-ask">
                {o.kind === 'named' ? 'By name: ' : ''}
                {commissionAsk(o)}
              </span>
              {o.why && <span className="place-sub commission-why">{o.why}</span>}
              {o.asker && (
                <span className="place-sub">
                  {o.asker} asks the keeper for you, the maker whose mark sells here.
                </span>
              )}
              <span className="place-sub">
                By the month’s end · anything of it at {o.floor} or better fills it
                {o.grade ? ` · graded: a certified grade ${o.grade} only` : ''}
              </span>
              <button
                type="button"
                className="place-btn"
                disabled={!!why}
                title={why ?? undefined}
                onClick={() =>
                  act((s) => {
                    const r = takeCommission(s, shopId, o.kind as 'posted' | 'named');
                    if (r.ok) say('Taken: it is on your list on the Crafts screen.');
                    return r;
                  })
                }
              >
                Take it
              </button>
              {why && <span className="place-sub"> {why}</span>}
            </span>
            <span className="place-price">
              {priceWords(o.each * o.n)}
              <span className="place-sub">
                {priceWords(o.each)} each · ×{o.grade ? COMMISSION.graded : COMMISSION.pay} the
                market
              </span>
            </span>
          </div>
        );
      })}
      {mine.length > 0 && <h3 className="commission-head">Taken: hand in</h3>}
      {mine.map(({ k, at }) => {
        const have = carried(game.player, k);
        return (
          <div key={at} className="place-row">
            <i className="place-dot" style={{ background: `var(--rarity-${k.floor})` }} />
            <span>
              <span className="place-row-name">{commissionAsk(k)}</span>{' '}
              <span className="place-sub">· you carry {have}</span>
            </span>
            <span className="place-price">{priceWords(k.each * k.n)}</span>
            <button
              type="button"
              className="place-btn"
              disabled={have < k.n}
              onClick={() =>
                act((s) => {
                  const r = handIn(s, at);
                  if (r.ok) say(`Handed in, ${priceWords(k.each * k.n)}.`);
                  return r;
                })
              }
            >
              Hand in
            </button>
          </div>
        );
      })}
      {crafts && <MadeToOrder game={game} shopId={shopId} act={act} say={say} />}
    </div>
  );
}

function MadeToOrder({
  game,
  shopId,
  act,
  say,
}: {
  game: GameState;
  shopId: string;
  act: Act;
  say: (t: string) => void;
}) {
  const recipes = orderable(shopId);
  const [pick, setPick] = useState(recipes[0]?.output ?? '');
  const [yours, setYours] = useState(false);
  const q = pick ? quote(game, shopId, pick, yours) : null;
  const waiting = ordersAt(game.player, shopId);
  return (
    <>
      <h3 className="commission-head">
        Made to order <span className="hanzi">订做</span>
      </h3>
      {recipes.length === 0 ? (
        <p className="muted">They make nothing to order.</p>
      ) : (
        <div className="commission-order">
          <span className="place-sub">The recipe</span>
          <select value={pick} onChange={(e) => setPick(e.target.value)}>
            {recipes.map((r) => (
              <option key={r.output} value={r.output}>
                {item(r.output).name} · tier {item(r.output).tier}
              </option>
            ))}
          </select>
          <span className="place-sub">The inputs</span>
          <span className="commission-seg">
            <button type="button" aria-pressed={!yours} onClick={() => setYours(false)}>
              Theirs
            </button>
            <button type="button" aria-pressed={yours} onClick={() => setYours(true)}>
              Yours
            </button>
          </span>
          {q && (
            <>
              <span className="place-sub">It comes out</span>
              <span>
                {q.n > 1 ? `${q.n} ` : ''}
                {q.odds.map((o) => `${o.rarity} ${formatPercent(o.chance)}`).join(' / ')}
                <span className="place-sub"> · the batch always holds</span>
              </span>
              <span className="place-sub">Ready</span>
              <span>in {days(q.days)}, at this counter</span>
              <span className="place-sub">The price</span>
              <span>
                {priceWords(q.price)}
                {yours && q.inputs > 0 && (
                  <span className="place-sub"> · your inputs’ {priceWords(q.inputs)} off</span>
                )}
              </span>
              <span />
              <span>
                <button
                  type="button"
                  className="place-btn"
                  disabled={!!q.cant}
                  onClick={() =>
                    act((s) => {
                      const r = placeOrder(s, shopId, pick, yours);
                      if (r.ok) say(`Ordered: ready in ${days(q.days)}.`);
                      return r;
                    })
                  }
                >
                  Order it
                </button>
                {q.cant && <span className="place-sub"> {q.cant}</span>}
              </span>
            </>
          )}
        </div>
      )}
      {waiting.map(({ order, at }) => {
        const ready = game.calendar.day >= order.ready;
        const it = item(order.made);
        return (
          <div key={at} className="place-row">
            <i className="place-dot" style={{ background: `var(--rarity-${it.rarity})` }} />
            <span>
              <span className="place-row-name">
                {it.name}
                {order.n > 1 ? ` ×${order.n}` : ''}
              </span>{' '}
              <span className="place-sub">
                · {it.rarity} ·{' '}
                {ready ? 'ready' : `ready in ${days(order.ready - game.calendar.day)}`}
              </span>
            </span>
            <span className="place-price">paid {priceWords(order.paid)}</span>
            <button
              type="button"
              className="place-btn"
              disabled={!ready}
              onClick={() =>
                act((s) => {
                  const r = collectOrder(s, at);
                  if (r.ok) say(`Collected: ${it.name}.`);
                  return r;
                })
              }
            >
              Collect
            </button>
          </div>
        );
      })}
    </>
  );
}
