// A plan (design § The resolver, The pipeline): what someone means to do, as data, steps of a
// verb and its act, a target, a manner and the things used. The interpreter (P3.8) returns plans
// checked against these schemas, so words grant nothing; tests and NPCs hand them in directly.
import { z } from 'zod';
import {
  ACT_IDS,
  ACTS,
  COST_IDS,
  HELPER_MAX,
  MANNERS,
  USE_MAX,
  VERBS,
} from '../../content/resolver.ts';
import { REALM_IDS } from '../../content/realms.ts';

export const StepSchema = z
  .object({
    verb: z.enum(VERBS),
    act: z.enum(ACT_IDS),
    /** A person, feature, item, place or project by id. */
    target: z.string().optional(),
    manner: z.enum(MANNERS).optional(),
    /** Scene features, items held or a technique known, by id; three at most. */
    uses: z.array(z.string()).max(USE_MAX).optional(),
    /** Who helps, by actor id; two at most. */
    helpers: z.array(z.string()).max(HELPER_MAX).optional(),
    /** Who goes with you: a group sneaks at its worst member's stealth. */
    group: z.array(z.string()).optional(),
    /** The cost a close pass pays, when not the act's own first. */
    cost: z.enum(COST_IDS).optional(),
    /** The thing taken, given or used ("stones" for spirit stones), and how many. */
    thing: z.string().optional(),
    n: z.number().int().min(1).optional(),
    /** A talk's offer meets one of their motives (P3.4 reads it from what you know of them). */
    offer: z.boolean().optional(),
    /** An item held and shown as proof: a token, a robe. */
    prop: z.string().optional(),
    /** What backs a threat: a weapon drawn, a technique shown. */
    show: z.array(z.enum(['weapon', 'technique'])).optional(),
    /** Hiding your realm: the realm to show. */
    shown: z.object({ realm: z.enum(REALM_IDS), stage: z.number().int().min(1) }).optional(),
    /** A disguise's face, a false name, a story. */
    as: z.string().optional(),
  })
  .refine((s) => ACTS[s.act].verb === s.verb, { message: "The act isn't under that verb." });
export type Step = z.infer<typeof StepSchema>;

export const PlanSchema = z.object({
  /** Who acts. */
  actor: z.string(),
  steps: z.array(StepSchema).min(1),
});
export type Plan = z.infer<typeof PlanSchema>;

/** A step from its act, the verb filled in. */
export function step(act: Step['act'], rest: Omit<Step, 'act' | 'verb'> = {}): Step {
  return { verb: ACTS[act].verb, act, ...rest };
}
