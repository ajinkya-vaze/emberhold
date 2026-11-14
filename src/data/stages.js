// Path & pad coordinates: x in logical units (0..720), y as a fraction of the
// battlefield height (0 = top of field, 1 = the wall).
// Wave groups: t = enemy type, n = count, every = seconds between spawns,
// delay = seconds after wave start, p = path index (omit to alternate paths).
// hpMul: per-stage enemy HP multiplier (difficulty knob).

const G = (t, n, every, delay = 0, p) => ({ t, n, every, delay, p });

export const STAGES = [
  {
    id: '1-1', name: 'The Old Road', desc: 'Raiders march on the old trade road.',
    node: [190, 0.86], startGold: 150, wallHp: 1000, hpGrowth: 0.08, hpMul: 1, boonAfter: [2, 4, 6, 8],
    towers: ['arrow', 'cannon'], intro: [],
    paths: [
      [[560, -0.08], [560, 0.15], [150, 0.15], [150, 0.42], [570, 0.42], [570, 0.68], [360, 0.68], [360, 1.0]],
    ],
    pads: [[350, 0.285], [675, 0.28], [80, 0.56], [360, 0.555], [230, 0.85], [490, 0.85]],
    waves: [
      [G('grunt', 12, 0.95)],
      [G('grunt', 15, 0.73), G('runner', 6, 1.0, 6)],
      [G('grunt', 9, 0.87), G('shield', 9, 1.33, 3)],
      [G('runner', 18, 0.47), G('grunt', 9, 0.8, 4)],
      [G('grunt', 15, 0.67), G('shield', 6, 1.33, 4), G('brute', 3, 4, 8)],
      [G('shield', 12, 1.07), G('runner', 15, 0.4, 5)],
      [G('grunt', 21, 0.53), G('brute', 6, 2.67, 3)],
      [G('shield', 15, 0.87), G('runner', 15, 0.33, 8), G('brute', 5, 3.33, 4)],
      [G('runner', 18, 0.33), G('shield', 18, 0.73, 2), G('brute', 9, 2, 6)],
      [G('grunt', 15, 0.6), G('shield', 9, 1, 3), G('warlord', 1, 1, 10), G('brute', 5, 2.67, 14)],
    ],
  },
  {
    id: '1-2', name: 'Millbrook Crossing', desc: 'Harpies circle the mill. Frost Spires slow anything, even flyers.',
    node: [500, 0.76], startGold: 160, wallHp: 1000, hpGrowth: 0.08, hpMul: 1.6, boonAfter: [2, 4, 6, 8],
    towers: ['arrow', 'cannon', 'frost'], newTower: 'frost', intro: ['harpy'],
    paths: [
      [[120, -0.08], [120, 0.22], [590, 0.22], [590, 0.5], [230, 0.5], [230, 0.72], [360, 0.72], [360, 1.0]],
    ],
    pads: [[290, 0.1], [355, 0.36], [680, 0.36], [450, 0.62], [100, 0.62], [250, 0.88], [480, 0.87]],
    waves: [
      [G('grunt', 12, 0.9)],
      [G('grunt', 10, 0.8), G('harpy', 5, 1.4, 5)],
      [G('runner', 14, 0.5), G('harpy', 6, 1.2, 4)],
      [G('shield', 10, 1.1), G('grunt', 10, 0.7, 3)],
      [G('harpy', 12, 0.7), G('grunt', 12, 0.6, 2)],
      [G('shield', 12, 0.9), G('runner', 14, 0.4, 6), G('harpy', 6, 1, 10)],
      [G('brute', 5, 3), G('grunt', 18, 0.5, 1), G('harpy', 8, 0.9, 6)],
      [G('harpy', 18, 0.5), G('shield', 10, 1, 3)],
      [G('brute', 7, 2.4), G('runner', 18, 0.33, 4), G('harpy', 12, 0.6, 8)],
      [G('grunt', 16, 0.5), G('harpy', 14, 0.6, 4), G('brute', 6, 2.5, 6), G('shield', 10, 0.9, 10)],
    ],
  },
  {
    id: '1-3', name: 'Twin Fords', desc: 'Two roads meet at your gate. Shamans heal their allies.',
    node: [230, 0.63], startGold: 170, wallHp: 1000, hpGrowth: 0.08, hpMul: 0.88, boonAfter: [2, 4, 6, 8],
    towers: ['arrow', 'cannon', 'frost'], intro: ['shaman'],
    paths: [
      [[120, -0.08], [120, 0.35], [280, 0.35], [280, 0.68], [360, 0.68], [360, 1.0]],
      [[600, -0.08], [600, 0.35], [440, 0.35], [440, 0.68], [360, 0.68], [360, 1.0]],
    ],
    pads: [[250, 0.16], [470, 0.16], [360, 0.5], [130, 0.56], [590, 0.56], [240, 0.86], [480, 0.86]],
    waves: [
      [G('grunt', 8, 1.0, 0, 0), G('grunt', 8, 1.0, 0.5, 1)],
      [G('runner', 10, 0.6, 0, 0), G('grunt', 10, 0.8, 0, 1)],
      [G('shield', 6, 1.2, 0, 0), G('shield', 6, 1.2, 2, 1), G('shaman', 1, 6, 8)],
      [G('harpy', 10, 0.8), G('grunt', 14, 0.6, 2)],
      [G('grunt', 12, 0.6, 0, 0), G('shaman', 3, 4, 3, 0), G('brute', 3, 4, 4, 1)],
      [G('runner', 20, 0.35), G('shield', 10, 1, 4), G('shaman', 3, 3, 6)],
      [G('harpy', 14, 0.6), G('brute', 5, 3, 3), G('shaman', 3, 3, 5)],
      [G('shield', 14, 0.8, 0, 0), G('shield', 14, 0.8, 2, 1), G('shaman', 4, 2.5, 5)],
      [G('brute', 8, 2.2), G('grunt', 20, 0.45, 2), G('shaman', 4, 3, 4), G('harpy', 10, 0.8, 10)],
      [G('warlord', 1, 1, 8, 0), G('grunt', 16, 0.5), G('shield', 12, 0.9, 3), G('shaman', 4, 3, 5), G('harpy', 12, 0.7, 12)],
    ],
  },
  {
    id: '1-4', name: 'Thornwood', desc: 'Crossbowmen shoot from the trees. Arcane Towers ignore armor.',
    node: [520, 0.5], startGold: 180, wallHp: 1000, hpGrowth: 0.08, hpMul: 1.15, boonAfter: [2, 4, 6, 8],
    towers: ['arrow', 'cannon', 'frost', 'mage'], newTower: 'mage', intro: ['xbow'],
    paths: [
      [[640, -0.08], [640, 0.12], [90, 0.12], [90, 0.32], [630, 0.32], [630, 0.52], [90, 0.52], [90, 0.72], [360, 0.72], [360, 1.0]],
    ],
    pads: [[360, 0.22], [360, 0.42], [240, 0.62], [500, 0.62], [220, 0.87], [500, 0.87]],
    waves: [
      [G('grunt', 14, 0.8)],
      [G('xbow', 6, 1.5), G('grunt', 10, 0.7, 4)],
      [G('shield', 12, 0.9), G('xbow', 4, 2, 6)],
      [G('runner', 18, 0.4), G('harpy', 8, 0.9, 4)],
      [G('shield', 14, 0.8), G('shaman', 3, 4, 4), G('xbow', 6, 1.5, 8)],
      [G('brute', 5, 3), G('xbow', 8, 1.2, 3), G('grunt', 14, 0.5, 6)],
      [G('harpy', 16, 0.5), G('shield', 12, 0.8, 5)],
      [G('xbow', 12, 0.9), G('shaman', 4, 3, 3), G('brute', 5, 3, 6)],
      [G('shield', 18, 0.6), G('brute', 7, 2.4, 3), G('harpy', 12, 0.6, 8), G('xbow', 8, 1.2, 10)],
      [G('warlord', 1, 1, 10), G('xbow', 12, 1), G('shield', 14, 0.7, 3), G('shaman', 4, 3, 6), G('brute', 6, 2.5, 12)],
    ],
  },
  {
    id: '1-5', name: 'Cinder Pass', desc: 'The Hexmother leads her coven through the burning pass.',
    node: [220, 0.37], startGold: 200, wallHp: 1000, hpGrowth: 0.08, hpMul: 1, boonAfter: [2, 4, 6, 8],
    towers: ['arrow', 'cannon', 'frost', 'mage'], intro: ['hexmother'],
    paths: [
      [[100, -0.08], [100, 0.45], [300, 0.45], [300, 0.75], [360, 0.75], [360, 1.0]],
      [[620, -0.08], [620, 0.2], [420, 0.2], [420, 0.5], [620, 0.5], [620, 0.75], [360, 0.75], [360, 1.0]],
    ],
    pads: [[220, 0.22], [520, 0.35], [200, 0.62], [500, 0.63], [230, 0.88], [490, 0.89]],
    waves: [
      [G('grunt', 10, 0.8, 0, 0), G('harpy', 6, 1.2, 2, 1)],
      [G('runner', 12, 0.5, 0, 0), G('xbow', 6, 1.4, 0, 1)],
      [G('shield', 7, 1.1, 0, 0), G('shield', 7, 1.1, 1, 1), G('shaman', 1, 5, 6)],
      [G('harpy', 14, 0.55), G('grunt', 12, 0.6, 3)],
      [G('brute', 4, 3.5, 0, 0), G('brute', 4, 3.5, 1.5, 1), G('xbow', 8, 1.2, 4)],
      [G('shield', 16, 0.6), G('shaman', 4, 3, 3), G('runner', 18, 0.35, 6)],
      [G('harpy', 16, 0.5), G('xbow', 10, 1, 3), G('brute', 5, 3, 6)],
      [G('grunt', 26, 0.35), G('shield', 14, 0.7, 3), G('shaman', 4, 3, 5)],
      [G('brute', 9, 2), G('harpy', 16, 0.5, 3), G('xbow', 10, 1, 6), G('shaman', 4, 3, 8)],
      [G('hexmother', 1, 1, 6, 0), G('shield', 14, 0.8), G('harpy', 14, 0.6, 4), G('brute', 6, 2.5, 10), G('xbow', 8, 1.2, 14)],
    ],
  },
  {
    id: '1-6', name: 'The Black Gate', desc: 'The rebel host throws everything at your wall. Survive 12 waves.',
    node: [480, 0.22], startGold: 220, wallHp: 1200, hpGrowth: 0.07, hpMul: 1, boonAfter: [2, 4, 6, 8, 10],
    towers: ['arrow', 'cannon', 'frost', 'mage'], intro: [],
    paths: [
      [[90, -0.08], [90, 0.55], [260, 0.55], [260, 0.74], [360, 0.74], [360, 1.0]],
      [[630, -0.08], [630, 0.18], [300, 0.18], [300, 0.38], [630, 0.38], [630, 0.74], [360, 0.74], [360, 1.0]],
    ],
    pads: [[200, 0.3], [460, 0.28], [360, 0.5], [460, 0.58], [175, 0.66], [230, 0.88], [490, 0.88]],
    waves: [
      [G('grunt', 16, 0.6)],
      [G('harpy', 10, 0.8), G('shield', 10, 0.9, 3)],
      [G('xbow', 10, 1.1), G('runner', 16, 0.4, 4)],
      [G('shield', 16, 0.7), G('shaman', 4, 3, 3)],
      [G('brute', 6, 2.6), G('harpy', 14, 0.6, 4)],
      [G('warlord', 1, 1, 5, 1), G('grunt', 20, 0.5), G('xbow', 8, 1.2, 6)],
      [G('shield', 18, 0.6), G('shaman', 5, 2.5, 3), G('harpy', 12, 0.6, 8)],
      [G('brute', 9, 2), G('runner', 22, 0.3, 3), G('xbow', 10, 1, 6)],
      [G('harpy', 24, 0.4), G('shield', 16, 0.7, 4), G('shaman', 5, 2.5, 6)],
      [G('brute', 10, 1.8), G('xbow', 14, 0.9, 3), G('shield', 16, 0.6, 6)],
      [G('grunt', 30, 0.3), G('harpy', 20, 0.45, 4), G('brute', 8, 2, 6), G('shaman', 6, 2.5, 8)],
      [G('hexmother', 1, 1, 6, 0), G('warlord', 1, 1, 14, 1), G('shield', 18, 0.6), G('xbow', 12, 1, 4), G('harpy', 16, 0.5, 8), G('brute', 8, 2, 12)],
    ],
  },
];

