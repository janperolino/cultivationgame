// The Bag (design § UI and screens, § Items and gear; docs/mockups/inventory-study.html): the
// figure with its four gear squares and the treasure slots the trees open, the pack as a grid of
// squares, stones as a count, the toxicity meter, and the thing in hand with its uses, its
// properties and its bond. While a thing is in hand, dragged or picked up, the square it fits
// glows, the right square with an unmet requirement glows in the warning color with a lock, and
// the rest dim; dropping or tapping wears it, and a locked square says why. Dragging a worn thing
// onto the grid takes it off, and every drag has a button beside it for touch.
import { useEffect, useState, type DragEvent } from 'react';
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
  canEquip,
  canUnequip,
  mergeStacks,
  splitStack,
  splitsOf,
  gearBand,
  spiritAwake,
  stonesPerBondDay,
  tiersAbove,
  treasureSlots,
  wornIds,
} from '../core/gear.ts';
import { dropStack, pickUp, pilesHere } from '../core/map/ground.ts';
import { burnSwift } from '../core/map/travel.ts';
import { isNew } from '../core/seen.ts';
import { withPlayer } from '../core/state.ts';
import type { Cultivator } from '../core/state.ts';
import { stats } from '../core/stats.ts';
import { pillDose, toxicityDecay } from '../core/toxicity.ts';
import { formatEffect, formatNumber } from './format.ts';
import { itemTag, toxicityWords, useLines } from './itemWords.ts';
import { itemTipProps } from './itemTip.ts';
import { useNav } from './nav.ts';
import { useGame } from './store.ts';
import { Why } from './widgets.tsx';
import { canPay, purseWords, stonesOf } from '../core/purse.ts';

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
  fresh,
  onPick,
  worn,
  onHold,
}: {
  it: Item;
  n?: number;
  wide?: boolean;
  selected: boolean;
  /** New, never picked up: it glows until it is. */
  fresh?: boolean;
  onPick: () => void;
  worn?: EquipSlot;
  /** Tells the Bag what is being dragged, so the squares it fits can glow. */
  onHold?: (id: string | null) => void;
}) {
  const onDragStart = (e: DragEvent) => {
    e.dataTransfer.setData(DRAG, JSON.stringify({ id: it.id, worn: worn ?? null }));
    e.dataTransfer.effectAllowed = 'move';
    if (!worn) onHold?.(it.id);
  };
  return (
    <button
      type="button"
      className={`bag-item rarity-${it.rarity}${wide ? ' is-wide' : ''}${selected ? ' is-selected' : ''}${fresh ? ' is-new' : ''}`}
      draggable
      onDragStart={onDragStart}
      onDragEnd={() => onHold?.(null)}
      onClick={onPick}
      aria-pressed={selected}
      aria-label={`${it.name}${n && n > 1 ? `, ${n}` : ''}`}
      {...itemTipProps(it.id)}
    >
      <span className="bag-glyph hanzi">{itemGlyph(it)}</span>
      <span className="bag-name">{it.name}</span>
      {n !== undefined && n > 1 && <span className="bag-count">{n}</span>}
    </button>
  );
}

/** How a slot answers the thing in hand: it fits, it is the right slot but locked, or not this one. */
type SlotState = { kind: 'fits' } | { kind: 'locked'; reason: string } | { kind: 'other' } | null;

function slotState(c: Cultivator, slot: EquipSlot, hand: string | null, opened: number): SlotState {
  if (!hand || !hasItem(hand)) return null;
  if (item(hand).uses.equip?.slot !== slot) return { kind: 'other' };
  const check = canEquip(c, hand, opened);
  return check.ok ? { kind: 'fits' } : { kind: 'locked', reason: check.reason };
}

/**
 * A gear square or a treasure slot. While something is in hand (dragged, or picked up from the
 * pack) the square it fits glows, the right square with an unmet requirement glows in the warning
 * color with a lock, and the rest dim. Dropping or tapping wears it; a locked one says why.
 */
