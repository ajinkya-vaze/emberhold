# Emberhold

An ad-free, offline tower-defense game for iPhone, built as a web app. See [SPEC.md](SPEC.md) for the full design.

**Status:** playable campaign (6 stages) plus Endless Siege.

**How a battle works:**

- **Move the King:** drag anywhere on the screen, or use arrow keys / WASD on a computer. He automatically shoots arrows at the **nearest** enemy, so where you stand decides what he hits.
- **Fighting:** enemies who reach the King stop and fight him. Crossbowmen fire bolts at where he's standing; keep moving and they miss. If he falls, he drops a quarter of his coins and comes back at the Keep 5 seconds later.
- **Coins:** killed enemies drop coins. Walk near them to collect them; they vanish after 25 seconds.
- **Building:** stand on a spot and coins flow into it.
  - **Watch towers** sit beside the road and shoot arrows. They have 3 levels.
  - **Barricades** go on the road, and enemies must smash through them. They have 3 levels; rebuild them when broken.
  - **Armory**, in front of the Keep: Bow (more damage), Quiver (faster shots), Volley (extra arrows), and Repair for the Keep.
- **Goal:** protect the Keep. You earn up to 3 stars per stage, based on how much Keep HP is left.
- **Enemies (9):** Raider, Cutpurse, Shieldbearer, Brute, Harpy (flies over barricades), Shaman (heals), Crossbowman (ranged), and two bosses: Warlord Grask and Hexmother Vyl.

## Run it

```bash
python3 tools/serve.py
```

Then open http://localhost:8765 on this Mac. To play on your iPhone, connect it to the same Wi-Fi and open `http://<this Mac's IP>:8765` in Safari.

## Publish to GitHub Pages

One-time setup:

1. On github.com, create a new **public** repository named `emberhold`. Leave it empty, with no README.
2. In this folder, connect it and push. Replace `YOUR-USERNAME` with your GitHub username. When git asks for a password, use a personal access token from GitHub → Settings → Developer settings, not your account password.

   ```bash
   git remote add origin https://github.com/YOUR-USERNAME/emberhold.git
   ```

   ```bash
   git push -u origin main
   ```

3. In the repository, go to Settings → Pages. Set **Source** to "Deploy from a branch", **Branch** to `main` / `(root)`, and save.

About a minute later, the game is live at `https://YOUR-USERNAME.github.io/emberhold/`.

To update the game later, commit your changes and run `git push`. If you added or removed files in `src/`, update the list in `sw.js` first and bump its `VERSION`; `python3 tools/check_sw.py` checks the list.

## Install on iPhone

1. Open `https://YOUR-USERNAME.github.io/emberhold/` in **Safari**. Other browsers can't install web apps on iOS.
2. Tap **Share**, then **Add to Home Screen**, then **Add**.
3. Launch it once from the home screen while online. After that it works offline, full-screen, with no browser bars.

Updates download automatically the next time you open the app while online. If you don't see a change, close the app and reopen it.

Progress is saved inside the home-screen app and is separate from anything you played in Safari or on the `192.168…` test address. Deleting the app from the home screen deletes its progress.

## Layout

| Path | What's there |
|---|---|
| `src/main.js` | Canvas setup, game loop, input |
| `src/scenes/battle.js` | Battle simulation, rendering, UI |
| `src/scenes/menu.js` | Title screen |
| `src/data/` | Enemies, the King, towers, barricades, armory (`units.js`); stages and the endless wave generator (`stages.js`). **Tune balance here.** Each stage has an `hpMul` difficulty setting |
| `src/scenes/campaign.js` | Campaign map and stage details |
| `src/progress.js` | Unlock rules for stages and Endless mode |
| `src/art.js` | All sprites, drawn in code |
| `src/audio.js` | Synthesized sound effects |
| `tools/balance.js` | Headless bot that steers the King through battles to check difficulty |
| `sw.js`, `manifest.webmanifest`, `icons/` | Offline support and home-screen app setup |
| `tools/make-icons.html` | Redraws the app icons (open it on the local dev server) |

## Balance check

In the browser console on the running game:

```js
const B = await import('/tools/balance.js');
B.all(3)        // every stage, 5 bot strategies, 3 runs each
B.report(2)     // one stage (index 2 = stage 1-3), with Keep HP after each wave
B.endless()     // how far each strategy gets in Endless Siege
```

The bot steers the King itself: it collects coins, follows a build order, fights from bow range, and retreats when hurt. Its strategies are `expert`, `casual`, `buildings` (no King upgrades), `king-only` (no towers or barricades) and `idle`. It restores your saved progress after each run. It switches scenes, so don't run it in a tab you're playing in.
