// A place's counters (P3.6b's, kept whole by A6): what each door does once it is open, its shops
// on P3.5's calls, the halls, the teahouse, the map seller, guides, caravans, the changer and the rest.
// A6.1 dresses them in rooms; within a job the controls stay the same.
import { QuestOffers } from './QuestOffers.tsx';
import { CommissionCounter } from './CommissionCounter.tsx';
import { hasCommissionTab } from './commissionWords.ts';
import { useEffect, useState } from 'react';
import { meetCodex } from '../core/codex.ts';
import { endGuide, lookAt } from './guide.ts';
import { hasCopy } from '../content/copies.ts';
import { item, stackSize } from '../content/items.ts';
import { PLACE_KIND_INFO } from '../content/map/places.ts';
import { capitalize, possessive } from '../content/words.ts';
import { realm, stageName } from '../content/realms.ts';
import {
  doorsAt,
  keeperName,
  SHOP_KIND_INFO,
  shop as shopById,
  type Door as MarketDoor,
} from '../content/shops.ts';
import { encounterTemplate } from '../content/encounters/index.ts';
import { claimPosting, dropPosting, postingsAt, takePosting } from '../core/map/board.ts';
import { WorkHere } from './PostsPanel.tsx';
import { band } from '../core/map/depth.ts';
import { known } from '../core/map/fog.ts';
import { placeKindOf } from '../core/map/gate.ts';
import {
  buyMap,
  caravansAt,
  changeMoney,
  guideKnows,
  guidesAt,
  hearRumor,
  hireGuide,
  joinCaravan,
  mapKnown,
  mapsAt,
  rumorToday,
  rumorWords,
  wayWords,
  type Change,
} from '../core/map/place.ts';
import { placeById, type MapPlace, type RegionMap } from '../core/map/region.ts';
import { lotSize, market, marketOfShop, seenIn, shopPurse, supplyOf } from '../core/markets.ts';
import { priceOf as priceOfThing } from '../core/prices.ts';
import { gradeCount, pay, priceWords, stonesOf } from '../core/purse.ts';
import { buyChapter, hallTerms, pavilion, titheFor } from '../core/halls.ts';
import { liftByPaying, yourMark } from '../core/guarded.ts';
import {
  askRelease,
  askToJoin,
  eldersHall,
  entryOf,
  giftFloor,
  giftThisMonth,
  offerGift,
  releaseView,
  seatPowerAt,
} from '../core/joining.ts';
import {
  becomeGuest,
  donate,
  donationPoints,
  engageProtector,
  guestOffered,
  innerTrial,
  membershipsOf,
  takeLesson,
  houseOf,
  isOrganization,
  membership,
  organization,
  seatTitle,
  theName,
} from '../core/organizations.ts';
import {
  buy,
  haggle,
  isStaple,
  markOn,
  offerFor,
  priceToYou,
  repair,
  repairCost,
  sell,
  shelf,
  shopMonth,
  type StockLot,
} from '../core/shops.ts';
import { withPlayer, type GameState } from '../core/state.ts';
import { buyOf, rentOf, takePlot } from '../core/farming.ts';
import { plotSpot } from '../core/map/fields.ts';
import { go } from './nav.ts';
import { useGame } from './store.ts';
import { copyManual } from '../content/copies.ts';
import { CRAFTS, recipe, type CraftId } from '../content/crafts.ts';
import { planInputs } from '../core/crafts.ts';
import { CRAFT_DEALS, CRAFT_GRADES, CRAFT_RENOWN, CRAFTER } from '../content/styles.ts';
import { knownCrafts } from '../core/craftRenown.ts';
import { buyAtGuild, certify, examinesTo, examRows, guildCounter } from '../core/craftGrade.ts';
import { seatGrade } from '../core/organizations.ts';
import { formatPercent } from './format.ts';
import { dwellingAt, dwellingNoun, offersAt, stepMult, takeFromBroker } from '../core/dwellings.ts';
import { sitDown, standUp, useFurnace } from './furnace.ts';
import { ForgeScene } from './ForgeScene.tsx';
import { FurnaceScene } from './FurnaceScene.tsx';
import { TalismanScene } from './TalismanScene.tsx';
import { groundPartners, sparWhy } from '../core/spar.ts';
import { askSpar } from '../core/playFight.ts';
import { cue } from './cues.ts';
import { itemTipProps } from './itemTip.ts';
import { departmentsOf, inDepartment, ware, type DepartmentId } from './rooms.ts';

export type Act = (
  change: Parameters<ReturnType<typeof useGame.getState>['mapAct']>[0],
) => string | null;

const STATE_WORDS: Record<string, string> = {
  unknown: 'you know none of it',
  rumored: 'you’ve heard of it',
  sketched: 'you have it Sketched',
  seen: 'you’ve seen it',
};

export function Counter({
  game,
  map,
  place,
  door,
  act,
  say,
}: {
  game: GameState;
  map: RegionMap;
  place: MapPlace;
  door: string;
  act: Act;
  say: (t: string) => void;
}) {
  const md = doorsAt(place.id).find((d) => d.id === door);
  if (md) return <DoorCounter key={door} game={game} door={md} act={act} say={say} />;
  switch (door) {
    case 'elders':
    case 'join':
    case 'gift': {
      const power = seatPowerAt(map, place)!;
      if (door === 'join') return <JoinCounter game={game} power={power} act={act} say={say} />;
      if (door === 'gift') return <GiftCounter game={game} power={power} act={act} say={say} />;
      return <EldersCounter game={game} power={power} act={act} say={say} />;
    }
    case 'ground':
      return <GroundCounter game={game} power={seatPowerAt(map, place)!} act={act} />;
    case 'exam':
      return <ExamCounter game={game} power={seatPowerAt(map, place)!} act={act} say={say} />;
    case 'counter':
      return <GuildCounter game={game} power={seatPowerAt(map, place)!} act={act} say={say} />;
    case 'pavilion':
      return <PavilionCounter game={game} power={place.id} act={act} say={say} />;
    case 'law-hall':
      return <LawHallCounter game={game} power={place.id} act={act} say={say} />;
    case 'changer':
      return <ChangerCounter game={game} place={place} act={act} />;
    case 'fields':
      return <FieldsCounter game={game} place={place} act={act} />;
    case 'broker':
      return <BrokerCounter game={game} place={place} act={act} />;
    case 'talk':
      return <TalkCounter game={game} map={map} place={place} act={act} />;
    case 'maps':
      return <MapsCounter game={game} place={place} act={act} say={say} />;
    case 'guides':
      return <GuidesCounter game={game} map={map} place={place} act={act} say={say} />;
    case 'caravans':
      return <CaravansCounter game={game} map={map} place={place} act={act} say={say} />;
    case 'board':
      return <BoardCounter game={game} map={map} place={place} act={act} say={say} />;
    case 'work':
      return <WorkHere game={game} map={map} place={place.id} />;
    case 'bed': {
      const bed = PLACE_KIND_INFO[placeKindOf(place)!].bed;
      return (
        <>
          <p className="place-sub">
            When your wheel sleeps while you stand here, you sleep here, {bed} taels a night from
            your silver, by rule; with no silver, you sleep rough. At home it costs nothing.
          </p>
          <p className="place-note">
            <b>Staying.</b> Go back to the map and the home wheel turns here as it would at home,
            until you set a course.
          </p>
        </>
      );
    }
    default:
      return null;
  }
}

