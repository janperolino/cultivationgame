// The Character screen (design § UI and screens): the talents rolled at birth, the six attributes,
// the fighting sheet with each line's band in stage words (design § Combat, the sheet), each
// ladder's growth realm by realm with the methods that built it and the grade of the breakthrough
// that opened it (D2.1), and the manuals held, by kind.
// Fame and standing join in M5.
import { GRADES, LADDERS, type GradeId, type LadderId } from '../content/cultivation.ts';
import { ELEMENT_INFO } from '../content/elements.ts';
import { GROWTH_STATS, method } from '../content/methods.ts';
import { origin } from '../content/origins.ts';
import { realm, realmIndex } from '../content/realms.ts';
import { root } from '../content/roots.ts';
import { statInfo, type StatId } from '../content/stats.ts';
import { talentEffects } from '../content/talents.ts';
import { COMBAT_DAOS, isCombatDao } from '../content/daos.ts';
import { hasItem, item } from '../content/items.ts';
import { fromCultivator, sheet, type SheetLine } from '../core/combat/combatant.ts';
import { realmGrowth } from '../core/growth.ts';
import { agility, aptitude, fortune, stats, talentAwake, talentsOf } from '../core/stats.ts';
import type { Cultivator } from '../core/state.ts';
import { TalentRow } from './CreationScreen.tsx';
import { manualCount } from '../core/manuals.ts';
import { go } from './nav.ts';
import {
  capitalize,
  formatEffect,
  formatLadder,
  formatNumber,
  formatPercent,
  gradeEchoes,
  gradeGives,
  LADDER_LABELS,
  listWords,
} from './format.ts';
import { useGame } from './store.ts';
import { Why } from './widgets.tsx';

const signed = (x: number) => `${x >= 0 ? '+' : '−'}${Math.round(Math.abs(x) * 100)}%`;

function growthLine(growth: Partial<Record<StatId, number>>, which: LadderId): string {
  return GROWTH_STATS[which]
    .map((stat) => `${statInfo(stat).name} ${signed(growth[stat] ?? 0)}`)
    .join(' · ');
}

function Talents({ c }: { c: Cultivator }) {
  const r = root(c.root);
  const elements = listWords(c.rootElements.map((e) => ELEMENT_INFO[e].name.toLowerCase()));
  return (
    <ul className="talents">
      <TalentRow
        kind="Spirit root"
        name={r.name}
        hanzi={r.hanzi}
        rarity={r.grade}
        text={`Holds ${elements}. ${capitalize(r.note)}.`}
        effects={[`Qi speed ×${r.speed} from layer 4`, ...(r.effects ?? []).map(formatEffect)]}
      />
      {talentsOf(c).map((t) => (
        <TalentRow
          key={t.id}
          kind={t.kind[0]!.toUpperCase() + t.kind.slice(1)}
          name={t.name}
          hanzi={t.hanzi}
          rarity={t.rarity}
          text={t.sleeps && !talentAwake(c, t) ? `${t.text} It sleeps.` : t.text}
          effects={talentEffects(t).map(formatEffect)}
        />
      ))}
      {c.origin && (
        <TalentRow
          kind="Origin"
          name={origin(c.origin.id).name}
          hanzi={origin(c.origin.id).hanzi}
          rarity="white"
          text={`${capitalize(origin(c.origin.id).summary)}. On testing day, ${c.origin.choice === 'along' ? 'went along' : 'refused'} and became ${origin(c.origin.id)[c.origin.choice].name}.`}
          effects={[]}
        />
      )}
    </ul>
  );
}

