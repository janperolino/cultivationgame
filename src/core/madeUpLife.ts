// A made-up long chronicle for the Chronicle screen (P2.9): an earlier life, Lan Shu, who dies at
// 63 at the third layer, then the open life from root-testing day to 46, through Qi Condensation,
// a gate without a pill, Foundation, eighteen years of seclusion and a return. The dev console's
// `chronicle` writes it over the open life's chronicle; the tests read the same one. Seeded, so
// the same life comes every time. Only the chronicle and the dates change, not the cultivator.
import { CARDS } from '../content/cards/index.ts';
import type { CardLineKind } from '../content/cards/schema.ts';
import type { EventData } from '../content/chronicle.ts';
import { TECHNIQUES } from '../content/techniques.ts';
import { mulberry32 } from './rng.ts';
import {
  DAYS_PER_YEAR,
  START_AGE,
  chronicleEvent,
  type ChronicleEvent,
  type GameState,
} from './state.ts';

type Line = [type: string, data: EventData];

/** A card line of the kind asked: a card's first-step outcome whose chronicle names it. */
function cardLines(kind: CardLineKind | 'choice'): EventData[] {
  const out: EventData[] = [];
  for (const k of CARDS) {
    k.choices.forEach((ch, i) => {
      for (const [pass, o] of [
        [true, ch.pass],
        [false, ch.fail],
      ] as const) {
        if (!o?.chronicle || o.next) continue;
        if ((o.kind ?? 'choice') === kind) out.push({ card: k.id, choice: i, pass });
      }
    });
  }
  return out;
}

const QC = 'qi-condensation';
const FE = 'foundation-establishment';

/** One life's lines, by age and season: [age, season 0–3, type, data]. */
type Plan = [age: number, season: number, ...Line][];

function lanShu(technique: string): Plan {
  return [
    [12, 0, 'technique', { technique, how: 'learns' }],
    [14, 1, 'breakthrough', { ladder: 'qi', realm: QC, stage: 2 }],
    [17, 3, 'breakthrough', { ladder: 'qi', realm: QC, stage: 3 }],
    [22, 1, 'setback', { ladder: 'qi', realm: QC, stage: 4, injured: true }],
    [26, 2, 'breakthrough', { ladder: 'body', realm: QC, stage: 2 }],
    [34, 1, 'spar', { foe: 'a Night Bridge runner', result: 'lost', turns: 3 }],
    [48, 0, 'mastery', { technique, level: 2 }],
    [63, 3, 'death', { age: 63, realm: QC, stage: 3 }],
  ];
}

function thisLife(technique: string): Plan {
  const plan: Plan = [
    [12, 0, 'screen', { screen: 'techniques' }],
    [12, 1, 'technique', { technique, how: 'drills' }],
  ];
  // Qi Condensation: a layer most years, to the ninth at 20.
  for (let stage = 2; stage <= 9; stage++) {
    plan.push([
      12 + stage - 1,
      (stage * 3) % 4,
      'breakthrough',
      { ladder: 'qi', realm: QC, stage },
    ]);
  }
  plan.push(
    [14, 1, 'breakthrough', { ladder: 'body', realm: QC, stage: 2 }],
    [15, 2, 'mastery', { technique, level: 1 }],
    [16, 0, 'breakthrough', { ladder: 'soul', realm: QC, stage: 2 }],
    [17, 1, 'spar', { foe: 'Cadet Lu Wen', result: 'won', turns: 7 }],
    [18, 1, 'mastery', { technique, level: 2 }],
    [19, 2, 'toxic', { ladder: 'qi' }],
    [20, 1, 'breakthrough', { ladder: 'body', realm: QC, stage: 3 }],
    [22, 3, 'gate', { realm: FE, gate: false }],
    [23, 2, 'major', { ladder: 'qi', realm: FE, grade: 'superior' }],
    // Eighteen years of seclusion: only steps and what settled itself.
    [31, 3, 'breakthrough', { ladder: 'qi', realm: FE, stage: 2 }],
    [36, 2, 'breakthrough', { ladder: 'body', realm: QC, stage: 4 }],
    [39, 1, 'breakthrough', { ladder: 'qi', realm: FE, stage: 3 }],
    [42, 1, 'spar', { foe: 'Qiu Ran', result: 'yielded', turns: 12 }],
    [45, 1, 'mastery', { technique, level: 3 }],
    [46, 0, 'breakthrough', { ladder: 'soul', realm: QC, stage: 3 }],
  );
  return plan;
}

