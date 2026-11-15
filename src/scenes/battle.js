import { view } from '../view.js';
import { ENEMIES, KING, TOWER, BARRICADE, ARMORY, PAY_RATE, PAY_DELAY, COIN_LIFE } from '../data/units.js';
import { STAGES, ENDLESS, genEndlessWave } from '../data/stages.js';
import { Path, clamp, dist2, smooth, rand, inRect, TAU } from '../util.js';
import {
  drawEnemy, drawKing, drawPad, drawCostBubble, drawCoin, drawCoinIcon, drawTower, drawBarricade,
  drawKeep, drawArmorySpot, renderBackground,
} from '../art.js';
import { roundRect, text, button, panel, star } from '../ui.js';
import { audio } from '../audio.js';
import { save } from '../save.js';
import { cleared, unlocksFrom } from '../progress.js';

// Point projectiles aim at: body centre, lifted for flyers.
const aimY = (e) => e.y - (e.alt || 0) - e.r * 0.6;
const ARMORY_KINDS = ['bow', 'quiver', 'volley', 'repair'];
const KEEP_W = 230; // keep footprint (for collisions)
const KEEP_H = 170;

export class Battle {
  // which: stage index (0-based) or 'endless'
  constructor(game, which) {
    this.game = game;
    this.endless = which === 'endless';
    this.stageIdx = this.endless ? -1 : which;
    this.stage = this.endless ? ENDLESS : STAGES[which];
    this.speed = 1;
    this.hits = [];
    this.keys = new Set();
    this.reset();
  }

  // ------------------------------------------------------------ setup
  reset() {
    const s = this.stage;
    this.time = 0;
    this.simTime = 0; // advances with the simulation (respects 2× speed)
    this.coins = s.startCoins;
    this.keepMax = s.keepHp;
    this.keepHp = s.keepHp;
    this.wave = 0;
    this.totalWaves = this.endless ? Infinity : s.waves.length;
    this.phase = 'prep'; // prep | wave | inter | end
    this.paused = false;
    this.enemies = [];
    this.projectiles = [];
    this.particles = [];
    this.texts = [];
    this.effects = [];
    this.drops = [];
    this.spawnQueue = [];
    this.waveTime = 0;
    this.interT = 0;
    this.kills = 0;
    this.result = null;
    this.shake = 0;
    this.keepFlash = 0;
    this.banner = null;
    this.seen = new Set();
    this.pathTurn = 0;
    this.joy = null;
    this.autoMove = null; // set by the balance bot
    this.onSpot = null;
    this.wasCleared = !this.endless && cleared(s.id);
    this.up = { bow: 0, quiver: 0, volley: 0 };
    this.king = {
      x: 360, y: 0, hp: KING.hp, maxHp: KING.hp, aim: -Math.PI / 2, moving: false, walk: 0,
      anim: 0, hurt: 0, atk: 0, dead: false, respawnT: 0, lastHurt: -99,
    };
    // build spots: towers beside the road, barricades on it, armory in town
    this.spots = [
      ...s.pads.map(([fx, ff]) => ({ kind: 'tower', fx, ff, level: 0, paid: 0, acc: 0, dwell: 0, atk: 0.3, anim: 0 })),
      ...s.walls.map(([fx, ff]) => ({ kind: 'wall', fx, ff, level: 0, paid: 0, acc: 0, dwell: 0, hp: 0, maxHp: 0, hit: 0 })),
      ...ARMORY_KINDS.map((kind, i) => ({ kind, slot: i, level: 0, paid: 0, acc: 0, dwell: 0 })),
    ];
    this.layout(true);
  }

  layout(first = false) {
    const { W, H, safeTop, safeBottom } = view;
    this.fieldTop = safeTop + 96;
    this.townBottom = H - safeBottom;
    this.townTop = this.townBottom - 210;
    const fy = (f) => this.fieldTop + f * (this.townTop - this.fieldTop);
    this.paths = this.stage.paths.map((p) => new Path(p.map(([x, f]) => [x, fy(f)])));
    const armX = [78, 196, 524, 642];
    for (const sp of this.spots) {
      if (sp.kind === 'tower') { sp.x = sp.fx; sp.y = fy(sp.ff); }
      else if (sp.kind === 'wall') {
        sp.x = sp.fx; sp.y = fy(sp.ff);
        sp.blocks = [];
        this.paths.forEach((P, pi) => {
          const pr = P.project(sp.x, sp.y);
          if (pr.dist < 6) { sp.blocks.push({ path: pi, d: pr.d }); sp.dx = pr.dx; sp.dy = pr.dy; }
        });
      } else { sp.x = armX[sp.slot]; sp.y = this.townTop + 118; }
    }
    this.keepRect = { x: 360 - KEEP_W / 2, y: this.townTop + 4, w: KEEP_W, h: KEEP_H };
    if (first) { this.king.x = 360; this.king.y = this.townTop - 70; }
    this.king.y = clamp(this.king.y, this.fieldTop + 20, this.townBottom - 24);
    for (const e of this.enemies) {
      if (e.flying) {
        const f = e.d / e.dEnd;
        e.fy0 = this.paths[e.path].pts[0][1];
        e.fy1 = this.townTop + 6;
        e.dEnd = Math.hypot(e.fx1 - e.fx0, e.fy1 - e.fy0);
        e.d = f * e.dEnd;
      } else {
        e.dEnd = this.paths[e.path].length - (e.ranged || e.r + 8);
        e.d = Math.min(e.d, e.dEnd);
      }
      this.placeEnemy(e);
    }
    const clearSpots = this.spots.filter((s) => s.kind === 'tower' || s.kind === 'wall');
    this.bg = renderBackground(W, H, view.scale, view.dpr, this.paths, clearSpots, this.fieldTop, this.townTop);
  }

