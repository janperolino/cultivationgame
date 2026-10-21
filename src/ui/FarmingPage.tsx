// The Spirit Farming page 灵植 (design § Spirit farming, Where crafts live; K8): every plot you hold
// on the left, each locked to its place and greyed where you aren't, with the plots to rent or buy
// where you stand; the plot you stand at in the middle as its nine beds (the tending scene while you
// sit); the picked bed and the plot's boosters on the right. You plant, harvest and tend only where
// you stand.
import { useEffect, useState, type ReactNode } from 'react';
import { CROPS, PLOT } from '../content/farming.ts';
import { item } from '../content/items.ts';
import { rarity, type RarityId } from '../content/rarity.ts';
import {
  bedHand,
  bedYears,
  bedYield,
  buyOf,
  castWood,
  digSoil,
  hardiness,
  harvest,
  harvestOdds,
  isRipe,
  keepPlot,
  knownCrops,
  packetsOf,
  pestMonths,
  plant,
  rentOf,
  ripenDays,
  takePlot,
  tendPlot,
  applyToPlot,
  woodSpellCheck,
  type FarmCheck,
} from '../core/farming.ts';
import { farmHere, plotPlaceName } from '../core/map/fields.ts';
import { withPlayer, type Bed, type Cultivator, type GameState, type Plot } from '../core/state.ts';
import { formatPercent } from './format.ts';
import { TendingScene } from './TendingScene.tsx';
import { leavePlot, sitAtPlot, useTending } from './tending.ts';
import { useGame } from './store.ts';

const years = (b: Bed) => {
  const y = bedYears(b);
  return y < 1
    ? `${Math.floor(b.grown)} days`
    : `${Math.floor(y)} year${Math.floor(y) === 1 ? '' : 's'}`;
};

function heldWords(p: Plot, day: number): string {
  if (p.held === 'bought') return 'bought';
  const left = Math.max(0, Math.ceil((p.until ?? day) - day));
  return `rented, ${left} day${left === 1 ? '' : 's'} left`;
}

function soilWords(p: Plot): string {
  return p.soil === 0 ? 'plain earth' : `spirit soil, tier ${p.soil}`;
}

/** The things you carry that do something at a plot, by what they do. */
function fieldThings(c: Cultivator, kind: 'milk' | 'season' | 'soil'): string[] {
  return Object.keys(c.items).filter((id) => {
    if ((c.items[id] ?? 0) <= 0) return false;
    const use = item(id).uses.field;
    if (!use) return false;
    if (kind === 'milk') return !!use.milk;
    if (kind === 'season') return !!use.season;
    return !!use.soil || use.dug !== undefined;
  });
}

