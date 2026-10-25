// A door's room under the place's banner (A6.1; docs/mockups/place-rooms-study.html, Jan's calls):
// one layout per kind of door, the same in every place, its big picture the door's own scene from
// the place's sheet. Every room opens with a slim bar (back, the door's seal and name, its line,
// Go in with a key) and keeps the counter's controls as they are (PlaceCounters.tsx): a market's
// street of vendors, a craft shop's keeper and work, a trading hall's floor by department, a
// board's clerk, the teahouse's patrons and scene, departures under a painted band, a hall room's
// open hall, and the changer.
import { useState, type ReactNode } from 'react';
import { doorLine } from '../content/doorLines.ts';
import { hasItem, item } from '../content/items.ts';
import { TELLERS } from '../content/map/places.ts';
import { keeperName, shop as shopById, SHOP_KIND_INFO } from '../content/shops.ts';
import { capitalize } from '../content/words.ts';
import { rumorToday } from '../core/map/place.ts';
import type { MapPlace, RegionMap } from '../core/map/region.ts';
import { knownHere, passersAt, type Patron } from '../core/patrons.ts';
import { repairCost } from '../core/shops.ts';
import { shopPurse } from '../core/markets.ts';
import type { GameState } from '../core/state.ts';
import { priceWords } from '../core/purse.ts';
import { Counter, ShopCounter, type Act } from './PlaceCounters.tsx';
import { notables, type Door } from './placeDoors.ts';
import { craftShelf, ware } from './rooms.ts';
import { goInAt } from './goin.ts';
import { QuestOffers } from './QuestOffers.tsx';
import { GoInHour } from './GoInHour.tsx';

interface RoomProps {
  game: GameState;
  map: RegionMap;
  place: MapPlace;
  door: Door;
  /** Where ‹ goes back to: the place's name, or Inside. */
  back: string;
  keyed: boolean;
  onBack: () => void;
  /** Opens another door of the place (the teahouse's Rest upstairs is the inn). */
  onDoor: (id: string) => void;
  /** The door's own picture, from the place's sheet. */
  art?: string;
  /** Where the door's flavor line is read: the place the art is. */
  artAt: string;
  act: Act;
  say: (t: string) => void;
}

/** The door's room, by its kind. */
export function Room(p: RoomProps) {
  const body = (() => {
    switch (p.door.room) {
      case 'market':
        return p.door.market ? <MarketRoom {...p} /> : <HallRoom {...p} />;
      case 'craft':
        return p.door.market ? <CraftRoom {...p} /> : <HallRoom {...p} />;
      case 'trading':
        return <TradingRoom {...p} />;
      case 'board':
        return <BoardRoom {...p} />;
      case 'teahouse':
        return <TeahouseRoom {...p} />;
      case 'departures':
        return <DeparturesRoom {...p} />;
      case 'changer':
        return <ChangerRoom {...p} />;
      default:
        return <HallRoom {...p} />;
    }
  })();
  return (
    <div className={`place-room is-${p.door.room}`}>
      <RoomBar {...p} />
      {body}
    </div>
  );
}

/** The slim bar every room opens with. */
function RoomBar({ map, place, door, back, keyed, onBack, say }: RoomProps) {
  return (
    <div className="place-room-bar panel">
      <button type="button" className="place-back" onClick={onBack}>
        ‹ {back}
      </button>
      <span className="place-seal is-small">{door.seal}</span>
      <h3>
        {door.name}
        {door.hanzi && !door.name.includes(door.hanzi) && (
          <span className="hanzi">{door.hanzi}</span>
        )}
      </h3>
      <span className="place-sub">{door.sub}</span>
      {keyed && (
        <button
          type="button"
          className="place-btn is-quiet place-room-go"
          title="Walk in as a scene, with the narrator."
          onClick={() => {
            const why = goInAt(map, place, door.id);
            if (why) say(why);
          }}
        >
          Go in 入 <GoInHour piece={door.art} />
        </button>
      )}
    </div>
  );
}

/** The door's picture, or the plain card hatched with its hanzi until it is painted. */
function Scene({ door, art, children }: { door: Door; art?: string; children?: ReactNode }) {
  return (
    <div className={`place-room-scene${art ? '' : ' is-plain'}`} data-hz={door.hanzi ?? door.seal}>
      {art && <img src={art} alt="" draggable={false} />}
      {children && <div className="place-room-over">{children}</div>}
    </div>
  );
}

