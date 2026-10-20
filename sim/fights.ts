// The fight sim (design § Combat, the fighting-up ledger; § Enemies, beasts and the people you
// meet): many fights per matchup, every fighter on its profile, the first mover drawn at random
// each fight. The ledger's four kits fight an ordinary foe one realm up at the same stage,
// without one-shot consumables, each carrying the sword intent its pedigree's table gives at its
// realm (the ordinary kit and foe a rogue's), and the targets under the ledger are the pass/fail
// list. Then the three paths (P3.2): white kits walking one path each, qi, body or soul, the
// others at the floor, against each other at the same top rung, and a balanced kit (all three at
// the top, the ledger's ordinary kit) against each. Then the Border Wilds roster against a white
// and a purple kit at each realm it is met at. Then crowds (C1): one white fighter against many
// fighters a realm below, white and then purple, which protective qi and the arts that strike
// many decide (C2: every kit carries its tier's blast), and a crowd that can't scratch its foe
// breaks (C3), which counts as the fighter's win; and the half-step fight, an early Foundation
// against one purple layer 9. Every fight runs with tempo (C3). Each matchup prints both sheets
// beside its win rate.
// Run: npm run sim -- fights [--fights=10000] [--roster=2000] [--crowds=200] [--sheets]
import {
  FOE_BASELINE,
  KITS,
  type Kit,
  type NpcPath,
  type PedigreeId,
} from '../src/content/enemies.ts';
import { REALMS, realm, realmIndex, type RealmId } from '../src/content/realms.ts';
import { BORDER_WILDS, type CultivatorTemplate } from '../src/content/roster.ts';
import { sheet, type Combatant } from '../src/core/combat/combatant.ts';
import { startFight } from '../src/core/combat/fight.ts';
import {
  generateBeast,
  generateCultivator,
  generatePack,
  kitFighter,
  rungAhead,
} from '../src/core/combat/generate.ts';
import { runFight } from '../src/core/combat/profile.ts';
import { Rng } from '../src/core/rng.ts';

const arg = (name: string, fallback: number) => {
  const a = process.argv.find((x) => x.startsWith(`--${name}=`));
  return a ? Number(a.slice(name.length + 3)) : fallback;
};
const FIGHTS = arg('fights', 10_000);
const ROSTER = arg('roster', 2_000);
const CROWDS = arg('crowds', 200);
const SHEETS = process.argv.includes('--sheets');

const kit = (id: string): Kit => KITS.find((k) => k.id === id)!;
const foeAt = (r: RealmId): Kit => FOE_BASELINE[Math.min(realmIndex(r), FOE_BASELINE.length - 1)]!;
const pct = (x: number) => `${(x * 100).toFixed(1)}%`;

interface Tally {
  win: number;
  loss: number;
  fled: number;
  draw: number;
  turns: number;
  /** Wins where the other side broke and ran: counted in `fled` too. */
  broke: number;
}

/** Fights a side against another many times, a fresh draw of who moves first each fight. */
function bout(
  mine: (rng: Rng) => Combatant[],
  theirs: (rng: Rng) => Combatant[],
  n: number,
  seed: string,
  turns = 60,
): Tally {
  const rng = Rng.fromString(seed);
  const t: Tally = { win: 0, loss: 0, fled: 0, draw: 0, turns: 0, broke: 0 };
  for (let i = 0; i < n; i++) {
    const a = mine(rng).map((c) => ({ ...c, side: 'a' }));
    const b = theirs(rng).map((c) => ({ ...c, side: 'b' }));
    const r = runFight(startFight(rng.chance(0.5) ? [...a, ...b] : [...b, ...a]), rng, turns);
    t.turns += r.turns;
    const theyFled = r.fled.some((id) => b.some((c) => c.id === id));
    const iFled = r.fled.some((id) => a.some((c) => c.id === id));
    if (r.winner === 'a') {
      if (theyFled) {
        t.fled++;
        t.broke++;
      } else t.win++;
    } else if (r.winner === 'b') {
      if (iFled) t.fled++;
      else t.loss++;
    } else t.draw++;
  }
  return t;
}

