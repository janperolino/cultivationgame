// The sound engine (S1): Web Audio under four volumes, master over music, ambience and effects.
// Effects are small buffers decoded when their group is first wanted; ambience loops are decoded
// when first played, so they loop without a gap, and let go once faded out a while; music streams
// from an audio element, so a track never waits to load whole. Only what `npm run sound` shipped
// (shipped.json) is ever fetched: a cue with no file is silent and asks for nothing.
import { mulberry32 } from '../../core/rng.ts';
import { breakMs, nextTrack, type Layer as AmbienceLayer } from './scape.ts';
import shippedJson from './shipped.json';
import { cueInfo, MUSIC_SETS, type EffectGroup, type MusicSet } from './table.ts';

export interface Shipped {
  id: string;
  kind: 'effect' | 'loop' | 'ambience' | 'music';
  file: string;
  credit: string;
}

export const SHIPPED: readonly Shipped[] = (shippedJson as { sounds: Shipped[] }).sounds;

/** How long a screen change crossfades music and ambience. */
export const FADE_S = 2;

export interface Volumes {
  master: number;
  music: number;
  ambience: number;
  effects: number;
  /** Silent: the window isn't focused and the player asked for quiet then. */
  muted: boolean;
}

export interface EffectOptions {
  rate?: number;
  gain?: number;
  /** A low shelf's boost in dB, for a blow from a higher realm. */
  low?: number;
  delay?: number;
}

/** A slider's 0 to 100 as a gain: squared, so the low end of the slider is usable. */
export const gainOf = (v: number) => (Math.max(0, Math.min(100, v)) / 100) ** 2;

interface Deck {
  el: HTMLAudioElement;
  gain: GainNode;
}

/** A loop held on the effects (S1.1): qi's hum, the breakthrough's charge. */
interface Hold {
  source: AudioBufferSourceNode | null;
  gain: GainNode;
  /** Wanted: still held, so a buffer that decodes late starts. */
  on: boolean;
}

interface Loop {
  source: AudioBufferSourceNode | null;
  gain: GainNode;
  level: number;
  /** When it last fell silent, so its buffer can be let go. */
  quietSince: number | null;
}

const url = (file: string) => `${import.meta.env.BASE_URL}sound/${file}`;

export class SoundEngine {
  private ctx: AudioContext | null = null;
  private master!: GainNode;
  private effects!: GainNode;
  private ambience!: GainNode;
  private music!: GainNode;
  private duck!: GainNode;
  private readonly files = new Map(SHIPPED.map((s) => [s.id, s]));
  private readonly buffers = new Map<string, Promise<AudioBuffer | null>>();
  private readonly lastPlayed = new Map<string, number>();
  private volumes: Volumes = { master: 80, music: 60, ambience: 50, effects: 80, muted: false };
  private readonly loops = new Map<string, Loop>();
  private readonly holds = new Map<string, Hold>();
  private wantAmbience: AmbienceLayer[] = [];
  private set: MusicSet | null = null;
  private wantDuck = 1;
  private deck: Deck | null = null;
  private track: string | null = null;
  private breakTimer = 0;
  private stinging = false;
  private readonly roll = mulberry32(Date.now() >>> 0);

  /** Whether a sound has a file. */
  has(id: string): boolean {
    return this.files.has(id);
  }

  /** Makes the graph; browsers start it suspended until the player first clicks or types. */
  private audio(): AudioContext | null {
    if (this.ctx) return this.ctx;
    try {
      const ctx = new AudioContext();
      this.ctx = ctx;
      this.master = ctx.createGain();
      this.master.connect(ctx.destination);
      this.effects = ctx.createGain();
      this.ambience = ctx.createGain();
      this.music = ctx.createGain();
      this.duck = ctx.createGain();
      this.effects.connect(this.master);
      this.ambience.connect(this.master);
      this.duck.connect(this.music);
      this.music.connect(this.master);
      this.applyVolumes(0);
      return ctx;
    } catch {
      return null;
    }
  }

