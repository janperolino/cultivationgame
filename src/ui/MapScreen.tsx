// The Map 舆图 (design § The world, The travel map): the painted Border Wilds under the fog, full
// bleed (A5.1), a click to set a course and the clock carrying you along it, a right-click for
// choices. One column on the left (A5.1, take P of docs/mockups/map-layout-study.html) says where you
// stand and how deep, and shows one thing at a time under Routine's tabs: Journey (the road wheel,
// its routine, the ways of going, the stance and the course card with what's ahead) or Card, the
// card the road brought, which shows only while one waits or is opened and opens itself then (P3.7).
// What the road brings also shows as round seals on the map.
import { following } from '../core/journal.ts';
import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { BRANCHES } from '../content/hours.ts';
import { DWELLINGS } from '../content/dwellings.ts';
import { bandName, claim, claimsHere } from '../core/dwellings.ts';
import { arrayName } from '../core/arrays.ts';
import {
  arraysCarried,
  feedArray,
  feedCost,
  groundsHere,
  letGo,
  settleTrap,
  trapFight,
  takeUp,
  trapSure,
} from '../core/formations.ts';
import { openFight } from '../core/played.ts';
import { template as rosterTemplate } from '../content/roster.ts';
import { PlacingScene } from './PlacingScene.tsx';
import { geomancyLi, geomancyOf, readLand, readToday, veinsOf } from '../core/map/veins.ts';
import { gatherLines } from '../core/map/gather.ts';
import { realm as realmInfo, stageName, type RealmId } from '../content/realms.ts';
import {
  CHECKPOINT_TOLL_LOW,
  QI_NAMES,
  WAYS,
  type RoadHour,
  type WayId,
} from '../content/map/travel.ts';
import { ENTER_LI } from '../content/map/places.ts';
import { worldWhen } from '../core/chronicle.ts';
import { daysPerRealMs } from '../core/loop.ts';
import { band, bandAt, depthInfo, pullsIn, qiAt } from '../core/map/depth.ts';
import { setStance, setVeil, veilReach, waiting } from '../core/map/encounters.ts';
import { known, sightAt } from '../core/map/fog.ts';
import { enterAt, gateOf, placeKindOf, standsAt } from '../core/map/gate.ts';
import {
  askToJoin,
  entryOf,
  giftFloor,
  giftThisMonth,
  offerGift,
  seatPowerAt,
} from '../core/joining.ts';
import { theName } from '../core/organizations.ts';
import { liftByPaying, yourMark } from '../core/guarded.ts';
import type { Pt } from '../core/map/geometry.ts';
import {
  areaAt,
  placeById,
  terrainAt,
  type MapArea,
  type MapPlace,
  type RegionMap,
} from '../core/map/region.ts';
import { STANCES, type Encounter, type MapLife, type Stance } from '../core/map/schema.ts';
import { encounterTemplate } from '../content/encounters/index.ts';
import {
  canGoBy,
  followRoadRoutine,
  goBy,
  goToPlace,
  hereWords,
  homeOf,
  leaveGroup,
  liPerDay,
  mapOf,
  paceOf,
  pin,
  roadHours,
  roadRoutines,
  setCourse,
  sleepPlace,
  stopHere,
  unpin,
  yourBand,
} from '../core/map/travel.ts';
import type { GameState } from '../core/state.ts';
import { go, goToWheel } from './nav.ts';
import { hasKey } from './ai.ts';
import { goInHereNow } from './goin.ts';
import { ROAD_WORD } from './roadWords.ts';
import { onArtLoad } from './map/art.ts';
import { markMoving } from './moving.ts';
import { drawMap, isDeadly, pickAt, toScreen, toWorld, type View } from './map/draw.ts';
import { fogOf } from './map/fog.ts';
import { Stub } from './CardFeed.tsx';
import { openSquare, seeEncounters } from './square.ts';
import { courseOrAsk, leaveAnyway, stayOnDuty, useDutyAsk } from './dutyAsk.ts';
import { sealOf } from './encounterSeals.ts';
import { PlaceScreen } from './PlaceScreen.tsx';
import { canvasDensity, pointIn, stageFactor, useStage } from './stage.ts';
import { useGame } from './store.ts';
import { groundPiles, pickUp, pilesHere } from '../core/map/ground.ts';
import { hasItem, item } from '../content/items.ts';
import { GROUND_DAYS, GROUND_LI } from '../content/gear.ts';

/** What a pile on the ground holds, in words: "Iron Ore ×3, Ember Talisman". */
function pileWords(items: Record<string, number>): string {
  return Object.entries(items)
    .map(([id, n]) => `${hasItem(id) ? item(id).name : id}${n > 1 ? ` ×${n}` : ''}`)
    .join(', ');
}
import { Picker } from './widgets.tsx';
import { capitalize } from '../content/words.ts';

const TERRAIN_WORDS: Record<string, string> = { sea: 'at sea' };

/** The closest zoom, where the upscaled tiles run out (A5). */
const MAX_K = 0.16;
/** The farthest zoom fits what you have charted with this much room round it (A5, Jan's call). */
const ROOM = 1.15;
/**
 * The part of the map the column and the screen's top leave open, in stage pixels from the map's
 * edges (left, top, right, bottom): what you've charted fits there, and "You" centres you in it.
 */
const OPEN = [480, 80, 90, 30] as const;

/**
 * The column's tabs (A5.1, Jan's notes): the journey (where you stand, where you're headed and
 * what's ahead), how you travel (the wheel, the routine, the mode of travel, the stance), and the
 * card the road brought. One shows at a time, as Routine's do.
 */
type ColumnTab = 'journey' | 'travel' | 'card';
const COLUMN_TABS: readonly { id: ColumnTab; name: string; hanzi: string }[] = [
  { id: 'journey', name: 'Journey', hanzi: '途' },
  { id: 'travel', name: 'Travel', hanzi: '行' },
  { id: 'card', name: 'Card', hanzi: '遇' },
];

interface MenuItem {
  t: string;
  s?: string;
  run?: () => void;
  later?: boolean;
  warn?: boolean;
  sep?: boolean;
}

interface Menu {
  x: number;
  y: number;
  head: string;
  items: MenuItem[];
}

export function MapScreen() {
  const game = useGame((s) => s.game);
  const mapAct = useGame((s) => s.mapAct);
  // The map is made on first need: from where the life began, and the world's places kept.
  useEffect(() => {
    if (game && !game.map) mapAct((s) => s);
  }, [game, mapAct]);
  const map = game ? mapOf(game) : null;
  // Inside a place its screen stands in for the map; ← Map looks back at the map without leaving.
  const inside = game?.map?.inside ?? null;
  const [looking, setLooking] = useState<string | null>(null);
  // Stepping out forgets the look back, so arriving there again opens its screen.
  const [was, setWas] = useState(inside);
  if (was !== inside) {
    setWas(inside);
    if (!inside) setLooking(null);
  }
  // A gated place shut to you opens as the hall shut (A6): you look at its gate, not go in.
  const [atGate, setAtGate] = useState<string | null>(null);
  if (!game || !map || !game.map) return <p className="muted">Unrolling the map…</p>;
  const place = inside ? placeById(map, inside) : undefined;
  if (place && looking !== inside)
    return (
      <PlaceScreen
        key={place.id}
        game={game}
        map={map}
        place={place}
        onMap={() => setLooking(inside)}
      />
    );
  const gated = !inside && atGate ? placeById(map, atGate) : undefined;
  if (gated && standsAt(game, gated))
    return (
      <PlaceScreen
        key={`gate:${gated.id}`}
        game={game}
        map={map}
        place={gated}
        shut
        onMap={() => setAtGate(null)}
      />
    );
  return (
    <MapView
      game={game}
      map={map}
      life={game.map}
      onGoIn={() => setLooking(null)}
      onGate={setAtGate}
    />
  );
}

