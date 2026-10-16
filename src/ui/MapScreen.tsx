// The Map 舆图 (design § The world, The travel map): the Border Wilds under drifting cloud, a click
// to set a course and the clock carrying you along it, a right-click for choices, and the bar under
// the map with the road wheel, its routine and the ways of going on the left and the course card on
// the right. The line under the date says where you stand and how deep.
import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { BRANCHES, HOUR_KINDS, type HourKind } from '../content/hours.ts';
import { QI_NAMES, ROAD_ROUTINES, WAYS, type RoadHour, type WayId } from '../content/map/travel.ts';
import { worldWhen } from '../core/chronicle.ts';
import { daysPerRealMs } from '../core/loop.ts';
import { band, bandAt, depthInfo, pullsIn, qiAt } from '../core/map/depth.ts';
import { known, sightAt } from '../core/map/fog.ts';
import { enterAt, gateOf, placeKindOf } from '../core/map/gate.ts';
import type { Pt } from '../core/map/geometry.ts';
import {
  areaAt,
  placeById,
  terrainAt,
  type MapArea,
  type MapPlace,
  type RegionMap,
} from '../core/map/region.ts';
import type { MapLife } from '../core/map/schema.ts';
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
  setRoadHour,
  sleepPlace,
  stopHere,
  unpin,
  yourBand,
} from '../core/map/travel.ts';
import type { GameState } from '../core/state.ts';
import { hourKindOpen } from '../core/wheel.ts';
import { drawMap, isDeadly, pickAt, toScreen, toWorld, type View } from './map/draw.ts';
import { PlaceScreen } from './PlaceScreen.tsx';
import { useGame } from './store.ts';

const TERRAIN_WORDS: Record<string, string> = { sea: 'at sea' };

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
  if (!game || !map || !game.map) return <p className="muted">Unrolling the map…</p>;
  const place = inside ? placeById(map, inside) : undefined;
  if (place && looking !== inside)
    return <PlaceScreen game={game} map={map} place={place} onMap={() => setLooking(inside)} />;
  return <MapView game={game} map={map} life={game.map} onGoIn={() => setLooking(null)} />;
}

