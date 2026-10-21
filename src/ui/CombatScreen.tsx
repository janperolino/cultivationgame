// The Combat screen (design § Combat, § UI and screens; § The world, The Combat screen leaves the
// rail): button-only fights. A fight happens to you: it takes the whole stage with the rail hidden
// and the clock held, and ends only by a win, a flight, a surrender, a talk or a fall. Every
// technique shows its hit chance and damage against the selected foe before you press it, and
// every outcome plays as an effect layered from its five tags, with a still flash under reduced
// motion. P3.9 moves the same fight into the scene; only this frame changes.
import { GainRow } from './Gains.tsx';
import { useEffect, useRef } from 'react';
import { realm, stageName } from '../content/realms.ts';
import {
  TALK_STYLES,
  burnTurns,
  combatantIn,
  detonable,
  flagsCost,
  preview,
  type Fight,
  type MainAction,
} from '../core/combat/fight.ts';
import { isCombatDao, type CombatDaoId } from '../content/daos.ts';
import { mod, topRung, type Combatant } from '../core/combat/combatant.ts';
import { stageName as intentName } from '../core/intent.ts';
import type { FightEnd } from '../core/played.ts';
import { FxLayer, type FxShot } from './combatFx.ts';
import {
  act,
  dismissAfter,
  fightTitle,
  leaveFight,
  selectTarget,
  syncFight,
  takePending,
  useFight,
} from './fight.ts';
import { capitalize, formatNumber } from './format.ts';
import { reducedMotion, useSettings } from './settings.ts';
import { useGame } from './store.ts';
import { Why } from './widgets.tsx';
import { rectIn } from './stage.ts';

const END_WORDS: Record<FightEnd, string> = {
  won: 'You bring them down.',
  lost: 'You are brought down.',
  fled: 'You break away.',
  yielded: 'You yield.',
  talked: 'You talk them down: they yield.',
  draw: 'Neither side can go on, and you draw off.',
};

function Meter({
  label,
  value,
  max,
  kind,
}: {
  label: string;
  value: number;
  max: number;
  kind: string;
}) {
  return (
    <div className={`fight-meter fight-${kind}`}>
      <span className="caption">
        {label} {formatNumber(value)}/{formatNumber(max)}
      </span>
      <div
        className="bar"
        role="meter"
        aria-label={label}
        aria-valuemin={0}
        aria-valuemax={max}
        aria-valuenow={value}
      >
        <div className="bar-fill" style={{ width: `${Math.max(0, (value / max) * 100)}%` }} />
      </div>
    </div>
  );
}

/**
 * A mark for each Dao a combatant holds intent in, its stage in the Dao's own words ("剑意"):
 * the hit chances on the buttons already count it (design § The combat Daos, the Intent ladder).
 */
function IntentMarks({ c }: { c: Combatant }) {
  const held = Object.entries(c.intent).filter(([d, n]) => isCombatDao(d) && n > 0);
  if (held.length === 0) return null;
  return (
    <>
      {held.map(([d, n]) => {
        const st = intentName(d as CombatDaoId, n);
        return (
          <span
            key={d}
            className="fight-intent hanzi"
            title={`${st.name} ${st.hanzi}`}
            aria-label={st.name}
          >
            {st.hanzi}
          </span>
        );
      })}
    </>
  );
}

function FighterCard({
  c,
  selected,
  onSelect,
}: {
  c: Combatant;
  selected?: boolean;
  onSelect?: () => void;
}) {
  const r = topRung(c);
  const down = c.state !== 'fighting';
  const body = (
    <>
      <span className="fight-name">
        {c.name}
        <IntentMarks c={c} />
      </span>
      <span className="caption">
        {realm(r.realm).name}, {stageName(r.realm, r.stage)}
        {down ? ` · ${c.state}` : ''}
      </span>
      {c.maxShield > 0 && <Meter label="Shield" value={c.shield} max={c.maxShield} kind="shield" />}
      {c.armor && <Meter label="Armor" value={c.armor.hp} max={c.armor.max} kind="armor" />}
      <Meter label="HP" value={c.hp} max={c.maxHp} kind="hp" />
      <Meter label="Qi" value={c.qi} max={c.maxQi} kind="qi" />
      {(c.statuses.length > 0 || c.burning !== undefined || c.weakened) && (
        <span className="caption fight-statuses">
          {[
            ...c.statuses.map((s) => `${s.id} (${s.turns})`),
            // A burning pill (K11): the blood alight to its last turn, then weak for the day.
            ...(c.burning !== undefined ? [`blood burning, to exchange ${c.burning}`] : []),
            ...(c.weakened ? ['weakened'] : []),
          ].join(' · ')}
        </span>
      )}
    </>
  );
  return onSelect ? (
    <button
      type="button"
      data-fighter={c.id}
      className={`fight-card${selected ? ' is-selected' : ''}${down ? ' is-down' : ''}`}
      aria-pressed={selected}
      disabled={down}
      onClick={onSelect}
    >
      {body}
    </button>
  ) : (
    <div data-fighter={c.id} className={`fight-card is-you${down ? ' is-down' : ''}`}>
      {body}
    </div>
  );
}