function MapView({
  game,
  map,
  life,
  onGoIn,
  onGate,
}: {
  game: GameState;
  map: RegionMap;
  life: MapLife;
  onGoIn: () => void;
  onGate: (id: string) => void;
}) {
  const mapAct = useGame((s) => s.mapAct);
  const stage = useRef<HTMLDivElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const [size, setSize] = useState({ W: 0, H: 0, dpr: 1 });
  const [view, setView] = useState<View | null>(null);
  // Drawn again when a picture arrives or the fog asks for it.
  const [drawn, redraw] = useState(0);
  const [tab, setTab] = useState<ColumnTab>('journey');
  const [hover, setHover] = useState<MapPlace | MapArea | null>(null);
  const [tip, setTip] = useState<{ x: number; y: number } | null>(null);
  const [menu, setMenu] = useState<Menu | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [leaving, setLeaving] = useState(false);
  const dutyAsk = useDutyAsk((s) => s.ask);
  const [laying, setLaying] = useState(false);
  const [openEnc, setOpenEnc] = useState<string | null>(null);
  const drag = useRef<{ x: number; y: number; vx: number; vy: number; moved: boolean } | null>(
    null,
  );
  const band0 = yourBand(game.player);

  const say = (t: string) => {
    setToast(t);
    window.setTimeout(() => setToast((cur) => (cur === t ? null : cur)), 2800);
  };
  const act = (change: Parameters<typeof mapAct>[0]) => {
    const why = mapAct(change);
    if (why) say(why);
    return why;
  };

  // Size the canvas to the screen, in stage pixels, drawn at the screen's density.
  const zoom = useStage((s) => s.factor);
  useLayoutEffect(() => {
    const el = stage.current;
    if (!el) return;
    const fit = () => {
      const dpr = canvasDensity();
      const W = Math.max(1, el.clientWidth);
      const H = Math.max(1, el.clientHeight);
      canvas.current!.width = Math.round(W * dpr);
      canvas.current!.height = Math.round(H * dpr);
      setSize({ W, H, dpr });
    };
    fit();
    const ro = new ResizeObserver(fit);
    ro.observe(el);
    return () => ro.disconnect();
  }, [zoom]);
  // Art and web fonts arrive late: the canvas draws again for each, or labels keep a fallback.
  useEffect(() => {
    const again = () => redraw((n) => n + 1);
    document.fonts?.addEventListener('loadingdone', again);
    const off = onArtLoad(again);
    return () => {
      document.fonts?.removeEventListener('loadingdone', again);
      off();
    };
  }, []);

  // The zoom stops where the tiles run out and at what you've charted (A5): never past it.
  const charted = fogOf(map, life).fog.charted;
  const openW = Math.max(200, size.W - OPEN[0] - OPEN[2]);
  const openH = Math.max(200, size.H - OPEN[1] - OPEN[3]);
  const minK = Math.min(
    MAX_K,
    openW / ((charted[2] - charted[0]) * ROOM),
    openH / ((charted[3] - charted[1]) * ROOM),
  );
  const clampK = (k: number) => Math.max(minK, Math.min(MAX_K, k));
  /** The view that puts a spot at the middle of the open part of the map. */
  const centred = (p: Pt, k: number): View => ({
    x: p[0] - (OPEN[0] + openW / 2 - size.W / 2) / k,
    y: p[1] - (OPEN[1] + openH / 2 - size.H / 2) / k,
    k,
  });
  const fitCharted = () =>
    setView(centred([(charted[0] + charted[2]) / 2, (charted[1] + charted[3]) / 2], minK));
  const v: View = view ?? centred(life.at, clampK(0.03));

  // The veins your geomancy read that nobody has dug into yet (K9).
  const readVeins = veinsOf(map, game.lineage.id).filter(
    (x) => (life.veins ?? []).includes(x.id) && !placeById(map, `made:${x.id}`),
  );

  // Draw on every change of the life, the view or the hover; again soon when the fog stood in.
  useEffect(() => {
    const c = canvas.current;
    if (!c || !size.W) return;
    let again = 0;
    const id = requestAnimationFrame(() => {
      const stale = drawMap(
        { ctx: c.getContext('2d')!, W: size.W, H: size.H, dpr: size.dpr, view: v },
        {
          map,
          life,
          yourBand: band0,
          hover: hover?.id ?? null,
          ground: groundPiles(game),
          veins: readVeins,
          veinRings: Object.values(life.veinRings ?? {}),
          arrays: game.player.grounds
            .filter((g) => g.region === map.id)
            .map((g) => ({ at: g.at, held: !!g.held, dark: g.stones <= 0 })),
        },
      );
      if (stale) again = window.setTimeout(() => redraw((n) => n + 1), 1600);
    });
    return () => {
      cancelAnimationFrame(id);
      clearTimeout(again);
    };
  }, [map, life, v.x, v.y, v.k, hover, size, band0, drawn, game.player.grounds]); // eslint-disable-line react-hooks/exhaustive-deps

  const scene = { map, life, yourBand: band0, hover: hover?.id ?? null, ground: groundPiles(game) };
  const claimable = claimsHere(game);
  const pickAtSpot = (sx: number, sy: number) =>
    pickAt({ view: v, W: size.W, H: size.H }, scene, sx, sy);
  const local = (e: { clientX: number; clientY: number }) => {
    const p = pointIn(e, canvas.current!);
    return [p.x, p.y] as const;
  };

  const zoomAt = (sx: number, sy: number, f: number) =>
    setView((cur) => {
      const was = cur ?? v;
      const before = toWorld(was, size.W, size.H, sx, sy);
      const k = clampK(was.k * f);
      const nv = { ...was, k };
      const after = toWorld(nv, size.W, size.H, sx, sy);
      return { x: was.x + before[0] - after[0], y: was.y + before[1] - after[1], k };
    });
  useEffect(() => {
    const c = canvas.current;
    if (!c) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      markMoving();
      const p = pointIn(e, c);
      zoomAt(p.x, p.y, Math.exp(-e.deltaY * 0.0015));
    };
    c.addEventListener('wheel', onWheel, { passive: false });
    return () => c.removeEventListener('wheel', onWheel);
  });

  // ---------------------------------------------------------------- choices

  const goTo = (to: Pt, target: string | null, enter = false) => {
    if (life.group) {
      setLeaving(true);
      return;
    }
    courseOrAsk(game, () => act((s) => setCourse(s, to, target, enter)));
  };

  const placeFor = (q: MapPlace | MapArea): Pt =>
    known(life, q.id) === 'rumored' && life.rings[q.id]
      ? life.rings[q.id]!
      : 'x' in q
        ? [q.x, q.y]
        : life.at;

  /** What an outsider can ask at a power's shut gate: to join by its way in, and to leave a gift. */
  const gateAsks = (power: string, goIn: () => void): MenuItem[] => {
    const items: MenuItem[] = [];
    const entry = entryOf(game, power);
    if (entry)
      items.push({
        t: entry.title.name,
        s: entry.shut ?? entry.sub,
        warn: !!entry.shut,
        run: () => {
          let joined = false;
          const why = act((s) => {
            const r = askToJoin(s, power);
            if (!r.ok) return r;
            joined = r.joined;
            say(
              r.joined
                ? `${capitalize(theName(power))} takes you in.`
                : `Short: ${r.yours?.toFixed(1)} against ${r.bar?.toFixed(1)}. They send you away.`,
            );
            return r;
          });
          if (!why && joined) goIn();
        },
      });
    // A marked face makes restitution at the gate itself: the guards fetch the law hall's deacon.
    const mark = yourMark(game, power);
    if (mark)
      items.push({
        t: 'Make restitution at the gate',
        s: `${mark.restitutionWords}${mark.slip ? ' and the slip' : ''}, the oath sworn`,
        run: () =>
          act((s) => {
            const r = liftByPaying(s, power, 'restitution');
            if (r.ok) say(`${capitalize(theName(power))} lifts its mark.`);
            return r;
          }),
      });
    const floor = giftFloor(game);
    items.push({
      t: 'Offer a gift',
      s: giftThisMonth(game, power)
        ? `${floor} low; they have counted one this month`
        : `${floor} low, remembered as tribute`,
      run: () =>
        act((s) => {
          const r = offerGift(s, power, { stones: floor });
          if (r.ok) say(r.counted ? 'The guards take it in; it is noted.' : 'They take it.');
          return r;
        }),
    });
    return items;
  };

  /** What you can do where you stand: enter the place, stay and cultivate, go home. */
  const hereChoices = (atPlace: MapPlace | null): MenuItem[] => {
    const home = homeOf(game, map);
    const items: MenuItem[] = [];
    // What lies on the ground within reach (C2): picked up from where you stand.
    for (const { pile, i } of pilesHere(game)) {
      items.push({
        t: 'Pick up what lies here',
        s: pileWords(pile.items),
        run: () => act((s) => pickUp(s, i)),
      });
    }
    if (atPlace && placeKindOf(atPlace)) {
      const gate = gateOf(game, map, atPlace);
      const goIn = (bribe = false) => {
        // A shut gate is looked at from outside: its screen shows the hall shut (A6).
        if (gate.kind === 'shut' && placeKindOf(atPlace) === 'gate') onGate(atPlace.id);
        else if (!act((s) => enterAt(s, map, atPlace, { bribe }))) onGoIn();
      };
      if (life.inside === atPlace.id)
        items.push({ t: 'Go back in', s: 'its own screen', run: onGoIn });
      else if (gate.kind === 'refused') {
        items.push({ t: 'Enter', s: 'the watch knows your face', warn: true, run: () => goIn() });
        items.push({
          t: 'Bribe the watch',
          s: ` low-grade, if he takes it`,
          run: () => goIn(true),
        });
      } else
        items.push({
          t: 'Enter',
          s:
            gate.kind === 'toll'
              ? `the toll is ${gate.toll} low-grade`
              : gate.kind === 'shut'
                ? 'the gate is shut to you'
                : 'its own screen',
          run: () => goIn(),
        });
      // A power's shut gate: its way in, a gift, and restitution for a marked face (the checkpoint).
      const power = gate.kind === 'shut' ? seatPowerAt(map, atPlace) : null;
      if (power) items.push(...gateAsks(power, goIn));
    }
    items.push({
      t: 'Stay and cultivate here',
      s: 'the home wheel turns here',
      run: () => act(stopHere),
    });
    // Go in here (P3.9): wherever you stand still, the land where you stand is a scene.
    if (!life.course && !life.inside)
      items.push({
        t: 'Go in here',
        s: hasKey() ? 'the land, with the narrator' : 'needs an OpenRouter key · Settings',
        run: () => {
          if (!hasKey()) return go('settings');
          const why = goInHereNow();
          if (why) say(why);
        },
      });
    // Claiming where you stand (K9): bare land as a hut, a vein you read as a cave abode.
    claimable.forEach((c, i) => {
      if (c.kind !== 'valley') items.push(claimItem(i));
    });
    items.push(...groundChoices());
    items.push({
      t: 'Read the land 堪舆',
      s: readToday(life, game.calendar.day)
        ? 'read today already'
        : 'soul and Earth Dao, for veins',
      run: () => {
        if (readToday(life, game.calendar.day)) return say('You have read this land today.');
        let found = 0;
        act((s) => {
          const r = readLand(mapOf(s)!, s.lineage.id, s.map!, s.player, s.calendar.day);
          found = r.found.length;
          return { ...s, map: r.life };
        });
        say(
          found
            ? `The land answers: ${found === 1 ? 'a vein' : `${found} veins`} close by, now on your map.`
            : 'Nothing your reading can find lies close; the Journey tab says what it read.',
        );
      },
    });
    if (home.id !== atPlace?.id)
      items.push({
        t: 'Go home',
        s: home.name,
        run: () => courseOrAsk(game, () => act((s) => goToPlace(s, home.id))),
      });
    return items;
  };

  /**
   * Prepared ground where you stand (K10): an array of yours within reach, what it holds and its
   * eye; or, on open ground, laying one from the Bag through placing.
   */
  const groundChoices = (): MenuItem[] => {
    const items: MenuItem[] = [];
    for (const g of groundsHere(game).near) {
      const where = { ground: g.id };
      if (g.held) {
        const beast = rosterTemplate(g.held.roster).name;
        const sure = trapSure(game, g.id);
        items.push({
          t: `Check the trap: a ${beast.toLowerCase()} is held`,
          s: sure ? 'fight it bound · a sure win' : 'fight it bound, on the trap’s ground',
          run: () => {
            if (sure) {
              let text = '';
              act((s) => {
                const r = settleTrap(s, g.id, 'won');
                text = r.text;
                return r.state;
              });
              if (text) say(text);
            } else
              act((s) => openFight(s, { kind: 'trap', ground: g.id }, trapFight(s, g.id)) ?? s);
          },
        });
        items.push({
          t: 'Let it go',
          s: 'the trap stays set',
          run: () => act((s) => letGo(s, g.id)),
        });
      }
      items.push({
        t: `Feed the ${arrayName(g).toLowerCase()}`,
        s: feedCost(g) > 0 ? `${feedCost(g)} low to fill its eye` : 'its eye is full',
        later: feedCost(g) <= 0,
        run: () => act((s) => feedArray(s, where, g.id)),
      });
      items.push({
        t: `Take the ${arrayName(g).toLowerCase()} up`,
        s: 'back in the Bag; the stones in its eye are lost',
        run: () => act((s) => takeUp(s, where, g.id)),
      });
    }
    if (
      !life.inside &&
      !life.course &&
      !groundsHere(game).near.length &&
      arraysCarried(game.player).length > 0
    )
      items.push({
        t: 'Lay an array here 布阵',
        s: 'flags or a disc, on open ground',
        run: () => setLaying(true),
      });
    return items;
  };

  const claimItem = (i: number): MenuItem => {
    const c = claimable[i]!;
    const what = DWELLINGS[c.kind];
    return {
      t: `Claim it: ${what.name.toLowerCase()} ${what.hanzi}`,
      s:
        c.why ??
        (c.power
          ? `a deed against ${theName(c.power)}: squatting on its land`
          : 'free: no power holds it'),
      warn: !!c.power,
      later: !!c.why,
      run: () => {
        if (c.why) return say(c.why);
        if (!act((s) => claim(s, i))) say(`${what.name} claimed. The Dwelling screen 居 has it.`);
      },
    };
  };

  const menuFor = (sx: number, sy: number): Menu => {
    const w = toWorld(v, size.W, size.H, sx, sy);
    const q = pickAtSpot(sx, sy);
    const later = (t: string, s: string, phase: string): MenuItem => ({
      t,
      s: `${s} · ${phase}`,
      later: true,
      run: () => say(`That arrives in ${phase}.`),
    });
    if (life.group) {
      return {
        x: sx,
        y: sy,
        head: life.group.name,
        items: [
          later(`Talk to ${life.group.leader}`, 'a scene', 'P3.9'),
          { sep: true, t: '' },
          {
            t: life.group.kind === 'ship' ? 'Leave the ship…' : 'Leave the caravan…',
            s: 'asks first',
            warn: true,
            run: () => setLeaving(true),
          },
        ],
      };
    }
    // A pile on the ground out of reach: what it holds, and going back for it. One within reach
    // is picked up from your own menu, where you stand.
    const pileI = groundPiles(game).findIndex((g) => {
      const [x, y] = toScreen(v, size.W, size.H, g.at);
      const far = Math.hypot(g.at[0] - life.at[0], g.at[1] - life.at[1]) > GROUND_LI;
      return far && Math.hypot(x - sx, y - sy) < 10;
    });
    if (pileI >= 0) {
      const g = groundPiles(game)[pileI]!;
      return {
        x: sx,
        y: sy,
        head: 'On the ground',
        items: [
          { t: pileWords(g.items), s: `gone ${GROUND_DAYS} days after it fell` },
          { t: 'Go here', run: () => goTo(g.at, null) },
        ],
      };
    }
    const veinAt = readVeins.find((x) => {
      const [vx, vy] = toScreen(v, size.W, size.H, [x.x, x.y]);
      return Math.hypot(vx - sx, vy - sy) < 10;
    });
    if (veinAt) {
      const i = claimable.findIndex((c) => c.vein?.id === veinAt.id);
      return {
        x: sx,
        y: sy,
        head: `A local vein, tier ${veinAt.tier}`,
        items: [
          ...(i >= 0
            ? [claimItem(i)]
            : [
                {
                  t: 'Go here',
                  s: 'claimed once you stand on it',
                  run: () => goTo([veinAt.x, veinAt.y], null),
                },
              ]),
          { t: 'Pin it', run: () => act((s) => pin(s, [veinAt.x, veinAt.y])) },
        ],
      };
    }
    const pinI = life.pins.findIndex((p) => {
      const [x, y] = toScreen(v, size.W, size.H, p);
      return Math.hypot(x - sx, y - sy - 8) < 12;
    });
    if (pinI >= 0)
      return {
        x: sx,
        y: sy,
        head: `Pin ${pinI + 1}`,
        items: [
          { t: 'Go here', run: () => goTo(life.pins[pinI]!, null) },
          { t: 'Remove the pin', run: () => act((s) => unpin(s, pinI)) },
        ],
      };
    const [ux, uy] = toScreen(v, size.W, size.H, life.at);
    // A place under the cursor wins over your own mark beside it, so a place you stand near but
    // not at still offers going there.
    const here =
      q && 'x' in q
        ? Math.hypot(q.x - life.at[0], q.y - life.at[1]) < ENTER_LI
        : Math.hypot(ux - sx, uy - sy) < 16;
    if (here) {
      const atPlace =
        q && 'x' in q && Math.hypot(q.x - life.at[0], q.y - life.at[1]) < ENTER_LI ? q : null;
      return {
        x: sx,
        y: sy,
        head: atPlace?.name ?? 'Where you stand',
        items: hereChoices(atPlace),
      };
    }
    if (q && known(life, q.id) === 'rumored') {
      const ring = placeFor(q);
      return {
        x: sx,
        y: sy,
        head: `${q.name} · rumored`,
        items: [
          {
            t: 'Search for it',
            s: 'walk to the ring; your look-around finds it',
            run: () => goTo(ring, 'x' in q ? q.id : null),
          },
          { t: 'Pin the ring', run: () => act((s) => pin(s, ring)) },
        ],
      };
    }
    if (q && 'x' in q) {
      return {
        x: sx,
        y: sy,
        head: q.name,
        items: [
          ...(placeKindOf(q)
            ? [
                {
                  t: 'Go there and enter',
                  s: 'by your road routine',
                  run: () => goTo([q.x, q.y], q.id, true),
                },
              ]
            : []),
          { t: 'Go there', s: 'by your road routine', run: () => goTo([q.x, q.y], q.id) },
          { t: 'Pin it', run: () => act((s) => pin(s, [q.x, q.y])) },
        ],
      };
    }
    const area = map.areas.find(
      (a) =>
        a.kind === 'forbidden' &&
        known(life, a.id) !== 'unknown' &&
        isDeadly(map, a, band0) &&
        depthInfo(map, w).heart?.area === a.id,
    );
    const b = bandAt(map, w);
    return {
      x: sx,
      y: sy,
      head: `${hereAt(map, w)} · ${depthInfo(map, w).name}${b >= 0 ? ` · ${band(b)!.name}` : ''}`,
      items: [
        area
          ? {
              t: 'Go in anyway',
              s: 'what lives there is a realm above you',
              warn: true,
              run: () => goTo(w, null),
            }
          : { t: 'Go here', s: 'by your road routine', run: () => goTo(w, null) },
        { t: 'Pin this spot', run: () => act((s) => pin(s, w)) },
        { sep: true, t: '' },
        later('Bury a stash here', 'a hidden site only you know', 'P3.12'),
        {
          t: 'Found an abode here',
          s: 'go there, and claim it where you stand',
          run: () => goTo(w, null),
        },
        later('Raise a sect or a faction here', 'a project', 'M5'),
      ],
    };
  };

  // ---------------------------------------------------------------- pointer

  const onDown = (e: React.PointerEvent) => {
    if (e.button !== 0) return;
    drag.current = { x: e.clientX, y: e.clientY, vx: v.x, vy: v.y, moved: false };
    (e.target as Element).setPointerCapture(e.pointerId);
    setMenu(null);
  };
  const onMove = (e: React.PointerEvent) => {
    const d = drag.current;
    if (d) {
      const dx = (e.clientX - d.x) / stageFactor();
      const dy = (e.clientY - d.y) / stageFactor();
      // A tap's slack is in window pixels, so it feels the same at every window size.
      if (Math.hypot(e.clientX - d.x, e.clientY - d.y) > 4) d.moved = true;
      if (d.moved) {
        // The glass and the glows hold still while the map moves (ui/moving.ts).
        markMoving();
        setView({ ...v, x: d.vx - dx / v.k, y: d.vy - dy / v.k });
      }
      return;
    }
    const [sx, sy] = local(e);
    const q = pickAtSpot(sx, sy);
    setHover(q);
    setTip(q ? { x: sx, y: sy } : null);
  };
  const onUp = (e: React.PointerEvent) => {
    const d = drag.current;
    drag.current = null;
    if (!d || d.moved) return;
    const [sx, sy] = local(e);
    const q = pickAtSpot(sx, sy);
    if (q && 'x' in q) goTo(placeFor(q), q.id);
    else if (q) goTo(placeFor(q), null);
    else goTo(toWorld(v, size.W, size.H, sx, sy), null);
  };
  const onContext = (e: React.MouseEvent) => {
    e.preventDefault();
    const [sx, sy] = local(e);
    setMenu(menuFor(sx, sy));
  };

  // ---------------------------------------------------------------- the line under the date

  const d = depthInfo(map, life.at);
  const b = bandAt(map, life.at);
  const qd = qiAt(map, life.at);
  const pips = Array.from({ length: Math.max(1, d.of) }, (_, i) => (i < d.ring ? '●' : '○')).join(
    '',
  );
  const bd = band(b);
  const above = bd && pullsIn(b, band0);
  // The place you stand at, if any (within ENTER_LI, as the right-click menu reads it), and the lore
  // of it or of the land round you.
  const atPlace =
    map.places
      .filter(
        (p) =>
          known(life, p.id) !== 'unknown' &&
          Math.hypot(p.x - life.at[0], p.y - life.at[1]) < ENTER_LI,
      )
      .sort(
        (p, q) =>
          Math.hypot(p.x - life.at[0], p.y - life.at[1]) -
          Math.hypot(q.x - life.at[0], q.y - life.at[1]),
      )[0] ?? null;
  const hereLore = atPlace?.lore || areaAt(map, life.at)?.lore || '';
  // What the road brought: the waiting first, then the sensed nearest first. The card shown is the
  // one opened, else the first waiting; a card that starts waiting opens the Card tab.
  const ahead = [...life.encounters].sort(
    (a, z) =>
      (a.state === 'waiting' ? -1 : 0) - (z.state === 'waiting' ? -1 : 0) ||
      Math.hypot(a.at[0] - life.at[0], a.at[1] - life.at[1]) -
        Math.hypot(z.at[0] - life.at[0], z.at[1] - life.at[1]),
  );
  const shown =
    ahead.find((e) => e.id === openEnc) ?? ahead.find((e) => e.state === 'waiting') ?? null;
  const waitingId = ahead.find((e) => e.state === 'waiting')?.id ?? null;
  const [lastWaiting, setLastWaiting] = useState(waitingId);
  if (lastWaiting !== waitingId) {
    setLastWaiting(waitingId);
    if (waitingId) setTab('card');
  }
  // The Card tab is always there (Jan's note in A5.1); once the card shown is answered, the column
  // goes back to the journey.
  const shownId = shown?.id ?? null;
  const [lastShown, setLastShown] = useState(shownId);
  if (lastShown !== shownId) {
    setLastShown(shownId);
    if (!shownId) setTab('journey');
  }
  const tabNow = tab;
  // An encounter is read in the square (F1); the Card tab keeps its stub.
  const openCard = (id: string) => {
    setOpenEnc(id);
    setTab('card');
    openSquare({ kind: 'encounter', id });
  };
  // The Map looked at: the road's encounters stop lighting its glyph.
  const encIds = life.encounters.map((e) => e.id).join(',');
  useEffect(() => {
    seeEncounters(encIds ? encIds.split(',') : []);
  }, [encIds]);
  // What the road brings and the postings you hold, as round seals over the map.
  const marks: { id: string; at: Pt; template: string; how?: Encounter['how']; board?: boolean }[] =
    [
      ...life.encounters.map((e) => ({ id: e.id, at: e.at, template: e.template, how: e.how })),
      ...life.postings
        .filter((p) => !p.done)
        .map((p) => ({ id: `post:${p.id}`, at: p.spot, template: p.template, board: true })),
    ];

  // The quest you follow: its next step's place, or its giver's to hand it in (core/journal.ts).
  const f = following(game);
  const questAt = f?.place
    ? { at: [f.place.x, f.place.y] as Pt, title: f.quest.title, text: f.text }
    : null;

  return (
    <div className="map-screen">
      {laying && <PlacingScene game={game} at="ground" onClose={() => setLaying(false)} />}
      <div className="map-stage" ref={stage} data-guide="map">
        <canvas
          ref={canvas}
          className={`map-canvas${hover ? '' : ' is-go'}`}
          aria-label={`The map of ${map.name}`}
          onPointerDown={onDown}
          onPointerMove={onMove}
          onPointerUp={onUp}
          onPointerLeave={() => setTip(null)}
          onContextMenu={onContext}
        />
        {marks.map((e) => {
          const [x, y] = toScreen(v, size.W, size.H, e.at);
          if (x < -40 || y < -40 || x > size.W + 40 || y > size.H + 40) return null;
          const t = encounterTemplate(e.template);
          const danger = !e.board && e.how !== 'seen';
          return (
            <button
              key={e.id}
              type="button"
              className={`map-enc is-${t.kind}${danger ? ' is-danger' : ''}${e.board ? ' is-posting' : ''}${openEnc === e.id ? ' is-open' : ''}`}
              style={{ left: x, top: y }}
              title={e.board ? `Bounty: ${t.title}` : t.title}
              onPointerDown={(ev) => ev.stopPropagation()}
              onClick={() => !e.board && openCard(e.id)}
            >
              <span className="hanzi">{e.board ? '榜' : sealOf(t)}</span>
            </button>
          );
        })}
        {questAt &&
          (() => {
            const [x, y] = toScreen(v, size.W, size.H, questAt.at);
            if (x < -40 || y < -40 || x > size.W + 40 || y > size.H + 40) return null;
            return (
              <span
                className="map-enc is-quest"
                style={{ left: x, top: y }}
                title={`${questAt.title}: ${questAt.text}`}
              >
                <span className="hanzi">志</span>
              </span>
            );
          })()}
        <div className="map-float map-zoom">
          <button
            type="button"
            aria-label="Zoom in"
            onClick={() => zoomAt(OPEN[0] + openW / 2, OPEN[1] + openH / 2, 1.6)}
          >
            +
          </button>
          <button
            type="button"
            aria-label="Zoom out"
            onClick={() => zoomAt(OPEN[0] + openW / 2, OPEN[1] + openH / 2, 1 / 1.6)}
          >
            −
          </button>
          <button
            type="button"
            className="is-word"
            title="All you have charted"
            onClick={fitCharted}
          >
            All
          </button>
          <button
            type="button"
            className="is-word"
            onClick={() => setView(centred(life.at, clampK(Math.max(v.k, 0.03))))}
          >
            You
          </button>
        </div>
        {tip && hover && (
          <div
            className="map-tip panel"
            style={{
              left: Math.min(tip.x + 14, size.W - 270),
              top: Math.min(tip.y + 14, size.H - 100),
            }}
          >
            <b>{hover.name}</b> <span className="hanzi">{hover.hanzi}</span>
            <p className="muted">
              {stateWords(known(life, hover.id))}
              {'outline' in hover && isDeadly(map, hover, band0) ? ' · deadly' : ''}
              {'gated' in hover && hover.gated ? ' · gated' : ''}
            </p>
            {hover.lore && known(life, hover.id) !== 'unknown' && <p>{hover.lore}</p>}
            {known(life, hover.id) !== 'seen' && life.told[hover.id] && (
              <p className="muted">From {life.told[hover.id]}.</p>
            )}
          </div>
        )}
        {menu && (
          <div
            className="map-menu panel"
            style={{
              left: Math.max(4, Math.min(menu.x, size.W - 290)),
              top: Math.max(4, Math.min(menu.y, size.H - 240)),
            }}
            onPointerDown={(e) => e.stopPropagation()}
          >
            <div className="map-menu-head">{menu.head}</div>
            {menu.items.map((it, i) =>
              it.sep ? (
                <div key={i} className="map-menu-sep" />
              ) : (
                <button
                  key={i}
                  type="button"
                  className={`${it.later ? 'is-later' : ''} ${it.warn ? 'is-warn' : ''}`}
                  onClick={() => {
                    setMenu(null);
                    it.run?.();
                  }}
                >
                  {it.t}
                  {it.s && <span>{it.s}</span>}
                </button>
              ),
            )}
          </div>
        )}
        {toast && <div className="map-toast panel">{toast}</div>}
        {dutyAsk && (
          <div className="map-leave panel" role="alertdialog" aria-label="Leave your post?">
            <span className="map-label">Leave your post?</span>
            <p>{dutyAsk.text}</p>
            <p className="muted">A missed duty day costs standing with the power.</p>
            <div className="map-buttons">
              <button type="button" className="button" onClick={stayOnDuty}>
                Stay
              </button>
              <button
                type="button"
                className="button button-danger"
                onClick={() => leaveAnyway(game)}
              >
                Leave anyway
              </button>
            </div>
          </div>
        )}
        {leaving && life.group && (
          <div className="map-leave panel" role="alertdialog" aria-label="Leave the group?">
            <span className="map-label">
              {life.group.kind === 'ship' ? 'Leave the ship?' : 'Leave the caravan?'}
            </span>
            <p>{life.group.leaveCost}</p>
            <p className="muted">
              Travelling with a group, the group sets the course. Your wheel stays yours.
            </p>
            <div className="map-buttons">
              <button type="button" className="button" onClick={() => setLeaving(false)}>
                Stay with them
              </button>
              <button
                type="button"
                className="button button-danger"
                onClick={() => {
                  setLeaving(false);
                  act(leaveGroup);
                }}
              >
                Leave
              </button>
            </div>
          </div>
        )}
      </div>
      <div className="map-shade" aria-hidden="true" />
      <aside className="map-col" aria-label="Where you stand and the road">
        <div className="seg map-tabs" role="tablist" aria-label="What the column shows">
          {COLUMN_TABS.map((t) => (
            <button
              key={t.id}
              type="button"
              role="tab"
              aria-pressed={tabNow === t.id}
              aria-selected={tabNow === t.id}
              onClick={() => setTab(t.id)}
            >
              {t.name} <span className="hanzi">{t.hanzi}</span>
              {t.id === 'card' && shown?.state === 'waiting' && (
                <span className="menu-mark" role="img" aria-label="a card waits" />
              )}
            </button>
          ))}
        </div>
        {above && (
          <p className="map-above">
            A realm above you: what lives here likely finds you first, unless your Stealth outdoes
            its Perception.
          </p>
        )}
        {tabNow === 'journey' ? (
          // Where you stand and where you're headed (Jan's notes after A5.1's first look): the place
          // or the land, how deep, its lore and what you can do there, then the course and what's
          // ahead. A place's picture stands at the top once places have art.
          <>
            <section className="map-here-tab">
              <span className="map-label">Currently at</span>
              <h3 className="map-here-name">
                {hereWords(game)}
                {atPlace && <span className="hanzi"> {atPlace.hanzi}</span>}
              </h3>
              <p className="map-here-line" data-guide="sense">
                {TERRAIN_WORDS[terrainAt(map, life.at)] ?? terrainAt(map, life.at)} · {QI_NAMES[qd]}{' '}
                qi ({qd}) · you see {sightAt(map, life.at)} li
              </p>
              <p className="map-depth">
                <span className="map-pips" title="How deep into the wilds">
                  {pips}
                </span>{' '}
                {d.name}:{' '}
                {bd ? `beasts of ${bd.name} · ${bd.finds} finds` : 'nothing past mortal beasts'}
              </p>
              {hereLore && <p className="map-here-lore">{hereLore}</p>}
              <div className="map-here-acts">
                {hereChoices(atPlace).map((it, i) => (
                  <button
                    // Two piles in reach share a title, so the key takes the place in the list too.
                    key={`${i}:${it.t}`}
                    type="button"
                    className={it.warn ? 'is-warn' : undefined}
                    onClick={() => it.run?.()}
                  >
                    {it.t}
                    {it.s && <span>{it.s}</span>}
                  </button>
                ))}
              </div>
              {readToday(life, game.calendar.day) && (
                <p className="map-here-lore">
                  <b>Read today 堪舆</b>: your reading stands at {bandName(geomancyOf(game.player))}{' '}
                  within {geomancyLi(game.player)} li.{' '}
                  {readVeins.length
                    ? `${readVeins.length} vein${readVeins.length === 1 ? '' : 's'} on your map, unclaimed.`
                    : 'No vein your reading meets lies close.'}{' '}
                  The land grows{' '}
                  {gatherLines(map, life.at)
                    .slice(0, 3)
                    .map((id) => item(id).name)
                    .join(', ') || 'nothing worth gathering'}
                  .
                </p>
              )}
            </section>
            <CourseCard
              game={game}
              map={map}
              life={life}
              act={act}
              ahead={ahead}
              shown={shown?.id ?? null}
              onOpen={openCard}
              onLeave={() => setLeaving(true)}
            />
          </>
        ) : tabNow === 'card' ? (
          shown ? (
            <Stub
              kicker={shown.state === 'waiting' ? 'Waits on your road' : 'Sensed ahead'}
              title={encounterTemplate(shown.template).title}
              onOpen={() => openSquare({ kind: 'encounter', id: shown.id })}
            />
          ) : (
            <p className="map-card-none">
              Nothing waits on you. What the road brings shows here, and opens this tab when it
              waits.
            </p>
          )
        ) : (
          <RoadPanel game={game} life={life} act={act} />
        )}
      </aside>
    </div>
  );
}

