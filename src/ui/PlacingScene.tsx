// Placing 布阵 (K10; Jan's take A of `docs/mockups/formation-study.html`, "reading the currents"):
// laying an array from the Bag at a site's slot or on open ground. Pick the flags or disc, then plant
// them round the eye where the vein's currents run, seen only within your divine sense round your
// hand and round each flag already in; the last closes the ring. Nothing moves while you think, so
// the canvas is drawn only when the hand or a flag moves: no loop, no blur. The rules are
// core/placing.ts; laying is core/formations.ts.
import { useEffect, useMemo, useRef, useState } from 'react';
import { item } from '../content/items.ts';
import { PLACING } from '../content/formations.ts';
import { realmIndex } from '../content/realms.ts';
import { arraySteps, eyeHolds } from '../core/arrays.ts';
import { handLift } from '../core/crafts.ts';
import {
  arraysCarried,
  cantLay,
  laidAt,
  layArray,
  placingSeed,
  type ArrayStack,
} from '../core/formations.ts';
import {
  EMPTY,
  SCENE,
  fieldAt,
  lineWorth,
  placingGround,
  placingHand,
  plant,
  pointOf,
  pull,
  senseRadius,
  share,
  type Node,
  type Placing,
  type PlacingGround,
  type Pt,
} from '../core/placing.ts';
import type { GameState } from '../core/state.ts';
import { canvasDensity } from './stage.ts';
import { useGame } from './store.ts';

const QI = '143,183,217';
const GOLD = '#d6ab4c';

/** What an array does, in a line, for the picker. */
function doesWords(s: ArrayStack): string {
  const u = s.use;
  switch (u.does) {
    case 'gathering':
      return `lifts the density ${arraySteps({ item: s.base, rarity: s.rarity })} step`;
    case 'growing':
      return 'the fields inside grow a step denser';
    case 'warding':
      return u.beastsOnly ? 'turns beasts from the site' : 'a barrier raiders turn from';
    case 'concealing':
      return 'hides the site a band deeper';
    case 'alarm':
      return 'rings when raiders come';
    case 'binding':
      return 'holds what walks in';
    case 'killing':
      return 'strikes every foe inside';
    case 'maze':
      return 'dulls the aim of foes inside';
  }
}

export function PlacingScene({
  game,
  at,
  onClose,
}: {
  game: GameState;
  at: { dwelling: string } | 'ground';
  onClose: () => void;
}) {
  const mapAct = useGame((s) => s.mapAct);
  const carried = arraysCarried(game.player);
  const [pick, setPick] = useState<string | null>(carried.length === 1 ? carried[0]!.id : null);
  const [why, setWhy] = useState<string | null>(null);
  const stack = carried.find((s) => s.id === pick) ?? null;
  const lay = (hand: number) => {
    if (!stack) return;
    const r = mapAct((s) => layArray(s, at, stack.id, hand));
    if (r) setWhy(r);
    else onClose();
  };
  return (
    <div className="placing-veil" role="dialog" aria-label="Laying an array">
      <section className="panel placing">
        <div className="placing-top">
          <h2 className="panel-heading">
            Laying an array <span className="hanzi">布阵</span>
          </h2>
          <button type="button" className="button button-quiet" onClick={onClose}>
            Put it away
          </button>
        </div>
        <div className="placing-cols">
          <div className="placing-side">
            <h3 className="panel-heading">What you lay</h3>
            {carried.length === 0 && (
              <p className="muted">
                You carry no flags or discs. Talisman shops sell a few; the Crafts screen’s
                Formations page inscribes them.
              </p>
            )}
            {carried.map((s) => {
              const no = cantLay(game, at, s.id);
              return (
                <button
                  key={s.id}
                  type="button"
                  className={`placing-pick${s.id === pick ? ' is-current' : ''}`}
                  disabled={!!no}
                  title={no ?? undefined}
                  onClick={() => {
                    setPick(s.id);
                    setWhy(null);
                  }}
                >
                  <span className="dw-sq">{s.use.form === 'disc' ? '盘' : '旗'}</span>
                  <span>
                    {item(s.id).name} <span className={`rarity-${s.rarity}`}>{s.rarity}</span>
                    {s.n > 1 ? ` ×${s.n}` : ''}
                    <small>{no ?? doesWords(s)}</small>
                  </span>
                </button>
              );
            })}
            {stack && (
              <p className="muted">
                Its eye takes {eyeHolds(item(stack.id).tier)} low-grade stones from your purse.
              </p>
            )}
            {why && <p className="warn">{why}</p>}
          </div>
          {stack ? (
            <Board key={stack.id} game={game} at={at} stack={stack} onLay={lay} />
          ) : (
            <p className="muted placing-wait">Pick the flags or the disc to lay.</p>
          )}
        </div>
      </section>
    </div>
  );
}

