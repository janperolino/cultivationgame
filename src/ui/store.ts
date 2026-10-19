// The Zustand store that bridges core and UI: it owns the open slot, runs the loop, autosaves,
// and holds the slot's tab lock so two tabs never autosave over each other.
import { create } from 'zustand';
import type { HourKind } from '../content/hours.ts';
import { playDay, resolveCard, type CardCheck } from '../core/cards.ts';
import { createLife, createNextLife, type Creation } from '../core/creation.ts';
import type { Seat } from '../core/attention.ts';
import { LADDERS, type LadderId } from '../core/cultivation.ts';
import { sceneBonus } from '../core/scene.ts';
import {
  attemptLastChance,
  breakThrough,
  endLife,
  feedStones,
  followRoutine as followRoutineHours,
  giveHours,
  learn,
  moveRead,
  practice,
  readCopy,
  setPlan as setLifePlan,
  stopPracticing,
  switchMethod,
  takeItem,
  takeOff,
  unqueueRead,
  wearItem,
} from '../core/life.ts';
import type { EquipSlot } from '../content/items.ts';
import { advance, catchUpInSlices, setClock, TICK_MS, type OfflineResult } from '../core/loop.ts';
import { seePerson } from '../core/people.ts';
import { gains, openScreen, see, type SeenKind } from '../core/seen.ts';
import type { RealmId } from '../content/realms.ts';
import { makeSave, SaveError } from '../core/save/format.ts';
import { exportFileName } from '../core/save/file.ts';
import { SaveSlots, type SlotId, type SlotSummary } from '../core/save/slots.ts';
import { rerollGlass, withPlayer, type GameState } from '../core/state.ts';
import { forgetSavedRoutine, saveRoutine } from '../core/wheel.ts';
import type { HintId } from '../content/firsts.ts';
import { hintDone, nextHint } from './hints.ts';
import { attemptOf, endScene, sceneDue, sceneRolled, startScene, useScene } from './scene.ts';
import { catchNow, startSeatInput, tickSeat } from './seat.ts';
import { loadSettings, saveSettings } from './settings.ts';
import { technique } from '../content/techniques.ts';
import { intentRisen, stageName as intentName } from '../core/intent.ts';
import { ensureMap } from '../core/map/travel.ts';
import {
  clearToasts,
  dismissToast,
  leftSlots,
  raiseStartToasts,
  raiseToast,
  raiseToasts,
  shownHint,
  stonesRanOut,
} from './toasts.ts';

export const AUTOSAVE_MS = 30_000;
/** A gap longer than this between ticks (a sleeping laptop, a frozen tab) counts as offline time. */
const OFFLINE_GAP_MS = 60_000;

/** Offline time applied on return, with the state it started from, for the coming-back card. */
export interface AwaySummary extends OfflineResult {
  before: GameState;
}

/** What a resolved card said happened, shown until dismissed. */
export interface CardOutcomeView {
  /** The card it came from; a card that goes on stays waiting under this uid. */
  uid: number;
  title: string;
  /** The card goes on to a further step once this is read. */
  goesOn: boolean;
  text: string;
  pass: boolean | null;
  /** Your attribute against the card's number, and the verdict. */
  check?: CardCheck;
}

export type Phase =
  | 'loading' // opening storage
  | 'no-slot' // nothing open; Settings picks a slot
  | 'busy' // the slot is open in another tab
  | 'playing'
  | 'lost'; // another tab took this slot over

export interface GameStore {
  phase: Phase;
  slot: SlotId | null;
  game: GameState | null;
  /** Real time of the last write to storage. */
  savedAt: number | null;
  /** Time applied while away, for the coming-back line; null once dismissed. */
  away: AwaySummary | null;
  /** A message for the player: a backup was loaded, an import failed, and so on. */
  notice: string | null;
  slots: SlotSummary[];
  /** Whether the browser agreed to keep this site's storage; null if it can't say. */
  persisted: boolean | null;
  /** The `?speed=` debug multiplier. */
  speed: number;
  /** Character creation in progress: for an empty slot, or the next life after a death. */
  creating: { slot: SlotId; next: boolean } | null;
  /** The last card resolved, until dismissed. */
  cardOutcome: CardOutcomeView | null;

