import { lazy, Suspense, useEffect, useRef, useState } from 'react';
import { CultivateScreen } from './CultivateScreen.tsx';
import { CreationScreen } from './CreationScreen.tsx';
import { DevConsole } from './dev/DevConsole.tsx';
import { RoutineScreen } from './RoutineScreen.tsx';
import { GlassBackground } from './GlassBackground.tsx';
import { ShellHeader } from './ShellHeader.tsx';
import { AbodeMark, ScreenIcon } from './icons.tsx';
import { Toasts } from './Toasts.tsx';
import { readyLadders, useScene } from './scene.ts';
import { useNav } from './nav.ts';
import { markMoving } from './moving.ts';
import { reducedMotion, useSettings } from './settings.ts';
import { screens, type ScreenId } from './screens.ts';
import { useGame } from './store.ts';
import { placeIndex, setPlaces } from '../core/resolver/knows.ts';
import { screenDot, screenIsNew } from '../core/seen.ts';
import { useBeacons } from './useBeacons.ts';

function SlotNotice() {
  const phase = useGame((s) => s.phase);
  const slot = useGame((s) => s.slot);
  const takeOver = useGame((s) => s.takeOver);
  if (phase !== 'busy' && phase !== 'lost') return null;
  return (
    <div className="modal-scrim">
      <section className="panel modal" role="alertdialog" aria-labelledby="slot-notice">
        <h2 id="slot-notice" className="panel-heading">
          {phase === 'busy'
            ? 'This life is open in another tab'
            : 'Another tab took over this life'}
        </h2>
        <p>
          {phase === 'busy'
            ? `Slot ${slot} is being played in another tab. Only one tab plays a slot at a time, so two autosaves never overwrite each other.`
            : 'This tab has stopped and will not save. Its progress up to the last autosave carries on in the other tab.'}
        </p>
        <button type="button" className="button" onClick={() => void takeOver()}>
          {phase === 'busy' ? 'Take over here' : 'Take it back'}
        </button>
      </section>
    </div>
  );
}

/** The two screens that share the cave, between which a change sinks and rises (theme.css). */
const SCENE_PAIR: ReadonlySet<ScreenId> = new Set<ScreenId>(['cultivate', 'routine']);
/**
 * The screens past Cultivate and Routine load on their own, off the first screen's path, and are
 * fetched once the page is idle so the first open never waits.
 */
const SCREENS = {
  BagScreen: () => import('./BagScreen.tsx'),
  CharacterScreen: () => import('./CharacterScreen.tsx'),
  ChronicleScreen: () => import('./ChronicleScreen.tsx'),
  CombatScreen: () => import('./CombatScreen.tsx'),
  MapScreen: () => import('./MapScreen.tsx'),
  PeopleScreen: () => import('./PeopleScreen.tsx'),
  SettingsScreen: () => import('./SettingsScreen.tsx'),
  TreesScreen: () => import('./TreesScreen.tsx'),
};
const BagScreen = lazy(() => SCREENS.BagScreen().then((m) => ({ default: m.BagScreen })));
const CharacterScreen = lazy(() =>
  SCREENS.CharacterScreen().then((m) => ({ default: m.CharacterScreen })),
);
const ChronicleScreen = lazy(() =>
  SCREENS.ChronicleScreen().then((m) => ({ default: m.ChronicleScreen })),
);
const CombatScreen = lazy(() => SCREENS.CombatScreen().then((m) => ({ default: m.CombatScreen })));
const MapScreen = lazy(() => SCREENS.MapScreen().then((m) => ({ default: m.MapScreen })));
const PeopleScreen = lazy(() => SCREENS.PeopleScreen().then((m) => ({ default: m.PeopleScreen })));
const SettingsScreen = lazy(() =>
  SCREENS.SettingsScreen().then((m) => ({ default: m.SettingsScreen })),
);
const TreesScreen = lazy(() => SCREENS.TreesScreen().then((m) => ({ default: m.TreesScreen })));

/** Kept one array, so the shell doesn't re-render on every tick for a fresh empty list. */
const NO_UNLOCKS: readonly string[] = [];
const LEAVE_MS = 170;
const ENTER_MS = 420;

