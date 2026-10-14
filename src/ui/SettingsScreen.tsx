// Settings (design § UI and screens, the Settings row): saves, the life's clock speed, colors and
// glass, text size and motion. The clock belongs to the life and saves with the slot; the rest
// are the player's and live in ui/settings.ts.
import { useRef, useState } from 'react';
import { RARITIES, type RarityId } from '../content/rarity.ts';
import { realm, stageName } from '../content/realms.ts';
import { clockChoices, clockRealm, OFFLINE_CAP_MS, realmYearsPerHour } from '../core/loop.ts';
import type { SlotId, SlotSummary } from '../core/save/slots.ts';
import {
  colorWarning,
  DEFAULT_ACCENT,
  DEFAULT_CRACK,
  DEFAULT_RARITY,
  PRESETS,
  type ColorJob,
} from './colors.ts';
import { formatAge, formatWhen } from './format.ts';
import {
  DEFAULT_SETTINGS,
  rarityColor,
  saveSettings,
  TEXT_SCALES,
  useSettings,
  WEB_LEVELS,
  type MotionSetting,
} from './settings.ts';
import { useGame } from './store.ts';
import { Why } from './widgets.tsx';

const WEEK_MS = 7 * 24 * 3_600_000;

/**
 * What a slot is asking before it acts. The browser's own confirm box is skipped silently in some
 * frames (the desktop app's browser pane answers no at once), so the question sits in the row.
 */
type Asking = { kind: 'erase' } | { kind: 'rewind' } | { kind: 'import'; file: File };

function SlotRow({ info }: { info: SlotSummary }) {
  const active = useGame((s) => s.slot === info.slot && s.phase === 'playing');
  const { openSlot, beginCreation, exportSlot, importSlot, clearSlot, rewind } = useGame.getState();
  const fileInput = useRef<HTMLInputElement>(null);
  const [asking, setAsking] = useState<Asking | null>(null);
  const slot = info.slot as SlotId;

  const onImport = (file: File | undefined) => {
    if (!file) return;
    if (info.empty) void importSlot(slot, file);
    else setAsking({ kind: 'import', file });
  };

  const confirm = () => {
    if (!asking) return;
    if (asking.kind === 'erase') void clearSlot(slot);
    if (asking.kind === 'rewind') void rewind();
    if (asking.kind === 'import') void importSlot(slot, asking.file);
    setAsking(null);
  };
  const question = !asking
    ? null
    : asking.kind === 'erase'
      ? { text: `Erase slot ${slot}? This can't be undone unless you exported it.`, yes: 'Erase' }
      : asking.kind === 'rewind'
        ? { text: 'Use your one rewind? You return to your latest breakthrough.', yes: 'Rewind' }
        : {
            text: `Replace slot ${slot} with ${asking.file.name}? The life in it is lost unless exported.`,
            yes: 'Replace',
          };

  // Measured against the last save rather than the clock, so rendering stays pure.
  const exportStale =
    !info.empty && (!info.lastExportAt || (info.savedAt ?? 0) - info.lastExportAt > WEEK_MS);

  return (
    <li className={`slot ${active ? 'is-active' : ''}`}>
      <div className="slot-head">
        <span className="slot-number">Slot {slot}</span>
        {info.empty ? (
          <span className="muted">Empty</span>
        ) : info.broken ? (
          <span className="warn">Damaged: neither the save nor its backup can be read</span>
        ) : (
          <span>
            <strong>{info.name}</strong>
            {info.qiRealm &&
              ` · ${realm(info.qiRealm).name}, ${stageName(info.qiRealm, info.qiStage ?? 1)}`}
            {info.age !== undefined && ` · age ${formatAge(info.age)}`}
            {` · ${info.mode === 'gentle' ? 'gentle' : 'ironman'}`}
            {active && <span className="gold"> · playing</span>}
          </span>
        )}
      </div>
      {!info.empty && (
        <p className="muted slot-meta">
          Last saved {formatWhen(info.savedAt)} · last export{' '}
          <span className={exportStale ? 'warn' : undefined}>{formatWhen(info.lastExportAt)}</span>
        </p>
      )}
      {question ? (
        <div className="slot-confirm" role="alertdialog" aria-label={question.text}>
          <p className="warn">{question.text}</p>
          <div className="slot-actions">
            <button type="button" className="button button-danger" onClick={confirm}>
              {question.yes}
            </button>
            <button type="button" className="button" onClick={() => setAsking(null)}>
              Keep it
            </button>
          </div>
        </div>
      ) : (
        <div className="slot-actions">
          {info.empty ? (
            <button type="button" className="button" onClick={() => beginCreation(slot)}>
              New life
            </button>
          ) : (
            <>
              {!active && !info.broken && (
                <button type="button" className="button" onClick={() => void openSlot(slot)}>
                  Play
                </button>
              )}
              {!info.broken && (
                <button type="button" className="button" onClick={() => void exportSlot(slot)}>
                  Export
                </button>
              )}
              {active && info.canRewind && (
                <button
                  type="button"
                  className="button"
                  onClick={() => setAsking({ kind: 'rewind' })}
                >
                  Rewind
                </button>
              )}
            </>
          )}
          <button type="button" className="button" onClick={() => fileInput.current?.click()}>
            Import
          </button>
          <input
            ref={fileInput}
            type="file"
            accept=".gz,.json,application/gzip,application/json"
            hidden
            onChange={(e) => {
              onImport(e.target.files?.[0]);
              e.target.value = '';
            }}
          />
          {!info.empty && (
            <button
              type="button"
              className="button button-danger"
              onClick={() => setAsking({ kind: 'erase' })}
            >
              Erase
            </button>
          )}
        </div>
      )}
    </li>
  );
}