/** Who keeps a shop, for a room's side: the keeper a shop is named for, else its kind's. */
function Keeper({ shopId, title }: { shopId: string; title?: string }) {
  const sh = shopById(shopId);
  return (
    <div className="place-room-who">
      {capitalize(keeperName(sh))}
      <small>{title ?? sh.name}</small>
    </div>
  );
}

// ---------------------------------------------------------------- market

/** A street of vendors as small cards, the picked vendor's counter beside (the free market). */
function MarketRoom(p: RoomProps) {
  const d = p.door.market!;
  const [at, setAt] = useState(d.shops[0]!);
  const shopId = d.shops.includes(at) ? at : d.shops[0]!;
  const { notable } = notables(p.game, d);
  const trust = (name: string) => notable.find((n) => n.name === name)?.trust;
  return (
    <div className="place-room-body is-market">
      <div className="place-room-street">
        <Scene door={p.door} art={p.art} />
        <div className="place-room-vendors">
          {d.shops.map((id) => {
            const sh = shopById(id);
            return (
              <button
                key={id}
                type="button"
                className="place-room-vendor"
                aria-pressed={id === shopId}
                onClick={() => setAt(id)}
              >
                <span className="place-room-vendor-name">
                  {sh.small ? `The small shops, ${sh.weight}` : capitalize(sh.name)}
                </span>
                <span className="place-sub">
                  {sh.small ? 'along the street' : capitalize(keeperName(sh))}
                  {!sh.small && trust(sh.name) ? ` · ${trust(sh.name)}` : ''}
                </span>
              </button>
            );
          })}
        </div>
      </div>
      <section className="place-counter panel">
        <ShopCounter key={shopId} game={p.game} shopId={shopId} act={p.act} say={p.say} />
      </section>
    </div>
  );
}

// ---------------------------------------------------------------- craft shop

/** The craft a craft shop's side is dressed by, and the kinds it shows there. */
const CRAFT_DRESS = {
  alchemy: { label: 'From the furnace today', kinds: ['pill'] },
  refiner: { label: 'On the racks', kinds: ['gear', 'treasure'] },
  talisman: { label: 'On the wall', kinds: ['talisman'] },
} as const;

/**
 * The keeper and their work large on the left, the counter on the right with the district's shops
 * as tabs; the left dressed by the craft: the furnace's batch, the refiner's racks and Mend, the
 * wall of hanging talismans. The counter is the same in all three.
 */
function CraftRoom(p: RoomProps) {
  const d = p.door.market!;
  const kind = d.kind as keyof typeof CRAFT_DRESS;
  const dress = CRAFT_DRESS[kind] ?? CRAFT_DRESS.alchemy;
  const [at, setAt] = useState(d.shops[0]!);
  const [start, setStart] = useState<string | undefined>(undefined);
  const shopId = d.shops.includes(at) ? at : d.shops[0]!;
  const lots = craftShelf(p.game, shopId, dress.kinds).slice(0, kind === 'talisman' ? 6 : 4);
  const worn =
    kind === 'refiner'
      ? Object.keys(p.game.player.wear).filter((t) => repairCost(p.game, t) !== null).length
      : 0;
  return (
    <div className="place-room-body is-craft">
      <div className="place-room-side">
        <Scene door={p.door} art={p.art}>
          <Keeper shopId={shopId} />
          {doorLine(p.artAt, p.door.art) && (
            <p className="place-room-said">“{doorLine(p.artAt, p.door.art)}”</p>
          )}
        </Scene>
        <div className="place-room-dress panel">
          <div className="map-label">{dress.label}</div>
          {lots.length === 0 && <p className="muted">Nothing of theirs this month.</p>}
          {kind === 'talisman' ? (
            <div className="place-room-wall">
              {lots.map((l) => (
                <span key={l.slot} className="place-room-slip" title={ware(l.thing).name}>
                  {hasItem(l.thing) ? item(l.thing).hanzi.slice(0, 2) : '符'}
                </span>
              ))}
            </div>
          ) : (
            lots.map((l) => {
              const w = ware(l.thing);
              return (
                <div key={l.slot} className="place-room-line">
                  <span style={{ color: `var(--rarity-${w.rarity})` }}>
                    {w.name}
                    {l.n > 1 ? ` ×${l.n}` : ''}
                  </span>
                  <span className="muted">{w.sub}</span>
                </div>
              );
            })
          )}
          {kind === 'refiner' && (
            <div className="place-room-line">
              <span>Mend: {worn === 0 ? 'nothing of yours is worn' : `${worn} of yours worn`}</span>
              <button
                type="button"
                className="place-btn"
                disabled={worn === 0}
                onClick={() => setStart('mend')}
              >
                Mend here
              </button>
            </div>
          )}
        </div>
      </div>
      <section className="place-counter panel">
        {d.shops.length > 1 && (
          <div className="place-tabs" role="tablist" aria-label="Shops">
            {d.shops.map((id) => {
              const sh = shopById(id);
              return (
                <button
                  key={id}
                  type="button"
                  role="tab"
                  aria-selected={shopId === id}
                  onClick={() => {
                    setAt(id);
                    setStart(undefined);
                  }}
                >
                  {sh.small ? 'The small shops' : capitalize(sh.name)}
                </button>
              );
            })}
          </div>
        )}
        <ShopCounter
          key={`${shopId}:${start ?? ''}`}
          game={p.game}
          shopId={shopId}
          act={p.act}
          say={p.say}
          start={start}
        />
      </section>
    </div>
  );
}

