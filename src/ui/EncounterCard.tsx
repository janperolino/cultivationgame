// An encounter on the map as a card (P3.7, docs/mockups/encounter-study.html): its seal and title,
// how it met you, the narrator's opening line, the people as you read them, what can be won or lost,
// and its exits with the verdict you can judge, your stance's pick outlined. A fight that isn't a
// sure win is played on the stage (Fights you play), and a sure one can be played anyway. It sits
// in the course card, with Go in at its foot: the scene with the narrator (P3.9), saying when your
// life is at stake there, and pointing to Settings without a key.
import { encounterTemplate } from '../content/encounters/index.ts';
import type { Stake, Template } from '../content/encounters/schema.ts';
import { hasItem, item } from '../content/items.ts';
import { realm, stageName } from '../content/realms.ts';
import {
  canGoRound,
  chooseExit,
  exitViews,
  goRound,
  isBig,
  meet,
  playExit,
  stanceThere,
  type ExitView,
} from '../core/map/encounters.ts';
import type { Encounter, MapLife } from '../core/map/schema.ts';
import { paceOf } from '../core/map/travel.ts';
import { readRealm } from '../core/resolver/check.ts';
import type { GameState } from '../core/state.ts';
import { sealOf } from './encounterSeals.ts';
import { lifeAtStake } from '../core/goin.ts';
import { hasKey } from './ai.ts';
import { goInto } from './goin.ts';
import { go } from './nav.ts';
import { rings } from './beacons.ts';
import { useBeacons } from './useBeacons.ts';
import type { useGame } from './store.ts';

type Act = (change: Parameters<ReturnType<typeof useGame.getState>['mapAct']>[0]) => string | null;

const lower = (t: string) => t.charAt(0).toLowerCase() + t.slice(1);

function thingName(id: string): string {
  const base = id.split('~')[0]!;
  return hasItem(base) ? item(base).name : base;
}

function stakeWords(k: Stake): string | null {
  switch (k.do) {
    case 'loot':
      return 'what they carry';
    case 'find':
      return k.things.map(thingName).join(' or ');
    case 'item':
      return k.n > 0 ? `${k.n} ${thingName(k.id)}` : null;
    case 'stones':
      return k.n > 0 ? `${k.n} low-grade` : `${-k.n} low-grade paid`;
    case 'fuel':
      return 'a breath of qi';
    case 'site':
      return 'a hidden place';
    case 'wound':
      return `a wound, ${Math.round(k.share * 100)}% for ${k.days} days`;
    case 'robbed':
      return `${k.share === 0.5 ? 'half' : `${Math.round(k.share * 100)}% of`} your stones${k.item ? ' and a thing from the bag' : ''}`;
    case 'hours':
      return `${k.n} hours`;
    case 'karma':
      return null;
    default:
      return null;
  }
}

/** What the card puts at stake: the best exit's win, and what a fall costs. */
function stakesOf(t: Template): [string, string][] {
  const out: [string, string][] = [];
  const main = t.exits.find((e) => e.road === 'fight' || e.road === 'take') ?? t.exits[0]!;
  const win = (main.pass.stakes ?? []).map(stakeWords).filter(Boolean).join(', ');
  if (win) out.push([main.road === 'take' ? 'Find' : 'Win', win]);
  const lose = t.exits
    .flatMap((e) => e.short?.stakes ?? [])
    .map(stakeWords)
    .filter(Boolean);
  const fight = t.exits.some((e) => e.road === 'fight');
  if (lose.length) out.push(['Short', [...new Set(lose)].join(', ')]);
  else if (fight) out.push(['Short', 'a wound, 30% for 10 days']);
  return out;
}

function howWords(enc: Encounter, s: GameState, life: MapLife, t: Template): string {
  const kind = t.goal ? `${t.goal.replace('-', ' ')}` : t.kind;
  if (enc.state === 'waiting')
    return enc.how === 'found'
      ? `${kind} · found you first · it waits for you`
      : enc.how === 'sprung'
        ? `${kind} · sprung on you · it waits for you`
        : `${kind} · it waits for you`;
  const li = Math.hypot(enc.at[0] - life.at[0], enc.at[1] - life.at[1]);
  const hours = Math.max(1, Math.round((li / Math.max(1, paceOf(s))) * 2));
  return `${kind} · sensed ${Math.round(li)} li ahead · you reach it in about ${hours} hours`;
}