// ---------------------------------------------------------------- a district and its shops

/** A district's door (E5): its notable shops and the small shops along the top, one counter below. */
function DoorCounter({
  game,
  door,
  act,
  say,
}: {
  game: GameState;
  door: MarketDoor;
  act: Act;
  say: (t: string) => void;
}) {
  const [picked, setAt] = useState(door.shops[0]!);
  // A new month can change a door's shops: a tab no longer among them falls back to the first.
  const at = door.shops.includes(picked) ? picked : door.shops[0]!;
  return (
    <>
      {door.shops.length > 1 && (
        <div className="place-tabs" role="tablist" aria-label="Shops">
          {door.shops.map((id) => {
            const sh = shopById(id);
            return (
              <button
                key={id}
                type="button"
                role="tab"
                aria-selected={at === id}
                onClick={() => setAt(id)}
              >
                {sh.small ? 'The small shops' : capitalize(sh.name)}
              </button>
            );
          })}
        </div>
      )}
      <ShopCounter key={at} game={game} shopId={at} act={act} say={say} />
    </>
  );
}

// ---------------------------------------------------------------- a shop

export function ShopCounter({
  game,
  shopId,
  act,
  say,
  departments = false,
  start,
}: {
  game: GameState;
  shopId: string;
  act: Act;
  say: (t: string) => void;
  /** A trading hall's floor (A6.1): the shelf by department, only those holding lots this month. */
  departments?: boolean;
  /** The tab it opens on, when the room asks (a refiner's Mend). */
  start?: string;
}) {
  const sh = shopById(shopId);
  const kinfo = SHOP_KIND_INFO[sh.kind];
  const tabs: [string, string][] = kinfo.posted
    ? [['sell', 'Sell']]
    : [
        ['buy', 'Buy'],
        ['sell', 'Sell'],
      ];
  if (kinfo.repairs) tabs.push(['mend', 'Mend']);
  // A craft's shop posts commissions and makes to order (K12).
  if (hasCommissionTab(game, shopId)) tabs.push(['commission', 'Commission 托']);
  const [tab, setTab] = useState(start && tabs.some(([t]) => t === start) ? start : tabs[0]![0]);
  const [dept, setDept] = useState<DepartmentId>('all');
  const silver = kinfo.money === 'silver';
  // A counter open: the first buy's guide can fire, and the codex meets the shops.
  const applyLife = useGame((s) => s.applyLife);
  useEffect(() => {
    lookAt({ shop: true });
    applyLife((s) => meetCodex(s, 'shop'));
    return () => lookAt({ shop: false });
  }, [applyLife]);
  // A sect's hall: its own pay in its currency, an outsider at friendly at the open counter (O2).
  const terms = hallTerms(game, game.player.id, sh);
  const house = sh.power && isOrganization(sh.power) ? houseOf(sh.power) : null;
  const yours =
    terms?.as === 'member' && house ? membership(game.world, game.player.id, house) : undefined;
  const currency = house ? organization(house).preset.currency.name : '';
  // What a harsh power's lower seats keep of a sale after its tithe (the checkpoint's fix).
  const tithe = titheFor(game, game.player.id, sh);
  const titheFrom =
    tithe > 0 ? (house ?? membershipsOf(game.world, game.player.id)[0]?.power ?? null) : null;
  // A member donates at its hall: stones at 2 low a point, goods at half their sell price (O1).
  if (yours && house) tabs.push(['donate', 'Donate']);
  const cost = (p: number) =>
    yours
      ? `${Math.round(p * 100) / 100} ${currency}`
      : silver
        ? `${Math.round(p * 10) / 10} taels`
        : priceWords(p);
  const sm = shopMonth(game.world, shopId, game.calendar.day);
  const haggled = sm.haggle?.day === Math.floor(game.calendar.day) ? sm.haggle.off : null;
  const left = Math.max(0, shopPurse(game.world, sh, game.calendar.day) - sm.paid);
  const m = marketOfShop(shopId);
  // Where a lot comes from and how much of it there is (Supply and prices).
  const origin = (thing: string): string[] => {
    if (!m) return [];
    const seen = seenIn(game.world, m, thing);
    const out: string[] = [];
    if (seen.source === 'made') out.push('made here');
    if (seen.source === 'reach' && seen.from)
      out.push(`from ${market(seen.from)?.name ?? 'nearby'}`);
    if (seen.source === 'import') out.push('imported');
    if (supplyOf(game.world, m, thing, game.calendar.day) < 100) out.push('scarce');
    return out;
  };
  if (terms?.as === 'shut') return <p className="place-note">{terms.why}</p>;
  // The shelf by the count first, then the month's display lots (E5).
  const shelved = shelf(game, game.player.id, shopId).sort(
    (a, b) => Number(!!b.standing) - Number(!!a.standing),
  );
  const imported = (thing: string) => origin(thing).includes('imported');
  const floor = departments ? departmentsOf(shelved, imported) : [];
  const lots =
    departments && dept !== 'all'
      ? shelved.filter((l) => inDepartment(l.thing, dept, imported))
      : shelved;
  // What you carry and the copies on your bookcase, whatever this shop will buy.
  const held = [...Object.entries(game.player.items), ...Object.entries(game.player.copies)]
    .filter(([, n]) => n > 0)
    .map(([thing, n]) => ({ thing, n, offer: offerFor(game, game.player.id, shopId, thing) }))
    .filter((x) => x.offer.ok);
  // A standing line is bought one, ten or a Bag square at a time (E5).
  const counted = (l: StockLot) => !!l.standing && !l.endless;
  const amounts = (l: StockLot) =>
    [...new Set([1, 10, hasCopy(l.thing) ? 1 : stackSize(item(l.thing))])].filter((k) => k <= l.n);
  // A staple sells by the lot, a Bag square at a time (E3).
  const lotOf = (thing: string, n: number) => (isStaple(thing) ? Math.min(n, lotSize(thing)) : 1);
  const worn = [
    ...new Set([
      ...Object.keys(game.player.wear),
      ...Object.values(game.player.gear)
        .flat()
        .filter((x): x is string => typeof x === 'string'),
      ...Object.keys(game.player.items).filter((t) => (game.player.items[t] ?? 0) > 0),
    ]),
  ]
    .map((thing) => ({ thing, cost: repairCost(game, game.player.id, thing) }))
    .filter((x) => x.cost !== null);
  // Known by name from craft renown 3 (K6): the keeper knows the maker of what they deal in.
  const byName = knownCrafts(game.player, sh.region, game.calendar.day).find((k) =>
    CRAFT_DEALS[k].some((w) => kinfo.buys.includes(w)),
  );
  return (
    <>
      {byName && (
        <p className="place-good">
          The keeper knows you: the {CRAFTER[byName].name} whose make sells across the town.
        </p>
      )}
      <div className="place-keeper">
        <span>
          {capitalize(keeperName(sh))} · {sh.small ? 'together they' : 'they'} can pay out{' '}
          {silver ? `${Math.round(left).toLocaleString('en')} taels` : priceWords(left)} this month
        </span>
        {yours ? (
          <span className="muted">
            Your balance: {Math.round(yours.balance * 10) / 10} {currency}, at the market’s price
          </span>
        ) : kinfo.posted ? (
          <span className="muted">Posted rates, never haggled.</span>
        ) : haggled !== null ? (
          <span className={haggled > 0 ? 'place-good' : 'muted'}>
            {haggled > 0
              ? `Haggled: ${Math.round(haggled * 100)}% off this visit.`
              : 'Haggled hard, for nothing.'}
          </span>
        ) : (
          <button
            type="button"
            className="place-btn"
            onClick={() =>
              act((s) => {
                const r = haggle(s, s.player.id, shopId);
                if (r.ok)
                  say(
                    r.off
                      ? `${Math.round(r.off * 100)}% off today.`
                      : 'The keeper won’t budge, and remembers you pushed.',
                  );
                return r;
              })
            }
          >
            Haggle · once a visit
          </button>
        )}
      </div>
      <div className="place-tabs" role="tablist">
        {tabs.map(([t, l]) => (
          <button
            key={t}
            type="button"
            role="tab"
            aria-selected={tab === t}
            onClick={() => setTab(t)}
          >
            {l}
          </button>
        ))}
      </div>
      {terms?.as === 'guest' && (
        <p className="place-sub">
          A guest elder’s terms: the market’s price in stones, the members’ lines among them.
        </p>
      )}
      {terms?.as === 'counter' && (
        <p className="place-sub">
          The open counter: ×1.25 in stones, never the members’ lines or the chapters.
          {house && guestOffered(game, game.player.id, house) && (
            <>
              {' '}
              <button
                type="button"
                className="place-btn"
                onClick={() =>
                  act((s) => {
                    const r = becomeGuest(s, s.player.id, house);
                    if (r.ok) say(`You sit as a guest elder of ${theName(house)}.`);
                    return r.ok ? r : { ok: false, reason: r.why };
                  })
                }
              >
                Take the guest elder’s seat they offer
              </button>
            </>
          )}
        </p>
      )}
      {game.map?.inside && (
        <QuestOffers
          game={game}
          kind={sh.kind === 'sect' ? 'hall' : 'shop'}
          place={game.map.inside}
          who={shopId}
        />
      )}
      {tab === 'buy' && departments && floor.length > 1 && (
        <div className="place-departments" role="tablist" aria-label="Departments">
          {floor.map((d) => (
            <button
              key={d.id}
              type="button"
              role="tab"
              aria-selected={dept === d.id}
              onClick={() => setDept(d.id)}
            >
              {d.name} <small>{d.n}</small>
            </button>
          ))}
        </div>
      )}
      {tab === 'buy' && (
        <div className="place-rows" data-guide="buy">
          {lots.length === 0 && <p className="muted">The shelf is bare until the month turns.</p>}
          {lots.map((l) => {
            const w = ware(l.thing);
            return (
              <div key={l.slot} className="place-row" {...itemTipProps(l.thing)}>
                <i className="place-dot" style={{ background: `var(--rarity-${w.rarity})` }} />
                <span>
                  <span className="place-row-name">
                    {w.name}
                    {l.n > 1 ? ` ×${l.n}` : ''}
                  </span>{' '}
                  <span className="place-sub">
                    ·{' '}
                    {[
                      w.sub,
                      ...(l.standing ? [l.endless ? 'by the lot' : 'on the shelf'] : []),
                      ...origin(l.thing),
                    ].join(' · ')}
                  </span>
                </span>
                <span className="place-price">
                  {counted(l)
                    ? `${cost(priceToYou(game, game.player.id, shopId, l, 1))} each`
                    : cost(priceToYou(game, game.player.id, shopId, l))}
                </span>
                <span className="place-buys">
                  {(counted(l) ? amounts(l) : [undefined]).map((k) => (
                    <button
                      key={k ?? 'lot'}
                      type="button"
                      className="place-btn"
                      onClick={() => {
                        endGuide('first-buy');
                        act((s) => {
                          const r = buy(s, s.player.id, shopId, l.slot, k);
                          if (r.ok) {
                            say(`Bought ${w.name}${(k ?? l.n) > 1 ? ` ×${k ?? l.n}` : ''}.`);
                            cue('shop-buy');
                          }
                          return r;
                        });
                      }}
                    >
                      {k === undefined ? 'Buy' : `Buy ${k}`}
                    </button>
                  ))}
                </span>
              </div>
            );
          })}
        </div>
      )}
      {tab === 'sell' && (
        <>
          <div className="place-rows">
            {held.length === 0 && <p className="muted">You carry nothing they buy.</p>}
            {held.map(({ thing, n, offer }) => {
              const w = ware(thing);
              return (
                <div key={thing} className="place-row" {...itemTipProps(thing)}>
                  <i className="place-dot" style={{ background: `var(--rarity-${w.rarity})` }} />
                  <span>
                    <span className="place-row-name">{w.name}</span>{' '}
                    <span className="place-sub">· you hold {n}</span>
                    {offer.ok && offer.wanted && <span className="place-good"> · wanted here</span>}
                    <MarkWords game={game} shopId={shopId} thing={thing} n={n} />
                  </span>
                  <span className="place-price">
                    {offer.ok ? cost(Math.round(offer.each * (1 - tithe) * 100) / 100) : ''}
                    {lotOf(thing, n) > 1 ? ` each, a lot of ${lotOf(thing, n)}` : ''}
                  </span>
                  <button
                    type="button"
                    className="place-btn"
                    onClick={() =>
                      act((s) => {
                        const r = sell(s, s.player.id, shopId, thing, lotOf(thing, n));
                        if (r.ok) {
                          say(`Sold ${w.name}.`);
                          cue('shop-sell');
                        }
                        return r;
                      })
                    }
                  >
                    Sell
                  </button>
                </div>
              );
            })}
          </div>
          <p className="place-sub">
            {kinfo.posted
              ? 'The bounty office buys cores and beast parts at half their price, 80% for what is wanted here.'
              : sh.kind === 'black-market'
                ? 'They buy anything at 30% of their own price, and never ask whose it was.'
                : 'They buy at 40% of their own price (60% once their power favors you), and 80% for what is wanted here.'}
            {tithe > 0 &&
              ` The prices shown are what you keep after ${possessive(theName(titheFrom!), '’')} ${Math.round(tithe * 100)}% tithe.`}
          </p>
        </>
      )}
      {tab === 'commission' && (
        <CommissionCounter game={game} shopId={shopId} act={act} say={say} />
      )}
      {tab === 'donate' && house && <DonateRows game={game} power={house} act={act} say={say} />}
      {tab === 'mend' && (
        <div className="place-rows">
          {worn.length === 0 && <p className="muted">Nothing you carry needs mending.</p>}
          {worn.map(({ thing, cost: c }) => {
            const w = ware(thing);
            return (
              <div key={thing} className="place-row">
                <i className="place-dot" style={{ background: `var(--rarity-${w.rarity})` }} />
                <span>
                  <span className="place-row-name">{w.name}</span>{' '}
                  <span className="place-sub">
                    ·{' '}
                    {item(thing).damaged
                      ? 'damaged'
                      : `worn ${Math.round((game.player.wear[thing] ?? 0) * 100)}%`}
                  </span>
                </span>
                <span className="place-price">{priceWords(c!)}</span>
                <button
                  type="button"
                  className="place-btn"
                  onClick={() =>
                    act((s) => {
                      const r = repair(s, s.player.id, shopId, thing);
                      if (r.ok) say(`${w.name} mended.`);
                      return r;
                    })
                  }
                >
                  {item(thing).damaged ? 'Restore' : 'Mend'}
                </button>
              </div>
            );
          })}
        </div>
      )}
    </>
  );
}

