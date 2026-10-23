// The go-in screen (P3.9; design § UI and screens, The go-in screen; docs/mockups/go-in-study.html,
// Jan's yes). A scene takes the stage as a fight does: the rail hides and the clock holds, and Leave
// is inside it. Three columns under a static shade, no live blur: where you are (the place and its
// seal, the hour and the time spent, what is here, Leave); the story (each turn your words dim, the
// prose, one quiet line with its numbers behind a "?", then the narrator's suggestions, the box with
// Wait and Leave, or a plan at stake with Do it and Change it, or the readings as buttons); and who
// is here as you know them, then you. The scene's cost sits in a corner.
import { useEffect, useMemo, useRef, useState } from 'react';
import { encounterTemplate } from '../content/encounters/index.ts';
import { BRANCHES } from '../content/hours.ts';
import { DOOR_KINDS } from '../content/doorKinds.ts';
import { hasItem, item } from '../content/items.ts';
import { realm as realmInfo, stageName } from '../content/realms.ts';
import { ACTS, COSTS, SHORTS, type ActInfo } from '../content/resolver.ts';
import {
  fallFate,
  leaveView,
  sceneEncounter,
  tickWords,
  you as youIn,
  type Fate,
} from '../core/goin.ts';
import { exitViews, meet } from '../core/map/encounters.ts';
import { crowdHere, happeningAt, movesHere } from '../core/goinPlace.ts';
import { hereWords } from '../core/map/travel.ts';
import { readRealm } from '../core/resolver/check.ts';
import { opinion } from '../core/resolver/opinion.ts';
import { pinnedBy, previewStep } from '../core/resolver/scene.ts';
import { realmOfActor } from '../core/resolver/actor.ts';
import { woundShare } from '../core/resolver/world.ts';
import type { GameState, GoInTurn } from '../core/state.ts';
import { hourOfDay } from '../core/wheel.ts';
import { sceneView } from '../ai/scene.ts';
import {
  atlasNow,
  changeIt,
  dismissLeaving,
  doIt,
  lastActNow,
  leaveNow,
  lectureNow,
  loadAtlas,
  moveNow,
  quietNow,
  notMeant,
  pickReading,
  say,
  takeExit,
  tellAgain,
  useGoIn,
  wait,
} from './goin.ts';
import { useSettings } from './settings.ts';
import { useGame } from './store.ts';

const KIND_SEAL: Record<string, string> = {
  beast: '兽',
  cultivator: '修',
  mortal: '人',
  place: '地',
  omen: '兆',
  plot: '缘',
};

const FATE_WORDS: Record<Fate, string> = {
  killed: 'means to finish you',
  robbed: 'means to strip you and leave you for dead',
  wounded: 'will leave you where you fell',
  humbled: 'will let you up, and remember you in the dirt',
};

const realmWords = (r: { realm: Parameters<typeof realmInfo>[0]; stage: number }) =>
  `${realmInfo(r.realm).name}, ${stageName(r.realm, r.stage)}`;

/** The verdict's class: clear, close, short or unread. */
const vClass = (v: string | null | undefined) =>
  v === 'clear' ? 'clear' : v === 'close' ? 'close' : v === 'short' ? 'short' : 'unk';

function Turn({ t, last }: { t: GoInTurn; last: boolean }) {
  const [asking, setAsking] = useState(false);
  const [meant, setMeant] = useState('');
  const [kept, setKept] = useState(false);
  return (
    <div className="goin-turn">
      {t.said !== null && (
        <div className="goin-you">
          <span>{t.said}</span>
          {!kept && t.read && (
            <button type="button" className="goin-flag" onClick={() => setAsking((a) => !a)}>
              ⚑ not what I meant
            </button>
          )}
          {kept && <span className="goin-flag is-kept">kept</span>}
        </div>
      )}
      {asking && (
        <form
          className="goin-meant"
          onSubmit={(e) => {
            e.preventDefault();
            if (!meant.trim()) return;
            notMeant(t, meant.trim());
            setAsking(false);
            setKept(true);
          }}
        >
          <input
            className="goin-input"
            value={meant}
            placeholder={`Read as “${t.read}”. What did you mean?`}
            onChange={(e) => setMeant(e.target.value)}
          />
          <button type="submit" className="button button-quiet">
            Keep
          </button>
        </form>
      )}
      <p className="goin-prose">{t.told}</p>
      <div className="goin-line">
        <span>{t.line}</span>
        {t.why && (
          <span className="goin-q" title={t.why}>
            ?
          </span>
        )}
        {last && t.outcome && (
          <button type="button" className="button button-quiet" onClick={() => void tellAgain()}>
            Tell it
          </button>
        )}
      </div>
    </div>
  );
}

