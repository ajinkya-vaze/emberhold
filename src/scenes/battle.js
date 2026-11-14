import { view } from '../view.js';
import { ENEMIES, TOWERS } from '../data/units.js';
import { BOONS, baseMods } from '../data/boons.js';
import { STAGES, ENDLESS, genEndlessWave } from '../data/stages.js';
import { Path, clamp, dist2, smooth, rand, shuffle, inRect, TAU } from '../util.js';
import { drawEnemy, drawHero, drawPortrait, drawPad, drawTower, drawWall, drawLightning, renderBackground, shadow } from '../art.js';
import { roundRect, text, button, panel, star, coin } from '../ui.js';
import { audio } from '../audio.js';
import { save } from '../save.js';
import { lineup, cleared, unlocksFrom } from '../progress.js';

// Point projectiles aim at: body centre, lifted for flyers.
const aimY = (e) => e.y - (e.alt || 0) - e.r * 0.6;

export class Battle {
  // which: stage index (0-based) or 'endless'
  constructor(game, which) {
    this.game = game;
    this.endless = which === 'endless';
    this.stageIdx = this.endless ? -1 : which;
    this.stage = this.endless ? ENDLESS : STAGES[which];
    this.speed = 1;
    this.hits = [];
    this.reset();
  }

  // ------------------------------------------------------------ setup
  reset() {
    const s = this.stage;
    this.time = 0;
    this.gold = s.startGold;
    this.wallMax = s.wallHp;
    this.wallHp = s.wallHp;
    this.wave = 0;
    this.totalWaves = this.endless ? Infinity : s.waves.length;
    this.phase = 'prep'; // prep | wave | inter | boon | end
    this.paused = false;
    this.enemies = [];
    this.projectiles = [];
    this.particles = [];
    this.texts = [];
    this.effects = [];
    this.spawnQueue = [];
    this.waveTime = 0;
    this.interT = 0;
    this.mods = baseMods();
    this.boonsTaken = [];
    this.kills = 0;
    this.towers = [];
    this.selected = -1;
    this.aiming = -1;
    this.aimX = 360;
    this.aimY = 600;
    this.boonChoices = null;
    this.result = null;
    this.shake = 0;
    this.wallFlash = 0;
    this.flash = 0;
    this.banner = null;
    this.seen = new Set();
    this.pathTurn = 0;
    this.wasCleared = !this.endless && cleared(s.id);
    this.heroes = lineup().map((def, i) => ({
      def, i, x: 0, y: 0, cd: def.skill.cd * 0.5, atk: 0.3 + i * 0.2, anim: 0, angle: -Math.PI / 2,
    }));
    this.layout();
  }

  layout() {
    const { W, H, safeTop, safeBottom } = view;
    this.fieldTop = safeTop + 96;
    this.panelTop = H - (196 + safeBottom);
    this.wallY = this.panelTop - 84;
    const fy = (f) => this.fieldTop + f * (this.wallY - this.fieldTop);
    this.paths = this.stage.paths.map((p) => new Path(p.map(([x, f]) => [x, fy(f)])));
    this.pads = this.stage.pads.map(([x, f]) => ({ x, y: fy(f) }));
    for (const t of this.towers) { t.x = this.pads[t.pad].x; t.y = this.pads[t.pad].y; }
    const hx = [150, 360, 570];
    this.heroes.forEach((h, i) => { h.x = hx[i]; h.y = this.wallY + 24; });
    for (const e of this.enemies) {
      if (e.flying) {
        const f = e.d / e.dEnd;
        e.fy0 = this.paths[e.path].pts[0][1];
        e.fy1 = this.wallY - e.r - 34;
        e.dEnd = Math.hypot(e.fx1 - e.fx0, e.fy1 - e.fy0);
        e.d = f * e.dEnd;
      } else {
        e.dEnd = this.paths[e.path].length - (e.ranged || e.r + 8);
        e.d = Math.min(e.d, e.dEnd);
      }
      this.placeEnemy(e);
    }
    this.bg = renderBackground(W, H, view.scale, view.dpr, this.paths, this.pads, this.fieldTop, this.wallY);
  }

  resize() { this.layout(); }
  onHide() { if (this.phase !== 'end') this.paused = true; }

  // ------------------------------------------------------------ flow
  waveGroups(n) { return this.endless ? genEndlessWave(n) : this.stage.waves[n - 1]; }

  startWave() {
    this.wave++;
    const groups = this.waveGroups(this.wave);
    const q = [];
    for (const g of groups) {
      for (let i = 0; i < g.n; i++) q.push({ at: (g.delay || 0) + i * g.every, type: g.t, p: g.p });
    }
    q.sort((a, b) => a.at - b.at);
    this.spawnQueue = q;
    this.waveTime = 0;
    this.phase = 'wave';
    const boss = groups.some((g) => ENEMIES[g.t].boss);
    const last = this.wave === this.totalWaves;
    this.banner = { text: last ? 'Final Wave!' : `Wave ${this.wave}`, sub: boss ? 'A boss leads this attack' : null, t: 0 };
    audio.play('wave');
  }

  callWave() {
    if (this.phase === 'prep') { audio.play('click'); this.startWave(); return; }
    if (this.phase === 'inter') {
      const bonus = Math.ceil(this.interT) * 2;
      if (bonus > 0) { this.gold += bonus; this.addText(view.W / 2, this.fieldTop + 120, `+${bonus} gold`, '#ffd34d', 28); }
      audio.play('coin');
      this.startWave();
    }
  }

  waveCleared() {
    const bonus = 20 + 5 * Math.min(this.wave, 12);
    this.gold += bonus;
    if (this.wave >= this.totalWaves) { this.endBattle(true); return; }
    this.banner = { text: `Wave ${this.wave} cleared!`, sub: `+${bonus} gold`, t: 0 };
    const boon = this.endless ? this.wave % this.stage.boonEvery === 0 : this.stage.boonAfter.includes(this.wave);
    if (boon) this.openBoons();
    else this.startIntermission();
  }

  startIntermission() { this.phase = 'inter'; this.interT = 12; }

  openBoons() {
    this.phase = 'boon';
    this.aiming = -1;
    this.selected = -1;
    const heroIds = this.heroes.map((h) => h.def.id);
    const pool = BOONS.filter((b) =>
      !(b.id === 'frost' && this.mods.frost >= 0.5) &&
      (!b.requires || this.stage.towers.includes(b.requires)) &&
      (!b.hero || heroIds.includes(b.hero)));
    this.boonChoices = shuffle(pool).slice(0, 3);
    this.boonT = 0;
    audio.play('boon');
  }

  chooseBoon(b) {
    b.apply(this.mods, this);
    this.boonsTaken.push(b);
    this.boonChoices = null;
    audio.play('build');
    this.startIntermission();
  }

  endBattle(win) {
    this.phase = 'end';
    this.aiming = -1;
    this.selected = -1;
    const frac = this.wallHp / this.wallMax;
    const stars = win ? (frac >= 0.8 ? 3 : frac >= 0.45 ? 2 : 1) : 0;
    this.result = { win, stars, t: 0, frac, unlocks: [] };
    if (this.endless) {
      const reached = Math.max(0, this.wave - 1);
      this.result.reached = reached;
      this.result.newBest = reached > (save.data.endlessBest || 0);
      if (this.result.newBest) { save.data.endlessBest = reached; save.write(); }
      audio.play('lose');
      this.shake = 14;
      return;
    }
    if (win) {
      const best = save.data.best[this.stage.id] || 0;
      if (!this.wasCleared) this.result.unlocks = unlocksFrom(this.stage.id);
      if (stars > best) { save.data.best[this.stage.id] = stars; save.write(); }
      audio.play('win');
    } else {
      audio.play('lose');
      this.shake = 14;
    }
  }

  // ------------------------------------------------------------ simulation
  update(dt) {
    this.time += dt;
    if (this.banner) { this.banner.t += dt; if (this.banner.t > (this.banner.long ? 3.6 : 2.4)) this.banner = null; }
    if (this.result) this.result.t += dt;
    if (this.phase === 'boon') this.boonT += dt;
    if (this.paused || this.phase === 'boon') return;
    for (let i = 0; i < this.speed; i++) this.step(dt);
  }

  step(dt) {
    if (this.phase === 'end') { this.updateFx(dt); return; }
    if (this.phase === 'wave') {
      this.waveTime += dt;
      while (this.spawnQueue.length && this.spawnQueue[0].at <= this.waveTime) {
        const s = this.spawnQueue.shift();
        this.spawn(s.type, s.p);
      }
      if (!this.spawnQueue.length && !this.enemies.length) this.waveCleared();
    } else if (this.phase === 'inter') {
      this.interT -= dt;
      if (this.interT <= 0) this.startWave();
    }
    this.updateHeroes(dt);
    this.updateTowers(dt);
    this.updateEnemies(dt);
    this.updateProjectiles(dt);
    this.updateEffects(dt);
    this.updateFx(dt);
  }