function GearSlot({
  c,
  slot,
  label,
  hanzi,
  worn,
  hand,
  opened,
  picked,
  onPick,
  lockedNote,
}: {
  c: Cultivator;
  slot: EquipSlot;
  label: string;
  hanzi: string;
  worn: string | null;
  hand: string | null;
  opened: number;
  picked: string | null;
  onPick: (id: string) => void;
  /** A slot that stays locked whatever is in hand: no treasure slot open yet. */
  lockedNote?: string;
}) {
  const wear = useGame((s) => s.wear);
  const [note, setNote] = useState<string | null>(null);
  const fitsHere = !!hand && hasItem(hand) && item(hand).uses.equip?.slot === slot;
  const state: SlotState = lockedNote
    ? fitsHere
      ? { kind: 'locked', reason: lockedNote }
      : null
    : slotState(c, slot, hand, opened);
  const tell = (reason: string) => {
    setNote(reason);
    setTimeout(() => setNote(null), 2600);
  };
  const tryWear = (id: string) => {
    if (lockedNote) return tell(lockedNote);
    if (item(id).uses.equip?.slot !== slot) return tell(`${item(id).name} doesn't go here.`);
    const why = wear(id);
    if (why) tell(why);
  };
  const onDrop = (e: DragEvent) => {
    e.preventDefault();
    const data = e.dataTransfer.getData(DRAG);
    if (!data) return;
    const { id, worn: from } = JSON.parse(data) as { id: string; worn: EquipSlot | null };
    if (!from) tryWear(id);
  };
  const glow =
    state?.kind === 'fits'
      ? ' is-fits'
      : state?.kind === 'locked'
        ? ' is-locked'
        : state?.kind === 'other'
          ? ' is-dim'
          : '';
  return (
    <div
      className={`bag-slot${glow}`}
      data-label={label}
      title={state?.kind === 'locked' ? state.reason : undefined}
      onDragOver={(e) => e.preventDefault()}
      onDrop={onDrop}
      onClick={(e) => {
        // Tapping a glowing square wears what was picked up from the pack.
        if (e.target !== e.currentTarget || !hand || hand !== picked) return;
        if (state?.kind === 'fits' || state?.kind === 'locked') tryWear(hand);
      }}
    >
      {worn && hasItem(worn) ? (
        <ItemSquare
          it={item(worn)}
          selected={picked === worn}
          onPick={() => onPick(worn)}
          worn={slot}
        />
      ) : (
        <span className="bag-slot-hanzi hanzi" aria-hidden="true">
          {hanzi}
        </span>
      )}
      {state?.kind === 'locked' && (
        <span className="bag-lock" aria-hidden="true">
          锁
        </span>
      )}
      {note && (
        <span className="bag-note" role="status">
          {note}
        </span>
      )}
    </div>
  );
}

/** The seated figure from Cultivate, small, between the gear squares. */
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

const NO_TREASURE_SLOT =
  'No treasure slot is open yet: notables in the Qi and Soul trees open them.';

