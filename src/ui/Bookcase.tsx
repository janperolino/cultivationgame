// The Manuals tab (design § Cultivation, Where manuals live): the manuals with no tree to stand
// beside on top, one tree at a time beside a list of them, and below, the bookcase of every
// manual held. A plank per kind, each manual a standing spine with its hanzi in brush, its
// rarity's band and its kind's binding, the finished ones lying flat in a stack at the shelf's
// end; the hover card is how a manual is read, and a click opens it where it grafts. Copies stand
// here too (design § Cultivation, Reading): an unread one wears a paper band, grafts nowhere, and
// a click pins its card open with Read.
import {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type CSSProperties,
  type KeyboardEvent,
  type MouseEvent,
} from 'react';
import {
  MANUAL_KIND_IDS,
  MANUAL_KINDS,
  type Manual,
  type ManualKind,
  type ManualNode,
} from '../content/manuals.ts';
import { rarity, rarityRank, type RarityId } from '../content/rarity.ts';
import { copyOfManual, readDays } from '../content/copies.ts';
import { technique } from '../content/techniques.ts';
import { shelf, shelfTally, SHELF_ORDERS, type PlankId, type ShelfOrder } from '../core/manuals.ts';
import {
  bookcaseManuals,
  copyCount,
  manualUnread,
  queueCheck,
  readingCopy,
  readingQueue,
  readProgress,
} from '../core/reading.ts';
import type { Cultivator } from '../core/state.ts';
import {
  CARD_NODES,
  cardMeta,
  filterHostless,
  HOSTLESS_FILTER_FROM,
  learnedCount,
  matchesManual,
  readWords,
  spineReadLabel,
  unreadMeta,
  nodeMark,
  nodeWords,
  openWords,
  PIPS_MAX,
  spineHeight,
  spineLabel,
  spineWidth,
} from './bookcase.ts';
import { formatEffect, formatNumber } from './format.ts';
import { useGame } from './store.ts';
import { rings } from './beacons.ts';
import { useBeacons } from './useBeacons.ts';
import { OwnFan } from './TreeFan.tsx';
import { rectIn } from './stage.ts';

const RARE = rarityRank('purple');

const rarityVar = (r: RarityId) => ({ '--rarity-color': `var(--rarity-${r})` }) as CSSProperties;

/** A node's effects in a line: the cultivator's, then any on its technique alone. */
function effectLine(m: Manual, n: ManualNode): string {
  const own = n.own ?? [];
  const on = m.technique ? technique(m.technique).name : 'the technique';
  return [
    ...n.effects.map(formatEffect),
    ...own.map((e) => `${formatEffect(e)} on ${on} alone`),
  ].join(', ');
}

/** A spine's pips: one a node up to four, learned filled and a buyable one glowing; else "1/9". */
function Pips({ c, m, unread }: { c: Cultivator; m: Manual; unread: boolean }) {
  if (unread) {
    return m.nodes.slice(0, PIPS_MAX).map((n) => <span key={n.id} className="spine-pip" />);
  }
  if (m.nodes.length > PIPS_MAX) {
    return (
      <span className="spine-count">
        {learnedCount(c, m)}/{m.nodes.length}
      </span>
    );
  }
  return m.nodes.map((n) => <span key={n.id} className={`spine-pip is-${nodeMark(c, n)}`} />);
}

/**
 * A spine standing alone, out of the bookcase, for Routine › Study: the same binding, band and
 * paper, not a button, since the row it sits in carries the controls.
 */
export function StillSpine({ c, m }: { c: Cultivator; m: Manual }) {
  const unread = manualUnread(c, m);
  return (
    <span
      className={`spine is-still is-${m.kind}${rarityRank(m.rarity) >= RARE ? ' is-rare' : ''}${unread ? ' is-unread' : ''}`}
      style={{ ...rarityVar(m.rarity), width: spineWidth(m), height: spineHeight(m) }}
      aria-hidden="true"
    >
      {m.kind === 'art' && (
        <>
          <span className="spine-rod is-top" />
          <span className="spine-rod is-bottom" />
        </>
      )}
      <span className="spine-band" />
      <span className="spine-title">{m.hanzi}</span>
      {unread && <PaperBand c={c} m={m} />}
    </span>
  );
}