  spawn(type, pathIdx, opt = {}) {
    const d = ENEMIES[type];
    const hpMul = (this.stage.hpMul || 1) * (1 + this.stage.hpGrowth * (this.wave - 1));
    let path = pathIdx;
    if (path === undefined || path >= this.paths.length) path = this.pathTurn++ % this.paths.length;
    const P = this.paths[path];
    const maxHp = Math.round(d.hp * hpMul);
    const e = {
      ...d, type, maxHp, hp: maxHp, path, d: opt.d || 0, x: 0, y: 0, alt: 0,
      state: 'walk', phase: Math.random() * TAU, jit: rand(-1, 1) * (d.boss ? 30 : 85), lane: d.boss ? 0 : rand(-13, 13),
      slowT: 0, slowF: 0, stunT: 0, hasteT: 0, burnT: 0, burnDps: 0, flash: 0, swing: 0, atkT: 0.4,
      cryT: 5, healT: d.healEvery || 0, sumT: d.summon ? d.summon.every * 0.6 : 0, dead: false,
    };
    if (d.flying) {
      const s = P.at(0);
      e.fx0 = s.x + rand(-30, 30);
      e.fy0 = s.y;
      e.fx1 = rand(110, 610);
      e.fy1 = this.wallY - d.r - 34;
      e.dEnd = Math.hypot(e.fx1 - e.fx0, e.fy1 - e.fy0);
      e.alt = 30;
    } else {
      e.dEnd = P.length - (d.ranged || d.r + 8);
    }
    this.placeEnemy(e);
    this.enemies.push(e);

    if (!this.seen.has(type)) {
      this.seen.add(type);
      if (this.stage.intro?.includes(type)) {
        this.banner = { text: d.boss ? d.name : `New foe: ${d.name}`, sub: d.tip, t: 0, long: true };
      } else if (d.boss) {
        this.banner = { text: d.name, sub: 'Boss incoming!', t: 0 };
      }
    }
    if (d.boss && !opt.summoned) {
      audio.play('roar');
      this.shake = Math.max(this.shake, 8);
    }
    return e;
  }

  placeEnemy(e) {
    if (e.flying) {
      const t = e.dEnd > 0 ? e.d / e.dEnd : 1;
      e.x = e.fx0 + (e.fx1 - e.fx0) * t;
      e.y = e.fy0 + (e.fy1 - e.fy0) * t;
      return;
    }
    const P = this.paths[e.path];
    const p = P.at(e.d);
    const t = e.ranged ? 0 : smooth((e.d - (P.length - 170)) / 150);
    // sideways "lane" offset so crowds don't walk in a perfect single file
    e.x = p.x - p.dy * e.lane * (1 - t) + e.jit * t;
    e.y = p.y + p.dx * e.lane * (1 - t);
  }

  progress(e) {
    const len = e.flying ? e.dEnd : this.paths[e.path].length;
    return e.d / (len || 1) + (e.state === 'attack' ? 1 : 0);
  }

  // Most advanced enemy in range. ground: skip flyers.
  findTarget(x, y, range, ground = false) {
    const r2 = range * range;
    let best = null, bp = -1;
    for (const e of this.enemies) {
      if (e.dead || (ground && e.flying) || dist2(x, y, e.x, e.y) > r2) continue;
      const prog = this.progress(e);
      if (prog > bp) { bp = prog; best = e; }
    }
    return best;
  }

  applySlow(e, f, t) {
    if (e.boss) f *= 0.5;
    e.slowF = e.slowT > 0 ? Math.max(e.slowF, f) : f;
    e.slowT = Math.max(e.slowT, t);
  }

  updateHeroes(dt) {
    const m = this.mods;
    for (const h of this.heroes) {
      h.cd = Math.max(0, h.cd - dt);
      h.anim = Math.max(0, h.anim - dt * 4);
      h.atk -= dt * m.heroRate;
      if (h.atk > 0) continue;
      const d = h.def;
      const tg = this.findTarget(h.x, h.y - 40, d.range * m.range);
      if (!tg) { h.atk = 0; continue; }
      h.atk = 1 / d.rate;
      h.anim = 1;
      h.angle = Math.atan2(aimY(tg) - (h.y - 40), tg.x - h.x);
      if (d.proj === 'bolt') {
        this.chainZap(h.x + 18, h.y - 62, tg, d.dmg, d.chain + m.chain, d.chainRange, d.chainFalloff);
        audio.play('zap');
        continue;
      }
      this.fire({
        kind: d.proj, x: h.x, y: h.y - 46, target: tg, speed: d.projSpeed, dmg: d.dmg, dtype: d.dtype,
        splash: d.splash || 0, slow: d.id === 'wren' ? m.frost : 0,
      });
      audio.play(d.proj === 'fireball' ? 'fire' : d.proj === 'axe' ? 'axe' : 'bow');
    }
  }

  chainZap(x0, y0, first, dmg, jumps, range, falloff) {
    const pts = [[x0, y0]];
    const hit = new Set();
    let cur = first;
    let d = dmg;
    for (let k = 0; k <= jumps && cur; k++) {
      hit.add(cur);
      pts.push([cur.x, aimY(cur)]);
      this.damage(cur, d, 'magic');
      d *= falloff;
      let next = null, bd = range * range;
      for (const e of this.enemies) {
        if (e.dead || hit.has(e)) continue;
        const dd = dist2(cur.x, cur.y, e.x, e.y);
        if (dd < bd) { bd = dd; next = e; }
      }
      cur = next;
    }
    this.effects.push({ kind: 'lightning', pts, t: 0, dur: 0.16 });
  }

  updateTowers(dt) {
    const m = this.mods;
    for (const t of this.towers) {
      const def = TOWERS[t.type];
      const L = def.levels[t.level - 1];
      t.anim = Math.max(0, t.anim - dt * 4);
      t.atk -= dt * m.towerRate;
      if (t.atk > 0) continue;
      const range = this.towerRange(t);
      const tg = this.findTarget(t.x, t.y, range, !def.air);
      if (!tg) { t.atk = 0; continue; }
      t.atk = 1 / L.rate;
      t.anim = 1;
      t.angle = Math.atan2(tg.y - (t.y - 34), tg.x - t.x);
      if (t.type === 'frost') {
        const r2 = range * range;
        for (const e of this.enemies) {
          if (e.dead || dist2(t.x, t.y, e.x, e.y) > r2) continue;
          this.damage(e, L.dmg, 'magic', { quiet: true });
          if (!e.dead) this.applySlow(e, Math.min(0.75, L.slow + m.frostSlow), 1.6);
        }
        this.effects.push({ kind: 'ring', x: t.x, y: t.y, r: range, t: 0, dur: 0.45, color: '#bfefff', flat: true });
        audio.play('frost');
      } else if (t.type === 'arrow') {
        this.fire({ kind: 'arrow', x: t.x, y: t.y - 70, target: tg, speed: def.projSpeed, dmg: L.dmg, dtype: 'phys', slow: m.frost });
        audio.play('bow');
      } else if (t.type === 'mage') {
        this.fire({ kind: 'arcane', x: t.x, y: t.y - 116, target: tg, speed: def.projSpeed, dmg: L.dmg * m.mageDmg, dtype: 'magic' });
        audio.play('arcane');
      } else {
        this.fire({
          kind: 'ball', x: t.x + Math.cos(t.angle) * 30, y: t.y - 34 + Math.sin(t.angle) * 30, target: tg,
          speed: def.projSpeed, dmg: L.dmg * m.cannonDmg, dtype: 'phys', splash: L.splash * m.cannonSplash, ground: true,
        });
        this.burst(t.x + Math.cos(t.angle) * 36, t.y - 34 + Math.sin(t.angle) * 36, '#d8d0c4', 5, 60, 0);
        audio.play('cannon');
      }
    }
  }

  towerRange(t) {
    const L = TOWERS[t.type].levels[t.level - 1];
    return L.range * this.mods.range * (t.type === 'frost' ? this.mods.frostRange : 1);
  }