/** Inside a place, the seal of the door kind you stand in: 街 on a street, 茶 at a teahouse. */
function placeSeal(g: NonNullable<GameState['goin']>): string {
  const f = g.place!.frames.find((x) => x.id === g.place!.at);
  if (!f || f.kind === 'street' || f.kind === 'alley') return '街';
  return DOOR_KINDS[f.kind].hanzi.slice(0, 1);
}

function Where({ s }: { s: GameState }) {
  const g = s.goin!;
  const enc = sceneEncounter(s);
  const t = enc ? encounterTemplate(enc.template) : null;
  const b = BRANCHES[hourOfDay(s.calendar.day)]!;
  const lv = leaveView(s);
  const busy = useGoIn((u) => u.busy);
  const leaveLabel =
    lv.kind === 'pinned' ? 'Pinned' : lv.kind === 'flee' ? 'Leave · a flight' : 'Leave';
  const leaveWhy =
    lv.kind === 'pinned'
      ? `${lv.by}’s realm pressure pins you: you can only talk, beg or burn a talisman.`
      : lv.kind === 'flee'
        ? lv.burns
          ? `Someone means to stop you. Your ${item(lv.burns).name} burns by rule and takes you out.`
          : `Someone means to stop you: Speed against theirs · ${lv.preview.judged ?? '?'}${lv.preview.short ? ` · if short: ${SHORTS[lv.preview.short]}` : ''}`
        : 'Back to where you went in from.';
  return (
    <aside className="panel goin-where">
      <div className="goin-place">
        <div className="goin-seal hanzi">
          {t ? KIND_SEAL[t.kind] : g.place ? placeSeal(g) : '野'}
        </div>
        <div>
          <h2>{g.title || 'Open ground'}</h2>
          <div className="goin-sub">{enc?.where || hereWords(s)}</div>
        </div>
      </div>
      <div className="goin-clock">
        <span>
          <span className="hanzi">{b.hanzi}</span>
          <b>{b.time}</b>
        </span>
        <span className="muted">{g.scene.tick ? `${tickWords(g.scene.tick)} in` : 'just now'}</span>
      </div>
      {g.scene.features.some((f) => !f.hidden) && (
        <div>
          <p className="goin-label">Here</p>
          <div className="goin-feat">
            {g.scene.features
              .filter((f) => !f.hidden)
              .map((f) => (
                <span key={f.id} title={f.tags.join(' · ')} className={f.broken ? 'is-broken' : ''}>
                  {f.name}
                  {f.tags[0] && <i>{f.tags[0]}</i>}
                </span>
              ))}
          </div>
        </div>
      )}
      {g.place && <Moves s={s} busy={!!busy} />}
      <button
        type="button"
        className="button button-quiet goin-leave"
        title={leaveWhy}
        disabled={lv.kind === 'pinned' || !!busy || g.down}
        onClick={leaveNow}
      >
        {leaveLabel}
      </button>
    </aside>
  );
}

/**
 * The moves inside a place (design § The go-in screen): the doors here, the other districts' streets
 * and the rooms off where you stand, each with its ticks, a barred room with why on hover; somewhere
 * quiet; and a happening under way, the elder's lecture with its question.
 */