  resize() { this.layout(); }
  onHide() { if (this.phase !== 'end') this.paused = true; this.joy = null; this.keys.clear(); }

  // ------------------------------------------------------------ flow
  waveGroups(n) { return this.endless ? genEndlessWave(n) : this.stage.waves[n - 1]; }

  startWave() {
    this.wave++;
    const groups = this.waveGroups(this.wave);
    const q = [];
    for (const g of groups) for (let i = 0; i < g.n; i++) q.push({ at: (g.delay || 0) + i * g.every, type: g.t, p: g.p });
    q.sort((a, b) => a.at - b.at);
    this.spawnQueue = q;
    this.waveTime = 0;
    this.phase = 'wave';
    const boss = groups.some((g) => ENEMIES[g.t].boss);
    this.banner = { text: this.wave === this.totalWaves ? 'Final Wave!' : `Wave ${this.wave}`, sub: boss ? 'A boss leads this attack' : null, t: 0 };
    audio.play('wave');
  }

  callWave() {
    if (this.phase === 'prep') { audio.play('click'); this.startWave(); return; }
    if (this.phase === 'inter') {
      const bonus = Math.ceil(this.interT / 2);
      if (bonus > 0) { this.coins += bonus; this.addText(view.W / 2, this.fieldTop + 130, `+${bonus} coins`, '#ffd34d', 26); }
      audio.play('coin');
      this.startWave();
    }
  }

  waveCleared() {
    const bonus = 5 + 2 * Math.min(this.wave, 12);
    this.coins += bonus;
    if (this.wave >= this.totalWaves) { this.endBattle(true); return; }
    this.banner = { text: `Wave ${this.wave} cleared!`, sub: `+${bonus} coins. Collect, build, upgrade!`, t: 0 };
    this.phase = 'inter';
    this.interT = 18;
  }

  endBattle(win) {
    this.phase = 'end';
    this.joy = null;
    const frac = this.keepHp / this.keepMax;
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
    if (this.paused) return;
    for (let i = 0; i < this.speed; i++) this.step(dt);
  }

  step(dt) {
    this.simTime += dt;
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
    this.updateKing(dt);
    this.updateSpots(dt);
    this.updateTowers(dt);
    this.updateEnemies(dt);
    this.updateProjectiles(dt);
    this.updateDrops(dt);
    this.updateEffects(dt);
    this.updateFx(dt);
  }

  // ------------------------------------------------------------ the King
  moveDir() {
    if (this.autoMove) return this.autoMove;
    let dx = 0, dy = 0, mag = 0;
    if (this.joy) {
      const vx = this.joy.x - this.joy.ox, vy = this.joy.y - this.joy.oy;
      const len = Math.hypot(vx, vy);
      if (len > 8) { dx = vx / len; dy = vy / len; mag = Math.min(1, len / 45); }
    }
    let kx = 0, ky = 0;
    if (this.keys.has('left')) kx -= 1;
    if (this.keys.has('right')) kx += 1;
    if (this.keys.has('up')) ky -= 1;
    if (this.keys.has('down')) ky += 1;
    if (kx || ky) { const l = Math.hypot(kx, ky); dx = kx / l; dy = ky / l; mag = 1; }
    return { x: dx * mag, y: dy * mag };
  }

  updateKing(dt) {
    const k = this.king;
    k.anim = Math.max(0, k.anim - dt * 5);
    k.hurt = Math.max(0, k.hurt - dt * 4);
    if (k.dead) {
      k.respawnT -= dt;
      if (k.respawnT <= 0) {
        k.dead = false;
        k.hp = k.maxHp;
        k.x = 360; k.y = this.townTop - 50;
        this.burst(k.x, k.y - 20, '#ffe36b', 16, 160);
        audio.play('respawn');
      }
      return;
    }
    const dir = this.moveDir();
    const mag = Math.hypot(dir.x, dir.y);
    k.moving = mag > 0.05;
    if (k.moving) {
      k.x += dir.x * KING.speed * dt;
      k.y += dir.y * KING.speed * dt;
      k.walk += dt * 14;
    }
    k.x = clamp(k.x, 22, view.W - 22);
    k.y = clamp(k.y, this.fieldTop + 24, this.townBottom - 18);
    // can't walk through the Keep
    const r = this.keepRect;
    if (k.x > r.x - 12 && k.x < r.x + r.w + 12 && k.y > r.y + 20 && k.y < r.y + r.h + 10) {
      const outs = [
        [k.y - (r.y + 20), 0, -1], [r.y + r.h + 10 - k.y, 0, 1],
        [k.x - (r.x - 12), -1, 0], [r.x + r.w + 12 - k.x, 1, 0],
      ].sort((a, b) => a[0] - b[0]);
      k.x += outs[0][1] * outs[0][0];
      k.y += outs[0][2] * outs[0][0];
    }
    if (this.simTime - k.lastHurt > KING.regenDelay) k.hp = Math.min(k.maxHp, k.hp + KING.regen * dt);

    // shooting: nearest enemies first, one arrow each (more with Volley)
    k.atk -= dt * (1 + ARMORY.quiver.per * this.up.quiver);
    if (k.atk > 0) return;
    const ox = k.x, oy = k.y - 22;
    const r2 = KING.range * KING.range;
    const near = this.enemies.filter((e) => !e.dead && dist2(ox, oy, e.x, aimY(e)) <= r2)
      .sort((a, b) => dist2(ox, oy, a.x, aimY(a)) - dist2(ox, oy, b.x, aimY(b)));
    if (!near.length) { k.atk = 0; return; }
    k.atk = 1 / KING.rate;
    k.anim = 1;
    const dmg = KING.dmg * (1 + ARMORY.bow.per * this.up.bow);
    const shots = 1 + this.up.volley;
    for (let i = 0; i < shots; i++) {
      const tg = near[i % near.length];
      if (i === 0) k.aim = Math.atan2(aimY(tg) - oy, tg.x - ox);
      this.fire({ kind: 'arrow', x: ox + Math.cos(k.aim) * 14, y: oy + Math.sin(k.aim) * 14, target: tg, speed: KING.arrowSpeed, dmg: i ? dmg * ARMORY.volley.extraDmg : dmg, royal: true });
    }
    audio.play('bow');
  }