export function App() {
  const [screen, setScreen] = useState<ScreenId>('cultivate');
  const phase = useGame((s) => s.phase);
  const notice = useGame((s) => s.notice);
  const creating = useGame((s) => s.creating);
  // A life begins at home: once creation closes, Cultivate shows.
  const [wasCreating, setWasCreating] = useState(false);
  if (!!creating !== wasCreating) {
    setWasCreating(!!creating);
    if (!creating) setScreen('cultivate');
  }
  // A breakthrough scene plays on Cultivate's figure, and its panel opens there, wherever either
  // was called from.
  const sceneStarted = useScene((s) => s.play?.started ?? 0);
  const panelOpen = useScene((s) => (s.panel ? `${s.panel.ladder}/${s.panel.lastChance}` : ''));
  const [lastScene, setLastScene] = useState({ started: 0, panel: '' });
  if (sceneStarted !== lastScene.started || panelOpen !== lastScene.panel) {
    setLastScene({ started: sceneStarted, panel: panelOpen });
    if (sceneStarted || panelOpen) setScreen('cultivate');
  }
  // A link on one screen to another (the Character screen's manuals line, say) shows it, from
  // its top.
  const main = useRef<HTMLElement>(null);
  const nav = useNav((s) => s.seq);
  useEffect(() => {
    if (nav === 0) return;
    window.scrollTo(0, 0);
    main.current?.scrollTo(0, 0);
  }, [nav]);
  const [lastNav, setLastNav] = useState(0);
  if (nav !== lastNav) {
    setLastNav(nav);
    const to = useNav.getState().screen;
    if (to) setScreen(to);
  }
  // Between Cultivate and Routine, which stand in the same cave, what the screen we leave shows
  // sinks and fades before the next rises into place (A4, Jan's call); every other change is at
  // once, and so is this one under reduced motion. The rail answers at once either way.
  const [shown, setShown] = useState<ScreenId>('cultivate');
  const [entering, setEntering] = useState(false);
  const reduced = useSettings((s) => reducedMotion(s));
  const glide = SCENE_PAIR.has(screen) && SCENE_PAIR.has(shown) && !reduced;
  if (screen !== shown && !glide) setShown(screen);
  useEffect(() => {
    if (screen === shown) return;
    const t = setTimeout(() => {
      setShown(screen);
      setEntering(true);
    }, LEAVE_MS);
    return () => clearTimeout(t);
  }, [screen, shown]);
  useEffect(() => {
    if (!entering) return;
    const t = setTimeout(() => setEntering(false), ENTER_MS);
    return () => clearTimeout(t);
  }, [entering]);
  const leaving = screen !== shown;
  // A mark on Cultivate in the menu while a breakthrough is ready.
  const ready = useGame((s) => (s.game ? readyLadders(s.game).length > 0 : false));
  const dismissNotice = useGame((s) => s.dismissNotice);

  useEffect(() => {
    void useGame.getState().init();
    const fetchScreens = () => Object.values(SCREENS).forEach((load) => void load());
    const idle = window.requestIdleCallback ?? ((f: () => void) => window.setTimeout(f, 2000));
    idle(fetchScreens);
    // What people know of places reads the atlas's index (core/resolver/knows.ts); it loads on its
    // own, after the game, so the first screen never waits for it.
    void import('../content/generated/atlas-index.json').then((index) =>
      setPlaces(placeIndex(index.default)),
    );
  }, []);

  const unlocks = useGame((s) => s.game?.unlocks ?? NO_UNLOCKS);
  const available = screens.filter((s) => !s.unlock || unlocks.includes(s.unlock));
  // A dot on a menu item while its screen holds something new you haven't opened it on.
  const dots = useGame((s) =>
    s.game
      ? available
          .filter((x) => screenDot(s.game!, x.id))
          .map((x) => x.id)
          .join(',')
      : '',
  ).split(',');
  // A screen just opened glows in the menu, beside its dot, until it is first looked at.
  const fresh = useGame((s) =>
    s.game
      ? available
          .filter((x) => screenIsNew(s.game!, x.id))
          .map((x) => x.id)
          .join(',')
      : '',
  ).split(',');
  // A first time waiting glows its screen's menu button with drifting motes (ui/beacons.ts),
  // over the "new screen" glow.
  const beaconsNow = useBeacons();
  const beaconed = new Set(beaconsNow.map((b) => b.screen));
  // With no life open, Settings is where you pick or start one.
  const pickScreen = (id: ScreenId) =>
    creating
      ? { id: 'creation', name: 'A New Life', hanzi: '新生' }
      : phase === 'no-slot'
        ? screens.find((s) => s.id === 'settings')!
        : (available.find((s) => s.id === id) ?? available[0]!);
  // What the main column shows, and what the rail lights (ahead of it while a glide runs).
  const current = pickScreen(shown);
  const wanted = pickScreen(screen);

  // Scrolling anywhere (the page, the main column, a list) pauses the looping animations.
  useEffect(() => {
    document.addEventListener('scroll', markMoving, { capture: true, passive: true });
    return () => document.removeEventListener('scroll', markMoving, { capture: true });
  }, []);

  // Opening a screen clears its dot, and so does something new arriving while it is open.
  const here = phase === 'playing' && !creating ? current.id : null;
  const hereDot = here !== null && dots.includes(here);
  useEffect(() => {
    if (here) useGame.getState().openScreen(here);
  }, [here, hereDot]);

  return (
    <>
      <GlassBackground />
      <div className="stage-frame">
        <div className="stage">
          <div className={`shell is-${current.id}`}>
            <nav id="side-menu" className="side-rail" aria-label="Screens">
              <div className="rail-mark" aria-hidden="true">
                <AbodeMark />
              </div>
              <ul>
                {available.map((s) => (
                  <li key={s.id}>
                    <button
                      type="button"
                      className={`rail-item${s.id === wanted.id ? ' is-active' : ''}${beaconed.has(s.id) ? ' is-beacon' : fresh.includes(s.id) && s.id !== wanted.id ? ' is-new' : ''}`}
                      aria-current={s.id === wanted.id ? 'page' : undefined}
                      aria-label={s.name}
                      onClick={() => setScreen(s.id)}
                    >
                      <ScreenIcon id={s.id} />
                      {s.id === 'cultivate' && ready && (
                        <span
                          className="menu-mark"
                          role="img"
                          aria-label="a breakthrough is ready"
                        />
                      )}
                      {dots.includes(s.id) && s.id !== wanted.id && (
                        <span className="menu-mark is-new" role="img" aria-label="something new" />
                      )}
                      <span className="rail-tip" aria-hidden="true">
                        {s.name} <span className="hanzi">{s.hanzi}</span>
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            </nav>

            <div className="main-column">
              <ShellHeader />
              <main
                className={`main${leaving ? ' is-leaving' : ''}${entering ? ' is-entering' : ''}`}
                ref={main}
              >
                {current.id !== 'cultivate' && current.id !== 'routine' && current.id !== 'map' && (
                  <h1 className="screen-title">
                    {current.name} <span className="hanzi">{current.hanzi}</span>
                  </h1>
                )}
                {notice && (
                  <section className="panel notice" role="status">
                    <p>{notice}</p>
                    <button type="button" className="button" onClick={dismissNotice}>
                      Dismiss
                    </button>
                  </section>
                )}
                {phase === 'loading' && <p className="muted">Opening your abode…</p>}
                {creating && <CreationScreen />}
                {phase === 'no-slot' && !creating && (
                  <p className="muted">No life is open. Start one or pick a slot below.</p>
                )}
                {phase !== 'loading' && current.id === 'cultivate' && <CultivateScreen />}
                {phase !== 'loading' && current.id === 'routine' && <RoutineScreen />}
                <Suspense fallback={null}>
                  {phase !== 'loading' && current.id === 'map' && <MapScreen />}
                  {phase !== 'loading' && current.id === 'trees' && <TreesScreen />}
                  {phase !== 'loading' && current.id === 'bag' && <BagScreen />}
                  {phase !== 'loading' && current.id === 'combat' && <CombatScreen />}
                  {phase !== 'loading' && current.id === 'character' && <CharacterScreen />}
                  {phase !== 'loading' && current.id === 'people' && <PeopleScreen />}
                  {phase !== 'loading' && current.id === 'chronicle' && <ChronicleScreen />}
                  {phase !== 'loading' && current.id === 'settings' && <SettingsScreen />}
                </Suspense>
              </main>
            </div>

            <Toasts />
            <SlotNotice />
            {import.meta.env.DEV && <DevConsole />}
          </div>
        </div>
      </div>
    </>
  );
}
