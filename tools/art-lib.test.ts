import { existsSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import sharp from 'sharp';
import { afterEach, describe, expect, it } from 'vitest';
import {
  checkManifest,
  checkMaps,
  checkScreens,
  keyOut,
  screenOf,
  outputsOf,
  runArt,
  type ArtAsset,
  type ArtManifest,
} from './art-lib.ts';

const frame: ArtAsset = {
  id: 'common-slab',
  kind: 'frame',
  out: 'src/ui/art/common/slab.webp',
  width: 256,
  slice: 32,
  quality: 90,
  budgetKB: 150,
  prompt: 'Template C. A test frame.',
};

const sheet: ArtAsset = {
  id: 'map-markers',
  kind: 'ornament',
  out: 'src/ui/art/map',
  width: 64,
  quality: 90,
  budgetKB: 30,
  prompt: 'Template F. Two test pieces.',
  cells: [2, 1],
  pieces: ['map-marker-known', 'map-marker-rumored'],
  key: '#00FF00',
};

describe('the manifest checks', () => {
  it('passes a sound manifest', () => {
    expect(checkManifest({ assets: [frame, sheet] })).toEqual([]);
  });

  it('finds twice-used ids and outputs, and art outside src/ui/art', () => {
    const m: ArtManifest = {
      assets: [frame, { ...frame }, { ...frame, id: 'common-card', out: 'public/card.webp' }],
    };
    const problems = checkManifest(m).join('\n');
    expect(problems).toMatch(/common-slab: the id is used twice/);
    expect(problems).toMatch(/written by another asset/);
    expect(problems).toMatch(/common-card: art ships under src\/ui\/art/);
  });

  it('holds budgets to their kind and frames to a slice that leaves a band', () => {
    const problems = checkManifest({
      assets: [
        { ...frame, budgetKB: 200 },
        { ...frame, id: 'common-card', out: 'src/ui/art/common/card.webp', slice: 128 },
        { ...frame, id: 'common-bare', out: 'src/ui/art/common/bare.webp', slice: undefined },
      ],
    }).join('\n');
    expect(problems).toMatch(/200 KB is over a frame's 150 KB/);
    expect(problems).toMatch(/common-card: the slice leaves no band/);
    expect(problems).toMatch(/common-bare: a frame names its slice/);
  });

  it('checks a sheet fits its cells', () => {
    const problems = checkManifest({
      assets: [
        { ...sheet, cells: [1, 1] },
        { ...frame, cells: [2, 1], pieces: ['a', 'b'] },
      ],
    }).join('\n');
    expect(problems).toMatch(/2 pieces don't fit 1×1 cells/);
    expect(problems).toMatch(/common-slab: only an ornament or a scene sheet has cells/);
  });

  it('writes a sheet as a file a piece', () => {
    expect(outputsOf(sheet)).toEqual([
      'src/ui/art/map/map-marker-known.webp',
      'src/ui/art/map/map-marker-rumored.webp',
    ]);
    expect(outputsOf(frame)).toEqual(['src/ui/art/common/slab.webp']);
  });

  it('holds each screen under 800 KB, concepts aside', () => {
    const m: ArtManifest = {
      assets: [
        { ...frame, id: 'map-a', out: 'src/ui/art/map/a.webp' },
        { ...frame, id: 'map-b', out: 'src/ui/art/map/b.webp' },
        { ...frame, kind: 'concept', id: 'map-1', out: 'art/concepts/map-1.webp' },
      ],
    };
    const w = (id: string, kb: number) => ({ id, file: id, kb, budgetKB: 150 });
    expect(checkScreens(m, [w('map-a', 500), w('map-1', 900)])).toEqual([]);
    expect(checkScreens(m, [w('map-a', 500), w('map-b', 400)])).toEqual([
      'map: its art is 900 KB, over 800 KB',
    ]);
  });

  it('holds a map region to its own budget, listed once', () => {
    const problems = checkManifest({
      assets: [],
      maps: [
        { region: 'qm-bianhuang', budgetMB: 25 },
        { region: 'qm-bianhuang', budgetMB: 70 },
      ],
    }).join('\n');
    expect(problems).toMatch(/map qm-bianhuang: the region is listed twice/);
    expect(problems).toMatch(/70 MB is over a region's 60 MB/);
  });

  it('keys out a green screen and its spill', () => {
    const px = new Uint8Array([0, 255, 0, 255, 200, 160, 80, 255, 150, 200, 60, 255]);
    keyOut(px, 4, '#00FF00');
    expect(px[3]).toBe(0); // the screen is clear
    expect([...px.slice(4, 8)]).toEqual([200, 160, 80, 255]); // gold untouched
    expect(px[9]).toBe(150); // a green-tinted edge loses its tint
  });
});

describe('npm run art', () => {
  let root = '';
  afterEach(() => rmSync(root, { recursive: true, force: true }));

  const project = async (assets: ArtAsset[], inbox: Record<string, Buffer>) => {
    root = mkdtempSync(join(tmpdir(), 'art-'));
    mkdirSync(join(root, 'art', 'inbox'), { recursive: true });
    writeFileSync(join(root, 'art', 'manifest.json'), JSON.stringify({ assets }));
    for (const [name, png] of Object.entries(inbox))
      writeFileSync(join(root, 'art', 'inbox', name), png);
  };

  /** A plain test frame: a gold border on dark, transparent outside. */
  const testFrame = () =>
    sharp({
      create: { width: 512, height: 512, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } },
    })
      .composite([
        {
          input: Buffer.from(
            '<svg width="512" height="512"><rect x="8" y="8" width="496" height="496" fill="#0a0c10" stroke="#d9b46a" stroke-width="12"/></svg>',
          ),
        },
      ])
      .png()
      .toBuffer();

  /** Noise, which no codec can squeeze. */
  const noise = (side: number) => {
    const raw = Buffer.alloc(side * side * 4);
    let s = 1;
    for (let i = 0; i < raw.length; i++) {
      s = (s * 1103515245 + 12345) >>> 0;
      raw[i] = i % 4 === 3 ? 255 : s >>> 24;
    }
    return sharp(raw, { raw: { width: side, height: side, channels: 4 } })
      .png()
      .toBuffer();
  };

  it('ingests a test frame', async () => {
    await project([frame], { 'common-slab.png': await testFrame() });
    const r = await runArt(root);
    expect(r.errors).toEqual([]);
    expect(r.moved).toEqual(['common-slab.png']);
    expect(existsSync(join(root, 'art', 'source', 'common-slab.png'))).toBe(true);
    expect(existsSync(join(root, 'art', 'inbox', 'common-slab.png'))).toBe(false);
    const out = join(root, 'src/ui/art/common/slab.webp');
    const meta = await sharp(out).metadata();
    expect(meta).toMatchObject({ format: 'webp', width: 256, height: 256, hasAlpha: true });
    expect(r.written[0]!.kb).toBeLessThan(150);
    // A second run rebuilds from source with nothing in the inbox.
    expect((await runArt(root)).errors).toEqual([]);
  }, 20_000);

  it('cuts a sheet into its pieces', async () => {
    const green = await sharp({
      create: {
        width: 512,
        height: 256,
        channels: 4,
        background: { r: 0, g: 255, b: 0, alpha: 1 },
      },
    })
      .png()
      .toBuffer();
    await project([sheet], { 'map-markers.png': green });
    const r = await runArt(root);
    expect(r.errors).toEqual([]);
    expect(r.written.map((w) => w.file)).toEqual(outputsOf(sheet));
    const piece = await sharp(join(root, outputsOf(sheet)[0]!))
      .raw()
      .toBuffer();
    expect(piece[3]).toBe(0); // the green screen keyed out
  }, 20_000);

  it('fails a file over budget', async () => {
    const scene: ArtAsset = {
      id: 'cultivate-scene',
      kind: 'scene',
      out: 'src/ui/art/cultivate/scene.webp',
      width: 512,
      quality: 90,
      budgetKB: 20,
      prompt: 'Template E. Noise.',
    };
    await project([scene], { 'cultivate-scene.png': await noise(512) });
    const r = await runArt(root);
    expect(r.errors.join()).toMatch(/cultivate-scene: .* KB, over its 20 KB/);
  }, 20_000);

  it('checks a map region shipped, under its budget', () => {
    root = mkdtempSync(join(tmpdir(), 'art-'));
    const m: ArtManifest = { assets: [], maps: [{ region: 'qm-test', budgetMB: 0.001 }] };
    expect(checkMaps(root, m).join()).toMatch(/no public\/map\/qm-test\/painting.webp/);
    const dir = join(root, 'public', 'map', 'qm-test', 'chunks', '0-0', 'L0');
    mkdirSync(dir, { recursive: true });
    writeFileSync(join(root, 'public', 'map', 'qm-test', 'painting.webp'), Buffer.alloc(400));
    writeFileSync(join(dir, '0-0.webp'), Buffer.alloc(800));
    expect(checkMaps(root, m).join()).toMatch(/its art is 0.0 MB, over its 0.001 MB/);
    expect(checkMaps(root, { ...m, maps: [{ region: 'qm-test', budgetMB: 1 }] })).toEqual([]);
  });

  it('cuts a place’s door sheet into scenes that keep their shape, and waits on a trickle', async () => {
    const doors: ArtAsset = {
      id: 'place-test-doors-1',
      kind: 'scene',
      out: 'src/ui/art/places/qm-test/doors-1',
      width: 240,
      quality: 84,
      budgetKB: 60,
      prompt: 'A door sheet.',
      cells: [3, 3],
      pieces: ['stall', 'alchemy', 'refiner'],
    };
    const banner: ArtAsset = {
      id: 'place-test-banner',
      kind: 'scene',
      out: 'src/ui/art/places/qm-test/banner.webp',
      width: 960,
      quality: 84,
      budgetKB: 300,
      prompt: 'A banner.',
      trickle: true,
    };
    await project([doors, banner], {
      'place-test-doors-1.png': await noise(768).then((b) =>
        sharp(b).resize(768, 512, { fit: 'fill' }).png().toBuffer(),
      ),
    });
    const r = await runArt(root);
    expect(r.errors).toEqual([]);
    expect(r.waiting).toEqual(['place-test-banner']);
    const meta = await sharp(join(root, 'src/ui/art/places/qm-test/doors-1/stall.webp')).metadata();
    expect(meta.width).toBe(240);
    expect(Math.abs(meta.height! - 160)).toBeLessThanOrEqual(1); // a third of 512, rounded
    expect(screenOf('place-test-doors-1')).toBe('place-test');
    expect(screenOf('place-test-banner')).toBe('place-test');
  }, 20_000);

  it('fails a missing source and a stray inbox file', async () => {
    await project([frame], { 'stray.png': await testFrame() });
    const r = await runArt(root);
    expect(r.errors).toContain('inbox/stray.png names no asset in the manifest');
    expect(r.errors).toContain('common-slab: no source (drop common-slab.png in art/inbox/)');
  }, 20_000);
});