const stateWords = (st: string) =>
  ({ seen: 'Seen', sketched: 'Sketched', rumored: 'Rumored', unknown: 'Unknown' })[st] ?? st;

/** A spot's name: its kingdom, its tract of wilds, or the sea. */
function hereAt(map: RegionMap, w: Pt): string {
  if (terrainAt(map, w) === 'sea') return 'the sea';
  return areaAt(map, w)?.name ?? map.name;
}

// ---------------------------------------------------------------- the road wheel

/** Every road hour's color; a new kind of hour fails to compile here until it has one. */
const ROAD_COLOR: Record<RoadHour, string> = {
  travel: 'var(--hour-travel)',
  look: 'var(--hour-look)',
  guard: 'var(--hour-guard)',
  home: 'var(--hour-home)',
  gather: 'var(--hour-gather)',
  qi: 'var(--hour-qi)',
  body: 'var(--hour-body)',
  soul: 'var(--hour-soul)',
  study: 'var(--hour-study)',
  practice: 'var(--hour-practice)',
  sleep: 'var(--hour-sleep)',
  duty: 'var(--hour-duty)',
  craft: 'var(--hour-craft)',
};

/** The three stances (P3.7): what the road brings settles by them, whether you watch or not. */
const STANCE_WORDS: Record<Stance, [string, string]> = {
  avoid: [
    'Avoid',
    'Goes round all you sense; met by something, slips away when that is clear. No fights; finds on the course only.',
  ],
  careful: [
    'Careful',
    'Hunts the sure kills and takes clear sneaks and flights; gathers finds. Anything else waits for you.',
  ],
  bold: [
    'Bold',
    'Takes what is clear or close. A kept person, a bond or standing and a plot still wait for you.',
  ],
};