/** A main-action button with its price against the selected foe: "Hit 57% · 25 fire · 12 qi". */
function ActionButton({
  f,
  me,
  m,
  name,
  extra,
  disabled,
}: {
  f: Fight;
  me: string;
  m: MainAction;
  name: string;
  extra?: string;
  disabled?: boolean;
}) {
  const p = preview(f, me, m);
  const cant = disabled || ((m.type === 'technique' || m.type === 'strike') && !p);
  const price = p
    ? `Hit ${Math.round(p.chance * 100)}% · ${formatNumber(p.damage)}${extra ? ` ${extra}` : ''}${p.qi ? ` · ${p.qi} qi` : ''}`
    : (extra ?? '');
  return (
    <button
      type="button"
      className="button fight-action"
      disabled={cant}
      onClick={() => act({ main: m })}
    >
      <span>{name}</span>
      {price && <span className="caption">{price}</span>}
    </button>
  );
}

function Arena({ f, me }: { f: Fight; me: Combatant }) {
  const target = useFight((s) => s.target);
  const pending = useFight((s) => s.pending);
  const settings = useSettings();
  const canvas = useRef<HTMLCanvasElement>(null);
  const arena = useRef<HTMLDivElement>(null);
  const layer = useRef<FxLayer | null>(null);

  useEffect(() => {
    if (!canvas.current || !arena.current) return;
    layer.current = new FxLayer(canvas.current, arena.current);
    return () => layer.current?.dispose();
  }, []);

  useEffect(() => {
    if (!pending || !layer.current || !arena.current) return;
    const box = rectIn(arena.current);
    const where = (id: string) => {
      const el = arena.current!.querySelector(`[data-fighter="${CSS.escape(id)}"]`);
      const r = el && rectIn(el);
      return r
        ? { x: r.left + r.width / 2 - box.left, y: r.top + r.height / 2 - box.top }
        : { x: box.width / 2, y: box.height / 2 };
    };
    const shots: FxShot[] = pending.outcomes.map((o) => ({
      form: o.form,
      type: o.type,
      realm: o.realm,
      result: o.result,
      status: o.status,
      from: where(o.actor),
      to: where(o.target ?? o.actor),
      damage: o.damage,
    }));
    layer.current.play(shots, reducedMotion(settings));
    takePending();
  }, [pending, settings]);

  const foes = f.combatants.filter((c) => c.side !== me.side);
  return (
    <div className="fight-arena" ref={arena}>
      <div className="fight-side">
        <FighterCard c={me} />
      </div>
      <div className="fight-side">
        {foes.map((c) => (
          <FighterCard
            key={c.id}
            c={c}
            selected={c.id === target}
            onSelect={() => selectTarget(c.id)}
          />
        ))}
      </div>
      <canvas className="fight-fx" ref={canvas} aria-hidden="true" />
    </div>
  );
}

/** What a fight item does, in a word under its button. */
function itemWord(it: Combatant['items'][string]['item']): string {
  const u = it.uses;
  if (u.fight) return u.fight.damage;
  if (u.ward) return 'a gold ward over your shield';
  if (u.fix) return u.fix.keep ? 'holds a foe, once a fight' : 'holds a foe a turn';
  if (u.escape) return `a sure flee through the ${u.escape.through}`;
  if (u.burn) return `a realm step for ${burnTurns(it)} turns, then weak for the day`;
  return 'restores';
}