  updateEnemies(dt) {
    const m = this.mods;
    // iterate a snapshot: summons add enemies mid-loop
    for (const e of this.enemies.slice()) {
      if (e.dead) continue;
      e.flash = Math.max(0, e.flash - dt * 6);
      e.swing = Math.max(0, e.swing - dt * 4);
      if (e.slowT > 0) e.slowT -= dt;
      if (e.hasteT > 0) e.hasteT -= dt;
      if (e.burnT > 0) {
        e.burnT -= dt;
        this.damage(e, e.burnDps * dt, 'magic', { quiet: true, noCrit: true });
        if (Math.random() < dt * 10) {
          this.particle({ x: e.x + rand(-e.r, e.r) * 0.6, y: aimY(e) + rand(-e.r, e.r) * 0.5, vy: -50, life: 0.5, size: rand(3, 5), color: Math.random() < 0.5 ? '#ff9a2e' : '#ffd25a' });
        }
        if (e.dead) continue;
      }
      if (e.stunT > 0) { e.stunT -= dt; continue; }
      if (e.cry) this.warCry(e, dt);
      if (e.heal) this.shamanHeal(e, dt);
      if (e.summon) this.summon(e, dt);
      const haste = e.hasteT > 0 ? 1.35 : 1;
      if (e.state === 'walk') {
        const sp = e.speed * m.enemySpeed * (e.slowT > 0 ? 1 - e.slowF : 1) * haste;
        e.d += sp * dt;
        e.phase += dt * sp * 0.16;
        if (e.d >= e.dEnd) { e.d = e.dEnd; e.state = 'attack'; e.atkT = 0.3; }
        this.placeEnemy(e);
      } else {
        e.atkT -= dt * haste;
        if (e.atkT <= 0) {
          e.atkT = e.hitEvery;
          e.swing = 1;
          if (e.ranged) {
            const tx = e.x + rand(-30, 30), ty = this.wallY - 2;
            this.projectiles.push({ kind: 'ebolt', x: e.x, y: e.y - e.r, tx, ty, speed: 620, dmg: e.hit, enemyShot: true, angle: Math.atan2(ty - e.y, tx - e.x), prog: 0, spin: 0, total: 1 });
            audio.play('ebolt');
          } else {
            this.hitWall(e.hit, e.x);
          }
        }
      }
    }
    this.enemies = this.enemies.filter((e) => !e.dead);
  }

  warCry(e, dt) {
    e.cryT -= dt;
    if (e.cryT > 0) return;
    e.cryT = 9;
    for (const o of this.enemies) if (!o.dead && dist2(o.x, o.y, e.x, e.y) < 240 * 240) o.hasteT = 3.5;
    this.effects.push({ kind: 'ring', x: e.x, y: e.y - e.r * 0.5, r: 240, t: 0, dur: 0.7, color: '#ff5a3a' });
    this.addText(e.x, e.y - e.r * 2.6, 'WAR CRY!', '#ff7a5a', 30);
    audio.play('roar');
  }

  shamanHeal(e, dt) {
    e.healT -= dt;
    if (e.healT > 0) return;
    e.healT = e.healEvery;
    const r2 = e.healRange * e.healRange;
    let any = false;
    for (const o of this.enemies) {
      if (o === e || o.dead || o.hp >= o.maxHp || dist2(o.x, o.y, e.x, e.y) > r2) continue;
      o.hp = Math.min(o.maxHp, o.hp + o.maxHp * e.heal);
      any = true;
      for (let k = 0; k < 3; k++) this.particle({ x: o.x + rand(-10, 10), y: aimY(o) + rand(-6, 6), vy: -60, life: 0.6, size: 4, color: '#7dff9a' });
    }
    if (any) {
      this.effects.push({ kind: 'ring', x: e.x, y: e.y, r: e.healRange, t: 0, dur: 0.6, color: '#7dff9a', flat: true });
      audio.play('heal');
    }
  }

  summon(e, dt) {
    e.sumT -= dt;
    if (e.sumT > 0 || e.state !== 'walk') return;
    e.sumT = e.summon.every;
    for (let k = 0; k < e.summon.n; k++) {
      const s = this.spawn(e.summon.type, e.path, { d: Math.max(0, e.d - 30 - k * 20), summoned: true });
      this.burst(s.x, s.y - 10, '#7dff6a', 8, 120);
    }
    this.effects.push({ kind: 'ring', x: e.x, y: e.y - e.r * 0.5, r: 90, t: 0, dur: 0.5, color: '#8aff7a' });
    audio.play('summon');
  }

  hitWall(dmg, x) {
    if (this.phase === 'end') return;
    this.wallHp = Math.max(0, this.wallHp - dmg);
    this.wallFlash = 1;
    audio.play('wall');
    for (let i = 0; i < 3; i++) {
      this.particle({ x: x + rand(-14, 14), y: this.wallY - 8, vx: rand(-60, 60), vy: rand(-120, -40), g: 400, life: 0.45, size: rand(3, 5), color: '#b3a998' });
    }
    if (dmg >= 25) this.shake = Math.max(this.shake, dmg >= 60 ? 10 : 4);
    if (this.wallHp <= 0) this.endBattle(false);
  }

  healWall(frac) {
    const amt = Math.round(this.wallMax * frac);
    this.wallHp = Math.min(this.wallMax, this.wallHp + amt);
    this.addText(view.W / 2, this.wallY - 40, `+${amt} wall`, '#8fe07a', 28);
  }

  fire(p) {
    p.tx = p.target.x;
    p.ty = aimY(p.target);
    p.total = Math.max(1, Math.hypot(p.tx - p.x, p.ty - p.y));
    p.angle = Math.atan2(p.ty - p.y, p.tx - p.x);
    p.prog = 0;
    p.spin = 0;
    this.projectiles.push(p);
  }

  updateProjectiles(dt) {
    for (const p of this.projectiles) {
      if (p.target && !p.target.dead) { p.tx = p.target.x; p.ty = aimY(p.target); }
      const dx = p.tx - p.x, dy = p.ty - p.y;
      const d = Math.hypot(dx, dy);
      const step = p.speed * dt;
      p.spin += dt * 18;
      if (d <= step) {
        p.x = p.tx; p.y = p.ty;
        this.impact(p);
        p.done = true;
        continue;
      }
      p.x += (dx / d) * step;
      p.y += (dy / d) * step;
      p.angle = Math.atan2(dy, dx);
      p.prog = clamp(1 - d / p.total, 0, 1);
      if ((p.kind === 'fireball' || p.kind === 'arcane') && Math.random() < 0.7) {
        const c = p.kind === 'fireball' ? ['#ff8a2a', '#ffd25a'] : ['#d07aff', '#f4c8ff'];
        this.particle({ x: p.x + rand(-4, 4), y: p.y + rand(-4, 4), life: 0.3, size: rand(3, 6), color: c[Math.random() < 0.5 ? 0 : 1] });
      }
    }
    this.projectiles = this.projectiles.filter((p) => !p.done);
  }

  impact(p) {
    if (p.enemyShot) { this.hitWall(p.dmg, p.tx); return; }
    if (p.splash) {
      const r2 = p.splash * p.splash;
      for (const e of this.enemies) {
        if (e.dead || (p.ground && e.flying) || dist2(p.tx, p.ty, e.x, aimY(e)) > r2) continue;
        this.damage(e, p.dmg, p.dtype);
        if (p.dtype === 'magic') this.applyBurn(e);
      }
      const fiery = p.kind === 'fireball';
      this.burst(p.tx, p.ty, fiery ? '#ff8a2a' : '#5a5048', 10, 150, 0);
      this.burst(p.tx, p.ty, fiery ? '#ffd25a' : '#d8cfc0', 6, 100, 0);
      this.effects.push({ kind: 'ring', x: p.tx, y: p.ty, r: p.splash, t: 0, dur: 0.3, color: fiery ? '#ffb347' : '#e8e0d0' });
      audio.play('hit');
    } else if (p.target && !p.target.dead) {
      const e = p.target;
      this.damage(e, p.dmg, p.dtype);
      if (p.dtype === 'magic') this.applyBurn(e);
      if (p.slow > 0 && !e.dead) this.applySlow(e, p.slow, 1.5);
      const c = p.kind === 'arcane' ? '#e9b0ff' : p.slow > 0 ? '#bfe9ff' : '#fff2c8';
      this.burst(p.tx, p.ty, c, p.kind === 'arcane' ? 7 : 3, 80, 0);
      audio.play('hit');
    }
  }

  applyBurn(e) {
    if (this.mods.burn > 0 && !e.dead) { e.burnT = 3; e.burnDps = Math.max(e.burnDps, this.mods.burn); }
  }

  damage(e, amt, dtype, opt = {}) {
    if (e.dead) return;
    let a = amt * (dtype === 'phys' ? this.mods.phys : this.mods.magic);
    let crit = false;
    if (!opt.noCrit && this.mods.crit > 0 && Math.random() < this.mods.crit) { a *= 2; crit = true; }
    if (dtype === 'phys') a *= 1 - e.armor;
    e.hp -= a;
    if (!opt.quiet) e.flash = 1;
    if (crit) this.addText(e.x, aimY(e) - e.r * 1.6, `${Math.round(a)}!`, '#ffe066', 24);
    if (e.hp <= 0) this.kill(e);
  }