/** "a year an hour", "1.7 years an hour". */
function yearsAnHour(years: number): string {
  if (Math.abs(years - 1) < 0.05) return 'a year an hour';
  const n = years < 10 ? String(Math.round(years * 10) / 10) : String(Math.round(years));
  return `${n} years an hour`;
}

/** The calendar speeds this life has reached (design § How the two halves connect). */
function ClockPanel() {
  const game = useGame((s) => s.game);
  const setClock = useGame((s) => s.setClock);
  if (!game || game.ended) return null;
  const choices = clockChoices(game);
  const current = clockRealm(game);
  const own = game.player.qi.realm;
  const capYears = (OFFLINE_CAP_MS / 3_600_000) * realmYearsPerHour(current);
  return (
    <section className="panel" aria-labelledby="clock-heading">
      <h2 id="clock-heading" className="panel-heading">
        The clock
      </h2>
      <p className="muted">
        Each qi realm you reach unlocks its calendar speed. Gains, costs and lifespan all count
        in-game time, so a slower clock is never stronger, only slower. The choice is saved with
        this life.
      </p>
      <div className="seg spaced" role="group" aria-label="Clock speed">
        {choices.map((id) => (
          <button
            key={id}
            type="button"
            aria-pressed={current === id}
            onClick={() => setClock(id === own ? null : id)}
          >
            {realm(id).name} · {yearsAnHour(realmYearsPerHour(id))}
          </button>
        ))}
      </div>
      <p className="caption spaced">
        {choices.length === 1
          ? 'Foundation unlocks the next speed.'
          : current === own
            ? 'Following your realm: the clock speeds up as you break through.'
            : `Held at the pace of ${realm(current).name}, even past it.`}{' '}
        Offline time covers up to {Math.round(capYears * 10) / 10} years at this speed.
      </p>
    </section>
  );
}

function ColorField({
  label,
  job,
  value,
  fallback,
  onChange,
}: {
  label: string;
  job: ColorJob;
  value: string;
  fallback: string;
  onChange: (hex: string) => void;
}) {
  const settings = useSettings();
  const palette = Object.fromEntries(
    RARITIES.map((r) => [r.id, rarityColor(settings, r.id)]),
  ) as Record<RarityId, string>;
  const warning = colorWarning(job, value, palette, settings.accent);
  return (
    <div className="color-field">
      <label className="color-pick">
        <input type="color" value={value} onChange={(e) => onChange(e.target.value)} />
        <span>{label}</span>
      </label>
      {value.toLowerCase() !== fallback.toLowerCase() && (
        <button type="button" className="button button-quiet" onClick={() => onChange(fallback)}>
          Reset
        </button>
      )}
      {warning && <p className="caption warn color-warning">{warning}</p>}
    </div>
  );
}

function Strength({
  label,
  value,
  steps,
  onChange,
}: {
  label: string;
  value: number;
  steps: [number, string][];
  onChange: (v: number) => void;
}) {
  return (
    <div className="field">
      <span>{label}</span>
      <div className="seg" role="group" aria-label={label}>
        {steps.map(([v, name]) => (
          <button
            key={name}
            type="button"
            aria-pressed={Math.abs(value - v) < 0.01}
            onClick={() => onChange(v)}
          >
            {name}
          </button>
        ))}
      </div>
    </div>
  );
}

