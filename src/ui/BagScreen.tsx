// The Bag (design § UI and screens, § Items and gear; docs/mockups/inventory-study.html): the
// figure with its four gear squares and the treasure slots the trees open, the pack as a grid of
// squares, stones as a count, the toxicity meter, and the thing in hand with its uses, its
// properties and its bond. Dragging onto a gear square wears a thing, dragging a worn thing onto
// the grid takes it off, and every drag has a button beside it for touch.
import { useState, type DragEvent } from 'react';
import { PACK_SQUARES } from '../content/gear.ts';
import { MASTERY } from '../content/mastery.ts';
import { TOXICITY_MAX } from '../content/cultivation.ts';
import { hasItem, item, itemGlyph, type EquipSlot, type Item } from '../content/items.ts';
import {
  activeProperties,
  bagCapacity,
  bagStacks,
  bagUsed,
  bondMastery,
  bonds,
  gearBand,
  spiritAwake,
  stonesPerBondDay,
  tiersAbove,
  treasureSlots,
  wornIds,
} from '../core/gear.ts';
import type { Cultivator } from '../core/state.ts';
import { stats } from '../core/stats.ts';
import { pillDose, toxicityDecay } from '../core/toxicity.ts';
import { formatEffect, formatNumber } from './format.ts';
import { itemTag, toxicityWords, useLines } from './itemWords.ts';
import { useGame } from './store.ts';
import { Why } from './widgets.tsx';

const SQUARES: { slot: Exclude<EquipSlot, 'treasure'>; label: string; hanzi: string }[] = [
  { slot: 'weapon', label: 'Weapon', hanzi: '兵' },
  { slot: 'armor', label: 'Armor', hanzi: '甲' },
  { slot: 'ring', label: 'Ring', hanzi: '戒' },
  { slot: 'pouch', label: 'Pouch', hanzi: '袋' },
];

const DRAG = 'text/x-item';

/** One item square: its glyph, name in its rarity color, and a count past one. */
function ItemSquare({
  it,
  n,
  wide,
  selected,
  onPick,
  worn,
}: {
  it: Item;
  n?: number;
  wide?: boolean;
  selected: boolean;
  onPick: () => void;
  worn?: EquipSlot;
}) {
  const onDragStart = (e: DragEvent) => {
    e.dataTransfer.setData(DRAG, JSON.stringify({ id: it.id, worn: worn ?? null }));
    e.dataTransfer.effectAllowed = 'move';
  };
  return (
    <button
      type="button"
      className={`bag-item rarity-${it.rarity}${wide ? ' is-wide' : ''}${selected ? ' is-selected' : ''}`}
      draggable
      onDragStart={onDragStart}
      onClick={onPick}
      aria-pressed={selected}
      aria-label={`${it.name}${n && n > 1 ? `, ${n}` : ''}`}
    >
      <span className="bag-glyph hanzi">{itemGlyph(it)}</span>
      <span className="bag-name">{it.name}</span>
      {n !== undefined && n > 1 && <span className="bag-count">{n}</span>}
    </button>
  );
}

function GearSquare({
  c,
  slot,
  label,
  hanzi,
  picked,
  onPick,
}: {
  c: Cultivator;
  slot: Exclude<EquipSlot, 'treasure'>;
  label: string;
  hanzi: string;
  picked: string | null;
  onPick: (id: string) => void;
}) {
  const wear = useGame((s) => s.wear);
  const [refused, setRefused] = useState(false);
  const id = c.gear[slot];
  const onDrop = (e: DragEvent) => {
    e.preventDefault();
    const data = e.dataTransfer.getData(DRAG);
    if (!data) return;
    const { id: dropped, worn } = JSON.parse(data) as { id: string; worn: EquipSlot | null };
    if (worn) return;
    if (item(dropped).uses.equip?.slot !== slot || wear(dropped)) {
      setRefused(true);
      setTimeout(() => setRefused(false), 500);
    }
  };
  return (
    <div
      className={`bag-slot${refused ? ' is-refused' : ''}`}
      data-label={label}
      onDragOver={(e) => e.preventDefault()}
      onDrop={onDrop}
    >
      {id && hasItem(id) ? (
        <ItemSquare it={item(id)} selected={picked === id} onPick={() => onPick(id)} worn={slot} />
      ) : (
        <span className="bag-slot-hanzi hanzi" aria-hidden="true">
          {hanzi}
        </span>
      )}
    </div>
  );
}

/** The seated figure from the Abode, small, between the gear squares. */
function Figure() {
  return (
    <svg className="bag-figure" viewBox="-56 -54 112 100" aria-hidden="true">
      <circle className="seated-head" cx="0" cy="-41" r="9" />
      <path
        className="seated-body"
        fillRule="evenodd"
        d="M0 -31 L-5 -31 C-7 -27 -13 -26 -19 -24 C-26 -21 -28 -14 -28 -6 C-28 2 -30 9 -33 15 C-37 20 -44 22 -49 26 C-54 30 -53 37 -46 39 C-32 43 -14 42 0 42 C14 42 32 43 46 39 C53 37 54 30 49 26 C44 22 37 20 33 15 C30 9 28 2 28 -6 C28 -14 26 -21 19 -24 C13 -26 7 -27 5 -31 Z"
      />
      <circle className="bag-dantian" cx="0" cy="9" r="3" />
    </svg>
  );
}

