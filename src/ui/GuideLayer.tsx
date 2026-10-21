// The guide standing now, drawn over the stage (design § UI and screens, Introductions; core/
// guides.ts): a gilt ring round its control and the narrator's line or two beside it, with "I know
// this". A veil dims the rest of the stage, still and unblurred for the paint cost, and nothing
// under it answers but the lit control; a ghost hand shows a pointer motion once. The control is
// found by its `data-guide` attribute and measured a few times a second, so the ring follows it.
import { useEffect, useState, type CSSProperties } from 'react';
import { CODEX_SLOTS, fillSlots } from '../content/codex/index.ts';
import { PLAYED_BEFORE, I_KNOW_THIS } from '../content/guides.ts';
import { finishAllGuides, finishGuide, guideNow, GUIDES, type Guide } from '../core/guides.ts';
import { knownMethods } from '../core/methods.ts';
import { knownTechniques } from '../core/techniques.ts';
import { ownedCopies, knowsCopy } from '../core/reading.ts';
import { copyManual, hasCopy } from '../content/copies.ts';
import type { GameState } from '../core/state.ts';
import { endReplay, lookAt, useGuideCtx } from './guide.ts';
import { useSeat } from './seat.ts';
import { reducedMotion, useSettings } from './settings.ts';
import { useGame } from './store.ts';

interface Box {
  x: number;
  y: number;
  w: number;
  h: number;
  /** The stage's size, to keep the narrator's box on it. */
  sw: number;
  sh: number;
}

const MEASURE_MS = 200;
const PAD = 8;
const CALLOUT_W = 420;
/** The height the narrator's box needs beside its control. */
const CALLOUT_ROOM = 150;

/** The target's box in stage pixels, or null when it isn't on the stage. */
function measure(control: string): Box | null {
  const stage = document.querySelector('.stage');
  const el = document.querySelector(`.stage [data-guide="${control}"]`);
  if (!stage || !el) return null;
  const sr = stage.getBoundingClientRect();
  const r = el.getBoundingClientRect();
  if (r.width === 0 && r.height === 0) return null;
  const k = sr.height / 1080 || 1;
  return {
    x: (r.left - sr.left) / k - PAD,
    y: (r.top - sr.top) / k - PAD,
    w: r.width / k + 2 * PAD,
    h: r.height / k + 2 * PAD,
    sw: sr.width / k,
    sh: 1080,
  };
}

const same = (a: Box | null, b: Box | null) =>
  a === b ||
  (!!a &&
    !!b &&
    Math.abs(a.x - b.x) < 1 &&
    Math.abs(a.y - b.y) < 1 &&
    Math.abs(a.w - b.w) < 1 &&
    Math.abs(a.h - b.h) < 1);

/** The guide's lines with its names and live numbers filled in. */
function linesOf(g: Guide, s: GameState): string[] {
  const p = s.player;
  const copy = ownedCopies(p).find((id) => !knowsCopy(p, id));
  const words: Record<string, string> = {
    method: knownMethods(p, 'qi')[0]?.name ?? 'method',
    technique: knownTechniques(p)[0]?.name ?? 'your technique',
    copy: copy && hasCopy(copy) ? copyManual(copy).name : 'copy',
  };
  return g.lines.map((l) => fillSlots(l, { ...CODEX_SLOTS, ...words }));
}

