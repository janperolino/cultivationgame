// Eight save slots in IndexedDB through Dexie. Each holds a lineage: the current autosave, the
// previous one as a backup, gentle mode's rewind point and the last export date.
import { Dexie, type DexieOptions, type EntityTable } from 'dexie';
import { ageYears, chronicleEvent, realmOf, stageOf, type GameState } from '../state.ts';
import { encodeSaveFile, decodeSaveFile } from './file.ts';
import { loadSave, makeSave, SaveError, type Save } from './format.ts';

export const SLOTS = [1, 2, 3, 4, 5, 6, 7, 8] as const;
export type SlotId = (typeof SLOTS)[number];

/** Saves are stored raw and checked with Zod on the way out, so a bad write can't hide. */
interface SlotRecord {
  slot: number;
  current?: unknown;
  backup?: unknown;
  rewind?: unknown;
  lastExportAt?: number;
}

class SaveDb extends Dexie {
  slots!: EntityTable<SlotRecord, 'slot'>;

  constructor(name: string, opts?: DexieOptions) {
    super(name, opts);
    // The IndexedDB schema version, separate from the save format's version.
    this.version(1).stores({ slots: 'slot' });
  }
}

export interface LoadResult {
  save: Save;
  from: 'current' | 'backup';
  /** Set when the latest save failed its check and the backup was loaded instead. */
  warning?: string;
}

export interface SlotSummary {
  slot: SlotId;
  empty: boolean;
  /** Neither the save nor its backup passes its check. */
  broken?: boolean;
  name?: string;
  qiRealm?: GameState['player']['qi']['realm'];
  qiStage?: number;
  age?: number;
  mode?: GameState['mode'];
  savedAt?: number;
  lastExportAt?: number;
  canRewind?: boolean;
}

function tryLoad(raw: unknown): { save?: Save; error?: string } {
  if (raw === undefined) return { error: 'missing' };
  try {
    return { save: loadSave(raw) };
  } catch (e) {
    return { error: e instanceof Error ? e.message : String(e) };
  }
}

export class SaveSlots {
  private readonly db: SaveDb;
  /**
   * The last record read or written per slot. The tab holding a slot's lock is its only writer,
   * so a save can be one put with no read in front of it, which still lands when the page unloads.
   */
  private readonly known = new Map<number, SlotRecord>();
  /** Saves this tab wrote or checked: the page's last write trusts them rather than checking again. */
  private readonly checked = new WeakSet<object>();

  constructor(name = 'severed-heaven', opts?: DexieOptions) {
    this.db = new SaveDb(name, opts);
  }

  close(): void {
    this.db.close();
  }

  /** The slot's save, or the backup if the latest fails its check; null when the slot is empty. */
  async load(slot: SlotId): Promise<LoadResult | null> {
    const rec = await this.fetch(slot);
    if (!rec || (rec.current === undefined && rec.backup === undefined)) return null;
    const current = tryLoad(rec.current);
    if (current.save) {
      if (typeof rec.current === 'object' && rec.current) this.checked.add(rec.current);
      return { save: current.save, from: 'current' };
    }
    const backup = tryLoad(rec.backup);
    if (backup.save) {
      return {
        save: backup.save,
        from: 'backup',
        warning: `The latest save could not be read (${current.error}), so the previous autosave was loaded.`,
      };
    }
    throw new SaveError(`Slot ${slot} could not be read: ${current.error}`);
  }

  /**
   * Writes a save. The old one becomes the backup, but only if it still passes its check, so a
   * damaged save never pushes out a good backup. `rewindPoint` also stores it as the rewind point.
   */
  async write(slot: SlotId, save: Save, opts: { rewindPoint?: boolean } = {}): Promise<void> {
    const rec = this.known.get(slot) ?? (await this.fetch(slot)) ?? { slot };
    const oldIsGood = tryLoad(rec.current).save !== undefined;
    if (oldIsGood && rec.current) this.checked.add(rec.current);
    this.checked.add(save);
    await this.put({
      ...rec,
      current: save,
      backup: oldIsGood ? rec.current : rec.backup,
      rewind: opts.rewindPoint ? save : rec.rewind,
    });
  }