function Attributes({ c }: { c: Cultivator }) {
  const s = stats(c);
  const birth = (base: number, total: number, what: string) =>
    `Base ${base}, talents and the rest ${total - base >= 0 ? '+' : '−'}${Math.abs(total - base)}. ${what}`;
  const rows: { name: string; value: string; why: string }[] = [
    ...LADDERS.map((l) => ({
      name: LADDER_LABELS[l],
      value: formatLadder(c[l]),
      why: `From cultivation, shaped by the methods that climbed each stage: ${growthLine(s, l)}.`,
    })),
    {
      name: 'Agility',
      value: String(agility(c)),
      why: birth(c.attributes.agility, agility(c), 'Turn order, evasion and fleeing.'),
    },
    {
      name: 'Fortune',
      value: String(fortune(c)),
      why: birth(
        c.attributes.fortune,
        fortune(c),
        'Crits in a fight, drops later, and luck checks on cards.',
      ),
    },
    {
      name: 'Aptitude',
      value: String(aptitude(c)),
      why: birth(
        c.attributes.aptitude,
        aptitude(c),
        `Every seclusion gain ${formatPercent(1 + 0.05 * (aptitude(c) - 10))}.`,
      ),
    },
  ];
  return (
    <dl className="attributes">
      {rows.map((r) => (
        <div key={r.name}>
          <dt>{r.name}</dt>
          <dd>
            {r.value} <Why label={`How ${r.name} is worked out`}>{r.why}</Why>
          </dd>
        </div>
      ))}
    </dl>
  );
}

const big = (x: number) => (x >= 100 ? formatNumber(x) : x.toFixed(1));

function SheetRow({
  name,
  lines,
  why,
}: {
  name: string;
  lines: { label?: string; line: SheetLine }[];
  why: string;
}) {
  return (
    <div>
      <dt>
        {name} <Why label={`How ${name} is worked out`}>{why}</Why>
      </dt>
      <dd>
        {lines.map(({ label, line }, i) => (
          <span key={i} className="sheet-line">
            {label && <span className="muted">{label} </span>}
            {big(line.value)} <span className="caption">· {line.band}</span>
          </span>
        ))}
      </dd>
    </div>
  );
}

/** Lines that differ by ladder show each; lines that agree show once. */
function perLadder(x: Record<LadderId, SheetLine>): { label?: string; line: SheetLine }[] {
  const same = LADDERS.every((l) => Math.abs(x[l].value - x.qi.value) < 1e-6);
  return same ? [{ line: x.qi }] : LADDERS.map((l) => ({ label: LADDER_LABELS[l], line: x[l] }));
}

function Sheet({ c }: { c: Cultivator }) {
  const me = fromCultivator(c, 'you');
  const sh = sheet(me);
  const weapon = c.gear.weapon && hasItem(c.gear.weapon) ? item(c.gear.weapon).name : 'bare hands';
  const armor = c.gear.armor && hasItem(c.gear.armor) ? item(c.gear.armor).name : 'no armor';
  const daos = Object.entries(me.daos)
    .filter(([d]) => isCombatDao(d))
    .map(([d, n]) => `${COMBAT_DAOS[d as keyof typeof COMBAT_DAOS].name} ${n}`);
  return (
    <>
      <p className="caption spaced">
        Six plain numbers; a fight compares two sheets. Each line's band says the stage it is sized
        at, so a line that reads the next realm has crossed it.
      </p>
      <dl className="sheet">
        <SheetRow
          name="Accuracy"
          lines={perLadder(sh.accuracy)}
          why="The ladder an action uses sets its size: qi for techniques, body for strikes, soul for soul arts. Mastery, Dao tiers and the Hit stat multiply it per action."
        />
        <SheetRow
          name="Evasion"
          lines={[{ line: sh.evasion }]}
          why="Your body's size, with Agility above 10 adding 5% a point. Defending adds half, cover a quarter."
        />
        <SheetRow
          name="Attack"
          lines={perLadder(sh.attack)}
          why={`Each ladder's size, times technique power for qi and soul, and for the body your physical power and ${weapon} at its band. An art's rarity and its Daos multiply in when you use it.`}
        />
        <SheetRow
          name="Defense"
          lines={[{ line: sh.defense }]}
          why={`Your body's size at your armor's band: ${armor}. The soul defends against soul damage.`}
        />
        <SheetRow
          name="HP"
          lines={[{ line: sh.hp }]}
          why="Ten times your body's size, grown by the methods that tempered it and the Body tree."
        />
        <SheetRow
          name="Qi"
          lines={[{ line: sh.qi }]}
          why="Six times your qi realm's size, deepened by the Qi tree and your methods."
        />
      </dl>
      <p className="caption spaced">
        {daos.length ? `Dao tiers held: ${daos.join(', ')}.` : 'No Dao tier held yet.'} Wielding{' '}
        {weapon}, wearing {armor}.
      </p>
    </>
  );
}

