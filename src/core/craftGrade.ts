// The craft grade (design § Professions, people and powers, Styles and the craft grade; K6): first-
// grade 一品 to ninth-grade 九品 is the craft Dao tier you hold, so the sim always knows it; a grade
// certified at a guild's hall by one test batch of that tier that holds is what opens its doors (a
// guild seat, a graded commission). The examination is the guild's own bench, your own inputs and
// its fee; played, it reads the hand you sat it with, queued none.
import { CRAFTS, hasRecipe, recipe, recipeTier, type CraftId } from '../content/crafts.ts';
import { realmIndex } from '../content/realms.ts';
import { CRAFT_RENOWN, CRAFTER, EXAM, EXAMINED, CRAFT_GRADES } from '../content/styles.ts';
import { craftTiersHeld, examBatch, knownRecipes } from './crafts.ts';
import { addCraftFame } from './craftRenown.ts';
import { ladderOf, organization, isOrganization, theName } from './organizations.ts';
import { pay, priceWords, stonesOf, withStones } from './purse.ts';
import { addEvent, withPlayer, withStream, type Cultivator, type GameState } from './state.ts';
import type { Recipe } from '../content/catalogs/types.ts';
import { copyId } from '../content/copies.ts';
import { hasManual, manual } from '../content/manuals.ts';
import { benchEvents, gainCopy } from './life.ts';
import { priceOf } from './prices.ts';
import { stylesHeld } from './styles.ts';

/** The grade you hold in a craft: its Dao's tiers held, 0 for none. */
export function gradeHeld(c: Cultivator, craft: CraftId): number {
  return craftTiersHeld(c, craft);
}

/** The grade certified at a guild's hall, 0 for none. */
export function gradeCertified(c: Cultivator, craft: CraftId): number {
  return c.crafts.grades[craft]?.grade ?? 0;
}

/** A grade's title in a craft: "first-grade alchemist", 一品丹师. */
export function gradeTitle(grade: number, craft: CraftId): { name: string; hanzi: string } {
  const g = CRAFT_GRADES[grade - 1]!;
  return {
    name: `${g.name.toLowerCase()} ${CRAFTER[craft].name}`,
    hanzi: `${g.hanzi}${CRAFTER[craft].hanzi}`,
  };
}

/** The crafts a power practices (`crafts` in the atlas). */
export function craftsOf(power: string): readonly CraftId[] {
  return isOrganization(power) ? (organization(power).row.crafts ?? []) : [];
}

/** Whether a power examines crafters: a guild that practices crafts. */
export function examines(power: string): boolean {
  return (
    isOrganization(power) && organization(power).type === 'guild' && craftsOf(power).length > 0
  );
}

/** The highest grade a guild examines to: the tier of its strongest realm (Foundation: 二品). */
export function examinesTo(guild: string): number {
  return realmIndex(ladderOf(guild).head) + 1;
}

/** One craft's row at a guild's examination: what you hold, what's next, and why not, if not. */
export interface ExamRow {
  craft: CraftId;
  certified: number;
  held: number;
  /** The grade sat for next, or null when none is. */
  next: number | null;
  /** The recipes you know of that grade's tier, any of which is the test batch. */
  recipes: Recipe[];
  fee: number;
  /** Why it can't be sat, if it can't. */
  shut: string | null;
}

/** The examination as the guild's door shows it, a row for each craft it practices. */
export function examRows(c: Cultivator, guild: string): ExamRow[] {
  const top = examinesTo(guild);
  return craftsOf(guild).map((craft) => {
    const certified = gradeCertified(c, craft);
    const held = gradeHeld(c, craft);
    const grade = certified + 1;
    const recipes = knownRecipes(c).filter((r) => r.craft === craft && recipeTier(r) === grade);
    const fee = EXAM.fee * grade;
    let shut: string | null = null;
    if (!EXAMINED.includes(craft))
      shut = `The guild examines ${CRAFTS[craft].name} once its bench is worked.`;
    else if (grade > top)
      shut = `The branch grades to ${CRAFT_GRADES[top - 1]!.hanzi}; a higher grade is sat at the continent’s halls.`;
    else if (held < grade)
      shut = `${CRAFT_GRADES[grade - 1]!.hanzi} needs ${CRAFTS[craft].name}’s tier ${grade} held.`;
    else if (recipes.length === 0) shut = `You know no tier ${grade} recipe to sit it with.`;
    return { craft, certified, held, next: grade <= 9 ? grade : null, recipes, fee, shut };
  });
}

