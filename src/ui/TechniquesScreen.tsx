// The Techniques screen (design § UI and screens): every technique with its mastery level,
// requirements and what is still sealed, and which one practice days go to.
import { REALMS } from '../content/realms.ts';
import { MASTERY, type Technique } from '../content/techniques.ts';
import { dayRates, openSlots } from '../core/cultivation.ts';
import type { Cultivator } from '../core/state.ts';
import {
  canPractice,
  knownTechniques,
  mastery,
  masteryCheckBonus,
  techniqueSealed,
} from '../core/techniques.ts';
import { formatNumber, formatPercent, LADDER_LABELS } from './format.ts';
import { useGame } from './store.ts';

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

  return (
    <div className={`technique ${sealed ? 'is-sealed' : ''}`}>
      <div className="ladder-head">
        <h3>
          {t.name} <span className="hanzi">{t.hanzi}</span>
        </h3>
        <span className="caption">{t.pinyin}</span>
      </div>
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
        +{masteryCheckBonus(c, t.id)} to checks with it
        {next
          ? `; ${next.name} at ${formatNumber(m.next ?? 0)} practice days`
          : '; mastery is complete'}
        . {capital(t.source)}.
      </p>
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
  const slotOpen = openSlots(c).includes('practice');

  return (
    <>
      <section className="panel">
        <p className="muted">
          Practice days raise mastery from Glimpse through Comprehension, Mastery and Domain to
          Origin, and each level adds +2 to checks with the technique.
        </p>
        <p className="caption spaced">
          {!slotOpen
            ? 'Practice opens once you know a technique you can use.'
            : rates.practice > 0
              ? `Practice gets ${formatPercent(rates.shares.practice)} of each seclusion day: ${rates.practice.toFixed(2)} practice days a day. Change the share on the Cultivate screen.`
              : 'Practice days go nowhere: pick a technique below.'}
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
