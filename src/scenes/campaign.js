import { view } from '../view.js';
import { STAGES, ENDLESS } from '../data/stages.js';
import { ENEMIES, HEROES } from '../data/units.js';
import { button, text, star, panel, roundRect, wrapText } from '../ui.js';
import { drawEnemy, drawPortrait } from '../art.js';
import { inRect, rng, TAU } from '../util.js';
import { audio } from '../audio.js';
import { save } from '../save.js';
import { stageUnlocked, endlessUnlocked, unlockedHeroes, heroUnlocked, totalStars } from '../progress.js';

const ENDLESS_NODE = [150, 0.1];

export class Campaign {
  // sel: stage index or 'endless'
  constructor(game, sel) {
    this.game = game;
    this.t = 0;
    this.hits = [];
    this.tip = null;
    if (sel === undefined) {
      sel = STAGES.findIndex((s, i) => stageUnlocked(i) && !(save.data.best[s.id] > 0));
      if (sel < 0) sel = STAGES.length - 1;
    }
    this.sel = sel;
    this.resize();
  }

  resize() {
    const { W, H, safeTop, safeBottom } = view;
    this.panelH = 470 + safeBottom;
    this.mapTop = safeTop + 110;
    this.mapBot = H - this.panelH - 10;
    this.bg = this.renderMap(W, H);
  }

  nodePos([x, f]) { return { x, y: this.mapTop + f * (this.mapBot - this.mapTop) }; }

