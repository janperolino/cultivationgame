// A place's own screen (design § The world: Wherever you like; P3.6b's look study,
// docs/mockups/place-screen-study.html): the Map one step back, the place's head and lore, the gate
// strip, its doors on the left grouped by what they are for, and the open door's counter beside them.
// Everything done in a place is done here: its shops on P3.5's calls, the teahouse, the map seller,
// guides, caravans, the money changer and the bed you sleep in by rule.
import { useState } from 'react';
import { copyItem, copyTitle, hasCopy } from '../content/copies.ts';
import { item } from '../content/items.ts';
import { PLACE_KINDS, type PlaceKindInfo } from '../content/map/places.ts';
import { QI_NAMES, TERRAIN_NAMES } from '../content/map/travel.ts';
import { REALM_IDS, realm, realmIdFromName, type RealmId } from '../content/realms.ts';
import { SHOP_KIND_INFO, shop as shopById } from '../content/shops.ts';
import { worldWhen } from '../core/chronicle.ts';
import { encounterTemplate } from '../content/encounters/index.ts';
import { claimPosting, dropPosting, postingsAt, takePosting } from '../core/map/board.ts';
import { band, bandAt, depthInfo, qiAt } from '../core/map/depth.ts';
import { known } from '../core/map/fog.ts';
import { gateOf, placeKindOf, shownRealm, stepOut } from '../core/map/gate.ts';
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
import { areaById, placeById, type MapPlace, type RegionMap } from '../core/map/region.ts';
import { pin, stopHere } from '../core/map/travel.ts';
import { priceWords } from '../core/purse.ts';
import { isMember } from '../core/resolver/names.ts';
import {
  buy,
  haggle,
  offerFor,
  priceToYou,
  repair,
  repairCost,
  sell,
  shelf,
  shopMonth,
} from '../core/shops.ts';
import type { GameState } from '../core/state.ts';
import { useGame } from './store.ts';

type Act = (change: Parameters<ReturnType<typeof useGame.getState>['mapAct']>[0]) => string | null;

interface Door {
  id: string;
  seal: string;
  name: string;
  sub: string;
  tag?: string;
  later?: boolean;
}

/** A place's top realm in words: the atlas writes a realm's id or its name. */
function topWords(top: string): string {
  const id = REALM_IDS.includes(top as RealmId) ? (top as RealmId) : realmIdFromName(top);
  return id ? realm(id).name : top;
}

/** A thing's name and rarity, a copy or an item. */
function ware(thing: string): { name: string; rarity: string; sub: string } {
  if (hasCopy(thing)) {
    const it = copyItem(thing);
    const title = copyTitle(thing);
    return { name: title[0]!.toUpperCase() + title.slice(1), rarity: it.rarity, sub: 'a copy' };
  }
  const it = item(thing);
  return { name: it.name, rarity: it.rarity, sub: `tier ${it.tier}` };
}

const STATE_WORDS: Record<string, string> = {
  unknown: 'you know none of it',
  rumored: 'you’ve heard of it',
  sketched: 'you have it Sketched',
  seen: 'you’ve seen it',
};

function doorsOf(s: GameState, p: MapPlace, info: PlaceKindInfo): [string, Door[]][] {
  const kind = placeKindOf(p);
  const shops: Door[] = p.shops.map((id) => {
    const sh = shopById(id);
    const k = SHOP_KIND_INFO[sh.kind];
    return {
      id,
      seal: k.hanzi.slice(0, 1),
      name: sh.name[0]!.toUpperCase() + sh.name.slice(1),
      sub: k.name,
      tag: k.members ? 'members' : k.money === 'silver' ? 'silver' : k.posted ? 'posted rates' : '',
    };
  });
  if (kind === 'gate') return [['Behind the gate', shops]];
  const trade = [...shops];
  if (info.changer)
    trade.push({
      id: 'changer',
      seal: '兑',
      name: 'Money changer',
      sub: 'a stone for 110 taels, 120 back',
    });
  const hear: Door[] = [];
  if (info.rumors === 'teahouse')
    hear.push({ id: 'talk', seal: '茶', name: 'Teahouse', sub: 'a pot of tea: one rumor a day' });
  if (info.rumors === 'elder')
    hear.push({
      id: 'talk',
      seal: '老',
      name: 'The village elder',
      sub: 'one rumor a day, for news of your own',
    });
  const maps = mapsAt(s, p.id);
  if (maps.length > 0)
    hear.push({
      id: 'maps',
      seal: '图',
      name: 'Map seller',
      sub: maps.length > 1 ? 'the region, and each kingdom' : 'the kingdom’s map',
    });
  if (info.guides > 0)
    hear.push({
      id: 'guides',
      seal: '导',
      name: 'Guides',
      sub: `${info.guides === 1 ? 'one' : info.guides} for hire, a stone a day`,
    });
  if (info.caravans > 0)
    hear.push({
      id: 'caravans',
      seal: '队',
      name: 'Caravans',
      sub: `${info.caravans === 1 ? 'one' : info.caravans} leaving a week`,
    });
  const rest: Door[] =
    info.bed === null
      ? []
      : [
          {
            id: 'bed',
            seal: '宿',
            name: kind === 'village' ? 'A bed in a barn' : 'Inn',
            sub: `you sleep here by rule: ${info.bed} taels a night`,
          },
        ];
  if (info.board) {
    const held = s.map?.postings.filter((x) => x.board === p.id && x.done).length ?? 0;
    hear.push({
      id: 'board',
      seal: '榜',
      name: 'Bounty board',
      sub: held ? `${held} to be paid here` : 'three postings a month',
      tag: held ? 'paid' : undefined,
    });
  }
  return (
    [
      ['Trade', trade],
      [info.guides > 0 ? 'Hear and hire' : 'Hear', hear],
      ['Rest', rest],
    ] as [string, Door[]][]
  ).filter(([, d]) => d.length > 0);
}