  init(): Promise<void>;
  openSlot(slot: SlotId): Promise<void>;
  takeOver(): Promise<void>;
  /** Opens character creation for an empty slot. */
  beginCreation(slot: SlotId): void;
  cancelCreation(): void;
  /** Starts the life creation decided: a first life, or the next one after a death. */
  finishCreation(creation: Creation): Promise<void>;
  /** Resolves a waiting card with a choice; returns why not, or null. */
  chooseCard(uid: number, index: number, title: string): string | null;
  dismissCardOutcome(): void;
  /** Saves now; each breakthrough saves with `rewindPoint` set. */
  saveNow(opts?: { rewindPoint?: boolean }): Promise<void>;
  /** Changes the auto setting for minor breakthroughs, or burning stones in qi hours. */
  setPlan(patch: Partial<GameState['player']['plan']>): void;
  /** Gives hours of the day wheel to a kind of work; returns why not, or null. */
  setHours(hours: readonly number[], kind: HourKind): string | null;
  /** Sets the whole wheel to a routine's hours; returns why not, or null. */
  followRoutine(hours: readonly HourKind[]): string | null;
  /** Saves the wheel under a name; returns why not, or null. */
  saveRoutine(name: string): string | null;
  forgetRoutine(name: string): void;
  /** Attempts a ladder's next breakthrough, minor or major, at once, laying offerings on a major. */
  breakThrough(ladder: LadderId, offerings?: readonly string[]): void;
  /**
   * Plays a ladder's next breakthrough as a scene on Cultivate's figure, laying offerings on a
   * major; false when it can't.
   */
  beginScene(ladder: LadderId, offerings?: readonly string[]): boolean;
  /** Learns a tree node with insight; returns why not, or null. */
  learnNode(id: string): string | null;
  /** Puts a technique in the first free practice slot; the reason when it can't go. */
  practice(id: string): string | null;
  /** Takes a technique out of its practice slot. */
  stopPractice(id: string): void;
  /** Adds a copy to the end of the reading queue (core/reading.ts); the reason when it can't. */
  readCopy(id: string): string | null;
  /** Takes a copy out of the reading queue; it keeps its progress. */
  unqueue(id: string): void;
  /** Moves a queued copy one place up (−1) or down (+1). */
  moveQueued(id: string, by: -1 | 1): void;
  /** Wears an item from the Bag; returns why not, or null. */
  wear(id: string): string | null;
  /** Takes off what a gear square or treasure slot holds. */
  takeOff(slot: EquipSlot, id?: string): void;
  /** Eats or drinks one of an item, out of a fight. */
  eat(id: string): void;
  /** Feeds an artifact spirit stones to deepen the bond. */
  feedStones(id: string, stones: number): void;
  /**
   * Applies a rules change to the open life at once (the Combat screen's turns run here); false
   * when no life is open in this tab.
   */
  applyLife(change: (s: GameState) => GameState): boolean;
  /** Climbs a ladder with another known method, or with none; returns why not, or null. */
  setMethod(ladder: LadderId, id: string | null): string | null;
  /** At the lifespan edge: the last breakthrough, or the end of the life if it fails. */
  lastChance(): void;
  /** At the lifespan edge: accept the end. */
  letGo(): void;
  /** The pointer or a finger passes (x, y) in the figure's units, drawing in an orb there. */
  catchOrb(x: number, y: number, inPlace: boolean): void;
  /** Runs the life's calendar at a reached realm's speed, or its own with null; saved with the slot. */
  setClock(realm: RealmId | null): void;
  /** The player read someone's page: their news is no longer fresh. */
  seePerson(id: string): void;
  /** The player selected new things on their screen: their glow goes (core/seen.ts). */
  see(kind: SeenKind, ids: readonly string[]): void;
  /** The player opened a screen: its menu dot clears. */
  openScreen(screen: string): void;
  /** A hint was acted on or dismissed: this life won't be shown it again. */
  markHint(id: HintId): void;
  /** Settings' Show hints: on or off for this life. */
  setHints(on: boolean): void;
  /** Settings' Show hints again: the life forgets the hints it was shown. */
  replayHints(): void;
  /** A new pattern for the life's glass. */
  rerollGlass(): void;
  /** After a death: opens creation for a new life in the same slot, with the chronicle kept. */
  beginNextLife(): void;
  exportSlot(slot: SlotId): Promise<void>;
  importSlot(slot: SlotId, file: File): Promise<void>;
  clearSlot(slot: SlotId): Promise<void>;
  rewind(): Promise<void>;
  dismissAway(): void;
  dismissNotice(): void;
  /** Dev console: sets the clock multiplier, kept in the URL so a reload keeps it. */
  setSpeed(speed: number): void;
  /**
   * The travel map: applies a change from core/map (a course, a routine, a pin); a change that can
   * fail returns its reason, which comes back here. Returns null when it held.
   */
  mapAct(
    change: (
      s: GameState,
    ) =>
      GameState | { ok: true; state: GameState } | { ok: false; reason: string; state?: GameState },
  ): string | null;
  /** Dev console: replaces the game with what `change` makes of it, and saves. */
  devApply(change: (s: GameState) => GameState): string | null;
  /** Dev console: applies real time as if the tab had been closed, with the coming-back card. */
  devAway(ms: number): string | null;
}

