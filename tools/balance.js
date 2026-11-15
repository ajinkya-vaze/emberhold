// Headless balance harness. In the browser console on the running game (NOT a tab you're playing in):
//   const B = await import('/tools/balance.js');
//   B.all(2)        // every stage, every strategy, 2 runs each
//   B.report(0)     // one stage (index 0 = 1-1), with Keep HP after each wave
//   B.endless()     // how far each strategy gets in Endless Siege
// A bot steers the King: grabs coins, stands on spots to build, retreats when hurt.
import { STAGES } from '../src/data/stages.js';
import { save } from '../src/save.js';

// Build orders: [kind, level, howMany] (howMany = only the N spots nearest the Keep).
const BALANCED = [
  ['wall', 1, 1], ['tower', 1, 2], ['bow', 1], ['wall', 1], ['tower', 1], ['quiver', 1], ['volley', 1],
  ['tower', 2], ['wall', 2, 1], ['bow', 2], ['quiver', 2], ['repair'], ['tower', 3], ['volley', 2],
  ['wall', 2], ['bow', 3], ['quiver', 3], ['volley', 3], ['wall', 3], ['repair'],
];
const BUILDINGS_ONLY = BALANCED.filter(([k]) => k === 'wall' || k === 'tower' || k === 'repair');
const KING_ONLY = BALANCED.filter(([k]) => !['wall', 'tower'].includes(k));

export const STRATEGIES = [
  { name: 'expert',     order: BALANCED,       collect: 2000, retreat: 0.35 },
  { name: 'casual',     order: BALANCED,       collect: 260,  retreat: 0.2 },
  { name: 'buildings',  order: BUILDINGS_ONLY, collect: 2000, retreat: 0.35 },
  { name: 'king-only',  order: KING_ONLY,      collect: 2000, retreat: 0.35 },
  { name: 'idle',       order: [],             collect: 0,    retreat: 0, fight: false },
];

function levelOf(b, sp) { return ['bow', 'quiver', 'volley'].includes(sp.kind) ? b.up[sp.kind] : sp.level; }

function nextBuy(b, order) {
  for (const [kind, lvl, n] of order) {
    if (kind === 'repair') {
      if (b.keepHp < b.keepMax * 0.7) return b.spots.find((s) => s.kind === 'repair');
      continue;
    }
    let cands = b.spots.filter((s) => s.kind === kind);
    if (n) cands = cands.sort((a, c) => dist(a, b.keepPt()) - dist(c, b.keepPt())).slice(0, n);
    const sp = cands.filter((s) => levelOf(b, s) < lvl && b.spotCost(s) !== null)
      .sort((a, c) => dist(a, b.king) - dist(c, b.king))[0];
    if (sp) return sp;
  }
  return null;
}
const dist = (a, c) => Math.hypot(a.x - c.x, a.y - c.y);

function botStep(b, st) {
  const k = b.king;
  b.keepPt = () => ({ x: 360, y: b.townTop });
  if (k.dead) { b.autoMove = { x: 0, y: 0 }; return; }
  const want = nextBuy(b, st.order);
  const need = want ? b.spotCost(want) - want.paid : Infinity;
  let target = null;
  if (st.retreat && k.hp < k.maxHp * st.retreat) target = { x: 360, y: b.townBottom - 20 };
  else if (want && b.coins >= need) target = want;
  else {
    const coin = b.drops.filter((c) => dist(c, k) < st.collect).sort((a, c) => dist(a, k) - dist(c, k))[0];
    if (coin) target = coin;
    else if (want && b.coins > 0 && b.phase !== 'wave') target = want; // part-pay between waves
    else {
      // fight: stand ~180px from the most advanced enemy, on the Keep side (in bow range, out of sword reach)
      const lead = b.findTarget(k.x, k.y, 5000);
      if (lead && st.fight !== false) {
        const ax = k.x - lead.x, ay = k.y - lead.y, al = Math.hypot(ax, ay) || 1;
        target = { x: lead.x + (ax / al) * 180, y: lead.y + (ay / al) * 180 };
      } else target = { x: 360, y: b.townTop - 120 };
    }
  }
  const dx = target.x - k.x, dy = target.y - k.y, len = Math.hypot(dx, dy);
  b.autoMove = len < 6 ? { x: 0, y: 0 } : { x: dx / len, y: dy / len };
  // start waves once there is nothing useful to do
  const idle = !want || b.coins < need;
  if (b.phase === 'prep' && idle) b.callWave();
  if (b.phase === 'inter' && idle && !b.drops.length) b.callWave();
}

// Plays one battle without touching your saved progress.
export function play(which, st, maxSteps = 60 * 60 * 40) {
  const backup = JSON.stringify(save.data);
  const g = window.__game;
  g.go('battle', which);
  const b = g.scene;
  const keeps = [];
  let lastWave = 0, deaths = 0, wasDead = false;
  for (let steps = 0; b.phase !== 'end' && steps < maxSteps; steps++) {
    if (b.wave !== lastWave) { keeps.push(Math.round(b.keepHp)); lastWave = b.wave; }
    if (steps % 6 === 0) botStep(b, st);
    if (b.king.dead && !wasDead) deaths++;
    wasDead = b.king.dead;
    b.step(1 / 60);
  }
  for (const key of Object.keys(save.data)) delete save.data[key];
  Object.assign(save.data, JSON.parse(backup));
  save.write();
  return { win: !!b.result?.win, stars: b.result?.stars || 0, wave: b.wave, keep: Math.round(b.keepHp), keeps, deaths, up: { ...b.up } };
}

export function report(stageIdx, runs = 2) {
  const lines = [`Stage ${STAGES[stageIdx].id} ${STAGES[stageIdx].name}`];
  for (const st of STRATEGIES) {
    const rs = [];
    for (let r = 0; r < runs; r++) {
      const o = play(stageIdx, st);
      rs.push(`${o.win ? `W${o.stars}★` : `L@w${o.wave}`}(deaths ${o.deaths})`);
      if (r === 0) rs.push(`[${o.keeps.join(',')}]`);
    }
    lines.push(`  ${st.name.padEnd(10)} ${rs.join(' ')}`);
  }
  window.__game.go('menu');
  return lines.join('\n');
}

export function all(runs = 2) {
  const lines = [];
  STAGES.forEach((s, i) => {
    const row = STRATEGIES.map((st) => {
      const rs = [];
      for (let r = 0; r < runs; r++) { const o = play(i, st); rs.push(o.win ? `W${o.stars}` : `L${o.wave}`); }
      return `${st.name}:${rs.join('/')}`;
    });
    lines.push(`${s.id}  ${row.join('  ')}`);
  });
  window.__game.go('menu');
  return lines.join('\n');
}

export function endless(runs = 1) {
  const out = STRATEGIES.map((st) => {
    const rs = [];
    for (let r = 0; r < runs; r++) rs.push(play('endless', st, 60 * 60 * 90).wave);
    return `${st.name}: wave ${rs.join('/')}`;
  });
  window.__game.go('menu');
  return out.join('\n');
}
