// Headless balance harness. In the browser console on the running game:
//   const B = await import('/tools/balance.js');
//   B.report(2)              // stage index 2 (= stage 1-3), 3 runs per strategy
//   B.all()                  // every stage, quick summary
//   B.endless()              // how far each strategy gets in Endless Siege
// Plays the battle with bot strategies and prints wall HP after each wave.
import { STAGES } from '../src/data/stages.js';
import { TOWERS } from '../src/data/units.js';
import { save } from '../src/save.js';

// Bot strategies. `types: 'all'` cycles through every tower the stage allows.
export const STRATEGIES = [
  { name: 'expert',      types: 'all',               pads: 9, maxLv: 3, skills: true,  boons: ['steel', 'ember', 'quick', 'eng', 'keen', 'focus'] },
  { name: 'casual',      types: 'all',               pads: 9, maxLv: 2, skills: true,  boons: [] },
  { name: 'arrows-only', types: ['arrow'],           pads: 9, maxLv: 2, skills: true,  boons: [] },
  { name: '3towers',     types: 'all',               pads: 3, maxLv: 3, skills: true,  boons: [] },
  { name: 'no-skills',   types: 'all',               pads: 9, maxLv: 3, skills: false, boons: [] },
  { name: 'heroes-only', types: [],                  pads: 0, maxLv: 1, skills: true,  boons: ['quick'] },
];

// Plays one battle without touching your saved progress.
export function play(which, st, maxSteps = 60 * 60 * 30) {
  const backup = JSON.stringify(save.data);
  const g = window.__game;
  g.go('battle', which);
  const b = g.scene;
  const types = st.types === 'all' ? b.stage.towers : st.types.filter((t) => b.stage.towers.includes(t));
  const walls = [];
  let lastWave = 0;
  for (let steps = 0; b.phase !== 'end' && steps < maxSteps; steps++) {
    if (b.wave !== lastWave) { walls.push(Math.round(b.wallHp)); lastWave = b.wave; }
    if (b.phase === 'prep') b.callWave();
    if (b.phase === 'boon') { const c = b.boonChoices; b.chooseBoon(c.find((x) => st.boons.includes(x.id)) || c[0]); }
    for (let i = 0; i < Math.min(b.pads.length, st.pads); i++) {
      const ty = types[i % types.length];
      if (!b.towerAt(i) && ty && b.gold >= TOWERS[ty].levels[0].cost) b.build(i, ty);
    }
    for (const t of b.towers) {
      const next = TOWERS[t.type].levels[t.level];
      if (t.level < st.maxLv && next && b.gold >= next.cost) b.upgrade(t);
    }
    if (st.skills) {
      b.heroes.forEach((h, i) => {
        const tg = b.findTarget(360, b.wallY, 5000);
        if (h.cd > 0 || !tg) return;
        if (h.def.skill.aim) b.castSkill(i, tg.x, tg.y);
        else if (h.def.skill.id === 'thunder' ? b.enemies.length >= 5 : b.enemies.filter((e) => e.state === 'attack').length >= 3) b.castSkill(i, 0, 0);
      });
    }
    b.step(1 / 60);
  }
  Object.assign(save.data, JSON.parse(backup));
  save.write();
  return { win: !!b.result?.win, stars: b.result?.stars || 0, wave: b.wave, wall: Math.round(b.wallHp), walls };
}

export function report(stageIdx, runs = 3) {
  const lines = [`Stage ${STAGES[stageIdx].id} ${STAGES[stageIdx].name}`];
  for (const st of STRATEGIES) {
    const rs = [];
    for (let r = 0; r < runs; r++) {
      const o = play(stageIdx, st);
      rs.push(o.win ? `W${o.stars}★` : `L@w${o.wave}`);
      if (r === 0) rs.push(`[${o.walls.join(',')}]`);
    }
    lines.push(`  ${st.name.padEnd(12)} ${rs.join(' ')}`);
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