  /** On the first click or key: the context runs, and what was wanted starts. */
  unlock(): void {
    const ctx = this.audio();
    if (!ctx) return;
    if (ctx.state === 'suspended') void ctx.resume();
    this.applyAmbience();
    if (this.set && !this.deck && !this.breakTimer) this.startTrack();
    void this.preload('ui');
  }

  get running(): boolean {
    return this.ctx?.state === 'running';
  }

  setVolumes(v: Volumes): void {
    this.volumes = v;
    this.applyVolumes(0.3);
  }

  private applyVolumes(over: number): void {
    if (!this.ctx) return;
    const v = this.volumes;
    this.ramp(this.master.gain, v.muted ? 0 : gainOf(v.master), over);
    this.ramp(this.music.gain, gainOf(v.music), over);
    this.ramp(this.ambience.gain, gainOf(v.ambience), over);
    this.ramp(this.effects.gain, gainOf(v.effects), over);
    this.ramp(this.duck.gain, this.stinging ? 0.15 : this.wantDuck, over);
  }

  private ramp(p: AudioParam, to: number, over: number): void {
    const now = this.ctx!.currentTime;
    p.cancelScheduledValues(now);
    p.setValueAtTime(p.value, now);
    if (over <= 0) p.setValueAtTime(to, now);
    else p.linearRampToValueAtTime(to, now + over);
  }

  private load(id: string): Promise<AudioBuffer | null> {
    const f = this.files.get(id);
    const ctx = this.audio();
    if (!f || !ctx) return Promise.resolve(null);
    let p = this.buffers.get(id);
    if (!p) {
      p = fetch(url(f.file))
        .then((r) => (r.ok ? r.arrayBuffer() : Promise.reject(new Error(r.statusText))))
        .then((b) => ctx.decodeAudioData(b))
        .catch(() => null);
      this.buffers.set(id, p);
    }
    return p;
  }

  /** Decodes a group's effects ahead of need: the UI's at the start, crafts' and combat's later. */
  async preload(group: EffectGroup): Promise<void> {
    if (!this.ctx) return;
    const ids = SHIPPED.filter(
      (s) => (s.kind === 'effect' || s.kind === 'loop') && (cueInfo(s.id)?.group ?? 'ui') === group,
    );
    await Promise.all(ids.map((s) => this.load(s.id)));
  }

  /** Plays an effect; the same one twice within 40 ms plays once, so a burst doesn't stack. */
  effect(id: string, o: EffectOptions = {}): void {
    const ctx = this.ctx;
    if (!ctx || ctx.state !== 'running' || !this.files.has(id)) return;
    const now = performance.now();
    if (now - (this.lastPlayed.get(id) ?? -1e9) < 40 && !o.delay) return;
    this.lastPlayed.set(id, now);
    void this.load(id).then((buffer) => {
      if (!buffer) return;
      const src = ctx.createBufferSource();
      src.buffer = buffer;
      src.playbackRate.value = o.rate ?? 1;
      const gain = ctx.createGain();
      gain.gain.value = o.gain ?? 1;
      let head: AudioNode = gain;
      if (o.low) {
        const shelf = ctx.createBiquadFilter();
        shelf.type = 'lowshelf';
        shelf.frequency.value = 220;
        shelf.gain.value = o.low;
        shelf.connect(gain);
        head = shelf;
      }
      src.connect(head);
      gain.connect(this.effects);
      src.start(ctx.currentTime + (o.delay ?? 0) / 1000);
    });
  }

  // ---------------------------------------------------------------- held loops