  kill(e) {
    e.dead = true;
    this.kills++;
    const g = Math.max(1, Math.round(e.bounty * this.mods.gold));
    this.gold += g;
    this.addText(e.x, aimY(e) - e.r, `+${g}`, '#ffd34d', e.boss ? 40 : 22);
    this.burst(e.x, aimY(e), e.color, e.boss ? 40 : 10, e.boss ? 260 : 140);
    this.burst(e.x, aimY(e), '#f4efe6', e.boss ? 20 : 5, 90, 0);
    audio.play('coin');
    if (e.boss) { this.shake = 16; audio.play('boom'); }
  }

  // ------------------------------------------------------------ skills
  tapHero(i) {
    if (this.phase === 'end') return;
    const h = this.heroes[i];
    if (h.cd > 0) { audio.play('error'); return; }
    if (!h.def.skill.aim) { this.castSkill(i, h.x, h.y); return; }
    this.selected = -1;
    if (this.aiming === i) { this.aiming = -1; audio.play('click'); return; }
    this.aiming = i;
    const tg = this.findTarget(view.W / 2, this.wallY, 5000);
    this.aimX = tg ? tg.x : view.W / 2;
    this.aimY = tg ? tg.y : this.fieldTop + (this.wallY - this.fieldTop) * 0.6;
    audio.play('click');
  }

  castSkill(i, x, y) {
    const h = this.heroes[i];
    const sk = h.def.skill;
    if (h.cd > 0) return;
    h.cd = sk.cd * this.mods.cd;
    h.anim = 1;
    this.aiming = -1;
    audio.play('skill');
    if (sk.id === 'storm') {
      this.effects.push({ kind: 'storm', x, y, r: sk.radius, t: 0, dur: 1.6, next: 0, pulses: 0, total: sk.pulses, dmg: sk.dmg });
    } else if (sk.id === 'meteor') {
      this.effects.push({ kind: 'meteor', x, y, r: sk.radius, t: 0, delay: 0.75, hit: false, dmg: sk.dmg, burn: sk.burn });
    } else if (sk.id === 'shout') {
      const reach = this.wallY - sk.radius;
      for (const e of this.enemies) if (!e.dead && e.y >= reach) e.stunT = Math.max(e.stunT, e.boss ? 1.2 : 2.5);
      this.healWall(0.12);
      this.effects.push({ kind: 'shout', x: h.x, y: this.wallY, r: sk.radius, t: 0, dur: 0.8 });
      audio.play('shout');
      this.shake = Math.max(this.shake, 6);
    } else if (sk.id === 'thunder') {
      this.effects.push({ kind: 'thunder', t: 0, dur: sk.dur, next: 0, left: sk.strikes, every: sk.dur / sk.strikes, dmg: sk.dmg, stun: sk.stun });
      this.flash = 0.6;
    }
  }

  thunderStrike(f) {
    const alive = this.enemies.filter((e) => !e.dead);
    let x, y, tg = null;
    if (alive.length) {
      // favour enemies that haven't been struck yet
      const fresh = alive.filter((e) => !f.struck?.has(e));
      const pool = fresh.length ? fresh : alive;
      tg = pool[Math.floor(Math.random() * pool.length)];
      (f.struck ??= new Set()).add(tg);
      x = tg.x; y = aimY(tg);
    } else {
      x = rand(60, view.W - 60);
      y = rand(this.fieldTop + 60, this.wallY - 60);
    }
    if (tg) {
      this.damage(tg, f.dmg, 'magic');
      if (!tg.dead) tg.stunT = Math.max(tg.stunT, f.stun);
      for (const e of this.enemies) {
        if (e !== tg && !e.dead && dist2(x, y, e.x, aimY(e)) < 45 * 45) this.damage(e, f.dmg * 0.5, 'magic', { quiet: true });
      }
    }
    this.effects.push({ kind: 'lightning', pts: [[x + rand(-40, 40), this.fieldTop - 20], [x, y]], t: 0, dur: 0.22 });
    this.burst(x, y, '#bff6ff', 8, 160);
    this.flash = Math.max(this.flash || 0, 0.25);
    audio.play('thunder');
  }

  updateEffects(dt) {
    for (const f of this.effects) {
      f.t += dt;
      if (f.kind === 'storm') {
        for (let k = 0; k < 3; k++) {
          const a = rand(0, TAU), rr = Math.sqrt(Math.random()) * f.r;
          this.particle({ kind: 'arrow', x: f.x + Math.cos(a) * rr, y: f.y + Math.sin(a) * rr * 0.75 - 70, vy: 700, life: 0.1, color: '#3a2a1a' });
        }
        f.next -= dt;
        if (f.next <= 0 && f.pulses < f.total) {
          f.next = f.dur / f.total;
          f.pulses++;
          for (const e of this.enemies) {
            if (e.dead || dist2(f.x, f.y, e.x, e.y) > f.r * f.r) continue;
            this.damage(e, f.dmg, 'phys');
            if (this.mods.frost > 0 && !e.dead) this.applySlow(e, this.mods.frost, 1.5);
          }
          audio.play('bow');
        }
        if (f.t >= f.dur) f.done = true;
      } else if (f.kind === 'meteor') {
        if (!f.hit && f.t >= f.delay) {
          f.hit = true;
          for (const e of this.enemies) {
            if (e.dead || dist2(f.x, f.y, e.x, e.y) > f.r * f.r) continue;
            this.damage(e, f.dmg, 'magic');
            if (!e.dead) { e.burnT = 3; e.burnDps = f.burn + this.mods.burn; }
          }
          this.shake = Math.max(this.shake, 16);
          audio.play('boom');
          this.burst(f.x, f.y, '#ff7a2a', 30, 320);
          this.burst(f.x, f.y, '#ffd25a', 24, 240);
          this.burst(f.x, f.y, '#4a3a30', 16, 200);
          this.effects.push({ kind: 'ring', x: f.x, y: f.y, r: f.r * 1.15, t: 0, dur: 0.5, color: '#ffb347' });
          this.effects.push({ kind: 'scorch', x: f.x, y: f.y, r: f.r * 0.8, t: 0, dur: 4 });
        }
        if (f.t >= f.delay + 0.1) f.done = f.hit;
      } else if (f.kind === 'thunder') {
        f.next -= dt;
        while (f.next <= 0 && f.left > 0) { f.next += f.every; f.left--; this.thunderStrike(f); }
        if (f.left <= 0) f.done = true;
      } else if (f.t >= f.dur) {
        f.done = true;
      }
    }
    this.effects = this.effects.filter((f) => !f.done);
  }

  // ------------------------------------------------------------ fx
  particle(o) {
    const p = { vx: 0, vy: 0, g: 0, life: 0.5, size: 4, drag: 0, kind: 'dot', color: '#fff', ...o };
    p.max = p.life;
    this.particles.push(p);
  }

  burst(x, y, color, n, spd, g = 500) {
    for (let i = 0; i < n; i++) {
      const a = rand(0, TAU), s = rand(0.3, 1) * spd;
      this.particle({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s - spd * 0.3, g, life: rand(0.3, 0.7), size: rand(3, 6), color, drag: 2 });
    }
  }

  addText(x, y, str, color, size = 24) {
    this.texts.push({ x, y, str, color, size, life: 0.9, max: 0.9 });
  }

  updateFx(dt) {
    for (const p of this.particles) {
      p.life -= dt;
      const k = 1 - p.drag * dt;
      p.vx *= k;
      p.vy = p.vy * k + p.g * dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
    }
    this.particles = this.particles.filter((p) => p.life > 0);
    if (this.particles.length > 600) this.particles.splice(0, this.particles.length - 600);
    for (const t of this.texts) { t.life -= dt; t.y -= 45 * dt; }
    this.texts = this.texts.filter((t) => t.life > 0);
    this.shake = Math.max(0, this.shake - dt * 30);
    this.wallFlash = Math.max(0, this.wallFlash - dt * 3);
    this.flash = Math.max(0, (this.flash || 0) - dt * 3);
  }

  // ------------------------------------------------------------ towers
  towerAt(pi) { return this.towers.find((t) => t.pad === pi); }

  build(pi, type) {
    const cost = TOWERS[type].levels[0].cost;
    if (this.gold < cost) { audio.play('error'); return; }
    this.gold -= cost;
    const p = this.pads[pi];
    this.towers.push({ pad: pi, type, level: 1, x: p.x, y: p.y, atk: 0.2, anim: 0, angle: -Math.PI / 2, spent: cost });
    this.selected = -1;
    this.burst(p.x, p.y, '#cbb994', 14, 160);
    audio.play('build');
  }

  upgrade(t) {
    const L = TOWERS[t.type].levels;
    if (t.level >= L.length) return;
    const cost = L[t.level].cost;
    if (this.gold < cost) { audio.play('error'); return; }
    this.gold -= cost;
    t.spent += cost;
    t.level++;
    this.burst(t.x, t.y - 50, '#ffd23f', 16, 180);
    audio.play('build');
  }

