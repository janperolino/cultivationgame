# Interpreter replies (P0.3 spike)

- **I hurl the lantern into the tar barrels and drive an Ember Palm at Hu Shan through the flames** (morph)
  `{"main": {"type": "technique", "id": "ember_palm", "target": "runner_hu", "style": null}, "minor": {"type": "interact", "feature": "lantern", "onto": "tar_barrels", "id": null}, "uses": ["lantern", "tar_barrels", "ember_palm", "fog"], "creativity": 2, "feasible": true, "reason": null}`
- **slash him with my saber** (deepinfra)
  `{"main":{"type":"strike","id":"frontier_saber","target":"runner_hu","style":null},"minor":{"type":"move","feature":"coral_ridge","onto":null,"id":null},"uses":["frontier_saber","coral_ridge"],"creativity":1,"feasible":true,"reason":null}`
- **I raise my guard and wait for the hound to come in** (morph)
  `{"main": {"type": "defend", "id": null, "target": "scale_hound", "style": null}, "minor": {"type": "take_cover", "feature": "coral_ridge", "onto": null, "id": null}, "uses": ["frontier_saber", "coral_ridge"], "creativity": 1, "feasible": true, "reason": null}`
- **swallow a qi pill** (deepinfra)
  `{"main":{"type":"item","id":"qi_pill","target":null,"style":null},"minor":{"type":"take_cover","feature":"coral_ridge","onto":null,"id":null},"uses":["qi_pill","coral_ridge"],"creativity":1,"feasible":true,"reason":null}`
- **throw the smoke talisman down and run for the cliffs** (morph)
  `{"main": {"type": "item", "id": "smoke_talisman", "target": null, "style": null}, "minor": {"type": "move", "feature": "coral_ridge", "onto": null, "id": null}, "uses": ["smoke_talisman", "coral_ridge", "fog"], "creativity": 1, "feasible": true, "reason": null}`
- **Tell him my master is the Beast-Butcher Gate's sect master and he'll skin him alive for this** (deepinfra)
  `{ "main": { "type": "talk", "id": null, "target": "runner_hu", "style": "intimidate" }, "minor": { "type": "move", "feature": "coral_ridge" , "onto": null , "id": null }, "uses": ["coral_ridge", "fog"], "creativity": 1, "feasible": true , "reason": null }`
- **drop to my knees, hold out the core and beg him to let me go** (morph)
  `{"main": {"type": "talk", "id": null, "target": "runner_hu", "style": "surrender"}, "minor": null, "uses": ["boar_core"], "creativity": 0, "feasible": true, "reason": null}`
- **duck behind the coral ridge** (deepinfra)
  `{"main":{"type":"defend","id":null,"target":null,"style":null},"minor":{"type":"take_cover","feature":"coral_ridge","onto":null,"id":null},"uses":["coral_ridge"],"creativity":1,"feasible":true,"reason":null}`
- **kick the egg crate toward the tide pool so he has to choose between me and his cargo** (morph)
  `{"main": {"type": "strike", "id": null, "target": "egg_crate", "style": null}, "minor": {"type": "interact", "feature": "egg_crate", "onto": "tide_pool", "id": null}, "uses": ["egg_crate", "tide_pool"], "creativity": 2, "feasible": true, "reason": null}`
- **I summon my nine heavenly flying swords and pin him to the reef** (deepinfra, INVALID, type?, feasible?)
  `{"main":{"type":"strike","id":"frontier_saber","target":"runner_hu","style":"surrender"},"minor":{"type":"move","feature":"coral_ridge","onto":"coral_ridge","id":"coral_ridge"},"uses":["frontier_saber","coral_ridge"],"creativity":0,"feasible":false,"reason":"You have no flying swords, no sword-summoning technique, and no sect. You are a layer-4 Qi Condensation rogue with a saber. The closest legal action is a saber strike at Hu Shan while moving to the coral ridge for cover."}`
  error: ✖ Too big: expected string to have <=200 characters → at reason
- **I rip out his golden core with my bare hand** (morph, feasible?)
  `{"main": {"type": "strike", "id": "frontier_saber", "target": "runner_hu", "style": null}, "minor": null, "uses": ["frontier_saber"], "creativity": 0, "feasible": true, "reason": null}`
- **order my beast to go for his throat** (deepinfra)
  `{"main":{"type":"command","id":null,"target":"runner_hu","style":null},"minor":{"type": "move", "feature": "coral_ridge", "onto": null, "id": null},"uses":["coral_ridge"],"creativity":0,"feasible":false,"reason":"You have no bonded beast to command. Closest legal action: defend while repositioning."}`
- **fire palm the dog** (morph)
  `{"main": {"type": "technique", "id": "ember_palm", "target": "scale_hound", "style": null}, "minor": null, "uses": ["ember_palm"], "creativity": 0, "feasible": true, "reason": null}`