  /**
   * Holds a loop on the effects at a level and a rate, ramping there over `over` seconds; the
   * first call starts it, later ones move it (a charge rising, a hum swelling as the bar fills).
   */
  hold(id: string, level: number, rate = 1, over = 0.4): void {
    const ctx = this.ctx;
    if (!ctx || ctx.state !== 'running' || !this.files.has(id)) return;
    let h = this.holds.get(id);
    if (!h) {
      const gain = ctx.createGain();
      gain.gain.value = 0;
      gain.connect(this.effects);
      h = { source: null, gain, on: true };
      this.holds.set(id, h);
      const held = h;
      void this.load(id).then((buffer) => {
        if (!buffer || !held.on || held.source || !this.ctx) return;
        const src = this.ctx.createBufferSource();
        src.buffer = buffer;
        src.loop = true;
        src.playbackRate.value = rate;
        src.connect(held.gain);
        src.start();
        held.source = src;
      });
    }
    h.on = true;
    this.ramp(h.gain.gain, level, over);
    if (h.source) this.ramp(h.source.playbackRate, rate, over);
  }

  /** Lets a held loop go, fading over `over` seconds. */
  release(id: string, over = 0.6): void {
    const h = this.holds.get(id);
    if (!h || !this.ctx) return;
    this.holds.delete(id);
    h.on = false;
    this.ramp(h.gain.gain, 0, over);
    window.setTimeout(
      () => {
        h.source?.stop();
        h.gain.disconnect();
      },
      over * 1000 + 100,
    );
  }

  // ---------------------------------------------------------------- ambience

  /** The loops wanted and how loud; what isn't named fades out over the crossfade. */
  setAmbience(layers: readonly AmbienceLayer[]): void {
    this.wantAmbience = layers.filter((l) => this.files.has(l.id));
    this.applyAmbience();
  }

  private applyAmbience(): void {
    const ctx = this.ctx;
    if (!ctx) return;
    const want = new Map<string, number>(this.wantAmbience.map((l) => [l.id, l.level]));
    for (const [id, loop] of this.loops) {
      if (want.has(id)) continue;
      if (loop.level > 0) {
        loop.level = 0;
        loop.quietSince = performance.now();
        this.ramp(loop.gain.gain, 0, FADE_S);
        const src = loop.source;
        loop.source = null;
        if (src) window.setTimeout(() => src.stop(), FADE_S * 1000 + 100);
      }
    }
    for (const [id, level] of want) {
      let loop = this.loops.get(id);
      if (!loop) {
        const gain = ctx.createGain();
        gain.gain.value = 0;
        gain.connect(this.ambience);
        loop = { source: null, gain, level: 0, quietSince: null };
        this.loops.set(id, loop);
      }
      const l = loop;
      l.level = level;
      l.quietSince = null;
      if (!l.source) {
        void this.load(id).then((buffer) => {
          if (!buffer || l.source || l.level === 0 || !this.ctx) return;
          const src = this.ctx.createBufferSource();
          src.buffer = buffer;
          src.loop = true;
          src.connect(l.gain);
          // Start somewhere inside the loop, so coming back doesn't always open the same way.
          src.start(0, this.roll() * buffer.duration);
          l.source = src;
          this.ramp(l.gain.gain, l.level, FADE_S);
        });
      } else this.ramp(l.gain.gain, level, FADE_S);
    }
    this.forgetQuiet();
  }

  /** A loop silent a minute lets its decoded buffer go; it decodes again when next wanted. */
  private forgetQuiet(): void {
    const now = performance.now();
    for (const [id, loop] of this.loops) {
      if (loop.quietSince !== null && now - loop.quietSince > 60_000) {
        this.buffers.delete(id);
        loop.gain.disconnect();
        this.loops.delete(id);
      }
    }
  }

  // ---------------------------------------------------------------- music