function Worn({
  c,
  picked,
  onPick,
}: {
  c: Cultivator;
  picked: string | null;
  onPick: (id: string) => void;
}) {
  const open = treasureSlots(stats(c).treasureSlots);
  return (
    <section className="panel">
      <div className="panel-top">
        <h2 className="panel-heading">Worn</h2>
        <span className="caption">
          {open === 0
            ? 'No treasure slot yet'
            : `${c.gear.treasures.length} of ${open} treasure slot${open === 1 ? '' : 's'}`}
          <Why label="Treasure slots">
            A treasure slot holds an artifact that is properties alone: a bead, a jade, a bell. One
            notable in each tier of the Qi tree and one in each tier of the Soul tree opens one, so
            a realm is worth two.
          </Why>
        </span>
      </div>
      <div className="bag-body">
        <div className="bag-gear-col">
          {SQUARES.slice(0, 2).map((s) => (
            <GearSquare key={s.slot} c={c} {...s} picked={picked} onPick={onPick} />
          ))}
        </div>
        <Figure />
        <div className="bag-gear-col">
          {SQUARES.slice(2).map((s) => (
            <GearSquare key={s.slot} c={c} {...s} picked={picked} onPick={onPick} />
          ))}
        </div>
      </div>
      {open > 0 && (
        <div className="bag-treasures">
          {Array.from({ length: open }, (_, i) => {
            const id = c.gear.treasures[i];
            return (
              <div key={i} className="bag-slot" data-label="Treasure">
                {id && hasItem(id) ? (
                  <ItemSquare
                    it={item(id)}
                    selected={picked === id}
                    onPick={() => onPick(id)}
                    worn="treasure"
                  />
                ) : (
                  <span className="bag-slot-hanzi hanzi" aria-hidden="true">
                    宝
                  </span>
                )}
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}

function Toxicity({ c }: { c: Cultivator }) {
  const t = c.toxicity;
  return (
    <div className="bar-row">
      <span className="label">Residue</span>
      <div
        className={`bar${t >= 60 ? ' is-warn' : ''}`}
        role="meter"
        aria-label="Toxicity"
        aria-valuemin={0}
        aria-valuemax={TOXICITY_MAX}
        aria-valuenow={Math.round(t)}
      >
        <div className="bar-fill" style={{ width: `${(t / TOXICITY_MAX) * 100}%` }} />
      </div>
      <span className="caption">
        {toxicityWords(t)}
        <Why label="How toxicity works">
          {Math.round(t)} of {TOXICITY_MAX}. Every pill adds its dose, and every pill's effect is
          scaled by what is already in you ({Math.round(100 - t)}% now). It drains{' '}
          {toxicityDecay(c)} a day. At {TOXICITY_MAX} the ladder the last pill fed unsettles. A qi
          technique deviates a quarter as often as the meter is full.
        </Why>
      </span>
    </div>
  );
}

function Detail({ c, id, onClear }: { c: Cultivator; id: string; onClear: () => void }) {
  const wear = useGame((s) => s.wear);
  const takeOff = useGame((s) => s.takeOff);
  const eat = useGame((s) => s.eat);
  const feed = useGame((s) => s.feedStones);
  const [why, setWhy] = useState<string | null>(null);
  const it = item(id);
  const slot = it.uses.equip?.slot;
  const worn = wornIds(c).includes(id);
  const held = c.items[id] ?? 0;
  const props = it.properties ?? [];
  const active = activeProperties(c, it);
  const bonding = bonds(it);
  const bond = bondMastery(c, id);
  const above = tiersAbove(c, it);
  const band = slot === 'weapon' || slot === 'armor' ? gearBand(c, it) : undefined;
  const eatsOut = it.uses.consume?.effects.some((e) => e.effect !== 'restore');
  const feedCost = stonesPerBondDay(it);
  return (
    <section className="panel bag-detail" aria-live="polite">
      <h2 className={`bag-title rarity-${it.rarity}`}>
        {it.name} <span className="hanzi">{it.hanzi}</span>
      </h2>
      <p className="caption">
        {itemTag(it)}
        {held > 1 ? ` · ${held} held` : ''}
        {worn ? ' · worn' : ''}
      </p>
      <p>{it.text}</p>
      <ul className="bag-uses">
        {useLines(it).map((l) => (
          <li key={l}>{l}</li>
        ))}
      </ul>
      {band === null && <p className="warn">Two realms above yours: it won't wake for you.</p>}
      {band && above > 0 && (
        <p className="warn">
          A realm above yours: it counts half its step, at ×{band.accuracy} Accuracy
          {band.qi > 0
            ? `, and drinks ${Math.round(band.qi * 100)}% of your qi with every strike`
            : ''}
          . The bond eases it.
        </p>
      )}
      {props.length > 0 && (
        <>
          <h3 className="sub-heading">Properties</h3>
          <ul className="bag-props">
            {props.map((p, i) => {
              const on = i < active.length;
              return (
                <li key={p.name} className={on ? '' : 'is-sealed'}>
                  <strong>{p.name}</strong>
                  {p.unique ? ' (unique)' : ''}: {p.effects.map(formatEffect).join(', ')}
                  {!on && ` · wakes at ${MASTERY[i]?.name ?? 'Origin'}`}
                </li>
              );
            })}
          </ul>
        </>
      )}
      {bonding && (
        <p className="caption">
          Bond: {MASTERY[bond.level]!.name}{' '}
          <span className="hanzi">{MASTERY[bond.level]!.hanzi}</span>
          {spiritAwake(c, it) ? ' · its spirit is awake' : ''}
          <Why label="Bonding">
            Artifacts from blue up bond to you by use, Glimpse to Origin: each fight turn worn
            counts a quarter of a day, and stones fed in seclusion count too ({feedCost} a day at
            its tier). Each level wakes one property in order, and eases a weapon above your realm.
            At gold and red its spirit wakes at Domain.
          </Why>
        </p>
      )}
      <div className="actions">
        {slot && !worn && (
          <button type="button" className="button" onClick={() => setWhy(wear(id))}>
            {slot === 'treasure' ? 'Carry in a slot' : 'Wear'}
          </button>
        )}
        {slot && worn && (
          <button
            type="button"
            className="button button-quiet"
            onClick={() => {
              takeOff(slot, id);
              setWhy(null);
            }}
          >
            Take off
          </button>
        )}
        {eatsOut && held > 0 && (
          <button type="button" className="button" onClick={() => eat(id)}>
            Eat one
          </button>
        )}
        {bonding && bond.level < 4 && (
          <button
            type="button"
            className="button button-quiet"
            disabled={c.stones < feedCost * 10}
            onClick={() => feed(id, feedCost * 10)}
          >
            Feed {formatNumber(feedCost * 10)} stones
          </button>
        )}
        <button type="button" className="button button-quiet" onClick={onClear}>
          Put down
        </button>
      </div>
      {eatsOut && held > 0 && pillDose(c, it) > 0 && (
        <p className="caption">Adds {Math.round(pillDose(c, it))} residue.</p>
      )}
      {why && <p className="warn">{why}</p>}
    </section>
  );
}

export function BagScreen() {
  const game = useGame((s) => s.game);
  const takeOff = useGame((s) => s.takeOff);
  const [picked, setPicked] = useState<string | null>(null);
  if (!game) return null;
  const c = game.player;
  const stacks = bagStacks(c);
  const used = bagUsed(c);
  const cap = bagCapacity(c);
  const free = Math.max(0, cap - used);
  const shown =
    picked && hasItem(picked) && ((c.items[picked] ?? 0) > 0 || wornIds(c).includes(picked));
  const onDropGrid = (e: DragEvent) => {
    e.preventDefault();
    const data = e.dataTransfer.getData(DRAG);
    if (!data) return;
    const { id, worn } = JSON.parse(data) as { id: string; worn: EquipSlot | null };
    if (worn) takeOff(worn, id);
  };
  return (
    <div className="bag-screen">
      <Worn c={c} picked={picked} onPick={setPicked} />
      <section className="panel">
        <div className="panel-top">
          <h2 className="panel-heading">
            Pack <span className="hanzi">行囊</span>
          </h2>
          <span className="caption">
            {formatNumber(c.stones)} spirit stones · {used} of {cap} squares
            <Why label="Squares">
              Squares, not volume: pills, talismans and herbs stack to 99 a square, ores to 20, gear
              takes one, and a long spear two. The pack holds {PACK_SQUARES} on foot; a pouch and a
              ring add theirs. Stones are a count, never an item.
            </Why>
          </span>
        </div>
        {used > cap && <p className="warn">Over by {used - cap} squares: nothing more fits.</p>}
        <div className="bag-grid" onDragOver={(e) => e.preventDefault()} onDrop={onDropGrid}>
          {stacks.map((s, i) => (
            <ItemSquare
              key={`${s.id}-${i}`}
              it={item(s.id)}
              n={s.n}
              wide={s.squares > 1}
              selected={picked === s.id}
              onPick={() => setPicked(s.id)}
            />
          ))}
          {Array.from({ length: free }, (_, i) => (
            <span key={`free-${i}`} className="bag-free" aria-hidden="true" />
          ))}
        </div>
        <Toxicity c={c} />
      </section>
      {shown ? (
        <Detail c={c} id={picked} onClear={() => setPicked(null)} />
      ) : (
        <section className="panel">
          <p className="muted">Pick up something to read it. Drag gear onto a square to wear it.</p>
        </section>
      )}
    </div>
  );
}