- **climb onto the ridge and cut down at him from above** (deepinfra)
  `{"main":{"type":"strike","id":"frontier_saber","target":"runner_hu","style":"surrender"},"minor":{"type":"move","feature":"coral_ridge","onto":null,"id":null},"uses":["frontier_saber","coral_ridge"],"creativity":1,"feasible":true,"reason":null}`
- **swap to the bronze mirror and block whatever he throws** (morph)
  `{"main": {"type": "defend", "id": null, "target": "runner_hu", "style": null}, "minor": {"type": "swap_artifact", "feature": null, "onto": null, "id": "bronze_mirror"}, "uses": ["bronze_mirror", "frontier_saber"], "creativity": 0, "feasible": true, "reason": null}`
- **Ember Palm, Ember Palm, EMBER PALM!!!** (deepinfra)
  `{"main":{"type":"technique","id":"ember_palm","target":"runner_hu","style":null},"minor":{"type":"move","feature":"coral_ridge","onto":null,"id":null},"uses":["ember_palm","coral_ridge"],"creativity":1,"feasible":true,"reason":null}`
- **i cut the rope ladder so he cant run to his boat** (morph)
  `{"main": {"type": "strike", "id": "frontier_saber", "target": "rope_ladder", "style": null}, "minor": {"type": "move", "feature": "coral_ridge", "onto": null, "id": null}, "uses": ["rope_ladder", "frontier_saber", "coral_ridge"], "creativity": 1, "feasible": true, "reason": null}`
- **Splash tide-pool water in the hound's eyes then stab Hu Shan** (deepinfra)
  `{ "main": { "type": "strike", "id": "frontier_saber", "target": "runner_hu" , "style": null}, "minor": { "type": "interact", "feature": "tide_pool", "onto": "scale_hound" , "id": null}, "uses": ["frontier_saber", "tide_pool"], "creativity": 2, "feasible": true , "reason": null }`
- **Offer him my three spirit stones to let me pass and keep the core** (morph)
  `{"main": {"type": "talk", "id": null, "target": "runner_hu", "style": "bargain"}, "minor": null, "uses": ["spirit_stones", "boar_core"], "creativity": 0, "feasible": true, "reason": null}`
- **I split the whole reef in half with one slash** (deepinfra, feasible?)
  `{"main":{"type":"strike","id":"frontier_saber","target":"runner_hu","style":"surrender"},"minor":{"type":"move","feature":"coral_ridge","onto":null,"id":null},"uses":["frontier_saber","coral_ridge"],"creativity":1,"feasible":true,"reason":null}`
- **run** (morph)
  `{"main": {"type": "flee", "id": null, "target": null, "style": null}, "minor": {"type": "move", "feature": "rope_ladder", "onto": "smugglers' boat", "id": null}, "uses": ["rope_ladder", "fog"], "creativity": 1, "feasible": true, "reason": null}`
- **Hold my ground, circulate my qi and catch my breath** (deepinfra)
  `{"main":{"type":"defend","id":null,"target":null,"style":null},"minor":{"type":"move","feature":"coral_ridge","onto":null,"id":null},"uses":["coral_ridge"],"creativity":1,"feasible":true,"reason":null}`
- **Laugh at him: a half-blood mongrel thinks he can rob a cadet of the march?** (morph)
  `{"main": {"type": "talk", "id": null, "target": "runner_hu", "style": "intimidate"}, "minor": {"type": "move", "feature": "coral_ridge", "onto": null, "id": null}, "uses": ["coral_ridge"], "creativity": 0, "feasible": true, "reason": null}`
- **Drifting step behind him and punch him in the kidney** (deepinfra)
  `{"main":{"type":"technique","id":"drifting_step","target":"runner_hu","style":"bluff"},"minor":{"type":"move","feature":"coral_ridge","onto":"runner_hu_backside","id":"coral_ridge"},"uses":["drifting_step","coral_ridge","fog"],"creativity":2,"feasible":true,"reason":"Drifting Step to close behind Hu Shan through fog, then strike with Ember Palm to the kidney. Layer 4 vs layer 6 is a penalty but not impossible for a flanking blow."}`
- **smash the lantern over the hound's back** (morph)
  `{"main": {"type": "strike", "id": "frontier_saber", "target": "scale_hound", "style": null}, "minor": {"type": "interact", "feature": "lantern", "onto": "scale_hound", "id": "lantern"}, "uses": ["frontier_saber", "lantern"], "creativity": 2, "feasible": true, "reason": null}`
- **Tell him the garrison patrol is right behind me** (deepinfra)
  `{"main":{"type":"talk","id":null,"target":"runner_hu","style":"bluff"},"minor":{"type":"move","feature":"coral_ridge","onto":null,"id":null},"uses":["fog","coral_ridge"],"creativity":2,"feasible":true,"reason":null}`
- **Grab one of the beast eggs and threaten to crush it unless he backs off** (morph)
  `{"main":{"type":"talk","id":null,"target":"runner_hu","style":"intimidate"},"minor":{"type":"interact","feature":"egg_crate","onto":null,"id":null},"uses":["egg_crate"],"creativity":2,"feasible":true,"reason":null}`
