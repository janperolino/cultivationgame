import { useRef } from 'react';
import type { SlotId, SlotSummary } from '../core/save/slots.ts';
import { formatAge, formatWhen } from './format.ts';
import { realm, stageName } from '../content/realms.ts';
import { useGame } from './store.ts';

const WEEK_MS = 7 * 24 * 3_600_000;

function SlotRow({ info }: { info: SlotSummary }) {
  const active = useGame((s) => s.slot === info.slot && s.phase === 'playing');
  const { openSlot, beginCreation, exportSlot, importSlot, clearSlot, rewind } = useGame.getState();
  const fileInput = useRef<HTMLInputElement>(null);
  const slot = info.slot as SlotId;

  const onImport = (file: File | undefined) => {
    if (!file) return;
    if (
      !info.empty &&
      !window.confirm(
        `Replace slot ${slot} with ${file.name}? The life in it is lost unless exported.`,
      )
    ) {
      return;
    }
    void importSlot(slot, file);
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
                onClick={() => {
                  if (
                    window.confirm('Use your one rewind? You return to your latest breakthrough.')
                  )
                    void rewind();
                }}
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
            onClick={() => {
              if (
                window.confirm(`Erase slot ${slot}? This can't be undone unless you exported it.`)
              )
                void clearSlot(slot);
            }}
          >
            Erase
          </button>
        )}
      </div>
    </li>
  );
}

export function SettingsScreen() {
  const slots = useGame((s) => s.slots);
  const persisted = useGame((s) => s.persisted);
  const speed = useGame((s) => s.speed);

  return (
    <section className="panel">
      <h2 className="panel-heading">Saves</h2>
      <p className="muted">
        Each slot autosaves every 30 seconds and at each breakthrough, and keeps the previous
        autosave as a backup. Export is the only way to move a life to another device.
      </p>
      <ul className="slots">
        {slots.map((info) => (
          <SlotRow key={info.slot} info={info} />
        ))}
      </ul>
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