const rate = (t: Tally) => t.win / (t.win + t.loss + t.fled + t.draw);
/** A crowd's fight: the fighter wins by felling it or by breaking it. */
const held = (t: Tally) => (t.win + t.broke) / (t.win + t.loss + t.fled + t.draw);

/** One line of a sheet: the six numbers, Attack on the ladder its art uses. */
function sheetLine(c: Combatant): string {
  const s = sheet(c);
  const n = (x: number) => (x >= 1e4 ? `${(x / 1e3).toFixed(0)}k` : x.toFixed(0)).padStart(6);
  return `acc${n(s.accuracy.qi.value)} ev${n(s.evasion.value)} att${n(s.attack.qi.value)} def${n(s.defense.value)} hp${n(s.hp.value)} qi${n(s.qi.value)} sh${n(s.shield.value)} ar${n(s.armor?.value ?? 0)}`;
}

const fixed = (k: Kit, r: RealmId, stage: number, id: string) => () => [
  kitFighter(k, r, stage, { id, side: id }),
];

function ledgerCell(k: Kit, from: RealmId, gap = 1, stage = 1): Tally {
  let up = { realm: from, stage };
  for (let i = 0; i < gap; i++) up = rungAhead(up.realm, up.stage);
  return bout(
    fixed(k, from, stage, 'a'),
    fixed(foeAt(up.realm), up.realm, up.stage, 'b'),
    FIGHTS,
    `ledger/${k.id}/${from}/${gap}`,
  );
}

// ---------------------------------------------------------------- the ledger

const COLUMNS = REALMS.slice(0, 4).map((r) => r.id);
const TARGETS: Record<string, [number, number][]> = {
  ordinary: [
    [0, 0.01],
    [0, 0.01],
    [0, 0.005],
    [0, 0.005],
  ],
  'great-sect': [
    [0, 0.02],
    [0, 0.1],
    [0, 0.05],
    [0, 0.02],
  ],
  genius: [
    [0, 0.02],
    [0.4, 0.6],
    [0.25, 0.45],
    [0, 0.05],
  ],
  chosen: [
    [0.95, 1],
    [0.95, 1],
    [0.95, 1],
    [0.9, 1],
  ],
};

const checks: { what: string; got: string; ok: boolean }[] = [];
const check = (what: string, x: number, lo: number, hi: number) =>
  checks.push({ what, got: pct(x), ok: x >= lo && x <= hi });

console.log(
  `The fighting-up ledger: win rate against an ordinary foe one realm up at the same (first) stage, ${FIGHTS} fights a cell`,
);
console.log(
  ''.padEnd(22) + COLUMNS.map((r) => `${realm(r).name.split(' ')[0]} up`.padStart(16)).join(''),
);
for (const k of KITS) {
  const cells = COLUMNS.map((from) => ledgerCell(k, from));
  console.log(
    k.name.padEnd(22) +
      cells.map((t) => `${pct(rate(t))} ${(t.turns / FIGHTS).toFixed(1)}t`.padStart(16)).join(''),
  );
  cells.forEach((t, i) => {
    const [lo, hi] = TARGETS[k.id]![i]!;
    check(`${k.name}, ${realm(COLUMNS[i]!).name} → one realm up`, rate(t), lo, hi);
  });
}
if (SHEETS) {
  console.log('\nSheets at each realm’s first stage (Accuracy and Attack on the qi ladder)');
  for (const r of REALMS.slice(0, 5)) {
    for (const k of [...KITS, foeAt(r.id)]) {
      console.log(
        `  ${r.name.padEnd(26)}${k.name.padEnd(22)}${sheetLine(kitFighter(k, r.id, 1, { id: 'x', side: 'x' }))}`,
      );
    }
  }
}

// ---------------------------------------------------------------- the rest of the targets

