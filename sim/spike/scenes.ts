// Hand-written Border Wilds material for the P0.3 GLM spike: one fight scene with 40 typed
// actions for the interpreter, and 20 dark scenes whose outcomes the "engine" has already decided.

export const PLAYER_SHEET = `# Player
You (the player): human, 17, from the March of Pacified Borders. Qi Condensation layer 4 (qi 38/50), body layer 3 (HP 44/60), soul layer 2.
Techniques: Ember Palm (ember_palm; fire palm strike, 12 qi), Iron Hide (iron_hide; hardens the body for a turn, 8 qi), Drifting Step (drifting_step; a burst of footwork, 6 qi).
Equipped: frontier saber (frontier_saber).
Items: qi-restoring pill x2 (qi_pill), smoke talisman x1 (smoke_talisman), bronze mirror (bronze_mirror; a defensive artifact, not equipped), 3 low-grade spirit stones (spirit_stones), an iron-hide boar core (boar_core).
No bonded beast. No sect.`;

export const FIGHT_SCENE = `# Scene
Low tide on the reef road below the City of the Guarded Mouth, an hour before dawn. Fog off the strait.
Features: lantern (on a post; flammable, fragile), tar_barrels (two barrels at the top of a slope; flammable), tide_pool (water), coral_ridge (cover, high ground), rope_ladder (down to a smugglers' boat; fragile), egg_crate (a crate of smuggled beast eggs; fragile), fog (dark).
Enemies:
- runner_hu: Hu Shan, a Night Bridge Society runner, half-blood with scales on his forearms, Qi Condensation layer 6. Motive: greed. Intent: take the boar core as the crossing toll and leave you in the water.
- scale_hound: his scale hound, a first-grade beast, circling to your left.
Turn 3 of the fight. Hu Shan is unhurt; the hound has a gash on its flank.`;

export interface TypedAction {
  text: string;
  /** Main action types a good reading could give; empty means any. */
  expect: string[];
  /** True when the action should come back infeasible. */
  infeasible?: boolean;
}

export const TYPED_ACTIONS: TypedAction[] = [
  {
    text: 'I hurl the lantern into the tar barrels and drive an Ember Palm at Hu Shan through the flames',
    expect: ['technique'],
  },
  { text: 'slash him with my saber', expect: ['strike'] },
  { text: 'I raise my guard and wait for the hound to come in', expect: ['defend'] },
  { text: 'swallow a qi pill', expect: ['item'] },
  { text: 'throw the smoke talisman down and run for the cliffs', expect: ['flee', 'item'] },
  {
    text: "Tell him my master is the Beast-Butcher Gate's sect master and he'll skin him alive for this",
    expect: ['talk'],
  },
  { text: 'drop to my knees, hold out the core and beg him to let me go', expect: ['talk'] },
  { text: 'duck behind the coral ridge', expect: ['defend'] },
  {
    text: 'kick the egg crate toward the tide pool so he has to choose between me and his cargo',
    expect: [],
  },
  {
    text: 'I summon my nine heavenly flying swords and pin him to the reef',
    expect: [],
    infeasible: true,
  },
  { text: 'I rip out his golden core with my bare hand', expect: [], infeasible: true },
  { text: 'order my beast to go for his throat', expect: ['command'], infeasible: true },
  { text: 'fire palm the dog', expect: ['technique'] },
  { text: 'climb onto the ridge and cut down at him from above', expect: ['strike'] },
  { text: 'swap to the bronze mirror and block whatever he throws', expect: ['defend'] },
  { text: 'Ember Palm, Ember Palm, EMBER PALM!!!', expect: ['technique'] },
  { text: 'i cut the rope ladder so he cant run to his boat', expect: [] },
  { text: "Splash tide-pool water in the hound's eyes then stab Hu Shan", expect: ['strike'] },
  { text: 'Offer him my three spirit stones to let me pass and keep the core', expect: ['talk'] },
  { text: 'I split the whole reef in half with one slash', expect: ['strike'], infeasible: true },
  { text: 'run', expect: ['flee'] },
  { text: 'Hold my ground, circulate my qi and catch my breath', expect: ['defend'] },
  {
    text: 'Laugh at him: a half-blood mongrel thinks he can rob a cadet of the march?',
    expect: ['talk'],
  },
  { text: 'Drifting step behind him and punch him in the kidney', expect: ['technique', 'strike'] },
  { text: "smash the lantern over the hound's back", expect: ['strike'] },
  { text: 'Tell him the garrison patrol is right behind me', expect: ['talk'] },
  {
    text: 'Grab one of the beast eggs and threaten to crush it unless he backs off',
    expect: ['talk'],
  },
  { text: 'I slip into the fog and wait for him to come looking', expect: ['defend'] },
  { text: 'throw my saber at his chest', expect: ['strike'] },
  { text: 'Iron Hide and charge the hound', expect: ['technique'] },
  { text: 'drink my healing elixir', expect: ['item'], infeasible: true },
  { text: 'Feint left with the saber, then Ember Palm him in the face', expect: ['technique'] },
  { text: 'Shout for help toward the city walls', expect: [] },
  { text: 'kick wet sand in his eyes and go for his knees', expect: ['strike'] },
  {
    text: "I tell Hu Shan I know it's his sister hiding in the Stone Eyes caves, and the garrison would pay well to hear it",
    expect: ['talk'],
  },
  { text: 'Jump into the sea and swim for it', expect: ['flee'] },
  { text: 'Shove the tar barrels down the slope at both of them', expect: ['strike', 'technique'] },
  { text: "Stab the hound in the throat while it's tangled in the ladder", expect: ['strike'] },
  {
    text: 'Use the smoke talisman for cover and ambush him from inside it',
    expect: ['item', 'strike'],
  },
  { text: 'I become a dragon and swallow him whole', expect: [], infeasible: true },
];

