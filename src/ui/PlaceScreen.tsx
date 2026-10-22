// A place's own screen (design § The travel map, Entering a place; A6, docs/mockups/place-kinds-
// study.html, the place layouts talk, Jan's calls). One shell for every kind: the place's banner
// painting across the top with its head over the left, and under it a layout by its kind
// (`placeKindOf`). A city or town is the grid (Jadewater): group tabs, nine painted door cards and
// the picked door's preview with Enter and Go in. A faction's seat is the hall (Cloudstep): its
// front's tiles with the open hall under them, and Inside, members only, in the grid layout. A gate
// is the hall shut. A village and a wild site are the painting whole, their doors or doings along
// the bottom. Opening a door keeps the banner and changes only what is under it: until A6.1 gives
// each kind of door its room, Enter opens the door's counter (PlaceCounters.tsx) as a plain room.
import { useEffect, useState, type ReactNode } from 'react';
import { PLACE_KIND_INFO } from '../content/map/places.ts';
import { regionData } from '../content/map/index.ts';
import { capitalize } from '../content/words.ts';
import { QI_NAMES, TERRAIN_NAMES } from '../content/map/travel.ts';
import { REALM_IDS, realm, realmIdFromName, type RealmId } from '../content/realms.ts';
import { doorLine } from '../content/doorLines.ts';
import { band, bandAt, depthInfo, qiAt } from '../core/map/depth.ts';
import { accessOf, enterAt, gateOf, placeKindOf, shownRealm, stepOut } from '../core/map/gate.ts';
import { areaById, type MapPlace, type RegionMap } from '../core/map/region.ts';
import { liPerDay, mapOf, pin, stopHere } from '../core/map/travel.ts';
import { market, prosperityOf, prosperityWord, writtenProsperity } from '../core/markets.ts';
import { whyOf } from '../core/making.ts';
import { lawHallAt, marksHere } from '../core/guarded.ts';
import { eldersHall, seatPowerAt, trialThisMonth } from '../core/joining.ts';
import { dwellingWords, organization, theName } from '../core/organizations.ts';
import { membershipsView } from '../core/orgs/views.ts';
import { standingOf } from '../core/resolver/world.ts';
import type { GameState } from '../core/state.ts';
import { claim, claimsHere, densityOf, dwellingAt, dwellingNoun } from '../core/dwellings.ts';
import { endGuide, lookAt } from './guide.ts';
import { go } from './nav.ts';
import { useGame } from './store.ts';
import { useSettings } from './settings.ts';
import { Counter, type Act } from './PlaceCounters.tsx';
import { bannerArt, doorArt } from './placeArt.ts';
import {
  doorsOf,
  gapTouches,
  gridTabs,
  hallFront,
  insideTabs,
  layoutOf,
  memberOf,
  notables,
  sellsTags,
  STRIP_MOST,
  type Door,
  type Tab,
} from './placeDoors.ts';

/** A place's top realm in words: the atlas writes a realm's id or its name. */
function topWords(top: string): string {
  const id = REALM_IDS.includes(top as RealmId) ? (top as RealmId) : realmIdFromName(top);
  return id ? realm(id).name : top;
}

/** A place head's qi density, a dwelling's raised one with the land's beside it. */
function densityWords(land: number, at: number): string {
  return at === land
    ? `qi density ${land}, ${QI_NAMES[land]}`
    : `qi density ${at}, ${QI_NAMES[at]} (the land's ${land})`;
}

/** Where under the banner you are: the place's own layout, its power's hall, or Inside. */
type View = 'place' | 'hall' | 'inside';

interface Props {
  game: GameState;
  map: RegionMap;
  place: MapPlace;
  onMap: () => void;
  /** At a gated place's gate, shut out: the hall shut (the map lets you look, not go in). */
  shut?: boolean;
}

