// The Zustand store that bridges core and UI: it owns the open slot, runs the loop, autosaves,
// and holds the slot's tab lock so two tabs never autosave over each other.
import { create } from 'zustand';
import { PLACEHOLDER_TECHNIQUE } from '../content/techniques.ts';
import type { LadderId } from '../core/cultivation.ts';
import {
  attemptLastChance,
  breakThrough,
  cultivate,
  endLife,
  learn,
  practice,
} from '../core/life.ts';
import { advance, catchUp, TICK_MS, type OfflineResult } from '../core/loop.ts';
import { makeSave, SaveError } from '../core/save/format.ts';
import { exportFileName } from '../core/save/file.ts';
import { SaveSlots, type SlotId, type SlotSummary } from '../core/save/slots.ts';
import { newLife, nextLife, type GameState } from '../core/state.ts';
import { loadSettings, saveSettings } from './settings.ts';

export const AUTOSAVE_MS = 30_000;
/** A gap longer than this between ticks (a sleeping laptop, a frozen tab) counts as offline time. */
const OFFLINE_GAP_MS = 60_000;

/** Offline time applied on return, with the state it started from, for the coming-back card. */
export interface AwaySummary extends OfflineResult {
  before: GameState;
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

  init(): Promise<void>;
  openSlot(slot: SlotId): Promise<void>;
  takeOver(): Promise<void>;
  startLife(slot: SlotId, mode: 'ironman' | 'gentle'): Promise<void>;
  /** Saves now; each breakthrough saves with `rewindPoint` set. */
  saveNow(opts?: { rewindPoint?: boolean }): Promise<void>;
  /** Changes the seclusion plan: shares, the auto setting, burning stones. */
  setPlan(patch: Partial<GameState['player']['plan']>): void;
  /** Attempts a ladder's next breakthrough, minor or major. */
  breakThrough(ladder: LadderId): void;
  /** Learns a tree node with insight; returns why not, or null. */
  learnNode(id: string): string | null;
  /** Points practice days at a technique, or at nothing. */
  practice(id: string | null): void;
  /** At the lifespan edge: the last breakthrough, or the end of the life if it fails. */
  lastChance(): void;
  /** At the lifespan edge: accept the end. */
  letGo(): void;
  /** After a death: a new life in the same slot, with the chronicle kept. */
  beginNextLife(): Promise<void>;
  exportSlot(slot: SlotId): Promise<void>;
  importSlot(slot: SlotId, file: File): Promise<void>;
  clearSlot(slot: SlotId): Promise<void>;
  rewind(): Promise<void>;
  dismissAway(): void;
  dismissNotice(): void;
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

  function tick() {
    const { game, speed } = get();
    if (!game) return;
    const now = Date.now();
    const gap = now - lastTick;
    lastTick = now;
    if (gap > OFFLINE_GAP_MS) {
      const away = catchUp(game, now - gap, now, { step: cultivate });
      set({ away: { ...away, before: game } });
      update(away.state);
    } else {
      update(advance(game, gap * speed, { step: cultivate }).state);
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
    const away = catchUp(loaded.save.state, loaded.save.savedAt, now, { step: cultivate });
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

    startLife: (slot, mode) =>
      serial(async () => {
        // Character creation arrives in P1.7; until then a new life is a nameless placeholder.
        // Until then, too, every life is the cave orphan who went along, with that first technique.
        const state = newLife({
          name: 'Nameless',
          mode,
          seed: `slot${slot}-${Date.now()}`,
          techniques: [PLACEHOLDER_TECHNIQUE],
        });
        await db().write(slot, makeSave(state, Date.now()), { rewindPoint: true });
        await refreshSlots();
        await openSlotNow(slot);
      }),

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
      const p = game.player;
      set({ game: { ...game, player: { ...p, plan: { ...p.plan, ...patch } } } });
    },

    breakThrough(ladder) {
      const { game } = get();
      if (!game || !holdsLock) return;
      const r = breakThrough(game, ladder);
      if (!r.attempted) return;
      update(r.state);
      if (!r.success) void get().saveNow();
    },

    learnNode(id) {
      const { game } = get();
      if (!game || !holdsLock) return 'This life is not open in this tab.';
      const r = learn(game, id);
      if (!r.check.ok) return r.check.reason;
      set({ game: r.state });
      return null;
    },

    practice(id) {
      const { game } = get();
      if (!game || !holdsLock) return;
      set({ game: practice(game, id) });
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

    async beginNextLife() {
      const { game } = get();
      if (!game?.ended || !holdsLock) return;
      // Character creation arrives in P1.7; until then each life is a nameless placeholder.
      set({
        game: nextLife(game, {
          name: 'Nameless',
          seed: `${game.lineage.id}-${Date.now()}`,
          techniques: [PLACEHOLDER_TECHNIQUE],
        }),
        away: null,
      });
      await get().saveNow({ rewindPoint: true });
      await refreshSlots();
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
      try {
        await get().saveNow();
        const save = await db().rewind(slot, Date.now());
        set({ game: save.state, savedAt: save.savedAt, away: null });
      } catch (e) {
        set({ notice: message(e) });
      }
      startLoop();
      await refreshSlots();
    },

    dismissAway: () => set({ away: null }),
    dismissNotice: () => set({ notice: null }),
  };
});

// A hot update would swap this store out from under the running game and its tab lock, so in
// development a change here reloads the page instead; pagehide saves first.
import.meta.hot?.dispose(() => window.location.reload());
