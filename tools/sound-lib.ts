// The sound pipeline's ingest (docs/art-pipeline.md § Sound): sound/manifest.json names every sound
// shipped with its source, licence and credit; Jan drops files in sound/inbox/ named by cue id (the
// picker, `npm run sound:pick`, drops them there too), and `npm run sound` moves them to
// sound/source/, writes the MP3 under public/sound/, evens the loudness, checks the budgets and the
// licences, and lists what shipped in src/ui/sound/shipped.json for the game and its credits.
// Node only, with ffmpeg-static, so it runs in PowerShell with nothing else installed.

import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import {
  copyFileSync,
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  rmSync,
  statSync,
  writeFileSync,
} from 'node:fs';
import { dirname, extname, isAbsolute, join, resolve } from 'node:path';
import ffmpegPath from 'ffmpeg-static';
import { z } from 'zod';
import { CUES, cueInfo, type SoundKind } from '../src/ui/sound/table.ts';

/**
 * The licences a sound may ship under: free for use in a game that may one day sell, so never a
 * NonCommercial one, and AI music only from a paid plan that grants its use.
 */
export const LICENCES = [
  'CC0',
  'CC-BY-3.0',
  'CC-BY-4.0',
  'Pixabay',
  'Sonniss-GDC',
  // S1.1: royalty-free packs for games, no credit asked (each one's own licence, checked by Jan).
  'Mixkit',
  'Shapeforms',
  '99Sounds',
  'Suno-paid',
  'Udio-paid',
] as const;

/** Each kind's budget in KB, as loading hygiene: a long sound is trimmed, never left out. */
export const KIND_BUDGET_KB: Record<SoundKind, number> = {
  effect: 96,
  loop: 512,
  ambience: 2048,
  music: 6144,
};

/** How each kind is encoded: channels, bitrate and loudness (LUFS). */
const ENCODE: Record<SoundKind, { channels: number; kbps: number; lufs: number }> = {
  effect: { channels: 1, kbps: 96, lufs: -16 },
  loop: { channels: 1, kbps: 96, lufs: -20 },
  ambience: { channels: 2, kbps: 96, lufs: -24 },
  music: { channels: 2, kbps: 128, lufs: -18 },
};

/**
 * Where the sounds that aren't committed live (inbox, source, takes): the main checkout's sound/,
 * so every worktree shares what Jan dropped in and the originals outlive a worktree (S1.1). A
 * folder outside git keeps its own.
 */
export function soundHome(root: string): string {
  try {
    const common = execFileSync('git', ['rev-parse', '--git-common-dir'], {
      cwd: root,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
    }).trim();
    const dir = isAbsolute(common) ? common : resolve(root, common);
    return dirname(dir);
  } catch {
    return root;
  }
}

export const AUDIO_EXTS = ['.mp3', '.wav', '.ogg', '.flac', '.m4a', '.aac', '.opus', '.webm'];

export const soundSchema = z
  .object({
    id: z.string().refine((id) => !!cueInfo(id), 'not a cue in src/ui/sound/table.ts'),
    /** The page the sound came from. */
    source: z.string().url(),
    licence: z.string(),
    /** The credit line Settings lists: who made it and where, as the licence asks. */
    credit: z.string().min(1, 'every sound carries a credit'),
    /** Cut to these seconds of the source, start and end. */
    trim: z.tuple([z.number().min(0), z.number().positive()]).optional(),
    /** Raised or lowered after the loudness is evened, in dB. */
    gainDb: z.number().min(-24).max(12).optional(),
    note: z.string().optional(),
  })
  .strict()
  .superRefine((s, ctx) => {
    if (/\bNC\b|noncommercial|non-commercial/i.test(s.licence))
      ctx.addIssue({ code: 'custom', message: 'a NonCommercial licence would bar Steam' });
    else if (!(LICENCES as readonly string[]).includes(s.licence))
      ctx.addIssue({
        code: 'custom',
        message: `licence "${s.licence}" is not one of ${LICENCES.join(', ')}`,
      });
  });

export type SoundEntry = z.infer<typeof soundSchema>;

export const manifestSchema = z.object({ sounds: z.array(soundSchema) }).strict();