function speedFromUrl(): number {
  try {
    const v = Number(new URLSearchParams(window.location.search).get('speed'));
    return Number.isFinite(v) && v > 0 ? Math.min(v, 1_000_000) : 1;
  } catch {
    return 1;
  }
}

function message(e: unknown): string {
  return e instanceof SaveError || e instanceof Error ? e.message : String(e);
}

let saves: SaveSlots | null = null;
function db(): SaveSlots {
  saves ??= new SaveSlots();
  return saves;
}

// The running session: loop timers and the tab lock for the open slot.
let tickTimer: ReturnType<typeof setInterval> | null = null;
let autosaveTimer: ReturnType<typeof setInterval> | null = null;
let lastTick = 0;
/** A long time away is being caught up, a slice at a time: the ticks wait for it. */
let catching = false;
/** Lets the page draw between a catch-up's slices. */
const pause = () => new Promise<void>((resolve) => setTimeout(resolve, 0));
let releaseLock: (() => void) | null = null;
let holdsLock = false;
let initStarted: Promise<void> | null = null;

const lockName = (slot: SlotId) => `severed-heaven-slot-${slot}`;
/** A reloading tab can still hold its lock for a moment, so a busy slot is retried before the notice. */
const LOCK_RETRIES = [150, 350, 700];

// Slot changes run one at a time, so two of them never race for the same lock.
let queue: Promise<unknown> = Promise.resolve();
function serial<T>(fn: () => Promise<T>): Promise<T> {
  const run = queue.then(fn, fn);
  queue = run.catch(() => undefined);
  return run;
}

const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));

/**
 * True while time away is applied, or a rewind or reload swaps the life: what that brings raises
 * no toasts, since the coming-back card tells it.
 */
let quiet = false;
function quietly(fn: () => void) {
  quiet = true;
  try {
    fn();
  } finally {
    quiet = false;
  }
}