export function EncounterCard({
  game,
  life,
  enc,
  act,
  say,
}: {
  game: GameState;
  life: MapLife;
  enc: Encounter;
  act: Act;
  say: (t: string) => void;
}) {
  const t = encounterTemplate(enc.template);
  const m = meet(game, enc);
  const views = exitViews(game, m);
  // What the stance does while you're there: a sure fight it settles, and Bold plays the rest.
  const there = stanceThere(t, views, life.stance);
  const pick = there && 'settle' in there ? there.settle : null;
  const bold = there && 'play' in there ? there.play : null;
  const play = (v: ExitView) =>
    act((s) => playExit(s, enc.id, v.i) ?? { ok: false, reason: 'That fight can’t start now.' });
  const danger = enc.how !== 'seen';
  const keyed = hasKey();
  const ringed = rings(useBeacons(), 'go-in');
  const stake = lifeAtStake(game, enc);
  const roles = t.roles
    .map((r) => {
      const as = m.roles[r.id] ?? [];
      const a = as[0];
      if (!a) return null;
      const read = readRealm(m.you, a);
      const words =
        read.kind === 'beyond'
          ? '?  you can’t see through it'
          : `${realm(read.realm.realm).name}, ${stageName(read.realm.realm, read.realm.stage)}`;
      return {
        name: as.length > 1 ? `${as.length} ${r.name.replace(/^(a|an|two|three) /, '')}` : r.name,
        words,
        q: read.kind === 'beyond',
      };
    })
    .filter((x): x is { name: string; words: string; q: boolean } => !!x);
  const foot = isBig(t)
    ? 'This one always waits for you.'
    : enc.state === 'waiting'
      ? pick !== null
        ? `Your stance would take “${lower(views[pick]!.exit.label)}” now; choose it, or change the stance.`
        : 'Nothing here was clear enough for your stance, so it waits and the course has stopped.'
      : pick !== null
        ? `Leave it, and your stance takes “${lower(views[pick]!.exit.label)}” when you reach it.`
        : bold !== null
          ? `Leave it, and Bold goes into “${lower(views[bold]!.exit.label)}” with you when you reach it.`
          : canGoRound(enc) && life.stance === 'avoid'
            ? 'Your stance would go round it.'
            : 'Nothing here is clear enough for your stance: it will wait for you and stop the course.';
  return (
    <section className={`enc-card${danger ? ' is-danger' : ''}`} aria-label={t.title}>
      <div className="enc-head">
        <span className={`enc-seal is-${t.kind}${danger ? ' is-danger' : ''}`}>{sealOf(t)}</span>
        <div>
          <h4>{t.title}</h4>
          <div className="enc-sub">{howWords(enc, game, life, t)}</div>
        </div>
      </div>
      <p className="enc-opening">{t.opening}</p>
      {roles.length > 0 && (
        <div className="enc-reads">
          {roles.map((r) => (
            <div key={r.name} className="enc-read">
              <span>{r.name}</span>
              <span className={r.q ? 'is-q' : ''}>{r.words}</span>
            </div>
          ))}
        </div>
      )}
      <div className="enc-stakes">
        {stakesOf(t).map(([a, b]) => (
          <span key={a}>
            <b>{a}</b> {b}
          </span>
        ))}
      </div>
      <div className="enc-exits">
        {views.map((v) => {
          const tag =
            v.judged === '?'
              ? '?'
              : v.exit.road === 'pass' || v.exit.road === 'take' || v.exit.road === 'deal'
                ? 'sure'
                : v.judged;
          // A fight that isn't a sure win is played on the stage.
          const played = v.exit.road === 'fight' && !v.sure;
          return (
            <div key={v.i} className="enc-exit-row">
              <button
                type="button"
                className={`enc-exit${pick === v.i || bold === v.i ? ' is-stance' : ''}`}
                disabled={!!v.refused}
                title={v.refused ?? undefined}
                onClick={() =>
                  played
                    ? play(v)
                    : act((s) => {
                        const r = chooseExit(s, enc.id, v.i);
                        if (!r) return { ok: false, reason: 'That can’t be done now.' };
                        say(r.text);
                        return { ok: true, state: r.state };
                      })
                }
              >
                <span>
                  <span className="enc-exit-name">
                    {v.exit.label}
                    {(pick === v.i || bold === v.i) && <i> · your stance</i>}
                  </span>
                  <span className="enc-why">
                    {v.refused ?? (played ? `${v.why} · you play it` : v.why)}
                  </span>
                </span>
                <span
                  className={`enc-v is-${v.judged === '?' ? 'q' : tag === 'sure' ? 'sure' : v.judged}`}
                >
                  {v.sure ? 'sure' : tag}
                </span>
              </button>
              {v.sure && !v.refused && (
                <button type="button" className="button button-quiet" onClick={() => play(v)}>
                  Play it
                </button>
              )}
            </div>
          );
        })}
        {canGoRound(enc) && (
          <button
            type="button"
            className={`enc-exit${life.stance === 'avoid' ? ' is-stance' : ''}`}
            onClick={() => act((s) => goRound(s, enc.id))}
          >
            <span>
              <span className="enc-exit-name">Go round</span>
              <span className="enc-why">60 li cross-country more · it hasn’t noticed you</span>
            </span>
            <span className="enc-v is-sure">sure</span>
          </button>
        )}
        <button
          type="button"
          className={`enc-exit is-goin${stake ? ' is-stake' : ''}${ringed ? ' beacon-ring' : ''}`}
          data-guide="go-in"
          title={keyed ? undefined : 'Going in needs an OpenRouter key: add one in Settings.'}
          onClick={() => {
            if (!keyed) {
              go('settings');
              return;
            }
            const why = goInto(enc.id);
            if (why) say(why);
          }}
        >
          <span>
            <span className="enc-exit-name">Go in</span>
            <span className="enc-why">
              {!keyed
                ? 'needs an OpenRouter key · Settings'
                : stake
                  ? 'the scene, with the narrator · your life is at stake'
                  : 'the scene, with the narrator · the exits you tried stay spent'}
            </span>
          </span>
          <span className={`enc-v ${stake ? 'is-short' : 'is-sure'}`}>
            {stake ? 'life' : 'scene'}
          </span>
        </button>
      </div>
      <p className="enc-foot">{foot}</p>
    </section>
  );
}