// Endless mode reuses the Cinder Pass map with generated waves.
export const ENDLESS = {
  id: 'endless', name: 'Endless Siege', desc: 'Waves never stop. How long can the wall hold?', endless: true,
  unlock: '1-3', startGold: 250, wallHp: 1000, hpGrowth: 0.09, hpMul: 1, boonEvery: 3,
  towers: ['arrow', 'cannon', 'frost', 'mage'], intro: [],
  paths: STAGES[4].paths, pads: STAGES[4].pads, waves: [],
};

// cost: budget units per enemy (a Raider = 1). from: first wave it can appear.
const POOL = [
  { t: 'grunt', cost: 1, from: 1 }, { t: 'runner', cost: 0.8, from: 2 }, { t: 'shield', cost: 1.8, from: 3 },
  { t: 'harpy', cost: 1.2, from: 4 }, { t: 'xbow', cost: 2, from: 5 }, { t: 'brute', cost: 5, from: 6 },
  { t: 'shaman', cost: 2.6, from: 7 },
];

export function genEndlessWave(w) {
  const budget = 12 + 3.2 * w + 0.18 * w * w;
  const pool = POOL.filter((e) => w >= e.from);
  const kinds = Math.min(pool.length, w < 4 ? 1 : w < 10 ? 2 : 3);
  const picks = [];
  while (picks.length < kinds) {
    const c = pool[Math.floor(Math.random() * pool.length)];
    if (!picks.includes(c)) picks.push(c);
  }
  const dur = 12 + Math.min(14, w * 0.5);
  const groups = picks.map((c, i) => {
    const n = Math.max(1, Math.round(budget / kinds / c.cost));
    return G(c.t, n, dur / n, i * 3);
  });
  if (w % 10 === 0) groups.push(G((w / 10) % 2 ? 'warlord' : 'hexmother', 1 + Math.floor(w / 30), 6, 6));
  return groups;
}
