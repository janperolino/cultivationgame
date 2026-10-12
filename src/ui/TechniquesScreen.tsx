// The Techniques screen (design § UI and screens): every technique with its rarity, line,
// mastery level, requirements and what is still sealed, its kin, and which one practice days go
// to.
import { MASTERY } from '../content/mastery.ts';
import { rarity } from '../content/rarity.ts';
import { REALMS } from '../content/realms.ts';
import { techniqueChapter, type Technique } from '../content/techniques.ts';
import { dayRates } from '../core/cultivation.ts';
import { hourKindOpen } from '../core/wheel.ts';
import type { Cultivator } from '../core/state.ts';
import {
  canPractice,
  kinshipBonus,
  knownTechniques,
  mastery,
  techniqueCheckBonus,
  techniqueKin,
  techniqueSealed,
} from '../core/techniques.ts';
import { formatNumber, formatPercent, formatRate, LADDER_LABELS } from './format.ts';
import { RarityName } from './MethodCard.tsx';
import { useGame } from './store.ts';
import { Why } from './widgets.tsx';

const capital = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

function TechniqueCard({ c, t }: { c: Cultivator; t: Technique }) {
  const practice = useGame((s) => s.practice);
  const m = mastery(c, t.id);
  const level = MASTERY[m.level]!;
  const next = MASTERY[m.level + 1];
  const sealed = techniqueSealed(c, t);
  const practicing = c.practicing === t.id;
  const realmName = REALMS[t.tier - 1]!.name;
  const ladder = LADDER_LABELS[t.ladder].toLowerCase();
  const r = rarity(t.rarity);
  const lineName = techniqueChapter(t.line, 1)?.name ?? t.name;
  const kin = techniqueKin(c, t.id);

  return (
    <div className={`technique ${sealed ? 'is-sealed' : ''}`}>
      <div className="ladder-head">
        <h3>
          <RarityName m={t} /> <span className="hanzi">{t.hanzi}</span>
        </h3>
        <span className="caption">{t.pinyin}</span>
      </div>
      <p className="caption">
        {r.name} · chapter {t.chapter} of the {lineName} line
        <Why label="Lines and chapters">
          A line's next chapter needs the one before at Comprehension, and starts a mastery level
          below it, two if it is rarer. The old chapter stays known.
        </Why>
      </p>
      <p className="caption">
        {capital(ladder)} technique, tier {t.tier} ({realmName}) · {t.form} · {t.damage} · power{' '}
        {t.power} · {t.qiCost} qi
        {t.daos.length > 0 && ` · ${t.daos.map(capital).join(', ')} Dao`}
      </p>
      <p className="muted">{t.text}</p>
      {sealed && (
        <p className="warn">
          Sealed until your {ladder} reaches {realmName}: you know it, but can neither use nor
          practice it yet.
        </p>
      )}
      <div className="bars">
        <div className="bar-row">
          <span className="label">
            {level.name} <span className="hanzi">{level.hanzi}</span>
          </span>
          <div
            className="bar"
            role="progressbar"
            aria-label={`${t.name} mastery toward ${next?.name ?? 'its peak'}`}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={Math.round(m.fraction * 100)}
          >
            <div className="bar-fill" style={{ width: `${m.fraction * 100}%` }} />
          </div>
          <span className="value">
            {m.next === null ? 'Origin' : `${formatNumber(m.practice)} / ${formatNumber(m.next)}`}
          </span>
        </div>
      </div>
      <p className="caption spaced">
        +{techniqueCheckBonus(c, t.id)} to checks with it
        {r.check > 0 && ` (+${r.check} for its rarity)`}
        {next
          ? `; ${next.name} at ${formatNumber(m.next ?? 0)} practice days`
          : '; mastery is complete'}
        . {capital(t.source)}.
      </p>
      {kin.length > 0 && (
        <p className="caption">
          Kin to {kin.map((k) => k.name).join(' and ')}: practice +
          {formatPercent(kinshipBonus(c, t.id))}
          <Why label="How kinship works">
            Two techniques of different lines that share a Dao and a form speed each other's
            practice while one sits at Comprehension or above. Mastery doesn't carry over.
          </Why>
        </p>
      )}
      <div className="actions">
        <button
          type="button"
          className="button"
          aria-pressed={practicing}
          disabled={!canPractice(c, t.id) && !practicing}
          onClick={() => practice(practicing ? null : t.id)}
        >
          {practicing ? 'Practicing · stop' : 'Practice this'}
        </button>
      </div>
    </div>
  );
}

export function TechniquesScreen() {
  const game = useGame((s) => s.game);
  if (!game) return null;
  const c = game.player;
  const known = knownTechniques(c);
  const rates = dayRates(c, game.calendar.day);
  const hoursOpen = hourKindOpen(c, 'practice');

  return (
    <>
      <section className="panel">
        <p className="muted">
          Practice days raise mastery from Glimpse through Comprehension, Mastery and Domain to
          Origin, and each level adds +2 to checks with the technique.
        </p>
        <p className="caption spaced">
          {!hoursOpen
            ? 'Practice hours open once you know a technique you can use.'
            : rates.practice > 0
              ? `Practice gets ${rates.count.practice} of the day's twelve hours: ${formatRate(rates.practice)} practice days a day. Set hours on the Cultivate wheel.`
              : rates.count.practice === 0
                ? 'No hour of the day goes to practice: give it one on the Cultivate wheel.'
                : 'Practice hours go nowhere: pick a technique below.'}
        </p>
      </section>
      <section className="panel" aria-label="Techniques known">
        {known.length === 0 ? (
          <p className="muted">You know no techniques yet.</p>
        ) : (
          known.map((t) => <TechniqueCard key={t.id} c={c} t={t} />)
        )}
      </section>
    </>
  );
}
