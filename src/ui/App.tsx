import { useEffect, useRef, useState } from 'react';
import { AbodeScreen } from './AbodeScreen.tsx';
import { BagScreen } from './BagScreen.tsx';
import { CharacterScreen } from './CharacterScreen.tsx';
import { ChronicleScreen } from './ChronicleScreen.tsx';
import { CombatScreen } from './CombatScreen.tsx';
import { CreationScreen } from './CreationScreen.tsx';
import { DevConsole } from './dev/DevConsole.tsx';
import { CultivateScreen } from './CultivateScreen.tsx';
import { PeopleScreen } from './PeopleScreen.tsx';
import { GlassBackground } from './GlassBackground.tsx';
import { SettingsScreen } from './SettingsScreen.tsx';
import { Toasts } from './Toasts.tsx';
import { TreesScreen } from './TreesScreen.tsx';
import { capitalize } from './format.ts';
import { readyLadders, useScene } from './scene.ts';
import { useNav } from './nav.ts';
import { markMoving } from './moving.ts';
import { screens, type ScreenId } from './screens.ts';
import { useGame } from './store.ts';
import { bySeason } from '../core/chronicle.ts';
import { screenDot, screenIsNew } from '../core/seen.ts';
import { EventLine } from './widgets.tsx';

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

export function App() {
  const [screen, setScreen] = useState<ScreenId>('abode');
  const [menuOpen, setMenuOpen] = useState(false);
  const [contextOpen, setContextOpen] = useState(false);
  const phase = useGame((s) => s.phase);
  const game = useGame((s) => s.game);
  const notice = useGame((s) => s.notice);
  const creating = useGame((s) => s.creating);
  // A life begins at home: once creation closes, the Abode shows.
  const [wasCreating, setWasCreating] = useState(false);
  if (!!creating !== wasCreating) {
    setWasCreating(!!creating);
    if (!creating) setScreen('abode');
  }
  // A breakthrough scene plays on the Abode's figure, and its panel opens there, wherever either
  // was called from.
  const sceneStarted = useScene((s) => s.play?.started ?? 0);
  const panelOpen = useScene((s) => (s.panel ? `${s.panel.ladder}/${s.panel.lastChance}` : ''));
  const [lastScene, setLastScene] = useState({ started: 0, panel: '' });
  if (sceneStarted !== lastScene.started || panelOpen !== lastScene.panel) {
    setLastScene({ started: sceneStarted, panel: panelOpen });
    if (sceneStarted || panelOpen) setScreen('abode');
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
  // A mark on the Abode in the menu while a breakthrough is ready.
  const ready = useGame((s) => (s.game ? readyLadders(s.game).length > 0 : false));
  const dismissNotice = useGame((s) => s.dismissNotice);

  useEffect(() => {
    void useGame.getState().init();
  }, []);

  const unlocks = game?.unlocks ?? [];
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
  // With no life open, Settings is where you pick or start one.
  const current = creating
    ? { id: 'creation', name: 'A New Life', hanzi: '新生' }
    : phase === 'no-slot'
      ? screens.find((s) => s.id === 'settings')!
      : (available.find((s) => s.id === screen) ?? available[0]!);

  // Scrolling anywhere (the page, the main column, a list) pauses the looping animations.
  useEffect(() => {
    document.addEventListener('scroll', markMoving, { capture: true, passive: true });
    return () => document.removeEventListener('scroll', markMoving, { capture: true });
  }, []);

  // Escape closes the phone drawer and bottom sheet.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      setMenuOpen(false);
      setContextOpen(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  // Opening a screen clears its dot, and so does something new arriving while it is open.
  const here = phase === 'playing' && !creating ? current.id : null;
  const hereDot = here !== null && dots.includes(here);
  useEffect(() => {
    if (here) useGame.getState().openScreen(here);
  }, [here, hereDot]);

  const recent = game ? game.chronicle.slice(-8).reverse() : [];

  return (
    <>
      <GlassBackground />
      <div className="shell">
        <header className="topbar">
          <button
            type="button"
            className="icon-button"
            aria-label="Open menu"
            aria-expanded={menuOpen}
            aria-controls="side-menu"
            onClick={() => setMenuOpen(true)}
          >
            ☰
            {dots.some((d) => d && d !== current.id) && (
              <span className="menu-mark is-new is-on-button" aria-hidden="true" />
            )}
          </button>
          <span className="topbar-title">{current.name}</span>
          <button
            type="button"
            className="icon-button"
            aria-label="Show context panel"
            aria-expanded={contextOpen}
            aria-controls="context-panel"
            onClick={() => setContextOpen((o) => !o)}
          >
            ⋯
          </button>
        </header>

        <div
          className={`scrim ${menuOpen || contextOpen ? 'is-visible' : ''}`}
          onClick={() => {
            setMenuOpen(false);
            setContextOpen(false);
          }}
          aria-hidden="true"
        />

        <nav
          id="side-menu"
          className={`side-menu ${menuOpen ? 'is-open' : ''}`}
          aria-label="Screens"
        >
          <div className="brand">
            <span className="brand-name">Severed Heaven</span>
            <span className="hanzi brand-hanzi">断天</span>
          </div>
          <ul>
            {available.map((s) => (
              <li key={s.id}>
                <button
                  type="button"
                  className={`menu-item${s.id === current.id ? ' is-active' : ''}${fresh.includes(s.id) && s.id !== current.id ? ' is-new' : ''}`}
                  aria-current={s.id === current.id ? 'page' : undefined}
                  onClick={() => {
                    setScreen(s.id);
                    setMenuOpen(false);
                  }}
                >
                  <span>
                    {s.name}
                    {s.id === 'abode' && ready && (
                      <span className="menu-mark" role="img" aria-label="a breakthrough is ready" />
                    )}
                    {dots.includes(s.id) && s.id !== current.id && (
                      <span className="menu-mark is-new" role="img" aria-label="something new" />
                    )}
                  </span>
                  <span className="hanzi menu-hanzi">{s.hanzi}</span>
                </button>
              </li>
            ))}
          </ul>
        </nav>

        <main className="main" ref={main}>
          <h1 className="screen-title">
            {current.name} <span className="hanzi">{current.hanzi}</span>
          </h1>
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
          {phase !== 'loading' && current.id === 'abode' && <AbodeScreen />}
          {phase !== 'loading' && current.id === 'cultivate' && <CultivateScreen />}
          {phase !== 'loading' && current.id === 'trees' && <TreesScreen />}
          {phase !== 'loading' && current.id === 'bag' && <BagScreen />}
          {phase !== 'loading' && current.id === 'combat' && <CombatScreen />}
          {phase !== 'loading' && current.id === 'character' && <CharacterScreen />}
          {phase !== 'loading' && current.id === 'people' && <PeopleScreen />}
          {phase !== 'loading' && current.id === 'chronicle' && <ChronicleScreen />}
          {phase !== 'loading' && current.id === 'settings' && <SettingsScreen />}
        </main>

        <aside
          id="context-panel"
          className={`context-panel ${contextOpen ? 'is-open' : ''}`}
          aria-label="Context"
        >
          <button
            type="button"
            className="sheet-handle"
            aria-label="Close context panel"
            onClick={() => setContextOpen(false)}
          />
          <h2 className="panel-heading">Chronicle</h2>
          {recent.length === 0 ? (
            <p className="muted">Nothing has happened yet.</p>
          ) : (
            game &&
            bySeason(game.player, recent).map((g, gi) => (
              <div key={`${g.when}-${gi}`} className="chronicle-season">
                <h3 className={`chronicle-when${gi === 0 ? ' is-newest' : ''}`}>
                  {capitalize(g.when)}
                </h3>
                <ol className="chronicle">
                  {g.items.map((e, i) => (
                    <li key={`${e.day}-${i}`}>
                      <EventLine game={game} e={e} />
                    </li>
                  ))}
                </ol>
              </div>
            ))
          )}
        </aside>

        <Toasts />
        <SlotNotice />
        {import.meta.env.DEV && <DevConsole />}
      </div>
    </>
  );
}