export function PlaceScreen({ game, map, place, onMap, shut = false }: Props) {
  const mapAct = useGame((s) => s.mapAct);
  const keyed = useSettings((s) => !!s.openRouterKey);
  const kind = placeKindOf(place)!;
  const layout = layoutOf(kind);
  // The power seated here: a hall's own, or a city's, a town's or a village's link to its hall.
  const power = seatPowerAt(map, place);
  const own = power === place.id;
  const [view, setView] = useState<View>(layout === 'hall' ? 'hall' : 'place');
  const [tab, setTab] = useState<string | null>(null);
  const [pick, setPick] = useState<string | null>(null);
  const [room, setRoom] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  // Inside a place, its doors' guide can fire (ui/guide.ts).
  useEffect(() => {
    lookAt({ inside: true });
    return () => lookAt({ inside: false, shop: false });
  }, []);
  const say = (t: string) => {
    setToast(t);
    window.setTimeout(() => setToast((cur) => (cur === t ? null : cur)), 2800);
  };
  const act: Act = (change) => {
    const why = mapAct(change);
    if (why) say(why);
    return why;
  };
  // Let in at a shut gate (a token, a seat): the gate opens and you go in, a hall from then on.
  const opens = shut && gateOf(game, map, place).kind !== 'shut';
  useEffect(() => {
    if (opens) mapAct((s) => enterAt(s, map, place));
  }, [opens, mapAct, map, place]);

  const doors = doorsOf(game, map, place);
  const member = memberOf(game, power);
  // A hall's doors: everything at a power's own seat, its own doors through a place's link.
  const hallDoors = own ? doors : doors.filter((d) => d.group === 'power');
  const go2 = (v: View) => {
    setView(v);
    setTab(null);
    setPick(null);
    setRoom(null);
  };
  const openDoor = (id: string) => {
    endGuide('place-doors');
    setRoom(id);
  };
  // The art a door or the banner reads: in a power's hall, its own, else that of the place its seat
  // stands in (the Guild's hall is painted with the City's sheets), else this place's.
  const home = power ? regionData(map.id)?.content.homes[power] : undefined;
  const artAt =
    view !== 'place' && power
      ? bannerArt(power)
        ? power
        : home && bannerArt(home)
          ? home
          : place.id
      : place.id;
  const whole = view === 'place' && (layout === 'village' || layout === 'site');

  // What's under the banner: a room when a door is open, else the view's layout.
  let under: ReactNode;
  const inRoom = room ? doors.find((d) => d.id === room) : undefined;
  if (inRoom && (view === 'inside' || (view === 'place' && layout === 'grid'))) {
    under = (
      <PlainRoom
        door={inRoom}
        back={view === 'inside' ? 'Inside' : place.name}
        keyed={keyed}
        onBack={() => setRoom(null)}
        art={doorArt(artAt, inRoom.art)}
      >
        <Counter game={game} map={map} place={place} door={inRoom.id} act={act} say={say} />
      </PlainRoom>
    );
  } else if (view === 'inside') {
    under = (
      <Grid
        tabs={insideTabs(hallDoors, power)}
        tab={tab}
        setTab={setTab}
        pick={pick}
        setPick={setPick}
        onEnter={openDoor}
        game={game}
        place={place}
        artAt={artAt}
        keyed={keyed}
      />
    );
  } else if (view === 'hall') {
    under = (
      <Hall
        game={game}
        map={map}
        place={place}
        power={power}
        doors={hallDoors}
        member={member && !shut}
        shut={shut}
        artAt={artAt}
        act={act}
        say={say}
        onInside={() => go2('inside')}
      />
    );
  } else if (layout === 'grid') {
    under = (
      <Grid
        tabs={gridTabs(doors)}
        tab={tab}
        setTab={setTab}
        pick={pick}
        setPick={setPick}
        onEnter={openDoor}
        game={game}
        place={place}
        artAt={artAt}
        keyed={keyed}
        link={
          power
            ? {
                label: `${capitalize(possessiveName(power))} hall`,
                hanzi: crestOf(organization(power).hanzi),
                run: () => go2('hall'),
              }
            : undefined
        }
      />
    );
  } else if (layout === 'village') {
    under = (
      <Village
        game={game}
        map={map}
        place={place}
        doors={doors.filter((d) => d.group !== 'power')}
        power={power}
        open={room}
        setOpen={setRoom}
        onHall={() => go2('hall')}
        onMap={onMap}
        act={act}
        say={say}
      />
    );
  } else {
    under = <Site game={game} map={map} place={place} act={act} onMap={onMap} />;
  }

  return (
    <div className={`place-screen is-${whole ? layout : view === 'place' ? 'grid' : 'hall'}`}>
      <Painting url={bannerArt(artAt)} whole={whole} place={place} />
      {whole ? (
        under
      ) : (
        <>
          <section className={`place-banner${view === 'hall' ? ' is-tall' : ''}`}>
            <Crumbs
              map={map}
              place={place}
              power={view !== 'place' ? power : null}
              inside={view === 'inside'}
              shut={shut}
              onMap={onMap}
              onPlace={view !== 'place' && !own ? () => go2('place') : undefined}
              onHall={view === 'inside' ? () => go2('hall') : undefined}
              act={act}
            />
            {view === 'hall' && power ? (
              <PowerHead game={game} map={map} place={place} power={power} />
            ) : view === 'inside' && power ? (
              <InsideHead game={game} power={power} />
            ) : (
              <PlaceHead game={game} map={map} place={place} />
            )}
            <span className="place-purse">
              <b>{Math.floor(game.player.silver).toLocaleString('en')}</b> taels
            </span>
          </section>
          <div className="place-under">
            {view === 'inside' ? (
              <InsideStrip game={game} power={power!} onFront={() => go2('hall')} />
            ) : (
              !shut && <GateStrip game={game} map={map} place={place} />
            )}
            <MarkStrip game={game} place={place} />
            {under}
          </div>
        </>
      )}
      {toast && <div className="place-toast panel">{toast}</div>}
    </div>
  );
}

