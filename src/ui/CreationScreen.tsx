// Character creation (design § Character creation): name, look and pronouns with ironman or
// gentle; the five-talent roll with three free rerolls; the origin's childhood; testing day and
// its choice. About three minutes, then the life begins.
import { useMemo, useState } from 'react';
import { ELEMENT_INFO } from '../content/elements.ts';
import {
  FAMILY_NAMES,
  GIVEN_NAMES,
  origin,
  PRONOUN_CHOICES,
  type OriginChoice,
} from '../content/origins.ts';
import { root } from '../content/roots.ts';
import { talent, talentEffects } from '../content/talents.ts';
import { FREE_REROLLS, rollFor, type TalentRoll } from '../core/creation.ts';
import { capitalize, formatEffect, listWords } from './format.ts';
import { useGame } from './store.ts';

type Step = 'who' | 'talents' | 'childhood' | 'testing';

const pick = <T,>(xs: readonly T[]) => xs[Math.floor(Math.random() * xs.length)]!;

export function TalentRow({
  kind,
  name,
  hanzi,
  rarity,
  text,
  effects,
}: {
  kind: string;
  name: string;
  hanzi?: string;
  rarity: string;
  text: string;
  effects: string[];
}) {
  return (
    <li className="talent">
      <span className="talent-kind">{kind}</span>
      <span className="talent-name">
        <span className={`rarity-${rarity}`}>{name}</span>
        {hanzi && <span className="hanzi muted"> {hanzi}</span>}
      </span>
      <span className="talent-text">{text}</span>
      {effects.length > 0 && <span className="caption">{effects.join(' · ')}</span>}
    </li>
  );
}

/** The five talents of a roll, as rows. */
export function TalentList({
  roll,
}: {
  roll: Omit<TalentRoll, 'origin'> & { origin?: TalentRoll['origin'] };
}) {
  const r = root(roll.root);
  const elements = listWords(roll.elements.map((e) => ELEMENT_INFO[e].name.toLowerCase()));
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
      {(
        [
          ['Body', roll.body],
          ['Soul', roll.soul],
          ['Fate', roll.fate],
        ] as const
      ).map(([kind, id]) => {
        const t = talent(id);
        return (
          <TalentRow
            key={kind}
            kind={kind}
            name={t.name}
            hanzi={t.hanzi}
            rarity={t.rarity}
            text={t.sleeps ? `${t.text} (Sleeps until it wakes.)` : t.text}
            effects={talentEffects(t).map(formatEffect)}
          />
        );
      })}
      {roll.origin && (
        <TalentRow
          kind="Origin"
          name={origin(roll.origin).name}
          hanzi={origin(roll.origin).hanzi}
          rarity="white"
          text={`${capitalize(origin(roll.origin).summary)}.`}
          effects={[]}
        />
      )}
    </ul>
  );
}