const generic = (pedigree: PedigreeId): CultivatorTemplate => ({
  id: `generic-${pedigree}`,
  name: pedigree,
  kind: 'cultivator',
  pedigree,
  weapon: 'sword',
  element: null,
  band: ['qi-condensation'],
  profile: 'fanatical',
  notes: '',
});
const rogue = (r: RealmId, stage: number) => (rng: Rng) => [
  generateCultivator(generic('rogue'), r, stage, rng, { id: 'b', noConsumables: true }).combatant,
];

console.log('\nWithin a realm, two realms up, a stage up');
for (const r of ['foundation-establishment', 'core-formation'] as const) {
  const name = realm(r).name;
  const chosenRogue = rate(
    bout(fixed(kit('chosen'), r, 1, 'a'), rogue(r, 1), FIGHTS, `rogue/c/${r}`),
  );
  const greatRogue = rate(
    bout(fixed(kit('great-sect'), r, 1, 'a'), rogue(r, 1), FIGHTS, `rogue/g/${r}`),
  );
  const chosenUp = rate(
    bout(
      fixed(kit('chosen'), r, 1, 'a'),
      fixed(kit('chosen'), rungAhead(r, 1).realm, 1, 'b'),
      FIGHTS,
      `same/c/${r}`,
    ),
  );
  const greatUp = rate(
    bout(
      fixed(kit('great-sect'), r, 1, 'a'),
      fixed(kit('great-sect'), rungAhead(r, 1).realm, 1, 'b'),
      FIGHTS,
      `same/g/${r}`,
    ),
  );
  const twoUp = rate(ledgerCell(kit('chosen'), r, 2));
  const stageUp = rate(
    bout(fixed(kit('great-sect'), r, 1, 'a'), fixed(foeAt(r), r, 2, 'b'), FIGHTS, `stage/${r}`),
  );
  console.log(
    `  ${name}: chosen v rogue ${pct(chosenRogue)}, great-sect v rogue ${pct(greatRogue)}, chosen v chosen a realm up ${pct(chosenUp)}, great-sect v great-sect a realm up ${pct(greatUp)}, chosen two realms up ${pct(twoUp)}, great-sect a stage up ${pct(stageUp)}`,
  );
  check(`${name}: a chosen one beats a rogue over 95%`, chosenRogue, 0.95, 1);
  check(`${name}: a great-sect disciple beats a rogue over 95%`, greatRogue, 0.95, 1);
  check(`${name}: chosen against chosen a realm up under 5%`, chosenUp, 0, 0.05);
  check(`${name}: great-sect against great-sect a realm up under 5%`, greatUp, 0, 0.05);
  check(`${name}: a chosen one two realms up under 5%`, twoUp, 0, 0.05);
  check(`${name}: a great-sect disciple overcomes an ordinary foe a stage up`, stageUp, 0.5, 1);
}

// ---------------------------------------------------------------- rare against rare

// The kits against each other (C3, Jan's question): at the same realm and first stage, row
// against column, and each against its own kit a realm up. No targets but the ledger's own.
console.log(
  `\nRare against rare: row against column at the same realm and first stage, then against its own kit a realm up, ${ROSTER} fights a cell`,
);
for (const r of ['foundation-establishment', 'core-formation'] as const) {
  console.log(
    `  ${realm(r).name}`.padEnd(26) +
      KITS.map((k) => k.name.split(' ')[0]!.padStart(13)).join('') +
      '  a realm up'.padStart(14),
  );
  for (const a of KITS) {
    const cells = KITS.map((b) =>
      a === b
        ? '—'
        : pct(
            rate(
              bout(fixed(a, r, 1, 'a'), fixed(b, r, 1, 'b'), ROSTER, `rare/${a.id}/${b.id}/${r}`),
            ),
          ),
    );
    const up = rate(
      bout(
        fixed(a, r, 1, 'a'),
        fixed(a, rungAhead(r, 1).realm, 1, 'b'),
        ROSTER,
        `rare/${a.id}/up/${r}`,
      ),
    );
    console.log(
      `    ${a.name.padEnd(22)}${cells.map((c) => c.padStart(13)).join('')}${pct(up).padStart(14)}`,
    );
  }
}

