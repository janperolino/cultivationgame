// Combat effects (design § Combat, "Effects fill the wait"): every outcome carries five tags, and
// the screen layers them into one effect with no model involved. Form sets the shape, the damage
// type the color, the realm the scale (close to the target at Qi Condensation, across the field
// at Foundation, a shaking field at Core Formation, the whole view from Nascent Soul up), and the
// result the flourish: a critical flares, a miss fizzles off to the side, a backfire turns the
// effect back on its maker. Reduced motion swaps each for a still flash on whoever it touched.
// It reads nothing but the tags and where the two fighters stand on screen.
import type { DamageType, OutcomeForm, OutcomeResult } from '../content/combat.ts';
import { realmIndex, type RealmId } from '../content/realms.ts';
import { canvasDensity } from './stage.ts';

/** What one effect needs: the five tags and two points on the canvas. */
export interface FxShot {
  form: OutcomeForm;
  type: DamageType | null;
  realm: RealmId;
  result: OutcomeResult;
  status: string | null;
  from: { x: number; y: number };
  to: { x: number; y: number };
  /** The number to float over the target, if any. */
  damage?: number;
}

/** Colors by damage type, read from the theme's qi tokens where it has one. */
const TYPE_COLOR: Record<DamageType, string> = {
  physical: '--text',
  metal: '--qi-metal',
  wood: '--qi-wood',
  water: '--qi-water',
  fire: '--qi-fire',
  earth: '--qi-earth',
  lightning: '#c9b8ff',
  wind: '#bfe8d6',
  ice: '#d4f1ff',
  soul: '--rarity-purple',
  poison: '#a6d66b',
};

function color(type: DamageType | null, form: OutcomeForm): string {
  const css = getComputedStyle(document.documentElement);
  const read = (v: string) =>
    v.startsWith('--') ? css.getPropertyValue(v).trim() || '#e9e5da' : v;
  if (type) return read(TYPE_COLOR[type]);
  if (form === 'defend') return read('--crack');
  if (form === 'talk') return read('--rarity-purple');
  if (form === 'flee') return read('--muted');
  return read('--accent');
}

const ease = (p: number) => 1 - (1 - p) ** 3;
const lerp = (a: number, b: number, p: number) => a + (b - a) * p;

/** How long one effect plays, in ms, and the gap before the next starts. */
export const FX_MS = 720;
export const FX_GAP = 420;

interface Running {
  shot: FxShot;
  start: number;
  color: string;
  /** 0 at Qi Condensation, 1 at Foundation, 2 at Core Formation, 3 from Nascent Soul up. */
  scale: number;
  reduced: boolean;
}

/**
 * Draws effects on a canvas laid over the arena. `play` queues shots one after another; the
 * arena element gets `is-shaking` while a Core Formation effect lands and `is-flooded` for the
 * whole-view flash from Nascent Soul up.
 */
export class FxLayer {
  private running: Running[] = [];
  private frame = 0;
  private readonly ctx: CanvasRenderingContext2D;

  constructor(
    private readonly canvas: HTMLCanvasElement,
    private readonly arena: HTMLElement,
  ) {
    this.ctx = canvas.getContext('2d')!;
  }

  play(shots: readonly FxShot[], reduced: boolean): void {
    const now = performance.now();
    const last = this.running.reduce((t, r) => Math.max(t, r.start), now - FX_GAP);
    shots.forEach((shot, i) => {
      this.running.push({
        shot,
        start: Math.max(now, last + FX_GAP) + i * FX_GAP,
        color: color(shot.type, shot.form),
        scale: Math.min(3, realmIndex(shot.realm)),
        reduced,
      });
    });
    if (!this.frame) this.frame = requestAnimationFrame(this.tick);
  }

  dispose(): void {
    cancelAnimationFrame(this.frame);
    this.frame = 0;
    this.running = [];
  }

