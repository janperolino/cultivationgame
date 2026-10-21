// The Dwelling screen 居 (K9, design § Dwellings are sites; take A of docs/mockups/dwelling-study.html):
// the dwelling where you stand, its place read on the left (qi density on the ladder, its vein,
// concealment, defenses, worth, reach and neighbors), its store and land in the middle, its arrays
// (K10: laid through placing, their eyes fed and taken up, and your prepared ground), the works you
// can build and how you hold it on the right. Anywhere else it is greyed: the dwellings you hold,
// and that a town's broker 牙行 lets them.
import { useState } from 'react';
import { DWELLINGS, WORKS } from '../content/dwellings.ts';
import { item } from '../content/items.ts';
import {
  arrayBand,
  arrayName,
  arraySteps,
  arrayUse,
  burnOf,
  eyeHolds,
  gatheringSteps,
  running,
  stepsOf,
} from '../core/arrays.ts';
import { feedArray, feedCost, groundWhere, takeUp } from '../core/formations.ts';
import { PlacingScene } from './PlacingScene.tsx';
import { QI_NAMES } from '../content/map/travel.ts';
import { capitalize } from '../content/words.ts';
import {
  abodeOf,
  arraySlots,
  bandName,
  densityOf,
  dwellingAt,
  dwellingName,
  dwellingPlaceName,
  fromStore,
  giveUp,
  givingUpLoses,
  layOutPlot,
  lapsed,
  makeAbode,
  payAhead,
  readSite,
  rentLeft,
  rentPrice,
  slotPlots,
  startWork,
  stepMult,
  storeUsed,
  toStore,
  worksAt,
} from '../core/dwellings.ts';
import { isRipe, bedYears } from '../core/farming.ts';
import { bagStacks } from '../core/gear.ts';
import { MARKETS } from '../core/markets.ts';
import { depthInfo, qiAt } from '../core/map/depth.ts';
import { placeById } from '../core/map/region.ts';
import { goToPlace, mapOf } from '../core/map/travel.ts';
import { veinAt } from '../content/map/index.ts';
import type { Dwelling, GameState, LaidArray } from '../core/state.ts';
import { go } from './nav.ts';
import { useGame } from './store.ts';

type Change = Parameters<ReturnType<typeof useGame.getState>['mapAct']>[0];

const LADDER = 9;

/** The nearest market, and how far: a wild site's reach. */
function reachWords(s: GameState, d: Dwelling): { head: string; sub: string } {
  const map = mapOf(s);
  const p = map ? placeById(map, d.place) : undefined;
  if (!p) return { head: '—', sub: '' };
  let best: { name: string; li: number } | null = null;
  for (const m of MARKETS) {
    if (m.region !== map!.id) continue;
    const li = Math.hypot(m.x - p.x, m.y - p.y);
    if (!best || li < best.li) best = { name: m.name, li };
  }
  if (!best) return { head: 'No market', sub: '' };
  if (best.li < 300) return { head: `${best.name}’s market`, sub: 'at the door' };
  return {
    head: 'No market',
    sub: `${best.name} is ${Math.round(best.li).toLocaleString()} li away.`,
  };
}

function Ladder({ land, density, arrays = 0 }: { land: number; density: number; arrays?: number }) {
  return (
    <div className="dw-ladder" aria-hidden="true">
      {Array.from({ length: LADDER }, (_, i) => (
        <span
          key={i}
          className={
            i < land ? 'is-land' : i < density - arrays ? 'is-up' : i < density ? 'is-array' : ''
          }
        />
      ))}
    </div>
  );
}

/** What a laid array is doing, in a line. */
function arrayLine(a: LaidArray): string {
  const u = arrayUse(a);
  const band = bandName(arrayBand(a));
  switch (u.does) {
    case 'gathering':
      return `+${arraySteps(a)} step${arraySteps(a) === 1 ? '' : 's'} of qi`;
    case 'growing':
      return `the fields here grow ${arraySteps(a)} step${arraySteps(a) === 1 ? '' : 's'} denser`;
    case 'concealing':
      return `${arraySteps(a)} band${arraySteps(a) === 1 ? '' : 's'} of concealment`;
    case 'warding':
      return u.beastsOnly
        ? `beasts of ${bandName(arrayBand(a) + (u.beasts ?? 0))} or under turn away`
        : `a barrier at ${band}: raiders at it or under turn away`;
    case 'alarm':
      return 'a raid’s card waits twice as long';
    case 'binding':
      return `holds foes of ${band} or under, one turn in ${u.every ?? 2}`;
    case 'killing':
      return 'strikes every foe inside, each turn';
    case 'maze':
      return `foes of ${band} or under lose a third of their aim`;
  }
}