// ---------------------------------------------------------------- the scripture pavilion

/** A power's own chapters, a copy each, bought in its currency by a seat that reaches them (O2). */
function PavilionCounter({
  game,
  power,
  act,
  say,
}: {
  game: GameState;
  power: string;
  act: Act;
  say: (t: string) => void;
}) {
  const lines = pavilion(game, game.player.id, power);
  if (!lines) return <p className="place-note">The pavilion is for its own disciples.</p>;
  const m = membership(game.world, game.player.id, houseOf(power))!;
  const currency = organization(houseOf(power)).preset.currency.name;
  return (
    <>
      <div className="place-keeper">
        <span>
          A copy of any chapter your seat reaches · your balance {Math.round(m.balance * 10) / 10}{' '}
          {currency}
        </span>
      </div>
      <div className="place-rows">
        {lines.map((l) => {
          const w = ware(l.thing);
          const seat = seatTitle(power, l.seat);
          return (
            <div key={l.thing} className="place-row">
              <i className="place-dot" style={{ background: `var(--rarity-${w.rarity})` }} />
              <span>
                <span className="place-row-name">{w.name}</span>{' '}
                <span className="place-sub">
                  · chapter {l.chapter} · {l.open ? w.sub : `from ${seat.name}`}
                </span>
              </span>
              <span className="place-price">
                {l.points} {currency}
              </span>
              <button
                type="button"
                className="place-btn"
                disabled={!l.open}
                onClick={() =>
                  act((s) => {
                    const r = buyChapter(s, s.player.id, power, l.thing);
                    if (r.ok) say(`The pavilion copies you ${w.name}.`);
                    return r;
                  })
                }
              >
                Copy
              </button>
            </div>
          );
        })}
      </div>
    </>
  );
}