/**
 * The arts that burn goods (K11): a volley art with each stack of strike talismans, a piece blown
 * apart, and flags set mid-fight, each priced against the foe you picked.
 */
function BurnGoods({ f, me, target }: { f: Fight; me: Combatant; target: string }) {
  const held = Object.values(me.items).filter((h) => h.n > 0);
  const volleys = Object.values(me.techniques)
    .map((k) => k.technique)
    .filter((t) => t.volley && (me.talismanTier ?? 0) >= t.tier);
  const talismans = held.filter((h) => h.item.uses.fight);
  const pieces = held.filter((h) => detonable(h.item));
  const flags = me.marks.flags
    ? []
    : held.filter((h) => {
        const does = h.item.uses.array?.does;
        return does === 'warding' || does === 'binding' || does === 'killing' || does === 'maze';
      });
  if (!volleys.length && !pieces.length && !flags.length) return null;
  return (
    <>
      <h3 className="sub-heading">
        Burn goods
        <Why label="Arts that burn goods">
          A volley throws its count of one stack at once, each talisman at full power, for the art's
          qi once. A piece blown apart strikes its tier's blast at five times its strike and never
          misses; it is gone. Flags set now stand for you to the fight's end, drawing their eye from
          your stones, and you take them up again if you hold the field.
        </Why>
      </h3>
      <div className="fight-actions">
        {volleys.flatMap((t) =>
          talismans.map((h) => {
            const p = preview(f, me.id, { type: 'item', id: h.item.id, target });
            const n = Math.min(t.volley!, h.n);
            return (
              <button
                key={`${t.id}:${h.item.id}`}
                type="button"
                className="button fight-action"
                disabled={!p}
                onClick={() => act({ main: { type: 'volley', id: t.id, item: h.item.id, target } })}
              >
                <span>
                  {t.name}: {h.item.name} ×{n}
                </span>
                {p && (
                  <span className="caption">
                    Hit {Math.round(p.chance * 100)}% · {formatNumber(p.damage)} each
                  </span>
                )}
              </button>
            );
          }),
        )}
        {pieces.map((h) => (
          <ActionButton
            key={h.item.id}
            f={f}
            me={me.id}
            m={{ type: 'detonate', id: h.item.id, target }}
            name={`Blow apart the ${h.item.name}`}
            extra="sure, and it is gone"
          />
        ))}
        {flags.map((h) => {
          const cost = flagsCost(h.item);
          return (
            <button
              key={h.item.id}
              type="button"
              className="button button-quiet fight-action"
              disabled={(me.stones ?? 0) < cost}
              onClick={() => act({ main: { type: 'flags', id: h.item.id } })}
            >
              <span>Set the {h.item.name}</span>
              <span className="caption">
                {h.item.uses.array!.does}, {formatNumber(cost)} low for its eye
              </span>
            </button>
          );
        })}
      </div>
    </>
  );
}