function Eye({ a }: { a: LaidArray }) {
  const full = eyeHolds(item(a.item).tier);
  const burn = burnOf(a);
  const left = burn > 0 ? Math.floor(a.stones / burn) : Infinity;
  return (
    <>
      <div className="dw-eye" aria-hidden="true">
        <div style={{ width: `${Math.min(100, (a.stones / full) * 100)}%` }} />
      </div>
      <small>
        {running(a)
          ? `its eye: ${Math.round(a.stones * 10) / 10} of ${full} low · ${Math.round(burn * 100) / 100} a day · ${left === Infinity ? '—' : `${left} days`}`
          : 'dark: its eye is empty'}
      </small>
    </>
  );
}

function Prop({ k, children }: { k: string; children: React.ReactNode }) {
  return (
    <div className="dw-prop">
      <div className="dw-k">{k}</div>
      <div>{children}</div>
    </div>
  );
}

function heldWords(s: GameState, d: Dwelling): string {
  const left = rentLeft(d, s.calendar.day);
  switch (d.held) {
    case 'rented':
      return lapsed(d, s.calendar.day)
        ? 'the rent has run out: what is in the store is kept a month'
        : `rented by the ${d.period}, ${left} day${left === 1 ? '' : 's'} paid`;
    case 'bought':
      return 'bought';
    case 'claimed':
      return 'claimed';
    case 'seat':
      return 'your seat’s, while you belong';
  }
}

export function DwellingScreen() {
  const game = useGame((s) => s.game);
  const mapAct = useGame((s) => s.mapAct);
  const [why, setWhy] = useState<string | null>(null);
  if (!game) return null;
  const act = (f: Change) => setWhy(mapAct(f));
  const inside = game.map?.course ? null : (game.map?.inside ?? null);
  const d = inside ? dwellingAt(game.player, inside) : null;
  return (
    <div className="dwelling">
      {d ? <Here game={game} d={d} act={act} /> : <Elsewhere game={game} act={act} />}
      {why && <p className="dw-why">{why}</p>}
    </div>
  );
}