  private tick = (now: number) => {
    const { canvas, ctx } = this;
    const dpr = canvasDensity(3);
    const w = canvas.clientWidth;
    const h = canvas.clientHeight;
    if (canvas.width !== Math.round(w * dpr) || canvas.height !== Math.round(h * dpr)) {
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
    }
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, w, h);
    let shaking = false;
    let flooded = false;
    this.running = this.running.filter((r) => now < r.start + FX_MS + 500);
    for (const r of this.running) {
      const p = (now - r.start) / FX_MS;
      if (p < 0) continue;
      const hitting = p > 0.55 && p < 0.9 && r.shot.result !== 'miss';
      if (!r.reduced && hitting && r.scale >= 2) shaking = true;
      if (!r.reduced && hitting && r.scale >= 3) flooded = true;
      ctx.save();
      if (r.reduced) this.still(r, p);
      else this.draw(r, Math.min(1, p), w, h);
      ctx.restore();
      if (r.shot.damage !== undefined && p > 0.55) this.number(r, p);
    }
    this.arena.classList.toggle('is-shaking', shaking);
    this.arena.classList.toggle('is-flooded', flooded);
    this.frame = this.running.length ? requestAnimationFrame(this.tick) : 0;
    if (!this.frame) ctx.clearRect(0, 0, w, h);
  };

  /** Reduced motion: a still flash on whoever the action touched, fading, nothing moving. */
  private still(r: Running, p: number): void {
    const { ctx } = this;
    const at = r.shot.result === 'backfire' ? r.shot.from : r.shot.to;
    const alpha = p < 0.15 ? p / 0.15 : Math.max(0, 1 - (p - 0.15) / 0.85);
    const big = r.shot.result === 'critical' ? 1.5 : 1;
    ctx.globalAlpha = 0.55 * alpha;
    ctx.fillStyle = r.color;
    ctx.beginPath();
    ctx.arc(at.x, at.y, 46 * big, 0, Math.PI * 2);
    ctx.fill();
    if (r.shot.result === 'miss') {
      ctx.globalAlpha = 0.8 * alpha;
      ctx.strokeStyle = r.color;
      ctx.setLineDash([4, 5]);
      ctx.lineWidth = 2;
      ctx.stroke();
    }
  }

  private glow(x: number, y: number, radius: number, c: string, alpha: number): void {
    const { ctx } = this;
    const g = ctx.createRadialGradient(x, y, 0, x, y, radius);
    g.addColorStop(0, c);
    g.addColorStop(1, 'transparent');
    ctx.globalAlpha = Math.max(0, Math.min(1, alpha));
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, Math.PI * 2);
    ctx.fill();
  }

  /** The shot's path: where it starts and where it lands, by realm and result. */
  private path(r: Running, w: number, h: number) {
    const s = r.shot;
    let from = s.from;
    let to = s.to;
    // A backfire turns the effect on its maker.
    if (s.result === 'backfire') to = s.from;
    // Qi Condensation strikes close: the effect starts most of the way to the target.
    if (r.scale === 0 && s.result !== 'backfire') {
      from = { x: lerp(s.from.x, to.x, 0.55), y: lerp(s.from.y, to.y, 0.55) };
    }
    // A miss fizzles past the target, off to the side.
    if (s.result === 'miss') {
      const dx = to.x - from.x;
      const dy = to.y - from.y;
      to = { x: to.x + dx * 0.25 - dy * 0.35, y: to.y + dy * 0.25 + dx * 0.35 - 30 };
    }
    // From Nascent Soul up the effect fills the view.
    const reach = r.scale >= 3 ? Math.hypot(w, h) * 0.5 : r.scale >= 1 ? 70 : 40;
    return { from, to, reach };
  }

  private draw(r: Running, p: number, w: number, h: number): void {
    const { ctx } = this;
    const s = r.shot;
    const { from, to, reach } = this.path(r, w, h);
    const crit = s.result === 'critical';
    const fade = s.result === 'miss' ? 1 - ease(p) : 1;
    const size = (crit ? 1.45 : 1) * (1 + 0.35 * r.scale);
    const c = r.color;
    const travel = ease(Math.min(1, p / 0.6));
    const x = lerp(from.x, to.x, travel);
    const y = lerp(from.y, to.y, travel);
    const land = Math.max(0, (p - 0.55) / 0.45);
    ctx.lineCap = 'round';
    ctx.strokeStyle = c;

    switch (s.form) {
      case 'slash':
      case 'tail': {
        // A sweeping arc across the target.
        const a0 = -Math.PI * 0.9;
        const span = Math.PI * (s.form === 'tail' ? 1.3 : 0.9) * ease(Math.min(1, p / 0.7));
        ctx.globalAlpha = 0.9 * fade * (1 - land * 0.8);
        ctx.lineWidth = 5 * size;
        ctx.beginPath();
        ctx.arc(to.x, to.y, 30 * size, a0, a0 + span);
        ctx.stroke();
        break;
      }
      case 'thrust':
      case 'charge': {
        // A streak from the maker to the target.
        const tail = Math.max(0, travel - (s.form === 'charge' ? 0.5 : 0.25));
        ctx.globalAlpha = 0.9 * fade;
        ctx.lineWidth = (s.form === 'charge' ? 9 : 3.5) * size;
        ctx.beginPath();
        ctx.moveTo(lerp(from.x, to.x, tail), lerp(from.y, to.y, tail));
        ctx.lineTo(x, y);
        ctx.stroke();
        break;
      }
      case 'palm':
      case 'bite': {
        // A burst where it lands: a ring, or two closing jaws.
        this.glow(x, y, 14 * size, c, 0.8 * fade);
        if (land > 0) {
          ctx.globalAlpha = (1 - land) * fade;
          ctx.lineWidth = 3 * size;
          ctx.beginPath();
          if (s.form === 'bite') {
            ctx.arc(to.x, to.y - 6 * (1 - land), 22 * size, Math.PI * 0.15, Math.PI * 0.85);
            ctx.moveTo(to.x + 22 * size, to.y + 6 * (1 - land));
            ctx.arc(to.x, to.y + 6 * (1 - land), 22 * size, Math.PI * 1.15, Math.PI * 1.85);
          } else ctx.arc(to.x, to.y, (12 + 40 * land) * size, 0, Math.PI * 2);
          ctx.stroke();
        }
        break;
      }
      case 'claw': {
        ctx.globalAlpha = 0.9 * fade * (1 - land * 0.6);
        ctx.lineWidth = 2.5 * size;
        for (let k = -1; k <= 1; k++) {
          const off = k * 10 * size;
          ctx.beginPath();
          ctx.moveTo(to.x - 22 * size + off, to.y - 24 * size);
          ctx.lineTo(
            lerp(to.x - 22 * size, to.x + 18 * size, travel) + off,
            lerp(to.y - 24 * size, to.y + 22 * size, travel),
          );
          ctx.stroke();
        }
        break;
      }
      case 'projectile': {
        // A ball with a trail.
        for (let k = 0; k < 6; k++) {
          const q = Math.max(0, travel - k * 0.05);
          this.glow(
            lerp(from.x, to.x, q),
            lerp(from.y, to.y, q),
            (10 - k) * size,
            c,
            (0.7 - k * 0.1) * fade,
          );
        }
        if (land > 0) this.glow(to.x, to.y, (20 + 50 * land) * size, c, (1 - land) * 0.8 * fade);
        break;
      }
      case 'aura':
      case 'breath': {
        // Waves out from the maker toward the target.
        for (let k = 0; k < 3; k++) {
          const q = Math.max(0, p - k * 0.12);
          const rad = q * Math.hypot(to.x - from.x, to.y - from.y);
          ctx.globalAlpha = (1 - q) * 0.7 * fade;
          ctx.lineWidth = 2.5 * size;
          ctx.beginPath();
          if (s.form === 'breath') {
            const dir = Math.atan2(to.y - from.y, to.x - from.x);
            ctx.arc(from.x, from.y, rad, dir - 0.35, dir + 0.35);
          } else ctx.arc(from.x, from.y, rad, 0, Math.PI * 2);
          ctx.stroke();
        }
        break;
      }
      case 'defend': {
        ctx.globalAlpha = 0.8 * (1 - p * 0.6);
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(from.x, from.y, 34 + 6 * Math.sin(p * Math.PI), Math.PI * 1.1, Math.PI * 1.9);
        ctx.stroke();
        this.glow(from.x, from.y, 40, c, 0.25 * (1 - p));
        break;
      }
      case 'flee': {
        ctx.globalAlpha = 0.7 * (1 - p);
        ctx.lineWidth = 2;
        for (let k = 0; k < 3; k++) {
          ctx.beginPath();
          ctx.moveTo(from.x - 10 - 60 * p, from.y - 14 + k * 14);
          ctx.lineTo(from.x - 10, from.y - 14 + k * 14);
          ctx.stroke();
        }
        break;
      }
      case 'talk': {
        for (let k = 0; k < 2; k++) {
          const q = Math.max(0, p - k * 0.2);
          ctx.globalAlpha = (1 - q) * 0.6;
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.arc(
            lerp(from.x, to.x, q * 0.8),
            lerp(from.y, to.y, q * 0.8),
            10 + 14 * q,
            0,
            Math.PI * 2,
          );
          ctx.stroke();
        }
        break;
      }
      case 'item':
      case 'command': {
        this.glow(from.x, from.y - 20 * p, 18, c, 0.8 * (1 - p));
        break;
      }
    }

    // A critical flares where it lands, with the color's sparks.
    if (crit && land > 0) {
      this.glow(to.x, to.y, (34 + 40 * land) * size, '#ffffff', 0.7 * (1 - land));
      ctx.globalAlpha = 1 - land;
      ctx.fillStyle = c;
      for (let k = 0; k < 10; k++) {
        const a = (k / 10) * Math.PI * 2;
        const d = (16 + 56 * land) * size;
        ctx.fillRect(to.x + Math.cos(a) * d - 1.5, to.y + Math.sin(a) * d - 1.5, 3, 3);
      }
    }
    if (r.scale >= 3 && land > 0 && s.result !== 'miss')
      this.glow(to.x, to.y, reach, c, 0.25 * (1 - land));
  }

  /** The damage number rising over whoever took it. */
  private number(r: Running, p: number): void {
    const { ctx } = this;
    const at = r.shot.result === 'backfire' ? r.shot.from : r.shot.to;
    const q = Math.min(1, (p - 0.55) / 0.9);
    ctx.globalAlpha = Math.max(0, 1 - q);
    ctx.fillStyle = r.shot.result === 'critical' ? '#ffffff' : r.color;
    ctx.font = `600 ${r.shot.result === 'critical' ? 22 : 16}px Inter, system-ui, sans-serif`;
    ctx.textAlign = 'center';
    ctx.fillText(String(r.shot.damage), at.x, at.y - 34 - (r.reduced ? 0 : 26 * q));
  }
}