function LookPanel() {
  const s = useSettings();
  const hasLife = useGame((g) => !!g.game);
  const reroll = useGame((g) => g.rerollGlass);
  const preset = PRESETS.find(
    (p) =>
      p.accent.toLowerCase() === s.accent.toLowerCase() &&
      p.crack.toLowerCase() === s.crack.toLowerCase(),
  );
  const setRarity = (id: RarityId, hex: string) => {
    const rest = Object.fromEntries(Object.entries(s.rarity).filter(([k]) => k !== id));
    saveSettings({
      rarity: hex.toLowerCase() === DEFAULT_RARITY[id] ? rest : { ...rest, [id]: hex },
    });
  };
  return (
    <section className="panel" aria-labelledby="look-heading">
      <h2 id="look-heading" className="panel-heading">
        Colors and glass
      </h2>
      <p className="muted">
        Each color keeps its job whatever it looks like: the accent marks what you can act on, and
        the crack light is qi.
      </p>
      <div className="field spaced">
        <span>Presets</span>
        <div className="presets" role="group" aria-label="Color presets">
          {PRESETS.map((p) => (
            <button
              key={p.id}
              type="button"
              className="button preset"
              aria-pressed={preset?.id === p.id}
              onClick={() => saveSettings({ accent: p.accent, crack: p.crack })}
            >
              <span className="swatch" style={{ background: p.accent }} />
              <span className="swatch" style={{ background: p.crack }} />
              {p.name}
            </button>
          ))}
        </div>
      </div>
      <div className="color-grid spaced">
        <ColorField
          label="Accent"
          job="accent"
          value={s.accent}
          fallback={DEFAULT_ACCENT}
          onChange={(accent) => saveSettings({ accent })}
        />
        <ColorField
          label="Crack light"
          job="crack"
          value={s.crack}
          fallback={DEFAULT_CRACK}
          onChange={(crack) => saveSettings({ crack })}
        />
      </div>

      <h3 className="sub-heading spaced">
        Rarity{' '}
        <Why label="Why rarity has its own colors">
          A thing&apos;s name wears its rarity color. Rarity never borrows the accent or the warning
          color, so a gold name never looks like a button.
        </Why>
      </h3>
      <div className="color-grid">
        {RARITIES.map((r) => (
          <ColorField
            key={r.id}
            label={r.name}
            job={r.id}
            value={rarityColor(s, r.id)}
            fallback={DEFAULT_RARITY[r.id]}
            onChange={(hex) => setRarity(r.id, hex)}
          />
        ))}
      </div>
      <p className="rarity-sample spaced">
        {RARITIES.map((r) => (
          <span key={r.id} className={`rarity-${r.id}`}>
            {r.name}
          </span>
        ))}
      </p>

      <h3 className="sub-heading spaced">The glass</h3>
      <div className="look-grid">
        <div className="field">
          <span>Fine web</span>
          <div className="seg" role="group" aria-label="Fine web">
            {WEB_LEVELS.map((name, i) => (
              <button
                key={name}
                type="button"
                aria-pressed={s.web === i}
                onClick={() => saveSettings({ web: i })}
              >
                {name}
              </button>
            ))}
          </div>
        </div>
        <Strength
          label="Season and weather"
          value={s.weather}
          steps={[
            [0, 'Off'],
            [0.5, 'Faint'],
            [1, 'Full'],
          ]}
          onChange={(weather) => saveSettings({ weather })}
        />
        <Strength
          label="Panel rims"
          value={s.rim}
          steps={[
            [0.5, 'Faint'],
            [1, 'As made'],
            [1.4, 'Bright'],
          ]}
          onChange={(rim) => saveSettings({ rim })}
        />
        <div className="field">
          <span>Pattern</span>
          <div>
            <button type="button" className="button" disabled={!hasLife} onClick={reroll}>
              New glass
            </button>
          </div>
        </div>
      </div>
      <p className="caption spaced">
        {hasLife
          ? 'New glass cracks the pane afresh for this life, and the fractures your breakthroughs opened come along.'
          : 'New glass needs a life open.'}
      </p>
      <div className="actions spaced">
        <button
          type="button"
          className="button button-quiet"
          onClick={() =>
            saveSettings({
              accent: DEFAULT_SETTINGS.accent,
              crack: DEFAULT_SETTINGS.crack,
              rarity: {},
              web: DEFAULT_SETTINGS.web,
              weather: DEFAULT_SETTINGS.weather,
              rim: DEFAULT_SETTINGS.rim,
            })
          }
        >
          Back to the defaults
        </button>
      </div>
    </section>
  );
}