export interface ShippedEntry {
  id: string;
  kind: SoundKind;
  file: string;
  credit: string;
  /** What it was made from and how, so a changed source or entry is made again. */
  made: string;
}

export interface SoundReport {
  moved: string[];
  written: { file: string; kb: number; budgetKB: number }[];
  kept: string[];
  removed: string[];
  errors: string[];
}

export function readManifest(root: string): { sounds: SoundEntry[] } {
  const path = join(root, 'sound', 'manifest.json');
  if (!existsSync(path)) return { sounds: [] };
  return manifestSchema.parse(JSON.parse(readFileSync(path, 'utf8')));
}

export function writeManifest(root: string, m: { sounds: SoundEntry[] }): void {
  const sounds = [...m.sounds].sort((a, b) => a.id.localeCompare(b.id));
  writeFileSync(
    join(root, 'sound', 'manifest.json'),
    JSON.stringify({ sounds }, null, 2) + '\n',
    'utf8',
  );
}

/** The file a cue's source is, in a folder: `<id>.<any audio extension>`. */
export function sourceOf(dir: string, id: string): string | null {
  if (!existsSync(dir)) return null;
  const f = readdirSync(dir).find(
    (n) => n.slice(0, n.length - extname(n).length) === id && AUDIO_EXTS.includes(extname(n)),
  );
  return f ? join(dir, f) : null;
}

/**
 * A downloaded file's source and credit, from its name: Freesound's `<id>__<user>__<name>`, and
 * Pixabay's `<author>-<title>-<id>` (its pages sit behind Cloudflare, so nothing is fetched). A guess, for Jan to check on the
 * page before the picker ships it.
 */
export function guessOf(file: string): {
  source: string;
  licence: string;
  credit: string;
  guessed: boolean;
} {
  const base = file.slice(0, file.length - extname(file).length);
  const fs = base.match(/^(\d+)__(.+?)__/);
  if (fs)
    return {
      source: `https://freesound.org/s/${fs[1]}/`,
      licence: 'CC0',
      credit: `${fs[2]} (freesound.org)`,
      guessed: true,
    };
  const px = base.match(/^([^-]+)-.*-(\d{3,})$/);
  if (px)
    return {
      source: `https://pixabay.com/sound-effects/id-${px[2]}/`,
      licence: 'Pixabay',
      credit: `${px[1]} (Pixabay)`,
      guessed: true,
    };
  return { source: '', licence: 'CC0', credit: '', guessed: true };
}

/**
 * The longest each kind ships, in seconds, and the fade at the cut (S1.1): a long recording (a
 * gong's whole decay, a ten-minute field take) is cut to fit its budget rather than turned away,
 * and the manifest's `trim` picks another stretch.
 */
export const KIND_MAX_S: Record<SoundKind, { s: number; fade: number } | null> = {
  effect: { s: 7.5, fade: 1.5 },
  loop: { s: 40, fade: 0.05 },
  ambience: { s: 160, fade: 0.05 },
  music: null,
};

/** ffmpeg's arguments for a sound: trimmed, a leading silence cut from an effect, loudness evened. */
export function ffmpegArgs(
  e: SoundEntry,
  kind: SoundKind,
  input: string,
  output: string,
): string[] {
  const enc = ENCODE[kind];
  const filters: string[] = [];
  if (kind === 'effect')
    filters.push('silenceremove=start_periods=1:start_threshold=-50dB:start_silence=0.01');
  const max = KIND_MAX_S[kind];
  if (max) filters.push(`atrim=end=${max.s}`, `afade=t=out:st=${max.s - max.fade}:d=${max.fade}`);
  filters.push(`loudnorm=I=${enc.lufs}:TP=-1.5:LRA=11`);
  if (e.gainDb) filters.push(`volume=${e.gainDb}dB`);
  const trim = e.trim ? ['-ss', String(e.trim[0]), '-to', String(e.trim[1])] : [];
  return [
    '-y',
    '-loglevel',
    'error',
    ...trim,
    '-i',
    input,
    '-vn',
    '-map_metadata',
    '-1',
    '-af',
    filters.join(','),
    '-ac',
    String(enc.channels),
    '-ar',
    '44100',
    '-c:a',
    'libmp3lame',
    '-b:a',
    `${enc.kbps}k`,
    output,
  ];
}

