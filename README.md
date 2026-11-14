# Emberhold

An ad-free, offline tower-defense game for iPhone, built as a web app. See [SPEC.md](SPEC.md) for the full design.

**Status:** Milestone 1 plus a battle-content expansion.

- **Campaign:** Chapter 1 has 6 stages on a campaign map. Each stage unlocks the next, and you earn 1–3 stars per stage.
- **Endless Siege:** generated waves with a boss every 10 waves. Unlocks after stage 1-3.
- **Enemies (9):**
  - Raider, Cutpurse, Shieldbearer and Brute.
  - Harpy: flies straight at the wall; cannons can't hit it.
  - Shaman: heals nearby enemies.
  - Crossbowman: shoots the wall from range.
  - Bosses: Warlord Grask (war cry speeds up nearby enemies) and Hexmother Vyl (summons Cutpurses).
- **Towers (4):** Arrow, Cannon, Frost Spire (slows) and Arcane (magic damage that ignores armor), each with 3 levels.
- **Heroes (4):** Wren, Bram and Ignis, plus Vex the Stormcaller (chain lightning), unlocked by clearing 1-3. You pick 3 heroes for the wall on the map screen.
- **Boons:** 17, offered between waves.

## Run it

```bash
python3 tools/serve.py
```

Then open http://localhost:8765 on this Mac. To play on your iPhone, connect it to the same Wi-Fi and open `http://<this Mac's IP>:8765` in Safari.

## Layout

| Path | What's there |
|---|---|
| `src/main.js` | Canvas setup, game loop, input |
| `src/scenes/battle.js` | Battle simulation, rendering, UI |
| `src/scenes/menu.js` | Title screen |
| `src/data/` | Enemies, heroes, towers (`units.js`), stages and the endless wave generator (`stages.js`), boons. **Tune balance here.** Each stage has an `hpMul` difficulty setting |
| `src/scenes/campaign.js` | Campaign map, stage details, hero lineup |
| `src/progress.js` | Unlock rules for stages, heroes and Endless mode |
| `src/art.js` | All sprites, drawn in code |
| `src/audio.js` | Synthesized sound effects |
| `tools/balance.js` | Headless bot that plays the battle with 6 strategies to check difficulty |

## Balance check

In the browser console on the running game:

```js
const B = await import('/tools/balance.js');
B.all(3)        // every stage, 6 bot strategies, 3 runs each
B.report(2)     // one stage (index 2 = stage 1-3), with wall HP after each wave
B.endless()     // how far each strategy gets in Endless Siege
```

The bot restores your saved progress after each run. It switches scenes, so don't run it in a tab you're playing in.