  /**
   * The set of tracks to rotate through, and what share of its volume the music plays at. A new
   * set crossfades to its first track at once; the same set carries on, breaks and all.
   */
  setMusic(set: MusicSet | null, duck: number): void {
    if (duck !== this.wantDuck) {
      this.wantDuck = duck;
      if (this.ctx) this.ramp(this.duck.gain, this.stinging ? 0.15 : duck, 0.6);
    }
    // A set with no tracks shipped yet (a fight's, before its file) keeps what plays.
    if (set === this.set || (set && this.tracksOf(set).length === 0)) return;
    this.set = set;
    window.clearTimeout(this.breakTimer);
    this.breakTimer = 0;
    this.fadeOut();
    if (set && this.running) this.startTrack();
  }

  private tracksOf(set: MusicSet): string[] {
    return MUSIC_SETS[set].filter((id) => this.files.has(id));
  }

  private tracks(): string[] {
    return this.set ? this.tracksOf(this.set) : [];
  }

  private startTrack(): void {
    const ctx = this.ctx;
    const id = nextTrack(this.tracks(), this.track, this.roll());
    if (!ctx || !id) return;
    this.track = id;
    const el = new Audio(url(this.files.get(id)!.file));
    el.preload = 'auto';
    const gain = ctx.createGain();
    gain.gain.value = 0;
    ctx.createMediaElementSource(el).connect(gain);
    gain.connect(this.duck);
    const deck = { el, gain };
    this.deck = deck;
    el.addEventListener('ended', () => {
      if (this.deck !== deck) return;
      this.drop(deck);
      this.deck = null;
      // A break of ambience alone before the next track.
      this.breakTimer = window.setTimeout(() => {
        this.breakTimer = 0;
        if (this.set) this.startTrack();
      }, breakMs(this.roll()));
    });
    void el.play().then(
      () => this.ramp(gain.gain, 1, FADE_S),
      () => {
        // Blocked before the first click: unlock starts it again.
        this.drop(deck);
        if (this.deck === deck) this.deck = null;
      },
    );
  }

  private fadeOut(): void {
    const deck = this.deck;
    this.deck = null;
    if (!deck || !this.ctx) return;
    this.ramp(deck.gain.gain, 0, FADE_S);
    window.setTimeout(() => this.drop(deck), FADE_S * 1000 + 100);
  }

  private drop(deck: Deck): void {
    deck.el.pause();
    deck.el.removeAttribute('src');
    deck.el.load();
    deck.gain.disconnect();
  }

  /** What plays now, for the dev console's `sound`. */
  describe(): string[] {
    const loops = [...this.loops]
      .filter(([, l]) => l.level > 0)
      .map(([id, l]) => `${id} ${l.level.toFixed(2)}${l.source ? '' : ' (loading)'}`);
    const el = this.deck?.el;
    return [
      `Audio ${this.ctx?.state ?? 'not started'}; ${this.files.size} sounds shipped.`,
      `Music: ${this.set ?? 'none'}, ${this.track && el ? `${this.track} at ${el.currentTime.toFixed(0)} s of ${el.duration.toFixed(0)}` : this.breakTimer ? 'in a break' : 'silent'}, duck ${this.wantDuck}.`,
      `Ambience: ${loops.join(', ') || 'none'}.`,
      `Held: ${[...this.holds].map(([id, h]) => `${id} ${h.gain.gain.value.toFixed(2)}`).join(', ') || 'none'}.`,
    ];
  }

  /** The breakthrough's sting, over the music ducked low. */
  sting(): void {
    const ctx = this.ctx;
    const f = this.files.get('music-sting');
    if (!ctx || !f || !this.running) return;
    const el = new Audio(url(f.file));
    const gain = ctx.createGain();
    ctx.createMediaElementSource(el).connect(gain);
    gain.connect(this.music);
    this.stinging = true;
    this.ramp(this.duck.gain, 0.15, 0.3);
    const done = () => {
      this.stinging = false;
      this.ramp(this.duck.gain, this.wantDuck, FADE_S);
      gain.disconnect();
    };
    el.addEventListener('ended', done);
    void el.play().catch(done);
  }
}