const MOTION: { id: MotionSetting; name: string }[] = [
  { id: 'system', name: 'Follow the system' },
  { id: 'reduced', name: 'Reduce' },
  { id: 'full', name: 'Full' },
];

function ReadingPanel() {
  const s = useSettings();
  return (
    <section className="panel" aria-labelledby="reading-heading">
      <h2 id="reading-heading" className="panel-heading">
        Text and motion
      </h2>
      <div className="look-grid">
        <div className="field">
          <span>Text size</span>
          <div className="seg" role="group" aria-label="Text size">
            {TEXT_SCALES.map((t) => (
              <button
                key={t.value}
                type="button"
                aria-pressed={s.textScale === t.value}
                onClick={() => saveSettings({ textScale: t.value })}
              >
                {t.name}
              </button>
            ))}
          </div>
        </div>
        <div className="field">
          <span>Motion</span>
          <div className="seg" role="group" aria-label="Motion">
            {MOTION.map((m) => (
              <button
                key={m.id}
                type="button"
                aria-pressed={s.motion === m.id}
                onClick={() => saveSettings({ motion: m.id })}
              >
                {m.name}
              </button>
            ))}
          </div>
        </div>
      </div>
      <p className="caption spaced">
        Reduced motion stills the panel rims, the card tray, the weather and the breakthrough flare.
      </p>
    </section>
  );
}

/**
 * Hints toward first times (ui/hints.ts), the open life's own: on or off, and shown again, each
 * once more. With no life open there is nothing to set.
 */
function HintsPanel() {
  const replay = useGame((g) => g.replayHints);
  const setHints = useGame((g) => g.setHints);
  const on = useGame((g) => g.game?.hints.on ?? true);
  const hasLife = useGame((g) => !!g.game && !g.game.ended);
  const [replayed, setReplayed] = useState(false);
  return (
    <section className="panel" aria-labelledby="hints-heading">
      <h2 id="hints-heading" className="panel-heading">
        Hints
      </h2>
      <label className="check">
        <input
          type="checkbox"
          checked={on}
          disabled={!hasLife}
          onChange={(e) => setHints(e.target.checked)}
        />
        Show hints
      </label>
      <p className="caption spaced">
        The first time something reaches you, a hint points at it, once a life, and stays until you
        do it or dismiss it. Each life keeps its own setting.
      </p>
      <div className="actions">
        <button
          type="button"
          className="button"
          disabled={!hasLife}
          onClick={() => {
            replay();
            setReplayed(true);
          }}
        >
          Show hints again
        </button>
        {replayed && <span className="caption">Hints will come again as their moments do.</span>}
      </div>
    </section>
  );
}

export function SettingsScreen() {
  return (
    <>
      <SavesPanel />
      <ClockPanel />
      <LookPanel />
      <ReadingPanel />
      <HintsPanel />
    </>
  );
}

function SavesPanel() {
  const slots = useGame((s) => s.slots);
  const persisted = useGame((s) => s.persisted);
  const speed = useGame((s) => s.speed);
  // Every slot that holds a life, and one empty one for a new life or an import.
  const firstEmpty = slots.find((x) => x.empty);
  const shown = slots.filter((x) => !x.empty || x === firstEmpty);
  const used = slots.filter((x) => !x.empty).length;

  return (
    <section className="panel">
      <h2 className="panel-heading">Saves</h2>
      <p className="muted">
        Each slot autosaves every 30 seconds and at each breakthrough, and keeps the previous
        autosave as a backup. Export is the only way to move a life to another device.
      </p>
      <ul className="slots">
        {shown.map((info) => (
          <SlotRow key={info.slot} info={info} />
        ))}
      </ul>
      <p className="caption">
        {used} of {slots.length} slots hold a life
        {used < slots.length ? '; the first empty one waits at the end.' : '.'}
      </p>
      <p className="muted">
        {persisted === true && 'The browser has agreed to keep this game’s storage.'}
        {persisted === false &&
          'The browser may clear this game’s storage if you stay away (Safari does after a week). Export now and then.'}
        {persisted === null && 'Export now and then: some browsers clear unvisited sites’ storage.'}
      </p>
      {speed !== 1 && <p className="gold">Debug clock: ×{speed}</p>}
    </section>
  );
}