export function GuideLayer() {
  const game = useGame((s) => s.game);
  const applyLife = useGame((s) => s.applyLife);
  const ctx = useGuideCtx();
  const orb = useSeat((s) => (s.attention?.orbs.length ?? 0) > 0);
  const reduced = useSettings((s) => reducedMotion(s));
  useEffect(() => lookAt({ orb }), [orb]);
  // A guide replayed from Settings shows as a ring, closed by Got it, held or recorded nowhere.
  const replaying: Guide | null = ctx.replay
    ? { ...GUIDES[ctx.replay], form: 'ring', ack: true }
    : null;
  const guide = replaying ?? (game ? guideNow(game, ctx) : null);
  const control = guide?.control ?? null;
  const [box, setBox] = useState<Box | null>(null);
  useEffect(() => {
    if (!control) return;
    const tick = () => {
      const next = measure(control);
      setBox((was) => (same(was, next) ? was : next));
    };
    const first = requestAnimationFrame(tick);
    const t = setInterval(tick, MEASURE_MS);
    return () => {
      cancelAnimationFrame(first);
      clearInterval(t);
      setBox(null);
    };
  }, [control]);
  if (!game || !guide) return null;
  const skip = () => (replaying ? endReplay() : applyLife((s) => finishGuide(s, guide.id)));
  if (!box) {
    // A replayed guide whose control isn't on screen now still says its lines.
    if (!replaying) return null;
    return (
      <div className="guide-layer" aria-live="polite">
        <section className="guide-callout is-centred" aria-label="Guide">
          {linesOf(guide, game).map((l) => (
            <p key={l}>{l}</p>
          ))}
          <div className="guide-actions">
            <button type="button" className="button" onClick={skip}>
              Got it
            </button>
          </div>
        </section>
      </div>
    );
  }

  const skipAll = () => applyLife(finishAllGuides);
  const veil = guide.form === 'veil';
  // The narrator's box sits under a control in the stage's top half, over one in its lower half,
  // kept on the stage.
  // A control that fills the stage (the map) has it inside its top edge.
  const roomBelow = box.sh - (box.y + box.h) >= CALLOUT_ROOM;
  const roomAbove = box.y >= CALLOUT_ROOM;
  const below = roomBelow && (box.y + box.h / 2 < box.sh / 2 || !roomAbove);
  const left = Math.min(Math.max(16, box.x + box.w / 2 - CALLOUT_W / 2), box.sw - CALLOUT_W - 16);
  const calloutStyle: CSSProperties = below
    ? { left, top: box.y + box.h + 12, width: CALLOUT_W }
    : roomAbove
      ? { left, bottom: box.sh - box.y + 12, width: CALLOUT_W }
      : { left, top: Math.max(16, box.y) + 16, width: CALLOUT_W };
  const ring: CSSProperties = { left: box.x, top: box.y, width: box.w, height: box.h };
  return (
    <div className={`guide-layer${veil ? ' is-veil' : ''}`} aria-live="polite">
      {veil && (
        <>
          {/* The veil in four pieces round the lit control, so only it answers. */}
          <div className="guide-veil" style={{ left: 0, top: 0, right: 0, height: box.y }} />
          <div
            className="guide-veil"
            style={{ left: 0, top: box.y + box.h, right: 0, bottom: 0 }}
          />
          <div
            className="guide-veil"
            style={{ left: 0, top: box.y, width: box.x, height: box.h }}
          />
          <div
            className="guide-veil"
            style={{ left: box.x + box.w, top: box.y, right: 0, height: box.h }}
          />
        </>
      )}
      <div className="guide-ring" style={ring} />
      {guide.hand && !reduced && (
        <div
          className={`guide-hand is-${guide.hand}`}
          style={{ left: box.x + box.w / 2, top: box.y + box.h / 2 } as CSSProperties}
          aria-hidden="true"
        />
      )}
      <section className="guide-callout" style={calloutStyle} aria-label="Guide">
        {linesOf(guide, game).map((l) => (
          <p key={l}>{l}</p>
        ))}
        <div className="guide-actions">
          {guide.ack && (
            <button type="button" className="button" onClick={skip}>
              Got it
            </button>
          )}
          {!guide.ack && (
            <button type="button" className="link-button" onClick={skip}>
              {I_KNOW_THIS}
            </button>
          )}
          {guide.id === 'take-up' && !replaying && (
            <button type="button" className="link-button" onClick={skipAll}>
              {PLAYED_BEFORE}
            </button>
          )}
        </div>
      </section>
    </div>
  );
}