/** A power's law hall, where a face it marked makes restitution: three times, the slip back (O5). */
function LawHallCounter({
  game,
  power,
  act,
  say,
}: {
  game: GameState;
  power: string;
  act: Act;
  say: (t: string) => void;
}) {
  const m = yourMark(game, power);
  if (!m) return <p className="place-note">The law hall has nothing against you.</p>;
  return (
    <>
      <p className="place-sub">
        {capitalize(theName(power))} knows its {m.method} in your hands. Restitution is three times
        the copy’s price{m.slip ? ', and the slip handed back' : ''}; you swear the heart-demon oath
        never to teach or sell what you learned, and the mark lifts. Joining it lifts it too.
      </p>
      <div className="place-rows">
        <div className="place-row">
          <span>
            <span className="place-row-name">{capitalize(m.method)}</span>{' '}
            <span className="place-sub">· chapter {m.chapter}</span>
          </span>
          <span className="place-price">{m.restitutionWords}</span>
          <button
            type="button"
            className="place-btn"
            onClick={() =>
              act((s) => {
                const r = liftByPaying(s, power, 'restitution');
                if (r.ok) say(`${capitalize(theName(power))} lifts its mark.`);
                return r;
              })
            }
          >
            Make restitution
          </button>
        </div>
      </div>
    </>
  );
}

// ---------------------------------------------------------------- a power's own doors

/** Donating at the exchange hall, the points shown before you give. */
function DonateRows({ game, power, act, say }: CounterProps) {
  const currency = organization(power).preset.currency.name;
  const give = (gift: { stones?: number; things?: Record<string, number> }, what: string) =>
    act((s) => {
      const r = donate(s, s.player.id, power, gift);
      if (r.ok) say(`${what} donated: ${r.points} ${currency}.`);
      return r.ok ? r : { ok: false, reason: r.why };
    });
  const things = Object.entries(game.player.items).filter(([, n]) => n > 0);
  return (
    <div className="place-rows">
      {[10, 50, 200].map((n) => (
        <div key={n} className="place-row is-plain">
          <span className="place-row-name">{n} low-grade stones</span>
          <span className="place-price">
            {donationPoints({ stones: n })} {currency}
          </span>
          <button
            type="button"
            className="place-btn"
            onClick={() => give({ stones: n }, `${n} low`)}
          >
            Donate
          </button>
        </div>
      ))}
      {things.map(([t]) => {
        const w = ware(t);
        return (
          <div key={t} className="place-row">
            <i className="place-dot" style={{ background: `var(--rarity-${w.rarity})` }} />
            <span className="place-row-name">{w.name}</span>
            <span className="place-price">
              {donationPoints({ things: { [t]: 1 } })} {currency}
            </span>
            <button
              type="button"
              className="place-btn"
              onClick={() => give({ things: { [t]: 1 } }, w.name)}
            >
              Donate one
            </button>
          </div>
        );
      })}
    </div>
  );
}

type CounterProps = { game: GameState; power: string; act: Act; say: (t: string) => void };

/**
 * A guild's examination hall 考品 (K6's study, take C): a row a craft, your grade certified and
 * the next one's test batch, sat at its bench (the craft's own sitting, handed in when you will)
 * or queued at no hand; then its seats and the grade each asks, and its guest elder seat when your
 * name in one of its crafts carries across the region.
 */