export function CreationScreen() {
  const creating = useGame((s) => s.creating);
  const { cancelCreation, finishCreation } = useGame.getState();
  const [seed] = useState(
    () => `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`,
  );
  const [step, setStep] = useState<Step>('who');
  const [family, setFamily] = useState(() => pick(FAMILY_NAMES));
  const [given, setGiven] = useState(() => pick(GIVEN_NAMES));
  const [look, setLook] = useState('');
  const [pronouns, setPronouns] = useState('they/them');
  const [mode, setMode] = useState<'ironman' | 'gentle'>('ironman');
  const [attempt, setAttempt] = useState(0);
  const [choice, setChoice] = useState<OriginChoice | null>(null);
  const roll = useMemo(() => rollFor(seed, attempt), [seed, attempt]);
  if (!creating) return null;

  const o = origin(roll.origin);
  const name = `${family.trim()} ${given.trim()}`.trim();
  const custom = !PRONOUN_CHOICES.includes(pronouns);

  return (
    <section className="panel creation" aria-labelledby="creation-heading">
      {step === 'who' && (
        <>
          <h2 id="creation-heading" className="panel-heading">
            {creating.next ? 'A new life in the same slot' : 'Who comes to the testing stone?'}
          </h2>
          <div className="creation-fields">
            <label className="field">
              <span>Family name</span>
              <input type="text" value={family} onChange={(e) => setFamily(e.target.value)} />
            </label>
            <label className="field">
              <span>Given name</span>
              <input type="text" value={given} onChange={(e) => setGiven(e.target.value)} />
            </label>
            <button
              type="button"
              className="button button-quiet"
              onClick={() => {
                setFamily(pick(FAMILY_NAMES));
                setGiven(pick(GIVEN_NAMES));
              }}
            >
              Suggest a name
            </button>
          </div>
          <label className="field spaced">
            <span>One line of appearance</span>
            <input
              type="text"
              className="wide"
              value={look}
              placeholder="a scar through one eyebrow, sleeves always rolled"
              onChange={(e) => setLook(e.target.value)}
            />
          </label>
          <div className="field spaced">
            <span>Pronouns</span>
            <div className="seg" role="group" aria-label="Pronouns">
              {PRONOUN_CHOICES.map((p) => (
                <button
                  key={p}
                  type="button"
                  aria-pressed={pronouns === p}
                  onClick={() => setPronouns(p)}
                >
                  {p}
                </button>
              ))}
              <button
                type="button"
                aria-pressed={custom}
                onClick={() => setPronouns(custom ? pronouns : '')}
              >
                other
              </button>
            </div>
            {custom && (
              <input
                type="text"
                aria-label="Your pronouns"
                value={pronouns}
                placeholder="xe/xem"
                onChange={(e) => setPronouns(e.target.value)}
              />
            )}
          </div>
          {!creating.next && (
            <div className="field spaced">
              <span>Saves</span>
              <div className="seg" role="group" aria-label="Save mode">
                <button
                  type="button"
                  aria-pressed={mode === 'ironman'}
                  onClick={() => setMode('ironman')}
                >
                  Ironman
                </button>
                <button
                  type="button"
                  aria-pressed={mode === 'gentle'}
                  onClick={() => setMode('gentle')}
                >
                  Gentle
                </button>
              </div>
              <p className="caption">
                {mode === 'ironman'
                  ? 'One autosave: deaths and betrayals stick.'
                  : 'One rewind to your latest breakthrough, refilled at your next major breakthrough.'}
              </p>
            </div>
          )}
          <div className="actions">
            <button
              type="button"
              className="button"
              disabled={!name}
              onClick={() => setStep('talents')}
            >
              Roll talents
            </button>
            {!creating.next && (
              <button type="button" className="button button-quiet" onClick={cancelCreation}>
                Cancel
              </button>
            )}
          </div>
        </>
      )}

      {step === 'talents' && (
        <>
          <h2 id="creation-heading" className="panel-heading">
            What heaven gave {name}
          </h2>
          <TalentList roll={roll} />
          <p className="caption spaced">
            Each reroll rolls all five again, and the last roll stands. {FREE_REROLLS - attempt}{' '}
            {FREE_REROLLS - attempt === 1 ? 'reroll' : 'rerolls'} left.
          </p>
          <div className="actions">
            <button type="button" className="button" onClick={() => setStep('childhood')}>
              Keep these
            </button>
            <button
              type="button"
              className="button button-quiet"
              disabled={attempt >= FREE_REROLLS}
              onClick={() => setAttempt((a) => a + 1)}
            >
              Reroll all five
            </button>
            <button type="button" className="button button-quiet" onClick={() => setStep('who')}>
              Back
            </button>
          </div>
        </>
      )}

      {step === 'childhood' && (
        <>
          <h2 id="creation-heading" className="panel-heading">
            {o.name} <span className="hanzi muted">{o.hanzi}</span>
          </h2>
          <p>{o.childhood}</p>
          <p>{o.testing}</p>
          <div className="choices">
            {(['along', 'refuse'] as const).map((c) => (
              <button
                key={c}
                type="button"
                className="button choice"
                onClick={() => {
                  setChoice(c);
                  setStep('testing');
                }}
              >
                <strong>{o[c].label}</strong>
                <span className="caption">You become {o[c].name}.</span>
              </button>
            ))}
          </div>
          {attempt < FREE_REROLLS && (
            <div className="actions">
              <button
                type="button"
                className="button button-quiet"
                onClick={() => setStep('talents')}
              >
                Back to the talents
              </button>
            </div>
          )}
        </>
      )}

      {step === 'testing' && choice && (
        <>
          <h2 id="creation-heading" className="panel-heading">
            Testing day
          </h2>
          <p>{o[choice].text}</p>
          <div className="actions">
            <button
              type="button"
              className="button"
              onClick={() =>
                void finishCreation({ name, pronouns, look, mode, roll, choice, seed })
              }
            >
              Begin
            </button>
            <button
              type="button"
              className="button button-quiet"
              onClick={() => setStep('childhood')}
            >
              Choose again
            </button>
          </div>
        </>
      )}
    </section>
  );
}
