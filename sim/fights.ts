// The fight sim (design § Combat, the fighting-up ledger; § Enemies, beasts and the people you
// meet): many fights per matchup, every fighter on its profile, the first mover drawn at random
// each fight. The ledger's four kits fight an ordinary foe one realm up at the same stage,
// without one-shot consumables, and the targets under the ledger are the pass/fail list. Then the
// Border Wilds roster against a white and a purple kit at each realm it is met at. Each matchup
// prints both sheets beside its win rate.
// Run: npm run sim -- fights [--fights=10000] [--roster=2000] [--sheets]
import { FOE_BASELINE, KITS, type Kit, type PedigreeId } from '../src/content/enemies.ts';
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
}

/** Fights a side against another many times, a fresh draw of who moves first each fight. */
function bout(
  mine: (rng: Rng) => Combatant[],
  theirs: (rng: Rng) => Combatant[],
  n: number,
  seed: string,
): Tally {
  const rng = Rng.fromString(seed);
  const t: Tally = { win: 0, loss: 0, fled: 0, draw: 0, turns: 0 };
  for (let i = 0; i < n; i++) {
    const a = mine(rng).map((c) => ({ ...c, side: 'a' }));
    const b = theirs(rng).map((c) => ({ ...c, side: 'b' }));
    const r = runFight(startFight(rng.chance(0.5) ? [...a, ...b] : [...b, ...a]), rng);
    t.turns += r.turns;
    const theyFled = r.fled.some((id) => b.some((c) => c.id === id));
    const iFled = r.fled.some((id) => a.some((c) => c.id === id));
    if (r.winner === 'a') {
      if (theyFled) t.fled++;
      else t.win++;
    } else if (r.winner === 'b') {
      if (iFled) t.fled++;
      else t.loss++;
    } else t.draw++;
  }
  return t;
}

const rate = (t: Tally) => t.win / (t.win + t.loss + t.fled + t.draw);

/** One line of a sheet: the six numbers, Attack on the ladder its art uses. */
function sheetLine(c: Combatant): string {
  const s = sheet(c);
  const n = (x: number) => (x >= 1e4 ? `${(x / 1e3).toFixed(0)}k` : x.toFixed(0)).padStart(6);
  return `acc${n(s.accuracy.qi.value)} ev${n(s.evasion.value)} att${n(s.attack.qi.value)} def${n(s.defense.value)} hp${n(s.hp.value)} qi${n(s.qi.value)}`;
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

console.log('\nTargets');
for (const c of checks) console.log(`  ${c.ok ? 'ok ' : 'OFF'}  ${c.what}: ${c.got}`);
const off = checks.filter((c) => !c.ok).length;
console.log(
  off ? `\n${off} of ${checks.length} targets off.` : `\nAll ${checks.length} targets hold.`,
);
