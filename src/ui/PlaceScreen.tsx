// A place's own screen (design § The world: Wherever you like; P3.6b's look study,
// docs/mockups/place-screen-study.html): the Map one step back, the place's head and lore, the gate
// strip, its doors on the left grouped by what they are for, and the open door's counter beside them.
// Everything done in a place is done here: its shops on P3.5's calls, the teahouse, the map seller,
// guides, caravans, the money changer and the bed you sleep in by rule.
import { QuestOffers } from './QuestOffers.tsx';
import { CommissionCounter } from './CommissionCounter.tsx';
import { hasCommissionTab } from './commissionWords.ts';
import { useEffect, useState } from 'react';
import { meetCodex } from '../core/codex.ts';
import { endGuide, lookAt } from './guide.ts';
import { COPY_FORM_WORDS, copyForm, copyItem, copyTitle, hasCopy } from '../content/copies.ts';
import { item, stackSize } from '../content/items.ts';
import { PLACE_KIND_INFO, type PlaceKindInfo } from '../content/map/places.ts';
import { capitalize, possessive } from '../content/words.ts';
import { QI_NAMES, TERRAIN_NAMES } from '../content/map/travel.ts';
import { REALM_IDS, realm, realmIdFromName, stageName, type RealmId } from '../content/realms.ts';
import {
  doorsAt,
  keeperName,
  SHOP_KIND_INFO,
  shop as shopById,
  STREETS,
  type Door as MarketDoor,
} from '../content/shops.ts';
import { worldWhen } from '../core/chronicle.ts';
import { encounterTemplate } from '../content/encounters/index.ts';
import {
  claimPosting,
  dropPosting,
  hasBoard,
  isMissionHall,
  postingsAt,
  takePosting,
} from '../core/map/board.ts';
import { jobsAt } from '../core/jobs.ts';
import { WorkHere } from './PostsPanel.tsx';
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
import { mapOf, pin, stopHere } from '../core/map/travel.ts';
import {
  lotSize,
  market,
  marketOfShop,
  prosperityOf,
  prosperityWord,
  seenIn,
  shopPurse,
  supplyOf,
  writtenProsperity,
} from '../core/markets.ts';
import { whyOf } from '../core/making.ts';
import { priceOf as priceOfThing } from '../core/prices.ts';
import { gradeCount, pay, priceWords, stonesOf, stonesWords } from '../core/purse.ts';
import { buyChapter, hallTerms, pavilion, pavilionChapters, titheFor } from '../core/halls.ts';
import { lawHallAt, liftByPaying, marksHere, yourMark } from '../core/guarded.ts';
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
  trialThisMonth,
} from '../core/joining.ts';
import {
  becomeGuest,
  donate,
  donationPoints,
  dwellingWords,
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
import { farmsAt, plotSpot } from '../core/map/fields.ts';
import { go } from './nav.ts';
import { useGame } from './store.ts';
import { copyManual } from '../content/copies.ts';
import { CRAFTS, recipe, type CraftId } from '../content/crafts.ts';
import { planInputs } from '../core/crafts.ts';
import { CRAFT_DEALS, CRAFT_GRADES, CRAFT_RENOWN, CRAFTER } from '../content/styles.ts';
import { knownCrafts } from '../core/craftRenown.ts';
import {
  buyAtGuild,
  certify,
  examines,
  examinesTo,
  examRows,
  guildCounter,
} from '../core/craftGrade.ts';
import { seatGrade } from '../core/organizations.ts';
import { formatPercent } from './format.ts';
import {
  brokerAt,
  claim,
  claimsHere,
  densityOf,
  dwellingAt,
  dwellingNoun,
  offersAt,
  stepMult,
  takeFromBroker,
} from '../core/dwellings.ts';
import { sitDown, standUp, useFurnace } from './furnace.ts';
import { ForgeScene } from './ForgeScene.tsx';
import { FurnaceScene } from './FurnaceScene.tsx';
import { TalismanScene } from './TalismanScene.tsx';
import { groundPartners, sparWhy } from '../core/spar.ts';
import { askSpar } from '../core/playFight.ts';
import { cue } from './cues.ts';

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
    // A book at tier 1, a jade slip from tier 2 (E3, Methods in the market).
    const sub = COPY_FORM_WORDS[copyForm(thing)];
    return { name: title[0]!.toUpperCase() + title.slice(1), rarity: it.rarity, sub };
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

function doorsOf(
  s: GameState,
  map: RegionMap,
  p: MapPlace,
  info: PlaceKindInfo,
): [string, Door[]][] {
  const kind = placeKindOf(p);
  // The power whose seat this is: its way in and a gift for an outsider, its elders' hall for a
  // member (the organizations checkpoint).
  const seat = seatPowerAt(map, p);
  const own: Door[] = [];
  if (seat) {
    const hall = eldersHall(s, seat);
    const entry = entryOf(s, seat);
    // Its training ground, where a member asks a senior, a fellow disciple or a junior to spar
    // (Fights you play).
    if (hall)
      own.push({
        id: 'ground',
        seal: '武',
        name: 'Training ground',
        sub: 'spar a senior, a fellow disciple or a junior',
        tag: 'members',
      });
    if (hall && !hall.guest)
      own.push({
        id: 'elders',
        seal: hall.title.hanzi.slice(0, 1),
        name: hall.title.name,
        sub: hall.trial?.open
          ? 'the inner trial is held this month'
          : 'an elder’s lesson, a protector, being released',
        tag: hall.trial?.open ? 'trial' : 'members',
      });
    if (entry)
      own.push({
        id: 'join',
        seal: entry.title.hanzi.slice(0, 1),
        name: entry.title.name,
        sub: entry.shut ?? entry.sub,
      });
    if (!hall)
      own.push({ id: 'gift', seal: '礼', name: 'Offer a gift', sub: 'remembered as tribute' });
    // A crafting guild examines crafters and sells its area's common styles (K6).
    if (examines(seat)) {
      own.push({
        id: 'exam',
        seal: '考',
        name: 'Examination hall',
        sub: 'one test batch at its bench for a grade badge',
      });
      own.push({
        id: 'counter',
        seal: '艺',
        name: 'The guild’s counter',
        sub: 'the common styles, sold openly',
      });
    }
  }
  const ownGroup: [string, Door[]] = [seat ? capitalize(theName(seat)) : '', own];
  // A door is a district, or a firm, a hall or the office alone (E5).
  const shops: Door[] = doorsAt(p.id).map((d) => {
    const k = SHOP_KIND_INFO[d.kind];
    const st = STREETS[d.kind];
    return {
      id: d.id,
      seal: (st?.hanzi ?? k.hanzi).slice(0, 1),
      name: capitalize(d.name),
      sub: st ? `${d.count === 1 ? 'one shop' : `${d.count} shops`} · ${st.sells}` : k.name,
      tag: k.members ? 'members' : k.money === 'silver' ? 'silver' : k.posted ? 'posted rates' : '',
    };
  });
  // Its law hall, where a face it marked makes restitution (O5).
  const mark = isOrganization(p.id) ? yourMark(s, p.id) : null;
  if (mark)
    shops.push({
      id: 'law-hall',
      seal: '律',
      name: 'Law hall',
      sub: `restitution for ${mark.method}`,
      tag: 'marked',
    });
  // A power's own chapters, sold to its disciples by seat (O2).
  if (isOrganization(p.id) && pavilionChapters(p.id).length > 0)
    shops.push({
      id: 'pavilion',
      seal: '经',
      name: 'Scripture pavilion',
      sub: `${possessive(capitalize(theName(p.id)), '’')} own chapters, by seat`,
      tag: 'members',
    });
  // Work (O4): the posts and hires taken here, and a sect's mission hall, its bounty office.
  const work: Door[] = [];
  const jobs = jobsAt(p.id, s.map ? mapOf(s) : null);
  if (jobs.length > 0)
    work.push({
      id: 'work',
      seal: '差',
      name: 'Work',
      sub: `${jobs.length === 1 ? 'one post' : `${jobs.length} posts and hires`}, by the shift`,
    });
  if (isMissionHall(p.id)) {
    const held = s.map?.postings.filter((x) => x.board === p.id && x.done).length ?? 0;
    work.push({
      id: 'board',
      seal: '任',
      name: 'Mission hall',
      sub: held ? `${held} to be paid here` : 'the sect’s postings, paid in contribution',
      tag: held ? 'paid' : 'members',
    });
  }
  // A village or town rents and sells plots (K8).
  const land: Door[] = [];
  if (farmsAt(p)) {
    const held = s.player.crafts.plots.filter((x) => x.place === p.id).length;
    land.push({
      id: 'fields',
      seal: '田',
      name: 'Fields',
      sub: held
        ? held === 1
          ? 'your plot here'
          : 'your ' + held + ' plots here'
        : 'a plot of nine beds, rented or bought',
    });
  }
  if (kind === 'gate')
    return ([['Behind the gate', shops], ownGroup, ['Work', work]] as [string, Door[]][]).filter(
      ([, d]) => d.length > 0,
    );
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
  // The broker 牙行 lets rooms, chambers and courtyards; a village its farmhouses (K9).
  const broker = brokerAt(p);
  if (broker) {
    const mine = dwellingAt(s.player, p.id);
    hear.push({
      id: 'broker',
      seal: broker === 'village' ? '舍' : '牙',
      name: broker === 'village' ? 'Farmhouse to let' : 'Broker 牙行',
      sub: mine
        ? `your ${dwellingNoun(s, mine)} here`
        : broker === 'village'
          ? 'a house and two fields of its own'
          : 'rooms, chambers and courtyards',
      tag: mine ? 'yours' : undefined,
    });
  }
  if (hasBoard(p) && !isMissionHall(p.id)) {
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
      ownGroup,
      ['Work', work],
      ['Land', land],
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
  const [door, setDoor] = useState<string | null>(() => doorsAt(place.id)[0]?.id ?? null);
  // Inside a place, its doors' guide can fire (ui/guide.ts).
  useEffect(() => {
    lookAt({ inside: true });
    return () => lookAt({ inside: false, shop: false });
  }, []);
  const [toast, setToast] = useState<string | null>(null);
  const kind = placeKindOf(place)!;
  const info = PLACE_KIND_INFO[kind];
  const say = (t: string) => {
    setToast(t);
    window.setTimeout(() => setToast((cur) => (cur === t ? null : cur)), 2800);
  };
  const act: Act = (change) => {
    const why = mapAct(change);
    if (why) say(why);
    return why;
  };
  const groups = kind === 'site' ? [] : doorsOf(game, map, place, info);
  const doors = groups.flatMap(([, d]) => d);
  const open = doors.find((d) => d.id === door && !d.later) ?? null;
  const area = place.area ? areaById(map, place.area) : null;
  const qd = qiAt(map, [place.x, place.y]);
  // A dwelling of yours here reads at its own density, the land's beside it (the crafts checkpoint).
  const ownHere = dwellingAt(game.player, place.id);
  // A place's prosperity names its kind: a lean town, a thriving city (design § Economy, Prosperity).
  const prosperity = prosperityOf(game.world, place.id, game.calendar.day);
  const usual = writtenProsperity(place.id);
  const line = [
    kind === 'site'
      ? place.sub.replace('-', ' ')
      : `${prosperityWord(prosperity)} ${info.name}` +
        (prosperity === usual ? '' : ` (usually ${prosperityWord(usual)})`),
    TERRAIN_NAMES[place.terrain] ?? place.terrain,
    densityWords(qd, ownHere ? densityOf(game, ownHere) : qd),
    area?.name,
  ].filter(Boolean);
  // The market's biggest gap and its cause (design § Economy, People make and use, the guards).
  const here = kind === 'site' ? undefined : market(place.id);
  const why = here ? whyOf(game.world, here, game.calendar.day) : null;
  const seat = kind === 'site' ? null : seatPowerAt(map, place);

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
          {why && <div className="place-why">{why}</div>}
          {game.map?.inside === place.id && dwellingWords(game) && (
            <div className="place-why">{dwellingWords(game)}</div>
          )}
          {seat && trialThisMonth(game, seat) && (
            <div className="place-why">
              The inner trial is held this month: sit it at the{' '}
              {eldersHall(game, seat)!.title.name.toLowerCase()}.
            </div>
          )}
        </div>
        <div className="place-purse">
          <span>
            {stonesWords(stonesOf(game.player))
              .split(' · ')
              .map((part, i) => {
                const [n, grade] = part.split(' ');
                return (
                  <span key={grade}>
                    {i > 0 && ' · '}
                    <b>{n}</b> {grade}
                  </span>
                );
              })}
          </span>
          <span>
            <b>{Math.floor(game.player.silver)}</b> taels
          </span>
          <span>{worldWhen(game.calendar.day)}</span>
        </div>
      </header>
      {place.lore && <p className="place-lore">{place.lore}</p>}
      <GateStrip game={game} map={map} place={place} />
      <MarkStrip game={game} place={place} />
      {kind === 'site' ? (
        <SiteCounter game={game} map={map} place={place} act={act} onMap={onMap} />
      ) : (
        <div className="place-body">
          <nav className="place-doors panel" aria-label="Doors" data-guide="doors">
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
                    onClick={() => {
                      endGuide('place-doors');
                      setDoor(d.id);
                    }}
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
  if (kind === 'site') return null;
  if (kind === 'hall') {
    const g = gateOf(game, map, place);
    return g.words ? (
      <div className="place-gate panel is-bad">
        <span className="place-seal is-small">敌</span>
        <p>{g.words}</p>
      </div>
    ) : null;
  }
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

/** How many and who a law hall walks the roads as, by its hunt's chapter (O5). */
const PARTY_WORDS = { 1: 'two outer disciples', 2: 'two inner disciples', 3: 'an elder' } as const;

/**
 * A face a power marked for its leaked method, while you stand in its sphere or at its seat (O5's
 * mockup): the method, what its people demand at your standing, and its law hall on the roads.
 */
function MarkStrip({ game, place }: { game: GameState; place: MapPlace }) {
  const map = game.map ? mapOf(game) : null;
  const marks = marksHere(game, [place.x, place.y], place.id, map);
  if (marks.length === 0) return null;
  return (
    <>
      {marks.map((m) => {
        const law = lawHallAt(game.world, [m.power], [place.x, place.y], game.calendar.day, map);
        const seat = place.id === m.power;
        return (
          <div key={m.power} className="place-gate place-mark panel is-bad">
            <span className="place-seal is-small">印</span>
            <div>
              <p>
                <b>Marked by {theName(m.power)}</b>
              </p>
              <p className="place-sub">
                {capitalize(m.method)}, chapter {m.chapter} ·{' '}
                {m.onSight
                  ? 'hostile: its people take you on sight'
                  : `a fine of ${m.fineWords}${m.slip ? ' and the slip' : ''}`}
              </p>
              {seat ? (
                <p className="place-sub">Its disciples know your face here.</p>
              ) : (
                law && (
                  <p className="place-sub">
                    Its law hall walks these roads: {PARTY_WORDS[law.chapter]}.
                  </p>
                )
              )}
            </div>
          </div>
        );
      })}
    </>
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
  // A craft's shop posts commissions and makes to order (K12).
  if (hasCommissionTab(game, shopId)) tabs.push(['commission', 'Commission 托']);
  const [tab, setTab] = useState(tabs[0]![0]);
  const silver = kinfo.money === 'silver';
  // A counter open: the first buy's guide can fire, and the codex meets the shops.
  const applyLife = useGame((s) => s.applyLife);
  useEffect(() => {
    lookAt({ shop: true });
    applyLife((s) => meetCodex(s, 'shop'));
    return () => lookAt({ shop: false });
  }, [applyLife]);
  // A sect's hall: its own pay in its currency, an outsider at friendly at the open counter (O2).
  const terms = hallTerms(game, sh);
  const house = sh.power && isOrganization(sh.power) ? houseOf(sh.power) : null;
  const yours =
    terms?.as === 'member' && house ? membership(game.world, game.player.id, house) : undefined;
  const currency = house ? organization(house).preset.currency.name : '';
  // What a harsh power's lower seats keep of a sale after its tithe (the checkpoint's fix).
  const tithe = titheFor(game, sh);
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
  const lots = shelf(game, shopId).sort((a, b) => Number(!!b.standing) - Number(!!a.standing));
  // What you carry and the copies on your bookcase, whatever this shop will buy.
  const held = [...Object.entries(game.player.items), ...Object.entries(game.player.copies)]
    .filter(([, n]) => n > 0)
    .map(([thing, n]) => ({ thing, n, offer: offerFor(game, shopId, thing) }))
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
    .map((thing) => ({ thing, cost: repairCost(game, thing) }))
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
      {terms?.as === 'guest' && (
        <p className="place-sub">
          A guest elder’s terms: the market’s price in stones, the members’ lines among them.
        </p>
      )}
      {terms?.as === 'counter' && (
        <p className="place-sub">
          The open counter: ×1.25 in stones, never the members’ lines or the chapters.
          {house && guestOffered(game, house) && (
            <>
              {' '}
              <button
                type="button"
                className="place-btn"
                onClick={() =>
                  act((s) => {
                    const r = becomeGuest(s, house);
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
      {tab === 'buy' && (
        <div className="place-rows" data-guide="buy">
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
                    ? `${cost(priceToYou(game, shopId, l, 1))} each`
                    : cost(priceToYou(game, shopId, l))}
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
                          const r = buy(s, shopId, l.slot, k);
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
                <div key={thing} className="place-row">
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
                        const r = sell(s, shopId, thing, lotOf(thing, n));
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
  const lines = pavilion(game, power);
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
                    const r = buyChapter(s, power, l.thing);
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
      const r = donate(s, power, gift);
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
          {guestOffered(game, power) && !membership(game.world, game.player.id, power) && (
            <button
              type="button"
              className="place-btn"
              onClick={() =>
                act((s) => {
                  const r = becomeGuest(s, power);
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
  const m = markOn(game, shopId, thing, n);
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
  const e = entryOf(game, power);
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
            const r = askToJoin(s, power);
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
  const floor = giftFloor(game);
  const counted = giftThisMonth(game, power);
  const give = (gift: { stones?: number; things?: Record<string, number> }) =>
    act((s) => {
      const r = offerGift(s, power, gift);
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
  const h = eldersHall(game, power);
  if (!h) return <p className="place-note">The elders see only their own.</p>;
  const release = releaseView(game, power);
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
                const r = takeLesson(s, power);
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
                const r = engageProtector(s, power);
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
                  const r = innerTrial(s, power);
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
                    const r = askRelease(s, power);
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
  const held = dwellingAt(game.player, place.id);
  const claims = game.map?.inside === place.id ? claimsHere(game) : [];
  const valley = claims.findIndex((c) => c.kind === 'valley');
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
        <b>Nothing more to do inside yet.</b> It is a place to stand:{' '}
        {['cave', 'hut', 'shrine'].includes(place.sub)
          ? 'your wheel sleeps here by rule, as shelter you have found, '
          : ''}
        and what you meet here comes at its band.
      </p>
      {held && (
        <p className="place-note">
          <b>Your {dwellingNoun(game, held)}.</b> Its store, land and works are on the Dwelling
          screen.{' '}
          <button type="button" className="link-button" onClick={() => go('dwelling')}>
            Open it
          </button>
        </p>
      )}
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
        {valley >= 0 && (
          <button
            type="button"
            className="place-btn"
            disabled={!!claims[valley]!.why}
            title={claims[valley]!.why ?? undefined}
            onClick={() => act((s) => claim(s, valley))}
          >
            Claim it: a hidden valley 秘谷
          </button>
        )}
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

/** A place head's qi density, a dwelling's raised one with the land's beside it. */
function densityWords(land: number, at: number): string {
  return at === land
    ? `qi density ${land}, ${QI_NAMES[land]}`
    : `qi density ${at}, ${QI_NAMES[at]} (the land's ${land})`;
}