function ExamCounter({ game, power, act, say }: CounterProps) {
  const rows = examRows(game.player, power);
  const [picks, setPicks] = useState<Partial<Record<CraftId, string>>>({});
  const [sat, setSat] = useState<{ craft: CraftId; recipe: string } | null>(null);
  const hand = useFurnace((f) => f.hand);
  useEffect(() => standUp, []);
  const sit = (output: string, h: number) =>
    act((s) => {
      const r = certify(s, power, output, h);
      if (r.ok)
        say(
          r.held
            ? `The batch holds. The examiners seal your ${CRAFT_GRADES[r.grade - 1]!.hanzi} badge.`
            : 'The batch fails in front of the examiners. They keep the fee.',
        );
      return r;
    });
  if (sat) {
    const r = recipe(sat.recipe);
    return (
      <>
        <p className="place-sub">
          At the guild’s bench, a batch of {item(r.output).name}s in front of the examiners. Hand it
          in when you will: they read the hand you sat it with.
        </p>
        {sat.craft === 'refining' ? (
          <ForgeScene key="forge" game={game} family={r.family} />
        ) : sat.craft === 'talismans' ? (
          <TalismanScene key="desk" game={game} family={r.family} />
        ) : (
          <FurnaceScene key="furnace" game={game} recipe={r} />
        )}
        <p className="place-note">Your hand: {formatPercent(hand)}.</p>
        <button
          type="button"
          className="place-btn"
          onClick={() => {
            const h = useFurnace.getState().hand;
            standUp();
            setSat(null);
            sit(sat.recipe, h);
          }}
        >
          Hand in the batch
        </button>{' '}
        <button
          type="button"
          className="place-btn"
          onClick={() => {
            standUp();
            setSat(null);
          }}
        >
          Stand up
        </button>
      </>
    );
  }
  const seats = (['outer', 'inner', 'true', 'elder'] as const).map((seat) => ({
    seat,
    title: seatTitle(power, seat),
    grade: seatGrade(power, seat),
  }));
  return (
    <>
      <p className="place-sub">
        One batch of the grade’s tier at the guild’s bench, your own inputs, that holds: played or
        queued. The branch grades to {CRAFT_GRADES[examinesTo(power) - 1]!.hanzi}.
      </p>
      <ul className="place-exam">
        {rows.map((row) => {
          const pick = picks[row.craft] ?? row.recipes[0]?.output ?? '';
          // Said before the sitting, not after it (review 2026-10-21).
          const cant = !pay(stonesOf(game.player), row.fee)
            ? `The examination costs ${row.fee} low.`
            : pick && planInputs(game.player, recipe(pick)).short.length
              ? 'Your Bag can’t fill the test batch.'
              : null;
          return (
            <li key={row.craft}>
              <span>
                {CRAFTS[row.craft].name} <span className="hanzi">{CRAFTS[row.craft].hanzi}</span>
              </span>
              <span className={row.certified ? 'is-good' : 'muted'}>
                {row.certified ? `${CRAFT_GRADES[row.certified - 1]!.hanzi} certified` : 'no grade'}
              </span>
              {row.shut ? (
                <span className="muted">{row.shut}</span>
              ) : (
                <span>
                  {CRAFT_GRADES[row.next! - 1]!.hanzi}:{' '}
                  <select
                    value={pick}
                    onChange={(e) => setPicks({ ...picks, [row.craft]: e.target.value })}
                  >
                    {row.recipes.map((r) => (
                      <option key={r.output} value={r.output}>
                        {item(r.output).name}
                      </option>
                    ))}
                  </select>{' '}
                  <button
                    type="button"
                    className="place-btn"
                    disabled={!!cant}
                    title={cant ?? undefined}
                    onClick={() => {
                      sitDown(pick, row.craft, { bench: false });
                      setSat({ craft: row.craft, recipe: pick });
                    }}
                  >
                    Sit it · {row.fee} low
                  </button>{' '}
                  <button
                    type="button"
                    className="place-btn"
                    disabled={!!cant}
                    onClick={() => sit(pick, 0)}
                  >
                    Queue it
                  </button>
                  {cant && <span className="muted"> {cant}</span>}
                </span>
              )}
            </li>
          );
        })}
      </ul>
      <p className="place-sub">
        Seats: each asks the grade of its realm’s tier, certified in any of the guild’s crafts.
      </p>
      <ul className="place-exam">
        {seats.map((x) => (
          <li key={x.seat}>
            <span>
              {capitalize(x.title.name)} <span className="hanzi">{x.title.hanzi}</span>
            </span>
            <span className="muted">{CRAFT_GRADES[x.grade - 1]?.hanzi ?? 'no grade'}</span>
          </li>
        ))}
        <li>
          <span>
            Guest elder <span className="hanzi">客卿</span>
          </span>
          <span className="muted">offered at name {CRAFT_RENOWN.guest} in one of its crafts</span>
          {guestOffered(game, game.player.id, power) &&
            !membership(game.world, game.player.id, power) && (
              <button
                type="button"
                className="place-btn"
                onClick={() =>
                  act((s) => {
                    const r = becomeGuest(s, s.player.id, power);
                    if (r.ok) say(`You sit as a guest elder of ${theName(power)}.`);
                    return r.ok ? r : { ok: false, reason: r.why };
                  })
                }
              >
                Take the guest elder’s seat they offer
              </button>
            )}
        </li>
      </ul>
    </>
  );
}

/** Your mark on a line you sell (K6): how many are yours, and what your name adds here. */
function MarkWords({
  game,
  shopId,
  thing,
  n,
}: {
  game: GameState;
  shopId: string;
  thing: string;
  n: number;
}) {
  const m = markOn(game, game.player.id, shopId, thing, n);
  if (m.n === 0) return null;
  return (
    <span className="place-good">
      {' · '}
      {m.n === n ? 'your make' : `${m.n} your make`}
      {m.lift > 0 ? `, your mark +${Math.round(m.lift * 100)}%` : ''}
    </span>
  );
}

/** A guild's counter (K6): its area's common styles, each chapter sold openly to anyone. */
function GuildCounter({ game, power, act, say }: CounterProps) {
  return (
    <>
      <p className="place-sub">
        The frontier’s common styles, sold and taught openly, never guarded: most powers that craft
        at all hold them, so the clans of the Border Wilds brew alike.
      </p>
      <ul className="place-exam">
        {guildCounter(power).map((l) => {
          const m = copyManual(l.thing);
          const owned = (game.player.copies[l.thing] ?? 0) > 0;
          return (
            <li key={l.thing}>
              <span>
                {m.name} <span className="hanzi">{m.hanzi}</span> · ch. {m.chapter ?? 1}
              </span>
              <span className="muted">{priceWords(l.price)}</span>
              <button
                type="button"
                className="place-btn"
                disabled={owned}
                onClick={() =>
                  act((s) => {
                    const r = buyAtGuild(s, power, l.thing);
                    if (r.ok) say(`You buy the ${m.name}.`);
                    return r;
                  })
                }
              >
                {owned ? 'On your shelf' : 'Buy'}
              </button>
            </li>
          );
        })}
      </ul>
    </>
  );
}

/** The way into a power, asked at its seat: a test, vows, enlisting, buying in, an oath, a sponsor. */
function JoinCounter({ game, power, act, say }: CounterProps) {
  const e = entryOf(game, game.player.id, power);
  if (!e) return <p className="place-note">You are one of theirs already.</p>;
  return (
    <>
      <p className="place-sub">{capitalize(e.sub)}.</p>
      {e.shut && <p className="place-note">{e.shut}</p>}
      <button
        type="button"
        className="place-btn"
        disabled={!!e.shut}
        onClick={() =>
          act((s) => {
            const r = askToJoin(s, s.player.id, power);
            if (r.ok)
              say(
                r.joined
                  ? `${capitalize(theName(power))} takes you in.`
                  : `Short: ${r.yours?.toFixed(1)} against ${r.bar?.toFixed(1)}.`,
              );
            return r;
          })
        }
      >
        {e.title.name}
      </button>
    </>
  );
}

/** A gift for a power you don't belong to: stones or a thing from the Bag, tribute once a month. */
function GiftCounter({ game, power, act, say }: CounterProps) {
  const floor = giftFloor(game, game.player.id);
  const counted = giftThisMonth(game, game.player.id, power);
  const give = (gift: { stones?: number; things?: Record<string, number> }) =>
    act((s) => {
      const r = offerGift(s, s.player.id, power, gift);
      if (r.ok) say(r.counted ? 'It is taken in, and noted.' : 'It is taken in.');
      return r;
    });
  const things = Object.entries(game.player.items)
    .filter(([t, n]) => n > 0 && priceOfThing(t) >= floor)
    .slice(0, 8);
  return (
    <>
      <p className="place-sub">
        A gift worth {floor} low or more is remembered as tribute for a season; one a month counts.
        {counted && ' They have counted one of yours this month.'}
      </p>
      <div className="place-rows">
        {[floor, floor * 3].map((n) => (
          <div key={n} className="place-row is-plain">
            <span className="place-row-name">{n} low-grade stones</span>
            <span />
            <button type="button" className="place-btn" onClick={() => give({ stones: n })}>
              Give
            </button>
          </div>
        ))}
        {things.map(([t]) => {
          const w = ware(t);
          return (
            <div key={t} className="place-row">
              <i className="place-dot" style={{ background: `var(--rarity-${w.rarity})` }} />
              <span className="place-row-name">{w.name}</span>
              <span className="place-price">worth {priceWords(priceOfThing(t))}</span>
              <button
                type="button"
                className="place-btn"
                onClick={() => give({ things: { [t]: 1 } })}
              >
                Give one
              </button>
            </div>
          );
        })}
      </div>
    </>
  );
}