function Moves({ s, busy }: { s: GameState; busy: boolean }) {
  const g = s.goin!;
  const moves = movesHere(s);
  const here = g.place!.frames.find((f) => f.id === g.place!.at);
  const h = happeningAt(s, g.place!.id, here, s.calendar.day + g.scene.tick / 48);
  return (
    <div className="goin-moves">
      {h?.on && (
        <div>
          <p className="goin-label">Under way</p>
          <div className="goin-happening">
            <span>
              {h.lecturer.elder} lectures on {h.lecturer.subject}
            </span>
            <button
              type="button"
              className="goin-chip"
              disabled={busy || !h.member}
              onClick={() => lectureNow(false)}
            >
              Sit it
            </button>
            <button
              type="button"
              className="goin-chip"
              disabled={busy || !h.member}
              onClick={() => lectureNow(true)}
            >
              Sit it, and ask
            </button>
          </div>
        </div>
      )}
      <p className="goin-label">Go to</p>
      <div className="goin-move-list">
        {moves.map((m) => (
          <button
            type="button"
            key={m.frame.id}
            className={`goin-move${m.barred ? ' is-barred' : ''}`}
            title={m.barred ?? undefined}
            disabled={busy}
            onClick={() => moveNow(m.frame.id, m.frame.name)}
          >
            <span>{m.frame.name}</span>
            <i>{m.ticks ? tickWords(m.ticks) : 'a step'}</i>
          </button>
        ))}
        <button type="button" className="goin-move" disabled={busy} onClick={quietNow}>
          <span>Somewhere quiet</span>
          <i>a step</i>
        </button>
      </div>
    </div>
  );
}