// ---------------------------------------------------------------- trading hall

/**
 * A big merchant house with everything (Jan's call): the factor and the house's terms on the left,
 * the floor by department on the right, only those holding lots this month.
 */
function TradingRoom(p: RoomProps) {
  const shopId = p.door.market?.shops[0];
  const sh = shopId ? shopById(shopId) : null;
  const purse = sh ? shopPurse(p.game.world, sh, p.game.calendar.day) : null;
  return (
    <div className="place-room-body is-trading">
      <div className="place-room-side">
        <Scene door={p.door} art={p.art}>
          {shopId && <Keeper shopId={shopId} title={`the factor of ${sh!.name}`} />}
        </Scene>
        <div className="place-room-dress panel">
          <div className="map-label">The house’s terms</div>
          <p className="place-sub">{doorLine(p.artAt, p.door.art)}</p>
          {sh && (
            <p className="place-sub">
              {SHOP_KIND_INFO[sh.kind].members
                ? 'Members buy in contribution; outsiders only what it lets go.'
                : 'Lots are sold whole; imports are marked 舶, priced at their road.'}
              {purse !== null &&
                ` Its purse this month: ${SHOP_KIND_INFO[sh.kind].money === 'silver' ? `${Math.round(purse).toLocaleString('en')} taels` : priceWords(purse)}.`}
            </p>
          )}
        </div>
      </div>
      <section className="place-counter panel">
        {shopId ? (
          <ShopCounter
            key={shopId}
            game={p.game}
            shopId={shopId}
            act={p.act}
            say={p.say}
            departments
          />
        ) : (
          <Counter
            game={p.game}
            map={p.map}
            place={p.place}
            door={p.door.id}
            act={p.act}
            say={p.say}
          />
        )}
      </section>
    </div>
  );
}

// ---------------------------------------------------------------- board

/** The clerk on the left with what the office stands for, the postings or posts beside. */
function BoardRoom(p: RoomProps) {
  const shopId = p.door.market?.shops[0];
  return (
    <div className="place-room-body is-board">
      <div className="place-room-side">
        <Scene door={p.door} art={p.art}>
          {shopId ? (
            <Keeper shopId={shopId} title="the office’s clerk" />
          ) : (
            <div className="place-room-who">
              The clerk<small>{p.door.name.toLowerCase()}</small>
            </div>
          )}
        </Scene>
        <div className="place-room-dress panel">
          <div className="map-label">What it pays</div>
          <p className="place-sub">{doorLine(p.artAt, p.door.art)}</p>
          <p className="place-sub">
            {shopId
              ? 'Posted rates, never haggled: what it buys is on the Sell tab.'
              : p.door.id === 'work'
                ? 'Posts are kept by the shift, standing at the place; a missed shift costs standing.'
                : 'A posting taken is met at its spot and paid here; three held at most.'}
          </p>
        </div>
      </div>
      <section className="place-counter panel">
        <Counter
          game={p.game}
          map={p.map}
          place={p.place}
          door={p.door.id}
          act={p.act}
          say={p.say}
        />
      </section>
    </div>
  );
}

// ---------------------------------------------------------------- teahouse

/**
 * The Quiet Moon: whoever sits here today on the left (today's teller, the people you know whose
 * home it is, a few passers seeded by the place and the day), the scene in the middle (today's
 * talk), the house's actions on the right. P3.9's go-in doors land here.
 */