/**
 * The training ground: this month's partners, a senior two stages up, a fellow disciple at yours
 * and a junior two below, each asked once a day. A spar takes the stage (Fights you play).
 */
function GroundCounter({ game, power, act }: { game: GameState; power: string; act: Act }) {
  const partners = groundPartners(game, power);
  return (
    <>
      <p className="place-sub">
        Ask someone to spar. Nobody dies and nothing drops; it ends at the first fall. The pills you
        swallow are spent, and the gear you wear bonds a little each exchange.
      </p>
      <div className="place-rows">
        {partners.map((p) => {
          const why = sparWhy(game, p.who);
          return (
            <div key={p.who} className="place-row is-plain">
              <span className="place-row-name">
                {p.name} · {p.words}
              </span>
              <span className="place-price">
                {realm(p.realm).name}, {stageName(p.realm, p.stage)}
              </span>
              <button
                type="button"
                className="place-btn"
                disabled={!!why}
                title={why ?? undefined}
                onClick={() => act((s) => asSpar(askSpar(s, p.who)))}
              >
                Spar
              </button>
            </div>
          );
        })}
      </div>
    </>
  );
}

/** A spar asked: the fight opened, or why not. */
function asSpar(r: GameState | string) {
  return typeof r === 'string'
    ? { ok: false as const, reason: r }
    : { ok: true as const, state: r };
}

/** The elders' hall: an elder's lesson, a protector, the inner trial in its month, being released. */
function EldersCounter({ game, power, act, say }: CounterProps) {
  const [asking, setAsking] = useState(false);
  const h = eldersHall(game, game.player.id, power);
  if (!h) return <p className="place-note">The elders see only their own.</p>;
  const release = releaseView(game, game.player.id, power);
  const pts = (n: number) => `${Math.round(n * 10) / 10} ${h.currency}`;
  return (
    <>
      <div className="place-keeper">
        <span>Your balance: {pts(h.balance)}</span>
      </div>
      <div className="place-rows">
        <div className="place-row is-plain">
          <span>
            <span className="place-row-name">An elder’s lesson</span>{' '}
            <span className="place-sub">· a day’s teaching, three days of your own study</span>
          </span>
          <span className="place-price">{pts(h.lesson.price)}</span>
          <button
            type="button"
            className="place-btn"
            disabled={h.lesson.taken}
            onClick={() =>
              act((s) => {
                const r = takeLesson(s, s.player.id, power);
                if (r.ok) say('An elder spends the day on you.');
                return r.ok ? r : { ok: false, reason: r.why };
              })
            }
          >
            {h.lesson.taken ? 'Taught this month' : 'Ask'}
          </button>
        </div>
        <div className="place-row is-plain">
          <span>
            <span className="place-row-name">A protector 护法</span>{' '}
            <span className="place-sub">
              · at your next breakthrough, +5% and a failure softened
            </span>
          </span>
          <span className="place-price">{pts(h.protector.price)}</span>
          <button
            type="button"
            className="place-btn"
            disabled={h.protector.standing}
            onClick={() =>
              act((s) => {
                const r = engageProtector(s, s.player.id, power);
                if (r.ok) say('An elder will stand by you.');
                return r.ok ? r : { ok: false, reason: r.why };
              })
            }
          >
            {h.protector.standing ? 'Standing by' : 'Ask'}
          </button>
        </div>
        {h.trial && (
          <div className="place-row is-plain">
            <span>
              <span className="place-row-name">The inner trial</span>{' '}
              <span className="place-sub">· {h.trial.words}</span>
            </span>
            <span />
            <button
              type="button"
              className="place-btn"
              disabled={!h.trial.open}
              onClick={() =>
                act((s) => {
                  const r = innerTrial(s, s.player.id, power);
                  if (!r.ok) return { ok: false, reason: r.why };
                  say(trialWords(r));
                  return r;
                })
              }
            >
              Sit it
            </button>
          </div>
        )}
      </div>
      {release && (
        <div className="place-release">
          {!asking ? (
            <button type="button" className="place-btn is-quiet" onClick={() => setAsking(true)}>
              Ask to be released
            </button>
          ) : (
            <>
              <p className="place-sub">
                {release.parting.kind === 'clean'
                  ? `A clean parting, ${release.parting.why}: you keep what you learned under the heart-demon oath, never to teach or sell it.`
                  : `This is a betrayal (${release.parting.why}): ${theName(power)} will remember it and hunt for what you know.`}
              </p>
              <p className="place-sub">
                You give up {pts(release.balance)}
                {release.dwelling ? `, the dwelling’s qi ×${release.dwelling}` : ''}
                {release.posts.length ? `, your post (${release.posts.join(', ')})` : ''}
                {release.copies.length
                  ? `, and hand back ${release.copies.join(', ')} to the pavilion`
                  : ''}
                .
              </p>
              <button
                type="button"
                className={`place-btn${release.parting.kind === 'clean' ? '' : ' is-bad'}`}
                onClick={() =>
                  act((s) => {
                    const r = askRelease(s, s.player.id, power);
                    if (r.ok) say(`You leave ${theName(power)}.`);
                    return r;
                  })
                }
              >
                Leave {theName(power)}
              </button>{' '}
              <button type="button" className="place-btn is-quiet" onClick={() => setAsking(false)}>
                Stay
              </button>
            </>
          )}
        </div>
      )}
    </>
  );
}

/** A trial's outcome in words: passed with its rank among those who sat it, or short. */
function trialWords(r: Extract<ReturnType<typeof innerTrial>, { ok: true }>): string {
  const sizes = `${r.yours.toFixed(1)} against ${r.theirs.toFixed(1)}`;
  if (!r.passed) return `Short: ${sizes}.`;
  return `Passed, ${sizes}; ranked ${r.rank} of the outer disciples who sat it${r.pill ? ', and handed a Foundation Pill' : ''}.`;
}

// ---------------------------------------------------------------- the other doors

function ChangerCounter({ game, place, act }: { game: GameState; place: MapPlace; act: Act }) {
  const rows: [Change, string, string, string][] = [
    [
      'break-low',
      'Break a low-grade stone',
      'for 110 taels',
      `you hold ${Math.floor(game.player.stones)} low`,
    ],
    [
      'buy-low',
      'Buy a low-grade stone',
      'for 120 taels',
      `you hold ${Math.floor(game.player.silver)} taels`,
    ],
    [
      'break-mid',
      'Break a mid-grade stone',
      'for 1,100 low',
      `you hold ${gradeCount(stonesOf(game.player), 1)} mid`,
    ],
    ['buy-mid', 'Buy a mid-grade stone', 'for 1,200 low', ''],
  ];
  return (
    <>
      <div className="place-rows">
        {rows.map(([how, n, s, held]) => (
          <div key={how} className="place-row is-plain">
            <span>
              <span className="place-row-name">{n}</span> <span className="place-sub">· {s}</span>
            </span>
            <span className="place-price muted">{held}</span>
            <button
              type="button"
              className="place-btn"
              onClick={() => act((st) => changeMoney(st, place.id, how))}
            >
              {how.startsWith('break') ? 'Break one' : 'Buy one'}
            </button>
          </div>
        ))}
      </div>
      <p className="place-sub">
        Inns, ferries and mortal shops deal in silver and can’t make change for a stone.
      </p>
    </>
  );
}

