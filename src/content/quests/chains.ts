// The origin's chain (design § Character creation and the first hour, The origin's chain; The rogue
// start): four quests on one skeleton for each of the six starts, the first breath, the first
// lesson, the board, and your place or your own way, each with a reason in the world: someone you
// know needs the thing done, and you are the one sent. The road to Foundation is the world's (Jan's
// call in The opening, built's talk, 2026-10-21): a card at layer 9 says what it takes, and no
// quest hands a pill over. Givers are roles, never names (NPC basics). Each chain's quests come in
// order, offered on Cultivate as the last is handed in (core/chains.ts). Drafted in The opening,
// built (chains, rogue, knobs) for Jan's review.
import type { Quest, QuestAct, QuestPosting, QuestStep } from '../quests.ts';

const TEMPERING = 'method:stone-bearing';
const NOURISHING = 'method:still-lantern';

/** What a start's chain is written from. */
interface Start {
  path: string;
  /** Short, for ids: "cadet". */
  key: string;
  /** The role that gives the first two quests, as the journal names them. */
  teacher: string;
  method: string;
  /** The rogue's first work, before the first breath, when the start holds no method. */
  work?: { title: string; reason: string; act: QuestAct; read?: string };
  breath: { title: string; reason: string; thanks: string };
  lesson: {
    title: string;
    reason: string;
    spar: string;
    /** The roster template the spar's partner fights as (content/roster.ts). */
    roster: string;
    technique: string;
    techniqueName: string;
    thanks: string;
  };
  board: {
    title: string;
    reason: string;
    posting: Omit<QuestPosting, 'board'>;
    spotName: string;
    thanks: string;
  };
  place:
    | {
        kind: 'post';
        title: string;
        giver: string;
        reason: string;
        /** The post, taken at home's Work door: its job id, and the step's words for it. */
        job: string;
        take: string;
        thanks: string;
      }
    | {
        kind: 'own';
        title: string;
        giver: string;
        reason: string;
        hideout: string;
        hideoutName: string;
        hire: string;
        hireName: string;
        job: { label: string; card: string; flag: string; text: string };
        thanks: string;
      };
}

const breathSteps = (s: Start): QuestStep[] => {
  const steps: QuestStep[] = [];
  if (s.work)
    steps.push({
      text: s.work.title,
      goal: { event: 'work', match: { work: s.key } },
      act: s.work.act,
    });
  if (s.work?.read) steps.push({ text: s.work.read, goal: { knows: s.method } });
  steps.push(
    { text: 'Take up your method.', goal: { active: 'qi' } },
    {
      text: 'Draw the qi in until the bar fills, and break through to the second layer.',
      goal: { layer: { ladder: 'qi', stage: 2 } },
    },
  );
  return steps;
};