  sell(t) {
    const refund = Math.floor(t.spent * 0.6);
    this.gold += refund;
    this.towers = this.towers.filter((x) => x !== t);
    this.selected = -1;
    this.addText(t.x, t.y - 60, `+${refund}`, '#ffd34d', 26);
    this.burst(t.x, t.y, '#cbb994', 12, 140);
    audio.play('sell');
  }

  // ------------------------------------------------------------ input
  addHit(r, fn) { this.hits.push({ r, fn }); }

  pointerDown(x, y) {
    for (let i = this.hits.length - 1; i >= 0; i--) {
      const h = this.hits[i];
      if (inRect(x, y, h.r)) { h.fn(x, y); return; }
    }
    this.fieldTap(x, y);
  }

  pointerMove(x, y) {
    if (this.aiming >= 0) { this.aimX = x; this.aimY = clamp(y, this.fieldTop, this.wallY - 10); }
  }

  fieldTap(x, y) {
    if (this.phase === 'end' || this.phase === 'boon' || this.paused) return;
    if (this.aiming >= 0) {
      if (y > this.fieldTop && y < this.wallY + 20) this.castSkill(this.aiming, x, Math.min(y, this.wallY - 10));
      else this.aiming = -1;
      return;
    }
    const pi = this.pads.findIndex((p) => Math.hypot(p.x - x, p.y - 25 - y) < 52);
    if (pi >= 0) {
      this.selected = this.selected === pi ? -1 : pi;
      audio.play('click');
    } else {
      this.selected = -1;
    }
  }

  // ------------------------------------------------------------ render
  render(ctx) {
    const { W, H } = view;
    const t = this.time;
    this.hits = [];

    ctx.save();
    if (this.shake > 0) ctx.translate(rand(-1, 1) * this.shake, rand(-1, 1) * this.shake);
    ctx.drawImage(this.bg, 0, 0, W, H);

    const hint = this.towers.length === 0 && this.phase === 'prep' && Math.sin(t * 5) > 0;
    this.pads.forEach((p, i) => { if (!this.towerAt(i)) drawPad(ctx, p.x, p.y, this.selected === i || hint); });

    // ground layer effects
    for (const f of this.effects) {
      if (f.kind === 'scorch') {
        ctx.globalAlpha = 0.35 * (1 - f.t / f.dur);
        ctx.fillStyle = '#2a1a10';
        ctx.beginPath(); ctx.ellipse(f.x, f.y, f.r, f.r * 0.7, 0, 0, TAU); ctx.fill();
        ctx.globalAlpha = 1;
      } else if (f.kind === 'storm') {
        ctx.fillStyle = 'rgba(70,45,20,0.15)';
        ctx.beginPath(); ctx.ellipse(f.x, f.y, f.r, f.r * 0.75, 0, 0, TAU); ctx.fill();
        ctx.setLineDash([10, 8]);
        ctx.lineWidth = 3; ctx.strokeStyle = 'rgba(255,240,190,0.7)'; ctx.stroke();
        ctx.setLineDash([]);
      } else if (f.kind === 'meteor' && !f.hit) {
        const k = f.t / f.delay;
        ctx.fillStyle = `rgba(30,10,0,${0.15 + 0.3 * k})`;
        ctx.beginPath(); ctx.ellipse(f.x, f.y, f.r * k, f.r * k * 0.7, 0, 0, TAU); ctx.fill();
        ctx.lineWidth = 3; ctx.strokeStyle = `rgba(255,90,40,${0.5 + 0.5 * Math.sin(t * 20)})`;
        ctx.beginPath(); ctx.ellipse(f.x, f.y, f.r, f.r * 0.7, 0, 0, TAU); ctx.stroke();
      } else if (f.kind === 'ring' && f.flat) {
        const k = f.t / f.dur;
        ctx.globalAlpha = 0.5 * (1 - k);
        ctx.fillStyle = f.color;
        ctx.beginPath(); ctx.ellipse(f.x, f.y, f.r * (0.3 + 0.7 * k), f.r * (0.3 + 0.7 * k) * 0.8, 0, 0, TAU); ctx.fill();
        ctx.globalAlpha = 1;
      }
    }

    // selected tower range
    if (this.selected >= 0) {
      const tw = this.towerAt(this.selected);
      if (tw) {
        ctx.fillStyle = 'rgba(255,255,255,0.10)';
        ctx.beginPath(); ctx.arc(tw.x, tw.y, this.towerRange(tw), 0, TAU); ctx.fill();
        ctx.setLineDash([12, 10]); ctx.lineWidth = 3; ctx.strokeStyle = 'rgba(255,255,255,0.6)'; ctx.stroke(); ctx.setLineDash([]);
      }
    }

    // depth-sorted towers + ground enemies; flyers on top
    const list = [];
    for (const tw of this.towers) list.push({ y: tw.y, tw });
    for (const e of this.enemies) list.push({ y: e.y + (e.flying ? 10000 : 0), e });
    list.sort((a, b) => a.y - b.y);
    for (const d of list) {
      if (d.tw) drawTower(ctx, d.tw, t);
      else if (!d.e.flying) drawEnemy(ctx, d.e, t);
    }

    for (const p of this.projectiles) this.drawProjectile(ctx, p);

    // wall + heroes
    drawWall(ctx, W, this.wallY, this.wallHp / this.wallMax, t);
    if (this.wallFlash > 0) {
      ctx.fillStyle = `rgba(255,50,30,${this.wallFlash * 0.22})`;
      ctx.fillRect(0, this.wallY - 20, W, 104);
    }
    for (const h of this.heroes) {
      if (this.aiming === h.i) {
        ctx.fillStyle = 'rgba(255,230,120,0.35)';
        ctx.beginPath(); ctx.ellipse(h.x, h.y, 30, 12, 0, 0, TAU); ctx.fill();
      }
      drawHero(ctx, h, t);
    }
    for (const d of list) if (d.e && d.e.flying) drawEnemy(ctx, d.e, t);

    // particles
    for (const p of this.particles) {
      const a = clamp(p.life / p.max, 0, 1);
      if (p.kind === 'arrow') {
        ctx.strokeStyle = p.color; ctx.lineWidth = 2.5;
        ctx.beginPath(); ctx.moveTo(p.x, p.y - 18); ctx.lineTo(p.x, p.y); ctx.stroke();
        continue;
      }
      ctx.globalAlpha = a;
      ctx.fillStyle = p.color;
      ctx.beginPath(); ctx.arc(p.x, p.y, p.size * (0.5 + 0.5 * a), 0, TAU); ctx.fill();
    }
    ctx.globalAlpha = 1;

    // top-layer effects
    for (const f of this.effects) {
      if (f.kind === 'ring' && !f.flat) {
        const k = f.t / f.dur;
        ctx.globalAlpha = 1 - k;
        ctx.lineWidth = 6 * (1 - k) + 1; ctx.strokeStyle = f.color;
        ctx.beginPath(); ctx.ellipse(f.x, f.y, f.r * (0.4 + 0.6 * k), f.r * (0.4 + 0.6 * k) * 0.75, 0, 0, TAU); ctx.stroke();
        ctx.globalAlpha = 1;
      } else if (f.kind === 'lightning') {
        drawLightning(ctx, f.pts, 1 - f.t / f.dur);
      } else if (f.kind === 'shout') {
        const k = f.t / f.dur;
        ctx.globalAlpha = 1 - k;
        ctx.lineWidth = 10 * (1 - k) + 2; ctx.strokeStyle = '#9fd4ff';
        ctx.beginPath(); ctx.ellipse(W / 2, f.y, W * 0.7 * k + 40, f.r * k, 0, Math.PI, TAU); ctx.stroke();
        ctx.globalAlpha = 1;
      } else if (f.kind === 'meteor' && !f.hit) {
        const k = f.t / f.delay;
        const mx = f.x + 260 * (1 - k), my = f.y - 520 * (1 - k);
        const g = ctx.createRadialGradient(mx, my, 2, mx, my, 40);
        g.addColorStop(0, '#fff6c0'); g.addColorStop(0.4, '#ffb347'); g.addColorStop(1, 'rgba(255,80,20,0)');
        ctx.fillStyle = g;
        ctx.beginPath(); ctx.arc(mx, my, 40, 0, TAU); ctx.fill();
        ctx.fillStyle = '#5a2a14';
        ctx.beginPath(); ctx.arc(mx, my, 16, 0, TAU); ctx.fill();
        this.particle({ x: mx + rand(-8, 8), y: my + rand(-8, 8), life: 0.4, size: rand(4, 8), color: Math.random() < 0.5 ? '#ff8a2a' : '#ffd25a' });
      }
    }

    if (this.aiming >= 0) {
      const r = this.heroes[this.aiming].def.skill.radius;
      ctx.fillStyle = 'rgba(255,230,120,0.14)';
      ctx.beginPath(); ctx.ellipse(this.aimX, this.aimY, r, r * 0.75, 0, 0, TAU); ctx.fill();
      ctx.lineWidth = 4; ctx.strokeStyle = `rgba(255,230,120,${0.6 + 0.4 * Math.sin(t * 8)})`; ctx.stroke();
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(this.aimX - 16, this.aimY); ctx.lineTo(this.aimX + 16, this.aimY);
      ctx.moveTo(this.aimX, this.aimY - 12); ctx.lineTo(this.aimX, this.aimY + 12);
      ctx.stroke();
    }

    for (const tx of this.texts) {
      ctx.globalAlpha = clamp((tx.life / tx.max) * 1.5, 0, 1);
      text(ctx, tx.str, tx.x, tx.y, { size: tx.size, color: tx.color, lw: 5 });
    }
    ctx.globalAlpha = 1;
    ctx.restore();

    if (this.flash > 0) {
      ctx.fillStyle = `rgba(220,245,255,${this.flash * 0.3})`;
      ctx.fillRect(0, 0, W, H);
    }

    // ---------------- UI
    this.drawHud(ctx);
    this.drawPanel(ctx);
    this.drawWaveButton(ctx);
    this.drawPopup(ctx);
    this.drawHints(ctx);
    this.drawBanner(ctx);
    if (this.phase === 'boon' && this.boonChoices) this.drawBoons(ctx);
    else if (this.paused && this.phase !== 'end') this.drawPause(ctx);
    if (this.result && this.result.t > 0.8) this.drawResult(ctx);
  }