export const useGame = create<GameStore>()((set, get) => {
  function stopLoop() {
    if (tickTimer) clearInterval(tickTimer);
    if (autosaveTimer) clearInterval(autosaveTimer);
    tickTimer = autosaveTimer = null;
  }

  /** Sets the new state; a breakthrough on the way saves at once, as a rewind point. */
  function update(next: GameState) {
    const before = get().game;
    set({ game: next });
    if (before && next.glass.flares > before.glass.flares)
      void get().saveNow({ rewindPoint: true });
  }

  /**
   * Catches a long time away up in slices while the abode shows as opening, so the page never
   * freezes, then shows what happened. Dropped if the slot changed meanwhile.
   */
  async function catchUpAway(from: GameState, savedAt: number, now: number) {
    const slot = get().slot;
    catching = true;
    set({ phase: 'loading' });
    try {
      const away = await catchUpInSlices(from, savedAt, now, { step: playDay, pause });
      if (get().slot !== slot) return;
      quietly(() => {
        set({ phase: 'playing', away: { ...away, before: from } });
        update(away.state);
      });
      void get().saveNow();
    } finally {
      catching = false;
      lastTick = Date.now();
    }
  }

  function tick() {
    const { game, speed } = get();
    if (!game || catching) return;
    const now = Date.now();
    const gap = now - lastTick;
    lastTick = now;
    // The seat runs on real seconds; a long gap is time away, which the seat spends fading.
    const { seat, state } = tickSeat(game, gap / 1000);
    if (gap > OFFLINE_GAP_MS) {
      void catchUpAway(state, now - gap, now);
      return;
    }
    update(advance(state, gap * speed, { step: playDay, seat }).state);
    playScene(seat);
  }

  /**
   * Rolls a breakthrough scene that has run its wind-up and race, with what it caught. At the
   * figure, a step that always holds plays a scene of its own on any ladder, since the auto
   * setting leaves it one.
   */
  function playScene(seat: Seat) {
    const { game } = get();
    const due = sceneDue(game);
    if (due && game) {
      const r = breakThrough(game, due.ladder, {
        scene: sceneBonus(due.scene),
        offerings: due.offerings,
      });
      if (!r.attempted) return endScene();
      update(r.state);
      if (!r.success) void get().saveNow();
      sceneRolled({ success: r.success, major: r.major, odds: r.odds });
      return;
    }
    // Never over the breakthrough panel while you lay offerings.
    const { play, panel } = useScene.getState();
    if (game && seat.scene === 'ready' && !play && !panel) {
      const certain = LADDERS.find((which) => {
        const attempt = attemptOf(game, which);
        return attempt && !attempt.major && attempt.odds >= 1;
      });
      if (certain) startScene(game, certain);
    }
  }

  function startLoop() {
    stopLoop();
    lastTick = Date.now();
    tickTimer = setInterval(tick, TICK_MS);
    autosaveTimer = setInterval(() => void get().saveNow(), AUTOSAVE_MS);
  }

  /** Releases the lock and stops the loop, after a last save if this tab still owns the slot. */
  async function closeSession() {
    if (holdsLock && get().game) await get().saveNow();
    stopLoop();
    holdsLock = false;
    releaseLock?.();
    releaseLock = null;
  }

  /** Takes the slot's lock; `steal` takes it from another tab. False if another tab holds it. */
  function acquireLock(slot: SlotId, steal: boolean): Promise<boolean> {
    if (!('locks' in navigator)) return Promise.resolve((holdsLock = true));
    return new Promise((resolve) => {
      navigator.locks
        .request(lockName(slot), steal ? { steal: true } : { ifAvailable: true }, (lock) => {
          if (!lock) {
            resolve(false);
            return;
          }
          holdsLock = true;
          resolve(true);
          return new Promise<void>((r) => (releaseLock = r));
        })
        .catch(() => {
          // Another tab stole the lock: stop at once, without saving over its progress.
          if (get().slot !== slot || !holdsLock) return;
          holdsLock = false;
          releaseLock = null;
          stopLoop();
          set({ phase: 'lost' });
        });
    });
  }

  /** Loads the slot, applies offline time and starts the loop. Needs the lock. */
  async function play(slot: SlotId) {
    const loaded = await db().load(slot);
    if (!loaded) {
      set({ phase: 'no-slot', slot: null, game: null });
      return;
    }
    const now = Date.now();
    catching = true;
    const away = await catchUpInSlices(loaded.save.state, loaded.save.savedAt, now, {
      step: playDay,
      pause,
    }).finally(() => (catching = false));
    set({
      phase: 'playing',
      slot,
      game: away.state,
      savedAt: loaded.save.savedAt,
      away: away.countedMs > OFFLINE_GAP_MS ? { ...away, before: loaded.save.state } : null,
      notice: loaded.warning ?? null,
    });
    saveSettings({ activeSlot: slot });
    await get().saveNow();
    startLoop();
  }

  async function refreshSlots() {
    set({ slots: await db().list() });
  }

  async function openSlotNow(slot: SlotId) {
    if (get().slot === slot && get().phase === 'playing') return;
    await closeSession();
    set({ slot, game: null, away: null, phase: 'loading' });
    let locked = await acquireLock(slot, false);
    for (const ms of LOCK_RETRIES) {
      if (locked) break;
      await wait(ms);
      locked = await acquireLock(slot, false);
    }
    if (!locked) {
      set({ phase: 'busy' });
      return;
    }
    try {
      await play(slot);
    } catch (e) {
      await closeSession();
      set({ phase: 'no-slot', slot: null, notice: message(e) });
    }
    await refreshSlots();
  }

  async function init() {
    set({ speed: speedFromUrl() });
    startSeatInput();
    // Ask the browser to keep our storage; Safari clears unvisited sites after a week otherwise.
    if (navigator.storage?.persist) {
      navigator.storage
        .persisted()
        .then((p) => (p ? p : navigator.storage.persist()))
        .then((persisted) => set({ persisted }))
        .catch(() => set({ persisted: null }));
    }
    // Leaving or hiding the tab saves; offline catch-up covers anything a lost write misses.
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'hidden') void get().saveNow();
    });
    window.addEventListener('pagehide', () => {
      const { game, slot } = get();
      if (game && slot && holdsLock) db().writeNow(slot, makeSave(game, Date.now()));
    });
    try {
      await refreshSlots();
    } catch (e) {
      set({ phase: 'no-slot', notice: `Storage is unavailable: ${message(e)}` });
      return;
    }
    const active = loadSettings().activeSlot;
    const slot = get().slots.find((s) => s.slot === active && !s.empty);
    if (slot) await serial(() => openSlotNow(slot.slot));
    else set({ phase: 'no-slot' });
  }

  return {
    phase: 'loading',
    slot: null,
    game: null,
    savedAt: null,
    away: null,
    notice: null,
    slots: [],
    persisted: null,
    speed: 1,
    creating: null,
    cardOutcome: null,

    // React's strict mode runs the starting effect twice in development; the game starts once.
    init: () => (initStarted ??= init()),

    openSlot: (slot) => serial(() => openSlotNow(slot)),

    takeOver: () =>
      serial(async () => {
        const { slot } = get();
        if (!slot) return;
        set({ phase: 'loading' });
        await acquireLock(slot, true);
        await play(slot);
      }),

    beginCreation: (slot) => set({ creating: { slot, next: false } }),

    cancelCreation: () => set({ creating: null }),

    finishCreation: (creation) =>
      serial(async () => {
        const target = get().creating;
        if (!target) return;
        if (target.next) {
          const { game } = get();
          if (!game?.ended || !holdsLock || get().slot !== target.slot) return;
          set({ game: createNextLife(game, creation), away: null, creating: null });
          raiseStartToasts(get().game!);
          await get().saveNow({ rewindPoint: true });
          await refreshSlots();
          return;
        }
        const state = createLife(creation);
        await db().write(target.slot, makeSave(state, Date.now()), { rewindPoint: true });
        set({ creating: null });
        await refreshSlots();
        await openSlotNow(target.slot);
        // A new life holds everything seen; what testing day gave names itself once.
        const opened = get().game;
        if (opened) raiseStartToasts(opened);
      }),

    chooseCard(uid, index, title) {
      const { game } = get();
      if (!game || !holdsLock) return 'This life is not open in this tab.';
      const r = resolveCard(game, uid, index);
      if (!r.ok) return r.reason ?? 'That cannot be chosen.';
      update(r.state);
      get().markHint('cards');
      set({
        cardOutcome: {
          uid,
          title,
          text: r.text,
          pass: r.pass,
          goesOn: !r.done,
          ...(r.check ? { check: r.check } : {}),
        },
      });
      void get().saveNow();
      return null;
    },

    dismissCardOutcome: () => set({ cardOutcome: null }),

    async saveNow(opts) {
      const { game, slot } = get();
      if (!game || !slot || !holdsLock) return;
      const savedAt = Date.now();
      await db().write(slot, makeSave(game, savedAt), opts);
      set({ savedAt });
    },

    setPlan(patch) {
      const { game } = get();
      if (!game) return;
      set({ game: setLifePlan(game, patch) });
    },

    setHours(hours, kind) {
      const { game } = get();
      if (!game || !holdsLock) return 'This life is not open in this tab.';
      const r = giveHours(game, hours, kind);
      if (!r.check.ok) return r.check.reason;
      set({ game: r.state });
      if (kind === 'qi') get().markHint('qi-hours');
      return null;
    },

    followRoutine(hours) {
      const { game } = get();
      if (!game || !holdsLock) return 'This life is not open in this tab.';
      const r = followRoutineHours(game, hours);
      if (!r.check.ok) return r.check.reason;
      set({ game: r.state });
      return null;
    },

    saveRoutine(name) {
      const { game } = get();
      if (!game || !holdsLock) return 'This life is not open in this tab.';
      const r = saveRoutine(game.player, name);
      if (!r.check.ok) return r.check.reason;
      set({ game: withPlayer(game, r.cultivator) });
      return null;
    },

    forgetRoutine(name) {
      const { game } = get();
      if (!game || !holdsLock) return;
      set({ game: withPlayer(game, forgetSavedRoutine(game.player, name)) });
    },

    breakThrough(ladder, offerings = []) {
      const { game } = get();
      if (!game || !holdsLock) return;
      const r = breakThrough(game, ladder, { offerings });
      if (!r.attempted) return;
      update(r.state);
      get().markHint('breakthrough');
      if (!r.success) void get().saveNow();
    },

    beginScene(ladder, offerings = []) {
      const { game } = get();
      if (!game || !holdsLock) return false;
      const started = startScene(game, ladder, offerings);
      if (started) get().markHint('breakthrough');
      return started;
    },

    learnNode(id) {
      const { game } = get();
      if (!game || !holdsLock) return 'This life is not open in this tab.';
      const r = learn(game, id);
      if (!r.check.ok) return r.check.reason;
      set({ game: r.state });
      return null;
    },

    wear(id) {
      const { game } = get();
      if (!game || !holdsLock) return 'This life is not open in this tab.';
      const r = wearItem(game, id);
      if (!r.check.ok) return r.check.reason;
      set({ game: r.state });
      return null;
    },

    takeOff(slot, id) {
      const { game } = get();
      if (!game || !holdsLock) return;
      set({ game: takeOff(game, slot, id) });
    },

    eat(id) {
      const { game } = get();
      if (!game || !holdsLock) return;
      set({ game: takeItem(game, id) });
    },

    feedStones(id, stones) {
      const { game } = get();
      if (!game || !holdsLock) return;
      set({ game: feedStones(game, id, stones) });
    },

    applyLife(change) {
      const { game } = get();
      if (!game || !holdsLock || game.ended) return false;
      set({ game: change(game) });
      return true;
    },

    practice(id) {
      const { game } = get();
      if (!game || !holdsLock) return 'This life is not open in this tab.';
      const r = practice(game, id);
      if (!r.check.ok) return r.check.reason;
      set({ game: r.state });
      return null;
    },

    stopPractice(id) {
      const { game } = get();
      if (!game || !holdsLock) return;
      set({ game: stopPracticing(game, id) });
    },

    readCopy(id) {
      const { game } = get();
      if (!game || !holdsLock) return 'This life is not open in this tab.';
      const r = readCopy(game, id);
      if (!r.check.ok) return r.check.reason;
      set({ game: r.state });
      return null;
    },

    unqueue(id) {
      const { game } = get();
      if (!game || !holdsLock) return;
      set({ game: unqueueRead(game, id) });
    },

    moveQueued(id, by) {
      const { game } = get();
      if (!game || !holdsLock) return;
      set({ game: moveRead(game, id, by) });
    },

    setMethod(ladder, id) {
      const { game } = get();
      if (!game || !holdsLock) return 'This life is not open in this tab.';
      const r = switchMethod(game, ladder, id);
      if (!r.check.ok) return r.check.reason;
      set({ game: r.state });
      return null;
    },

    lastChance() {
      const { game } = get();
      if (!game || !holdsLock) return;
      const r = attemptLastChance(game);
      update(r.state);
      if (!r.success) void get().saveNow();
    },

    letGo() {
      const { game } = get();
      if (!game || !holdsLock) return;
      set({ game: endLife(game) });
      void get().saveNow();
    },

    catchOrb(x, y, inPlace) {
      const { game } = get();
      if (!game || !holdsLock || game.ended) return;
      const next = catchNow(game, x, y, inPlace);
      if (next !== game) set({ game: next });
    },

    setClock(realm) {
      const { game } = get();
      if (!game || !holdsLock) return;
      set({ game: setClock(game, realm) });
      void get().saveNow();
    },

    seePerson(id) {
      const { game } = get();
      if (!game || !holdsLock) return;
      const next = seePerson(game, id);
      if (next !== game) set({ game: next });
    },

    see(kind, ids) {
      const { game } = get();
      if (!game || !holdsLock) return;
      const next = see(game, kind, ids);
      if (next !== game) set({ game: next });
    },

    openScreen(screen) {
      const { game } = get();
      if (!game || !holdsLock) return;
      const next = openScreen(game, screen);
      if (next !== game) set({ game: next });
    },

    markHint(id) {
      const { game } = get();
      if (!game || !holdsLock || game.hints.shown.includes(id)) return;
      set({ game: { ...game, hints: { ...game.hints, shown: [...game.hints.shown, id] } } });
    },

    setHints(on) {
      const { game } = get();
      if (!game || !holdsLock) return;
      // Turning them off counts as an answer to the hint that says they can be.
      const shown = game.hints.shown.includes('hints-off')
        ? game.hints.shown
        : [...game.hints.shown, 'hints-off'];
      set({ game: { ...game, hints: { on, shown } } });
    },

    replayHints() {
      const { game } = get();
      if (!game || !holdsLock) return;
      set({ game: { ...game, hints: { on: true, shown: [] } } });
    },

    rerollGlass() {
      const { game } = get();
      if (!game || !holdsLock) return;
      set({ game: rerollGlass(game) });
      void get().saveNow();
    },

    beginNextLife() {
      const { game, slot } = get();
      if (!game?.ended || !holdsLock || !slot) return;
      set({ creating: { slot, next: true } });
    },

    async exportSlot(slot) {
      try {
        if (slot === get().slot) await get().saveNow();
        const now = Date.now();
        const { bytes, save } = await db().exportSlot(slot, now);
        const url = URL.createObjectURL(
          new Blob([bytes as BlobPart], { type: 'application/gzip' }),
        );
        const a = document.createElement('a');
        a.href = url;
        a.download = exportFileName(save.state.player.name, slot, new Date(now));
        a.click();
        setTimeout(() => URL.revokeObjectURL(url), 10_000);
      } catch (e) {
        set({ notice: `Export failed: ${message(e)}` });
      }
      await refreshSlots();
    },

    importSlot: (slot, file) =>
      serial(async () => {
        const wasOpen = get().slot === slot;
        if (wasOpen) {
          await closeSession();
          set({ slot: null, game: null, phase: 'no-slot' });
        }
        try {
          const save = await db().importSlot(slot, new Uint8Array(await file.arrayBuffer()));
          set({ notice: `Imported ${save.state.player.name} into slot ${slot}.` });
        } catch (e) {
          set({ notice: `Import failed: ${message(e)}` });
        }
        await refreshSlots();
        if (wasOpen) await openSlotNow(slot);
      }),

    clearSlot: (slot) =>
      serial(async () => {
        if (get().slot === slot) {
          stopLoop();
          holdsLock = false;
          releaseLock?.();
          releaseLock = null;
          set({ slot: null, game: null, phase: 'no-slot', away: null });
        }
        await db().clear(slot);
        await refreshSlots();
      }),

    async rewind() {
      const { slot } = get();
      if (!slot || !holdsLock) return;
      // Paused, so an autosave can't land on top of the rewound save.
      stopLoop();
      endScene();
      try {
        await get().saveNow();
        const save = await db().rewind(slot, Date.now());
        quietly(() => set({ game: save.state, savedAt: save.savedAt, away: null }));
      } catch (e) {
        set({ notice: message(e) });
      }
      startLoop();
      await refreshSlots();
    },

    dismissAway: () => set({ away: null }),
    dismissNotice: () => set({ notice: null }),

    setSpeed(speed) {
      set({ speed });
      try {
        const url = new URL(window.location.href);
        if (speed === 1) url.searchParams.delete('speed');
        else url.searchParams.set('speed', String(speed));
        window.history.replaceState(null, '', url);
      } catch {
        // The URL is a convenience; the speed still holds for this session.
      }
    },

    mapAct(change) {
      const { game } = get();
      if (!game || !holdsLock) return 'This life is not open in this tab.';
      const r = change(ensureMap(game));
      if ('ok' in r) {
        // A refusal may still change the world (a keeper or a sergeant remembers).
        if (!r.ok) {
          if (r.state) set({ game: r.state });
          return r.reason;
        }
        set({ game: r.state });
      } else set({ game: r });
      return null;
    },

    devApply(change) {
      const { game } = get();
      if (!game || !holdsLock) return 'No life is open in this tab.';
      update(change(game));
      void get().saveNow();
      return null;
    },

    devAway(ms) {
      const { game } = get();
      if (!game || !holdsLock) return 'No life is open in this tab.';
      const now = Date.now();
      void catchUpAway(game, now - ms, now);
      return null;
    },
  };
});