function Actions({ f, me }: { f: Fight; me: Combatant }) {
  const target = useFight((s) => s.target) ?? '';
  const end = useFight((s) => s.end);
  if (end) return null;
  // A beast hears no words: no talk, no surrender.
  const heard = !combatantIn(f, target)?.beast;
  // A volley art throws its talismans (Burn goods), never on its own.
  const techniques = Object.values(me.techniques).filter((k) => !k.technique.volley);
  const items = Object.values(me.items).filter(
    (h) =>
      h.n > 0 &&
      (h.item.uses.fight ||
        h.item.uses.ward ||
        h.item.uses.fix ||
        h.item.uses.escape ||
        h.item.uses.burn ||
        h.item.uses.consume?.effects.some((e) => e.effect === 'restore')),
  );
  const flurry = mod(me, 'flurry') > 0 && me.weapon.kind === 'fist';
  return (
    <section className="panel">
      <h2 className="panel-heading">
        Your move
        <Why label="How the odds are worked out">
          Hit chance is your Accuracy over your Accuracy plus their Evasion; damage is the art's
          base times your Attack over their Defense, before the spread and any critical. Pick a foe
          to price every action against them.
        </Why>
      </h2>
      <div className="fight-actions" data-guide="moves">
        {techniques.map(({ technique: t }) => (
          <ActionButton
            key={t.id}
            f={f}
            me={me.id}
            m={{ type: 'technique', id: t.id, target }}
            name={t.name}
            extra={t.damage}
          />
        ))}
        <ActionButton
          f={f}
          me={me.id}
          m={{ type: 'strike', target }}
          name={`Strike (${me.weapon.kind})`}
          extra="physical"
        />
        {flurry && (
          <button
            type="button"
            className="button fight-action"
            onClick={() =>
              act({ minor: { type: 'flurry', target }, main: { type: 'strike', target } })
            }
          >
            <span>Flurry, then strike</span>
            <span className="caption">a fist strike as your minor action</span>
          </button>
        )}
        <button
          type="button"
          className="button button-quiet fight-action"
          onClick={() => act({ main: { type: 'defend' } })}
        >
          <span>Defend</span>
          <span className="caption">Evasion ×1.5, qi back</span>
        </button>
        <button
          type="button"
          className="button button-quiet fight-action"
          onClick={() => act({ minor: { type: 'take_cover' }, main: { type: 'defend' } })}
        >
          <span>Take cover and defend</span>
          <span className="caption">Evasion ×1.5 and ×1.25</span>
        </button>
      </div>
      {items.length > 0 && (
        <>
          <h3 className="sub-heading">Items</h3>
          <div className="fight-actions">
            {items.map((h) => (
              <ActionButton
                key={h.item.id}
                f={f}
                me={me.id}
                m={{ type: 'item', id: h.item.id, target }}
                name={`${h.item.name} (${h.n})`}
                extra={itemWord(h.item)}
              />
            ))}
          </div>
        </>
      )}
      <BurnGoods f={f} me={me} target={target} />
      <h3 className="sub-heading">Words and feet</h3>
      <div className="fight-actions">
        {(heard ? TALK_STYLES : []).map((style) => (
          <button
            key={style}
            type="button"
            className="button button-quiet fight-action"
            onClick={() => act({ main: { type: 'talk', style, target } })}
          >
            <span>{capitalize(style)}</span>
          </button>
        ))}
        <button
          type="button"
          className="button button-quiet fight-action"
          onClick={() => act({ main: { type: 'flee' } })}
        >
          <span>Flee</span>
        </button>
      </div>
    </section>
  );
}

function Log() {
  const log = useFight((s) => s.log);
  const list = useRef<HTMLOListElement>(null);
  // The newest exchange stays in view inside the log, without moving the page.
  useEffect(() => {
    if (list.current) list.current.scrollTop = list.current.scrollHeight;
  }, [log.length]);
  if (log.length === 0) return <p className="muted">The first exchange waits on you.</p>;
  return (
    <ol className="fight-log" ref={list}>
      {log.map((l, i) => (
        <li key={i} className={l.mine ? 'is-mine' : ''}>
          <span className="caption">
            {l.turn}. {l.head}
          </span>{' '}
          {l.line}
        </li>
      ))}
    </ol>
  );
}

export function CombatScreen() {
  const game = useGame((s) => s.game);
  const f = useFight((s) => s.fight);
  const end = useFight((s) => s.end);
  const after = useFight((s) => s.after);
  const afterGains = useFight((s) => s.afterGains);
  // The life's fight comes onto the stage: one the rules just opened, or one a reload brought back.
  useEffect(() => {
    if (game) syncFight(game);
  }, [game]);
  if (!game) return null;
  if (!f) {
    if (!after) return null;
    return (
      <section className="panel fight-after">
        <p>{after}</p>
        <GainRow gains={afterGains} />
        <button type="button" className="button" onClick={dismissAfter}>
          Go on
        </button>
      </section>
    );
  }
  const me = combatantIn(f, game.player.id);
  if (!me) return null;
  return (
    <div className="fight-stage">
      <section className="panel">
        <div className="panel-top">
          <h2 className="panel-heading">{fightTitle(game, f)}</h2>
          <span className="caption">Exchange {f.turn}</span>
        </div>
        <Arena f={f} me={me} />
        {end && (
          <div className="fight-end">
            <p>
              <strong>{END_WORDS[end]}</strong>
            </p>
            <button type="button" className="button" onClick={leaveFight}>
              Go on
            </button>
          </div>
        )}
      </section>
      <div className="fight-stage-lower">
        <Actions f={f} me={me} />
        <section className="panel">
          <h2 className="panel-heading">The exchanges</h2>
          <Log />
        </section>
      </div>
    </div>
  );
}