/** The paper band round an unread copy, its reading filling it: "2.1/5", or 未读 before a day. */
function PaperBand({ c, m }: { c: Cultivator; m: Manual }) {
  const id = copyOfManual(m);
  const need = readDays(id);
  const done = readProgress(c, id);
  return (
    <span className="spine-paper" aria-hidden="true">
      <span
        className="spine-paper-fill"
        style={{ width: `${Math.min(100, (done / need) * 100)}%` }}
      />
      <span className="spine-paper-text">
        {done > 0 ? `${formatNumber(done)}/${formatNumber(need)}` : '未读'}
      </span>
    </span>
  );
}

function Spine({
  c,
  m,
  tabbable,
  tipped,
  fresh,
  unread,
  copies,
  onShow,
  onHide,
  onPress,
  onFocusSpine,
}: {
  c: Cultivator;
  m: Manual;
  tabbable: boolean;
  tipped: boolean;
  /** New, not yet selected: it glows until it is. */
  fresh: boolean;
  /** An unread copy: a paper band across it, its pips dim. */
  unread: boolean;
  /** Copies owned; the spine counts them from two. */
  copies: number;
  onShow: (m: Manual) => void;
  onHide: (m: Manual) => void;
  onPress: (m: Manual, e: MouseEvent) => void;
  onFocusSpine: (m: Manual) => void;
}) {
  const rare = rarityRank(m.rarity) >= RARE;
  return (
    <button
      type="button"
      className={`spine is-${m.kind}${rare ? ' is-rare' : ''}${tipped ? ' is-tipped' : ''}${fresh ? ' is-new' : ''}${unread ? ' is-unread' : ''}`}
      style={{ ...rarityVar(m.rarity), width: spineWidth(m), height: spineHeight(m) }}
      data-manual={m.id}
      tabIndex={tabbable ? 0 : -1}
      aria-label={`${spineLabel(c, m)}${spineReadLabel(c, m, copies)}`}
      aria-describedby={tipped ? 'bookcase-card' : undefined}
      onMouseEnter={() => onShow(m)}
      onMouseLeave={() => onHide(m)}
      onFocus={() => {
        onFocusSpine(m);
        onShow(m);
      }}
      onBlur={() => onHide(m)}
      onClick={(e) => onPress(m, e)}
    >
      {m.kind === 'art' && (
        <>
          <span className="spine-rod is-top" aria-hidden="true" />
          <span className="spine-rod is-bottom" aria-hidden="true" />
        </>
      )}
      <span className="spine-band" aria-hidden="true" />
      <span className="spine-title" aria-hidden="true">
        {m.hanzi}
      </span>
      {unread && <PaperBand c={c} m={m} />}
      {copies >= 2 && (
        <span className="spine-copies" aria-hidden="true">
          ×{copies}
        </span>
      )}
      <span className="spine-pips" aria-hidden="true">
        <Pips c={c} m={m} unread={unread} />
      </span>
    </button>
  );
}

/**
 * An unread copy's reading: what reading it would give and how far it has come, with Queue (Read
 * now while the queue is empty) once the card is pinned, its place in the queue and a way out of
 * it once queued, or why it can't be read yet.
 */
function ReadBlock({ c, m, pinned }: { c: Cultivator; m: Manual; pinned: boolean }) {
  const readCopy = useGame((s) => s.readCopy);
  const unqueue = useGame((s) => s.unqueue);
  const ended = useGame((s) => !!s.game?.ended);
  const id = copyOfManual(m);
  const w = readWords(c, id);
  const now = readingCopy(c) === id;
  const at = c.reading.queue.indexOf(id);
  const empty = readingQueue(c).length === 0;
  const ring = rings(useBeacons(), 'read-now', { id });
  return (
    <div className="bookcase-read">
      <span>{w.teaches}</span>
      <span className="caption">{w.time}</span>
      {w.refused && <span className="caption is-refused">{w.refused}</span>}
      {pinned && (at >= 0 || queueCheck(c, id).ok) && (
        <div className="actions">
          {at >= 0 ? (
            <>
              {!now && <span className="caption">In the reading queue, place {at + 1}</span>}
              <button type="button" className="button button-quiet" onClick={() => unqueue(id)}>
                {now ? 'Stop reading' : 'Take it out'}
              </button>
            </>
          ) : (
            <button
              type="button"
              className={`button${ring ? ' beacon-ring' : ''}`}
              disabled={ended}
              onClick={() => readCopy(id)}
            >
              {empty ? 'Read now' : 'Queue'}
            </button>
          )}
        </div>
      )}
    </div>
  );
}