/** A village's or town's fields (K8): a plot rented for a season or bought, worked on the Crafts screen. */
function FieldsCounter({ game, place, act }: { game: GameState; place: MapPlace; act: Act }) {
  const spot = plotSpot(game, place);
  if (!spot) return null;
  const mine = game.player.crafts.plots.filter((p) => p.place === place.id).length;
  const take = (held: 'rented' | 'bought') =>
    act((st) => {
      const r = takePlot(st.player, spot, held, st.calendar.day);
      return r.reason
        ? { ok: false, reason: r.reason }
        : { ok: true, state: withPlayer(st, r.cultivator) };
    });
  const rows: ['rented' | 'bought', string, string, number][] = [
    ['rented', 'Rent a plot', 'nine beds for a season', rentOf(spot.density)],
    ['bought', 'Buy a plot', 'nine beds, yours to dig up and carry off', buyOf(spot.density)],
  ];
  return (
    <>
      <p className="place-sub">
        {capitalize(spot.land)} land, qi density {spot.density}: a crop grows best where the density
        stands at twice its tier or more. The village watches its fields, so nobody touches your
        beds while it thinks well of you.
      </p>
      <div className="place-rows">
        {rows.map(([held, n, sub, price]) => (
          <div key={held} className="place-row is-plain">
            <span>
              <span className="place-row-name">{n}</span> <span className="place-sub">· {sub}</span>
            </span>
            <span className="place-price">{price} low</span>
            <button type="button" className="place-btn" onClick={() => take(held)}>
              {held === 'rented' ? 'Rent' : 'Buy'}
            </button>
          </div>
        ))}
      </div>
      <p className="place-note">
        <b>{mine === 0 ? 'A plot' : mine === 1 ? 'Your plot here' : 'Your plots here'}</b> is worked
        on the Crafts screen’s Spirit Farming page, only while you stand here.{' '}
        <button
          type="button"
          className="link-button"
          onClick={() => go('crafts', undefined, 'farming')}
        >
          Open it
        </button>
      </p>
    </>
  );
}

/** The broker's lets and sales (K9): what a place has, by the period or bought. */
function BrokerCounter({ game, place, act }: { game: GameState; place: MapPlace; act: Act }) {
  const offers = offersAt(game, place);
  const mine = dwellingAt(game.player, place.id);
  return (
    <>
      <p className="place-sub">
        You may hold one dwelling in a place. Rent comes off your purse as its time turns; leave it
        unpaid, and what is in the store is kept a month, then sold for the debt.
      </p>
      <div className="place-rows">
        {offers.map((o) => (
          <div key={o.kind} className="place-row is-plain broker-row">
            <span>
              <span className="place-row-name">
                {o.name} <span className="hanzi">{o.hanzi}</span>
              </span>
              <span className="place-sub">
                {' '}
                · {o.line}
                {o.steps > 0 ? ` · qi ×${stepMult(o.steps)}` : ''}
                {o.store > 0 ? ` · a store of ${o.store}` : ' · no store'}
                {o.slots > 0 ? ` · ${o.slots} plot slot${o.slots === 1 ? '' : 's'}` : ''}
              </span>
            </span>
            <span className="place-price">
              {o.rent.map((r) => `${r.price.toLocaleString()} low a ${r.period}`).join(' · ')}
              {o.buy !== null
                ? `${o.rent.length ? ' · ' : ''}${o.buy.toLocaleString()} low to buy`
                : ''}
            </span>
            <span className="broker-buttons">
              {o.rent.map((r) => (
                <button
                  key={r.period}
                  type="button"
                  className="place-btn"
                  disabled={!!o.why}
                  title={o.why ?? undefined}
                  onClick={() => act((s) => takeFromBroker(s, place, o.kind, r.period))}
                >
                  {o.rent.length > 1 ? `By the ${r.period}` : 'Rent'}
                </button>
              ))}
              {o.buy !== null && (
                <button
                  type="button"
                  className="place-btn"
                  disabled={!!o.why}
                  title={o.why ?? undefined}
                  onClick={() => act((s) => takeFromBroker(s, place, o.kind, 'bought'))}
                >
                  Buy
                </button>
              )}
            </span>
          </div>
        ))}
      </div>
      {mine && (
        <p className="place-note">
          <b>Your {dwellingNoun(game, mine)} here</b> is on the Dwelling screen.{' '}
          <button type="button" className="link-button" onClick={() => go('dwelling')}>
            Open it
          </button>
        </p>
      )}
    </>
  );
}

function TalkCounter({
  game,
  map,
  place,
  act,
}: {
  game: GameState;
  map: RegionMap;
  place: MapPlace;
  act: Act;
}) {
  const [heard, setHeard] = useState<string | null>(null);
  const elder = PLACE_KIND_INFO[placeKindOf(place)!].rumors === 'elder';
  const today = rumorToday(game, place.id);
  const q = heard ? placeById(map, heard) : null;
  if (q) {
    const w = rumorWords(place, q);
    return (
      <>
        <p className="place-said">“{w.line}”</p>
        <p className="place-sub">
          {elder
            ? 'The elder, over a bowl of millet wine'
            : `${w.teller[0]!.toUpperCase()}${w.teller.slice(1)}, two tables over`}
          . <i className="place-ring" />
          {q.name} is Rumored now, somewhere in a ring on the map; go there and look around to find
          it. The next rumor here is tomorrow.
        </p>
      </>
    );
  }
  return (
    <>
      <p className="place-sub">
        {elder
          ? 'He talks if you sit a while, and asks for news of your own.'
          : 'A pot of tea, 5 taels: one rumor a day, of a place you don’t know, nearest first.'}
      </p>
      {today.ok ? (
        <div>
          <button
            type="button"
            className="place-btn is-primary"
            onClick={() =>
              act((s) => {
                const r = hearRumor(s, place.id);
                if (r.ok && r.heard) setHeard(r.heard);
                return r;
              })
            }
          >
            Sit and listen
          </button>
        </div>
      ) : (
        <p className="place-note">{today.reason}</p>
      )}
    </>
  );
}

function MapsCounter({
  game,
  place,
  act,
  say,
}: {
  game: GameState;
  place: MapPlace;
  act: Act;
  say: (t: string) => void;
}) {
  const maps = mapsAt(game, place.id);
  return (
    <>
      <div className="place-rows">
        {maps.map((m) => {
          const owned = (game.player.items[m.id] ?? 0) > 0;
          return (
            <div key={m.id} className="place-row is-plain">
              <span>
                <span className="place-row-name">{m.name}</span>{' '}
                <span className="place-sub">
                  ·{' '}
                  {m.scope === 'region' ? 'its kingdoms and named places' : 'outline, towns, roads'}
                </span>
                <br />
                <span className="place-sub">
                  {owned ? 'in your Bag' : STATE_WORDS[mapKnown(game, m)]}
                </span>
              </span>
              <span className="place-price">{priceWords(m.price)}</span>
              <button
                type="button"
                className="place-btn"
                disabled={owned}
                onClick={() =>
                  act((s) => {
                    const r = buyMap(s, place.id, m.id);
                    if (r.ok) {
                      say(`${m.name}: its ground is Sketched on your map.`);
                      cue('shop-buy');
                    }
                    return r;
                  })
                }
              >
                Buy
              </button>
            </div>
          );
        })}
      </div>
      <p className="place-sub">
        A map goes in the Bag and Sketches its ground at once. Only a treasure map shows a hidden
        site.
      </p>
    </>
  );
}