function Here({ game, d, act }: { game: GameState; d: Dwelling; act: (f: Change) => void }) {
  const map = mapOf(game)!;
  const p = placeById(map, d.place)!;
  const info = DWELLINGS[d.kind];
  const land = qiAt(map, [p.x, p.y]);
  const density = densityOf(game, d);
  const read = readSite(game, d);
  const reach = reachWords(game, d);
  const depth = depthInfo(map, [p.x, p.y]);
  const abode = abodeOf(game.player)?.id === d.id;
  const gone = lapsed(d, game.calendar.day);
  const plots = slotPlots(game.player, d);
  const arrays = arraySlots(game.player, d);
  const [laying, setLaying] = useState(false);
  // Giving up asks once, naming what goes with it (review 2026-10-21).
  const [asking, setAsking] = useState(false);
  const gathered = gatheringSteps(d).steps;
  const away = game.player.grounds.filter((g) => g.region === game.map?.region);
  const works = worksAt(d);
  const vein = d.kind === 'cave' || d.kind === 'mountain' ? d.steps : veinAt(d.place);
  const price = rentPrice(game, d);
  const stacks = bagStacks(game.player);
  const used = storeUsed(d.items);
  return (
    <>
      <header className="dw-head">
        <span className="dw-seal">{info.seal}</span>
        <div>
          <h2>
            {dwellingName(game, d)} <span className="hanzi">{info.hanzi}</span>
          </h2>
          <div className="dw-sub">
            {capitalize(info.name.toLowerCase())} in {dwellingPlaceName(game, d)} ·{' '}
            {heldWords(game, d)}
            {abode && <span className="dw-abode">家 your abode</span>}
          </div>
        </div>
      </header>
      <div className="dw-cols">
        <section className="panel">
          <h3 className="panel-heading">
            The place <span className="hanzi">地</span>
          </h3>
          <Prop k="Qi density">
            <b className="dw-qi">
              {density} · {QI_NAMES[density]}
            </b>{' '}
            <span className="muted">· seclusion ×{stepMult(stepsOf(d))}</span>
            <Ladder land={land} density={density} arrays={gathered} />
            <div className="dw-why-line">
              The land’s {land}
              {d.steps > 0 ? `, and ${d.steps} step${d.steps === 1 ? '' : 's'} up` : ''}
              {gathered > 0
                ? `, ${gathered} more for the gathering array${gathered === 1 ? '' : 's'}`
                : ''}
              . Crops grow to tier {Math.max(1, Math.floor(density / 2))} here.
            </div>
          </Prop>
          <Prop k="Vein">
            <b>{vein > 0 ? `Tier ${vein}` : 'None under it'}</b>
            <div className="dw-why-line">
              {d.kind === 'cave' || d.kind === 'mountain'
                ? 'A local vein your geomancy read.'
                : vein > 0
                  ? `${p.name}’s.`
                  : 'The land’s own qi, nothing more.'}
            </div>
          </Prop>
          {read && !read.watched ? (
            <>
              <Prop k="Concealment">
                <b>{bandName(read.concealment)}</b>
                <div className="dw-why-line">A soul below this walks past.</div>
                <div className={`dw-why-line ${read.thievesFind ? 'is-bad' : 'is-good'}`}>
                  The land’s thieves ({bandName(read.land)}){' '}
                  {read.thievesFind ? 'find it.' : 'don’t find it.'}{' '}
                  {d.steps > 0
                    ? `Its beasts smell the raised qi, ${bandName(read.againstBeasts)} to them, and ${read.beastsFind ? 'find it' : 'don’t'}.`
                    : ''}
                </div>
              </Prop>
              <Prop k="Defenses">
                {read.guard >= 0 || read.guardBeasts >= 0 ? (
                  <>
                    <b className="is-good">
                      A ward at {bandName(Math.max(read.guard, read.guardBeasts))}
                    </b>
                    <div className="dw-why-line">
                      {read.guard >= 0
                        ? `Raiders at ${bandName(read.guard)} or under turn away; stronger ones come and break it in the fight, where it stands over you.`
                        : `Beasts at ${bandName(read.guardBeasts)} or under turn away; men walk through it.`}
                      {read.guard >= read.land ? ' The land’s own thieves turn from it.' : ''}
                    </div>
                  </>
                ) : (
                  <>
                    <b>{d.kind === 'cave' || d.kind === 'mountain' ? 'The rock' : 'Its walls'}</b> ·
                    no arrays
                    <div className="dw-why-line">
                      Guards nothing worth taking. A warding array turns raiders at its band or
                      under.
                    </div>
                  </>
                )}
              </Prop>
              <Prop k="Worth">
                <b className={read.thievesCome ? 'is-bad' : ''}>{read.worth} low</b>{' '}
                <span className="muted">
                  · the store {read.storeWorth}, ripe beds {read.bedsWorth}
                </span>
                <div className="dw-why-line">
                  {read.worth > read.wage
                    ? `More than a raider’s month here (${read.wage} low)${read.thievesFind ? ': thieves will come for it.' : ', but they would have to find it.'}`
                    : `Less than a raider’s month here (${read.wage} low): not worth their walk.`}
                </div>
              </Prop>
            </>
          ) : (
            <Prop k="Defenses">
              <b>{d.held === 'seat' ? 'Your power’s' : `${p.name}’s watch`}</b>
              <div className="dw-why-line">
                {d.held === 'seat'
                  ? 'Nobody robs a disciple inside the gate.'
                  : 'No thief comes while your name there is clean (heat under 3).'}
              </div>
            </Prop>
          )}
          <Prop k="Reach">
            <b>{reach.head}</b>
            <div className="dw-why-line">{reach.sub}</div>
          </Prop>
          <Prop k="Neighbors">
            <b>
              {read && !read.watched ? `Beasts of ${bandName(read.land)}` : `${p.name}’s people`}
            </b>
            <div className="dw-why-line">{capitalize(depth.name)}.</div>
          </Prop>
        </section>
        <div className="dw-mid">
          <section className="panel">
            <h3 className="panel-heading">
              The store <span className="hanzi">库</span>
              <span className="dw-right">
                {d.store > 0 ? `${used} of ${d.store} squares · opened only here` : 'none'}
              </span>
            </h3>
            {d.store > 0 ? (
              <>
                <div className="dw-grid">
                  {Object.entries(d.items)
                    .filter(([, n]) => n > 0)
                    .map(([id, n]) => (
                      <button
                        key={id}
                        type="button"
                        className="dw-cell is-item"
                        title={`Take ${item(id).name} into the Bag`}
                        onClick={() => act((s) => fromStore(s, d.id, id))}
                      >
                        <span>{item(id).name}</span>
                        <i>{n}</i>
                      </button>
                    ))}
                  {Array.from({ length: Math.max(0, d.store - used) }, (_, i) => (
                    <span key={i} className="dw-cell" />
                  ))}
                </div>
                {!gone && (
                  <>
                    <div className="map-label">From your Bag</div>
                    <div className="dw-bag">
                      {stacks.length === 0 && <span className="muted">Your Bag is empty.</span>}
                      {stacks.map((st, i) => {
                        const at = stacks.slice(0, i).filter((x) => x.id === st.id).length;
                        return (
                          <button
                            key={`${st.id}:${i}`}
                            type="button"
                            className="dw-chip"
                            title="Set it in the store"
                            onClick={() => act((s) => toStore(s, d.id, st.id, at))}
                          >
                            {item(st.id).name} <i>{st.n}</i>
                          </button>
                        );
                      })}
                    </div>
                  </>
                )}
              </>
            ) : (
              <p className="muted">It keeps no store. A rented room or a courtyard has one.</p>
            )}
          </section>
          <section className="panel">
            <h3 className="panel-heading">
              Land <span className="hanzi">田</span>
              <span className="dw-right">
                {plots.length} of {d.slots} slot{d.slots === 1 ? '' : 's'}
              </span>
            </h3>
            {d.slots === 0 && <p className="muted">No land.</p>}
            {plots.map((pl, i) => {
              const sown = pl.beds.filter(Boolean);
              const ripe = sown.filter((b) => b && isRipe(b)).length;
              const oldest = Math.max(0, ...sown.map((b) => (b ? bedYears(b) : 0)));
              return (
                <div key={pl.id} className="dw-slot">
                  <span className="dw-sq">田</span>
                  <div>
                    Plot {i + 1}:{' '}
                    {sown.length ? `${sown.length} of 9 beds sown` : 'nine beds, unsown'}
                    <small>
                      {ripe ? `${ripe} ripe · ` : ''}
                      {oldest >= 1 ? `the oldest ${Math.floor(oldest)} years` : 'young'}
                    </small>
                  </div>
                </div>
              );
            })}
            {!gone &&
              Array.from({ length: Math.max(0, d.slots - plots.length) }, (_, i) => (
                <div key={`empty${i}`} className="dw-slot">
                  <span className="dw-sq is-empty">+</span>
                  <div>
                    An empty slot<small>nine beds of plain earth</small>
                  </div>
                  <button
                    type="button"
                    className="place-btn"
                    onClick={() => act((s) => layOutPlot(s, d.id))}
                  >
                    Lay out
                  </button>
                </div>
              ))}
            {plots.length > 0 && (
              <p className="dw-why-line">
                The beds are worked on the Crafts screen’s Spirit Farming page.{' '}
                <button type="button" className="link-button" onClick={() => go('crafts')}>
                  Open it
                </button>
              </p>
            )}
          </section>
        </div>
        <div className="dw-right-col">
          <section className="panel">
            <h3 className="panel-heading">
              Arrays <span className="hanzi">阵</span>
              <span className="dw-right">
                {d.arrays.length} of {arrays}
              </span>
            </h3>
            {arrays === 0 ? (
              <p className="muted">
                {d.held === 'claimed'
                  ? 'No vein under it to hold an array.'
                  : 'Arrays of yours are laid only on land you hold in the wild.'}
              </p>
            ) : (
              <>
                {d.arrays.map((a) => (
                  <div key={a.id} className={`dw-slot${running(a) ? '' : ' is-dim'}`}>
                    <span className="dw-sq">{item(a.item).hanzi.slice(0, 1)}</span>
                    <div>
                      {arrayName(a)} <span className={`rarity-${a.rarity}`}>{a.rarity}</span>
                      <small>{arrayLine(a)}</small>
                      <Eye a={a} />
                    </div>
                    <div className="dw-btns">
                      <button
                        type="button"
                        className="place-btn"
                        disabled={feedCost(a) <= 0}
                        title={`Top its eye up: ${feedCost(a)} low`}
                        onClick={() => act((s) => feedArray(s, { dwelling: d.id }, a.id))}
                      >
                        Feed
                      </button>
                      <button
                        type="button"
                        className="place-btn is-quiet"
                        title={`Its ${arrayUse(a).form} back in the Bag, ${a.from}; the stones in its eye are lost.`}
                        onClick={() => act((s) => takeUp(s, { dwelling: d.id }, a.id))}
                      >
                        Take up
                      </button>
                    </div>
                  </div>
                ))}
                {Array.from({ length: Math.max(0, arrays - d.arrays.length) }, (_, i) => (
                  <div key={`empty-${i}`} className="dw-slot is-dim">
                    <span className="dw-sq is-empty">阵</span>
                    <div>
                      An empty array slot
                      <small>Lay flags or a disc from your Bag, through placing.</small>
                    </div>
                    <button type="button" className="place-btn" onClick={() => setLaying(true)}>
                      Lay
                    </button>
                  </div>
                ))}
                <p className="dw-why-line">
                  An array runs while its eye holds stones, here or away. The vein holds {d.steps}{' '}
                  step{d.steps === 1 ? '' : 's'} of gathering more; past it only a gold array
                  reaches, at double upkeep.
                </p>
              </>
            )}
            {away.length > 0 && (
              <>
                <h3 className="panel-heading dw-sub-head">
                  Prepared ground <span className="hanzi">伏</span>
                </h3>
                {away.map((g) => (
                  <div key={g.id} className={`dw-slot${running(g) ? '' : ' is-dim'}`}>
                    <span className="dw-sq">{item(g.item).hanzi.slice(0, 1)}</span>
                    <div>
                      {arrayName(g)} <span className={`rarity-${g.rarity}`}>{g.rarity}</span>
                      <small>
                        in {groundWhere(game, g)} · {arrayLine(g)}
                      </small>
                      {g.held && <small className="is-bad">Something is held in it.</small>}
                      <Eye a={g} />
                    </div>
                    <button type="button" className="place-btn is-quiet" onClick={() => go('map')}>
                      On the map
                    </button>
                  </div>
                ))}
              </>
            )}
          </section>
          {laying && (
            <PlacingScene game={game} at={{ dwelling: d.id }} onClose={() => setLaying(false)} />
          )}
          {works.length > 0 && (
            <section className="panel">
              <h3 className="panel-heading">
                Build <span className="hanzi">建</span>
                <span className="dw-right">a base you make grows</span>
              </h3>
              {d.work && (
                <p className="dw-why-line">
                  Under way: {works.find((w) => w.id === d.work!.id)?.name.toLowerCase()},{' '}
                  {Math.ceil(d.work.left)} day{Math.ceil(d.work.left) === 1 ? '' : 's'} of work
                  left.
                </p>
              )}
              {works.map((w) => (
                <div key={w.id} className="dw-slot">
                  <span className="dw-sq is-empty">
                    {w.id === 'clear' ? '田' : w.id === 'store' ? '库' : '室'}
                  </span>
                  <div>
                    {w.name}
                    <small>
                      {w.line}
                      {w.days ? ` · ${w.days} days here` : ''}
                      {w.low ? `, ${w.low} low` : ''}
                    </small>
                  </div>
                  <button
                    type="button"
                    className="place-btn"
                    disabled={!!w.why}
                    title={w.why ?? undefined}
                    onClick={() => act((s) => startWork(s, d.id, w.id))}
                  >
                    Start
                  </button>
                </div>
              ))}
              <p className="dw-why-line">
                Work runs on the days you spend here. A quiet chamber mends injuries ×
                {WORKS.chamber.mend} while you stay.
              </p>
            </section>
          )}
          <section className="panel">
            <h3 className="panel-heading">
              Yours <span className="hanzi">契</span>
            </h3>
            <p>
              {d.held === 'claimed'
                ? d.power
                  ? 'Claimed inside another’s land: a deed against them while you hold it.'
                  : 'Claimed on wild land. No rent, and no deed against anyone.'
                : capitalize(heldWords(game, d)) + '.'}
            </p>
            {price !== null && !gone && (
              <p className="muted">
                {price} low a {d.period}, taken as its time turns while your purse covers it.
              </p>
            )}
            <div className="dw-actions">
              {price !== null && !gone && (
                <button
                  type="button"
                  className="place-btn"
                  onClick={() => act((s) => payAhead(s, d.id))}
                >
                  Pay a {d.period} ahead
                </button>
              )}
              {!gone && (
                <button
                  type="button"
                  className="place-btn"
                  disabled={abode}
                  onClick={() => act((s) => makeAbode(s, d.id))}
                >
                  Make it your abode
                </button>
              )}
              {d.held !== 'seat' && !asking && (
                <button
                  type="button"
                  className="place-btn is-quiet"
                  onClick={() => setAsking(true)}
                >
                  Give it up
                </button>
              )}
            </div>
            {asking && (
              <div className="dw-actions">
                <p className="muted">
                  Give it up for good?{' '}
                  {capitalize(givingUpLoses(game, d.id) ?? 'nothing of yours stays in it')}.
                </p>
                <button
                  type="button"
                  className="place-btn"
                  onClick={() => {
                    setAsking(false);
                    act((s) => giveUp(s, d.id));
                  }}
                >
                  Give it up
                </button>
                <button
                  type="button"
                  className="place-btn is-quiet"
                  onClick={() => setAsking(false)}
                >
                  Keep it
                </button>
              </div>
            )}
          </section>
          <Others game={game} except={d.id} act={act} />
        </div>
      </div>
    </>
  );
}