  renderMap(W, H) {
    const c = document.createElement('canvas');
    c.width = Math.round(W * view.scale * view.dpr);
    c.height = Math.round(H * view.scale * view.dpr);
    const ctx = c.getContext('2d');
    ctx.setTransform(view.scale * view.dpr, 0, 0, view.scale * view.dpr, 0, 0);
    const R = rng(77);
    const g = ctx.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, '#d9c49a'); g.addColorStop(1, '#c4a774');
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    for (let i = 0; i < 120; i++) {
      ctx.fillStyle = `rgba(${R() < 0.5 ? '120,90,50' : '255,245,220'},0.06)`;
      ctx.beginPath(); ctx.arc(R() * W, R() * H, 20 + R() * 80, 0, TAU); ctx.fill();
    }
    const top = this.mapTop, bot = this.mapBot;
    // river
    ctx.strokeStyle = '#7fa8b8'; ctx.lineWidth = 18; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(W + 20, top + (bot - top) * 0.3);
    ctx.bezierCurveTo(500, top + (bot - top) * 0.45, 260, top + (bot - top) * 0.5, -20, top + (bot - top) * 0.7);
    ctx.stroke();
    ctx.strokeStyle = 'rgba(255,255,255,0.35)'; ctx.lineWidth = 4; ctx.stroke();
    // mountains at the top
    for (let i = 0; i < 9; i++) {
      const mx = 40 + i * 85 + R() * 30, my = top + 30 + R() * 30, s = 40 + R() * 30;
      ctx.fillStyle = '#8a7a66';
      ctx.beginPath(); ctx.moveTo(mx - s, my + s * 0.6); ctx.lineTo(mx, my - s * 0.6); ctx.lineTo(mx + s, my + s * 0.6); ctx.closePath(); ctx.fill();
      ctx.fillStyle = '#efe6d4';
      ctx.beginPath(); ctx.moveTo(mx - s * 0.3, my - s * 0.15); ctx.lineTo(mx, my - s * 0.6); ctx.lineTo(mx + s * 0.3, my - s * 0.15); ctx.closePath(); ctx.fill();
    }
    // trees
    const nodes = STAGES.map((s) => this.nodePos(s.node)).concat([this.nodePos(ENDLESS_NODE)]);
    for (let i = 0; i < 70; i++) {
      const x = R() * W, y = top + 90 + R() * (bot - top - 90);
      if (nodes.some((n) => Math.hypot(n.x - x, n.y - y) < 70)) continue;
      ctx.fillStyle = 'rgba(40,30,20,0.2)';
      ctx.beginPath(); ctx.ellipse(x + 3, y + 10, 12, 5, 0, 0, TAU); ctx.fill();
      ctx.fillStyle = R() < 0.5 ? '#5f7f45' : '#6f8f4f';
      ctx.beginPath(); ctx.arc(x, y, 11 + R() * 5, 0, TAU); ctx.fill();
    }
    // dotted road between stages
    ctx.setLineDash([4, 12]); ctx.lineCap = 'round';
    ctx.strokeStyle = '#6b4a2b'; ctx.lineWidth = 6;
    ctx.beginPath();
    nodes.slice(0, STAGES.length).forEach((n, i) => (i ? ctx.lineTo(n.x, n.y) : ctx.moveTo(n.x, n.y)));
    ctx.stroke();
    ctx.setLineDash([]);
    // frame
    ctx.strokeStyle = '#6b4a2b'; ctx.lineWidth = 8;
    ctx.strokeRect(10, top - 20, W - 20, bot - top + 30);
    return c;
  }

  update(dt) { this.t += dt; }

  addHit(r, fn) { this.hits.push({ r, fn }); }

  render(ctx) {
    const { W, H, safeTop } = view;
    this.hits = [];
    ctx.drawImage(this.bg, 0, 0, W, H);

    // header
    const back = { x: 18, y: safeTop + 22, w: 110, h: 60 };
    button(ctx, back, '‹ Menu', { color: 'wood', size: 22 });
    this.addHit(back, () => { audio.play('click'); this.game.go('menu'); });
    text(ctx, 'Chapter 1', W / 2, safeTop + 38, { size: 18, color: '#5a3a1e', weight: 800 });
    text(ctx, 'The Ashen March', W / 2, safeTop + 68, { size: 32, color: '#fff3d6', lw: 6, stroke: '#4a2a12' });
    star(ctx, W - 106, safeTop + 52, 16, true);
    text(ctx, `${totalStars()}/${STAGES.length * 3}`, W - 84, safeTop + 53, { size: 22, align: 'left', color: '#fff3d6', lw: 5, stroke: '#4a2a12' });

    // nodes
    STAGES.forEach((s, i) => this.drawNode(ctx, i, s, this.nodePos(s.node)));
    this.drawEndlessNode(ctx, this.nodePos(ENDLESS_NODE));

    this.drawPanel(ctx);
  }

  drawNode(ctx, i, s, p) {
    const open = stageUnlocked(i);
    const best = save.data.best[s.id] || 0;
    const selected = this.sel === i;
    const current = open && !best;
    const r = 38;
    if (selected || current) {
      ctx.save();
      ctx.globalAlpha = 0.5 + 0.3 * Math.sin(this.t * 4);
      ctx.beginPath(); ctx.arc(p.x, p.y, r + 12, 0, TAU);
      ctx.fillStyle = selected ? '#ffe36b' : '#fff3d6'; ctx.fill();
      ctx.restore();
    }
    ctx.fillStyle = 'rgba(40,25,10,0.35)';
    ctx.beginPath(); ctx.ellipse(p.x, p.y + r * 0.8, r, r * 0.35, 0, 0, TAU); ctx.fill();
    ctx.beginPath(); ctx.arc(p.x, p.y, r, 0, TAU);
    ctx.fillStyle = !open ? '#7d7266' : best ? '#b8322a' : '#8a4a2a';
    ctx.fill();
    ctx.lineWidth = 5; ctx.strokeStyle = best ? '#ffd34d' : '#3a2412'; ctx.stroke();
    if (open) {
      text(ctx, s.id, p.x, p.y + 2, { size: 24, color: '#fff3d6', lw: 4 });
      for (let k = 0; k < 3; k++) star(ctx, p.x + (k - 1) * 26, p.y + r + 14 - (k === 1 ? 4 : 0), 11, k < best);
    } else {
      // padlock
      ctx.fillStyle = '#3a3430';
      roundRect(ctx, p.x - 13, p.y - 4, 26, 20, 4); ctx.fill();
      ctx.beginPath(); ctx.arc(p.x, p.y - 4, 9, Math.PI, 0); ctx.lineWidth = 5; ctx.strokeStyle = '#3a3430'; ctx.stroke();
    }
    this.addHit({ x: p.x - r - 10, y: p.y - r - 10, w: r * 2 + 20, h: r * 2 + 30 }, () => { this.sel = i; this.tip = null; audio.play('click'); });
  }

  drawEndlessNode(ctx, p) {
    const open = endlessUnlocked();
    const selected = this.sel === 'endless';
    if (selected) {
      ctx.save();
      ctx.globalAlpha = 0.5 + 0.3 * Math.sin(this.t * 4);
      ctx.beginPath(); ctx.arc(p.x, p.y, 52, 0, TAU); ctx.fillStyle = '#ffe36b'; ctx.fill();
      ctx.restore();
    }
    // a little dark tower
    ctx.fillStyle = open ? '#3a2a3a' : '#7d7266';
    ctx.fillRect(p.x - 26, p.y - 34, 52, 64);
    for (let k = 0; k < 3; k++) ctx.fillRect(p.x - 26 + k * 20, p.y - 46, 12, 12);
    ctx.lineWidth = 4; ctx.strokeStyle = '#1e1410'; ctx.strokeRect(p.x - 26, p.y - 34, 52, 64);
    text(ctx, open ? '∞' : '🔒', p.x, p.y, { size: open ? 40 : 26, color: '#ffd34d', lw: 5 });
    text(ctx, 'Endless', p.x, p.y + 50, { size: 18, color: '#fff3d6', lw: 4, stroke: '#4a2a12' });
    this.addHit({ x: p.x - 50, y: p.y - 56, w: 100, h: 120 }, () => { this.sel = 'endless'; this.tip = null; audio.play('click'); });
  }

  drawPanel(ctx) {
    const { W, H } = view;
    const y0 = H - this.panelH;
    panel(ctx, 12, y0, W - 24, this.panelH + 30, { r: 24 });
    const endless = this.sel === 'endless';
    const st = endless ? ENDLESS : STAGES[this.sel];
    const open = endless ? endlessUnlocked() : stageUnlocked(this.sel);

    let y = y0 + 40;
    text(ctx, endless ? 'Endless Siege' : `Stage ${st.id}  ·  ${st.name}`, W / 2, y, { size: 28, color: '#ffd34d', lw: 5 });
    y += 36;
    if (!open) {
      const need = endless ? `Clear stage ${ENDLESS.unlock} to unlock.` : `Clear stage ${STAGES[this.sel - 1].id} to unlock.`;
      text(ctx, need, W / 2, y + 20, { size: 22, color: '#d9c3a0', weight: 700 });
      return;
    }
    const sub = endless ? `${st.desc}  Best: ${save.data.endlessBest || 0} waves.` : `${st.desc}  ${st.waves.length} waves.`;
    const n = wrapText(ctx, sub, W / 2, y, W - 80, 26, { size: 19, color: '#fff3d6', weight: 700 });
    y += n * 26 + 14;

    // foes in this stage
    const types = [];
    const groups = endless ? Object.keys(ENEMIES).map((t) => ({ t })) : st.waves.flat();
    for (const g of groups) if (!types.includes(g.t)) types.push(g.t);
    text(ctx, 'Foes', 44, y + 22, { size: 18, align: 'left', color: '#d9c3a0', weight: 800 });
    const iw = Math.min(64, (W - 160) / types.length);
    types.forEach((t, i) => {
      const d = ENEMIES[t];
      const cx = 120 + i * iw + iw / 2, cy = y + 40;
      const isNew = st.intro?.includes(t);
      if (isNew) {
        ctx.beginPath(); ctx.arc(cx, cy - 16, 28, 0, TAU); ctx.fillStyle = 'rgba(255,220,100,0.25)'; ctx.fill();
      }
      ctx.save();
      ctx.translate(cx, cy);
      const s = Math.min(1, 22 / d.r);
      ctx.scale(s, s);
      drawEnemy(ctx, { type: t, x: 0, y: 0, r: d.r, state: 'attack', stunT: 0, phase: 0, swing: 0, alt: 0, flash: 0, slowT: 0, hp: 1, maxHp: 1 }, this.t);
      ctx.restore();
      if (isNew) text(ctx, 'NEW', cx, cy + 12, { size: 12, color: '#ffe36b', lw: 3 });
      this.addHit({ x: cx - iw / 2, y: cy - 50, w: iw, h: 66 }, () => { this.tip = t; audio.play('click'); });
    });
    y += 72;
    const tipText = this.tip ? `${ENEMIES[this.tip].name}: ${ENEMIES[this.tip].tip}` : 'Tap a foe to learn about it.';
    text(ctx, tipText, W / 2, y, { size: tipText.length > 52 ? 15 : 17, color: this.tip ? '#ffe9a8' : '#a8957a', weight: 700 });
    y += 22;

    // hero lineup
    const heroes = unlockedHeroes();
    const lu = save.data.lineup.filter((id) => heroes.some((h) => h.id === id));
    text(ctx, 'Heroes', 44, y + 40, { size: 18, align: 'left', color: '#d9c3a0', weight: 800 });
    const hs = 92;
    const hx0 = W / 2 - ((HEROES.length - 1) * hs) / 2 + 30;
    HEROES.forEach((h, i) => {
      const cx = hx0 + i * hs, cy = y + 42;
      const unlocked = heroUnlocked(h);
      const pos = lu.indexOf(h.id);
      ctx.save();
      if (!unlocked || pos < 0) ctx.globalAlpha = unlocked ? 0.45 : 0.25;
      drawPortrait(ctx, h.id, cx, cy, 34);
      ctx.restore();
      ctx.beginPath(); ctx.arc(cx, cy, 34, 0, TAU);
      ctx.lineWidth = pos >= 0 ? 5 : 3; ctx.strokeStyle = pos >= 0 ? '#ffd34d' : '#1e140f'; ctx.stroke();
      if (!unlocked) {
        text(ctx, '🔒', cx, cy, { size: 22 });
      } else if (pos >= 0) {
        ctx.beginPath(); ctx.arc(cx + 26, cy - 26, 13, 0, TAU); ctx.fillStyle = '#e8a52a'; ctx.fill();
        text(ctx, ['L', 'C', 'R'][pos], cx + 26, cy - 25, { size: 15, color: '#2a1606' });
      }
      text(ctx, h.name, cx, cy + 48, { size: 15, color: unlocked ? '#fff3d6' : '#8a7a6a', weight: 700 });
      if (unlocked) {
        this.addHit({ x: cx - 40, y: cy - 40, w: 80, h: 96 }, () => {
          const cur = save.data.lineup.filter((id) => heroes.some((hh) => hh.id === id));
          const at = cur.indexOf(h.id);
          if (at >= 0) cur.splice(at, 1);
          else if (cur.length < 3) cur.push(h.id);
          else { audio.play('error'); return; }
          save.data.lineup = cur;
          save.write();
          audio.play('click');
        });
      }
    });
    y += 108;
    if (heroes.length > 3) {
      text(ctx, 'Pick 3. Wall positions: L, C, R in the order you pick.', W / 2, y, { size: 15, color: '#a8957a', weight: 700 });
    }

    const ready = lu.length === 3;
    const b = { x: W / 2 - 180, y: H - view.safeBottom - 96, w: 360, h: 78 };
    const label = endless ? 'Start Siege' : (save.data.best[st.id] ? 'Play Again' : 'Battle!');
    button(ctx, b, ready ? label : 'Pick 3 heroes', { color: 'green', size: 32, disabled: !ready });
    if (ready) this.addHit(b, () => { audio.play('click'); this.game.go('battle', this.sel); });
  }

  pointerDown(x, y) {
    for (let i = this.hits.length - 1; i >= 0; i--) if (inRect(x, y, this.hits[i].r)) { this.hits[i].fn(); return; }
  }
}
