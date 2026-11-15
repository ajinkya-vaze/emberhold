# Emberhold — Game Spec (v0.3)

> **v0.3 battle redesign (current).** The static heroes, skill cards, extra tower types and boons are gone. You now control **the King** directly.
>
> - **Movement:** drag to move him. He auto-shoots arrows at the nearest enemy.
> - **Coins:** killed enemies drop coins, which he must walk over to collect.
> - **Building:** stand on a spot to spend coins.
>   - Watch towers (arrows) beside the road.
>   - Barricades across the road, which enemies must break through.
>   - Armory upgrades for the King (Bow, Quiver, Volley) and Keep repair.
> - **Enemies:** they fight the King when he's close. Crossbowmen shoot at him, and he can dodge. The goal is protecting the Keep.
>
> Sections 8–10 below describe the earlier design and are kept for reference; the town/economy plan (M2+) still applies.

*Working title. An original, ad-free, offline, single-player game for iPhone, inspired by the genre of Kingshot (Century Games). We reuse the genre and the kind of mechanics only. We do not copy its name, heroes, story, art, UI, or music.*

---

## 1. What the reference game is

From the Play Store listing (com.run.tower.defense, "Kingshot"; 50M+ downloads, 4.2★) and its top reviews:

- **Genre:** an idle medieval survival town-builder and strategy MMO. Its store tags include "Tower defence".
- **Setting:** after a rebellion destroys the kingdom, you are a governor rebuilding the last town.
- **Core systems:**
  - Build and upgrade a town.
  - Assign survivors to roles (workers, hunters, chefs) and track their health and happiness. Sick survivors need treatment.
  - Enact laws.
  - Research lost technology.
  - Recruit and level heroes.
  - Train troops.
  - Defend against invasions.
- **Online layer:** alliances, PvP against other governors, rankings, events, packs, and loot boxes.
- **What reviewers dislike:** constant pop-ups and packs, pay-to-win whales who can wipe your town, and ads showing real-time tower defense that the game doesn't actually have.

**What this means for Emberhold:** we keep the satisfying single-player loop (build, grow, recruit, defend). We remove everything built to sell to you. We also add the real-time tower-defense battles the ads promised but the game never delivered.

## 2. Design pillars

1. **No ads, no shop, no premium currency, no loot boxes.** All rewards come from play.
2. **Idle-friendly.** The town keeps producing while the app is closed, capped at 8 hours. Short sessions (2–5 minutes) always make progress.
3. **Real-time defense is the climax.** Town growth exists to make you stronger in battle.
4. **Fully offline and single-player.** No account. Everything is saved on the device.
5. **Fair timers.** Upgrade timers exist to pace the game, never to sell skips. Typical timers run from 10 seconds to 2 hours. There's a free "Hurry" option that halves a timer once per hour.

## 3. Core loop

```
 Collect resources ─► Upgrade buildings / research / train troops
        ▲                                   │
        │                                   ▼
  Rewards (resources,           Assign heroes + troops to defense
  hero shards, blueprints) ◄──  Play a wave-defense battle (real time)
```

- **Session loop (about 3 minutes):** collect idle income, queue 1–2 upgrades, play one battle, claim quest rewards.
- **Meta loop (days):** unlock new map chapters, heroes, buildings, and laws.

## 4. Resources

| Resource | Source | Used for |
|---|---|---|
| Food | Hunters' Lodge, Kitchen (chefs) | Feeding survivors, training troops |
| Wood | Sawmill (workers) | Buildings, towers |
| Stone | Quarry (workers) | Buildings, walls |
| Iron | Mine (unlocks at Keep level 5) | Troops, hero gear |
| Coins | Taxes from Town Hall, battle loot | Research, recruiting |
| Hero Shards (per hero) | Battles, quests, Tavern | Unlocking and starring up heroes |

Storage caps come from Warehouse level. Overflow is lost, which encourages you to come back and spend.

## 5. Town

The town is a fixed-layout map, scrollable and zoomable, with about 20 building plots. You tap a plot to build or upgrade it. The **Keep** level gates every other building's max level, the same way a Town Hall works in this genre.

