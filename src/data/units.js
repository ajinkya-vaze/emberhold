// armor: fraction of PHYSICAL damage blocked. Magic ignores armor.
// hit: damage dealt to the wall per strike (one strike per `hitEvery` seconds).
// tip: shown the first time a stage introduces this enemy.
export const ENEMIES = {
  grunt:   { name: 'Raider',        hp: 108,  speed: 52,  armor: 0,    bounty: 6,   hit: 9,  hitEvery: 1.0, r: 16, color: '#b4442f',
             tip: 'Basic foot soldier.' },
  runner:  { name: 'Cutpurse',      hp: 61,   speed: 104, armor: 0,    bounty: 5,   hit: 6,  hitEvery: 0.8, r: 13, color: '#3f6e33',
             tip: 'Fast but fragile.' },
  shield:  { name: 'Shieldbearer',  hp: 198,  speed: 40,  armor: 0.5,  bounty: 10,  hit: 12, hitEvery: 1.0, r: 18, color: '#55657f',
             tip: 'Armor blocks half of physical damage. Magic ignores it.' },
  brute:   { name: 'Brute',         hp: 576,  speed: 30,  armor: 0.15, bounty: 24,  hit: 38, hitEvery: 1.3, r: 26, color: '#8a5a3c',
             tip: 'Slow and tough. Hits the wall very hard.' },
  harpy:   { name: 'Harpy',         hp: 80,   speed: 66,  armor: 0,    bounty: 7,   hit: 7,  hitEvery: 0.9, r: 15, color: '#6a5a7a',
             flying: true, tip: 'Flies straight at the wall. Cannons can’t hit it!' },
  shaman:  { name: 'Shaman',        hp: 150,  speed: 40,  armor: 0,    bounty: 14,  hit: 6,  hitEvery: 1.0, r: 17, color: '#2f8a7a',
             heal: 0.08, healEvery: 3.5, healRange: 115, tip: 'Heals nearby foes. Take it down first!' },
  xbow:    { name: 'Crossbowman',   hp: 150,  speed: 44,  armor: 0.25, bounty: 12,  hit: 14, hitEvery: 1.8, r: 16, color: '#7a5a34',
             ranged: 230, tip: 'Stops at range and shoots the wall.' },
  warlord: { name: 'Warlord Grask', hp: 2100, speed: 24,  armor: 0.3,  bounty: 200, hit: 120, hitEvery: 1.4, r: 36, color: '#33323d',
             boss: true, cry: true, tip: 'War cry makes nearby foes faster.' },
  hexmother: { name: 'Hexmother Vyl', hp: 2300, speed: 22, armor: 0.1, bounty: 250, hit: 90, hitEvery: 1.4, r: 34, color: '#2b3a2a',
             boss: true, summon: { type: 'runner', n: 2, every: 6 }, tip: 'Summons Cutpurses as she walks.' },
};

// Wall slots are left, centre, right in lineup order. `unlock`: stage id that must be cleared first.
export const HEROES = [
  {
    id: 'wren', name: 'Wren', role: 'Ranger', color: '#4f9a4a',
    range: 330, dmg: 18, dtype: 'phys', rate: 1.6, proj: 'arrow', projSpeed: 950,
    skill: { id: 'storm', name: 'Arrow Storm', cd: 16, aim: true, radius: 115, dmg: 14, pulses: 8, desc: 'Rain arrows on an area' },
  },
  {
    id: 'bram', name: 'Bram', role: 'Warden', color: '#4a74b8',
    range: 225, dmg: 36, dtype: 'phys', rate: 0.8, proj: 'axe', projSpeed: 700,
    skill: { id: 'shout', name: 'Bulwark Shout', cd: 24, aim: false, radius: 300, desc: 'Stun foes at the wall, repair it' },
  },
  {
    id: 'ignis', name: 'Ignis', role: 'Pyromancer', color: '#9a52c4',
    range: 285, dmg: 24, dtype: 'magic', rate: 0.7, proj: 'fireball', projSpeed: 560, splash: 55,
    skill: { id: 'meteor', name: 'Meteor', cd: 22, aim: true, radius: 110, dmg: 160, burn: 15, desc: 'Huge fiery blast' },
  },
  {
    id: 'vex', name: 'Vex', role: 'Stormcaller', color: '#3fb5c9', unlock: '1-3',
    range: 300, dmg: 15, dtype: 'magic', rate: 0.9, proj: 'bolt', chain: 2, chainRange: 120, chainFalloff: 0.7,
    skill: { id: 'thunder', name: 'Thunderstorm', cd: 24, aim: false, strikes: 10, dmg: 55, stun: 0.6, dur: 3, desc: 'Lightning strikes all over the field' },
  },
];

// air: false = cannot target flying enemies. pulse: hits everything in range at once (no projectile).
export const TOWERS = {
  arrow: {
    name: 'Arrow Tower', short: 'Arrows', dtype: 'phys', proj: 'arrow', projSpeed: 900, air: true,
    levels: [
      { cost: 60,  dmg: 14, rate: 1.5, range: 210 },
      { cost: 70,  dmg: 22, rate: 1.8, range: 225 },
      { cost: 110, dmg: 34, rate: 2.1, range: 240 },
    ],
  },
  cannon: {
    name: 'Cannon', short: 'Cannon', dtype: 'phys', proj: 'ball', projSpeed: 480, air: false,
    levels: [
      { cost: 90,  dmg: 40,  rate: 0.5,  range: 190, splash: 60 },
      { cost: 100, dmg: 65,  rate: 0.55, range: 195, splash: 70 },
      { cost: 150, dmg: 100, rate: 0.6,  range: 210, splash: 80 },
    ],
  },
  frost: {
    name: 'Frost Spire', short: 'Frost', dtype: 'magic', pulse: true, air: true,
    levels: [
      { cost: 70,  dmg: 6,  rate: 0.8, range: 150, slow: 0.3 },
      { cost: 80,  dmg: 10, rate: 0.9, range: 162, slow: 0.4 },
      { cost: 120, dmg: 16, rate: 1.0, range: 175, slow: 0.5 },
    ],
  },
  mage: {
    name: 'Arcane Tower', short: 'Arcane', dtype: 'magic', proj: 'arcane', projSpeed: 650, air: true,
    levels: [
      { cost: 100, dmg: 30, rate: 0.8,  range: 200 },
      { cost: 110, dmg: 48, rate: 0.85, range: 210 },
      { cost: 160, dmg: 75, rate: 0.9,  range: 225 },
    ],
  },
};
