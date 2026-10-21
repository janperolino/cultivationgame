// The sound layer (S1, docs/art-pipeline.md § Sound): it hears what the game already reports and
// plays the cue table's sounds. The cues (ui/cues.ts) play effects, combat plays each outcome's
// layers as its effect lands, and the soundscape follows the screen, the place, the hour, the
// weather and the road. The volumes are the settings'; core never hears a sound.
import { placeKindOf } from '../../core/map/gate.ts';
import { placeById } from '../../core/map/region.ts';
import { mapOf } from '../../core/map/travel.ts';
import type { GameState } from '../../core/state.ts';
import { weatherOn } from '../../core/weather.ts';
import { hourOfDay } from '../../core/wheel.ts';
import { setCuePlayer } from '../cues.ts';
import { useFight } from '../fight.ts';
import { useNav } from '../nav.ts';
import { useSettings, type Settings } from '../settings.ts';
import { useSquare } from '../square.ts';
import { useGame } from '../store.ts';
import { useToasts } from '../toasts.ts';
import { shotLayers, type ShotTags } from './combat.ts';
import { SoundEngine } from './engine.ts';
import { isNight, scapeOf, type Base, type Where } from './scape.ts';
import { cueInfo, type EffectId } from './table.ts';

let engine: SoundEngine | null = null;

/** When the last effect that wasn't minor played, so a click under a buy stays quiet. */
let lastMajor = -1e9;
let pendingClick = 0;

function play(id: EffectId): void {
  if (!engine) return;
  const minor = cueInfo(id)?.minor ?? false;
  const now = performance.now();
  if (minor && now - lastMajor < 150) return;
  if (!minor) {
    lastMajor = now;
    window.clearTimeout(pendingClick);
    pendingClick = 0;
  }
  engine.effect(id);
  if (id === 'feel-fanfare') engine.sting();
}

/** The dev console's `sound`: what plays now, or a cue played by hand. */
export function soundConsole(id?: string): string[] {
  if (!engine) return ['The sound layer has not started.'];
  if (id) {
    const info = cueInfo(id);
    if (info?.kind !== 'effect') return [`No effect ${id}.`];
    play(id as EffectId);
    return [engine.has(id) ? `Played ${id}.` : `${id} has no file yet.`];
  }
  return engine.describe();
}

/** One outcome of a fight, as its effect lands. */
export function playShot(t: ShotTags): void {
  if (!engine) return;
  lastMajor = performance.now();
  for (const l of shotLayers(t)) engine.effect(l.id, l);
}

const volumesOf = (s: Settings, focused: boolean) => ({
  master: s.master,
  music: s.music,
  ambience: s.ambience,
  effects: s.effects,
  muted: s.muteUnfocused && !focused,
});

/** Where the soundscape stands now, from the stores. */
function whereNow(): Where {
  const { game, phase, creating } = useGame.getState();
  const f = useFight.getState();
  const fighting = !!game?.fight || f.fight !== null || f.after !== null;
  const screen =
    phase !== 'playing' || creating || !game ? null : fighting ? 'fight' : useNav.getState().here;
  return {
    screen,
    place: game ? placeHere(game) : null,
    night: game ? isNight(hourOfDay(game.calendar.day)) : false,
    storm: game ? weatherOn(game.glass.seed, game.calendar.day) === 'storm' : false,
    tense:
      useSquare.getState().open?.kind === 'encounter' ||
      (game?.map?.encounters ?? []).some((e) => e.state === 'waiting'),
  };
}

let placeCache: { id: string | null; kind: Where['place'] } = { id: null, kind: null };

function placeHere(s: GameState): Where['place'] {
  const inside = s.map?.inside ?? null;
  if (inside !== placeCache.id) {
    const map = inside ? mapOf(s) : null;
    const p = map && inside ? placeById(map, inside) : undefined;
    placeCache = { id: inside, kind: p ? placeKindOf(p) : null };
  }
  return placeCache.kind;
}

/** Starts the layer: called once at load, beside the settings. */
export function startSound(): void {
  if (engine || typeof window === 'undefined') return;
  const e = new SoundEngine();
  engine = e;
  setCuePlayer(play);

  let focused = document.hasFocus();
  const volumes = () => e.setVolumes(volumesOf(useSettings.getState(), focused));
  volumes();
  useSettings.subscribe(volumes);
  window.addEventListener('focus', () => {
    focused = true;
    volumes();
  });
  window.addEventListener('blur', () => {
    focused = false;
    volumes();
  });

  // Browsers hold sound back until the player first acts.
  const unlock = () => {
    e.unlock();
    if (e.running) {
      window.removeEventListener('pointerdown', unlock, true);
      window.removeEventListener('keydown', unlock, true);
    }
  };
  window.addEventListener('pointerdown', unlock, true);
  window.addEventListener('keydown', unlock, true);

  // A click on a button, a tab or the rail; held a moment, so the sound the click makes (a buy, an
  // equip) plays in its place.
  document.addEventListener(
    'click',
    (ev) => {
      const t = ev.target as Element | null;
      if (!t?.closest) return;
      const tab = t.closest('#side-menu button, [role="tab"]');
      const button = tab ?? t.closest('button, a[href], [role="button"], summary');
      if (!button) return;
      window.clearTimeout(pendingClick);
      pendingClick = window.setTimeout(() => {
        pendingClick = 0;
        play(tab ? 'ui-tab' : 'ui-click');
      }, 0);
    },
    true,
  );

  // A toast as it shows.
  useToasts.subscribe((now, was) => {
    const before = new Set(was.toasts.map((t) => t.key));
    if (now.toasts.some((t) => !before.has(t.key))) play('ui-toast');
  });

  // The soundscape, whenever where you are changes.
  let base: Base | null = null;
  let key = '';
  const scape = () => {
    const w = whereNow();
    const s = scapeOf(w, base);
    base = s.base;
    const next = JSON.stringify(s);
    if (next === key) return;
    key = next;
    e.setMusic(s.music, s.duck);
    e.setAmbience(s.ambience);
    if (w.screen === 'crafts' || w.screen === 'dwelling') void e.preload('craft');
    if (w.screen === 'fight') void e.preload('combat');
  };
  scape();
  useGame.subscribe(scape);
  useNav.subscribe(scape);
  useFight.subscribe(scape);
  useSquare.subscribe(scape);
}