function chain(s: Start): Quest[] {
  const home = '@home';
  const teacher = { kind: 'person' as const, place: home, name: s.teacher };
  const id = (n: string) => `chain-${s.key}-${n}`;
  const breath: Quest = {
    id: id('breath'),
    title: s.breath.title,
    giver: teacher,
    reason: s.work ? `${s.work.reason} ${s.breath.reason}` : s.breath.reason,
    steps: breathSteps(s),
    reward: { text: 'the second layer, and your days to arrange' },
    thanks: s.breath.thanks,
    codex: ['qi-bar', 'orbs', 'focus', 'minor-breakthrough'],
    origin: true,
    chain: s.path,
  };
  const lesson: Quest = {
    id: id('lesson'),
    title: s.lesson.title,
    giver: teacher,
    reason: s.lesson.reason,
    steps: [
      { text: 'Turn an hour of your day to Study.', goal: { hour: 'study' } },
      { text: 'Buy your first node on the Trees with what you learned.', goal: { nodes: 1 } },
      {
        text: `Spar with ${s.lesson.spar} and win. Lost, it is again tomorrow.`,
        goal: { event: 'spar', match: { who: `chain:${s.path}`, result: 'won' } },
        act: { label: 'Spar', spar: true },
      },
      {
        text: 'Break through to the third layer.',
        goal: { layer: { ladder: 'qi', stage: 3 } },
      },
    ],
    reward: { technique: s.lesson.technique, text: `the ${s.lesson.techniqueName}` },
    thanks: s.lesson.thanks,
    codex: ['study', 'nodes', 'sparring', 'character-sheet'],
    origin: true,
    chain: s.path,
  };
  const board: Quest = {
    id: id('board'),
    title: s.board.title,
    giver: { kind: 'board', place: home, name: 'the board' },
    reason: s.board.reason,
    posting: { board: home, ...s.board.posting },
    steps: [
      {
        text: `Take the posting, "${s.board.posting.title}", at the board.`,
        where: home,
        goal: { posting: 'taken' },
      },
      {
        text: `Walk to ${s.board.spotName}, a few days' road, and cut what it asks.`,
        where: s.board.posting.spot,
        goal: { posting: 'met' },
      },
      { text: 'Go back to the board to be paid.', where: home, goal: { posting: 'paid' } },
      {
        text: 'Buy something at a counter: what you cut sells, and the stones spend.',
        where: home,
        goal: { event: 'bought' },
      },
    ],
    reward: { copy: TEMPERING, text: 'a copy of the Stone-Bearing Art, which opens body hours' },
    thanks: s.board.thanks,
    codex: ['bounty-board', 'map-postings', 'road-stance', 'look-gather-sense', 'buy-sell'],
    origin: true,
    chain: s.path,
  };
  const p = s.place;
  const place: Quest =
    p.kind === 'post'
      ? {
          id: id('place'),
          title: p.title,
          giver: { kind: 'person', place: home, name: p.giver },
          reason: p.reason,
          steps: [
            // The oath seats you in the power; the post itself is taken where it lives, at the
            // Work door, which teaches Duty there (Jan's playtest after S1).
            { text: p.take, where: home, goal: { job: p.job } },
            {
              text: 'Keep three days of your post’s shifts: stand at it as its Duty hours pass. Until layer 4 you are at drill: set Duty on its hours yourself.',
              where: home,
              goal: { kept: 3 },
            },
            {
              text: 'Earn your first five points of your power’s currency, from the post or a posting.',
              goal: { balance: 5 },
            },
          ],
          reward: {
            copy: NOURISHING,
            contemplate: 'shrine-lecture',
            text: 'a copy of the Still Lantern Art, which opens soul hours, and a night’s talk on stillness',
          },
          thanks: p.thanks,
          codex: ['duty-post', 'seats-contribution', 'dwelling', 'sect-shop', 'elders-hall'],
          origin: true,
          chain: s.path,
        }
      : {
          id: id('place'),
          title: p.title,
          giver: { kind: 'person', place: home, name: p.giver },
          reason: p.reason,
          steps: [
            {
              text: `Find a place of your own to cultivate: ${p.hideoutName}.`,
              where: p.hideout,
              goal: { reach: p.hideout },
            },
            {
              text: `Take the day hire at home: ${p.hireName}.`,
              where: home,
              goal: { job: p.hire },
            },
            {
              text: 'Keep three days of the hire. Until layer 4 you are at drill: set Duty on its hours yourself.',
              where: home,
              goal: { kept: 3 },
            },
            {
              text: p.job.text,
              goal: { flag: p.job.flag },
              act: { label: p.job.label, card: p.job.card },
            },
          ],
          reward: {
            copy: NOURISHING,
            contemplate: 'shrine-lecture',
            text: 'a copy of the Still Lantern Art, which opens soul hours, and a night’s talk on stillness',
          },
          thanks: p.thanks,
          codex: ['rogue', 'posts-hires', 'road-sites'],
          origin: true,
          chain: s.path,
        };
  return [breath, lesson, board, place];
}