/** A power's crest: its own word, the kind's word taken off (守灯宗 the lamp 灯, 万艺公会 艺). */
function crestOf(hanzi: string): string {
  const own = hanzi.replace(/(公会|宗|门|会|阁|寺|氏|府|洞|楼|国|宫|谷|派|殿|院|堂)$/, '');
  return own.slice(-1) || hanzi.slice(0, 1);
}

/** "the Myriad Crafts Guild’s", for a link's label. */
function possessiveName(power: string): string {
  const n = theName(power);
  return n.endsWith('s') ? `${n}’` : `${n}’s`;
}

// ---------------------------------------------------------------- the banner and the head

/** The place's painting: the banner's strip, or the whole screen for a village or wild site. */
function Painting({ url, whole, place }: { url?: string; whole: boolean; place: MapPlace }) {
  return (
    <div className={`place-painting${whole ? ' is-whole' : ''}${url ? '' : ' is-plain'}`}>
      {url ? (
        <img src={url} alt="" draggable={false} />
      ) : (
        <span className="place-painting-hz" aria-hidden="true">
          {place.hanzi}
        </span>
      )}
    </div>
  );
}

function Crumbs({
  map,
  place,
  power,
  inside,
  shut,
  onMap,
  onPlace,
  onHall,
  act,
}: {
  map: RegionMap;
  place: MapPlace;
  power: string | null;
  inside: boolean;
  shut: boolean;
  onMap: () => void;
  onPlace?: () => void;
  onHall?: () => void;
  act: Act;
}) {
  const own = power === place.id;
  return (
    <div className="place-crumbs">
      <button type="button" className="place-back" onClick={onMap}>
        ← World
      </button>
      <span>{map.name}</span>
      {(!power || !own) && (
        <>
          <span className="place-crumb-sep">›</span>
          {onPlace ? (
            <button type="button" className="link-button" onClick={onPlace}>
              {place.name}
            </button>
          ) : (
            <span>{place.name}</span>
          )}
        </>
      )}
      {power && (
        <>
          <span className="place-crumb-sep">›</span>
          {onHall ? (
            <button type="button" className="link-button" onClick={onHall}>
              {capitalize(theName(power))}
            </button>
          ) : (
            <span>{capitalize(theName(power))}</span>
          )}
        </>
      )}
      {inside && (
        <>
          <span className="place-crumb-sep">›</span>
          <span>Inside</span>
        </>
      )}
      {!shut && (
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
      )}
    </div>
  );
}

/** The head every place shares: seal, name, hanzi, pinyin, the line, the lore, the market's gap. */
function PlaceHead({ game, map, place }: { game: GameState; map: RegionMap; place: MapPlace }) {
  const kind = placeKindOf(place)!;
  const info = PLACE_KIND_INFO[kind];
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
    <header className="place-head">
      <div className="place-name-row">
        <span className="place-seal">{place.seal}</span>
        <div>
          <h2>
            {place.name}
            <span className="hanzi">{place.hanzi}</span>
          </h2>
          {place.pinyin && (
            <div className="place-pinyin">
              {place.pinyin}
              {seat && seat !== place.id && <> · seat of {theName(seat)}</>}
            </div>
          )}
        </div>
      </div>
      <div className="place-line">
        {line.join(' · ')}
        {place.top && (
          <>
            {' '}
            · top realm <b>{topWords(place.top)}</b>
          </>
        )}
      </div>
      {place.lore && <p className="place-lore">{place.lore}</p>}
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
    </header>
  );
}

/**
 * A power's head (Cloudstep's banner): its crest, name, hanzi and pinyin, its chips, its lore, and
 * your standing with it at the top right.
 */