  hitKing(dmg) {
    const k = this.king;
    if (k.dead || this.phase === 'end') return;
    k.hp -= dmg;
    k.hurt = 1;
    k.lastHurt = this.simTime;
    audio.play('hurt');
    if (k.hp <= 0) {
      k.hp = 0;
      k.dead = true;
      k.respawnT = KING.respawn;
      this.joy = null;
      // drop a quarter of carried coins where he fell: go back and grab them!
      const lost = Math.floor(this.coins * 0.25);
      if (lost > 0) { this.coins -= lost; this.dropCoins(k.x, k.y, lost); }
      this.burst(k.x, k.y - 20, '#b8262e', 20, 200);
      this.banner = { text: 'The King has fallen!', sub: `Back in ${KING.respawn} seconds${lost ? `. Dropped ${lost} coins` : ''}`, t: 0 };
      audio.play('lose');
    }
  }

  // ------------------------------------------------------------ building
  spotCost(sp) {
    if (sp.kind === 'tower') return TOWER.levels[sp.level]?.cost ?? null;
    if (sp.kind === 'wall') {
      if (sp.level >= BARRICADE.levels.length) return sp.hp < sp.maxHp ? 15 : null;
      return BARRICADE.levels[sp.level].cost;
    }
    if (sp.kind === 'repair') return this.keepHp < this.keepMax ? ARMORY.repair.cost : null;
    return ARMORY[sp.kind].costs[this.up[sp.kind]] ?? null;
  }

  spotLevel(sp) { return ARMORY[sp.kind] && sp.kind !== 'repair' ? this.up[sp.kind] : sp.level; }

  spotAt(x, y) {
    let best = null, bd = 36 * 36;
    for (const sp of this.spots) {
      const d = dist2(x, y, sp.x, sp.y);
      if (d < bd) { bd = d; best = sp; }
    }
    return best;
  }

  updateSpots(dt) {
    const k = this.king;
    const sp = k.dead ? null : this.spotAt(k.x, k.y);
    if (sp !== this.onSpot) { if (this.onSpot) this.onSpot.dwell = 0; this.onSpot = sp; }
    if (!sp) return;
    sp.dwell += dt;
    const cost = this.spotCost(sp);
    if (cost === null || sp.dwell < PAY_DELAY || this.coins <= 0) return;
    // bigger purchases pay faster so nothing takes more than ~1.5s
    sp.acc += Math.max(PAY_RATE, cost / 1.5) * dt;
    let paidNow = 0;
    while (sp.acc >= 1 && this.coins > 0 && sp.paid < cost) {
      sp.acc -= 1; sp.paid++; this.coins--; paidNow++;
    }
    if (paidNow) {
      audio.play('pay');
      if (Math.random() < 0.6) this.particle({ kind: 'coinfly', x: k.x, y: k.y - 30, vx: (sp.x - k.x) * 3, vy: (sp.y - 30 - k.y) * 3 - 120, g: 500, life: 0.35, size: 6, color: '#ffd24a' });
    }
    if (sp.paid >= cost) this.completeSpot(sp);
  }

  completeSpot(sp) {
    sp.paid = 0;
    sp.acc = 0;
    sp.dwell = -0.5; // short pause before the next level starts filling
    let msg;
    if (sp.kind === 'tower') {
      sp.level++;
      msg = sp.level === 1 ? 'Watch Tower built!' : `Tower level ${sp.level}!`;
      this.burst(sp.x, sp.y - 40, '#ffd23f', 16, 180);
    } else if (sp.kind === 'wall') {
      if (sp.level < BARRICADE.levels.length) { sp.level++; msg = sp.level === 1 ? 'Barricade up!' : `Barricade level ${sp.level}!`; }
      else msg = 'Barricade repaired!';
      sp.maxHp = BARRICADE.levels[sp.level - 1].hp;
      sp.hp = sp.maxHp;
      this.burst(sp.x, sp.y - 20, '#cbb994', 16, 160);
    } else if (sp.kind === 'repair') {
      this.keepHp = Math.min(this.keepMax, this.keepHp + ARMORY.repair.amount);
      msg = `Keep +${ARMORY.repair.amount}`;
      this.burst(360, this.townTop + 60, '#8fe07a', 16, 160);
    } else {
      this.up[sp.kind]++;
      msg = `${ARMORY[sp.kind].name} ${this.up[sp.kind]}: ${ARMORY[sp.kind].desc}`;
      this.burst(sp.x, sp.y - 20, '#ffd23f', 16, 180);
    }
    this.addText(sp.x, sp.y - 70, msg, '#ffe9a8', 22);
    audio.play('build');
  }

  damageWall(sp, dmg) {
    if (sp.level <= 0) return;
    sp.hp -= dmg;
    sp.hit = 1;
    audio.play('wall');
    for (let i = 0; i < 2; i++) this.particle({ x: sp.x + rand(-20, 20), y: sp.y - 15, vx: rand(-60, 60), vy: rand(-140, -60), g: 500, life: 0.4, size: 4, color: '#8a5a32' });
    if (sp.hp <= 0) {
      sp.level = 0; sp.hp = 0; sp.maxHp = 0; sp.paid = 0;
      this.burst(sp.x, sp.y - 15, '#8a5a32', 22, 220);
      this.addText(sp.x, sp.y - 50, 'Barricade broken!', '#ff9a7a', 22);
      this.shake = Math.max(this.shake, 6);
      audio.play('smash');
    }
  }