function Others({
  game,
  except,
  act,
}: {
  game: GameState;
  except: string | null;
  act: (f: Change) => void;
}) {
  const rest = game.player.dwellings.filter((x) => x.id !== except);
  if (!rest.length) return null;
  const abode = abodeOf(game.player)?.id;
  return (
    <section className="panel">
      <h3 className="panel-heading">
        Your dwellings <span className="hanzi">居</span>
      </h3>
      {rest.map((x) => {
        const left = rentLeft(x, game.calendar.day);
        return (
          <div key={x.id} className="dw-slot">
            <span className="dw-sq">{DWELLINGS[x.kind].seal}</span>
            <div>
              {dwellingName(game, x)}
              {abode === x.id && <span className="dw-abode">家 abode</span>}
              <small>
                {dwellingPlaceName(game, x)}
                {left !== null ? ` · ${left} days of rent left` : ''}
                {x.raid ? ' · a raid waits there' : ''}
              </small>
            </div>
            <button
              type="button"
              className="place-btn"
              onClick={() => {
                act((s) => goToPlace(s, x.place, true));
                go('map');
              }}
            >
              Set course
            </button>
          </div>
        );
      })}
    </section>
  );
}

function Elsewhere({ game, act }: { game: GameState; act: (f: Change) => void }) {
  const map = mapOf(game);
  const at = game.map?.at;
  const here = map && game.map?.inside ? placeById(map, game.map.inside) : undefined;
  const abode = abodeOf(game.player);
  const broker = here && (here.kind === 'town' || (here.kind === 'atlas' && here.sub === 'city'));
  return (
    <>
      <h2 className="dw-title">Not where you stand</h2>
      <div className="dw-sub">
        {here ? `In ${here.name}` : game.map?.course ? 'On the road' : 'Out on the land'}
        {at && map ? ` · qi density ${qiAt(map, at)}` : ''}
      </div>
      <div className="dw-cols is-two">
        {abode && (
          <section className="panel is-greyed">
            <h3 className="panel-heading">
              {dwellingName(game, abode)}{' '}
              <span className="hanzi">{DWELLINGS[abode.kind].seal}</span>
              <span className="dw-right">your abode</span>
            </h3>
            <p>
              Qi density {densityOf(game, abode)} · seclusion ×{stepMult(abode.steps)} · the store{' '}
              {storeUsed(abode.items)} of {abode.store} · land{' '}
              {slotPlots(game.player, abode).length} of {abode.slots}
            </p>
            <p className="muted">Its screen opens when you stand there.</p>
          </section>
        )}
        <div>
          <Others game={game} except={null} act={act} />
          <section className="panel">
            <p>
              {broker
                ? `${here!.name}’s broker 牙行 lets rooms and chambers: find the door in the town.`
                : 'A town or a city has a broker 牙行, who lets rooms and chambers.'}
            </p>
            <p className="muted">
              On wild land a spot can become a thatched hut, and a vein your geomancy reads a cave
              abode. Right-click the map where you stand.
            </p>
          </section>
        </div>
      </div>
    </>
  );
}