function MapView({
  game,
  map,
  life,
  onGoIn,
}: {
  game: GameState;
  map: RegionMap;
  life: MapLife;
  onGoIn: () => void;
}) {
  const mapAct = useGame((s) => s.mapAct);
  const stage = useRef<HTMLDivElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const layers = useRef<{
    fog: CanvasRenderingContext2D;
    mask: CanvasRenderingContext2D;
  } | null>(null);
  const [size, setSize] = useState({ W: 0, H: 0, dpr: 1 });
  const [view, setView] = useState<View>(() => ({ x: life.at[0], y: life.at[1], k: 0.012 }));
  const [hover, setHover] = useState<MapPlace | MapArea | null>(null);
  const [tip, setTip] = useState<{ x: number; y: number } | null>(null);
  const [menu, setMenu] = useState<Menu | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [leaving, setLeaving] = useState(false);
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

  // Size the canvases to the stage.
  useLayoutEffect(() => {
    const el = stage.current;
    if (!el) return;
    const fit = () => {
      const r = el.getBoundingClientRect();
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      const W = Math.max(1, r.width);
      const H = Math.max(1, r.height);
      const mk = () => {
        const c = document.createElement('canvas');
        return c.getContext('2d')!;
      };
      layers.current ??= { fog: mk(), mask: mk() };
      for (const c of [canvas.current!, layers.current.fog.canvas, layers.current.mask.canvas]) {
        c.width = Math.round(W * dpr);
        c.height = Math.round(H * dpr);
      }
      setSize({ W, H, dpr });
    };
    fit();
    const ro = new ResizeObserver(fit);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // Draw on every change of the life, the view or the hover.
  useEffect(() => {
    const c = canvas.current;
    const L = layers.current;
    if (!c || !L || !size.W) return;
    const id = requestAnimationFrame(() =>
      drawMap(
        {
          ctx: c.getContext('2d')!,
          fog: L.fog,
          mask: L.mask,
          W: size.W,
          H: size.H,
          dpr: size.dpr,
          view,
        },
        { map, life, yourBand: band0, hover: hover?.id ?? null },
      ),
    );
    return () => cancelAnimationFrame(id);
  }, [map, life, view, hover, size, band0]);

  const scene = { map, life, yourBand: band0, hover: hover?.id ?? null };
  const pickAtSpot = (sx: number, sy: number) =>
    pickAt({ view, W: size.W, H: size.H }, scene, sx, sy);
  const local = (e: { clientX: number; clientY: number }) => {
    const r = canvas.current!.getBoundingClientRect();
    return [e.clientX - r.left, e.clientY - r.top] as const;
  };

  const zoomAt = (sx: number, sy: number, f: number) =>
    setView((v) => {
      const before = toWorld(v, size.W, size.H, sx, sy);
      const k = Math.max(0.004, Math.min(1.2, v.k * f));
      const nv = { ...v, k };
      const after = toWorld(nv, size.W, size.H, sx, sy);
      return { x: v.x + before[0] - after[0], y: v.y + before[1] - after[1], k };
    });
  useEffect(() => {
    const c = canvas.current;
    if (!c) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const r = c.getBoundingClientRect();
      zoomAt(e.clientX - r.left, e.clientY - r.top, Math.exp(-e.deltaY * 0.0015));
    };
    c.addEventListener('wheel', onWheel, { passive: false });
    return () => c.removeEventListener('wheel', onWheel);
  });

  const fitRegion = () => {
    const [x0, y0, x1, y1] = map.bbox;
    setView({
      x: (x0 + x1) / 2,
      y: (y0 + y1) / 2,
      k: Math.min(size.W / ((x1 - x0) * 1.08), size.H / ((y1 - y0) * 1.06)),
    });
  };

  // ---------------------------------------------------------------- choices

  const goTo = (to: Pt, target: string | null, enter = false) => {
    if (life.group) {
      setLeaving(true);
      return;
    }
    act((s) => setCourse(s, to, target, enter));
  };

  const placeFor = (q: MapPlace | MapArea): Pt =>
    known(life, q.id) === 'rumored' && life.rings[q.id]
      ? life.rings[q.id]!
      : 'x' in q
        ? [q.x, q.y]
        : life.at;

  const menuFor = (sx: number, sy: number): Menu => {
    const w = toWorld(view, size.W, size.H, sx, sy);
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
    const pinI = life.pins.findIndex((p) => {
      const [x, y] = toScreen(view, size.W, size.H, p);
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
    const [ux, uy] = toScreen(view, size.W, size.H, life.at);
    // A place under the cursor wins over your own mark beside it, so a place you stand near but
    // not at still offers going there.
    const here =
      q && 'x' in q
        ? Math.hypot(q.x - life.at[0], q.y - life.at[1]) < 250
        : Math.hypot(ux - sx, uy - sy) < 16;
    if (here) {
      const atPlace =
        q && 'x' in q && Math.hypot(q.x - life.at[0], q.y - life.at[1]) < 250 ? q : null;
      const home = homeOf(game, map);
      const items: MenuItem[] = [];
      if (atPlace && placeKindOf(atPlace)) {
        const gate = gateOf(game, map, atPlace);
        const goIn = (bribe = false) => {
          if (!act((s) => enterAt(s, map, atPlace, { bribe }))) onGoIn();
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
      }
      items.push({
        t: 'Stay and cultivate here',
        s: 'the home wheel turns here',
        run: () => act(stopHere),
      });
      if (home.id !== atPlace?.id)
        items.push({ t: 'Go home', s: home.name, run: () => act((s) => goToPlace(s, home.id)) });
      return { x: sx, y: sy, head: atPlace?.name ?? 'Where you stand', items };
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
        later('Found an abode here', 'a site of your own', 'M4'),
        later('Raise a sect or a faction here', 'a project', 'M5'),
      ],
    };
  };

  // ---------------------------------------------------------------- pointer

  const onDown = (e: React.PointerEvent) => {
    if (e.button !== 0) return;
    drag.current = { x: e.clientX, y: e.clientY, vx: view.x, vy: view.y, moved: false };
    (e.target as Element).setPointerCapture(e.pointerId);
    setMenu(null);
  };
  const onMove = (e: React.PointerEvent) => {
    const d = drag.current;
    if (d) {
      const dx = e.clientX - d.x;
      const dy = e.clientY - d.y;
      if (Math.hypot(dx, dy) > 4) d.moved = true;
      if (d.moved) setView((v) => ({ ...v, x: d.vx - dx / v.k, y: d.vy - dy / v.k }));
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
    else goTo(toWorld(view, size.W, size.H, sx, sy), null);
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

  return (
    <div className="map-screen">
      <div className="map-stage" ref={stage}>
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
        <div className="map-float map-where panel">
          <span className="map-date">{worldWhen(game.calendar.day)}</span>
          <span className="map-here">
            {hereWords(game)} · {TERRAIN_WORDS[terrainAt(map, life.at)] ?? terrainAt(map, life.at)}{' '}
            · qi density {qd}, {QI_NAMES[qd]} · you see {sightAt(map, life.at)} li
          </span>
          <span className="map-depth">
            <span className="map-pips" title="How deep into the wilds">
              {pips}
            </span>{' '}
            {d.name}:{' '}
            {bd ? `beasts of ${bd.name} · ${bd.finds} finds` : 'nothing past mortal beasts'}
            {above && (
              <b className="map-above"> · a realm above you: what lives here finds you first</b>
            )}
          </span>
        </div>
        <div className="map-float map-zoom panel">
          <button
            type="button"
            aria-label="Zoom in"
            onClick={() => zoomAt(size.W / 2, size.H / 2, 1.6)}
          >
            +
          </button>
          <button
            type="button"
            aria-label="Zoom out"
            onClick={() => zoomAt(size.W / 2, size.H / 2, 1 / 1.6)}
          >
            −
          </button>
          <button type="button" className="is-word" onClick={fitRegion}>
            Region
          </button>
          <button
            type="button"
            className="is-word"
            onClick={() =>
              setView((v) => ({ x: life.at[0], y: life.at[1], k: Math.max(v.k, 0.03) }))
            }
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
      <div className="map-bar">
        <RoadPanel game={game} life={life} act={act} />
        <CourseCard game={game} map={map} life={life} act={act} onLeave={() => setLeaving(true)} />
      </div>
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

const ROAD_COLOR: Record<string, string> = {
  travel: 'var(--hour-travel)',
  look: 'var(--hour-look)',
  guard: 'var(--hour-guard)',
  qi: 'var(--hour-qi)',
  body: 'var(--hour-body)',
  soul: 'var(--hour-soul)',
  study: 'var(--hour-study)',
  practice: 'var(--hour-practice)',
  sleep: 'var(--hour-sleep)',
};

const ROAD_WORD: Record<string, string> = {
  travel: 'travel',
  look: 'look around and make camp',
  guard: 'guard the caravan',
  ...Object.fromEntries(Object.entries(HOUR_KINDS).map(([k, v]) => [k, v.name.toLowerCase()])),
};

const PICK: RoadHour[] = ['travel', 'look', 'qi', 'body', 'soul', 'study', 'practice'];

type Act = (change: Parameters<ReturnType<typeof useGame.getState>['mapAct']>[0]) => string | null;

function RoadPanel({ game, life, act }: { game: GameState; life: MapLife; act: Act }) {
  const onRoadNow = !!life.course;
  const [tab, setTab] = useState<'road' | 'home' | null>(null);
  const [picking, setPicking] = useState<number | null>(null);
  const road = tab ? tab === 'road' : onRoadNow;
  const hours: string[] = road ? roadHours(life, game.player) : [...game.player.wheel];
  const hour = Math.floor((((game.calendar.day % 1) + 1) % 1) * 12);
  const w = WAYS.find((x) => x.id === life.way)!;
  const riding = !!w.rideHours;
  const cur = hours[hour]!;
  const doing = !road
    ? ROAD_WORD[cur]
    : riding && hour >= 4 && hour < 4 + (w.rideHours ?? 0)
      ? 'riding, cultivating at half'
      : cur === 'sleep'
        ? `asleep ${sleepPlace(game)}`
        : cur === 'travel'
          ? 'walking'
          : ROAD_WORD[cur];
  const pace = paceOf(game);
  const perDay = liPerDay(game);
  const routine = roadRoutines(life).find((r) => r.id === life.roadRoutine) ?? ROAD_ROUTINES[0]!;
  const R1 = 60;
  const R0 = 32;
  const pol = (r: number, deg: number): [number, number] => {
    const a = ((deg - 90) * Math.PI) / 180;
    return [r * Math.cos(a), r * Math.sin(a)];
  };
  return (
    <section className="map-road panel">
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
            const editable = road && h !== 'sleep' && !life.group;
            return (
              <g
                key={i}
                className={editable ? 'is-editable' : ''}
                onClick={() => editable && setPicking(i)}
              >
                <path
                  d={`M${x1} ${y1}A${R1} ${R1} 0 0 1 ${x2} ${y2}L${x3} ${y3}A${R0} ${R0} 0 0 0 ${x4} ${y4}Z`}
                  fill={ROAD_COLOR[h] ?? 'var(--hour-qi)'}
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
          <div className="map-chips">
            <button
              type="button"
              className="map-chip"
              aria-pressed={road}
              onClick={() => setTab('road')}
            >
              Road wheel
            </button>
            <button
              type="button"
              className="map-chip"
              aria-pressed={!road}
              onClick={() => setTab('home')}
            >
              Home wheel
            </button>
          </div>
          <b>
            {BRANCHES[hour]!.hanzi} · {doing}
          </b>
          <span className="muted">
            {road
              ? life.group
                ? `${life.group.name} keeps these hours.`
                : 'Tap an hour to change it.'
              : 'The home wheel is set in Cultivate.'}
          </span>
          <span className="map-pace">
            <b>{Math.round(pace)} li</b> a double-hour ·{' '}
            <b>{Math.round(perDay).toLocaleString('en-US')} li</b> a day
          </span>
        </div>
      </div>
      {picking !== null && (
        <div className="map-picker" role="menu">
          <div className="map-menu-head">
            {BRANCHES[picking]!.hanzi} · {BRANCHES[picking]!.time}
          </div>
          {PICK.filter(
            (k) => k === 'travel' || k === 'look' || hourKindOpen(game.player, k as HourKind),
          ).map((k) => (
            <button
              key={k}
              type="button"
              onClick={() => {
                act((s) => setRoadHour(s, picking, k));
                setPicking(null);
              }}
            >
              <i style={{ background: ROAD_COLOR[k] }} />{' '}
              {ROAD_WORD[k]![0]!.toUpperCase() + ROAD_WORD[k]!.slice(1)}
            </button>
          ))}
          <button type="button" className="is-later" onClick={() => setPicking(null)}>
            Cancel
          </button>
        </div>
      )}
      <div>
        <div className="map-label">Road routine</div>
        <div className="map-chips">
          {roadRoutines(life).map((r) => (
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
      </div>
      <div>
        <div className="map-label">Going by</div>
        <div className="map-chips">
          {WAYS.filter((x) => !x.groupOnly).map((x) => {
            const check = canGoBy(game, x.id);
            return (
              <button
                key={x.id}
                type="button"
                className="map-chip"
                aria-pressed={life.way === x.id}
                disabled={!check.ok || !!life.group}
                title={check.ok ? x.note : check.reason}
                onClick={() => act((s) => goBy(s, x.id as WayId))}
              >
                {x.name}
              </button>
            );
          })}
        </div>
      </div>
      <p className="map-pace">
        {routine.note}
        {w.note ? ` · ${w.note}` : ''}
      </p>
    </section>
  );
}

// ---------------------------------------------------------------- the course card

function CourseCard({
  game,
  map,
  life,
  act,
  onLeave,
}: {
  game: GameState;
  map: RegionMap;
  life: MapLife;
  act: Act;
  onLeave: () => void;
}) {
  const course = life.course;
  const realSeconds = (days: number) => days / daysPerRealMs(game) / 1000;
  const realWords = (days: number) => {
    const s = realSeconds(days);
    return s < 90 ? `${Math.max(1, Math.round(s))} s` : `${Math.round(s / 60)} min`;
  };
  if (!course) {
    const counts = Object.values(life.know);
    return (
      <section className="map-card panel">
        <span className="map-label">Where to</span>
        <p>
          Click anywhere on the map to set a course, or a place you know. Right-click for what you
          can do there.
        </p>
        <div className="map-rows">
          <div>
            <span>Places known</span>
            <span>{counts.length}</span>
          </div>
          <div>
            <span>Seen</span>
            <span>{counts.filter((v) => v === 'seen').length}</span>
          </div>
          <div>
            <span>Rumored</span>
            <span>{counts.filter((v) => v === 'rumored').length}</span>
          </div>
          <div>
            <span>Pins</span>
            <span>{life.pins.length}</span>
          </div>
        </div>
      </section>
    );
  }
  const target = course.target ? placeById(map, course.target) : null;
  const left = Math.max(0, course.days - (game.calendar.day - course.startDay));
  const done = Math.min(1, (game.calendar.day - course.startDay) / Math.max(1e-6, course.days));
  const dest = target
    ? `${target.name}${known(life, target.id) === 'rumored' ? ' (its ring)' : ''}`
    : `a point in ${hereAt(map, course.to)}`;
  const g = life.group;
  const above = pullsIn(course.maxBand, yourBand(game.player));
  return (
    <section className="map-card panel">
      <span className="map-label">{g ? 'Travelling with a group' : 'On the road'}</span>
      <h3>
        {g ? g.name : dest}
        {!g && target && <span className="hanzi"> {target.hanzi}</span>}
      </h3>
      <div className="map-progress">
        <i style={{ width: `${(done * 100).toFixed(1)}%` }} />
      </div>
      <div className="map-rows">
        {g && (
          <>
            <div>
              <span>Bound for</span>
              <span>{placeById(map, g.bound)?.name ?? dest}</span>
            </div>
            <div>
              <span>Led by</span>
              <span>{g.leader}</span>
            </div>
            {g.pay > 0 && (
              <div>
                <span>Owed</span>
                <span>{Math.floor(g.owed)} low-grade</span>
              </div>
            )}
          </>
        )}
        <div>
          <span>By road</span>
          <span>{Math.round(course.roadLi).toLocaleString('en-US')} li</span>
        </div>
        <div>
          <span>Cross-country</span>
          <span>{Math.round(course.crossLi).toLocaleString('en-US')} li</span>
        </div>
        <div>
          <span>Days left</span>
          <span>{Math.ceil(left)}</span>
        </div>
        <div>
          <span>Arrives</span>
          <span>{worldWhen(course.startDay + course.days)}</span>
        </div>
        <div>
          <span>Real time</span>
          <span>about {realWords(left)} at your clock</span>
        </div>
        {course.tolls.length > 0 && (
          <div>
            <span>Checkpoints</span>
            <span>{course.tolls.length}</span>
          </div>
        )}
      </div>
      {above && (
        <p className="map-above">
          The course crosses ground a realm above you ({band(course.maxBand)?.name}). What lives
          there finds you first.
        </p>
      )}
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
              onClick={() => act((s) => goToPlace(s, homeOf(s, map).id))}
            >
              Turn back home
            </button>
          </>
        )}
      </div>
    </section>
  );
}