function Who({ s }: { s: GameState }) {
  const g = s.goin!;
  const ready = useGoIn((u) => u.atlasReady);
  const [tab, setTab] = useState<'carried' | 'arts'>('carried');
  const me = youIn(s);
  const view = useMemo(() => {
    const a = atlasNow();
    return ready && a ? sceneView(s, a) : null;
  }, [s, ready]);
  const people = g.scene.actors.filter(
    (a) =>
      a.id !== s.player.id &&
      a.state !== 'gone' &&
      a.state !== 'fled' &&
      !(a.state === 'hidden' && a.side !== me?.side),
  );
  const pinned = me ? pinnedBy(g.scene, me) : undefined;
  const c = me?.combatant;
  const hp = c ? Math.round((c.hp / Math.max(1, c.maxHp)) * 100) : 100;
  const qi = c ? Math.round((c.qi / Math.max(1, c.maxQi)) * 100) : 100;
  const hurt = woundShare(s.world, s.player.id, s.calendar.day);
  const carried = Object.entries(s.player.items).filter(([, n]) => n > 0);
  return (
    <aside className="panel goin-who">
      <div>
        <p className="goin-label">Who’s here</p>
        <div className="goin-people">
          {people.length === 0 && <div className="goin-crowd">Nobody but you.</div>}
          {people.map((a) => {
            const label = view?.people[a.id]?.label ?? a.name;
            const read = me ? readRealm(me, a) : null;
            // A mortal is a plain actor at the foot of Qi Condensation with nothing learned.
            const mortal =
              !a.npc &&
              !a.combatant &&
              Object.keys(a.techniques).length === 0 &&
              realmOfActor(a).realm === 'qi-condensation' &&
              realmOfActor(a).stage === 1;
            const realmText = mortal
              ? 'mortal'
              : !read || a.side === me?.side
                ? realmWords(realmOfActor(a))
                : read.kind === 'beyond'
                  ? 'you can’t see through them'
                  : realmWords(read.realm);
            const word = opinion(s.world, a.id, s.player.id, s.calendar.day).word;
            const cult = !mortal;
            return (
              <button
                type="button"
                key={a.id}
                className="goin-person"
                title="Name them in the box"
                onClick={() =>
                  useGoIn.setState((u) => ({
                    words: `${u.words}${u.words && !u.words.endsWith(' ') ? ' ' : ''}${label.replace(/,.*$/, '')}`,
                  }))
                }
              >
                <div className={`goin-s hanzi${cult ? ' is-cult' : ''}`}>
                  {(a.name.match(/\p{Script=Han}/u)?.[0] ?? label.charAt(0)).toUpperCase()}
                </div>
                <div>
                  <div className="goin-n">
                    {label.charAt(0).toUpperCase() + label.slice(1)}
                    {a.state !== 'present' && <span className="muted"> · {a.state}</span>}
                  </div>
                  <div className="goin-d">
                    {realmText} · <span className={`is-${word}`}>{word}</span>
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </div>
      {g.place && <Crowd s={s} />}
      <div className="goin-me">
        <p className="goin-label">
          You ·{' '}
          {realmWords(
            realmOfActor(
              me ?? {
                rungs: { qi: s.player.qi, body: s.player.body, soul: s.player.soul } as never,
              },
            ),
          )}
        </p>
        <div className="goin-bar">
          <span>HP</span>
          <div className="goin-track">
            <div className="goin-fill is-hp" style={{ width: `${hp}%` }} />
          </div>
          <span>{hp}%</span>
        </div>
        <div className="goin-bar">
          <span>Qi</span>
          <div className="goin-track">
            <div className="goin-fill is-qi" style={{ width: `${qi}%` }} />
          </div>
          <span>{qi}%</span>
        </div>
        <div className="goin-status">
          {hurt > 0 && <span className="is-hurt">wounded · {Math.round(hurt * 100)}% off</span>}
          {me?.shown && <span>veiled as {realmWords(me.shown)}</span>}
          {pinned && (
            <span className="is-hurt">
              pinned by {view?.people[pinned.id]?.label ?? pinned.name}
            </span>
          )}
          {g.down && <span className="is-hurt">down</span>}
        </div>
        <div className="goin-tabs" role="tablist">
          <button
            type="button"
            className={tab === 'carried' ? 'is-on' : ''}
            onClick={() => setTab('carried')}
          >
            Carried
          </button>
          <button
            type="button"
            className={tab === 'arts' ? 'is-on' : ''}
            onClick={() => setTab('arts')}
          >
            Arts
          </button>
        </div>
        {tab === 'carried' ? (
          <div className="goin-carried">
            {carried.slice(0, 24).map(([id, n]) => (
              <div
                key={id}
                className="hanzi"
                title={`${hasItem(id) ? item(id).name : id}${n > 1 ? ` ×${n}` : ''}`}
              >
                {hasItem(id) ? item(id).hanzi.charAt(0) : '?'}
              </div>
            ))}
            {carried.length === 0 && <div className="goin-empty muted">Nothing.</div>}
          </div>
        ) : (
          <ul className="goin-arts">
            {Object.keys(s.player.techniques).map((id) => (
              <li key={id}>{view?.things.has(id) ? id : id}</li>
            ))}
          </ul>
        )}
      </div>
    </aside>
  );
}

/** The crowd where you stand: its count, and the faces you can pick out, a click naming one. */
function Crowd({ s }: { s: GameState }) {
  const c = crowdHere(s);
  if (c.count === 0) return null;
  return (
    <div className="goin-crowd-block">
      <p className="goin-label">The crowd · about {c.count}</p>
      <div className="goin-faces">
        {c.faces
          .filter((f) => !f.made)
          .map((f) => (
            <button
              type="button"
              key={f.key}
              className="goin-face"
              title="Name them in the box"
              onClick={() =>
                useGoIn.setState((u) => ({
                  words: `${u.words}${u.words && !u.words.endsWith(' ') ? ' ' : ''}${f.line}`,
                }))
              }
            >
              {f.line}
            </button>
          ))}
      </div>
    </div>
  );
}

function Box() {
  const words = useGoIn((u) => u.words);
  const busy = useGoIn((u) => u.busy);
  const down = useGame((s) => !!s.game?.goin?.down);
  const ending = useGame((s) => !!s.game?.goin?.ending);
  const input = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (!busy) input.current?.focus();
  }, [busy]);
  return (
    <form
      className="goin-box"
      onSubmit={(e) => {
        e.preventDefault();
        void say(words);
      }}
    >
      <input
        ref={input}
        className="goin-input"
        value={busy === 'telling' ? '…' : words}
        disabled={!!busy || down || ending}
        placeholder="What do you do?"
        onChange={(e) => useGoIn.setState({ words: e.target.value, note: null })}
      />
      <button
        type="button"
        className="button button-quiet"
        disabled={!!busy || down || ending}
        onClick={wait}
      >
        Wait
      </button>
      <button
        type="button"
        className="button button-quiet"
        disabled={!!busy || down || ending}
        onClick={leaveNow}
      >
        Leave
      </button>
    </form>
  );
}

function Act({ s }: { s: GameState }) {
  const g = s.goin!;
  const readings = useGoIn((u) => u.readings);
  const note = useGoIn((u) => u.note);
  const busy = useGoIn((u) => u.busy);
  const enc = sceneEncounter(s);
  const exits = useMemo(() => (enc ? exitViews(s, meet(s, enc)) : []), [s, enc]);
  if (g.down && !g.ending) {
    const { by, fate } = fallFate(s);
    return (
      <div className="panel goin-act">
        <div className="goin-pending">
          <div className="goin-head">
            You are down.{' '}
            {by ? `${by.name} stands over you and ${FATE_WORDS[fate]}.` : 'Nobody stands over you.'}
          </div>
          <div className="goin-btns">
            <button
              type="button"
              className="button button-quiet"
              disabled={!!busy}
              onClick={() => lastActNow(false)}
            >
              Let it come
            </button>
            <button
              type="button"
              className="button goin-go"
              disabled={!!busy || !by}
              onClick={() => lastActNow(true)}
            >
              Beg
            </button>
          </div>
        </div>
      </div>
    );
  }
  if (g.pending) {
    const p = g.pending;
    return (
      <div className="panel goin-act">
        <div className="goin-pending">
          <div className="goin-head">› {p.words}</div>
          {p.plan.steps.map((st, i) => {
            const pv = previewStep(s, g.scene, p.plan.actor, st);
            const stakes = [
              pv.cost && pv.judged !== 'clear' ? COSTS[pv.cost] : null,
              pv.short && pv.judged !== 'clear' ? `if short: ${SHORTS[pv.short]}` : null,
              (ACTS[st.act] as ActInfo).deed ? `a ${(ACTS[st.act] as ActInfo).deed} if seen` : null,
            ].filter(Boolean);
            return (
              <div key={i} className="goin-step">
                <span className="goin-stepn">{i + 1}</span>
                <span>
                  {ACTS[st.act].name}
                  {st.target && g.scene.actors.some((a) => a.id === st.target)
                    ? ` · ${g.scene.actors.find((a) => a.id === st.target)!.name}`
                    : ''}
                </span>
                <span className={`goin-v is-${vClass(pv.judged)}`}>
                  {pv.judged ?? 'nothing at stake'}
                </span>
                {stakes.length > 0 && <span className="goin-stakes">{stakes.join(' · ')}</span>}
              </div>
            );
          })}
          <div className="goin-btns">
            <button
              type="button"
              className="button button-quiet"
              disabled={!!busy}
              onClick={changeIt}
            >
              Change it
            </button>
            <button type="button" className="button goin-go" disabled={!!busy} onClick={doIt}>
              Do it
            </button>
          </div>
        </div>
      </div>
    );
  }
  return (
    <div className="panel goin-act">
      {readings ? (
        <>
          <p className="goin-label">Which did you mean?</p>
          {readings.map((r, i) => (
            <button type="button" key={i} className="goin-reading" onClick={() => pickReading(r)}>
              <span>{r.label}</span>
              <span className="goin-v is-unk">
                {r.plan.steps.map((x) => ACTS[x.act].name).join(', ')}
              </span>
            </button>
          ))}
        </>
      ) : (
        <div className={`goin-chips${busy === 'telling' ? ' is-dim' : ''}`}>
          {exits.map((v) => (
            <button
              type="button"
              key={`x${v.i}`}
              className="goin-chip is-exit"
              disabled={!!v.refused || !!busy}
              title={v.refused ?? v.why}
              onClick={() => takeExit(v.i, v.exit.label)}
            >
              {v.exit.label} <span className={`goin-v is-${vClass(v.judged)}`}>{v.judged}</span>
            </button>
          ))}
          {/* Wait and Leave are the box's own buttons, clicks that skip the interpreter. */}
          {g.choices
            .filter((c) => !/^(wait|leave)$/i.test(c.trim()))
            .map((c) => (
              <button
                type="button"
                key={c}
                className="goin-chip"
                disabled={!!busy}
                onClick={() => void say(c)}
              >
                {c}
              </button>
            ))}
        </div>
      )}
      {note && <p className="goin-note">{note}</p>}
      <Box />
    </div>
  );
}

function Leaving() {
  const card = useGoIn((u) => u.leaving)!;
  return (
    <div className="goin-leaving-wrap">
      <section className="panel goin-leaving" role="dialog" aria-label="Leaving the scene">
        <h2>{card.title || 'Open ground'}</h2>
        <p className="muted">{card.spent}</p>
        <p className="goin-leaving-line">{card.line}</p>
        <div className="goin-leaving-cols">
          <div>
            <p className="goin-label">Gained</p>
            {card.gained.length ? (
              card.gained.map((x) => <p key={x}>{x}</p>)
            ) : (
              <p className="muted">Nothing.</p>
            )}
          </div>
          <div>
            <p className="goin-label">Lost</p>
            {card.lost.length ? (
              card.lost.map((x) => <p key={x}>{x}</p>)
            ) : (
              <p className="muted">Nothing.</p>
            )}
          </div>
        </div>
        {card.remember.length > 0 && (
          <div>
            <p className="goin-label">Who will remember you</p>
            {card.remember.map((r, i) => (
              <p key={i}>
                {r.who.charAt(0).toUpperCase() + r.who.slice(1)} · {r.why} ·{' '}
                <span className={`is-${r.word}`}>{r.word}</span>
              </p>
            ))}
          </div>
        )}
        {(card.seen.length > 0 || card.heat > 0) && (
          <div>
            <p className="goin-label">Seen</p>
            {card.seen.map((x, i) => (
              <p key={i}>{x}</p>
            ))}
            {card.heat > 0 && <p>heat here: {card.heat}</p>}
          </div>
        )}
        <div className="goin-btns">
          <button type="button" className="button" onClick={dismissLeaving}>
            Go on
          </button>
        </div>
      </section>
    </div>
  );
}

/** The scene on the stage, or its leaving card once it has ended. */
export function GoInScreen() {
  const s = useGame((x) => x.game);
  const leaving = useGoIn((u) => u.leaving);
  const busy = useGoIn((u) => u.busy);
  const saying = useGoIn((u) => u.saying);
  const streaming = useGoIn((u) => u.streaming);
  const warn = useGoIn((u) => u.warn);
  const showCost = useSettings((x) => x.showSceneCost);
  const river = useRef<HTMLDivElement>(null);
  useEffect(() => {
    void loadAtlas();
  }, []);
  const turns = s?.goin?.turns;
  useEffect(() => {
    river.current?.scrollTo({ top: river.current.scrollHeight });
  }, [turns, streaming]);
  if (leaving) return <Leaving />;
  if (!s?.goin) return null;
  const g = s.goin;
  return (
    <div className="goin-stage">
      <div className="goin-shade" />
      <div className="goin-cols">
        <Where s={s} />
        <section className="goin-story">
          <div className="goin-river" ref={river}>
            {g.turns.map((t, i) => (
              <Turn key={i} t={t} last={i === g.turns.length - 1 && !busy} />
            ))}
            {busy === 'telling' && (
              <div className="goin-turn">
                {saying !== null && (
                  <div className="goin-you">
                    <span>{saying}</span>
                  </div>
                )}
                <p className="goin-prose">
                  {streaming}
                  <span className="goin-cursor" />
                </p>
              </div>
            )}
            {busy === 'reading' && <p className="goin-line">reading your words…</p>}
            {busy === 'leaving' && <p className="goin-line">the scene closes…</p>}
          </div>
          <Act s={s} />
        </section>
        <Who s={s} />
      </div>
      {warn && (
        <button
          type="button"
          className="goin-warn"
          onClick={() => useGoIn.setState({ warn: null })}
        >
          {warn}
        </button>
      )}
      {showCost && <div className="goin-cost">this scene: {(g.cost * 100).toFixed(1)}¢</div>}
    </div>
  );
}