/** The card over a spine: what the manual is, every node with its effect and state, and where it opens. */
function Card({
  c,
  m,
  pinned,
  hostOpen,
  onOpen,
  onClose,
  box,
}: {
  c: Cultivator;
  m: Manual;
  pinned: boolean;
  hostOpen: boolean;
  onOpen: (m: Manual) => void;
  onClose: () => void;
  box: React.RefObject<HTMLDivElement | null>;
}) {
  const unread = manualUnread(c, m);
  const copies = copyCount(c, copyOfManual(m));
  const shown = m.nodes.slice(0, CARD_NODES);
  const more = m.nodes.length - shown.length;
  const flavor = m.nodes[0]?.text;
  return (
    <div
      ref={box}
      id="bookcase-card"
      role={pinned ? 'dialog' : 'tooltip'}
      aria-label={pinned ? m.name : undefined}
      className={`bookcase-card${pinned ? ' is-pinned' : ''}`}
      style={rarityVar(m.rarity)}
    >
      <div className="bookcase-card-head">
        <span className={`bookcase-card-name rarity-${m.rarity}`}>{m.name}</span>
        <span className="hanzi muted">{m.hanzi}</span>
      </div>
      <span className="caption">
        {unread ? unreadMeta(m) : cardMeta(c, m)}
        {copies >= 2 && ` · ${copies} copies`}
      </span>
      {unread && <ReadBlock c={c} m={m} pinned={pinned} />}
      <ul className="bookcase-card-nodes">
        {shown.map((n) => {
          const mark = unread ? 'waiting' : nodeMark(c, n);
          return (
            <li key={n.id} className={`is-${mark}`}>
              <span className="card-mark" aria-hidden="true" />
              <span>
                <span className="card-node-name">{n.name}</span>
                <span className="card-node-fx">
                  {effectLine(m, n)} · {unread ? 'once read' : nodeWords(c, m, n)}
                </span>
              </span>
            </li>
          );
        })}
      </ul>
      {more > 0 && <span className="caption">+ {more} more</span>}
      {flavor && <p className="bookcase-card-flavor">{flavor}</p>}
      {pinned ? (
        <div className="actions">
          {!unread && (
            <button type="button" className="button" onClick={() => onOpen(m)}>
              Open
            </button>
          )}
          <button type="button" className="button button-quiet" onClick={onClose}>
            Close
          </button>
        </div>
      ) : (
        <span className="bookcase-card-hint">
          {unread ? 'Click to read it' : openWords(m, hostOpen)}
        </span>
      )}
    </div>
  );
}

/** The flat stack at a shelf's end: "62 finished", the slabs edged in their rarities. */
function Stack({ ms, label, onStand }: { ms: Manual[]; label: string; onStand: () => void }) {
  const slabs = ms.slice(0, Math.min(8, Math.max(2, Math.ceil(ms.length / 6))));
  return (
    <button
      type="button"
      className="shelf-stack"
      aria-label={`Stand the ${ms.length} finished ${label.toLowerCase()} back up`}
      onClick={onStand}
    >
      <span className="shelf-stack-count">{ms.length} finished</span>
      {slabs.map((m, i) => (
        <span
          key={m.id}
          className="shelf-slab"
          style={{ ...rarityVar(m.rarity), width: 64 + ((i * 37) % 26), marginLeft: (i * 13) % 9 }}
          aria-hidden="true"
        />
      ))}
    </button>
  );
}

