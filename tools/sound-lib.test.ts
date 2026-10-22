import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { ffmpegArgs, guessOf, manifestSchema, runSound, type SoundEntry } from './sound-lib.ts';

const entry = (over: Partial<SoundEntry> = {}): SoundEntry => ({
  id: 'ui-click',
  source: 'https://kenney.nl/assets/interface-sounds',
  licence: 'CC0',
  credit: 'Kenney (kenney.nl), CC0',
  ...over,
});

let dirs: string[] = [];
afterEach(() => {
  for (const d of dirs) rmSync(d, { recursive: true, force: true });
  dirs = [];
});

function project(sounds: SoundEntry[]): string {
  const root = mkdtempSync(join(tmpdir(), 'sound-'));
  dirs.push(root);
  mkdirSync(join(root, 'sound', 'inbox'), { recursive: true });
  mkdirSync(join(root, 'src', 'ui', 'sound'), { recursive: true });
  writeFileSync(join(root, 'sound', 'manifest.json'), JSON.stringify({ sounds }));
  return root;
}

/** A stand-in for ffmpeg: copies the input to the output, padded to a size. */
const fakeEncode =
  (kb = 4) =>
  (args: string[]) => {
    const out = args[args.length - 1]!;
    writeFileSync(out, Buffer.alloc(kb * 1024));
  };

describe('the sound manifest', () => {
  it('takes the free licences and turns away NonCommercial, unknown and uncredited ones', () => {
    const parse = (s: SoundEntry) => manifestSchema.safeParse({ sounds: [s] }).success;
    expect(parse(entry())).toBe(true);
    expect(parse(entry({ licence: 'CC-BY-4.0' }))).toBe(true);
    expect(parse(entry({ licence: 'CC-BY-NC-4.0' }))).toBe(false);
    expect(parse(entry({ licence: 'whatever' }))).toBe(false);
    expect(parse(entry({ credit: '' }))).toBe(false);
    expect(parse(entry({ id: 'not-a-cue' }))).toBe(false);
  });

  it('encodes each kind as its own: an effect mono with its lead silence cut, music in stereo', () => {
    const fx = ffmpegArgs(entry(), 'effect', 'in.ogg', 'out.mp3');
    expect(fx.join(' ')).toContain('-ac 1');
    expect(fx.join(' ')).toContain('silenceremove');
    const music = ffmpegArgs(
      entry({ id: 'music-map-1', trim: [2, 90] }),
      'music',
      'in.wav',
      'o.mp3',
    );
    expect(music.join(' ')).toContain('-b:a 128k');
    expect(music.join(' ')).toContain('-ss 2 -to 90');
    // A loop keeps its head, so it loops without a jump.
    const loop = ffmpegArgs(entry({ id: 'feel-qi-hum' }), 'loop', 'in.wav', 'o.mp3');
    expect(loop.join(' ')).not.toContain('silenceremove');
  });

  it("guesses a download's page and credit from its name, Freesound's and Pixabay's", () => {
    expect(guessOf('123456__someone__gong-swell.wav')).toMatchObject({
      source: 'https://freesound.org/s/123456/',
      credit: 'someone (freesound.org)',
      licence: 'CC0',
    });
    expect(guessOf('primalhousemusic-17-long-gong-shimmer-212955.mp3')).toMatchObject({
      source: 'https://pixabay.com/sound-effects/id-212955/',
      credit: 'primalhousemusic (Pixabay)',
      licence: 'Pixabay',
    });
    expect(guessOf('gong.wav').source).toBe('');
  });
});

describe('npm run sound', () => {
  it('moves the inbox to source, writes the MP3 and lists it with its credit', () => {
    const root = project([entry()]);
    writeFileSync(join(root, 'sound', 'inbox', 'ui-click.ogg'), 'x');
    const r = runSound(root, fakeEncode());
    expect(r.errors).toEqual([]);
    expect(r.moved).toEqual(['ui-click.ogg']);
    expect(existsSync(join(root, 'sound', 'source', 'ui-click.ogg'))).toBe(true);
    expect(existsSync(join(root, 'public', 'sound', 'ui-click.mp3'))).toBe(true);
    const shipped = JSON.parse(
      readFileSync(join(root, 'src', 'ui', 'sound', 'shipped.json'), 'utf8'),
    );
    expect(shipped.sounds[0]).toMatchObject({
      id: 'ui-click',
      kind: 'effect',
      credit: entry().credit,
    });
    // Unchanged, it is kept rather than made again.
    expect(runSound(root, fakeEncode()).kept).toEqual(['ui-click']);
  });

  it('fails on a missing source and on a sound over its budget', () => {
    const root = project([entry(), entry({ id: 'ui-tab' })]);
    writeFileSync(join(root, 'sound', 'inbox', 'ui-tab.wav'), 'x');
    const r = runSound(root, fakeEncode(80));
    expect(r.errors.some((e) => e.startsWith('ui-click: no source'))).toBe(true);
    expect(r.errors.some((e) => e.startsWith('ui-tab:') && e.includes('budget'))).toBe(true);
  });

  it('reads the inbox and keeps the originals in the sound home, shipping into the project', () => {
    const root = project([entry()]);
    const home = mkdtempSync(join(tmpdir(), 'sound-home-'));
    dirs.push(home);
    mkdirSync(join(home, 'sound', 'inbox'), { recursive: true });
    writeFileSync(join(home, 'sound', 'inbox', 'ui-click.ogg'), 'x');
    expect(runSound(root, fakeEncode(), home).errors).toEqual([]);
    expect(existsSync(join(home, 'sound', 'source', 'ui-click.ogg'))).toBe(true);
    expect(existsSync(join(root, 'public', 'sound', 'ui-click.mp3'))).toBe(true);
  });

  it('removes a shipped file no entry names any more', () => {
    const root = project([]);
    mkdirSync(join(root, 'public', 'sound'), { recursive: true });
    writeFileSync(join(root, 'public', 'sound', 'old.mp3'), 'x');
    expect(runSound(root, fakeEncode()).removed).toEqual(['old.mp3']);
  });
});