const hashOf = (file: string, e: SoundEntry) =>
  createHash('sha1')
    .update(readFileSync(file))
    .update(JSON.stringify({ trim: e.trim, gainDb: e.gainDb }))
    .digest('hex')
    .slice(0, 12);

export function runSound(
  root: string,
  encode = encodeWithFfmpeg,
  home = soundHome(root),
): SoundReport {
  const report: SoundReport = { moved: [], written: [], kept: [], removed: [], errors: [] };
  let manifest: { sounds: SoundEntry[] };
  try {
    manifest = readManifest(root);
  } catch (err) {
    report.errors.push(`sound/manifest.json: ${err instanceof Error ? err.message : String(err)}`);
    return report;
  }
  const inbox = join(home, 'sound', 'inbox');
  const source = join(home, 'sound', 'source');
  const out = join(root, 'public', 'sound');
  const shippedPath = join(root, 'src', 'ui', 'sound', 'shipped.json');
  mkdirSync(source, { recursive: true });
  mkdirSync(out, { recursive: true });

  // What Jan dropped in replaces the source of the same cue, whatever its extension.
  if (existsSync(inbox)) {
    for (const name of readdirSync(inbox)) {
      const id = name.slice(0, name.length - extname(name).length);
      if (!AUDIO_EXTS.includes(extname(name))) continue;
      if (!cueInfo(id)) {
        report.errors.push(`inbox/${name}: no cue ${id} in src/ui/sound/table.ts`);
        continue;
      }
      const old = sourceOf(source, id);
      if (old) rmSync(old);
      copyFileSync(join(inbox, name), join(source, name));
      rmSync(join(inbox, name));
      report.moved.push(name);
    }
  }

  const before = new Map<string, ShippedEntry>(
    existsSync(shippedPath)
      ? (JSON.parse(readFileSync(shippedPath, 'utf8')) as { sounds: ShippedEntry[] }).sounds.map(
          (s) => [s.id, s],
        )
      : [],
  );
  const shipped: ShippedEntry[] = [];
  for (const e of manifest.sounds) {
    const kind = cueInfo(e.id)!.kind;
    const src = sourceOf(source, e.id);
    if (!src) {
      report.errors.push(`${e.id}: no source in sound/source/ (drop it in sound/inbox/)`);
      continue;
    }
    const file = `${e.id}.mp3`;
    const dest = join(out, file);
    const made = hashOf(src, e);
    if (before.get(e.id)?.made !== made || !existsSync(dest)) {
      try {
        encode(ffmpegArgs(e, kind, src, dest));
      } catch (err) {
        report.errors.push(`${e.id}: ffmpeg failed: ${err instanceof Error ? err.message : err}`);
        continue;
      }
      const kb = statSync(dest).size / 1024;
      report.written.push({ file: `public/sound/${file}`, kb, budgetKB: KIND_BUDGET_KB[kind] });
    } else report.kept.push(e.id);
    const kb = statSync(dest).size / 1024;
    if (kb > KIND_BUDGET_KB[kind])
      report.errors.push(
        `${e.id}: ${kb.toFixed(0)} KB, over the ${kind} budget of ${KIND_BUDGET_KB[kind]} KB; trim it`,
      );
    shipped.push({ id: e.id, kind, file, credit: e.credit, made });
  }

  // A file no entry names any more goes.
  const named = new Set(shipped.map((s) => s.file));
  for (const f of readdirSync(out)) {
    if (f.endsWith('.mp3') && !named.has(f)) {
      rmSync(join(out, f));
      report.removed.push(f);
    }
  }
  shipped.sort((a, b) => a.id.localeCompare(b.id));
  writeFileSync(shippedPath, JSON.stringify({ sounds: shipped }, null, 2) + '\n', 'utf8');
  return report;
}

export function encodeWithFfmpeg(args: string[]): void {
  if (!ffmpegPath) throw new Error('ffmpeg-static has no binary for this platform');
  execFileSync(ffmpegPath as unknown as string, args, { stdio: ['ignore', 'ignore', 'pipe'] });
}

/** The cues with no sound yet, by kind: what's left to find. */
export function missing(root: string): string[] {
  const have = new Set(readManifest(root).sounds.map((s) => s.id));
  return CUES.filter((c) => !have.has(c.id)).map((c) => c.id);
}