/** The strip over the shelves: a bar per manual by kind, and a chip per rarity to hide or show it. */
function Strip({
  c,
  hidden,
  onToggle,
}: {
  c: Cultivator;
  hidden: ReadonlySet<RarityId>;
  onToggle: (r: RarityId) => void;
}) {
  const shelves = shelf(c, 'rarity', bookcaseManuals(c));
  const tally = shelfTally(shelves);
  return (
    <div className="bookcase-strip">
      <div className="bookcase-strip-bars">
        {shelves.map((s) => {
          const books = [...s.open, ...s.finished].sort(
            (a, b) => rarityRank(b.rarity) - rarityRank(a.rarity),
          );
          return (
            <div key={s.plank.id} className="strip-group">
              <span className="strip-bars" aria-hidden="true">
                {books.map((m) => (
                  <span
                    key={m.id}
                    className={`strip-bar${s.finished.includes(m) ? ' is-finished' : ''}${hidden.has(m.rarity) ? ' is-hidden' : ''}`}
                    style={rarityVar(m.rarity)}
                  />
                ))}
              </span>
              <span className="caption">
                {s.plank.name} {books.length}
              </span>
            </div>
          );
        })}
      </div>
      <div className="bookcase-chips" role="group" aria-label="Show rarities">
        {tally.rarities.map(({ rarity: r, count }) => (
          <button
            key={r}
            type="button"
            aria-pressed={!hidden.has(r)}
            style={rarityVar(r)}
            onClick={() => onToggle(r)}
          >
            <span className="chip-dot" aria-hidden="true" />
            {rarity(r).name} <span className="muted">{count}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

/** The bookcase: the count line and the toolbar, the strip, and a shelf per plank. */
export function Bookcase({
  c,
  fresh,
  hostOpen,
  focus,
  onOpen,
}: {
  c: Cultivator;
  /** Manuals still new: their spines glow until selected. */
  fresh: ReadonlySet<string>;
  hostOpen: (m: Manual) => boolean;
  /** A spine a link asked for: its card pins open and it scrolls into view. */
  focus: { id: string; seq: number } | null;
  onOpen: (m: Manual) => void;
}) {
  const see = useGame((s) => s.see);
  const [query, setQuery] = useState('');
  const [order, setOrder] = useState<ShelfOrder>('rarity');
  const [hidden, setHidden] = useState<ReadonlySet<RarityId>>(new Set());
  const [stackAll, setStackAll] = useState(true);
  const [standing, setStanding] = useState<ReadonlySet<PlankId>>(new Set());
  const [active, setActive] = useState<Partial<Record<PlankId, string>>>({});
  const [tip, setTip] = useState<{ id: string; pinned: boolean } | null>(null);
  const wrap = useRef<HTMLDivElement>(null);
  const card = useRef<HTMLDivElement>(null);
  const pointer = useRef('mouse');

  const books = bookcaseManuals(c);
  const all = shelfTally(shelf(c, 'rarity', books));
  const held = books.filter((m) => !hidden.has(m.rarity) && matchesManual(m, query));
  const shelves = shelf(c, order, held);
  const stacked = (id: PlankId) => stackAll && !standing.has(id);
  const allStacked = stackAll && standing.size === 0;
  const tipped = tip ? held.find((m) => m.id === tip.id) : undefined;

  // The card sits above its spine, or below it near the top of the window, and flips to end at
  // the spine's right edge near a plank's end; it never leaves the bookcase's sides.
  useLayoutEffect(() => {
    const box = card.current;
    const outer = wrap.current;
    if (!box || !outer || !tip) return;
    const spine = outer.querySelector<HTMLElement>(`[data-manual="${CSS.escape(tip.id)}"]`);
    if (!spine) return;
    const w = rectIn(outer);
    const r = rectIn(spine);
    const cw = box.offsetWidth;
    const ch = box.offsetHeight;
    let left = r.left - w.left - 10;
    if (left + cw > w.width) left = r.right - w.left + 10 - cw;
    left = Math.max(0, Math.min(left, w.width - cw));
    const above = r.top - ch - 12 >= 8;
    box.style.left = `${left}px`;
    box.style.top = `${above ? r.top - w.top - ch - 12 : r.bottom - w.top + 12}px`;
  }, [tip, c]);

  // A pinned card closes on a tap anywhere but the card and the spines.
  useEffect(() => {
    if (!tip?.pinned) return;
    const away = (e: PointerEvent) => {
      const at = e.target as Element;
      if (!at.closest('.bookcase-card, .spine')) setTip(null);
    };
    document.addEventListener('pointerdown', away);
    return () => document.removeEventListener('pointerdown', away);
  }, [tip?.pinned]);

  // A link to a spine (a new copy's toast) pins its card open, standing its shelf up if it lies
  // flat, and scrolls it into view once drawn.
  const [focusSeen, setFocusSeen] = useState(-1);
  const [arrived, setArrived] = useState<{ id: string; copy: string } | null>(null);
  const linked = focus && focus.seq !== focusSeen ? held.find((m) => m.id === focus.id) : undefined;
  if (focus && linked) {
    setFocusSeen(focus.seq);
    setTip({ id: focus.id, pinned: true });
    setArrived({ id: focus.id, copy: copyOfManual(linked) });
    const flat = shelves.find((x) => x.finished.some((m) => m.id === focus.id));
    if (flat) setStanding(new Set(standing).add(flat.plank.id));
  }
  useEffect(() => {
    if (!arrived) return;
    const at = `[data-manual="${CSS.escape(arrived.id)}"]`;
    wrap.current?.querySelector<HTMLElement>(at)?.scrollIntoView({ block: 'center' });
    see('copy', [arrived.copy]);
  }, [arrived, see]);

  const show = (m: Manual) => setTip((t) => (t?.pinned ? t : { id: m.id, pinned: false }));
  const hide = (m: Manual) => setTip((t) => (t && !t.pinned && t.id === m.id ? null : t));
  // A tap on a touch screen shows the card with Open; a second tap, a click or Enter opens.
  // An unread copy grafts nowhere, so any click pins its card open with Read.
  const press = (m: Manual, e: MouseEvent) => {
    const tap = pointer.current === 'touch' && e.detail !== 0;
    if (manualUnread(c, m) || (tap && !(tip?.pinned && tip.id === m.id))) {
      setTip({ id: m.id, pinned: true });
      see('manual', [m.id]);
      see('copy', [copyOfManual(m)]);
      return;
    }
    setTip(null);
    onOpen(m);
  };

  // Arrow keys move along a shelf, so a shelf is one stop for Tab however long it grows.
  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    const step = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 }[e.key];
    const spines = [...e.currentTarget.querySelectorAll<HTMLButtonElement>('.spine')];
    const at = spines.indexOf(document.activeElement as HTMLButtonElement);
    if (at < 0) return;
    const to = e.key === 'Home' ? 0 : e.key === 'End' ? spines.length - 1 : step ? at + step : null;
    if (to === null) return;
    e.preventDefault();
    spines[Math.max(0, Math.min(spines.length - 1, to))]?.focus();
  };

  return (
    <div
      className="bookcase"
      ref={wrap}
      onPointerDown={(e) => {
        pointer.current = e.pointerType;
      }}
    >
      <div className="bookcase-top">
        <div className="bookcase-count">
          <h3 className="sub-heading">The bookcase</h3>
          <span className="muted">
            {all.open} still open · {all.finished} finished
          </span>
        </div>
        <div className="bookcase-tools">
          <input
            type="search"
            className="bookcase-search"
            aria-label="Find a manual"
            placeholder="Name, node or stat"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          <label className="bookcase-order">
            Order
            <select value={order} onChange={(e) => setOrder(e.target.value as ShelfOrder)}>
              {SHELF_ORDERS.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.name}
                </option>
              ))}
            </select>
          </label>
          <button
            type="button"
            className="bookcase-stack-all"
            aria-pressed={allStacked}
            onClick={() => {
              setStackAll(!allStacked);
              setStanding(new Set());
            }}
          >
            Stack finished
          </button>
        </div>
      </div>
      <Strip
        c={c}
        hidden={hidden}
        onToggle={(r) => {
          const next = new Set(hidden);
          if (!next.delete(r)) next.add(r);
          setHidden(next);
        }}
      />
      {shelves.length === 0 && <p className="muted">Nothing on the shelves matches.</p>}
      <div className="shelves">
        {shelves.map((s) => {
          const id = s.plank.id;
          const flat = stacked(id);
          const books = flat ? s.open : [...s.open, ...s.finished];
          const tab = books.some((m) => m.id === active[id]) ? active[id] : books[0]?.id;
          const total = s.open.length + s.finished.length;
          return (
            <section key={id} className="shelf" aria-label={s.plank.name}>
              <h4 className="shelf-head">
                {s.plank.name}{' '}
                <span className="muted">
                  {total} · {s.open.length} open, {s.finished.length} finished
                </span>
              </h4>
              <div
                className="shelf-row"
                role="toolbar"
                aria-label={`${s.plank.name}: arrow keys move along the shelf`}
                onKeyDown={onKeyDown}
              >
                {books.map((m) => (
                  <div key={m.id} className="shelf-slot">
                    <Spine
                      c={c}
                      m={m}
                      tabbable={m.id === tab}
                      tipped={tip?.id === m.id}
                      fresh={fresh.has(m.id)}
                      unread={manualUnread(c, m)}
                      copies={copyCount(c, copyOfManual(m))}
                      onShow={show}
                      onHide={hide}
                      onPress={press}
                      onFocusSpine={(x) => setActive((a) => ({ ...a, [id]: x.id }))}
                    />
                  </div>
                ))}
                {flat && s.finished.length > 0 && (
                  <div className="shelf-slot">
                    <Stack
                      ms={s.finished}
                      label={s.plank.name}
                      onStand={() => setStanding(new Set(standing).add(id))}
                    />
                  </div>
                )}
              </div>
            </section>
          );
        })}
      </div>
      <p className="caption">
        Hover or focus a spine to see what it holds; click to open it where it grafts, or to read a
        copy in its paper band.
      </p>
      {tipped && (
        <Card
          c={c}
          m={tipped}
          pinned={tip!.pinned}
          hostOpen={hostOpen(tipped)}
          onOpen={(m) => {
            setTip(null);
            onOpen(m);
          }}
          onClose={() => setTip(null)}
          box={card}
        />
      )}
    </div>
  );
}