export function FarmingPage({ game, families }: { game: GameState; families: ReactNode }) {
  const applyLife = useGame((s) => s.applyLife);
  const [chosen, setChosen] = useState<string | null>(null);
  const [bed, setBed] = useState<number | null>(null);
  const [why, setWhy] = useState<string | null>(null);
  const sitting = useTending((t) => t.plot);
  const handNow = useTending((t) => t.hand);
  const c = game.player;
  const day = game.calendar.day;
  const here = farmHere(game);
  const herePlots = here ? c.crafts.plots.filter((p) => p.place === here.place) : [];
  const plot = herePlots.find((p) => p.id === chosen) ?? herePlots[0] ?? null;
  const picked = plot && bed !== null ? (plot.beds[bed] ?? null) : null;

  // Standing up hands the sitting's hand to the plot; leaving the page stands you up.
  const standUp = () => {
    const done = leavePlot();
    if (done) applyLife((s) => withPlayer(s, tendPlot(s.player, done.plot, done.hand)));
  };
  useEffect(() => () => standUp(), []); // eslint-disable-line react-hooks/exhaustive-deps

  const run = (f: (c: Cultivator, day: number) => FarmCheck) => {
    let reason: string | null = null;
    applyLife((s) => {
      const r = f(s.player, s.calendar.day);
      reason = r.reason;
      return withPlayer(s, r.cultivator);
    });
    setWhy(reason);
  };

  return (
    <div className="crafts-columns">
      <section className="panel crafts-left">
        <h2 className="panel-heading">Your plots</h2>
        {c.crafts.plots.length === 0 ? (
          <p className="muted">None yet. A village or town rents plots at its Fields door 田.</p>
        ) : (
          <ul className="crafts-list">
            {c.crafts.plots.map((p) => {
              const isHere = here?.place === p.place;
              return (
                <li key={p.id} className={isHere ? undefined : 'farm-away'}>
                  <button
                    type="button"
                    className={`crafts-recipe${plot?.id === p.id ? ' is-selected' : ''}`}
                    disabled={!isHere}
                    onClick={() => {
                      setChosen(p.id);
                      setBed(null);
                    }}
                  >
                    <span>
                      {plotPlaceName(game, p.place)}
                      <span className="farm-sub">
                        {heldWords(p, day)} · {p.land} · {soilWords(p)} · qi density {p.density}
                      </span>
                    </span>
                    <span className="muted">{isHere ? 'here' : 'away'}</span>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
        <h2 className="panel-heading">Fields here 田</h2>
        {here ? (
          <>
            <p className="muted">
              {here.name}: {here.land}, qi density {here.density}. Nine beds, by the season or
              bought.
            </p>
            <div className="crafts-actions">
              <button
                type="button"
                className="button"
                onClick={() => run((p, d) => takePlot(p, here, 'rented', d))}
              >
                Rent a season · {rentOf(here.density)} low
              </button>
              <button
                type="button"
                className="button button-quiet"
                onClick={() => run((p, d) => takePlot(p, here, 'bought', d))}
              >
                Buy · {buyOf(here.density)} low
              </button>
            </div>
          </>
        ) : (
          <p className="muted">
            Plots are held at a village or town, and you work them only where you stand.
          </p>
        )}
        {why && <p className="warn">{why}</p>}
      </section>

      {sitting && plot && sitting === plot.id ? (
        <section className="panel crafts-furnace">
          <div className="crafts-furnace-top">
            <h2 className="panel-heading">
              At the plot <span className="hanzi">守田</span>
            </h2>
            <button type="button" className="button button-quiet" onClick={standUp}>
              Stand up
            </button>
          </div>
          <TendingScene key={plot.id} plot={plot} day={day} />
          <p className="crafts-furnace-line muted">
            Draw a closed ring round the knots of foul qi to sweep them into your sleeve; three or
            more in one ring is 妙. Keep the line off the sprouts, or you bruise them; a knot left
            too long sinks into the roots.
          </p>
          <p className="muted">
            This sitting: {formatPercent(handNow)}. Standing up gives it to every sown bed.
          </p>
        </section>
      ) : (
        <section className="panel crafts-bench">
          <div className="crafts-furnace-top">
            <h2 className="panel-heading">{plot ? 'The plot' : 'No plot here'}</h2>
            <button
              type="button"
              className="button"
              disabled={!plot || !plot.beds.some(Boolean)}
              title={plot ? undefined : 'Stand at a plot of yours to tend it.'}
              onClick={() => plot && sitAtPlot(plot.id)}
            >
              Sit and tend
            </button>
          </div>
          {plot ? (
            <>
              <div className="farm-beds">
                {plot.beds.map((b, i) => (
                  <button
                    key={i}
                    type="button"
                    className={`farm-bed${bed === i ? ' is-selected' : ''}${b ? '' : ' is-bare'}`}
                    onClick={() => setBed(i)}
                  >
                    {b ? (
                      <>
                        <span className={`rarity-${b.floor}`}>{item(b.crop).name}</span>
                        <span className="farm-sub">
                          {isRipe(b) ? `ripe · ${years(b)}` : years(b)}
                        </span>
                        <div className="crafts-bar" aria-hidden="true">
                          <div
                            style={{
                              width: `${Math.min(100, (b.grown / ripenDays(b.crop)) * 100)}%`,
                            }}
                          />
                        </div>
                        <span className="farm-sub">{hardiness(c, b).word}</span>
                      </>
                    ) : (
                      <span className="muted">bare</span>
                    )}
                  </button>
                ))}
              </div>
              <p className="muted">
                Tended today: you’re here. Pests come {Math.floor(pestMonths(c, plot))} months after
                you leave.
                {plot.rain !== undefined && day < plot.rain ? ' Spring-Rain runs.' : ''}
                {plot.ward !== undefined && day < plot.ward ? ' A pest ward stands.' : ''}
                {plot.wood !== undefined && day < plot.wood ? ' A Wood spell runs.' : ''}
              </p>
            </>
          ) : (
            <p className="muted">
              Stand at a village or town where you hold a plot to plant, harvest and tend it.
            </p>
          )}
        </section>
      )}

      <section className="panel crafts-right">
        {plot && bed !== null && (
          <BedPanel
            c={c}
            plot={plot}
            bed={bed}
            b={picked}
            onRun={run}
            onHarvest={() => run((p, d) => harvest(p, plot.id, bed, d))}
          />
        )}
        {plot && (
          <>
            <h2 className="panel-heading">The plot’s boosters</h2>
            <PlotPanel c={c} plot={plot} day={day} onRun={run} />
          </>
        )}
        <h2 className="panel-heading">Mastery by family</h2>
        {families}
      </section>
    </div>
  );
}

function BedPanel({
  c,
  plot,
  bed,
  b,
  onRun,
  onHarvest,
}: {
  c: Cultivator;
  plot: Plot;
  bed: number;
  b: Bed | null;
  onRun: (f: (c: Cultivator, day: number) => FarmCheck) => void;
  onHarvest: () => void;
}) {
  if (!b) {
    const crops = knownCrops(c);
    return (
      <>
        <h2 className="panel-heading">Sow this bed</h2>
        {crops.length === 0 && (
          <p className="muted">
            You know no crop yet: the Spirit Farming Dao teaches spirit rice, and almanacs 谱 the
            rest.
          </p>
        )}
        <ul className="crafts-list">
          {crops.map((crop) => {
            const packets = packetsOf(c, crop);
            return (
              <li key={crop} className="crafts-entry-top">
                <span>
                  {item(crop).name}
                  <span className="farm-sub">
                    {CROPS[crop]!.family === 'grain' ? 'grain' : 'herb'} ·{' '}
                    {packets.length
                      ? packets.map((p) => `${p.n} ${rarity(item(p.id).rarity).name}`).join(', ')
                      : `no packet: sold where ${item(crop).name} is`}
                  </span>
                </span>
                <span>
                  {packets.map((p) => (
                    <button
                      key={p.id}
                      type="button"
                      className={`button button-quiet rarity-${item(p.id).rarity}`}
                      onClick={() => onRun((x, d) => plant(x, plot.id, bed, p.id, d))}
                    >
                      Sow {rarity(item(p.id).rarity).name}
                    </button>
                  ))}
                </span>
              </li>
            );
          })}
        </ul>
      </>
    );
  }
  const odds = harvestOdds(c, b);
  const milk = fieldThings(c, 'milk');
  return (
    <>
      <h2 className="panel-heading">
        {item(b.crop).name} <span className="hanzi">{item(b.crop).hanzi}</span>
      </h2>
      <div className="farm-kv">
        <span>From a packet</span>
        <span className={`rarity-${b.floor}`}>{rarity(b.floor as RarityId).name}</span>
        <span>Age</span>
        <span>{years(b)}</span>
        <span>{isRipe(b) ? 'Ripe' : 'Ripens in'}</span>
        <span>
          {isRipe(b) ? 'yes' : `${Math.ceil(ripenDays(b.crop) - b.grown)} days of growth`}
        </span>
        <span>Untended</span>
        <span>{hardiness(c, b).word}</span>
        <span>Sittings since sowing</span>
        <span>
          {b.sat} · mean hand {bedHand(b).toFixed(2)}
        </span>
        <span>A harvest</span>
        <span>{bedYield(c, b.crop)} pieces, two packets back</span>
      </div>
      <ul className="crafts-list">
        {odds.map((o) => (
          <li key={o.rarity} className={`crafts-entry-top rarity-${o.rarity}`}>
            <span>{rarity(o.rarity).name}</span>
            <span>{formatPercent(o.chance)}</span>
          </li>
        ))}
      </ul>
      <p className="muted">
        Age lifts it a band at 10, 100 and 1,000 years, past its written best.
      </p>
      <div className="crafts-actions">
        <button type="button" className="button" disabled={!isRipe(b)} onClick={onHarvest}>
          Harvest
        </button>
        {milk.map((id) => (
          <button
            key={id}
            type="button"
            className={`button button-quiet rarity-${item(id).rarity}`}
            onClick={() => onRun((x, d) => applyToPlot(x, plot.id, id, d, bed))}
          >
            Pour {item(id).name} ({rarity(item(id).rarity).name})
          </button>
        ))}
      </div>
    </>
  );
}

function PlotPanel({
  c,
  plot,
  day,
  onRun,
}: {
  c: Cultivator;
  plot: Plot;
  day: number;
  onRun: (f: (c: Cultivator, day: number) => FarmCheck) => void;
}) {
  const things = [...fieldThings(c, 'season'), ...fieldThings(c, 'soil')];
  const wood = woodSpellCheck(c, plot, day);
  return (
    <>
      <div className="crafts-actions farm-wrap">
        {things.map((id) => (
          <button
            key={id}
            type="button"
            className="button button-quiet"
            onClick={() => onRun((x, d) => applyToPlot(x, plot.id, id, d))}
          >
            {item(id).uses.field?.dug !== undefined ? 'Lay' : 'Use'} {item(id).name}
          </button>
        ))}
        <button
          type="button"
          className="button button-quiet"
          disabled={!!wood}
          title={wood ?? undefined}
          onClick={() => onRun((x, d) => castWood(x, plot.id, d))}
        >
          Cast the Wood spell
        </button>
      </div>
      {things.length === 0 && (
        <p className="muted">
          Spirit soil, Spring-Rain and pest-warding talismans are sold in farming country; earth
          milk drips in deep karst caves.
        </p>
      )}
      <div className="crafts-actions farm-wrap">
        {plot.held === 'rented' && (
          <>
            <button
              type="button"
              className="button button-quiet"
              onClick={() => onRun((x) => keepPlot(x, plot.id, 'rented'))}
            >
              Another season · {rentOf(plot.density)} low
            </button>
            <button
              type="button"
              className="button button-quiet"
              onClick={() => onRun((x) => keepPlot(x, plot.id, 'bought'))}
            >
              Buy it · {buyOf(plot.density)} low
            </button>
          </>
        )}
        {plot.held === 'bought' && (
          <button
            type="button"
            className="button button-quiet"
            title="What is ripe is harvested; the rest is lost."
            onClick={() => onRun((x, d) => digSoil(x, plot.id, d))}
          >
            Dig the soil up (2×2)
          </button>
        )}
      </div>
      <p className="muted">
        {PLOT.beds} beds · {plot.land} · qi density {plot.density} · {soilWords(plot)}. A packet
        sows a bed; a crop grows ×1.15 a step of qi density above twice its tier.
      </p>
    </>
  );
}