function Board({
  game,
  at,
  stack,
  onLay,
}: {
  game: GameState;
  at: { dwelling: string } | 'ground';
  stack: ArrayStack;
  onLay: (hand: number) => void;
}) {
  const c = game.player;
  const ground = useMemo(
    () => placingGround(placingSeed(game, at === 'ground' ? 'here' : at), stack.use.form),
    // The ground is the spot's: it never changes while you stand there.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [stack.use.form],
  );
  const sense = senseRadius(realmIndex(c.soul.realm));
  const [placing, setPlacing] = useState<Placing>(EMPTY);
  const [hover, setHover] = useState<{ p: Pt; n: Node | null } | null>(null);
  const [say, setSay] = useState('');
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const canvas = ref.current;
    const g = canvas?.getContext('2d');
    if (canvas && g) draw(g, canvas, ground, placing, hover, sense);
  }, [ground, placing, hover, sense]);

  const hand = placingHand(ground, placing);
  const lays = laidAt(c, stack.rarity, hand);
  const lift = handLift(c, 'formations', 1);
  const last = placing.flags[placing.flags.length - 1];
  const under = hover?.n ? share(ground, fieldAt(ground, pointOf(hover.n))) : null;
  const line =
    hover?.n && last && !placing.closed
      ? share(ground, lineWorth(ground, pointOf(last), pointOf(hover.n)))
      : null;

  const local = (ev: React.PointerEvent<HTMLCanvasElement>): { p: Pt; n: Node | null } => {
    const r = ev.currentTarget.getBoundingClientRect();
    const p: Pt = [
      ((ev.clientX - r.left) / r.width) * SCENE,
      ((ev.clientY - r.top) / r.height) * SCENE,
    ];
    const o = PLACING.gap * 0.8;
    const n: Node = [Math.round((p[0] - o) / PLACING.gap), Math.round((p[1] - o) / PLACING.gap)];
    const q = pointOf(n);
    const near =
      n[0] >= 0 &&
      n[1] >= 0 &&
      n[0] < PLACING.side &&
      n[1] < PLACING.side &&
      Math.hypot(p[0] - q[0], p[1] - q[1]) < 22;
    return { p, n: near ? n : null };
  };
  return (
    <>
      <div className="placing-board">
        <canvas
          ref={ref}
          className="placing-canvas"
          width={SCENE}
          height={SCENE}
          onPointerMove={(e) => setHover(local(e))}
          onPointerLeave={() => setHover(null)}
          onPointerDown={(e) => {
            if (e.button === 2) return;
            const h = local(e);
            if (!h.n) return;
            const r = plant(ground, placing, h.n);
            setPlacing(r.placing);
            setSay(r.why);
          }}
          onContextMenu={(e) => {
            e.preventDefault();
            setPlacing(pull(placing));
            setSay('');
          }}
          aria-label="The ground round the array's eye: click a point to plant the next flag where the currents run; right-click pulls the last flag up."
        />
        <p className="muted placing-how">
          <b>Click</b> a point to plant the next flag · the last closes the ring round the eye ·{' '}
          <b>right-click</b> pulls the last up
        </p>
      </div>
      <div className="placing-side">
        <h3 className="panel-heading">How it reads</h3>
        <div className="placing-kv">
          <span>Flags</span>
          <span>
            {placing.flags.length} of {ground.nodes}
            {placing.closed ? ' · closed' : ''}
          </span>
          <span>Under your hand</span>
          <span>{under === null ? '–' : under.toFixed(2)}</span>
          <span>The next line</span>
          <span>{line === null ? '–' : line.toFixed(2)}</span>
          <span>Qi spilt</span>
          <span>{placing.spilt.toFixed(2)}</span>
        </div>
        <div className="placing-hand" aria-hidden="true">
          <div style={{ width: `${hand * 100}%` }} />
        </div>
        <div className="placing-kv">
          <span>The hand</span>
          <span>{hand.toFixed(2)}</span>
          <span>Steady hands</span>
          <span>{lift.toFixed(2)} bands at a full hand</span>
        </div>
        <p className={say ? 'warn' : 'muted'}>
          {say ||
            (placing.closed
              ? `The ring closes. It lays ${lays.rarity}${lays.strength > 0 ? `, ${Math.round(lays.strength * 100)}% of the way to the next` : ''}.`
              : `It lays ${lays.rarity} as it stands. The flags were ${stack.rarity}.`)}
        </p>
        <div className="dw-actions">
          <button
            type="button"
            className="button"
            disabled={!placing.closed}
            onClick={() => onLay(hand)}
          >
            Lay it
          </button>
          <button type="button" className="button button-quiet" onClick={() => onLay(0)}>
            Set it plain
          </button>
          <button
            type="button"
            className="button button-quiet"
            onClick={() => {
              setPlacing(EMPTY);
              setSay('');
            }}
          >
            Start over
          </button>
        </div>
        <p className="muted">
          Your sense shows the currents near your hand; a flag lights the ground round it. Nothing
          is timed and nothing rolled.
        </p>
      </div>
    </>
  );
}