/** The Dao an Art waits on, capitalised, when its technique's first Dao has no tree drawn yet. */
function waitingDao(m: Manual): string | undefined {
  const dao = m.technique ? technique(m.technique).daos[0] : undefined;
  return dao && `${dao[0]!.toUpperCase()}${dao.slice(1)}`;
}

/** Why a manual stands at the top of the tab rather than beside a tree. */
function whyHere(m: Manual): string {
  const dao = waitingDao(m);
  if (dao) return `It waits here until the ${dao} Dao is drawn, then grafts beside it.`;
  return 'Its nodes touch more than one tree, so no one tree holds it.';
}

/** A list row's caption: "Scripture · 3 of 9 learned". */
function listCaption(c: Cultivator, m: Manual): string {
  return `${MANUAL_KINDS[m.kind].name} · ${learnedCount(c, m)} of ${m.nodes.length} learned`;
}

/**
 * The top of the tab, one tree at a time: a list of every manual with no host tree, filtered past
 * eight by a search, a chip per kind and Hide finished, and the focused one's own tree beside it
 * as a small fan, its nodes read and learned in place, then its flavor line. When the filter hides the focused manual, the first match
 * stands in for it.
 */
export function HostlessView({
  c,
  list,
  focused,
  fresh,
  onFocus,
}: {
  c: Cultivator;
  list: readonly Manual[];
  focused: string | null;
  /** Manuals still new: their rows glow until picked. */
  fresh: ReadonlySet<string>;
  onFocus: (m: Manual) => void;
}) {
  const [query, setQuery] = useState('');
  const [hidden, setHidden] = useState<ReadonlySet<ManualKind>>(new Set());
  const [hideFinished, setHideFinished] = useState(false);
  const filtering = list.length > HOSTLESS_FILTER_FROM;
  const shown = filtering ? filterHostless(c, list, { query, hidden, hideFinished }) : [...list];
  const m = shown.find((x) => x.id === focused) ?? shown[0];
  // The manual whose tree stands here is the one selected, so it is seen.
  const see = useGame((s) => s.see);
  const shownId = m?.id;
  useEffect(() => {
    if (shownId) see('manual', [shownId]);
  }, [see, shownId]);
  if (list.length === 0) {
    return (
      <p className="muted spaced">
        Scriptures and Inheritances land here, and any manual with no one tree to graft beside.
      </p>
    );
  }
  const kinds = MANUAL_KIND_IDS.filter((k) => list.some((x) => x.kind === k));
  const dao = m && waitingDao(m);
  return (
    <div className="hostless">
      <nav className="hostless-list" aria-label="Manuals without a host tree">
        <h3 className="sub-heading">
          Without a host tree{' '}
          <span className="caption">
            {filtering && shown.length !== list.length
              ? `${shown.length} of ${list.length}`
              : list.length}
          </span>
        </h3>
        <p className="caption">
          Manuals with no one tree to graft beside. Pick one to see its tree.
        </p>
        {filtering && (
          <div className="hostless-filter">
            <input
              type="search"
              className="bookcase-search"
              aria-label="Find a manual without a host"
              placeholder="Name, node or stat"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
            <div className="bookcase-chips" role="group" aria-label="Show kinds">
              {kinds.map((k) => (
                <button
                  key={k}
                  type="button"
                  aria-pressed={!hidden.has(k)}
                  onClick={() => {
                    const next = new Set(hidden);
                    if (!next.delete(k)) next.add(k);
                    setHidden(next);
                  }}
                >
                  <span className="hanzi" aria-hidden="true">
                    {MANUAL_KINDS[k].glyph}
                  </span>{' '}
                  {MANUAL_KINDS[k].plural}
                </button>
              ))}
              <button
                type="button"
                aria-pressed={hideFinished}
                onClick={() => setHideFinished(!hideFinished)}
              >
                Hide finished
              </button>
            </div>
          </div>
        )}
        {shown.length === 0 && <p className="muted">Nothing matches.</p>}
        <ul>
          {shown.map((x) => (
            <li key={x.id}>
              <button
                type="button"
                className={`hostless-pick${fresh.has(x.id) ? ' is-new' : ''}`}
                aria-current={x.id === m?.id ? 'true' : undefined}
                style={rarityVar(x.rarity)}
                onClick={() => onFocus(x)}
              >
                <span className="manual-seal hanzi" aria-hidden="true">
                  {MANUAL_KINDS[x.kind].glyph}
                </span>
                <span className="hostless-pick-text">
                  <span className={`hostless-pick-name rarity-${x.rarity}`}>{x.name}</span>
                  <span className="caption">{listCaption(c, x)}</span>
                </span>
              </button>
            </li>
          ))}
        </ul>
      </nav>
      {m && (
        <article className="hostless-tree" style={rarityVar(m.rarity)} aria-label={m.name}>
          <div className="hostless-head">
            <span className="manual-seal is-large hanzi" aria-hidden="true">
              {MANUAL_KINDS[m.kind].glyph}
            </span>
            <div>
              <h3 className="hostless-name">
                <span className={`rarity-${m.rarity}`}>{m.name}</span>{' '}
                <span className="hanzi muted">{m.hanzi}</span>
              </h3>
              <span className="caption">
                {rarity(m.rarity).name} {MANUAL_KINDS[m.kind].name.toLowerCase()} ·{' '}
                {dao ? `grafts beside ${dao} once it’s drawn` : 'no host tree'} ·{' '}
                {learnedCount(c, m)} of {m.nodes.length} learned
              </span>
            </div>
          </div>
          <OwnFan key={m.id} c={c} m={m} />
          <p className="caption">{whyHere(m)}</p>
          {m.nodes[0]?.text && <p className="bookcase-card-flavor">{m.nodes[0].text}</p>}
        </article>
      )}
    </div>
  );
}