| Building | Function | Unlock |
|---|---|---|
| Keep | Gates everything; raises population cap | Start |
| Houses (×4) | +Population | Start |
| Sawmill / Quarry / Mine | Produce wood / stone / iron (needs workers) | Start / Start / Keep 5 |
| Hunters' Lodge | Produces raw food (needs hunters) | Start |
| Kitchen | Turns raw food into meals; more meals mean happier survivors (needs chefs) | Keep 2 |
| Infirmary | Heals sick survivors (needs healers) | Keep 3 |
| Warehouse | Raises storage caps | Start |
| Barracks / Range / Stables | Train infantry / archers / cavalry | Keep 2 / 4 / 7 |
| Academy | Research tree | Keep 3 |
| Tavern | Recruit heroes with shards and coins | Keep 2 |
| Town Hall | Coin taxes; enact laws | Keep 4 |
| Walls | HP of your wall in battles | Start |
| Watchtower | Warns of raids; unlocks tower types for battles | Keep 3 |

Upgrades cost resources plus a timer. There are 2 builder slots, with a third unlocked through research.

## 6. Survivors (the simulation layer)

- New survivors arrive over time while there is spare housing and happiness is 50% or higher.
- You assign each survivor to a role: **Worker, Hunter, Chef, Healer, or Idle**. A building's output scales with the staff assigned to it.
- **Health:** survivors can fall sick, more often in winter events or after a lost raid. Sick survivors don't work. The Infirmary heals them over time.
- **Happiness (0–100%)** is driven by meals, housing space, laws, and recent victories or defeats. Above 70% gives an output bonus. Below 30% means survivors leave.
- The UI is a simple roster screen with +/- per role and an "auto-assign" button.

## 7. Laws

The Town Hall offers 1 law slot at start, rising to 3. Each law is a trade-off, and you can swap laws with a 1-hour cooldown. Examples:

- **Extended Shifts:** +20% production, −10 happiness.
- **Rationing:** −25% food use, −5 happiness.
- **Festival Days:** +15 happiness, −10% production.
- **Conscription:** troops train 30% faster, survivor arrivals −20%.
- **Quarantine:** sickness spreads 50% slower, Infirmary +30%.

## 8. Heroes

- **Roster:** 10 original heroes at launch, each with a role (Tank, Archer, Mage, Support, or Siege), a passive ability, and one active skill.
- **How you get them:** collect shards from battles, quests, and the Tavern. 10 shards unlock a hero, and more shards raise their stars (1★–5★). There are no random paid pulls. The Tavern lets you buy a rotating offer of shards with coins, so you always know what you're getting.
- **Hero XP:** heroes gain XP from battles and XP tomes. Max level is capped by Keep level.
- **Gear:** 3 slots (weapon, armor, trinket), crafted at the Forge from iron and blueprints. This is a later milestone.

## 9. Troops

There are three types, with a rock-paper-scissors relationship: Infantry beat Cavalry, Cavalry beat Archers, Archers beat Infantry. Troops are trained over time in batches. You send them into battles as a reserve that you can drop onto the field (see §10). They have tiers T1–T4, unlocked through research.

## 10. Defense battles (real time)

This is the heart of the game, and it's what the reference game's ads showed.

- **Layout:** portrait screen. Your wall runs along the bottom. Enemies come down 1–3 winding paths from the top.
- **Before the battle:** pick up to 5 heroes to stand on the wall. You can also place towers on fixed build pads along the path, paid for with in-battle gold.
- **During the battle:**
  - Heroes and towers auto-attack.
  - Tap a hero's portrait to fire their **active skill** (it has a cooldown).
  - Kills earn in-battle gold, which you spend to build or upgrade towers on pads: Arrow, Cannon, Frost, and Fire.
  - Drop troop squads from your reserve to block a path.
  - Optional 2× speed toggle.
- **Between waves:** choose **1 of 3 random boons**, roguelite-style. Examples: "+30% archer damage", "Frost towers also slow attack speed", "Heal wall 20%".
- **Enemies:** about 12 types. Examples:
  - Raider grunt, shield-bearer (frontal armor), runner (fast, low HP), and brute (high HP).
  - Archer and catapult (attack the wall from range), healer, flyer (ignores paths), and burrower.
  - Bosses every 10 waves.