  drawProjectile(ctx, p) {
    if (p.kind === 'arrow' || p.kind === 'ebolt') {
      const c = Math.cos(p.angle), s = Math.sin(p.angle);
      const len = p.kind === 'ebolt' ? 14 : 18;
      ctx.lineCap = 'round';
      ctx.strokeStyle = p.kind === 'ebolt' ? '#2a1a10' : '#4a3220'; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.moveTo(p.x - c * len, p.y - s * len); ctx.lineTo(p.x, p.y); ctx.stroke();
      ctx.strokeStyle = p.slow > 0 ? '#9fe0ff' : '#e8e8e8'; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.moveTo(p.x - c * 4, p.y - s * 4); ctx.lineTo(p.x + c * 2, p.y + s * 2); ctx.stroke();
      if (p.kind === 'arrow') {
        ctx.strokeStyle = '#d23b3b'; ctx.lineWidth = 3;
        ctx.beginPath(); ctx.moveTo(p.x - c * 18, p.y - s * 18); ctx.lineTo(p.x - c * 13, p.y - s * 13); ctx.stroke();
      }
    } else if (p.kind === 'axe') {
      ctx.save();
      ctx.translate(p.x, p.y); ctx.rotate(p.spin);
      ctx.strokeStyle = '#6b4529'; ctx.lineWidth = 4; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(0, 10); ctx.lineTo(0, -10); ctx.stroke();
      ctx.fillStyle = '#d4d8e0'; ctx.strokeStyle = '#2a1a12'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(0, -10); ctx.quadraticCurveTo(12, -12, 10, 0); ctx.lineTo(0, -3); ctx.closePath(); ctx.fill(); ctx.stroke();
      ctx.restore();
    } else if (p.kind === 'fireball' || p.kind === 'arcane') {
      const g = ctx.createRadialGradient(p.x, p.y, 1, p.x, p.y, 16);
      if (p.kind === 'fireball') { g.addColorStop(0, '#fff6c0'); g.addColorStop(0.45, '#ff9a2e'); g.addColorStop(1, 'rgba(255,80,20,0)'); }
      else { g.addColorStop(0, '#ffffff'); g.addColorStop(0.45, '#c86aff'); g.addColorStop(1, 'rgba(140,40,255,0)'); }
      ctx.fillStyle = g;
      ctx.beginPath(); ctx.arc(p.x, p.y, 16, 0, TAU); ctx.fill();
    } else if (p.kind === 'ball') {
      const lift = Math.sin(Math.PI * p.prog) * 50;
      shadow(ctx, p.x, p.y + 10, 8, 4, 0.3);
      ctx.fillStyle = '#26221f';
      ctx.beginPath(); ctx.arc(p.x, p.y - lift, 8, 0, TAU); ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,0.35)';
      ctx.beginPath(); ctx.arc(p.x - 3, p.y - lift - 3, 2.5, 0, TAU); ctx.fill();
    }
  }

  drawHud(ctx) {
    const { W, safeTop } = view;
    const g = ctx.createLinearGradient(0, 0, 0, this.fieldTop);
    g.addColorStop(0, 'rgba(24,15,10,0.96)');
    g.addColorStop(1, 'rgba(24,15,10,0.82)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, this.fieldTop - 8);
    ctx.fillStyle = '#6b4a33';
    ctx.fillRect(0, this.fieldTop - 10, W, 4);
    const cy = safeTop + 44;

    roundRect(ctx, 14, cy - 30, 214, 60, 18);
    ctx.fillStyle = '#3a281d'; ctx.fill(); ctx.lineWidth = 3; ctx.strokeStyle = '#120b07'; ctx.stroke();
    const shown = Math.max(1, this.wave);
    text(ctx, this.endless ? `Wave ${shown}` : `Wave ${shown}/${this.totalWaves}`, 30, cy - 9, { size: 24, align: 'left', color: '#fff3d6', lw: 4 });
    const foes = this.spawnQueue.length + this.enemies.length;
    const sub = this.phase === 'wave' ? `${foes} foes left`
      : this.endless ? `Best: wave ${save.data.endlessBest || 0}`
      : this.phase === 'prep' ? `Stage ${this.stage.id}` : 'Breather';
    text(ctx, sub, 30, cy + 15, { size: 16, align: 'left', color: '#d9c3a0', weight: 700 });

    roundRect(ctx, 240, cy - 30, 190, 60, 18);
    ctx.fillStyle = '#3a281d'; ctx.fill(); ctx.lineWidth = 3; ctx.strokeStyle = '#120b07'; ctx.stroke();
    coin(ctx, 272, cy, 16);
    text(ctx, `${Math.floor(this.gold)}`, 298, cy + 1, { size: 30, align: 'left', color: '#ffd34d', lw: 5 });

    const sb = { x: W - 168, y: cy - 30, w: 74, h: 60 };
    button(ctx, sb, `${this.speed}×`, { color: this.speed > 1 ? 'green' : 'wood', size: 28 });
    this.addHit(sb, () => { this.speed = this.speed === 1 ? 2 : 1; audio.play('click'); });
    const pb = { x: W - 84, y: cy - 30, w: 70, h: 60 };
    button(ctx, pb, 'II', { color: 'wood', size: 26 });
    this.addHit(pb, () => { if (this.phase !== 'end') { this.paused = true; audio.play('click'); } });
  }

  drawPanel(ctx) {
    const { W, H } = view;
    const top = this.panelTop;
    ctx.fillStyle = '#3a281d';
    ctx.fillRect(0, top, W, H - top);
    ctx.strokeStyle = 'rgba(0,0,0,0.25)';
    ctx.lineWidth = 2;
    for (let y = top + 44; y < H; y += 44) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke(); }
    ctx.fillStyle = '#1e140f';
    ctx.fillRect(0, top, W, 5);

    const bx = 24, by = top + 14, bw = W - 48, bh = 30;
    const frac = this.wallHp / this.wallMax;
    roundRect(ctx, bx, by, bw, bh, 15);
    ctx.fillStyle = '#1a100b'; ctx.fill();
    if (frac > 0) {
      roundRect(ctx, bx + 3, by + 3, Math.max(24, (bw - 6) * frac), bh - 6, 12);
      const g = ctx.createLinearGradient(0, by, 0, by + bh);
      const [c1, c2] = frac > 0.5 ? ['#9be37a', '#3f9a36'] : frac > 0.25 ? ['#ffd866', '#d48a1e'] : ['#ff8a70', '#c8412e'];
      g.addColorStop(0, c1); g.addColorStop(1, c2);
      ctx.fillStyle = g; ctx.fill();
    }
    text(ctx, `Wall  ${Math.ceil(this.wallHp)} / ${this.wallMax}`, W / 2, by + bh / 2 + 1, { size: 18, lw: 4 });

    const cw = 216, ch = 126, gap = (W - 3 * cw) / 4;
    this.heroes.forEach((h, i) => {
      const x = gap + i * (cw + gap), y = top + 56;
      const sk = h.def.skill;
      const ready = h.cd <= 0;
      const aiming = this.aiming === i;
      roundRect(ctx, x, y + 4, cw, ch, 18);
      ctx.fillStyle = 'rgba(0,0,0,0.4)'; ctx.fill();
      roundRect(ctx, x, y, cw, ch, 18);
      ctx.fillStyle = aiming ? '#4a3420' : '#24170f'; ctx.fill();
      ctx.lineWidth = aiming ? 6 : 4;
      ctx.strokeStyle = aiming ? '#ffe066' : ready ? h.def.color : '#4a3a2e';
      ctx.stroke();

      const px = x + 50, py = y + ch / 2;
      if (ready) {
        ctx.save();
        ctx.globalAlpha = 0.55 + 0.45 * Math.sin(this.time * 5 + i);
        ctx.beginPath(); ctx.arc(px, py, 44, 0, TAU); ctx.lineWidth = 5; ctx.strokeStyle = '#ffd34d'; ctx.stroke();
        ctx.restore();
      }
      drawPortrait(ctx, h.def.id, px, py, 38);
      ctx.beginPath(); ctx.arc(px, py, 38, 0, TAU); ctx.lineWidth = 3; ctx.strokeStyle = '#120b07'; ctx.stroke();
      if (!ready) {
        const total = sk.cd * this.mods.cd;
        const k = clamp(h.cd / total, 0, 1);
        ctx.fillStyle = 'rgba(10,6,4,0.65)';
        ctx.beginPath(); ctx.moveTo(px, py); ctx.arc(px, py, 38, -Math.PI / 2, -Math.PI / 2 + TAU * k); ctx.closePath(); ctx.fill();
        text(ctx, `${Math.ceil(h.cd)}`, px, py + 1, { size: 30, lw: 5 });
      }
      text(ctx, h.def.name, x + 96, y + 28, { size: 24, align: 'left', color: '#fff3d6', lw: 4 });
      text(ctx, sk.name, x + 96, y + 56, { size: 15, align: 'left', color: '#d9c3a0', weight: 700 });
      const pill = { x: x + 96, y: y + 76, w: 106, h: 34 };
      roundRect(ctx, pill.x, pill.y, pill.w, pill.h, 12);
      ctx.fillStyle = aiming ? '#ffe066' : ready ? '#e8a52a' : '#3a2c22';
      ctx.fill();
      text(ctx, aiming ? 'AIMING' : ready ? 'CAST' : 'charging', pill.x + pill.w / 2, pill.y + pill.h / 2 + 1, {
        size: ready || aiming ? 18 : 14, color: ready || aiming ? '#2a1606' : '#8a7a6a', weight: 800,
      });
      this.addHit({ x, y, w: cw, h: ch }, () => this.tapHero(i));
    });
  }

  drawWaveButton(ctx) {
    if (this.phase !== 'prep' && this.phase !== 'inter') return;
    const { W } = view;
    const r = { x: W / 2 - 175, y: this.fieldTop + 20, w: 350, h: 84 };
    const pulse = 1 + 0.03 * Math.sin(this.time * 6);
    ctx.save();
    ctx.translate(W / 2, r.y + r.h / 2); ctx.scale(pulse, pulse); ctx.translate(-W / 2, -(r.y + r.h / 2));
    if (this.phase === 'prep') {
      button(ctx, r, this.endless ? 'Start Siege' : 'Start Battle', {
        color: 'green', size: 32, sub: this.endless ? 'How long can you hold?' : `${this.totalWaves} waves to survive`,
      });
    } else {
      const s = Math.ceil(this.interT);
      button(ctx, r, `Next Wave in ${s}`, { color: 'green', size: 30, sub: `Tap to call early: +${s * 2} gold` });
    }
    ctx.restore();
    this.addHit(r, () => this.callWave());
  }

  drawPopup(ctx) {
    if (this.selected < 0 || this.phase === 'end' || this.phase === 'boon') return;
    const { W } = view;
    const p = this.pads[this.selected];
    const tw = this.towerAt(this.selected);
    const types = this.stage.towers;
    const ow = 140, og = 12;
    const w = tw ? 330 : types.length * ow + (types.length + 1) * og;
    const h = 176;
    const x = clamp(p.x - w / 2, 10, W - w - 10);
    let y = p.y - (tw ? 130 : 60) - h;
    if (y < this.fieldTop + 4) y = p.y + 44;
    panel(ctx, x, y, w, h);
    this.addHit({ x, y, w, h }, () => {});

    if (!tw) {
      text(ctx, 'Build a tower', x + w / 2, y + 26, { size: 20, color: '#fff3d6', lw: 4 });
      types.forEach((type, k) => {
        const def = TOWERS[type];
        const cost = def.levels[0].cost;
        const ok = this.gold >= cost;
        const b = { x: x + og + k * (ow + og), y: y + 46, w: ow, h: 116 };
        roundRect(ctx, b.x, b.y, b.w, b.h, 14);
        ctx.fillStyle = ok ? '#5a3f2c' : '#2f221a'; ctx.fill();
        ctx.lineWidth = 3; ctx.strokeStyle = ok ? '#e8a52a' : '#4a3a2e'; ctx.stroke();
        ctx.save();
        ctx.globalAlpha = ok ? 1 : 0.5;
        ctx.translate(b.x + b.w / 2, b.y + 80);
        ctx.scale(0.55, 0.55);
        drawTower(ctx, { type, level: 1, x: 0, y: 0, anim: 0, angle: -Math.PI / 2 }, this.time);
        ctx.restore();
        text(ctx, def.short, b.x + b.w / 2, b.y + 14, { size: 16, color: '#fff3d6', weight: 800 });
        coin(ctx, b.x + b.w / 2 - 26, b.y + 102, 9);
        text(ctx, `${cost}`, b.x + b.w / 2 - 12, b.y + 103, { size: 20, align: 'left', color: ok ? '#ffd34d' : '#e06050', lw: 4 });
        if (this.stage.newTower === type) {
          roundRect(ctx, b.x + b.w - 46, b.y - 10, 52, 24, 10);
          ctx.fillStyle = '#d23b3b'; ctx.fill();
          text(ctx, 'NEW', b.x + b.w - 20, b.y + 2, { size: 14, color: '#fff' });
        }
        this.addHit(b, () => this.build(this.selected, type));
      });
    } else {
      const def = TOWERS[tw.type];
      const L = def.levels[tw.level - 1];
      const next = def.levels[tw.level];
      text(ctx, `${def.name}  Lv ${tw.level}`, x + w / 2, y + 28, { size: 22, color: '#fff3d6', lw: 4 });
      const arrow = (a, b) => (b !== undefined && b !== a ? `${a} → ${b}` : `${a}`);
      text(ctx, `Damage ${arrow(L.dmg, next?.dmg)}   Range ${arrow(L.range, next?.range)}`, x + w / 2, y + 60, { size: 15, color: '#d9c3a0', weight: 700 });
      let third = `Speed ${arrow(L.rate, next?.rate)}/s`;
      if (L.splash) third += `   Blast ${arrow(L.splash, next?.splash)}`;
      if (L.slow) third += `   Slow ${arrow(Math.round(L.slow * 100), next && Math.round(next.slow * 100))}%`;
      if (!def.air) third += '   Ground only';
      text(ctx, third, x + w / 2, y + 84, { size: 15, color: '#d9c3a0', weight: 700 });
      const ub = { x: x + 14, y: y + 104, w: 186, h: 58 };
      if (next) {
        button(ctx, ub, 'Upgrade', { color: 'gold', size: 22, sub: `${next.cost} gold`, disabled: this.gold < next.cost });
        this.addHit(ub, () => this.upgrade(tw));
      } else {
        button(ctx, ub, 'MAX LEVEL', { color: 'gold', size: 22, disabled: true });
      }
      const sb = { x: x + 212, y: y + 104, w: 104, h: 58 };
      button(ctx, sb, 'Sell', { color: 'red', size: 22, sub: `+${Math.floor(tw.spent * 0.6)}` });
      this.addHit(sb, () => this.sell(tw));
    }
  }

  drawHints(ctx) {
    const { W } = view;
    let msg = null;
    if (this.aiming >= 0) msg = `Tap the field to cast ${this.heroes[this.aiming].def.skill.name}`;
    else if (this.phase === 'prep' && this.selected < 0) {
      if (this.stage.newTower) msg = `New tower unlocked: ${TOWERS[this.stage.newTower].name}!`;
      else if (this.towers.length === 0) msg = 'Tap a stone pad to build a tower';
    }
    if (!msg) return;
    const y = this.phase === 'prep' || this.phase === 'inter' ? this.fieldTop + 140 : this.fieldTop + 30;
    ctx.font = '700 20px system-ui';
    const w = Math.min(W - 40, ctx.measureText(msg).width + 50);
    roundRect(ctx, W / 2 - w / 2, y - 22, w, 44, 22);
    ctx.fillStyle = 'rgba(20,12,8,0.8)'; ctx.fill();
    text(ctx, msg, W / 2, y + 1, { size: 20, color: '#ffe9a8', weight: 700 });
  }

  drawBanner(ctx) {
    if (!this.banner || this.phase === 'end') return;
    const { W } = view;
    const b = this.banner;
    const end = b.long ? 3.1 : 1.9;
    const a = b.t < 0.25 ? b.t / 0.25 : b.t > end ? Math.max(0, 1 - (b.t - end) / 0.5) : 1;
    const s = b.t < 0.25 ? 0.7 + 0.3 * (b.t / 0.25) : 1;
    const y = this.fieldTop + (this.wallY - this.fieldTop) * 0.4;
    ctx.save();
    ctx.globalAlpha = a;
    ctx.translate(W / 2, y); ctx.scale(s, s);
    const g = ctx.createLinearGradient(-W / 2, 0, W / 2, 0);
    g.addColorStop(0, 'rgba(20,12,8,0)'); g.addColorStop(0.15, 'rgba(20,12,8,0.8)');
    g.addColorStop(0.85, 'rgba(20,12,8,0.8)'); g.addColorStop(1, 'rgba(20,12,8,0)');
    ctx.fillStyle = g;
    ctx.fillRect(-W / 2, -52, W, b.sub ? 112 : 90);
    const size = b.text.length > 18 ? 42 : 54;
    text(ctx, b.text, 0, -8, { size, color: '#ffd34d', lw: 8 });
    if (b.sub) text(ctx, b.sub, 0, 38, { size: b.sub.length > 40 ? 19 : 24, color: '#fff3d6', lw: 5 });
    ctx.restore();
  }

  dim(ctx, a = 0.6) {
    const { W, H } = view;
    ctx.fillStyle = `rgba(10,6,4,${a})`;
    ctx.fillRect(0, 0, W, H);
    this.addHit({ x: 0, y: 0, w: W, h: H }, () => {});
  }

  drawBoons(ctx) {
    const { W, H } = view;
    this.dim(ctx, 0.65);
    const k = clamp(this.boonT / 0.3, 0, 1);
    const cardH = 150, gap = 22;
    const total = 3 * cardH + 2 * gap;
    const y0 = H / 2 - total / 2 + 30;
    text(ctx, 'Choose a Boon', W / 2, y0 - 70, { size: 46, color: '#ffd34d', lw: 7 });
    text(ctx, 'It lasts for the rest of this battle', W / 2, y0 - 28, { size: 20, color: '#fff3d6', weight: 700 });
    this.boonChoices.forEach((b, i) => {
      const off = (1 - k) * 60 * (i + 1);
      const r = { x: 40, y: y0 + i * (cardH + gap) + off, w: W - 80, h: cardH };
      ctx.globalAlpha = k;
      panel(ctx, r.x, r.y, r.w, r.h, { fill: '#4a3424', inner: '#e8a52a' });
      roundRect(ctx, r.x + 20, r.y + 25, 100, 100, 20);
      ctx.fillStyle = '#2a1c13'; ctx.fill();
      ctx.font = '56px system-ui, "Apple Color Emoji", sans-serif';
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText(b.icon, r.x + 70, r.y + 78);
      text(ctx, b.name, r.x + 146, r.y + 54, { size: 30, align: 'left', color: '#ffd34d', lw: 5 });
      text(ctx, b.desc, r.x + 146, r.y + 98, { size: b.desc.length > 32 ? 18 : 20, align: 'left', color: '#fff3d6', weight: 700 });
      ctx.globalAlpha = 1;
      this.addHit(r, () => { if (this.boonT > 0.35) this.chooseBoon(b); });
    });
  }

  drawPause(ctx) {
    const { W, H } = view;
    this.dim(ctx, 0.6);
    const w = 460, h = 470, x = W / 2 - w / 2, y = H / 2 - h / 2;
    panel(ctx, x, y, w, h);
    text(ctx, 'Paused', W / 2, y + 60, { size: 46, color: '#ffd34d', lw: 7 });
    const mk = (i) => ({ x: W / 2 - 160, y: y + 120 + i * 84, w: 320, h: 68 });
    button(ctx, mk(0), 'Resume', { color: 'green', size: 30 });
    this.addHit(mk(0), () => { this.paused = false; audio.play('click'); });
    button(ctx, mk(1), `Sound: ${audio.enabled ? 'On' : 'Off'}`, { color: 'wood', size: 26 });
    this.addHit(mk(1), () => { audio.enabled = !audio.enabled; save.data.sound = audio.enabled; save.write(); audio.play('click'); });
    button(ctx, mk(2), 'Restart', { color: 'gold', size: 28 });
    this.addHit(mk(2), () => { audio.play('click'); this.reset(); });
    button(ctx, mk(3), 'Quit to Map', { color: 'red', size: 26 });
    this.addHit(mk(3), () => { audio.play('click'); this.game.go('campaign'); });
  }

  drawResult(ctx) {
    const { W, H } = view;
    const r = this.result;
    const k = clamp((r.t - 0.8) / 0.35, 0, 1);
    this.dim(ctx, 0.6 * k);
    const extra = r.unlocks.length ? 50 + r.unlocks.length * 32 : 0;
    const w = 580, h = 560 + extra, x = W / 2 - w / 2, y = H / 2 - h / 2 + (1 - k) * 80;
    ctx.globalAlpha = k;
    panel(ctx, x, y, w, h);
    let lines;
    if (this.endless) {
      text(ctx, 'Siege Broken', W / 2, y + 70, { size: 56, color: '#ff9a5a', lw: 8 });
      text(ctx, `${r.reached}`, W / 2, y + 160, { size: 84, color: '#ffd34d', lw: 9 });
      text(ctx, r.reached === 1 ? 'wave survived' : 'waves survived', W / 2, y + 214, { size: 22, color: '#fff3d6', weight: 700 });
      lines = [
        r.newBest ? 'New personal best!' : `Best: ${save.data.endlessBest} waves`,
        `Foes defeated: ${this.kills}`,
        `Boons: ${this.boonsTaken.map((b) => b.icon).join(' ') || '—'}`,
      ];
    } else {
      text(ctx, r.win ? 'Victory!' : 'The Wall Fell', W / 2, y + 70, { size: 58, color: r.win ? '#ffd34d' : '#ff7a5a', lw: 8 });
      for (let i = 0; i < 3; i++) {
        const appear = clamp((r.t - 1.2 - i * 0.25) / 0.2, 0, 1);
        const filled = r.win && i < r.stars && appear > 0;
        const sz = 46 * (filled ? 0.6 + 0.4 * appear + (appear < 1 ? 0.3 * Math.sin(appear * Math.PI) : 0) : 1);
        star(ctx, W / 2 + (i - 1) * 110, y + 170 - (i === 1 ? 14 : 0), sz, filled);
      }
      lines = [
        `Wall held: ${Math.round(r.frac * 100)}%`,
        `Waves survived: ${r.win ? this.totalWaves : Math.max(0, this.wave - 1)} / ${this.totalWaves}`,
        `Foes defeated: ${this.kills}`,
        `Boons: ${this.boonsTaken.map((b) => b.icon).join(' ') || '—'}`,
      ];
    }
    lines.forEach((l, i) => text(ctx, l, W / 2, y + 262 + i * 36, { size: 22, color: '#fff3d6', weight: 700 }));
    if (r.unlocks.length) {
      const uy = y + 262 + lines.length * 36 + 14;
      text(ctx, 'Unlocked', W / 2, uy, { size: 20, color: '#8fe07a', lw: 4 });
      r.unlocks.forEach((u, i) => text(ctx, u, W / 2, uy + 32 + i * 32, { size: 20, color: '#ffe9a8', weight: 700 }));
    }

    const next = !this.endless && r.win && STAGES[this.stageIdx + 1];
    const bw = next ? 160 : 220;
    const btns = [
      { label: r.win ? 'Replay' : 'Retry', color: next ? 'wood' : 'gold', fn: () => this.reset() },
      { label: 'Map', color: 'wood', fn: () => this.game.go('campaign') },
    ];
    if (next) btns.push({ label: 'Next', color: 'green', fn: () => this.game.go('battle', this.stageIdx + 1) });
    const gap = (w - btns.length * bw) / (btns.length + 1);
    btns.forEach((b, i) => {
      const rr = { x: x + gap + i * (bw + gap), y: y + h - 104, w: bw, h: 72 };
      button(ctx, rr, b.label, { color: b.color, size: 28 });
      if (k >= 1) this.addHit(rr, () => { audio.play('click'); b.fn(); });
    });
    ctx.globalAlpha = 1;
  }
}