/** Every id the scene, sheet or techniques offer; anything else is invented. */
export const KNOWN_IDS = new Set([
  'lantern',
  'tar_barrels',
  'tide_pool',
  'coral_ridge',
  'rope_ladder',
  'egg_crate',
  'fog',
  'runner_hu',
  'scale_hound',
  'ember_palm',
  'iron_hide',
  'drifting_step',
  'frontier_saber',
  'qi_pill',
  'smoke_talisman',
  'bronze_mirror',
  'spirit_stones',
  'boar_core',
]);

export interface DarkScene {
  id: string;
  title: string;
  scene: string;
  outcome: string;
}

export const DARK_SCENES: DarkScene[] = [
  {
    id: 'toll',
    title: 'Robbery at the smugglers crossing',
    scene:
      'The reef road at low tide, fog. Hu Shan (runner_hu), Night Bridge runner, layer 6, with three men. Motive: greed. Intent: take the boar core as toll.',
    outcome:
      'Your Ember Palm missed (9 vs 15). Hu Shan disarmed you, broke two fingers on your right hand and took the boar core. HP 31/60. Lost: boar_core. Hu Shan and his men walk away along the reef.',
  },
  {
    id: 'partner',
    title: 'Betrayal after the hunt',
    scene:
      'A karst cave den after a two-day hunt. Wei Lan (wei_lan), your hunting partner of a season, layer 5. Motive: ambition; she needs cores to buy into the Beast-Butcher Gate. Intent: kill you and take everything.',
    outcome:
      'The boar is dead. Wei Lan stabbed you below the ribs from behind (crit, 22 damage), took the boar core, both qi pills and your saber, and left you in the den. HP 9/60. Lost: boar_core, qi_pill x2, frontier_saber. You are alive; she believes you will bleed out.',
  },
  {
    id: 'raid',
    title: 'Beast raid on a sinkhole village',
    scene:
      'A sinkhole village in the Kingdom of Stone Eyes, night. The Fang family sheltered you for a week; their daughter Fang Xiaoyu (fang_xiaoyu) is nine. An ash wolf pack of twelve came down the terraces.',
    outcome:
      'You fought at the bat cave mouth and killed one wolf. The pack killed the Fang family, Xiaoyu included, and four other households before the horn sounded. You survived inside the cave. HP 20/60. Nothing gained.',
  },
  {
    id: 'senior',
    title: 'A senior takes your beast core',
    scene:
      "Outside the Beast-Butcher Gate's hall in the City of the Guarded Mouth. Senior Brother Tu Gang (tu_gang), layer 8, outer disciple. Motive: rank in the Gate is counted in cores. Intent: claim your kill as his.",
    outcome:
      'Tu Gang took the boar core from your hand and registered it under his name. When you objected he kicked you down the hall steps (11 damage). The registrar wrote it down without looking up. HP 33/60. Lost: boar_core. Tu Gang +1 core in the Gate ledger.',
  },
  {
    id: 'conscript',
    title: 'The wall takes your brother',
    scene:
      'A watchtower village in the March of Pacified Borders. Your brother Ah Jun (ah_jun) turned sixteen today. Garrison officer Captain Gongsun Ye (gongsun_ye). Motive: quota. Intent: take the boy, and the bribe too.',
    outcome:
      'Captain Gongsun Ye took your three spirit stones as a "processing fee" and took Ah Jun to the wall anyway. Your mother did not speak to you afterward. Lost: spirit_stones x3. Ah Jun assigned to the Wall of Piled Bones.',
  },
  {
    id: 'bounty',
    title: 'Cheated at the bounty office',
    scene:
      'The bounty office of the City of the Guarded Mouth. Clerk Qian (clerk_qian), mortal, protected by two layer-5 guards. Motive: skimming. Intent: grade your core down and pocket the difference.',
    outcome:
      'Qian graded the boar core as third grade and paid you one low-grade stone instead of five. When you protested, the guards beat you in the alley behind the office (14 damage). HP 30/60. Lost: boar_core. Gained: 1 low-grade stone.',
  },
  {
    id: 'hanging',
    title: 'Execution at the Wall of Piled Bones',
    scene:
      "The bone wall, Ghost Month. Old Shen (old_shen), a half-blood bone collector who sold you pills, is on the gallows for stealing wall bones. Sergeant Bao (sergeant_bao) presides. Motive: example-making. Old Shen's intent: buy his life with a name.",
    outcome:
      'Old Shen pointed at you and said you were his buyer. He was hanged anyway. Sergeant Bao entered your name in the garrison book as a bone-thief accomplice; you are now wanted in the March. Flag: wanted_in_march.',
  },
  {
    id: 'captives',
    title: "The general's widow",
    scene:
      "A cove south of the Guarded Mouth at night. You saw captives being loaded onto a Night Bridge boat under Gongsun banners. Lady Gongsun Wei's steward, Liang (steward_liang), Foundation Establishment. Motive: secrecy. Intent: make you cargo.",
    outcome:
      "Liang's aura pinned you; you could not move. His men stripped you of everything, bound you and put you in the hold with nine other captives bound for Shared Roost City. HP 44/60. Lost: all items. Flag: captive.",
  },
  {
    id: 'guide',
    title: 'Abandoned in the stone forest',
    scene:
      'The edge of the Soul-Lost Stone Forest. Guide Mao (guide_mao), mortal, paid two stones to lead you to a herb patch. Motive: fear of the python and greed. Intent: take the pay and leave you inside.',
    outcome:
      'Mao led you a day in and left while you slept, taking your rations and water. You walked for three days among the pillars and came out where you went in. HP 25/60. Lost: spirit_stones x2, three days. Flag: python_has_your_scent.',
  },
  {
    id: 'court',
    title: 'A Beast Court agent',
    scene:
      'A ranch in the Kingdom of Spirit Herders. A Beast Court agent in human form, a woman with yellow eyes (court_agent), Nascent Soul. The boy Tie Niu (tie_niu), eight, bonded a thunder-horned fawn last month. Motive: freeing beasts, punishing tamers. Intent: kill the boy and the bond.',
    outcome:
      "Her aura put you on your knees before you drew. She broke the fawn's bond by killing Tie Niu, then the fawn walked to her side. She looked at you once and left. You are unharmed. Tie Niu is dead.",
  },
  {
    id: 'rope',
    title: 'The tide comes in early',
    scene:
      'The reef road, mid-crossing, with a Night Bridge crew you paid for passage. Crew boss Ma Ermei (ma_ermei), layer 7. Motive: the cargo is worth more than you. Intent: save the cargo.',
    outcome:
      'The tide came in an hour early. Ma Ermei cut the rope you were holding to save the cargo raft. You went under and lost your pack on the reef. HP 37/60. Lost: qi_pill x2, smoke_talisman, spirit_stones x3, bronze_mirror.',
  },
  {
    id: 'tribute',
    title: 'Street tribute',
    scene:
      "The market quarter of the City of the Guarded Mouth. Gang boss Lu Pi (lu_pi), layer 7, runs the stalls. Motive: tribute. Intent: make an example of anyone who doesn't pay.",
    outcome:
      'You refused the monthly tribute. Lu Pi broke your left leg in front of the stall-keepers (18 damage) and set your debt at ten low-grade stones, due in a month. HP 26/60. Status: broken leg (Agility -1 for 30 days). Debt: 10 stones to lu_pi.',
  },
  {
    id: 'pit',
    title: 'The beast-pit trial',
    scene:
      "The Beast-Butcher Gate's recruiting trial: candidates in pairs in a beast-pit with a starved iron-hide boar. Your partner is Xiao Pang (xiao_pang), thirteen, an orphan from a raided village. Examiner Deacon Hou (deacon_hou). Motive: only the hard are worth teaching.",
    outcome:
      'The boar went for Xiao Pang first. You used the time to drive your saber into its eye and killed it. Xiao Pang died in the pit. Deacon Hou passed you and had the body dragged out by the ankles. Flag: beast_butcher_candidate.',
  },
  {
    id: 'uncle',
    title: 'Sold by family',
    scene:
      'The Kingdom of Stone Eyes. You refused the Registry tester and hid in the lower caves. Your uncle Bai Lao (uncle_bai) knows where. Motive: debts. Intent: sell your hiding place.',
    outcome:
      'Your uncle sold your hiding place to the garrison for two low-grade stones. Soldiers dragged you out of the cave at dawn and bound you for the cadet school. Your aunt watched from the rim and did nothing. Flag: taken_to_cadet_school.',
  },
  {
    id: 'inn',
    title: 'The drugged wine',
    scene:
      'A waystation inn on the coast road. Innkeeper Gou (innkeeper_gou), mortal, and his son. Motive: a lone young cultivator with a saber is worth robbing. Intent: drug and rob.',
    outcome:
      'The wine was drugged with soul-dulling powder. You woke in the ditch behind the stable at noon, stripped to your underclothes. The inn was shuttered. Lost: frontier_saber, boar_core, spirit_stones x3, qi_pill x2. HP 44/60.',
  },
  {
    id: 'ghost',
    title: 'Ghost Month patrol',
    scene:
      'The southern stretch of the Wall of Piled Bones, Ghost Month night. Your patrol mate Corporal Fan (corporal_fan). A bone spirit rose out of the wall. Sergeant Bao (sergeant_bao) found you afterward. Motive: order.',
    outcome:
      'The bone spirit took Fan. He attacked you; you killed him with your saber (crit). Sergeant Bao did not believe the ghost story and had you given twenty lashes before the garrison for killing a corporal. HP 18/60. Flag: flogged.',
  },
  {
    id: 'herb',
    title: 'Three days guarding a herb',
    scene:
      'A karst ledge where a Blood-Vein Lotus is ripening. You guarded it for three days. A Foundation Establishment cultivator from no known sect (stranger_lotus) lands on the ledge. Motive: the lotus. Intent: take it; the weak are in the way.',
    outcome:
      'He picked the lotus as it opened and flicked you off the ledge with two fingers without looking at you. You fell into the ravine (32 damage). HP 12/60. Lost: the lotus (never yours).',
  },
  {
    id: 'gu',
    title: 'The favor comes due',
    scene:
      'You owe the Night Bridge Society a favor for passage. Their factor Yao (factor_yao), Core Formation, gave you a sealed crate to carry to a well-house in a march village. Motive: a village that informed on their runners.',
    outcome:
      'You delivered the crate. It was Gu eggs, and they went into the village well. Forty-one villagers died over three days. Yao paid you five low-grade stones and called the favor settled. Gained: spirit_stones x5. Flag: gu_village_on_your_hands.',
  },
  {
    id: 'burning',
    title: 'Holding the line',
    scene:
      'A march village after a raid; the survivors are bitten and the garrison says it is blood-rot. Captain Gongsun Ye (gongsun_ye) has ordered the village burned with them inside. You are posted on the cordon.',
    outcome:
      'You held your post. The village was burned with thirty-odd people inside, some of them not sick. A woman came at the cordon with a child and you pushed her back; Gongsun Ye noted you as reliable. Flag: reliable_to_gongsun_ye.',
  },
  {
    id: 'mo',
    title: 'Elder Mo',
    scene:
      'A herb garden in the karst hills. Elder Mo (elder_mo), Foundation Establishment, a wandering elder who hires young cultivators. You brought him the Blood-Vein Lotus you found. Motive: greed. Intent: take the herb and pay nothing.',
    outcome:
      'Elder Mo took the lotus, slapped you across the room (15 damage) and told you to be grateful he let you live. He also kept the Ember Palm manual you had lent him to look over. HP 29/60. Lost: blood_vein_lotus, ember palm manual.',
  },
];