- **Losing:** you lose if the wall's HP reaches 0.
- **Stars:** 1–3 per stage, based on wall HP remaining.
- **Campaign:** 5 chapters × 10 stages. Each chapter introduces new enemies and a boss.
- **Endless "Siege" mode:** survive as long as you can. Your personal best is saved, with no online leaderboards.
- **Town raids:** every 4–8 real hours a raid approaches, with a 30-minute warning. Defend it live in a short 5-wave battle, or let it **auto-resolve** against your power. Losing a raid steals some stored resources and makes a few survivors sick. You can never lose buildings.

## 11. Research (Academy)

There are three short branches of about 12 nodes each, with timed research:

- **Economy:** production, storage, builder slot.
- **Military:** troop tiers, training speed, tower damage.
- **Survival:** sickness resistance, happiness, offline cap from 8h to 12h.

## 12. Guidance and goals

- A **chapter quest chain** ("Build a Sawmill", "Win stage 1-3"…) acts as a tutorial and pacing guide.
- **Daily tasks** give 5 small goals per day for bonus shards and resources. Missing a day costs nothing.
- **Achievements.**

## 13. Screens

1. Town view: main hub, with a resource bar on top and a bottom nav of Town, Heroes, Battle, Research, and Quests.
2. Building panel: upgrade, staff, and info.
3. Survivors roster and laws.
4. Heroes list and hero detail (level, stars, skills, gear).
5. Campaign map, then pre-battle lineup, then battle, then results.
6. Settings: sound, music, haptics, export/import save, reset.

## 14. Art and audio

- **Style:** bright, stylised 2D with a top-down/¾ view and a warm medieval palette.
- **Art plan:** I'll make clean vector-style sprites (buildings, units, heroes, effects) in code or SVG so the game is fully playable and good-looking without an artist. You can swap any art pack in later.
- **Audio:** simple generated sound effects. Music is optional and comes from royalty-free tracks you choose.
- **Feel:** haptic feedback on hits, skill casts, and wave clears.

## 15. Technology and install on iPhone (decided: web app / PWA)

- **Stack:** plain JavaScript (ES modules) and HTML5 Canvas, with no libraries and no build step. All art is drawn in code and all sounds are synthesized, so the game has zero dependencies.
- **Install:** host the files on free static hosting (GitHub Pages or Cloudflare Pages). Open the URL once in Safari, tap Share, then "Add to Home Screen". The game runs full-screen and offline (service worker added in M6).
- **Saves:** stored on the phone (localStorage).
- **Offline income** (from M2) is calculated when you reopen the app, from the time you were away. Nothing runs in the background, so there's no battery drain.

## 16. Milestones

| # | Milestone | Playable result |
|---|---|---|
| M1 ✅ | **Battle prototype** | One stage: paths, 4 enemy types, 3 heroes with skills, 2 tower types, waves, boons, win/lose |
| M1.5 ✅ | **Battle content** | Chapter 1 campaign (6 stages), Endless Siege, 4 new enemies (flyer, healer, ranged, 2nd boss), Frost Spire and Arcane towers, 4th hero Vex, hero lineup |
| M1.6 ✅ | **King redesign** | Player-controlled King, coin drops and pickup, stand-to-build towers, barricades and armory, Keep defense |
| M2 | **Town and economy** | Buildings, resources, timers, idle/offline income, saving |
| M3 | **Heroes and troops** | Shards, levels, stars, Tavern, training, troops in battle |
| M4 | **Survivors, laws, research** | Roles, health, happiness, laws, Academy tree |
| M5 | **Campaign and raids** | 5 chapters, bosses, raids, quests, daily tasks |
| M6 | **Polish and install** | Art pass, sound, haptics, tutorial, PWA or app install on your iPhone |

Each milestone ends with something you can play and give feedback on.

## 17. Out of scope (deliberately)

Multiplayer, PvP, alliances, chat, leaderboards, events calendar, shop, ads, accounts, and cloud sync.

## 18. Decisions

1. **Platform:** web app (PWA).
2. **Battles are the favourite part.** They get the most depth: more stages, enemy types, heroes, towers, and boons come first.
3. **Name:** Emberhold.