export function PlaceScreen({
  game,
  map,
  place,
  onMap,
}: {
  game: GameState;
  map: RegionMap;
  place: MapPlace;
  onMap: () => void;
}) {
  const mapAct = useGame((s) => s.mapAct);
  const [door, setDoor] = useState<string | null>(() => place.shops[0] ?? null);
  const [toast, setToast] = useState<string | null>(null);
  const kind = placeKindOf(place)!;
  const info = PLACE_KINDS[kind];
  const say = (t: string) => {
    setToast(t);
    window.setTimeout(() => setToast((cur) => (cur === t ? null : cur)), 2800);
  };
  const act: Act = (change) => {
    const why = mapAct(change);
    if (why) say(why);
    return why;
  };
  const groups = kind === 'site' ? [] : doorsOf(game, place, info);
  const doors = groups.flatMap(([, d]) => d);
  const open = doors.find((d) => d.id === door && !d.later) ?? null;
  const area = place.area ? areaById(map, place.area) : null;
  const qd = qiAt(map, [place.x, place.y]);
  const line = [
    kind === 'site' ? place.sub.replace('-', ' ') : info.name,
    TERRAIN_NAMES[place.terrain] ?? place.terrain,
    `qi density ${qd}, ${QI_NAMES[qd]}`,
    area?.name,
  ].filter(Boolean);

  return (
    <div className="place-screen">
      <div className="place-crumbs">
        <button type="button" className="place-back" onClick={onMap}>
          ← Map
        </button>
        <span>{map.name}</span>
        <button
          type="button"
          className="place-back is-quiet"
          onClick={() => {
            act(stepOut);
            onMap();
          }}
        >
          Step out
        </button>
      </div>
      <header className="place-head panel">
        <span className="place-seal">{place.seal}</span>
        <div>
          <h2>
            {place.name}
            <span className="hanzi">{place.hanzi}</span>
          </h2>
          {place.pinyin && <div className="place-pinyin">{place.pinyin}</div>}
          <div className="place-line">
            {line.join(' · ')}
            {place.top && (
              <>
                {' '}
                · top realm <b>{topWords(place.top)}</b>
              </>
            )}
          </div>
        </div>
        <div className="place-purse">
          <span>
            <b>{Math.floor(game.player.stones)}</b> low-grade
            {game.player.higherStones.mid > 0 && (
              <>
                {' '}
                · <b>{game.player.higherStones.mid}</b> mid
              </>
            )}
          </span>
          <span>
            <b>{Math.floor(game.player.silver)}</b> taels
          </span>
          <span>{worldWhen(game.calendar.day)}</span>
        </div>
      </header>
      {place.lore && <p className="place-lore">{place.lore}</p>}
      <GateStrip game={game} map={map} place={place} />
      {kind === 'site' ? (
        <SiteCounter game={game} map={map} place={place} act={act} onMap={onMap} />
      ) : (
        <div className="place-body">
          <nav className="place-doors panel" aria-label="Doors">
            {groups.length === 0 && <p className="muted">Nothing here trades with outsiders.</p>}
            {groups.map(([label, ds]) => (
              <div key={label} className="place-group">
                <div className="map-label">{label}</div>
                {ds.map((d) => (
                  <button
                    key={d.id}
                    type="button"
                    className={`place-door${d.later ? ' is-later' : ''}`}
                    aria-pressed={door === d.id}
                    disabled={d.later}
                    onClick={() => setDoor(d.id)}
                  >
                    <span className={`place-seal is-small${d.later ? ' is-dim' : ''}`}>
                      {d.seal}
                    </span>
                    <span>
                      <span className="place-door-name">{d.name}</span>
                      <span className="place-door-sub">{d.sub}</span>
                    </span>
                    <span className="place-door-tag">{d.tag}</span>
                  </button>
                ))}
              </div>
            ))}
          </nav>
          <section className="place-counter panel" aria-live="polite">
            {open ? (
              <>
                <div className="place-counter-head">
                  <span className="place-seal">{open.seal}</span>
                  <div>
                    <h3>{open.name}</h3>
                    <div className="place-sub">{open.sub}</div>
                  </div>
                </div>
                <Counter game={game} map={map} place={place} door={open.id} act={act} say={say} />
              </>
            ) : (
              <p className="place-note">
                Pick a door. Shops keep their stock for the month, and what you bought stays bought.
              </p>
            )}
          </section>
        </div>
      )}
      {toast && <div className="place-toast panel">{toast}</div>}
    </div>
  );
}