export type Certified =
  { ok: true; state: GameState; held: boolean; grade: number } | { ok: false; reason: string };

/**
 * Sits the examination: one batch of `output` at the guild's bench, your inputs and its fee,
 * played at `hand` (0 queued). A batch that holds certifies the grade, with craft renown in the
 * guild's region; one that fails keeps the fee and the inputs. What it makes is yours, marked.
 */
export function certify(s: GameState, guild: string, output: string, hand = 0): Certified {
  if (!examines(guild)) return { ok: false, reason: 'Nobody here examines crafters.' };
  if (!hasRecipe(output)) return { ok: false, reason: 'No such recipe.' };
  const r = recipe(output);
  const row = examRows(s.player, guild).find((x) => x.craft === r.craft);
  if (!row) return { ok: false, reason: `${capital(theName(guild))} doesn’t examine that craft.` };
  if (row.shut) return { ok: false, reason: row.shut };
  if (!row.recipes.some((x) => x.output === output))
    return { ok: false, reason: `The test batch is a tier ${row.next} recipe you know.` };
  const after = pay(stonesOf(s.player), row.fee);
  if (!after) return { ok: false, reason: `The examination costs ${priceWords(row.fee)}.` };
  const day = s.calendar.day;
  const paid = withStones(s.player, after);
  const { value: b, state } = withStream(s, 'exam', (rng) => examBatch(paid, r, hand, day, rng));
  if (!b) return { ok: false, reason: 'Your Bag can’t fill the test batch.' };
  const grade = row.next!;
  let c = b.cultivator;
  if (b.held) {
    c = {
      ...c,
      crafts: { ...c.crafts, grades: { ...c.crafts.grades, [r.craft]: { grade, day, at: guild } } },
    };
    c = addCraftFame(c, organization(guild).row.region ?? '', r.craft, CRAFT_RENOWN.certified, day);
  }
  // The test batch counts as any batch: its mastery and a gold piece's renown (review 2026-10-21).
  let next = benchEvents(withPlayer(state, c), b.events, organization(guild).row.region ?? '');
  next = addEvent(next, 'graded', {
    power: guild,
    craft: r.craft,
    grade,
    recipe: output,
    held: b.held,
  });
  return { ok: true, state: next, held: b.held, grade };
}

const capital = (t: string) => t.charAt(0).toUpperCase() + t.slice(1);

// ---------------------------------------------------------------- the guild's counter

/**
 * The guild's counter (K6's study, take C): the common styles it holds, sold openly to anyone at
 * their posted price; a power's own style is never on it.
 */
export function guildCounter(guild: string): { thing: string; price: number }[] {
  return stylesHeld(guild)
    .filter((id) => hasManual(id) && !manual(id).guardedBy)
    .map((id) => copyId('manual', id))
    .map((thing) => ({ thing, price: Math.round(priceOf(thing) * 10) / 10 }));
}

/** Buys a style's chapter at the guild's counter, in stones. */
export function buyAtGuild(
  s: GameState,
  guild: string,
  thing: string,
): { ok: true; state: GameState } | { ok: false; reason: string } {
  const line = guildCounter(guild).find((l) => l.thing === thing);
  if (!line) return { ok: false, reason: 'The counter doesn’t sell that.' };
  const after = pay(stonesOf(s.player), line.price);
  if (!after) return { ok: false, reason: `It costs ${priceWords(line.price)}.` };
  return { ok: true, state: gainCopy(withPlayer(s, withStones(s.player, after)), thing, 'buys') };
}
