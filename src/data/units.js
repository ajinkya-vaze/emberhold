// armor: fraction of arrow damage blocked.
// hit: damage per strike against the Keep / barricades (the King takes kingHit× this).
// coins: total coin value dropped on death.
// tip: shown the first time a stage introduces this enemy.
export const ENEMIES = {
  grunt:   { name: 'Raider',        hp: 60,   speed: 52,  armor: 0,    coins: 3,  hit: 9,  hitEvery: 1.0, r: 16, color: '#b4442f',
             tip: 'Basic foot soldier.' },
  runner:  { name: 'Cutpurse',      hp: 34,   speed: 104, armor: 0,    coins: 2,  hit: 6,  hitEvery: 0.8, r: 13, color: '#3f6e33',
             tip: 'Fast but fragile.' },
  shield:  { name: 'Shieldbearer',  hp: 110,  speed: 40,  armor: 0.3,  coins: 4,  hit: 12, hitEvery: 1.0, r: 18, color: '#55657f',
             tip: 'Armor blocks part of each arrow. Upgrade your bow!' },
  brute:   { name: 'Brute',         hp: 320,  speed: 30,  armor: 0.1,  coins: 10, hit: 38, hitEvery: 1.3, r: 26, color: '#8a5a3c',
             tip: 'Slow and tough. Smashes barricades fast.' },
  harpy:   { name: 'Harpy',         hp: 45,   speed: 66,  armor: 0,    coins: 3,  hit: 7,  hitEvery: 0.9, r: 15, color: '#6a5a7a',
             flying: true, tip: 'Flies over barricades, straight at the Keep!' },
  shaman:  { name: 'Shaman',        hp: 90,   speed: 40,  armor: 0,    coins: 5,  hit: 6,  hitEvery: 1.0, r: 17, color: '#2f8a7a',
             heal: 0.08, healEvery: 3.5, healRange: 115, tip: 'Heals nearby foes. Take it down first!' },
  xbow:    { name: 'Crossbowman',   hp: 85,   speed: 44,  armor: 0.15, coins: 4,  hit: 14, hitEvery: 1.8, r: 16, color: '#7a5a34',
             ranged: 230, tip: 'Shoots from range, at you too. Dodge the bolts!' },
  warlord: { name: 'Warlord Grask', hp: 1500, speed: 24,  armor: 0.25, coins: 60, hit: 80, hitEvery: 1.4, r: 36, color: '#33323d',
             boss: true, cry: true, tip: 'War cry makes nearby foes faster.' },
  hexmother: { name: 'Hexmother Vyl', hp: 1600, speed: 22, armor: 0.1, coins: 70, hit: 60, hitEvery: 1.4, r: 34, color: '#2b3a2a',
             boss: true, summon: { type: 'runner', n: 2, every: 6 }, tip: 'Summons Cutpurses as she walks.' },
};

// The King: the one character you control.
export const KING = {
  r: 16, speed: 230, hp: 200, regen: 8, regenDelay: 3, respawn: 5,
  range: 240, dmg: 22, rate: 2.0, arrowSpeed: 1000, magnet: 75,
  kingHit: 0.6, // enemies deal this fraction of their `hit` to the King
};

// Watch tower: shoots arrows. Levels are bought one after another on the same spot.
export const TOWER = {
  name: 'Watch Tower',
  levels: [
    { cost: 25, dmg: 18, rate: 1.5, range: 210 },
    { cost: 40, dmg: 28, rate: 1.8, range: 225 },
    { cost: 60, dmg: 42, rate: 2.1, range: 240 },
  ],
};

// Barricade: sits across the road. Enemies must break it to pass. Rebuild if destroyed.
export const BARRICADE = {
  name: 'Barricade',
  levels: [
    { cost: 20, hp: 350 },
    { cost: 35, hp: 700 },
    { cost: 55, hp: 1200 },
  ],
};

// Armory spots in front of the Keep: upgrade the King for this battle.
export const ARMORY = {
  bow:    { name: 'Bow',    desc: '+20% arrow damage', costs: [30, 55, 90], per: 0.2 },
  quiver: { name: 'Quiver', desc: 'Shoot 15% faster',  costs: [30, 55, 90], per: 0.15 },
  volley: { name: 'Volley', desc: '+1 extra arrow (half damage)', costs: [60, 110, 160], extraDmg: 0.5 },
  repair: { name: 'Repair', desc: 'Keep +150 HP',      cost: 20, amount: 150 },
};

export const KEEP_HP = 1000;
export const PAY_RATE = 30;   // coins per second while standing on a spot
export const PAY_DELAY = 0.3; // seconds of standing before coins start flowing
export const COIN_LIFE = 25;  // seconds before dropped coins vanish