function PowerHead({
  game,
  map,
  place,
  power,
}: {
  game: GameState;
  map: RegionMap;
  place: MapPlace;
  power: string;
}) {
  const org = organization(power);
  const own = power === place.id;
  const access = own ? accessOf(map, place.id) : null;
  const chips = [
    capitalize(org.type),
    own && place.area ? areaById(map, place.area)?.name : own ? null : `at ${place.name}`,
    access?.array ? `array: ${realm(access.array).name}` : own && !place.gated ? 'no gate' : null,
  ].filter(Boolean) as string[];
  const you = membershipsView(game).find((m) => m.power === organization(power).id);
  const standing = standingOf(game.world, power, game.player.id, game.calendar.day);
  return (
    <>
      <header className="place-head is-power">
        <span className="place-crest">{crestOf(org.hanzi)}</span>
        <h2>
          {own ? place.name : capitalize(org.name)}
          <span className="hanzi">{own ? place.hanzi : org.hanzi}</span>
        </h2>
        <div className="place-pinyin">{own ? place.pinyin : org.row.pinyin}</div>
        <div className="place-chips">
          {chips.map((c) => (
            <span key={c}>{c}</span>
          ))}
        </div>
        {own && place.lore && <p className="place-lore">{place.lore}</p>}
      </header>
      <dl className="place-standing panel">
        <div>
          <dt>You</dt>
          <dd>{you ? you.title.name.toLowerCase() : 'an outsider'}</dd>
        </div>
        <div>
          <dt>Standing</dt>
          <dd>{standing.word}</dd>
        </div>
        <div>
          <dt>{capitalize(org.preset.currency.name)}</dt>
          <dd>{you ? Math.round(you.balance * 10) / 10 : '—'}</dd>
        </div>
        <div>
          <dt>Your realm</dt>
          <dd>{shownRealm(game)}</dd>
        </div>
      </dl>
    </>
  );
}

/** Inside a power: its seal, name and your seat, short, so the grid has the room. */
function InsideHead({ game, power }: { game: GameState; power: string }) {
  const org = organization(power);
  const you = membershipsView(game).find((m) => m.power === org.id);
  return (
    <header className="place-head">
      <div className="place-name-row">
        <span className="place-seal">{crestOf(org.hanzi)}</span>
        <div>
          <h2>
            {capitalize(org.name)}
            <span className="hanzi">{org.hanzi}</span>
          </h2>
          <div className="place-pinyin">{org.row.pinyin} · inside</div>
        </div>
      </div>
      {you && (
        <div className="place-line">
          {capitalize(org.type)} · yours: <b>{you.title.name.toLowerCase()}</b> ·{' '}
          {Math.round(you.balance * 10) / 10} {you.currency}
        </div>
      )}
    </header>
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

function InsideStrip({
  game,
  power,
  onFront,
}: {
  game: GameState;
  power: string;
  onFront: () => void;
}) {
  const you = membershipsView(game).find((m) => m.power === organization(power).id);
  return (
    <div className="place-gate panel">
      <span className="place-seal is-small">内</span>
      <p>
        Inside {theName(power)}
        {you ? `, as ${you.title.name.toLowerCase()}` : ''}. Its halls are open to you.
      </p>
      <button type="button" className="link-button place-gate-end" onClick={onFront}>
        ‹ The front
      </button>
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
            <p>
              <b>Marked by {theName(m.power)}</b> · {capitalize(m.method)}, chapter {m.chapter} ·{' '}
              {m.onSight
                ? 'hostile: its people take you on sight'
                : `a fine of ${m.fineWords}${m.slip ? ' and the slip' : ''}`}
              {seat
                ? ' · Its disciples know your face here.'
                : law
                  ? ` · Its law hall walks these roads: ${PARTY_WORDS[law.chapter]}.`
                  : ''}
            </p>
          </div>
        );
      })}
    </>
  );
}

// ---------------------------------------------------------------- a door card

/** A painted door card: its scene from the place's sheet (the plain card, hatched, until then). */
function DoorCard({
  door,
  art,
  picked,
  onClick,
  onDoubleClick,
  style,
}: {
  door: Door;
  art?: string;
  picked: boolean;
  onClick: () => void;
  onDoubleClick?: () => void;
  style?: React.CSSProperties;
}) {
  return (
    <button
      type="button"
      className={`place-card${art ? '' : ' is-plain'}${door.later ? ' is-later' : ''}`}
      aria-pressed={picked}
      onClick={onClick}
      onDoubleClick={onDoubleClick}
      style={style}
    >
      <span className="place-card-pic" data-hz={door.hanzi ?? door.seal}>
        {art && <img src={art} alt="" draggable={false} loading="lazy" />}
      </span>
      <span className="place-card-label">
        <span className="place-card-seal">{door.seal}</span>
        <span className="place-card-text">
          <span className="place-card-name">{door.name}</span>
          <span className="place-card-sub">{door.sub}</span>
        </span>
        <span className="place-card-go">{door.tag || '›'}</span>
      </span>
    </button>
  );
}