type Act = (change: Parameters<ReturnType<typeof useGame.getState>['mapAct']>[0]) => string | null;

function RoadPanel({ game, life, act }: { game: GameState; life: MapLife; act: Act }) {
  const road = !!life.course;
  const hours: RoadHour[] = road ? roadHours(life, game.player) : [...game.player.wheel];
  const hour = Math.floor((((game.calendar.day % 1) + 1) % 1) * 12);
  const w = WAYS.find((x) => x.id === life.way)!;
  /** Mount rides a spirit mount if you have one, else a horse. */
  const mountWay: WayId = canGoBy(game, 'mount').ok
    ? 'mount'
    : canGoBy(game, 'horse').ok
      ? 'horse'
      : 'mount';
  const riding = !!w.rideHours;
  const cur = hours[hour]!;
  const doing = !road
    ? ROAD_WORD[cur]
    : waiting(life).length
      ? 'camped: a card waits for you'
      : riding && hour >= 4 && hour < 4 + (w.rideHours ?? 0)
        ? 'riding, cultivating at half'
        : cur === 'sleep'
          ? `asleep ${sleepPlace(game)}`
          : cur === 'travel'
            ? 'on the road'
            : ROAD_WORD[cur];
  const pace = paceOf(game);
  const perDay = liPerDay(game);
  const veil = veilReach(game);
  const R1 = 60;
  const R0 = 32;
  const pol = (r: number, deg: number): [number, number] => {
    const a = ((deg - 90) * Math.PI) / 180;
    return [r * Math.cos(a), r * Math.sin(a)];
  };
  return (
    <section className="map-road">
      <div className="map-wheel-row">
        <svg
          viewBox="-64 -64 128 128"
          className="map-wheel"
          aria-label={road ? 'The road wheel' : 'The home wheel'}
        >
          {hours.map((h, i) => {
            const [x1, y1] = pol(R1, i * 30 - 14.4);
            const [x2, y2] = pol(R1, i * 30 + 14.4);
            const [x3, y3] = pol(R0, i * 30 + 14.4);
            const [x4, y4] = pol(R0, i * 30 - 14.4);
            const [tx, ty] = pol((R0 + R1) / 2, i * 30);
            // An hour opens on Routine's wheel, where the day is set (P3.7's fix).
            return (
              <g key={i} className="is-editable" onClick={() => goToWheel(road, i)}>
                <path
                  d={`M${x1} ${y1}A${R1} ${R1} 0 0 1 ${x2} ${y2}L${x3} ${y3}A${R0} ${R0} 0 0 0 ${x4} ${y4}Z`}
                  fill={ROAD_COLOR[h]}
                  opacity={i === hour ? 1 : h === 'sleep' ? 0.55 : 0.78}
                  stroke={i === hour ? '#e9e5da' : 'none'}
                  strokeWidth={1.3}
                >
                  <title>{`${BRANCHES[i]!.hanzi}: ${ROAD_WORD[h] ?? h}`}</title>
                </path>
                <text x={tx} y={ty + 4} textAnchor="middle" className="map-wheel-branch">
                  {BRANCHES[i]!.hanzi}
                </text>
              </g>
            );
          })}
          <line
            x1={0}
            y1={0}
            x2={pol(R0 - 4, hour * 30)[0]}
            y2={pol(R0 - 4, hour * 30)[1]}
            stroke="var(--accent)"
            strokeWidth={1.6}
            strokeLinecap="round"
          />
          <circle r={3} fill="var(--accent)" />
        </svg>
        <div className="map-wheel-side">
          <div className="map-label">Road routine</div>
          <div className="map-chips">
            {roadRoutines(life)
              .filter((r) => !r.groupOnly || life.roadRoutine === r.id)
              .map((r) => (
                <button
                  key={r.id}
                  type="button"
                  className="map-chip"
                  aria-pressed={life.roadRoutine === r.id}
                  disabled={!!life.group}
                  title={`${r.name}: ${r.note}`}
                  onClick={() => act((s) => followRoadRoutine(s, r.id))}
                >
                  {r.short}
                </button>
              ))}
          </div>
          <p className="map-pace">
            <b>
              {BRANCHES[hour]!.hanzi} · {doing}
            </b>
            <br />
            {Math.round(perDay).toLocaleString('en-US')} li a day, {Math.round(pace)} a double-hour
            ·{' '}
            {road
              ? life.group
                ? `${life.group.name} keeps these hours`
                : 'tap an hour to set it in Routine'
              : 'the home wheel; tap an hour to set it in Routine'}
          </p>
        </div>
      </div>
      <div className="map-road-block">
        <div className="map-label">Mode of travel</div>
        {/* Every way shows, the ones not open to you greyed with why (Jan's notes in A5.1). A horse
            and a spirit mount are one entry, Mount, riding the best you own. */}
        <Picker
          label="Mode of travel"
          value={life.way === 'horse' ? 'mount' : life.way}
          options={WAYS.filter((x) => x.id !== 'horse').map((x) => {
            const id = x.id === 'mount' ? mountWay : x.id;
            const check = canGoBy(game, id);
            const shut = !check.ok || (!!life.group && life.way !== id);
            return {
              id: x.id,
              name: x.id === 'mount' && id === 'horse' ? 'Mount · your horse' : x.name,
              disabled: shut,
              note: !check.ok
                ? x.id === 'mount'
                  ? 'You have no horse or spirit mount.'
                  : check.reason
                : life.group
                  ? `${life.group.name} sets it.`
                  : undefined,
            };
          })}
          onChange={(id) => act((s) => goBy(s, (id === 'mount' ? mountWay : id) as WayId))}
        />
      </div>
      <div className="map-road-block">
        <div className="map-label">When the road brings something</div>
        <div className="map-chips">
          {STANCES.map((k) => (
            <button
              key={k}
              type="button"
              className="map-chip"
              aria-pressed={life.stance === k}
              onClick={() => act((s) => setStance(s, k))}
            >
              {STANCE_WORDS[k][0]}
            </button>
          ))}
        </div>
        <p className="map-stance-note">{STANCE_WORDS[life.stance][1]}</p>
        <button
          type="button"
          className="map-toggle"
          aria-pressed={life.veiled}
          disabled={!veil && !life.veiled}
          title={veil ? undefined : 'Veiled Aura, on the Qi tree, lets you show a lower realm.'}
          onClick={() => act((s) => setVeil(s, !life.veiled))}
        >
          <i />
          {veil
            ? `Travel veiled · show ${realmWords(veil.shown)} (${veil.stages} ${veil.stages === 1 ? 'stage' : 'stages'} of concealment)`
            : 'Travel veiled · needs concealment (Veiled Aura)'}
        </button>
      </div>
    </section>
  );
}

