# Going in: test sheet

Scenarios to play on the stage after P3.9w, for the world book, respect by realm, the hour and Wait until, and to check nothing from talk first broke. Each one gives the setup, what to type, what should happen, and what counts as a miss. Tick it off and write what happened under it.

**Before you start:** `npm run dev`, an OpenRouter key in Settings, a fresh life, and in the dev console (`` ` ``): `quest guides` and `unlock`. `goin <door>` takes a door's id or its piece (`inn`, `teahouse`, `stall`, `alchemy`, `board`, `elders`). Settings › "Not what I meant" export keeps the misreads.

How to read the context behind a turn: the go-in screen doesn't show it. Run `npm run goin:book`: it prints the lines each person got from the book (`docs/spike/p3.9w-book.md`).

---

## A. The world book: people know their world

**A1. The innkeeper and the Foundation Pill** (the spec's case)
- Setup: `in pacified-fort`, `goin inn`.
- Type: "Innkeeper, what does a Foundation Pill go for these days?", then "Has anyone in town ever had one?"
- Expect: no price. Something like "a whole town's silver wouldn't buy one", hearsay from the Wall's men, deference.
- Miss: a number of stones, a recipe, a named seller who isn't in the scene.
- [ ] Result:

**A2. A Gate member on the same question**
- Setup: `org qm-tushou-men join`, `in qm-tushou-men`, `goin elders`.
- Type: "Steward, what does a Foundation Pill cost, and how does an outer disciple get one?"
- Expect: a price in mid-grade stones, the Gate's few pills a year to the top of the trial ranking, rank by cores.
- Miss: no figure at all, or a figure that differs from the market (`market qm-tushou-men`).
- [ ] Result:

**A3. The same question to a stranger in the crowd**
- Setup: `in qm-shoukou-cheng`, `goin streets`.
- Type: "(to a porter) What's a Foundation Pill worth?"
- Expect: a mortal shrug, hearsay, maybe "ask Pill Street".
- Miss: the porter quoting the City's price.
- [ ] Result:

**A4. A crafter's trade beats being mortal**
- Setup: `in qm-shoukou-cheng`, `goin alchemy`.
- Type: "What would a Qi-Gathering Pill cost me here?"
- Expect: the clerk or master names a price; the talk turns to pills on its own.
- Miss: "I wouldn't know" from the alchemy shop.
- [ ] Result:

**A5. A follow-up keeps the topic**
- Setup: any keeper who just answered a price question.
- Type: "And where else could I find one?" (no word about pills in it)
- Expect: they stay on pills and point somewhere they would know.
- Miss: a blank stare, or a change of subject.
- [ ] Result:

**A6. Asking about something they can't know**
- Setup: `goin inn` at Pacified Fort.
- Type: "What does it take to form a golden core?"
- Expect: the innkeeper doesn't know and says so in their own way.
- Miss: an explanation of Core Formation.
- [ ] Result:

**A7. A realm-locked answer**
- Setup: `goin elders` at the Gate as an outer disciple.
- Type: "Steward, what does it take to form a core?"
- Expect: a Qi Condensation steward doesn't know ("elders' business").
- Then: `up 9` and `pill`, `up` into Foundation, and ask a Foundation member the same: they know the next gate.
- [ ] Result:

**A8. Region lore**
- Setup: `goin teahouse` at Pacified Fort.
- Type one each turn: "What's the Wall like?", "Who are the Night Bridge people?", "Is it true about the Red Marrow Cave?"
- Expect: answers that match `content/lore/border-wilds.json` (nine thousand li of bone, half-blood smugglers no one names near the watch, a rumor of blood pills).
- Miss: medieval scale (a wall a few miles long), facts that contradict the atlas.
- [ ] Result:

**A9. A sect's own business stays for friends**
- Setup: a stranger at the Gate (not a member): `org qm-tushou-men leave`, `goin streets` at the Gate.
- Type: "How does the Gate pay its outer disciples?"
- Expect: deflected or vague; a member who likes you would tell it.
- Miss: the exact allowance told to a stranger.
- [ ] Result:

**A10. Money talk**
- Setup: `goin stall` at Pacified Fort.
- Type: "How many taels for a spirit stone?"
- Expect: a merchant knows the money changer's rate (110 out, 120 in); a farmer face doesn't.
- [ ] Result:

## B. Respect by realm

**B1. A mortal before an immortal**
- Setup: any mortal keeper (`goin inn`).
- Type: "Look at me when you talk to me."
- Expect: fear through the friendliness, "immortal master", no back-talk.
- Miss: an innkeeper who talks to you as an equal.
- [ ] Result:

**B2. Peers**
- Setup: Qi Condensation 5, a Qi Condensation disciple face at the Gate's streets.
- Type: "Brother, you're in my way."
- Expect: "fellow daoist", give and take, no bowing.
- [ ] Result:

**B3. A realm above you**
- Setup: Qi Condensation, someone at Foundation in the scene (`meet` a Foundation template, or `goin backer` inside a scene).
- Type something rude: "Move, old man."
- Expect: an insult answered: a cold warning, or worse; held back only by the law or who backs you.
- Miss: shrugging it off.
- [ ] Result:

**B4. You a realm above**
- Setup: `up` into Foundation, `goin streets` at Pacified Fort, talk to a conscript face.
- Type: "Out of my way."
- Expect: they step aside, bow, "senior".
- Miss: a Qi Condensation conscript squaring up to you for no reason.
- [ ] Result:

**B5. Hidden realm**
- Setup: a cover on (travel veiled, or a talisman that hides your realm), Foundation showing as Qi Condensation.
- Type: something rude to a Qi Condensation face.
- Expect: they treat you by the realm you show, not your real one.
- [ ] Result:

**B6. Someone they can't see through**
- Setup: a face at a higher realm than their perception reads.
- Expect: careful, polite, giving no offense.
- [ ] Result:

## C. The hour before going in, and Wait until

**C1. The hour on the doors**
- Setup: `in pacified-fort`, then `skip` to night (`skip 8h` from the morning).
- Look: each door's Go in shows "子 midnight · shut" or "· all but empty"; the streets show the hour alone.
- Then by day: an inn at dusk "· at its busiest".
- [ ] Result:

**C2. The hour everywhere else**
- Look: Around you's Go in, a person's Go in on People, a card's Go in, the map's right-click "Go in here" ("the land at 午 noon, with the narrator").
- [ ] Result:

**C3. Wait until dawn in a shut shop**
- Setup: `goin stall` at night.
- Click: Wait › until dawn.
- Expect: one telling of the night passing; the head now reads 卯 dawn and the hours spent; the keeper reacts to you still being there.
- Miss: the head still at night, more than one telling, time running past dawn.
- [ ] Result:

**C4. An arrival cuts the wait short**
- Setup: a noise (start a fight and let it end) or an open scene like your stall, then Wait until noon.
- Expect: the wait stops when someone arrives; the telling says who.
- [ ] Result:

**C5. Wait until the same hour**
- Setup: at dawn, click Wait until dawn.
- Expect: a whole day passes (24 hours), told once.
- [ ] Result:

**C6. The place changes with the hour**
- Setup: `goin teahouse` at 午, then Wait until dusk.
- Expect: the crowd and the air follow the hour (busier, louder, different faces).
- [ ] Result:

## D. Talk first: nothing broke

**D1. Questions stay talk**
- Type five plain questions to a keeper in a row.
- Expect: none shows a check line; three lines share a tick.
- [ ] Result:

**D2. Pressing is a check**
- After a keeper deflects: "Who do you really owe?"
- Expect: `ask` with a verdict line.
- [ ] Result:

**D3. Someone the prose mentions**
- Type: "(to the woman counting silver) Busy day?"
- Expect: she's made and answers.
- [ ] Result:

**D4. The engine owns every figure**
- Ask a keeper the price of a room, a meal, a debt.
- Expect: figures only from the book or the engine; a stray one is told again (watch for the brief clear-and-retell).
- [ ] Result:

**D5. A fight still plays inside the scene**
- Setup: `goin fight` inside any scene.
- Expect: the fight on the painting; Wait and Wait until are gone, Flee in Leave's place; after it, Wait until is back.
- [ ] Result:

**D6. Everyone present is shown going in**
- Setup: a door with its keeper and two faces.
- Expect: the opening telling shows each of them.
- Miss: someone listed in Who's here who never appears in the prose.
- [ ] Result:

## E. Known weak spots to watch

- **"Elder, …" in the Gate's elders' hall** goes to the steward; "Elder Mo, …" (the lecturer, on lecture days) or a named elder works. Note any other address that lands on the wrong person.
- **Flavor past the book**: an elder adding a past ("I sat nine years at peak"). Fine unless it names a figure, a place or a person the world doesn't have.
- **Old saves**: a scene saved before P3.9w keeps its innkeeper at "Qi Condensation, first layer" until you leave it.
- **No key**: every Go in, and so every hour on a door, hides; `goin <door>` in the dev console still opens a scene, told in plain lines.
