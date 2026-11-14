// Roguelite upgrades offered between waves. apply(mods, battle)
// requires: only offered when that tower type is available in the stage.
// hero: only offered when that hero is on the wall.
export const BOONS = [
  { id: 'steel',   icon: '⚔️', name: 'Sharpened Steel', desc: '+25% physical damage',                 apply: (m) => { m.phys *= 1.25; } },
  { id: 'ember',   icon: '🔥', name: 'Ember Core',      desc: '+30% magic damage',                    apply: (m) => { m.magic *= 1.3; } },
  { id: 'quick',   icon: '🏹', name: 'Quickdraw',       desc: 'Heroes attack 25% faster',             apply: (m) => { m.heroRate *= 1.25; } },
  { id: 'eng',     icon: '⚙️', name: 'Engineers',       desc: 'Towers attack 25% faster',             apply: (m) => { m.towerRate *= 1.25; } },
  { id: 'powder',  icon: '💣', name: 'Black Powder',    desc: 'Cannons +20% damage, +40% blast size', requires: 'cannon', apply: (m) => { m.cannonDmg *= 1.2; m.cannonSplash *= 1.4; } },
  { id: 'frost',   icon: '❄️', name: 'Frost-Tipped',    desc: 'Arrows slow enemies by 25%',           apply: (m) => { m.frost = Math.min(0.6, m.frost + 0.25); } },
  { id: 'focus',   icon: '✨', name: 'Focus',           desc: 'Hero skills recharge 25% faster',      apply: (m) => { m.cd *= 0.75; } },
  { id: 'mason',   icon: '🧱', name: 'Masonry',         desc: 'Wall +25% max HP and repair 25%',      apply: (m, b) => { b.wallMax = Math.round(b.wallMax * 1.25); b.healWall(0.25); } },
  { id: 'loot',    icon: '💰', name: 'Plunder',         desc: '+30% gold from kills',                 apply: (m) => { m.gold *= 1.3; } },
  { id: 'chest',   icon: '🪙', name: 'War Chest',       desc: 'Gain 150 gold now',                    apply: (m, b) => { b.gold += 150; } },
  { id: 'keen',    icon: '🎯', name: 'Keen Eye',        desc: '15% chance to deal double damage',     apply: (m) => { m.crit += 0.15; } },
  { id: 'pyre',    icon: '🌋', name: 'Pyre',            desc: 'Magic sets enemies ablaze',            apply: (m) => { m.burn += 10; } },
  { id: 'tar',     icon: '🛢️', name: 'Tar Pits',        desc: 'Enemies move 10% slower',              apply: (m) => { m.enemySpeed *= 0.9; } },
  { id: 'arcane',  icon: '🔮', name: 'Arcane Focus',    desc: 'Arcane Towers +35% damage',            requires: 'mage', apply: (m) => { m.mageDmg *= 1.35; } },
  { id: 'winter',  icon: '🧊', name: 'Deep Winter',     desc: 'Frost Spires +25% range, +15% slow',   requires: 'frost', apply: (m) => { m.frostRange *= 1.25; m.frostSlow += 0.15; } },
  { id: 'surge',   icon: '⚡', name: 'Overcharge',      desc: 'Vex’s lightning jumps 2 more times', hero: 'vex', apply: (m) => { m.chain += 2; } },
  { id: 'hawk',    icon: '🦅', name: 'Hawkeye',         desc: 'Heroes and towers +15% range',         apply: (m) => { m.range *= 1.15; } },
];

export const baseMods = () => ({
  phys: 1, magic: 1, heroRate: 1, towerRate: 1, cannonDmg: 1, cannonSplash: 1,
  frost: 0, cd: 1, gold: 1, crit: 0, burn: 0, enemySpeed: 1,
  mageDmg: 1, frostRange: 1, frostSlow: 0, chain: 0, range: 1,
});