// ---------------------------------------------------------------- the three paths

const pathKit = (path: NpcPath): Kit => ({
  ...kit('ordinary'),
  id: `path-${path}`,
  name: path === 'balanced' ? 'balanced' : `pure ${path}`,
  path,
});
const PURE = ['qi', 'body', 'soul'] as const;
const PATH_RUNGS: [RealmId, number][] = [
  ['qi-condensation', 9],
  ['foundation-establishment', 1],
  ['foundation-establishment', 4],
];

console.log('\nThe three paths: white kits at the same top rung (row against column)');
for (const [r, stage] of PATH_RUNGS) {
  const where = `${realm(r).name.split(' ')[0]} ${stage}`;
  const vs = (a: NpcPath, b: NpcPath) =>
    rate(
      bout(
        fixed(pathKit(a), r, stage, 'a'),
        fixed(pathKit(b), r, stage, 'b'),
        FIGHTS,
        `paths/${a}/${b}/${r}/${stage}`,
      ),
    );
  const pairs: [NpcPath, NpcPath][] = [
    ['qi', 'body'],
    ['qi', 'soul'],
    ['body', 'soul'],
  ];
  const pure = pairs.map(([a, b]) => [a, b, vs(a, b)] as const);
  const balanced = PURE.map((b) => [b, vs('balanced', b)] as const);
  console.log(
    `  ${where.padEnd(14)}${pure.map(([a, b, x]) => `${a} v ${b} ${pct(x)}`).join('   ')}   |   balanced v ${balanced.map(([b, x]) => `${b} ${pct(x)}`).join(', ')}`,
  );
  for (const [a, b, x] of pure)
    check(`${where}: pure ${a} against pure ${b} 35–65%`, x, 0.35, 0.65);
  for (const [b, x] of balanced)
    check(`${where}: balanced against pure ${b} about 75%`, x, 0.65, 0.85);
  if (SHEETS) {
    for (const k of ['balanced', ...PURE] as const) {
      console.log(
        `    ${k.padEnd(10)}${sheetLine(kitFighter(pathKit(k), r, stage, { id: 'x', side: 'x' }))}`,
      );
    }
  }
}

// ---------------------------------------------------------------- the Border Wilds roster

console.log(
  `\nThe Border Wilds roster against a white and a purple kit at the same realm and first stage, ${ROSTER} fights each; win / they fled / loss`,
);
for (const t of BORDER_WILDS) {
  for (const r of t.band) {
    const foes = (rng: Rng) =>
      t.kind === 'beast'
        ? generatePack(t, r, 1, rng, 'b').map((n) => n.combatant)
        : [generateCultivator(t, r, 1, rng, { id: 'b' }).combatant];
    const row = (['ordinary', 'great-sect'] as const).map((k) => {
      const x = bout(fixed(kit(k), r, 1, 'a'), foes, ROSTER, `roster/${t.id}/${r}/${k}`);
      const n = ROSTER;
      return `${pct(x.win / n)} / ${pct(x.fled / n)} / ${pct((x.loss + x.draw) / n)}`;
    });
    const sample =
      t.kind === 'beast'
        ? generateBeast(t, r, 1, Rng.fromString(`sample/${t.id}`)).combatant
        : generateCultivator(t, r, 1, Rng.fromString(`sample/${t.id}`)).combatant;
    console.log(
      `  ${t.name.padEnd(28)}${realm(r).name.split(' ')[0]!.padEnd(11)}white ${row[0]!.padEnd(24)}purple ${row[1]!.padEnd(24)}${SHEETS ? sheetLine(sample) : ''}`,
    );
  }
}

// ---------------------------------------------------------------- crowds