/** The grade of the breakthrough that opened a realm, with what it gives. */
function GradeLine({
  grade,
  realmName,
  echo,
}: {
  grade: GradeId | undefined;
  realmName: string;
  /** A later major has passed it: only its echo still counts. */
  echo: boolean;
}) {
  if (!grade) return null;
  const g = GRADES.find((x) => x.id === grade)!;
  return (
    <div className="caption">
      <span className={`grade-word is-${grade}`}>{g.name}</span> breakthrough:{' '}
      {echo ? `now an echo, ${gradeEchoes(grade)}` : gradeGives(grade, realmName)}
    </div>
  );
}

function Growth({ c, which }: { c: Cultivator; which: LadderId }) {
  const l = c[which];
  const realms = realmGrowth(l).filter((r) => r.climbed > 0);
  if (!realms.length) return null;
  return (
    <div className="growth">
      <h3 className="sub-heading">{LADDER_LABELS[which]}</h3>
      <ul>
        {realms.map((r) => (
          <li key={r.realm}>
            <strong>{realm(r.realm).name}</strong>{' '}
            <span className="muted">
              {r.climbed} of {r.of} stages
            </span>
            <div className="caption">{growthLine(r.growth, which)}</div>
            <GradeLine
              grade={l.grades[realmIndex(r.realm) - 1]}
              realmName={realm(r.realm).name}
              echo={realmIndex(r.realm) < realmIndex(l.realm)}
            />
            <div className="caption">
              Built by{' '}
              {r.methods.map((id) => (id ? method(id).name : 'the world alone')).join(', ')}
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function CharacterScreen() {
  const game = useGame((s) => s.game);
  if (!game) return null;
  const c = game.player;
  return (
    <>
      <section className="panel">
        <h2 className="realm-title">
          {c.name}
          <small>{c.pronouns}</small>
        </h2>
        {c.look && <p className="muted spaced">{c.look}</p>}
      </section>
      <section className="panel">
        <h2 className="panel-heading">Talents</h2>
        <Talents c={c} />
      </section>
      <section className="panel">
        <h2 className="panel-heading">Attributes</h2>
        <Attributes c={c} />
      </section>
      <section className="panel">
        <h2 className="panel-heading">Sheet</h2>
        <Sheet c={c} />
      </section>
      <section className="panel">
        <h2 className="panel-heading">Growth</h2>
        <p className="caption">
          Each stage keeps the growth of the method that climbed it; the current realm counts most.
          Each realm past the first carries the grade of the breakthrough that opened it, and once
          you climb past it, a third of its speed and odds echoes on for life.
        </p>
        {LADDERS.every((l) => realmGrowth(c[l]).every((r) => r.climbed === 0)) ? (
          <p className="muted spaced">No stage climbed yet.</p>
        ) : (
          LADDERS.map((l) => <Growth key={l} c={c} which={l} />)
        )}
      </section>
      <section className="panel">
        <p>
          Manuals:{' '}
          <button
            type="button"
            className="link-button"
            onClick={() => go('trees', { pick: 'manuals' })}
          >
            {manualCount(c)}
          </button>
        </p>
      </section>
    </>
  );
}