  // ------------------------------------------------------------ enemies
  spawn(type, pathIdx, opt = {}) {
    const d = ENEMIES[type];
    const hpMul = (this.stage.hpMul || 1) * (1 + this.stage.hpGrowth * (this.wave - 1));
    let path = pathIdx;
    if (path === undefined || path >= this.paths.length) path = this.pathTurn++ % this.paths.length;
    const P = this.paths[path];
    const maxHp = Math.round(d.hp * hpMul);
    const e = {
      ...d, type, maxHp, hp: maxHp, path, d: opt.d || 0, x: 0, y: 0, alt: 0, tgt: null,
      state: 'walk', phase: Math.random() * TAU, jit: rand(-1, 1) * (d.boss ? 30 : 85), lane: d.boss ? 0 : rand(-13, 13),
      slowT: 0, slowF: 0, stunT: 0, hasteT: 0, flash: 0, swing: 0, atkT: 0.4,
      cryT: 5, healT: d.healEvery || 0, sumT: d.summon ? d.summon.every * 0.6 : 0, dead: false,
    };
    if (d.flying) {
      const s = P.at(0);
      e.fx0 = s.x + rand(-30, 30);
      e.fy0 = s.y;
      e.fx1 = rand(290, 430);
      e.fy1 = this.townTop + 6;
      e.dEnd = Math.hypot(e.fx1 - e.fx0, e.fy1 - e.fy0);
      e.alt = 30;
    } else {
      e.dEnd = P.length - (d.ranged || d.r + 8);
    }
    this.placeEnemy(e);
    this.enemies.push(e);
    if (!this.seen.has(type)) {
      this.seen.add(type);
      if (this.stage.intro?.includes(type)) this.banner = { text: d.boss ? d.name : `New foe: ${d.name}`, sub: d.tip, t: 0, long: true };
      else if (d.boss) this.banner = { text: d.name, sub: 'Boss incoming!', t: 0 };
    }
    if (d.boss && !opt.summoned) { audio.play('roar'); this.shake = Math.max(this.shake, 8); }
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
    e.x = p.x - p.dy * e.lane * (1 - t) + e.jit * t;
    e.y = p.y + p.dx * e.lane * (1 - t);
  }

  progress(e) {
    const len = e.flying ? e.dEnd : this.paths[e.path].length;
    return e.d / (len || 1) + (e.state === 'attack' ? 1 : 0);
  }

  // Standing barricade ahead of this enemy on its road: { spot, d, stopD }.
  blockerFor(e) {
    if (e.flying) return null;
    let best = null;
    for (const sp of this.spots) {
      if (sp.kind !== 'wall' || sp.level <= 0) continue;
      for (const b of sp.blocks) {
        if (b.path !== e.path || b.d < e.d - 2) continue;
        const stopD = Math.max(0, b.d - (e.ranged ? 150 : e.r + 12));
        if (!best || b.d < best.d) best = { spot: sp, d: b.d, stopD };
      }
    }
    return best;
  }

  // Most advanced enemy in range (towers use this).
  findTarget(x, y, range) {
    const r2 = range * range;
    let best = null, bp = -1;
    for (const e of this.enemies) {
      if (e.dead || dist2(x, y, e.x, aimY(e)) > r2) continue;
      const prog = this.progress(e);
      if (prog > bp) { bp = prog; best = e; }
    }
    return best;
  }

  updateEnemies(dt) {
    const k = this.king;
    for (const e of this.enemies.slice()) {
      if (e.dead) continue;
      e.flash = Math.max(0, e.flash - dt * 6);
      e.swing = Math.max(0, e.swing - dt * 4);
      if (e.slowT > 0) e.slowT -= dt;
      if (e.hasteT > 0) e.hasteT -= dt;
      if (e.stunT > 0) { e.stunT -= dt; continue; }
      if (e.cry) this.warCry(e, dt);
      if (e.heal) this.shamanHeal(e, dt);
      if (e.summon) this.summon(e, dt);
      const haste = e.hasteT > 0 ? 1.35 : 1;

      // pick what to fight: the King if he's close, else a barricade, else the Keep
      let tgt = null;
      if (!k.dead) {
        const kd = dist2(e.x, e.y, k.x, k.y);
        const reach = e.r + KING.r + 8;
        if (kd < reach * reach) tgt = 'king';
        else if (e.ranged && kd < 200 * 200) tgt = 'king';
      }
      let limit = e.dEnd;
      if (!tgt) {
        const blk = this.blockerFor(e);
        if (blk && blk.stopD < limit) limit = blk.stopD;
        if (e.d >= limit - 0.5) tgt = blk && blk.stopD <= e.dEnd ? blk.spot : 'keep';
      }
      if (!tgt) {
        e.state = 'walk';
        e.tgt = null;
        const spd = e.speed * (e.slowT > 0 ? 1 - e.slowF : 1) * haste;
        e.d = Math.min(limit, e.d + spd * dt);
        e.phase += dt * spd * 0.16;
        this.placeEnemy(e);
        e.atkT = Math.min(e.atkT, 0.5);
        continue;
      }
      e.state = 'attack';
      e.tgt = tgt;
      e.atkT -= dt * haste;
      if (e.atkT > 0) continue;
      e.atkT = e.hitEvery;
      e.swing = 1;
      if (tgt === 'king') {
        if (e.ranged) this.enemyShot(e, k.x, k.y - 18, 'king');
        else this.hitKing(e.hit * KING.kingHit);
      } else if (tgt === 'keep') {
        if (e.ranged) this.enemyShot(e, e.x + rand(-30, 30), this.townTop + 30, 'keep');
        else this.hitKeep(e.hit, e.x);
      } else {
        if (e.ranged) this.enemyShot(e, tgt.x + rand(-15, 15), tgt.y - 18, 'wall', tgt);
        else this.damageWall(tgt, e.hit);
      }
    }
    this.enemies = this.enemies.filter((e) => !e.dead);
  }