function GuidesCounter({
  game,
  map,
  place,
  act,
  say,
}: {
  game: GameState;
  map: RegionMap;
  place: MapPlace;
  act: Act;
  say: (t: string) => void;
}) {
  const [asking, setAsking] = useState<string | null>(null);
  const guides = guidesAt(game, place.id);
  return (
    <>
      <div className="place-rows">
        {guides.map((g) => {
          const knows = guideKnows(game, place.id, g);
          return (
            <div key={g.id} className="place-guide">
              <div className="place-row is-plain">
                <span>
                  <span className="place-row-name">{g.name}</span>{' '}
                  <span className="place-sub">· {g.trade}</span>
                  <br />
                  <span className="place-sub">
                    {knows.length === 0
                      ? 'knows nothing near that you haven’t seen'
                      : `knows ${knows.length} place${knows.length > 1 ? 's' : ''} you haven’t seen`}
                  </span>
                </span>
                <span className="place-price">{g.pay} low a day</span>
                <button
                  type="button"
                  className="place-btn"
                  disabled={knows.length === 0}
                  onClick={() => setAsking(asking === g.id ? null : g.id)}
                >
                  Ask where
                </button>
              </div>
              {asking === g.id && (
                <div className="place-rows is-nested">
                  {knows.slice(0, 6).map((q) => {
                    const w = wayWords(place, q);
                    return (
                      <div key={q.id} className="place-row is-plain">
                        <span>
                          <span className="place-row-name">{q.name}</span>{' '}
                          <span className="place-sub">
                            · {w.dir}, {w.days} out
                          </span>
                        </span>
                        <span className="place-price muted">
                          {known(game.map!, q.id) === 'rumored' ? 'rumored' : ''}
                        </span>
                        <button
                          type="button"
                          className="place-btn is-primary"
                          onClick={() =>
                            act((s) => {
                              const r = hireGuide(s, place.id, g.id, q.id);
                              if (r.ok) say(`${g.name} leads you to ${q.name}.`);
                              return r;
                            })
                          }
                        >
                          Go
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>
      <p className="place-sub">
        A guide takes you to a place they know that you haven’t seen: it turns Sketched, the course
        is set, and they lead you there, paid up front for the days it takes. A hidden place only if
        your soul could find it once you are there. {map.name}’s wild sites lie days apart.
      </p>
    </>
  );
}

function CaravansCounter({
  game,
  map,
  place,
  act,
  say,
}: {
  game: GameState;
  map: RegionMap;
  place: MapPlace;
  act: Act;
  say: (t: string) => void;
}) {
  const cs = caravansAt(game, place.id);
  const when = (d: number) => {
    const days = Math.floor(d) - Math.floor(game.calendar.day);
    return days <= 0
      ? 'leaves today at 辰'
      : days === 1
        ? 'leaves tomorrow at 辰'
        : `leaves in ${days} days, at 辰`;
  };
  return (
    <>
      <div className="place-rows">
        {cs.length === 0 && <p className="muted">No caravan is leaving this week.</p>}
        {cs.map((c) => (
          <div key={c.id} className="place-row is-caravan">
            <span>
              <span className="place-row-name">To {placeById(map, c.bound)?.name}</span>{' '}
              <span className="place-sub">· {c.leader}</span>
              <br />
              <span className="place-sub">{when(c.departs)}</span>
            </span>
            <button
              type="button"
              className="place-btn"
              onClick={() =>
                act((s) => {
                  const r = joinCaravan(s, place.id, c.id, 'ride');
                  if (r.ok) say(`You ride with ${c.name.replace(/^The /, 'the ')}.`);
                  return r;
                })
              }
            >
              Ride · 2 low
            </button>
            <button
              type="button"
              className="place-btn is-primary"
              onClick={() =>
                act((s) => {
                  const r = joinCaravan(s, place.id, c.id, 'guard');
                  if (r.ok) say(`You guard ${c.name.replace(/^The /, 'the ')}.`);
                  return r;
                })
              }
            >
              Guard · 1 low a day
            </button>
          </div>
        ))}
      </div>
      <p className="place-sub">
        The caravan owns the course and its stops; you own your wheel. Riding frees your hours at a
        jostled half. Guarding puts you on the Caravan guard routine, roads only, paid on arriving;
        a guard who walks off loses the pay.
      </p>
    </>
  );
}

// ---------------------------------------------------------------- the bounty board (P3.7)

function BoardCounter({
  game,
  map,
  place,
  act,
  say,
}: {
  game: GameState;
  map: RegionMap;
  place: MapPlace;
  act: Act;
  say: (t: string) => void;
}) {
  const posted = postingsAt(game, map, place);
  const held = game.map?.postings ?? [];
  const here = held.filter((p) => p.board === place.id);
  const goalWords = (id: string) => encounterTemplate(id).goal?.replace('-', ' ') ?? 'goal';
  // A mission hall pays in its power's currency, a town board in stones (the checkpoint).
  const pays = (p: { pay: number; power?: string }) =>
    p.power && isOrganization(p.power)
      ? p.pay + ' ' + organization(p.power).preset.currency.name
      : p.pay + ' low';
  const forWhom = (p: { patron?: string }) =>
    p.patron && isOrganization(p.patron) ? ' · for ' + theName(p.patron) : '';
  return (
    <>
      <QuestOffers game={game} kind="board" place={place.id} />
      <p className="place-sub">
        Take one and its spot is pinned on the map; you meet its goal there like anything the road
        brings, and are paid here when you come back. The bounty office beside it buys cores and
        parts; the board pays for the goal.
      </p>
      {here.length > 0 && (
        <div className="place-rows">
          {here.map((p) => (
            <div key={p.id} className="place-row is-plain">
              <span>
                <span className="place-row-name">{p.title}</span>
                <br />
                <span className="place-sub">
                  {p.done ? 'done · ' : 'held · '}
                  {p.text}
                </span>
              </span>
              {p.done ? (
                <button
                  type="button"
                  className="place-btn is-primary"
                  onClick={() =>
                    act((s) => {
                      const r = claimPosting(s, map, p.id);
                      if (r.ok) say('Paid ' + pays(p) + '.');
                      return r;
                    })
                  }
                >
                  Claim · {pays(p)}
                </button>
              ) : (
                <button
                  type="button"
                  className="place-btn"
                  onClick={() => act((s) => dropPosting(s, p.id))}
                >
                  Drop it
                </button>
              )}
            </div>
          ))}
        </div>
      )}
      <div className="place-rows">
        {posted.length === 0 && <p className="muted">Nothing is posted this month.</p>}
        {posted.map((p) => {
          const taken = held.some((h) => h.id === p.id);
          return (
            <div key={p.id} className="place-row is-plain">
              <span>
                <span className="place-row-name">{p.title}</span>
                <br />
                <span className="place-sub">
                  {goalWords(p.template)} · {band(p.band)?.name ?? 'mortal'} · {p.text}
                  {forWhom(p)}
                </span>
              </span>
              <button
                type="button"
                className="place-btn is-primary"
                disabled={taken}
                onClick={() =>
                  act((s) => {
                    const r = takePosting(s, map, place, p.id);
                    if (r.ok) say('Taken: its spot is pinned on the map.');
                    return r;
                  })
                }
              >
                {taken ? 'Taken' : 'Take · pays ' + pays(p)}
              </button>
            </div>
          );
        })}
      </div>
    </>
  );
}