function GateStrip({ game, map, place }: { game: GameState; map: RegionMap; place: MapPlace }) {
  const kind = placeKindOf(place);
  if (kind === 'site' || kind === 'hall') return null;
  if (kind === 'village')
    return (
      <div className="place-gate panel">
        <span className="place-seal is-small is-dim">村</span>
        <p>No wall and no watch: a dog barks, and the fields go on working.</p>
      </div>
    );
  const g = gateOf(game, map, place);
  const realm = shownRealm(game);
  const words =
    g.kind === 'member'
      ? 'You showed the token at the gate, and the guards stepped aside.'
      : g.kind === 'waived'
        ? `The watch read you at ${realm}, knew your name and waved you through without the toll.`
        : g.kind === 'toll'
          ? `The watch read you at ${realm} and took the toll, ${g.toll} low-grade. Nobody knew your face.`
          : g.kind === 'refused'
            ? `The watch knows your face now; you came in on a bribe.`
            : `The watch read you at ${realm} and let you through. Nobody knew your face.`;
  return (
    <div className={`place-gate panel${g.kind === 'refused' ? ' is-bad' : ''}`}>
      <span className="place-seal is-small">{kind === 'gate' ? '门' : '卫'}</span>
      <p>{words}</p>
    </div>
  );
}