  enemyShot(e, tx, ty, kind, spot) {
    this.projectiles.push({
      kind: 'ebolt', x: e.x, y: e.y - e.r, tx, ty, speed: kind === 'king' ? 430 : 600, dmg: e.hit,
      hitKind: kind, spot, angle: Math.atan2(ty - e.y, tx - e.x),
    });
    audio.play('ebolt');
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
      for (let i = 0; i < 3; i++) this.particle({ x: o.x + rand(-10, 10), y: aimY(o) + rand(-6, 6), vy: -60, life: 0.6, size: 4, color: '#7dff9a' });
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
    for (let i = 0; i < e.summon.n; i++) {
      const s = this.spawn(e.summon.type, e.path, { d: Math.max(0, e.d - 30 - i * 20), summoned: true });
      this.burst(s.x, s.y - 10, '#7dff6a', 8, 120);
    }
    this.effects.push({ kind: 'ring', x: e.x, y: e.y - e.r * 0.5, r: 90, t: 0, dur: 0.5, color: '#8aff7a' });
    audio.play('summon');
  }

  hitKeep(dmg, x) {
    if (this.phase === 'end') return;
    this.keepHp = Math.max(0, this.keepHp - dmg);
    this.keepFlash = 1;
    audio.play('wall');
    for (let i = 0; i < 3; i++) {
      this.particle({ x: x + rand(-14, 14), y: this.townTop + 10, vx: rand(-60, 60), vy: rand(-120, -40), g: 400, life: 0.45, size: rand(3, 5), color: '#b3a998' });
    }
    if (dmg >= 25) this.shake = Math.max(this.shake, dmg >= 60 ? 10 : 4);
    if (this.keepHp <= 0) this.endBattle(false);
  }

  // ------------------------------------------------------------ towers
  updateTowers(dt) {
    for (const t of this.spots) {
      if (t.kind !== 'tower' || t.level <= 0) continue;
      const L = TOWER.levels[t.level - 1];
      t.anim = Math.max(0, t.anim - dt * 4);
      t.atk -= dt;
      if (t.atk > 0) continue;
      const tg = this.findTarget(t.x, t.y - 40, L.range);
      if (!tg) { t.atk = 0; continue; }
      t.atk = 1 / L.rate;
      t.anim = 1;
      this.fire({ kind: 'arrow', x: t.x, y: t.y - 70, target: tg, speed: 900, dmg: L.dmg });
      audio.play('bow');
    }
  }

  // ------------------------------------------------------------ projectiles
  fire(p) {
    p.tx = p.target.x;
    p.ty = aimY(p.target);
    p.angle = Math.atan2(p.ty - p.y, p.tx - p.x);
    this.projectiles.push(p);
  }

  updateProjectiles(dt) {
    for (const p of this.projectiles) {
      if (p.target && !p.target.dead) { p.tx = p.target.x; p.ty = aimY(p.target); }
      const dx = p.tx - p.x, dy = p.ty - p.y;
      const d = Math.hypot(dx, dy);
      const step = p.speed * dt;
      if (d <= step) {
        p.x = p.tx; p.y = p.ty;
        this.impact(p);
        p.done = true;
        continue;
      }
      p.x += (dx / d) * step;
      p.y += (dy / d) * step;
      p.angle = Math.atan2(dy, dx);
    }
    this.projectiles = this.projectiles.filter((p) => !p.done);
  }

  impact(p) {
    if (p.kind === 'ebolt') {
      if (p.hitKind === 'king') {
        const k = this.king;
        // bolts fly to where the King WAS: keep moving and they miss
        if (!k.dead && dist2(k.x, k.y - 18, p.tx, p.ty) < 26 * 26) this.hitKing(p.dmg * KING.kingHit);
        else this.burst(p.tx, p.ty, '#b8a48a', 3, 60);
      } else if (p.hitKind === 'keep') this.hitKeep(p.dmg, p.tx);
      else if (p.spot && p.spot.level > 0) this.damageWall(p.spot, p.dmg);
      return;
    }
    if (p.target && !p.target.dead) {
      this.damage(p.target, p.dmg);
      this.burst(p.tx, p.ty, p.royal ? '#ffe9a8' : '#fff2c8', 3, 70, 0);
      audio.play('hit');
    }
  }

  damage(e, amt) {
    if (e.dead) return;
    e.hp -= amt * (1 - e.armor);
    e.flash = 1;
    if (e.hp <= 0) this.kill(e);
  }

  kill(e) {
    e.dead = true;
    this.kills++;
    this.dropCoins(e.x, e.y, e.coins);
    this.burst(e.x, aimY(e), e.color, e.boss ? 40 : 10, e.boss ? 260 : 140);
    this.burst(e.x, aimY(e), '#f4efe6', e.boss ? 20 : 5, 90, 0);
    audio.play('coin');
    if (e.boss) { this.shake = 16; audio.play('boom'); }
  }

  // ------------------------------------------------------------ coins
  dropCoins(x, y, total) {
    const piece = total >= 40 ? 10 : 5;
    while (total > 0) {
      const v = Math.min(piece, total);
      total -= v;
      const a = rand(0, TAU), s = rand(20, 70);
      this.drops.push({
        x: clamp(x, 20, view.W - 20), y: clamp(y, this.fieldTop + 10, this.townBottom - 10),
        vx: Math.cos(a) * s, vy: Math.sin(a) * s * 0.6, z: 0, vz: rand(140, 220),
        value: v, life: COIN_LIFE, phase: rand(0, TAU), pull: false,
      });
    }
  }