const STARTS: readonly Start[] = [
  // ---------------------------------------------------------------- the cave orphan, going along
  {
    path: 'cave-orphan/along',
    key: 'cadet-school',
    teacher: 'the school’s drill sergeant',
    method: 'garrison-standard',
    breath: {
      title: 'The Registry’s Breath',
      reason:
        'The garrison school sits its new cadets on the drill ground’s stones the first night. A cadet who can’t draw qi by the time the evening watch rotates is sent back to the sinkholes in the next cart.',
      thanks: '“You’ll do. Get some sleep; you stand a watch in a year, and you’ll want it.”',
    },
    lesson: {
      title: 'Palm Drill',
      reason:
        '“The wall doesn’t care about your root. It cares whether you can push a beast off it.” The drill sergeant teaches the Rampart Palm only to cadets who have read something of their own and can put a second-year cadet on the ground.',
      spar: 'a second-year cadet',
      roster: 'march-conscript',
      technique: 'rampart-palm',
      techniqueName: 'Rampart Palm',
      thanks:
        '“By the hundredth repetition your palm stops hurting. By the thousandth it means something. Drill it.”',
    },
    board: {
      title: 'Nettle for the Infirmary',
      reason:
        'The garrison infirmary’s stores are bare after the spring raids, and the healers want nettle for poultices. The posting has hung on Pacified Fort’s board for a week, and the sergeant says a cadet who knows caves can find a ravine.',
      posting: {
        spot: 'qm-op-weeping-ravine',
        template: 'quest-nettle-ravine',
        title: 'Nettle for the infirmary',
        pay: 20,
        road: 'stone-skin-boar',
      },
      spotName: 'Weeping Ravine',
      thanks:
        'The board’s clerk pays you, and the infirmary’s orderly adds a garrison tempering art to it: “The healers say you came back with all your skin. Keep it that way.”',
    },
    place: {
      kind: 'post',
      title: 'The Evening Watch',
      giver: 'the school’s quartermaster',
      job: 'school-watch',
      take: 'Take the school’s watch at the Work door: its shift goes on your wheel as Duty.',
      reason:
        'From the third layer a cadet stands the school’s evening watch and is paid in the March’s merit, and the quartermaster hands a nourishing art to every cadet whose first merit is on his ledger, so they don’t fall asleep on it.',
      thanks:
        '“Your first merit, on the ledger. Here: the Still Lantern, the garrison’s copy. A cadet who can sit still keeps a better watch.”',
    },
  },
  // ---------------------------------------------------------------- the cave orphan, hidden
  {
    path: 'cave-orphan/refuse',
    key: 'cave-hidden',
    teacher: 'the aunt who hid you',
    method: 'crude-cave',
    breath: {
      title: 'The Wall’s Method',
      reason:
        'The clans scratched their method on the cave wall a generation ago for the children they hide, and the aunt who pulled you through the crack wants to see you breathe by it before the tester’s men have gone from the terraces.',
      thanks: '“There. Now nobody can test that out of you.”',
    },
    lesson: {
      title: 'Find the Grain',
      reason:
        'On the lowest terrace the clans break limestone by hand. “The stone has a grain. Find it, and your fist goes through.” She teaches the Sinkhole Stone Fist to a child who has studied and can put a clan cousin down.',
      spar: 'a clan cousin',
      roster: 'half-blood-raider',
      technique: 'sinkhole-stone-fist',
      techniqueName: 'Sinkhole Stone Fist',
      thanks: '“Your knuckles will bleed for a week. On the eighth day a slab splits clean.”',
    },
    board: {
      title: 'The Winter Store',
      reason:
        'The clans’ winter store came up short this year, and they pay the Terraces’ board to post glow-caps. The aunt says a hidden child who wants to eat in winter can cut them as well as anyone.',
      posting: {
        spot: 'qm-op-glowcap-sinkhole',
        template: 'quest-glowcap',
        title: 'Glow-caps for the winter store',
        pay: 20,
        road: 'cave-bats',
      },
      spotName: 'Glow-Cap Sinkhole',
      thanks:
        'The board pays you, and the aunt adds a tempering art the smugglers left in trade: “They carry crates up a cliff all night. You can learn to.”',
    },
    place: {
      kind: 'own',
      title: 'Your Own Way',
      giver: 'the aunt who hid you',
      reason:
        'You belong to no power: no stipend, no hall, no senior, and no quota or leave either. The aunt shows you where the clans hide their children, and the smugglers’ factor pays hidden children who can carry; his first real job pays a nourishing art.',
      hideout: 'qm-op-breathing-crack',
      hideoutName: 'the Breathing Crack',
      hire: 'smugglers-porter',
      hireName: 'porter for the smugglers’ factor',
      job: {
        label: 'Take the run',
        card: 'job-smuggling-run',
        flag: 'job-smuggling-run',
        text: 'Run the factor’s crate past the tester’s men.',
      },
      thanks:
        'The factor pays in a thin nourishing art worn soft with copying. “Don’t ask whose it was. Sit still with it.”',
    },
  },
  // ---------------------------------------------------------------- the conscript's child, going along
  {
    path: 'conscript/along',
    key: 'cadet-wall',
    teacher: 'your patrol sergeant',
    method: 'cadet-spear',
    breath: {
      title: 'The Cadet’s First Breath',
      reason:
        'The new intake walks the Wall from its first week, and the patrol sergeant won’t put a spear in the hands of a cadet who can’t yet draw qi into it.',
      thanks: '“Good. A spear knows when it is held by somebody.”',
    },
    lesson: {
      title: 'Spear on the Wall',
      reason:
        'At dusk the sergeant walks the cadets along the Wall: “Thrust between the ribs, where the bone wall is thin.” The Piled Bones Thrust is taught to a cadet who has studied and put a cadet of the intake down in the drill circle.',
      spar: 'a cadet of your intake',
      roster: 'march-conscript',
      technique: 'piled-bones-thrust',
      techniqueName: 'Piled Bones Thrust',
      thanks: '“Drill it until the bones on the Wall start to look like targets.”',
    },
    board: {
      title: 'Nettle for the Healer',
      reason:
        'The Foot of the Wall’s healer needs nettle before the raid season, when the patrols come in bitten, and she pays the garrison’s notice board to post it. The sergeant puts your name to it.',
      posting: {
        spot: 'qm-op-nettle-gully',
        template: 'quest-nettle-gully',
        title: 'Nettle for the healer',
        pay: 20,
        road: 'ridge-wolves',
      },
      spotName: 'Nettle Gully',
      thanks:
        'The board pays, and the healer sends up a garrison tempering art for the cadet who brought her nettle: “The Wall wants backs that don’t break.”',
    },
    place: {
      kind: 'post',
      title: 'Your Stretch of Wall',
      giver: 'your patrol sergeant',
      job: 'wall-patrol',
      take: 'Take the Wall’s patrol at the Work door: its shift goes on your wheel as Duty.',
      reason:
        'From the third layer a cadet walks the patrol for the March’s merit, and the sergeant hands a nourishing art to every cadet with merit on the ledger, since a patrol that sleeps on the Wall doesn’t come back.',
      thanks:
        '“Merit on the ledger. Here is the Still Lantern. Read it on your rest days; a quiet head hears a raid horn sooner.”',
    },
  },
  // ---------------------------------------------------------------- the conscript's child, deserted
  {
    path: 'conscript/refuse',
    key: 'deserter',
    teacher: 'the ferryman',
    method: 'night-bridge',
    work: {
      title: 'Carry the ferryman’s message upriver and back.',
      reason:
        'A half-blood ferryman on the River-Bend docks will hide a lit child, if the child is useful. He needs a message carried to a boat that can’t be seen talking to him, and pays in the Night Bridge’s breathing.',
      act: {
        label: 'Carry the message',
        work: 'deserter',
        effects: [
          { do: 'method', id: 'night-bridge' },
          { do: 'routine', id: 'lantern-hours' },
          { do: 'flag', id: 'night-bridge' },
          { do: 'flag', id: 'night-bridge-favor' },
        ],
        text: 'You carry it up the wharves in your sleeve and hand it to a boatman who doesn’t look at you. That night the ferryman teaches you to breathe the way the Society’s runners do, low and slow, under the water’s noise.',
      },
    },
    breath: {
      title: 'Breathe Under the Water',
      reason: 'Breathe by it before the bounty hunters reach the docks.',
      thanks: '“You breathe like a runner already. Good: you are one now.”',
    },
    lesson: {
      title: 'Undertow',
      reason:
        'The Society’s runners fight knee-deep, where footing is a lie, and turn the tide’s pull into a palm. The ferryman teaches the Undertow Palm to a runner who has studied and can put another runner in the river.',
      spar: 'a Society runner',
      roster: 'night-bridge-smuggler',
      technique: 'undertow-palm',
      techniqueName: 'Undertow Palm',
      thanks: '“You fell in forty times. The forty-first, the river fell instead.”',
    },
    board: {
      title: 'The Ferryman’s Debt',
      reason:
        'The ferryman owes a dockside alchemy shop a sack of lotus seed, and the shop has posted it on River-Bend’s board where the garrison can see whose debt it is. Cut it, and the debt is paid in your name, not his.',
      posting: {
        spot: 'qm-op-lotus-backwater',
        template: 'quest-lotus',
        title: 'Lotus seed for the dockside shop',
        pay: 20,
        road: 'marsh-crocodile',
      },
      spotName: 'Lotus Backwater',
      thanks:
        'The board pays you, and the ferryman hands over a tempering art the Society’s porters learn: “You’ll be carrying more than messages.”',
    },
    place: {
      kind: 'own',
      title: 'Your Own Way',
      giver: 'the ferryman',
      reason:
        'You belong to no power: no stipend, no hall, no senior, and a bounty on your head. Nobody makes you keep a quota. The Society lends a hut to those it hides, the docks hire anyone, and the ferryman’s first real job pays a nourishing art.',
      hideout: 'qm-op-stilt-hut',
      hideoutName: 'the Stilt Hut over the reeds',
      hire: 'dock-carrying',
      hireName: 'carrying on the docks',
      job: {
        label: 'Make the run',
        card: 'job-night-run',
        flag: 'job-night-run',
        text: 'Make a Night Bridge run past the river patrol.',
      },
      thanks:
        'The ferryman pays in a nourishing art with a Night Bridge seal cut out of its cover. “You earned it. The favor is still owed.”',
    },
  },
  // ---------------------------------------------------------------- the frontier orphan, sworn
  {
    path: 'frontier-orphan/along',
    key: 'gate-disciple',
    teacher: 'your senior',
    method: 'butcher-saber',
    breath: {
      title: 'Breath Before the Block',
      reason:
        'An outer disciple who can’t draw qi by the end of the first week is sent back to the City’s alleys, and your senior has staked his name on the recruiter’s pick.',
      thanks: '“Fine. Now you’re worth feeding.”',
    },
    lesson: {
      title: 'The First Cleave',
      reason:
        '“Saber Dao starts at the butcher’s block. Split the bone, not the meat.” Your senior teaches the Bone-Splitting Cleave to an outer disciple who has studied and can put a year-ahead disciple down on the training ground.',
      spar: 'an outer disciple a year ahead',
      roster: 'beast-butcher-disciple',
      technique: 'bone-splitting-cleave',
      techniqueName: 'Bone-Splitting Cleave',
      thanks:
        '“By the time a carcass is in pieces, you’ll hear the bone before the blade reaches it.”',
    },
    board: {
      title: 'A Senior’s Debt',
      reason:
        'Your senior owes the mission hall a delivery of beast-blood vine he never cut, and the debt is posted with his name on it. He wants it paid by someone whose name isn’t.',
      posting: {
        spot: 'qm-op-blood-vine-gorge',
        template: 'quest-blood-vine',
        title: 'Vine for the mission hall',
        pay: 20,
        road: 'thunder-deer',
      },
      spotName: 'Blood-Vine Gorge',
      thanks:
        'The hall pays, and your senior throws you a tempering art: “Cores come from beasts, and beasts hit hard. Harden up.”',
    },
    place: {
      kind: 'post',
      title: 'The Medicine Garden',
      giver: 'your senior',
      job: 'gate-garden',
      take: 'Take the medicine garden at the Work door: its shift goes on your wheel as Duty.',
      reason:
        'An outer disciple works a post for the Gate’s contribution: yours is the medicine garden. Every outer disciple with contribution on the ledger may take a nourishing art from the hall, and your senior wants yours on it before his own seniors ask why it isn’t.',
      thanks:
        '“Contribution on the ledger. Here: the Still Lantern, from the hall. Don’t tell anyone a butcher reads it.”',
    },
  },
  // ---------------------------------------------------------------- the frontier orphan, on the street
  {
    path: 'frontier-orphan/refuse',
    key: 'street',
    teacher: 'the bounty office’s clerk',
    method: 'bounty-scrap',
    work: {
      title: 'Mind the clerk’s stall for a day.',
      reason:
        'The bounty office’s clerk needs someone to mind a stall of pawned odds and ends while the runners are out, and pays a lit child in what nobody else will buy: half a torn manual.',
      act: {
        label: 'Mind the stall',
        work: 'street',
        effects: [
          { do: 'copy', id: 'method:bounty-scrap' },
          { do: 'flag', id: 'bounty-runner' },
        ],
        text: 'You sell three hooks and a cracked pot all day, and at dusk the clerk pays you in half a manual torn out of a dead hunter’s pack. The other half is missing. It will want reading before it is any use.',
      },
      read: 'Read the torn manual: it takes your whole day until it is read.',
    },
    breath: {
      title: 'Half a Manual',
      reason: 'The clerk wants to see you breathe by it before you’re trusted with a posting.',
      thanks: '“Half a manual and you breathe like that. Don’t let the Gate see.”',
    },
    lesson: {
      title: 'Alley Wind',
      reason:
        'A retired hunter who drinks on the office stairs puts the alleys’ wind behind a palm and calls it the Alley Wind Palm. He shows it to a runner who has studied and can put him on the stairs, which he lets you do, nearly.',
      spar: 'the retired hunter on the stairs',
      roster: 'garrison-deserter',
      technique: 'alley-wind-palm',
      techniqueName: 'Alley Wind Palm',
      thanks: '“Every corner you take at a run, push the wind ahead of you a little harder.”',
    },
    board: {
      title: 'Kelp for Pill Street',
      reason:
        'An alchemy shop on Pill Street has posted for blood-salt kelp, and the runners are all out. The clerk says a street child needs the stones more than the board needs a cultivator.',
      posting: {
        spot: 'qm-op-kelp-flats',
        template: 'quest-kelp',
        title: 'Kelp for Pill Street',
        pay: 20,
        road: 'tide-crabs',
      },
      spotName: 'the Kelp Flats',
      thanks:
        'The board pays, and the clerk pushes a pawned tempering art across the counter: “Nobody redeemed it. You run enough to need it.”',
    },
    place: {
      kind: 'own',
      title: 'Your Own Way',
      giver: 'the bounty office’s clerk',
      reason:
        'You belong to no power: no stipend, no hall, no senior, and the Gate remembers you said no. Nobody makes you keep a quota either. Every street cultivator sleeps in the Drowned Shrine sometime, the office hires stall-minders, and the clerk’s first real bounty pays a nourishing art.',
      hideout: 'qm-op-drowned-shrine',
      hideoutName: 'the Drowned Shrine in the fens',
      hire: 'stall-minding',
      hireName: 'minding the bounty office’s stall',
      job: {
        label: 'Take the bounty',
        card: 'job-runaway-bounty',
        flag: 'job-runaway-bounty',
        text: 'Bring in the Gate’s runaway orphan, the bounty the clerk keeps under the counter.',
      },
      thanks:
        'The clerk pays you in a pawned nourishing art. “You ran a hundred errands and one real one. Call it a start.”',
    },
  },
];

export const CHAIN_QUESTS: readonly Quest[] = STARTS.flatMap(chain);

/**
 * The first lesson's sparring partner by origin path (core/spar.ts, `chainPartner`): who they are
 * in words and the roster template they fight as. The spar always teaches: they hold back, a layer
 * under you at the roster's lowest pedigree, and a loss is again tomorrow.
 */
export const CHAIN_SPAR: Readonly<Record<string, { words: string; roster: string }>> =
  Object.fromEntries(
    STARTS.map((s) => [s.path, { words: s.lesson.spar, roster: s.lesson.roster }]),
  );