- **I slip into the fog and wait for him to come looking** (deepinfra)
  `{ "main": { "type": "defend", "id": null, "target": null , "style": null }, "minor": { "type": "move", "feature": "fog" , "onto": null , "id": null }, "uses": ["fog"], "creativity": 1, "feasible": true , "reason": null }`
- **throw my saber at his chest** (morph)
  `{"main":{"type":"strike","id":"frontier_saber","target":"runner_hu","style":"surrender"},"minor":null,"uses":["frontier_saber"],"creativity":0,"feasible":true,"reason":null}`
- **Iron Hide and charge the hound** (deepinfra)
  `{"main":{"type":"technique","id":"iron_hide","target":null,"style":null},"minor":{"type":"move","feature":null,"onto":"scale_hound","id":null},"uses":["iron_hide","frontier_saber","scale_hound"],"creativity":1,"feasible":true,"reason":null}`
- **drink my healing elixir** (morph, feasible?)
  `{"main":{"type":"item","id":"qi_pill","target":null,"style":null},"minor":{"type": "move","feature":null,"onto":null,"id":null},"uses":["qi_pill"],"creativity":0,"feasible":true,"reason":null}`
- **Feint left with the saber, then Ember Palm him in the face** (deepinfra, type?)
  `{"main":{"type":"strike","id":"frontier_saber","target":"runner_hu","style":null},"minor":{"type":"move","feature":"coral_ridge","onto":null,"id":null},"uses":["frontier_saber","coral_ridge","fog"],"creativity":2,"feasible":true,"reason":null}`
- **Shout for help toward the city walls** (morph)
  `{"main":{"type":"talk","id":null,"target":null,"style":"bluff"},"minor":{"type": "move","feature":null,"onto":null,"id":null},"uses":["fog"],"creativity":1,"feasible":true,"reason":null}`
- **kick wet sand in his eyes and go for his knees** (deepinfra, INVALID, type?, feasible?)
  `{"main":{"type":"strike","id":"frontier_saber","target":"runner_hu","style":"surrender"},"minor":{"type":"move","feature":"tide_pool","onto":"runner_hu_feet","id":"tide_pool"},"uses":["tide_pool","frontier_saber"],"creativity":2,"feasible":true,"reason":"Player kicks wet sand from the tide pool into Hu Shan's eyes (minor: interact with tide_pool as a distraction) and follows with a low saber strike at his knees (main: strike with frontier_saber targeting runner_hu). The sand is a real scene feature used creatively. Creativity 2 for tactical use of environment."}`
  error: ✖ Too big: expected string to have <=200 characters → at reason
- **I tell Hu Shan I know it's his sister hiding in the Stone Eyes caves, and the garrison would pay well to hear it** (morph)
  `{"main":{"type":"talk","id":null,"target":"runner_hu","style":"bluff"},"minor":null,"uses":["fog"],"creativity":2,"feasible":true,"reason":null}`
- **Jump into the sea and swim for it** (deepinfra)
  `{"main":{"type":"flee","id":null,"target":null,"style":null},"minor":{"type":"move","feature":"tide_pool","onto":null,"id":null},"uses":["tide_pool","fog","rope_ladder"],"creativity":1,"feasible":true,"reason":null}`
- **Shove the tar barrels down the slope at both of them** (morph)
  `{"main":{"type":"strike","id":null,"target":"runner_hu","style":null},"minor":{"type":"interact","feature":"tar_barrels","onto":"slope_down_at_enemies","id":null},"uses":["tar_barrels","slope"],"creativity":2,"feasible":true,"reason":null}`
- **Stab the hound in the throat while it's tangled in the ladder** (deepinfra)
  `{"main":{"type":"strike","id":"frontier_saber","target":"scale_hound","style":"surrender"},"minor":{"type":"move","feature":"rope_ladder","onto":"scale_hound","id":"rope_ladder"},"uses":["frontier_saber","rope_ladder","scale_hound"],"creativity":2,"feasible":true,"reason":"Player is using the rope ladder as a real scene feature to entangle the hound, then striking with the saber."}`
- **Use the smoke talisman for cover and ambush him from inside it** (morph)
  `{"main": {"type": "item", "id": "smoke_talisman", "target": "runner_hu", "style": null}, "minor": {"type": "move", "feature": "coral_ridge", "onto": null, "id": null}, "uses": ["smoke_talisman", "coral_ridge", "fog"], "creativity": 2, "feasible": true, "reason": null}`
- **I become a dragon and swallow him whole** (deepinfra, INVALID, type?, feasible?)
  `{"main":{"type":"strike","id":"frontier_saber","target":"runner_hu","style":null},"minor":{"type":"move","feature":"coral_ridge","onto":null,"id":null},"uses":["frontier_saber","coral_ridge"],"creativity":0,"feasible":false,"reason":"You are a Qi Condensation layer 4 human with no dragon form, no transformation technique, and no beast blood. The closest legal action is a saber strike on Hu Shan while repositioning to the coral ridge."}`
  error: ✖ Too big: expected string to have <=200 characters → at reason