  updateDrops(dt) {
    const k = this.king;
    for (const c of this.drops) {
      c.life -= dt;
      if (c.z > 0 || c.vz > 0) {
        c.vz -= 700 * dt;
        c.z = Math.max(0, c.z + c.vz * dt);
        c.x += c.vx * dt; c.y += c.vy * dt;
        if (c.z === 0) c.vz = 0;
      }
      if (k.dead) continue;
      const d2 = dist2(c.x, c.y, k.x, k.y);
      if (c.pull || d2 < KING.magnet * KING.magnet) {
        c.pull = true;
        const d = Math.sqrt(d2) || 1;
        const sp = Math.min(d, 650 * dt);
        c.x += ((k.x - c.x) / d) * sp;
        c.y += ((k.y - c.y) / d) * sp;
        if (d < 18) {
          c.taken = true;
          this.coins += c.value;
          this.addText(k.x + rand(-10, 10), k.y - 50, `+${c.value}`, '#ffd34d', 18);
          audio.play('pickup');
        }
      }
    }
    this.drops = this.drops.filter((c) => !c.taken && c.life > 0);
  }

  // ------------------------------------------------------------ fx
  updateEffects(dt) {
    for (const f of this.effects) { f.t += dt; if (f.t >= f.dur) f.done = true; }
    this.effects = this.effects.filter((f) => !f.done);
  }

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
    this.texts.push({ x: clamp(x, 80, view.W - 80), y, str, color, size, life: 1.0, max: 1.0 });
  }

  updateFx(dt) {
    for (const p of this.particles) {
      p.life -= dt;
      const kk = 1 - p.drag * dt;
      p.vx *= kk;
      p.vy = p.vy * kk + p.g * dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
    }
    this.particles = this.particles.filter((p) => p.life > 0);
    if (this.particles.length > 600) this.particles.splice(0, this.particles.length - 600);
    for (const t of this.texts) { t.life -= dt; t.y -= 40 * dt; }
    this.texts = this.texts.filter((t) => t.life > 0);
    this.shake = Math.max(0, this.shake - dt * 30);
    this.keepFlash = Math.max(0, this.keepFlash - dt * 3);
    for (const sp of this.spots) if (sp.hit) sp.hit = Math.max(0, sp.hit - dt * 5);
  }

  // ------------------------------------------------------------ input
  addHit(r, fn) { this.hits.push({ r, fn }); }

  pointerDown(x, y, id = 0) {
    for (let i = this.hits.length - 1; i >= 0; i--) {
      const h = this.hits[i];
      if (inRect(x, y, h.r)) { h.fn(x, y); return; }
    }
    if (this.phase === 'end' || this.paused || this.king.dead) return;
    this.joy = { id, ox: x, oy: y, x, y };
  }

  pointerMove(x, y, id = 0) {
    const j = this.joy;
    if (!j || j.id !== id) return;
    j.x = x; j.y = y;
    // floating stick: drag the base along if the finger goes far
    const vx = x - j.ox, vy = y - j.oy, len = Math.hypot(vx, vy);
    if (len > 70) { j.ox = x - (vx / len) * 70; j.oy = y - (vy / len) * 70; }
  }

  pointerUp(id = 0) { if (this.joy && this.joy.id === id) this.joy = null; }

  keyDown(k) { this.keys.add(k); }
  keyUp(k) { this.keys.delete(k); }

  // ------------------------------------------------------------ render
  render(ctx) {
    const { W } = view;
    const t = this.time;
    const k = this.king;
    this.hits = [];

    ctx.save();
    if (this.shake > 0) ctx.translate(rand(-1, 1) * this.shake, rand(-1, 1) * this.shake);
    ctx.drawImage(this.bg, 0, 0, W, view.H);

    // town: Keep + armory
    drawKeep(ctx, 360, this.townTop, t, this.keepFlash);
    for (const sp of this.spots) {
      if (!ARMORY[sp.kind]) continue;
      const max = sp.kind === 'repair' ? 0 : ARMORY[sp.kind].costs.length;
      drawArmorySpot(ctx, sp.kind, sp.x, sp.y, this.spotLevel(sp), max, this.onSpot === sp);
      text(ctx, ARMORY[sp.kind].name, sp.x, sp.y + 40, { size: 15, color: '#fff3d6', lw: 4 });
    }

    // empty spots
    for (const sp of this.spots) {
      if (sp.level > 0) continue;
      if (sp.kind === 'tower') drawPad(ctx, sp.x, sp.y, this.onSpot === sp);
      else if (sp.kind === 'wall') drawBarricade(ctx, sp, t, true);
    }
    for (const c of this.drops) drawCoin(ctx, c, t);

    for (const f of this.effects) {
      if (f.kind !== 'ring' || !f.flat) continue;
      const kk = f.t / f.dur;
      ctx.globalAlpha = 0.5 * (1 - kk);
      ctx.fillStyle = f.color;
      ctx.beginPath(); ctx.ellipse(f.x, f.y, f.r * (0.3 + 0.7 * kk), f.r * (0.3 + 0.7 * kk) * 0.8, 0, 0, TAU); ctx.fill();
      ctx.globalAlpha = 1;
    }

    // depth-sorted world: towers, barricades, ground enemies, the King
    const list = [];
    for (const sp of this.spots) {
      if (sp.level <= 0) continue;
      if (sp.kind === 'tower') list.push({ y: sp.y, draw: () => drawTower(ctx, sp, t) });
      else if (sp.kind === 'wall') list.push({ y: sp.y, draw: () => this.drawWallSpot(ctx, sp) });
    }
    for (const e of this.enemies) if (!e.flying) list.push({ y: e.y, draw: () => drawEnemy(ctx, e, t) });
    if (!k.dead) list.push({ y: k.y, draw: () => drawKing(ctx, k, t) });
    list.sort((a, b) => a.y - b.y);
    for (const d of list) d.draw();
    for (const e of this.enemies) if (e.flying) drawEnemy(ctx, e, t);

    for (const p of this.projectiles) this.drawProjectile(ctx, p);

    for (const p of this.particles) {
      const a = clamp(p.life / p.max, 0, 1);
      ctx.globalAlpha = a;
      if (p.kind === 'coinfly') drawCoinIcon(ctx, p.x, p.y, 6);
      else {
        ctx.fillStyle = p.color;
        ctx.beginPath(); ctx.arc(p.x, p.y, p.size * (0.5 + 0.5 * a), 0, TAU); ctx.fill();
      }
    }
    ctx.globalAlpha = 1;

    for (const f of this.effects) {
      if (f.kind !== 'ring' || f.flat) continue;
      const kk = f.t / f.dur;
      ctx.globalAlpha = 1 - kk;
      ctx.lineWidth = 6 * (1 - kk) + 1; ctx.strokeStyle = f.color;
      ctx.beginPath(); ctx.ellipse(f.x, f.y, f.r * (0.4 + 0.6 * kk), f.r * (0.4 + 0.6 * kk) * 0.75, 0, 0, TAU); ctx.stroke();
      ctx.globalAlpha = 1;
    }

    // price tags: always for empty spots and the armory, upgrades only when the King is near
    for (const sp of this.spots) {
      const cost = this.spotCost(sp);
      if (cost === null) continue;
      const near = !k.dead && dist2(k.x, k.y, sp.x, sp.y) < 170 * 170;
      const show = sp.level === 0 || ARMORY[sp.kind] || near || sp.paid > 0;
      if (!show) continue;
      const by = sp.kind === 'tower' ? sp.y - (sp.level ? 128 : 44) : sp.kind === 'wall' ? sp.y - 62 : sp.y - 46;
      drawCostBubble(ctx, sp.x, by, cost, sp.paid, this.coins >= cost - sp.paid);
    }

    // King HP + respawn timer
    if (!k.dead && k.hp < k.maxHp) this.bar(ctx, k.x, k.y - 74, 46, 7, k.hp / k.maxHp, '#7be36a');
    if (k.dead) text(ctx, `King returns in ${Math.ceil(k.respawnT)}`, 360, this.townTop - 34, { size: 22, color: '#ffe9a8', lw: 5 });
    // Keep HP
    const kf = this.keepHp / this.keepMax;
    this.bar(ctx, 360, this.townTop - 8, 200, 14, kf, kf > 0.5 ? '#7be36a' : kf > 0.25 ? '#ffc94a' : '#ff6a50');
    text(ctx, `Keep ${Math.ceil(this.keepHp)}`, 360, this.townTop - 7, { size: 13, color: '#fff', lw: 3 });

    for (const tx of this.texts) {
      ctx.globalAlpha = clamp((tx.life / tx.max) * 1.5, 0, 1);
      text(ctx, tx.str, tx.x, tx.y, { size: tx.size, color: tx.color, lw: 5 });
    }
    ctx.globalAlpha = 1;
    ctx.restore();

    // joystick
    if (this.joy) {
      const j = this.joy;
      ctx.globalAlpha = 0.35;
      ctx.beginPath(); ctx.arc(j.ox, j.oy, 70, 0, TAU); ctx.fillStyle = '#1a100b'; ctx.fill();
      ctx.lineWidth = 3; ctx.strokeStyle = '#fff3d6'; ctx.stroke();
      ctx.globalAlpha = 0.8;
      ctx.beginPath(); ctx.arc(j.x, j.y, 30, 0, TAU); ctx.fillStyle = '#fff3d6'; ctx.fill();
      ctx.globalAlpha = 1;
    }

    // ---------------- UI
    this.drawHud(ctx);
    this.drawWaveButton(ctx);
    this.drawHints(ctx);
    this.drawBanner(ctx);
    if (this.paused && this.phase !== 'end') this.drawPause(ctx);
    if (this.result && this.result.t > 0.8) this.drawResult(ctx);
  }

  drawWallSpot(ctx, sp) {
    drawBarricade(ctx, sp, this.time);
    if (sp.hp < sp.maxHp) this.bar(ctx, sp.x, sp.y - 50, 60, 7, sp.hp / sp.maxHp, '#e8b04a');
  }

  bar(ctx, cx, cy, w, h, frac, color) {
    ctx.fillStyle = 'rgba(20,10,5,0.85)';
    ctx.fillRect(cx - w / 2 - 2, cy - h / 2 - 2, w + 4, h + 4);
    ctx.fillStyle = color;
    ctx.fillRect(cx - w / 2, cy - h / 2, w * clamp(frac, 0, 1), h);
  }

  drawProjectile(ctx, p) {
    const c = Math.cos(p.angle), s = Math.sin(p.angle);
    const len = p.kind === 'ebolt' ? 14 : 18;
    ctx.lineCap = 'round';
    ctx.strokeStyle = p.kind === 'ebolt' ? '#2a1a10' : '#4a3220'; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.moveTo(p.x - c * len, p.y - s * len); ctx.lineTo(p.x, p.y); ctx.stroke();
    ctx.strokeStyle = p.royal ? '#ffd23f' : '#e8e8e8'; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.moveTo(p.x - c * 4, p.y - s * 4); ctx.lineTo(p.x + c * 2, p.y + s * 2); ctx.stroke();
    if (p.kind === 'arrow') {
      ctx.strokeStyle = p.royal ? '#2f5fb0' : '#d23b3b'; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.moveTo(p.x - c * 18, p.y - s * 18); ctx.lineTo(p.x - c * 13, p.y - s * 13); ctx.stroke();
    } else if (p.hitKind === 'king') {
      // warning marker where the bolt will land
      ctx.globalAlpha = 0.6;
      ctx.strokeStyle = '#ff5a3a'; ctx.lineWidth = 2.5;
      ctx.beginPath(); ctx.ellipse(p.tx, p.ty + 18, 16, 7, 0, 0, TAU); ctx.stroke();
      ctx.globalAlpha = 1;
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
      : this.phase === 'prep' ? `Stage ${this.stage.id}` : 'Build time';
    text(ctx, sub, 30, cy + 15, { size: 16, align: 'left', color: '#d9c3a0', weight: 700 });

    roundRect(ctx, 240, cy - 30, 190, 60, 18);
    ctx.fillStyle = '#3a281d'; ctx.fill(); ctx.lineWidth = 3; ctx.strokeStyle = '#120b07'; ctx.stroke();
    drawCoinIcon(ctx, 272, cy, 16);
    text(ctx, `${this.coins}`, 298, cy + 1, { size: 30, align: 'left', color: '#ffd34d', lw: 5 });

    const sb = { x: W - 168, y: cy - 30, w: 74, h: 60 };
    button(ctx, sb, `${this.speed}×`, { color: this.speed > 1 ? 'green' : 'wood', size: 28 });
    this.addHit(sb, () => { this.speed = this.speed === 1 ? 2 : 1; audio.play('click'); });
    const pb = { x: W - 84, y: cy - 30, w: 70, h: 60 };
    button(ctx, pb, 'II', { color: 'wood', size: 26 });
    this.addHit(pb, () => { if (this.phase !== 'end') { this.paused = true; this.joy = null; audio.play('click'); } });
  }

  drawWaveButton(ctx) {
    if (this.phase !== 'prep' && this.phase !== 'inter') return;
    const { W } = view;
    const r = { x: W / 2 - 175, y: this.fieldTop + 16, w: 350, h: 80 };
    const pulse = 1 + 0.03 * Math.sin(this.time * 6);
    ctx.save();
    ctx.translate(W / 2, r.y + r.h / 2); ctx.scale(pulse, pulse); ctx.translate(-W / 2, -(r.y + r.h / 2));
    if (this.phase === 'prep') {
      button(ctx, r, this.endless ? 'Start Siege' : 'Start Battle', {
        color: 'green', size: 32, sub: this.endless ? 'How long can you hold?' : `${this.totalWaves} waves to survive`,
      });
    } else {
      const s = Math.ceil(this.interT);
      button(ctx, r, `Next Wave in ${s}`, { color: 'green', size: 30, sub: `Tap to call early: +${Math.ceil(this.interT / 2)} coins` });
    }
    ctx.restore();
    this.addHit(r, () => this.callWave());
  }

  drawHints(ctx) {
    if (this.phase !== 'prep') return;
    const { W } = view;
    const built = this.spots.some((s) => s.level > 0);
    const msgs = built
      ? ['Coins drop where foes fall. Walk over them!', 'Tap Start when you’re ready']
      : ['Drag anywhere to move the King', 'Stand on a spot to build it with coins'];
    msgs.forEach((msg, i) => {
      const y = this.fieldTop + 128 + i * 50;
      ctx.font = '700 20px system-ui';
      const w = Math.min(W - 40, ctx.measureText(msg).width + 50);
      roundRect(ctx, W / 2 - w / 2, y - 21, w, 42, 21);
      ctx.fillStyle = 'rgba(20,12,8,0.8)'; ctx.fill();
      text(ctx, msg, W / 2, y + 1, { size: 20, color: '#ffe9a8', weight: 700 });
    });
  }

  drawBanner(ctx) {
    if (!this.banner || this.phase === 'end') return;
    const { W } = view;
    const b = this.banner;
    const end = b.long ? 3.1 : 1.9;
    const a = b.t < 0.25 ? b.t / 0.25 : b.t > end ? Math.max(0, 1 - (b.t - end) / 0.5) : 1;
    const s = b.t < 0.25 ? 0.7 + 0.3 * (b.t / 0.25) : 1;
    const y = this.fieldTop + (this.townTop - this.fieldTop) * 0.38;
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
    const w = 580, h = 520 + extra, x = W / 2 - w / 2, y = H / 2 - h / 2 + (1 - k) * 80;
    ctx.globalAlpha = k;
    panel(ctx, x, y, w, h);
    let lines;
    if (this.endless) {
      text(ctx, 'Siege Broken', W / 2, y + 70, { size: 56, color: '#ff9a5a', lw: 8 });
      text(ctx, `${r.reached}`, W / 2, y + 160, { size: 84, color: '#ffd34d', lw: 9 });
      text(ctx, r.reached === 1 ? 'wave survived' : 'waves survived', W / 2, y + 214, { size: 22, color: '#fff3d6', weight: 700 });
      lines = [r.newBest ? 'New personal best!' : `Best: ${save.data.endlessBest} waves`, `Foes defeated: ${this.kills}`];
    } else {
      text(ctx, r.win ? 'Victory!' : 'The Keep Fell', W / 2, y + 70, { size: 58, color: r.win ? '#ffd34d' : '#ff7a5a', lw: 8 });
      for (let i = 0; i < 3; i++) {
        const appear = clamp((r.t - 1.2 - i * 0.25) / 0.2, 0, 1);
        const filled = r.win && i < r.stars && appear > 0;
        const sz = 46 * (filled ? 0.6 + 0.4 * appear + (appear < 1 ? 0.3 * Math.sin(appear * Math.PI) : 0) : 1);
        star(ctx, W / 2 + (i - 1) * 110, y + 170 - (i === 1 ? 14 : 0), sz, filled);
      }
      lines = [
        `Keep held: ${Math.round(r.frac * 100)}%`,
        `Waves survived: ${r.win ? this.totalWaves : Math.max(0, this.wave - 1)} / ${this.totalWaves}`,
        `Foes defeated: ${this.kills}`,
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