function draw(
  g: CanvasRenderingContext2D,
  canvas: HTMLCanvasElement,
  ground: PlacingGround,
  placing: Placing,
  hover: { p: Pt; n: Node | null } | null,
  sense: number,
) {
  const k = canvasDensity();
  if (canvas.width !== Math.round(SCENE * k)) {
    canvas.width = Math.round(SCENE * k);
    canvas.height = Math.round(SCENE * k);
  }
  g.setTransform(k, 0, 0, k, 0, 0);
  g.clearRect(0, 0, SCENE, SCENE);
  // The currents: bright within your sense and round each flag, all but gone elsewhere.
  const seen: [Pt, number][] = [
    ...placing.flags.map((f) => [pointOf(f), PLACING.flagSense] as [Pt, number]),
    ...(hover ? [[hover.p, sense] as [Pt, number]] : []),
  ];
  for (const c of ground.currents)
    for (const p of c.pts) {
      let a = 0.035;
      for (const [q, r] of seen) {
        const d = Math.hypot(p[0] - q[0], p[1] - q[1]);
        if (d < r) a = Math.max(a, 0.75 * (1 - d / r) + 0.1);
      }
      g.fillStyle = `rgba(${QI},${a * c.w})`;
      g.beginPath();
      g.arc(p[0], p[1], 3.2, 0, Math.PI * 2);
      g.fill();
    }
  if (hover) {
    g.strokeStyle = `rgba(${QI},0.18)`;
    g.setLineDash([4, 6]);
    g.beginPath();
    g.arc(hover.p[0], hover.p[1], sense, 0, Math.PI * 2);
    g.stroke();
    g.setLineDash([]);
  }
  for (let i = 0; i < PLACING.side; i++)
    for (let j = 0; j < PLACING.side; j++) {
      const [x, y] = pointOf([i, j]);
      if (ground.rocks.includes(`${i},${j}`)) {
        g.fillStyle = '#3a3630';
        g.beginPath();
        g.moveTo(x - 9, y + 7);
        g.lineTo(x - 2, y - 9);
        g.lineTo(x + 9, y + 6);
        g.fill();
        continue;
      }
      g.fillStyle = 'rgba(233,229,218,0.18)';
      g.beginPath();
      g.arc(x, y, 1.6, 0, Math.PI * 2);
      g.fill();
    }
  const e = pointOf(ground.eye);
  g.strokeStyle = GOLD;
  g.lineWidth = 1.5;
  g.beginPath();
  g.arc(e[0], e[1], 13, 0, Math.PI * 2);
  g.stroke();
  g.fillStyle = 'rgba(214,171,76,0.25)';
  g.fill();
  g.fillStyle = GOLD;
  g.font = '15px "Ma Shan Zheng", KaiTi, serif';
  g.textAlign = 'center';
  g.fillText('眼', e[0], e[1] + 5);
  const pts = placing.flags.map(pointOf);
  const seg = (a: Pt, b: Pt) => {
    const w = share(ground, lineWorth(ground, a, b));
    g.strokeStyle = `rgba(214,171,76,${0.25 + 0.7 * w})`;
    g.lineWidth = 2;
    g.beginPath();
    g.moveTo(a[0], a[1]);
    g.lineTo(b[0], b[1]);
    g.stroke();
  };
  for (let i = 1; i < pts.length; i++) seg(pts[i - 1]!, pts[i]!);
  if (placing.closed && pts.length) {
    seg(pts[pts.length - 1]!, pts[0]!);
    g.fillStyle = 'rgba(214,171,76,0.06)';
    g.beginPath();
    pts.forEach((p, i) => (i ? g.lineTo(p[0], p[1]) : g.moveTo(p[0], p[1])));
    g.fill();
  }
  const last = pts[pts.length - 1];
  if (hover?.n && last && !placing.closed) {
    const b = pointOf(hover.n);
    g.setLineDash([5, 5]);
    g.strokeStyle = 'rgba(214,171,76,0.5)';
    g.beginPath();
    g.moveTo(last[0], last[1]);
    g.lineTo(b[0], b[1]);
    g.stroke();
    g.setLineDash([]);
  }
  pts.forEach((p, i) => {
    g.fillStyle = '#0b0d10';
    g.strokeStyle = GOLD;
    g.lineWidth = 1.5;
    g.beginPath();
    g.rect(p[0] - 7, p[1] - 16, 14, 18);
    g.fill();
    g.stroke();
    g.fillStyle = GOLD;
    g.font = '11px Inter, system-ui, sans-serif';
    g.fillText(String(i + 1), p[0], p[1] - 3);
  });
}