// The design's crowds (design § Combat, Protective qi), on the realm gap's sizes (C3): the
// junior's blow loses ninety-nine parts in a hundred far under the guard, and a crowd that can't
// scratch you breaks once a third of it has fallen, which counts as a win.
const CROWD_ROWS: {
  me: [RealmId, number];
  them: [RealmId, number];
  /** The crowd's kit: white, or a great-sect disciple's purple. */
  crowd?: string;
  sizes: number[];
  target: number;
}[] = [
  {
    me: ['foundation-establishment', 1],
    them: ['qi-condensation', 9],
    sizes: [20, 50, 80],
    target: 50,
  },
  {
    me: ['foundation-establishment', 1],
    them: ['qi-condensation', 5],
    sizes: [50, 100],
    target: 100,
  },
  {
    me: ['foundation-establishment', 4],
    them: ['qi-condensation', 9],
    sizes: [50, 100, 150],
    target: 150,
  },
  {
    me: ['core-formation', 1],
    them: ['foundation-establishment', 4],
    sizes: [20, 50, 100],
    target: 50,
  },
  // Purple at layer 9 stands in the half-step and beats an early Foundation's Defense; a
  // Foundation peak's Defense holds them.
  {
    me: ['foundation-establishment', 4],
    them: ['qi-condensation', 9],
    crowd: 'great-sect',
    sizes: [3, 5, 10],
    target: 10,
  },
];
const short = (r: RealmId, stage: number) => `${realm(r).name.split(' ')[0]} ${stage}`;
console.log(
  `
Crowds: one white fighter against fighters a realm below, all at once, ${CROWDS} fights a cell (won, the share of it a rout)`,
);
for (const row of CROWD_ROWS) {
  const [mr, ms] = row.me;
  const [tr, ts] = row.them;
  const cells = row.sizes.map((n) => {
    const crowd = () =>
      Array.from({ length: n }, (_, j) =>
        kitFighter(kit(row.crowd ?? 'ordinary'), tr, ts, { id: `b${j}`, side: 'b' }),
      );
    const x = bout(
      fixed(kit('ordinary'), mr, ms, 'a'),
      crowd,
      CROWDS,
      `crowd/${row.crowd ?? 'ordinary'}/${tr}/${ts}/${n}`,
      400,
    );
    return [n, held(x), x.broke / CROWDS] as const;
  });
  const them = `${row.crowd ? 'purple ' : ''}${short(tr, ts)}`;
  console.log(
    `  ${short(mr, ms).padEnd(14)}against ${them.padEnd(15)}${cells.map(([n, x, b]) => `${n}: ${pct(x)} (${pct(b)})`.padStart(22)).join('')}`,
  );
  const x = cells.find(([n]) => n === row.target)![1];
  check(`${short(mr, ms)} beats ${row.target} ${them} at once over 90%`, x, 0.9, 1);
}

// The half-step fight (design § Combat, Protective qi): a great-sect disciple's purple at layer 9
// crosses an early Foundation's guard, so the Foundation wins about two in three, and two such
// disciples win.
{
  const purple = (n: number) => () =>
    Array.from({ length: n }, (_, j) =>
      kitFighter(kit('great-sect'), 'qi-condensation', 9, { id: `b${j}`, side: 'b' }),
    );
  const me = fixed(kit('ordinary'), 'foundation-establishment', 1, 'a');
  const one = rate(bout(me, purple(1), CROWDS * 5, 'half-step/1'));
  const two = rate(bout(me, purple(2), CROWDS * 5, 'half-step/2'));
  console.log(
    `  The half-step: an early Foundation against one purple layer 9 ${pct(one)}, against two ${pct(two)}`,
  );
  check('An early Foundation beats one purple layer 9 about 60–70%', one, 0.58, 0.72);
  check('Two purple layer 9s beat an early Foundation', two, 0, 0.5);
}

console.log('\nTargets');
for (const c of checks) console.log(`  ${c.ok ? 'ok ' : 'OFF'}  ${c.what}: ${c.got}`);
const off = checks.filter((c) => !c.ok).length;
console.log(
  off ? `\n${off} of ${checks.length} targets off.` : `\nAll ${checks.length} targets hold.`,
);
