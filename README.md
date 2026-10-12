# Severed Heaven 断天

A xianxia cultivation idle game. You are twelve on root-testing day in a broken world, and you climb from there: sit in seclusion, plan your day hour by hour, learn from the trees, meet people and see what the years bring. "Severed Heaven" is the working title until the game has a name.

**Play it:** https://janperolino.github.io/cultivationgame/

It runs in the browser, desktop first, and works on a phone. There is no account and no server.

## What is in it so far

This is milestone 1, the idle core. You can make a cultivator, live their first hour, climb Qi Condensation's nine layers toward Foundation, plan the day wheel, learn tree nodes and techniques, meet the people of your origin, and read your life back as a chronicle. Fighting, the world map and the AI-narrated "go in" mode come in later milestones.

## Good to know

- **Time runs while you're away.** Up to 12 hours of offline time counts, and a story card tells you what happened. At Qi Condensation one real hour is one year of your life.
- **Saves live in your browser.** Each slot autosaves. Export from Settings now and then: it's the only way to move a life to another device, and some browsers (Safari) clear sites you haven't visited in a while.
- **Ironman or gentle.** Ironman never rewinds. Gentle gives you one rewind to your latest breakthrough, refilled at each major one.
- **Make it yours.** Settings has text size, reduced motion, colors and the glass. A slower clock is there once you reach Foundation.
- **Feedback is welcome.** Tell Jan what felt slow, confusing or great.

## For the curious

Built with TypeScript, React and Vite. To run it locally you need Node 20 or newer:

```bash
npm install
npm run dev
```

`npm test`, `npm run lint` and `npm run build` check everything; `npm run sim -- pacing` prints the pacing tables. The rules live in `docs/design.md`, the world in `content/atlas/entries.json`, and the build plan in `plan.md`. Adding `?speed=20` to the URL runs the clock twenty times faster, for testing.