  /**
   * `write` for a page that is unloading: the IndexedDB put is queued before this returns, where
   * Dexie's would wait a few promise turns that a closing page never gets. Needs the slot loaded
   * or written once already, and the database open; otherwise it does nothing and returns false.
   */
  writeNow(slot: SlotId, save: Save): boolean {
    const rec = this.known.get(slot);
    if (!rec || !this.db.isOpen()) return false;
    // A closing page has no time for a full check: a save this tab wrote or checked is trusted.
    const old = rec.current;
    const oldIsGood =
      (typeof old === 'object' && old !== null && this.checked.has(old)) ||
      tryLoad(old).save !== undefined;
    const next: SlotRecord = {
      ...rec,
      current: save,
      backup: oldIsGood ? rec.current : rec.backup,
    };
    this.known.set(slot, next);
    const tx = this.db.backendDB().transaction('slots', 'readwrite', { durability: 'relaxed' });
    tx.objectStore('slots').put(next);
    tx.commit();
    return true;
  }

  private async fetch(slot: SlotId): Promise<SlotRecord | undefined> {
    const rec = await this.db.slots.get(slot);
    if (rec) this.known.set(slot, rec);
    else this.known.delete(slot);
    return rec;
  }

  private async put(rec: SlotRecord): Promise<void> {
    this.known.set(rec.slot, rec);
    await this.db.slots.put(rec);
  }

  /** Gentle mode's one rewind: back to the rewind point, spending the charge. */
  async rewind(slot: SlotId, now: number): Promise<Save> {
    const loaded = await this.load(slot);
    if (!loaded) throw new SaveError(`Slot ${slot} is empty.`);
    const cur = loaded.save.state;
    if (cur.mode !== 'gentle') throw new SaveError('Only gentle mode can rewind.');
    if (cur.rewindCharges < 1)
      throw new SaveError('The rewind is spent until the next major breakthrough.');
    const point = tryLoad(this.known.get(slot)?.rewind);
    if (!point.save) throw new SaveError('There is no rewind point.');
    const back = point.save.state;
    const state: GameState = {
      ...back,
      rewindCharges: 0,
      chronicle: [
        ...back.chronicle,
        chronicleEvent(back.calendar.day, 'rewind', {}, [back.player.id], back.player.place),
      ],
    };
    // savedAt is now, so the time between the rewind point and now isn't paid out as offline time.
    const save = makeSave(state, now);
    await this.write(slot, save);
    return save;
  }

  async clear(slot: SlotId): Promise<void> {
    this.known.delete(slot);
    await this.db.slots.delete(slot);
  }

  async list(): Promise<SlotSummary[]> {
    const recs = await this.db.slots.bulkGet([...SLOTS]);
    return SLOTS.map((slot, i) => {
      const rec = recs[i];
      if (rec) this.known.set(slot, rec);
      else this.known.delete(slot);
      if (!rec || (rec.current === undefined && rec.backup === undefined))
        return { slot, empty: true };
      const save = tryLoad(rec.current).save ?? tryLoad(rec.backup).save;
      if (!save) return { slot, empty: false, broken: true, lastExportAt: rec.lastExportAt };
      const s = save.state;
      return {
        slot,
        empty: false,
        name: s.player.name,
        qiRealm: realmOf(s.player),
        qiStage: stageOf(s.player),
        age: ageYears(s.player, s.calendar.day),
        mode: s.mode,
        savedAt: save.savedAt,
        lastExportAt: rec.lastExportAt,
        canRewind: s.mode === 'gentle' && s.rewindCharges > 0 && rec.rewind !== undefined,
      };
    });
  }

  /** The slot as one compressed file, recording the export date. */
  async exportSlot(slot: SlotId, now: number): Promise<{ bytes: Uint8Array; save: Save }> {
    const loaded = await this.load(slot);
    if (!loaded) throw new SaveError(`Slot ${slot} is empty.`);
    const bytes = await encodeSaveFile(loaded.save, now);
    const rec = this.known.get(slot);
    if (rec) await this.put({ ...rec, lastExportAt: now });
    return { bytes, save: loaded.save };
  }

  /**
   * Checks and migrates a file, then replaces the slot with it, so the backup never holds a
   * different life. The rewind point starts at the imported save.
   */
  async importSlot(slot: SlotId, data: Uint8Array | ArrayBuffer): Promise<Save> {
    const save = await decodeSaveFile(data);
    await this.put({ slot, current: save, rewind: save });
    return save;
  }

  /** For tests and repairs: writes raw data as the current save, unchecked. */
  async writeRaw(slot: SlotId, current: unknown): Promise<void> {
    const rec = (await this.fetch(slot)) ?? { slot };
    await this.put({ ...rec, current });
  }
}
