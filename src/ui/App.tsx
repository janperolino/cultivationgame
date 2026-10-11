import { useEffect, useState } from 'react';
import { screens, type ScreenId } from './screens.ts';

export function App() {
  const [screen, setScreen] = useState<ScreenId>('abode');
  const [menuOpen, setMenuOpen] = useState(false);
  const [contextOpen, setContextOpen] = useState(false);
  const current = screens.find((s) => s.id === screen) ?? screens[0]!;

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

  return (
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

      <nav id="side-menu" className={`side-menu ${menuOpen ? 'is-open' : ''}`} aria-label="Screens">
        <div className="brand">
          <span className="brand-name">Severed Heaven</span>
          <span className="hanzi brand-hanzi">断天</span>
        </div>
        <ul>
          {screens.map((s) => (
            <li key={s.id}>
              <button
                type="button"
                className={`menu-item ${s.id === screen ? 'is-active' : ''}`}
                aria-current={s.id === screen ? 'page' : undefined}
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
        <section className="panel">
          <p className="muted">Your cave abode is quiet. Cultivation arrives in M1.</p>
        </section>
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
        <p className="muted">Nothing has happened yet.</p>
      </aside>
    </div>
  );
}