function TeahouseRoom(p: RoomProps) {
  const today = rumorToday(p.game, p.place.id);
  const teller: Patron[] = today.ok
    ? [
        {
          id: 'teller',
          name: capitalize(TELLERS[today.place.sub] ?? 'a traveller'),
          kind: 'teller',
          line: 'today’s teller',
        },
      ]
    : [];
  const patrons = [
    ...teller,
    ...knownHere(p.game, p.place.id),
    ...passersAt(p.place.id, p.game.calendar.day),
  ];
  const isBed = p.door.id === 'bed';
  return (
    <div className="place-room-body is-teahouse">
      <aside className="place-room-patrons panel">
        <div className="map-label">Here today</div>
        {patrons.map((x) => (
          <div key={x.id} className={`place-room-patron is-${x.kind}`}>
            <span className="place-room-face">{x.name.slice(0, 1)}</span>
            <span>
              <span className="place-room-vendor-name">{x.name}</span>
              <span className="place-sub">{x.line}</span>
            </span>
          </div>
        ))}
      </aside>
      <section className="place-room-mid">
        <Scene door={p.door} art={p.art} />
        {/* Going in's introduction, at any teahouse (P3.9b). */}
        {p.door.art === 'teahouse' && (
          <QuestOffers game={p.game} kind="teahouse" place={p.place.id} />
        )}
        <div className="place-counter panel">
          <Counter
            game={p.game}
            map={p.map}
            place={p.place}
            door={p.door.id}
            act={p.act}
            say={p.say}
          />
        </div>
      </section>
      <aside className="place-room-house panel">
        <div className="map-label">The house</div>
        <div className="place-room-line">
          <span>{isBed ? 'A bed for the night' : 'A pot of tea'}</span>
          <span className="muted">{isBed ? 'by rule, from your silver' : '5 taels, a rumor'}</span>
        </div>
        {!isBed && p.door.room === 'teahouse' && (
          <button type="button" className="place-room-line is-link" onClick={() => p.onDoor('bed')}>
            <span>Rest upstairs</span>
            <span className="muted">the inn ›</span>
          </button>
        )}
        {isBed && (
          <button
            type="button"
            className="place-room-line is-link"
            onClick={() => p.onDoor('talk')}
          >
            <span>The common room</span>
            <span className="muted">the teahouse ›</span>
          </button>
        )}
        <div className="place-room-line is-later" title="Going in (P3.9)">
          <span>Sit with someone 入</span>
          <span className="muted">later</span>
        </div>
      </aside>
    </div>
  );
}

// ---------------------------------------------------------------- departures

/** Caravans, guides, the map seller and the broker: the door's painted band over its board. */
function DeparturesRoom(p: RoomProps) {
  return (
    <div className="place-room-body is-departures">
      <Scene door={p.door} art={p.art}>
        {doorLine(p.artAt, p.door.art) && (
          <p className="place-room-said">{doorLine(p.artAt, p.door.art)}</p>
        )}
      </Scene>
      <section className="place-counter panel">
        <Counter
          game={p.game}
          map={p.map}
          place={p.place}
          door={p.door.id}
          act={p.act}
          say={p.say}
        />
      </section>
    </div>
  );
}

// ---------------------------------------------------------------- hall room and changer

/** Cloudstep's open hall: its picture with its hanzi down it, its content, a note. */
function HallRoom(p: RoomProps) {
  return (
    <section className="place-open-hall panel place-room-hall">
      <div className="place-open-pic">
        {p.art && <img src={p.art} alt="" draggable={false} />}
        <span className="place-vhz">{p.door.hanzi ?? p.door.seal}</span>
      </div>
      <div className="place-open-body">
        <Counter
          game={p.game}
          map={p.map}
          place={p.place}
          door={p.door.id}
          act={p.act}
          say={p.say}
        />
      </div>
      <aside className="place-open-note">
        <div className="map-label">The hall</div>
        <p>{doorLine(p.artAt, p.door.art)}</p>
      </aside>
    </section>
  );
}

/** One exchange panel beside the door's scene. */
function ChangerRoom(p: RoomProps) {
  return (
    <div className="place-room-body is-changer">
      <Scene door={p.door} art={p.art}>
        <p className="place-room-said">{doorLine(p.artAt, p.door.art)}</p>
      </Scene>
      <section className="place-counter panel">
        <Counter
          game={p.game}
          map={p.map}
          place={p.place}
          door={p.door.id}
          act={p.act}
          say={p.say}
        />
      </section>
    </div>
  );
}