function Worn({
  c,
  hand,
  picked,
  onPick,
}: {
  c: Cultivator;
  hand: string | null;
  picked: string | null;
  onPick: (id: string) => void;
}) {
  const opened = stats(c).treasureSlots;
  const open = treasureSlots(opened);
  const square = (s: (typeof SQUARES)[number]) => (
    <GearSlot
      key={s.slot}
      c={c}
      {...s}
      worn={c.gear[s.slot]}
      hand={hand}
      opened={opened}
      picked={picked}
      onPick={onPick}
    />
  );
  const holdingTreasure = !!hand && hasItem(hand) && item(hand).uses.equip?.slot === 'treasure';
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
        <div className="bag-gear-col">{SQUARES.slice(0, 2).map(square)}</div>
        <Figure />
        <div className="bag-gear-col">{SQUARES.slice(2).map(square)}</div>
      </div>
      {(open > 0 || holdingTreasure) && (
        <div className="bag-treasures">
          {open === 0 ? (
            <GearSlot
              c={c}
              slot="treasure"
              label="Treasure"
              hanzi="宝"
              worn={null}
              hand={hand}
              opened={opened}
              picked={picked}
              onPick={onPick}
              lockedNote={NO_TREASURE_SLOT}
            />
          ) : (
            Array.from({ length: open }, (_, i) => (
              <GearSlot
                key={i}
                c={c}
                slot="treasure"
                label="Treasure"
                hanzi="宝"
                worn={c.gear.treasures[i] ?? null}
                hand={hand}
                opened={opened}
                picked={picked}
                onPick={onPick}
              />
            ))
          )}
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

/** What the picked stack can do in the pack: split in two, go back on its pile, or be set down. */
function StackActions({
  c,
  id,
  at,
  onDone,
}: {
  c: Cultivator;
  id: string;
  at: number;
  onDone: () => void;
}) {
  const mapAct = useGame((s) => s.mapAct);
  const [why, setWhy] = useState<string | null>(null);
  const stack = bagStacks(c).filter((s) => s.id === id)[at];
  if (!stack) return null;
  const canSplit = splitStack(c, id, at) !== null;
  const split = () =>
    setWhy(
      mapAct((s) => {
        const next = splitStack(s.player, id, at);
        return next
          ? withPlayer(s, next)
          : { ok: false, reason: 'No square is free to split it into.' };
      }),
    );
  return (
    <>
      <div className="actions">
        {stack.n > 1 && (
          <button
            type="button"
            className="button button-quiet"
            disabled={!canSplit}
            title={canSplit ? undefined : 'No square is free to split it into.'}
            onClick={split}
          >
            Split in two
          </button>
        )}
        {splitsOf(c, id).length > 0 && (
          <button
            type="button"
            className="button button-quiet"
            onClick={() => setWhy(mapAct((s) => withPlayer(s, mergeStacks(s.player, id))))}
          >
            Stack together
          </button>
        )}
        <button
          type="button"
          className="button button-quiet"
          onClick={() => {
            const r = mapAct((s) => dropStack(s, id, at));
            setWhy(r);
            if (!r) onDone();
          }}
        >
          Leave {stack.n > 1 ? `all ${stack.n} ` : ''}on the ground
        </button>
      </div>
      {why && <p className="warn">{why}</p>}
    </>
  );
}

/** What lies on the ground within reach, to pick up as far as the pack has room. */
function Ground() {
  const game = useGame((s) => s.game);
  const mapAct = useGame((s) => s.mapAct);
  const [why, setWhy] = useState<string | null>(null);
  if (!game) return null;
  const here = pilesHere(game);
  if (!here.length) return null;
  return (
    <div className="bag-ground" aria-label="On the ground here">
      <h3 className="sub-heading">
        On the ground <span className="hanzi">地上</span>
        <span className="caption">
          Gone a month after it fell
          <Why label="The ground">
            What your pack can't hold falls where you stand, and so does anything you set down. It
            is marked on the map, and lies there a month before someone else takes it.
          </Why>
        </span>
      </h3>
      <ul className="place-work-list">
        {here.map(({ pile, i }) => (
          <li key={i} className="place-work-row">
            <span className="caption">
              {Object.entries(pile.items)
                .map(([id, n]) => (hasItem(id) ? `${item(id).name}${n > 1 ? ` ×${n}` : ''}` : id))
                .join(', ')}
            </span>
            <button type="button" onClick={() => setWhy(mapAct((s) => pickUp(s, i)))}>
              Pick up
            </button>
          </li>
        ))}
      </ul>
      {why && <p className="warn">{why}</p>}
    </div>
  );
}

function Detail({
  c,
  id,
  at,
  onClear,
}: {
  c: Cultivator;
  id: string;
  /** The picked stack among the item's stacks, when picked from the pack. */
  at: number | null;
  onClear: () => void;
}) {
  const wear = useGame((s) => s.wear);
  const takeOff = useGame((s) => s.takeOff);
  const eat = useGame((s) => s.eat);
  const feed = useGame((s) => s.feedStones);
  const mapAct = useGame((s) => s.mapAct);
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
            At gold and red its spirit wakes at Perfection.
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
            disabled={!canUnequip(c, slot, id).ok}
            title={canUnequip(c, slot, id).ok ? undefined : 'Your pack has no room for it.'}
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
        {it.uses.swift && held > 0 && (
          <button
            type="button"
            className="button"
            onClick={() => setWhy(mapAct((s) => burnSwift(s, id)))}
          >
            Burn one for the road
          </button>
        )}
        {bonding && bond.level < 4 && (
          <button
            type="button"
            className="button button-quiet"
            disabled={!canPay(stonesOf(c), feedCost * 10)}
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
      {at !== null && !worn && held > 0 && <StackActions c={c} id={id} at={at} onDone={onClear} />}
    </section>
  );
}

export function BagScreen() {
  const game = useGame((s) => s.game);
  const takeOff = useGame((s) => s.takeOff);
  const [picked, setPicked] = useState<string | null>(null);
  // Which of the picked item's stacks, when it was picked from the pack (a split stack is its own).
  const [pickedAt, setPickedAt] = useState<number | null>(null);
  const [dragging, setDragging] = useState<string | null>(null);
  const see = useGame((s) => s.see);
  // Picking a thing up sees it, so its glow goes; a toast's link arrives with it picked up.
  const pick = (id: string | null, at: number | null = null) => {
    setPicked(id);
    setPickedAt(at);
    if (id) see('item', [id]);
  };
  const target = useNav((s) => (s.screen === 'bag' ? s.select : null));
  const navSeq = useNav((s) => s.seq);
  const [arrived, setArrived] = useState(-1);
  if (target && navSeq !== arrived) {
    setArrived(navSeq);
    setPicked(target);
  }
  useEffect(() => {
    if (!target) return;
    see('item', [target]);
    useNav.setState({ select: null });
  }, [target, see]);
  if (!game) return null;
  const c = game.player;
  // What is in hand: a thing being dragged, else one picked up from the pack (not a worn one).
  const inPack = picked && hasItem(picked) && (c.items[picked] ?? 0) > 0 ? picked : null;
  const hand = dragging ?? inPack;
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
    setDragging(null);
  };
  return (
    <div className="bag-screen">
      <Worn c={c} hand={hand} picked={picked} onPick={pick} />
      <section className="panel">
        <div className="panel-top">
          <h2 className="panel-heading">
            Pack <span className="hanzi">行囊</span>
          </h2>
          <span className="caption">
            {purseWords(c)} · {used} of {cap} squares
            <Why label="Squares">
              Squares, not volume: pills, talismans and herbs stack to 99 a square, ores to 20, gear
              takes one, and a long spear two. The pack holds {PACK_SQUARES} on foot; a pouch and a
              ring add theirs. Stones are a count, never an item.
            </Why>
          </span>
        </div>
        {used > cap && <p className="warn">Over by {used - cap} squares: nothing more fits.</p>}
        <div className="bag-grid" onDragOver={(e) => e.preventDefault()} onDrop={onDropGrid}>
          {stacks.map((s, i) => {
            const at = stacks.slice(0, i).filter((x) => x.id === s.id).length;
            return (
              <ItemSquare
                key={`${s.id}-${i}`}
                it={item(s.id)}
                n={s.n}
                wide={s.squares > 1}
                selected={picked === s.id && (pickedAt === null || pickedAt === at)}
                fresh={isNew(game, 'item', s.id)}
                onPick={() => pick(s.id, at)}
                onHold={setDragging}
              />
            );
          })}
          {Array.from({ length: free }, (_, i) => (
            <span key={`free-${i}`} className="bag-free" aria-hidden="true" />
          ))}
        </div>
        <Toxicity c={c} />
        <Ground />
      </section>
      {shown ? (
        <Detail c={c} id={picked} at={pickedAt} onClear={() => pick(null)} />
      ) : (
        <section className="panel">
          <p className="muted">
            Pick up something to read it. Drag gear onto the square that glows, or pick it up and
            tap the square.
          </p>
        </section>
      )}
    </div>
  );
}