/** Cards sprinkled over a life's busy years, and settled ones over its quiet ones. */
function withCards(plan: Plan, busy: number[], quiet: number[], seed: number): Plan {
  const rand = mulberry32(seed);
  const kinds = (['choice', 'fight', 'hurt', 'people', 'learned'] as const).map(cardLines);
  const pick = <T>(xs: readonly T[]) => xs[Math.floor(rand() * xs.length)]!;
  const out = [...plan];
  for (const age of busy) {
    const n = 1 + Math.floor(rand() * 3);
    for (let i = 0; i < n; i++) {
      const pool = pick(kinds.filter((k) => k.length));
      out.push([age, Math.floor(rand() * 4), 'card', pick(pool)]);
    }
    if (rand() < 0.4)
      out.push([age, Math.floor(rand() * 4), 'card', { ...pick(kinds[0]!), byDefault: true }]);
  }
  for (const age of quiet) {
    if (rand() < 0.45) {
      out.push([age, Math.floor(rand() * 4), 'card', { ...pick(kinds[0]!), byDefault: true }]);
    }
  }
  return out;
}

function written(
  plan: Plan,
  bornDay: number,
  actor: string,
  place: string | null,
): ChronicleEvent[] {
  return plan
    .map(([age, season, type, data], i) => {
      // Spread a season's lines over its ninety days, keeping the plan's order on a tie.
      const day = bornDay + age * DAYS_PER_YEAR + season * 90 + 1 + ((i * 7) % 80);
      return chronicleEvent(day, type, data, [actor], place);
    })
    .sort((a, b) => a.day - b.day);
}

const range = (a: number, b: number) => Array.from({ length: b - a + 1 }, (_, i) => a + i);

/** The open life with the made-up chronicle: Lan Shu from day 0, then this life, now 46. */
export function madeUpLife(s: GameState): GameState {
  const technique = TECHNIQUES[0]!.id;
  const actor = s.player.id;
  const place = s.player.place;
  const lanBorn = 0;
  const lanStart = lanBorn + START_AGE * DAYS_PER_YEAR;
  const lanPlan = withCards(
    lanShu(technique),
    [...range(12, 23), ...range(32, 62)],
    range(24, 31),
    7,
  );
  const lanEvents = written(lanPlan, lanBorn, actor, place);
  const lanEnd = lanEvents.findLast((e) => e.type === 'death')!.day;
  // The open life comes of age at the turn of the year Lan Shu died in, so its ages and the
  // world's years line up and the tests can count them.
  const start = Math.ceil(lanEnd / DAYS_PER_YEAR) * DAYS_PER_YEAR;
  const bornDay = start - START_AGE * DAYS_PER_YEAR;
  const plan = withCards(
    thisLife(technique),
    [...range(12, 23), ...range(42, 46)],
    range(24, 41),
    11,
  );
  const events = written(plan, bornDay, actor, place).filter((e) => e.day > start);
  const day = bornDay + 46 * DAYS_PER_YEAR + 200;
  const opening = (next: boolean, name: string, pronouns: string, at: number) =>
    chronicleEvent(
      at,
      'birth',
      next ? { next, name, pronouns } : { name, pronouns },
      [actor],
      place,
    );
  return {
    ...s,
    lineage: { ...s.lineage, life: 2 },
    calendar: { day },
    player: { ...s.player, bornDay },
    cards: { ...s.cards, pending: [], checked: Math.floor(day) },
    chronicle: [
      opening(false, 'Lan Shu', 'she/her', lanStart),
      ...lanEvents.filter((e) => e.day > lanStart),
      opening(true, s.player.name, s.player.pronouns, start),
      ...events.filter((e) => e.day <= day),
    ],
  };
}