// ---------------------------------------------------------------- the grid (city, town, Inside)

function Grid({
  tabs,
  tab,
  setTab,
  pick,
  setPick,
  onEnter,
  game,
  place,
  artAt,
  keyed,
  link,
}: {
  tabs: Tab[];
  tab: string | null;
  setTab: (t: string) => void;
  pick: string | null;
  setPick: (id: string) => void;
  onEnter: (id: string) => void;
  game: GameState;
  place: MapPlace;
  artAt: string;
  keyed: boolean;
  link?: { label: string; hanzi: string; run: () => void };
}) {
  const cur = tabs.find((t) => t.key === tab) ?? tabs[0];
  const picked = cur?.doors.find((d) => d.id === pick) ?? cur?.doors[0];
  return (
    <div className="place-grid-layout">
      <div className="place-grid-side">
        <div className="place-group-tabs" role="tablist" aria-label="Door groups">
          {tabs.map((t) => (
            <button
              key={t.key}
              type="button"
              role="tab"
              aria-selected={t.key === cur?.key}
              onClick={() => setTab(t.key)}
            >
              <em>{t.hanzi}</em>
              {t.label}
              <small>{t.doors.length}</small>
            </button>
          ))}
          {link && (
            <button type="button" className="place-group-link" onClick={link.run}>
              <em>{link.hanzi}</em>
              {link.label} ›
            </button>
          )}
        </div>
        <nav className="place-grid" aria-label="Doors" data-guide="doors">
          {!cur && <p className="muted">Nothing here trades with outsiders.</p>}
          {cur?.doors.map((d) => (
            <DoorCard
              key={d.id}
              door={d}
              art={doorArt(artAt, d.art)}
              picked={d.id === picked?.id}
              onClick={() => {
                endGuide('place-doors');
                setPick(d.id);
              }}
              onDoubleClick={() => !d.later && onEnter(d.id)}
            />
          ))}
        </nav>
      </div>
      {picked ? (
        <Preview
          game={game}
          place={place}
          door={picked}
          keyed={keyed}
          onEnter={() => onEnter(picked.id)}
        />
      ) : (
        <section className="place-preview panel" />
      )}
    </div>
  );
}

/**
 * The picked door's preview (A6, the city screen is a nav hub): its name and hanzi, how many shops,
 * its flavor line, what it sells, its notable shops with their keepers and your trust, the market's
 * gap where it touches this door, and Enter with Go in beside it.
 */
function Preview({
  game,
  place,
  door,
  keyed,
  onEnter,
}: {
  game: GameState;
  place: MapPlace;
  door: Door;
  keyed: boolean;
  onEnter: () => void;
}) {
  const d = door.market;
  const here = market(place.id);
  const gap = here ? whyOf(game.world, here, game.calendar.day) : null;
  const shops = d && d.count > 1 ? notables(game, d) : null;
  const line = doorLine(place.id, door.art);
  return (
    <section className="place-preview panel" aria-live="polite">
      <div className="place-preview-head">
        <span className="place-seal">{door.seal}</span>
        <h3>
          {door.name}
          {door.hanzi && <span className="hanzi">{door.hanzi}</span>}
        </h3>
        <span className="place-preview-count">
          {d ? (d.count === 1 ? 'one shop' : `${d.count} shops`) : door.tag}
        </span>
      </div>
      {line && <p className="place-preview-line">{line}</p>}
      <div className="place-preview-tags">
        {(d ? sellsTags(d) : [door.sub]).map((t) => (
          <span key={t}>{t}</span>
        ))}
      </div>
      {shops && shops.notable.length > 0 && (
        <div className="place-preview-notable">
          <div className="map-label">Notable</div>
          {shops.notable.map((n) => (
            <div key={n.name} className="place-preview-shop">
              <span>
                {n.name} <i>· {n.keeper}</i>
              </span>
              <span className="muted">{n.trust}</span>
            </div>
          ))}
        </div>
      )}
      {gapTouches(gap, d) && (
        <div className="place-preview-gap">
          <div className="map-label">The market</div>
          <p>{gap}</p>
        </div>
      )}
      <div className="place-preview-foot">
        <span className="muted">
          {shops && shops.small > 0 ? `and ${shops.small} small shops` : door.later ? door.sub : ''}
        </span>
        {keyed && (
          <button
            type="button"
            className="place-btn is-quiet"
            disabled
            title="Walking it as a scene comes with going in (P3.9)."
          >
            Go in 入
          </button>
        )}
        <button
          type="button"
          className="place-btn is-primary"
          disabled={door.later}
          onClick={onEnter}
        >
          Enter {door.name} ›
        </button>
      </div>
    </section>
  );
}

