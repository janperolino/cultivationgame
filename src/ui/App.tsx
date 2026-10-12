import { useEffect, useState } from 'react';
import { AbodeScreen } from './AbodeScreen.tsx';
import { CharacterScreen } from './CharacterScreen.tsx';
import { ChronicleScreen } from './ChronicleScreen.tsx';
import { CreationScreen } from './CreationScreen.tsx';
import { DevConsole } from './dev/DevConsole.tsx';
import { CultivateScreen } from './CultivateScreen.tsx';
import { GlassBackground } from './GlassBackground.tsx';
import { SettingsScreen } from './SettingsScreen.tsx';
import { TechniquesScreen } from './TechniquesScreen.tsx';
import { TreesScreen } from './TreesScreen.tsx';
import { formatAge } from './format.ts';
import { screens, type ScreenId } from './screens.ts';
import { useGame } from './store.ts';
import { eventText } from '../core/chronicle.ts';
import { ageYears } from '../core/state.ts';

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
  const dismissNotice = useGame((s) => s.dismissNotice);

  useEffect(() => {
    void useGame.getState().init();
  }, []);

  const unlocks = game?.unlocks ?? [];
  const available = screens.filter((s) => !s.unlock || unlocks.includes(s.unlock));
  // With no life open, Settings is where you pick or start one.
  const current = creating
    ? { id: 'creation', name: 'A New Life', hanzi: '新生' }
    : phase === 'no-slot'
      ? screens.find((s) => s.id === 'settings')!
      : (available.find((s) => s.id === screen) ?? available[0]!);

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
                  className={`menu-item ${s.id === current.id ? 'is-active' : ''}`}
                  aria-current={s.id === current.id ? 'page' : undefined}
                  onClick={() => {
                    setScreen(s.id);
                    setMenuOpen(false);
                  }}
                >
                  <span>{s.name}</span>
                  <span className="hanzi menu-hanzi">{s.hanzi}</span>
                </button>
              </li>
            ))}
          </ul>
        </nav>

        <main className="main">
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
          {phase !== 'loading' && current.id === 'abode' && (
            <AbodeScreen onCultivate={() => setScreen('cultivate')} />
          )}
          {phase !== 'loading' && current.id === 'cultivate' && <CultivateScreen />}
          {phase !== 'loading' && current.id === 'trees' && <TreesScreen />}
          {phase !== 'loading' && current.id === 'techniques' && <TechniquesScreen />}
          {phase !== 'loading' && current.id === 'character' && <CharacterScreen />}
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
            <ol className="chronicle">
              {recent.map((c, i) => (
                <li key={`${c.day}-${i}`}>
                  <span className="muted chronicle-age">
                    {game &&
                      (c.day < game.player.bornDay
                        ? 'a past life'
                        : `age ${formatAge(ageYears(game.player, c.day))}`)}
                  </span>
                  {game && eventText(game, c)}
                </li>
              ))}
            </ol>
          )}
        </aside>

        <SlotNotice />
        {import.meta.env.DEV && <DevConsole />}
      </div>
    </>
  );
}
