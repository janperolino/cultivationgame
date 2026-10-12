// The Character screen (design § UI and screens): the talents rolled at birth, the six attributes,
// each ladder's growth realm by realm with the methods that built it, and the manuals held, by
// kind. Fame and standing join in M5.
import { LADDERS, type LadderId } from '../content/cultivation.ts';
import { ELEMENT_INFO } from '../content/elements.ts';
import { GROWTH_STATS, method } from '../content/methods.ts';
import { origin } from '../content/origins.ts';
import { realm } from '../content/realms.ts';
import { root } from '../content/roots.ts';
import { statInfo, type StatId } from '../content/stats.ts';
import { talentEffects } from '../content/talents.ts';
import { realmGrowth } from '../core/growth.ts';
import { agility, aptitude, fortune, stats, talentAwake, talentsOf } from '../core/stats.ts';
import type { Cultivator } from '../core/state.ts';
import { TalentRow } from './CreationScreen.tsx';
import { ManualsPanel } from './ManualsPanel.tsx';
import {
  capitalize,
  formatEffect,
  formatLadder,
  formatPercent,
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
      why: birth(c.attributes.agility, agility(c), 'Turn order, evasion and fleeing, from M2.'),
    },
    {
      name: 'Fortune',
      value: String(fortune(c)),
      why: birth(
        c.attributes.fortune,
        fortune(c),
        'Crits and drops from M2; luck checks on cards now.',
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

function Growth({ c, which }: { c: Cultivator; which: LadderId }) {
  const realms = realmGrowth(c[which]).filter((r) => r.climbed > 0);
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
        <h2 className="panel-heading">Growth</h2>
        <p className="caption">
          Each stage keeps the growth of the method that climbed it; the current realm counts most.
        </p>
        {LADDERS.every((l) => realmGrowth(c[l]).every((r) => r.climbed === 0)) ? (
          <p className="muted spaced">No stage climbed yet.</p>
        ) : (
          LADDERS.map((l) => <Growth key={l} c={c} which={l} />)
        )}
      </section>
      <ManualsPanel c={c} />
    </>
  );
}