function Counter({
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
  if (place.shops.includes(door))
    return <ShopCounter key={door} game={game} shopId={door} act={act} say={say} />;
  switch (door) {
    case 'changer':
      return <ChangerCounter game={game} place={place} act={act} />;
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
    case 'bed': {
      const bed = PLACE_KINDS[placeKindOf(place)!].bed;
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

// ---------------------------------------------------------------- a shop

function ShopCounter({
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
  const sh = shopById(shopId);
  const kinfo = SHOP_KIND_INFO[sh.kind];
  const tabs: [string, string][] = kinfo.posted
    ? [['sell', 'Sell']]
    : [
        ['buy', 'Buy'],
        ['sell', 'Sell'],
      ];
  if (kinfo.repairs) tabs.push(['mend', 'Mend']);
  const [tab, setTab] = useState(tabs[0]![0]);
  const silver = kinfo.money === 'silver';
  const cost = (p: number) => (silver ? `${Math.round(p * 10) / 10} taels` : priceWords(p));
  const sm = shopMonth(game.world, shopId, game.calendar.day);
  const haggled = sm.haggle?.day === Math.floor(game.calendar.day) ? sm.haggle.off : null;
  const left = Math.max(0, kinfo.purse - sm.paid);
  // A token gets you through a sect's gate; its shop serves members only (core/shops.ts).
  if (kinfo.members && sh.power && !isMember(game.world, game.player.id, sh.power))
    return <p className="place-note">It sells only to its own.</p>;
  const lots = shelf(game, shopId);
  const held = Object.entries(game.player.items)
    .filter(([, n]) => n > 0)
    .map(([thing, n]) => ({ thing, n, offer: offerFor(game, shopId, thing) }))
    .filter((x) => x.offer.ok);
  const worn = [
    ...new Set([
      ...Object.keys(game.player.wear),
      ...Object.values(game.player.gear)
        .flat()
        .filter((x): x is string => typeof x === 'string'),
      ...Object.keys(game.player.items).filter((t) => (game.player.items[t] ?? 0) > 0),
    ]),
  ]
    .map((thing) => ({ thing, cost: repairCost(game, thing) }))
    .filter((x) => x.cost !== null);
  return (
    <>
      <div className="place-keeper">
        <span>
          The {kinfo.name}’s keeper · they can pay out {silver ? `${left} taels` : priceWords(left)}{' '}
          this month
        </span>
        {kinfo.posted ? (
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
                const r = haggle(s, shopId);
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
      {tab === 'buy' && (
        <div className="place-rows">
          {lots.length === 0 && <p className="muted">The shelf is bare until the month turns.</p>}
          {lots.map((l) => {
            const w = ware(l.thing);
            return (
              <div key={l.slot} className="place-row">
                <i className="place-dot" style={{ background: `var(--rarity-${w.rarity})` }} />
                <span>
                  <span className="place-row-name">
                    {w.name}
                    {l.n > 1 ? ` ×${l.n}` : ''}
                  </span>{' '}
                  <span className="place-sub">· {w.sub}</span>
                </span>
                <span className="place-price">{cost(priceToYou(game, shopId, l))}</span>
                <button
                  type="button"
                  className="place-btn"
                  onClick={() =>
                    act((s) => {
                      const r = buy(s, shopId, l.slot);
                      if (r.ok) say(`Bought ${w.name}.`);
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
      )}
      {tab === 'sell' && (
        <>
          <div className="place-rows">
            {held.length === 0 && <p className="muted">You carry nothing they buy.</p>}
            {held.map(({ thing, n, offer }) => {
              const w = ware(thing);
              return (
                <div key={thing} className="place-row">
                  <i className="place-dot" style={{ background: `var(--rarity-${w.rarity})` }} />
                  <span>
                    <span className="place-row-name">{w.name}</span>{' '}
                    <span className="place-sub">· you hold {n}</span>
                  </span>
                  <span className="place-price">{offer.ok ? cost(offer.each) : ''}</span>
                  <button
                    type="button"
                    className="place-btn"
                    onClick={() =>
                      act((s) => {
                        const r = sell(s, shopId, thing, 1);
                        if (r.ok) say(`Sold ${w.name}.`);
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
              ? 'The bounty office buys cores and beast parts at half their price.'
              : 'They buy at 40% of their own price, 60% once their power favors you.'}
          </p>
        </>
      )}
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
                      const r = repair(s, shopId, thing);
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
      `you hold ${game.player.higherStones.mid} mid`,
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
  const elder = PLACE_KINDS[placeKindOf(place)!].rumors === 'elder';
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
                    if (r.ok) say(`${m.name}: its ground is Sketched on your map.`);
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
  return (
    <>
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
                      if (r.ok) say(`Paid ${p.pay} low-grade.`);
                      return r;
                    })
                  }
                >
                  Claim · {p.pay} low
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
                {taken ? 'Taken' : `Take · pays ${p.pay}`}
              </button>
            </div>
          );
        })}
      </div>
    </>
  );
}

function SiteCounter({
  game,
  map,
  place,
  act,
  onMap,
}: {
  game: GameState;
  map: RegionMap;
  place: MapPlace;
  act: Act;
  onMap: () => void;
}) {
  const at: [number, number] = [place.x, place.y];
  const d = depthInfo(map, at);
  const b = band(bandAt(map, at));
  return (
    <section className="place-counter panel">
      <div className="map-label">What’s here</div>
      <p className="place-sub">
        {d.name}: {b ? `beasts of ${b.name} · ${b.finds} finds` : 'nothing past mortal beasts'}
      </p>
      <div className="place-features">
        {place.features.map((f) => (
          <span key={f.name} className="place-feature">
            {f.name}
            {f.tags.length > 0 && <i>{f.tags.join(', ')}</i>}
          </span>
        ))}
      </div>
      <p className="place-note">
        <b>Inside, a scene waits for P3.9.</b> Until then a site is a place to stand:{' '}
        {['cave', 'hut', 'shrine'].includes(place.sub)
          ? 'your wheel sleeps here by rule, as shelter you have found, '
          : ''}
        and P3.7’s encounters read its band.
      </p>
      <div className="place-actions">
        <button
          type="button"
          className="place-btn is-primary"
          onClick={() => {
            act(stopHere);
            onMap();
          }}
        >
          Stay and cultivate here
        </button>
        <button
          type="button"
          className="place-btn"
          disabled={game.map!.pins.some(
            (p) => p[0] === Math.round(place.x) && p[1] === Math.round(place.y),
          )}
          onClick={() => act((s) => pin(s, at))}
        >
          Pin it
        </button>
        <button type="button" className="place-btn" onClick={onMap}>
          Back to the map
        </button>
      </div>
    </section>
  );
}