/**
 * A door opened under the banner, until A6.1 gives it a room of its kind: a slim bar (back, the
 * door's seal and name, its line, Go in) over its counter, its picture beside it when painted.
 */
function PlainRoom({
  door,
  back,
  keyed,
  onBack,
  art,
  children,
}: {
  door: Door;
  back: string;
  keyed: boolean;
  onBack: () => void;
  art?: string;
  children: ReactNode;
}) {
  return (
    <div className="place-room">
      <div className="place-room-bar panel">
        <button type="button" className="place-back" onClick={onBack}>
          ‹ {back}
        </button>
        <span className="place-seal is-small">{door.seal}</span>
        <h3>
          {door.name}
          {door.hanzi && <span className="hanzi">{door.hanzi}</span>}
        </h3>
        <span className="place-sub">{door.sub}</span>
        {keyed && (
          <button
            type="button"
            className="place-btn is-quiet place-room-go"
            disabled
            title="Walking it as a scene comes with going in (P3.9)."
          >
            Go in 入
          </button>
        )}
      </div>
      <div className="place-room-body">
        <section className="place-counter panel">{children}</section>
        {art && <img className="place-room-pic" src={art} alt="" draggable={false} />}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------- the hall (a faction's seat)

function Hall({
  game,
  map,
  place,
  power,
  doors,
  member,
  shut,
  artAt,
  act,
  say,
  onInside,
}: {
  game: GameState;
  map: RegionMap;
  place: MapPlace;
  power: string | null;
  doors: Door[];
  member: boolean;
  shut: boolean;
  artAt: string;
  act: Act;
  say: (t: string) => void;
  onInside: () => void;
}) {
  // A powerless hall (a landmark, the Wall) shows its doors as tiles, with no Inside.
  const tiles = power
    ? hallFront(doors, member).map((d) =>
        // Shut out, only the way in, a gift and restitution are open; the rest waits behind the gate.
        shut && !['join', 'gift', 'law-hall'].includes(d.id) ? { ...d, later: true } : d,
      )
    : doors.slice(0, 6);
  const usable = tiles.filter((d) => !d.later && d.id !== 'inside');
  const [open, setOpen] = useState<string | null>(usable[0]?.id ?? null);
  const cur = tiles.find((d) => d.id === open && !d.later) ?? usable[0] ?? null;
  return (
    <div className="place-hall">
      {shut && <ShutPanel game={game} map={map} place={place} />}
      {shut && <div className="map-label">Behind the gate · dimmed until you are let in</div>}
      <div
        className="place-tiles"
        style={{ gridTemplateColumns: `repeat(${Math.max(tiles.length, 5)}, 1fr)` }}
      >
        {tiles.length === 0 && <p className="muted">Nothing here trades with outsiders.</p>}
        {tiles.map((d) => (
          <button
            key={d.id}
            type="button"
            className={`place-tile${d.later ? ' is-later' : ''}`}
            aria-pressed={cur?.id === d.id}
            disabled={d.later}
            title={d.later ? d.sub : undefined}
            onClick={() => (d.id === 'inside' ? onInside() : setOpen(d.id))}
          >
            {doorArt(artAt, d.art) && <img src={doorArt(artAt, d.art)} alt="" draggable={false} />}
            <span className="place-tile-seal">{d.seal}</span>
            <span className="place-tile-name">{d.name}</span>
            <span className="place-tile-sub">{d.sub}</span>
          </button>
        ))}
      </div>
      {cur && (
        <section className="place-open-hall panel">
          <div className="place-open-pic">
            {doorArt(artAt, cur.art) && (
              <img src={doorArt(artAt, cur.art)} alt="" draggable={false} />
            )}
            <span className="place-vhz">{cur.hanzi ?? cur.seal}</span>
          </div>
          <div className="place-open-body">
            <div className="place-counter-head">
              <h3>{cur.name}</h3>
              <span className="place-sub">{cur.sub}</span>
            </div>
            {cur.id === 'seat' && power ? (
              <SeatHall game={game} power={power} />
            ) : (
              <Counter game={game} map={map} place={place} door={cur.id} act={act} say={say} />
            )}
          </div>
          <aside className="place-open-note">
            <div className="map-label">The hall</div>
            <p>{doorLine(artAt, cur.art)}</p>
          </aside>
        </section>
      )}
    </div>
  );
}

/** The gate shut (A6): the array's realm, the way in and what you lack, the tiles dimmed under it. */
function ShutPanel({ game, map, place }: { game: GameState; map: RegionMap; place: MapPlace }) {
  const g = gateOf(game, map, place);
  const access = accessOf(map, place.id);
  const ways = (access?.by ?? ['token']).map((b) =>
    b === 'token'
      ? `a token of ${theName(access?.of ?? place.id)}`
      : b === 'invitation'
        ? 'an invitation'
        : b === 'rank'
          ? 'a rank'
          : 'the toll',
  );
  return (
    <section className="place-shut">
      <span className="place-shut-seal">闭</span>
      <div>
        <h3>The gate is shut to you</h3>
        <p>
          {access?.array && (
            <>
              Its array is <b>{realm(access.array).name}</b>.{' '}
            </>
          )}
          It opens to {ways.join(' or ')}
          {access?.array ? '; forcing it needs your realm above the array’s' : ''}. You carry{' '}
          {ways.length > 1 ? 'neither' : 'none'}.
        </p>
        {g.words && !g.words.startsWith('The guards ask for') && (
          <p className="place-sub">{g.words}</p>
        )}
      </div>
    </section>
  );
}

/**
 * Your seat (A6's talk, Jan's yes): what the power wants of you this month and what it gives, read
 * from what membership already keeps: your seat, balance, allowance, quota, leave and trial.
 */
function SeatHall({ game, power }: { game: GameState; power: string }) {
  const you = membershipsView(game).find((m) => m.power === organization(power).id);
  if (!you) return <p className="place-note">You hold no seat here.</p>;
  const rows: [string, string | null][] = [
    ['Your seat', `${you.title.name} ${you.title.hanzi}`],
    ['Balance', `${Math.round(you.balance * 10) / 10} ${you.currency}`],
    ['Allowance', `${you.allowance}, paid as each month turns`],
    ['Quota', you.quota],
    ['Leave', you.leave],
    ['Trial', you.trial],
    ['Treatment', you.treatment],
    ['Seclusion', you.dwelling],
    ['Protector', you.protector ? 'an elder stands behind you' : null],
  ];
  return (
    <dl className="place-seat">
      {rows
        .filter(([, v]) => v)
        .map(([k, v]) => (
          <div key={k}>
            <dt>{k}</dt>
            <dd>{v}</dd>
          </div>
        ))}
    </dl>
  );
}

// ---------------------------------------------------------------- village and wild site

function Village({
  game,
  map,
  place,
  doors,
  power,
  open,
  setOpen,
  onHall,
  onMap,
  act,
  say,
}: {
  game: GameState;
  map: RegionMap;
  place: MapPlace;
  doors: Door[];
  power: string | null;
  open: string | null;
  setOpen: (id: string | null) => void;
  onHall: () => void;
  onMap: () => void;
  act: Act;
  say: (t: string) => void;
}) {
  const cur = doors.find((d) => d.id === open) ?? null;
  return (
    <>
      <div className="place-whole-head">
        <Crumbs
          map={map}
          place={place}
          power={null}
          inside={false}
          shut={false}
          onMap={onMap}
          act={act}
        />
        <PlaceHead game={game} map={map} place={place} />
        <GateStrip game={game} map={map} place={place} />
        <MarkStrip game={game} place={place} />
        {place.features.length > 0 && (
          <div className="place-heres">
            <div className="map-label">What’s here</div>
            {place.features.map((f) => (
              <div key={f.name} className="place-here">
                <span>{f.name}</span>
                <i>{f.tags.join(', ')}</i>
              </div>
            ))}
          </div>
        )}
      </div>
      {cur && (
        <section className="place-float panel" aria-live="polite">
          <div className="place-counter-head">
            <span className="place-seal is-small">{cur.seal}</span>
            <div>
              <h3>{cur.name}</h3>
              <div className="place-sub">{cur.sub}</div>
            </div>
            <button
              type="button"
              className="place-float-close"
              aria-label="Close"
              onClick={() => setOpen(null)}
            >
              ×
            </button>
          </div>
          <Counter game={game} map={map} place={place} door={cur.id} act={act} say={say} />
        </section>
      )}
      <nav className="place-strip" aria-label="Doors" data-guide="doors">
        {doors.slice(0, STRIP_MOST - (power ? 1 : 0)).map((d) => (
          <DoorCard
            key={d.id}
            door={d}
            art={doorArt(place.id, d.art)}
            picked={d.id === open}
            onClick={() => {
              endGuide('place-doors');
              setOpen(d.id === open ? null : d.id);
            }}
          />
        ))}
        {power && (
          <DoorCard
            door={{
              id: 'hall',
              seal: crestOf(organization(power).hanzi),
              name: `${capitalize(possessiveName(power))} hall ›`,
              sub: 'its way in and a gift',
              group: 'power',
              art: 'hall',
              room: 'hall',
            }}
            art={doorArt(place.id, 'hall')}
            picked={false}
            onClick={onHall}
          />
        )}
      </nav>
    </>
  );
}

/** Half a day, three days: how far a place is at your pace. */
function daysWords(li: number, perDay: number): string {
  const d = li / perDay;
  if (d < 0.75) return 'half a day';
  if (d < 1.5) return 'a day';
  return `${Math.round(d)} days`;
}

/**
 * A wild site (the Herb Valley): the painting whole, a dark column with its head, depth, beasts,
 * finds, what is near and its features, and along the bottom what you can do as cards. Later
 * phases add cards (gathering, a ruin's depth, P3.9's doors), never a new layout.
 */
function Site({
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
  const pinned = game.map!.pins.some(
    (p) => p[0] === Math.round(place.x) && p[1] === Math.round(place.y),
  );
  const near = map.places
    .filter((p) => p.settled && p.id !== place.id && placeKindOf(p))
    .map((p) => ({ p, li: Math.hypot(p.x - place.x, p.y - place.y) }))
    .sort((a, z) => a.li - z.li)[0];
  const card = (
    id: string,
    seal: string,
    name: string,
    sub: string,
    run: () => void,
    later = false,
  ) => ({
    door: { id, seal, name, sub, later, group: 'power', art: id, room: 'hall' } as Door,
    run,
  });
  const cards = [
    card('stay', '栖', 'Stay and cultivate here', 'your wheel turns at the site', () => {
      act(stopHere);
      onMap();
    }),
    card(
      'pin',
      '钉',
      pinned ? 'Pinned' : 'Pin it',
      'a seal on your map',
      () => act((s) => pin(s, at)),
      pinned,
    ),
    ...(valley >= 0
      ? [
          card(
            'claim',
            '秘',
            'Claim it: a hidden valley',
            claims[valley]!.why ?? 'only a valley nobody knows',
            () => act((s) => claim(s, valley)),
            !!claims[valley]!.why,
          ),
        ]
      : []),
    ...(held
      ? [
          card(
            'dwelling',
            '居',
            `Your ${dwellingNoun(game, held)}`,
            'its store, land and works',
            () => go('dwelling'),
          ),
        ]
      : []),
    card('back', '图', 'Back to the map', 'step out', onMap),
  ];
  return (
    <>
      <div className="place-site-column">
        <Crumbs
          map={map}
          place={place}
          power={null}
          inside={false}
          shut={true}
          onMap={onMap}
          act={act}
        />
        <PlaceHead game={game} map={map} place={place} />
        <dl className="place-site-facts">
          <div>
            <dt>Depth</dt>
            <dd>{d.name}</dd>
          </div>
          <div>
            <dt>Beasts</dt>
            <dd>{b ? `beasts of ${b.name}` : 'nothing past mortal beasts'}</dd>
          </div>
          <div>
            <dt>Finds</dt>
            <dd>{b ? b.finds : 'none to speak of'}</dd>
          </div>
          {near && (
            <div>
              <dt>Near</dt>
              <dd>
                {near.p.name}, {daysWords(near.li, liPerDay(game))}
              </dd>
            </div>
          )}
        </dl>
        {place.features.length > 0 && (
          <div className="place-heres">
            <div className="map-label">Features</div>
            {place.features.map((f) => (
              <div key={f.name} className="place-here">
                <span>{f.name}</span>
                <i>{f.tags.join(', ')}</i>
              </div>
            ))}
          </div>
        )}
        <p className="place-note">
          {['cave', 'hut', 'shrine'].includes(place.sub)
            ? 'Your wheel sleeps here by rule, as shelter you have found, and '
            : 'A place to stand: '}
          what you meet here comes at its band.
        </p>
      </div>
      <nav className="place-strip is-site" aria-label="What you can do here">
        {cards.map((c) => (
          <DoorCard
            key={c.door.id}
            door={c.door}
            art={doorArt(place.id, c.door.art)}
            picked={false}
            onClick={() => !c.door.later && c.run()}
          />
        ))}
      </nav>
    </>
  );
}