// Every gift names itself in a toast as it comes (ui/toasts.ts): a change to the open life is
// checked for what it gained, unless it came from time away, a rewind or another life.
useGame.subscribe((now, was) => {
  if (now.slot !== was.slot || !now.game || now.game.lineage.life !== was.game?.lineage.life) {
    if (now.game !== was.game) clearToasts();
    driveHints();
    return;
  }
  if (now.game !== was.game) driveHints();
  if (quiet || now.game === was.game || !was.game) return;
  raiseToasts(gains(was.game, now.game), now.game);
  if (stonesRanOut(was.game, now.game)) raiseToast('stones', 'none left to burn');
  // A technique reaching Origin leaves its slot, which stays empty until the player fills it.
  for (const id of leftSlots(was.game, now.game)) {
    raiseToast('slot', `${technique(id).name} reached Origin and left its slot`, {
      screen: 'routine',
      tab: 'practice',
      select: id,
    });
  }
  // A stage of the Intent ladder opening is earned, not held, so it toasts by hand.
  for (const { dao, stage } of intentRisen(was.game.player, now.game.player)) {
    const st = intentName(dao, stage);
    raiseToast('intent', `${st.name} ${st.hanzi} wakes`, { screen: 'character' });
  }
});

/**
 * Hints, one at a time (ui/hints.ts): a hint showing stays until the player does what it says or
 * dismisses it, and the life then counts it shown; with none showing, the next the life hasn't
 * been shown rises. Turning hints off takes the one showing away, unmarked. Marking runs after the
 * change that called it, so the store isn't set from inside its own listener.
 */
function driveHints(): void {
  const { game, phase } = useGame.getState();
  const showing = shownHint();
  const on = phase === 'playing' && !!game && !game.ended && game.hints.on;
  if (showing?.hint) {
    if (!on || !game) return dismissToast(showing.key);
    if (!hintDone(game, showing.hint)) return;
    dismissToast(showing.key);
    const id = showing.hint;
    queueMicrotask(() => useGame.getState().markHint(id));
    return;
  }
  if (!on || !game) return;
  const next = nextHint(game);
  if (next) raiseToast('hint', next.text, next.to, next.id);
}

// A hot update would swap this store out from under the running game and its tab lock, so in
// development a change here reloads the page instead; pagehide saves first.
import.meta.hot?.dispose(() => window.location.reload());