function realmWords(r: { realm: RealmId; stage: number }): string {
  return `${realmInfo(r.realm).name}, ${stageName(r.realm, r.stage)}`;
}

// ---------------------------------------------------------------- the course card

function CourseCard({
  game,
  map,
  life,
  act,
  ahead,
  shown,
  onOpen,
  onLeave,
}: {
  game: GameState;
  map: RegionMap;
  life: MapLife;
  act: Act;
  /** What the road brought, the waiting first; a row opens its card in the Card tab. */
  ahead: Encounter[];
  shown: string | null;
  onOpen: (id: string) => void;
  onLeave: () => void;
}) {
  const course = life.course;
  const realSeconds = (days: number) => days / daysPerRealMs(game) / 1000;
  const realWords = (days: number) => {
    const s = realSeconds(days);
    return s < 90 ? `${Math.max(1, Math.round(s))} s` : `${Math.round(s / 60)} real minutes`;
  };
  const aheadList = ahead.length > 0 && (
    <>
      <div className="map-label">Ahead</div>
      <div className="map-ahead">
        {ahead.map((e) => (
          <AheadRow
            key={e.id}
            e={e}
            life={life}
            game={game}
            open={shown === e.id}
            onOpen={() => onOpen(e.id)}
          />
        ))}
      </div>
    </>
  );
  if (!course) {
    const counts = Object.values(life.know);
    return (
      <section className="map-card">
        <span className="map-label">Where to</span>
        <p>
          Click anywhere on the map to set a course, or a place you know. Right-click for what you
          can do there.
        </p>
        <dl className="map-rows">
          <dt>Places known</dt>
          <dd>
            {counts.length} · {counts.filter((v) => v === 'seen').length} seen,{' '}
            {counts.filter((v) => v === 'rumored').length} rumored
          </dd>
          <dt>Pins</dt>
          <dd>{life.pins.length}</dd>
          {life.postings.length > 0 && (
            <>
              <dt>Postings</dt>
              <dd>
                {life.postings.filter((p) => p.done).length} done of {life.postings.length} held
              </dd>
            </>
          )}
        </dl>
        {aheadList}
      </section>
    );
  }
  const target = course.target ? placeById(map, course.target) : null;
  // How far along you are by where you stand on the course, so a stop on the road holds it still.
  let liLeftExact = 0;
  let from = life.at;
  for (let i = course.at; i < course.pts.length; i++) {
    const q = course.pts[i]!;
    liLeftExact += Math.hypot(q[0] - from[0], q[1] - from[1]);
    from = q;
  }
  const total = Math.max(1, course.roadLi + course.crossLi);
  const done = Math.min(1, Math.max(0, 1 - liLeftExact / total));
  const left = (course.days * liLeftExact) / total + life.detour / Math.max(1, liPerDay(game));
  const dest = target
    ? `${target.name.replace(/^The /, 'the ')}${known(life, target.id) === 'rumored' ? ' (its ring)' : ''}`
    : `a point in ${hereAt(map, course.to)}`;
  const g = life.group;
  const above = pullsIn(course.maxBand, yourBand(game.player));
  const halted = waiting(life).length > 0;
  const liLeft = Math.round(liLeftExact / 100) * 100;
  return (
    <section className="map-card">
      <span className="map-label">{g ? 'Travelling with a group' : 'On the road'}</span>
      <h3>
        {g ? g.name : `To ${dest}`}
        {!g && target && <span className="hanzi"> {target.hanzi}</span>}
      </h3>
      <div className="map-progress">
        <i style={{ width: `${(done * 100).toFixed(1)}%` }} />
      </div>
      <dl className="map-rows">
        {g && (
          <>
            <dt>Bound for</dt>
            <dd>
              {placeById(map, g.bound)?.name ?? dest}, led by {g.leader}
              {g.pay > 0 ? ` · ${Math.floor(g.owed)} low-grade owed` : ''}
            </dd>
          </>
        )}
        <dt>Left</dt>
        <dd>
          {liLeft.toLocaleString('en-US')} li · {Math.ceil(left)} days
          {course.crossLi > 1
            ? ` · ${Math.round(course.crossLi).toLocaleString('en-US')} cross-country in all`
            : ''}
        </dd>
        <dt>Arrives</dt>
        <dd>
          {halted
            ? 'when you go on'
            : `${worldWhen(game.calendar.day + left)} · ${realWords(left)}`}
        </dd>
        <dt>Now</dt>
        <dd className={halted ? 'is-halted' : ''}>
          {halted
            ? 'Stopped: a card waits for you. You camp and cultivate where you stand.'
            : life.detour > 0
              ? `Going round, ${Math.round(life.detour)} li cross-country before the road.`
              : `On the move. ${course.tolls.length ? `${course.tolls.length} checkpoints on the way, a toll of ${CHECKPOINT_TOLL_LOW} low-grade each.` : ''}`}
        </dd>
      </dl>
      {above && (
        <p className="map-above">
          The course crosses ground a realm above you ({band(course.maxBand)?.name}). What lives
          there likely finds you first, and Avoid only goes round what hasn't.
        </p>
      )}
      {aheadList}
      <div className="map-buttons">
        {g ? (
          <button type="button" className="button button-quiet" onClick={onLeave}>
            {g.kind === 'ship' ? 'Leave the ship…' : 'Leave the caravan…'}
          </button>
        ) : (
          <>
            <button type="button" className="button button-quiet" onClick={() => act(stopHere)}>
              Stop here
            </button>
            <button
              type="button"
              className="button button-quiet"
              onClick={() => courseOrAsk(game, () => act((s) => goToPlace(s, homeOf(s, map).id)))}
            >
              Turn back home
            </button>
          </>
        )}
      </div>
    </section>
  );
}

function AheadRow({
  e,
  life,
  game,
  open,
  onOpen,
}: {
  e: Encounter;
  life: MapLife;
  game: GameState;
  open: boolean;
  onOpen: () => void;
}) {
  const t = encounterTemplate(e.template);
  const li = Math.hypot(e.at[0] - life.at[0], e.at[1] - life.at[1]);
  const hours = Math.max(1, Math.round((li / Math.max(1, paceOf(game))) * 2));
  const when = e.state === 'waiting' ? 'waiting' : e.how === 'seen' ? `${hours} h` : 'on you';
  return (
    <button
      type="button"
      className={`map-ahead-row${open ? ' is-open' : ''}${e.state === 'waiting' ? ' is-waiting' : ''}`}
      onClick={onOpen}
    >
      <span className={`enc-seal is-mini is-${t.kind}${e.how !== 'seen' ? ' is-danger' : ''}`}>
        {sealOf(t)}
      </span>
      <span>{t.title}</span>
      <span className="map-ahead-when">{when}</span>
    </button>
  );
}
