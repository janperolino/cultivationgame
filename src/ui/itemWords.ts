// An item's uses and toxicity in words, for the Bag and the Combat screen (design § UI, less
// spreadsheet: words first, the numbers behind the "?").
import { CRAFTS } from '../content/crafts.ts';
import { ELEMENT_INFO } from '../content/elements.ts';
import { contemplationSource } from '../content/contemplation.ts';
import type { ConsumeEffect, Item } from '../content/items.ts';
import { copyId, copyTitle } from '../content/copies.ts';
import { rarity } from '../content/rarity.ts';
import { formatPercent, LADDER_LABELS, listWords, tierName } from './format.ts';

const SLOT_WORDS = {
  weapon: 'Held as a weapon',
  armor: 'Worn as armor',
  ring: 'Worn as a storage ring',
  pouch: 'Hung at the belt as a pouch',
  treasure: 'Carried in a treasure slot',
} as const;

function effectWords(e: ConsumeEffect): string {
  if (e.effect === 'fuel') {
    return `feeds the ${LADDER_LABELS[e.ladder].toLowerCase()} with ${e.days} day${e.days === 1 ? '' : 's'} of seclusion`;
  }
  if (e.effect === 'detox') return `draws out ${e.amount} points of pill residue`;
  return `restores ${formatPercent(e.share)} of your ${e.what === 'qi' ? 'qi pool' : 'HP'} mid-fight`;
}

/** Each use the item has, as one line of words. */
export function useLines(it: Item): string[] {
  const u = it.uses;
  const out: string[] = [];
  if (u.equip) {
    const e = u.equip;
    let line: string = SLOT_WORDS[e.slot];
    if (e.weapon) line += ` (${e.weapon})`;
    if (e.material) line += `, turning a quarter of ${e.material} damage`;
    if (e.squares) line += `, ${e.squares} squares`;
    out.push(`${line}.`);
  }
  if (u.consume) {
    const dose = u.consume.dose ? ', with a dose of pill residue' : '';
    out.push(`Eaten: ${listWords(u.consume.effects.map(effectWords))}${dose}.`);
  }
  if (u.fight) {
    out.push(
      `Thrown in a fight: a ${u.fight.damage} ${u.fight.form} of power ${u.fight.power}, spent on use.`,
    );
  }
  if (u.ward)
    out.push(
      `In a fight: a gold ward over your qi shield, past its cap, ${Math.round(u.ward.share * 100)}% of a full shield at its rung; spent on use.`,
    );
  if (u.fix)
    out.push(
      u.fix.keep
        ? `In a fight, once a fight: holds a foe still ${u.fix.turns === 1 ? 'a turn' : `${u.fix.turns} turns`}, no strike and no step, against their soul; it comes back to you.`
        : `In a fight: holds a foe still ${u.fix.turns === 1 ? 'a turn' : `${u.fix.turns} turns`}, no strike and no step, against their soul; spent on use.`,
    );
  if (u.escape)
    out.push(
      `A sure flee through the ${u.escape.through}, in a fight or on the road, from anyone up to its tier; burned by rule when a flee on the road would fall short.`,
    );
  if (u.swift)
    out.push(
      `Burned on the road: ×${u.swift.pace} your pace on foot for ${u.swift.days === 1 ? 'a day' : `${u.swift.days} days`}.`,
    );
  if (u.offer) {
    const tags = u.offer.tags.length ? listWords([...u.offer.tags]) : 'the gate itself';
    const ladder = u.offer.ladder ? `, doubled on the ${u.offer.ladder}` : '';
    out.push(`Laid at a major breakthrough: ${tags}${ladder}.`);
  }
  if (u.contemplate) {
    out.push(`Sat with: ${contemplationSource(u.contemplate.source).name}.`);
  }
  if (u.ingredient) {
    const age = u.ingredient.age ? `, ${u.ingredient.age} years old` : '';
    const element = it.element ? `${ELEMENT_INFO[it.element].name.toLowerCase()}, ` : '';
    out.push(`An ingredient: ${element}${listWords([...u.ingredient.properties])}${age}.`);
  }
  if (u.tool)
    out.push(
      `A ${CRAFTS[u.tool.craft].tool} for ${CRAFTS[u.tool.craft].name.toLowerCase()}: it works tier ${it.tier} recipes and below.`,
    );
  if (it.cracked) out.push('Cracked: it works nothing until a refiner mends it.');
  if (u.read)
    out.push(`Read on the study hours, it teaches ${copyTitle(copyId(u.read.kind, u.read.id))}.`);
  if (u.carry) out.push(`Carries ${u.carry.squares} squares while it travels with you.`);
  if (u.key) out.push(`Opens ${u.key.opens}.`);
  if (u.inscribe) {
    out.push(
      `${u.inscribe.slots} empty inscription slot${u.inscribe.slots === 1 ? '' : 's'} (enchantments arrive in M4).`,
    );
  }
  return out;
}

/** "Purple · Qi Condensation", the line under an item's name. */
export function itemTag(it: Item): string {
  return `${rarity(it.rarity).name} · ${tierName(it.tier)}`;
}

/** The toxicity meter in words, with seven quiet steps from clean to the edge. */
export function toxicityWords(t: number): string {
  if (t <= 0) return 'clean';
  if (t < 15) return 'a trace of residue';
  if (t < 35) return 'residue in the blood';
  if (t < 60) return 'heavy with residue';
  if (t < 85) return 'pills barely take';
  if (t < 100) return 'at the edge';
  return 'saturated';
}
