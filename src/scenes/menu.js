import { view } from '../view.js';
import { button, text } from '../ui.js';
import { inRect, rand, TAU } from '../util.js';
import { audio } from '../audio.js';
import { save } from '../save.js';
import { STAGES, ENDLESS } from '../data/stages.js';
import { totalStars, endlessUnlocked } from '../progress.js';

export class Menu {
  constructor(game) {
    this.game = game;
    this.t = 0;
    this.embers = [];
    this.hits = [];
  }

  update(dt) {
    this.t += dt;
    const { W, H } = view;
    if (Math.random() < dt * 30) {
      this.embers.push({ x: rand(0, W), y: H + 10, vx: rand(-15, 15), vy: rand(-90, -40), life: rand(4, 8), size: rand(2, 4.5) });
    }
    for (const e of this.embers) {
      e.life -= dt;
      e.x += (e.vx + Math.sin(this.t * 2 + e.y * 0.02) * 12) * dt;
      e.y += e.vy * dt;
    }
    this.embers = this.embers.filter((e) => e.life > 0 && e.y > -20);
  }

  render(ctx) {
    const { W, H, safeTop, safeBottom } = view;
    this.hits = [];
    const g = ctx.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, '#1d1530');
    g.addColorStop(0.45, '#6a2f3a');
    g.addColorStop(0.7, '#d0673a');
    g.addColorStop(1, '#2a1610');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);
    const sy = H * 0.66;
    const sg = ctx.createRadialGradient(W / 2, sy, 10, W / 2, sy, 260);
    sg.addColorStop(0, 'rgba(255,214,140,0.9)');
    sg.addColorStop(1, 'rgba(255,140,60,0)');
    ctx.fillStyle = sg;
    ctx.fillRect(0, sy - 260, W, 520);
    ctx.fillStyle = '#3a1e22';
    ctx.beginPath();
    ctx.moveTo(0, H * 0.7);
    for (let x = 0; x <= W; x += 40) ctx.lineTo(x, H * 0.7 - Math.sin(x * 0.012) * 30 - Math.sin(x * 0.031) * 14);
    ctx.lineTo(W, H); ctx.lineTo(0, H); ctx.fill();
    // castle silhouette
    const base = H * 0.78;
    ctx.fillStyle = '#160d0b';
    ctx.fillRect(60, base - 90, 600, 90 + H);
    const tower = (x, w, h) => {
      ctx.fillRect(x, base - h, w, h);
      for (let i = 0; i < w; i += 24) ctx.fillRect(x + i, base - h - 16, 14, 16);
    };
    tower(40, 90, 180);
    tower(590, 90, 180);
    tower(270, 180, 280);
    for (let i = 60; i < 660; i += 30) ctx.fillRect(i, base - 106, 18, 16);
    ctx.beginPath(); ctx.moveTo(300, base - 296); ctx.lineTo(360, base - 380); ctx.lineTo(420, base - 296); ctx.fill();
    ctx.fillRect(358, base - 430, 4, 60);
    ctx.fillStyle = '#b8322a';
    ctx.beginPath();
    ctx.moveTo(362, base - 430); ctx.lineTo(410, base - 420 + Math.sin(this.t * 3) * 4); ctx.lineTo(362, base - 404); ctx.fill();
    ctx.fillStyle = `rgba(255,190,90,${0.75 + 0.25 * Math.sin(this.t * 3)})`;
    for (const [wx, wy] of [[80, 130], [630, 130], [330, 220], [390, 220], [360, 160], [150, 60], [560, 60]]) {
      ctx.fillRect(wx - 6, base - wy, 12, 20);
    }
    ctx.fillStyle = '#100907';
    ctx.fillRect(0, base + 20, W, H);
    for (const e of this.embers) {
      ctx.globalAlpha = Math.min(1, e.life / 2);
      ctx.fillStyle = '#ffb347';
      ctx.beginPath(); ctx.arc(e.x, e.y, e.size, 0, TAU); ctx.fill();
    }
    ctx.globalAlpha = 1;

    const ty = safeTop + 150 + Math.sin(this.t * 1.5) * 4;
    text(ctx, 'EMBERHOLD', W / 2, ty, { size: 92, color: '#ffd34d', lw: 12, stroke: '#3a1408' });
    text(ctx, 'Hold the wall. Save the realm.', W / 2, ty + 70, { size: 26, color: '#fff3d6', weight: 700, lw: 5 });

    const by = H - safeBottom - 330;
    const cb = { x: W / 2 - 190, y: by, w: 380, h: 92 };
    button(ctx, cb, 'Campaign', { color: 'green', size: 36, sub: `★ ${totalStars()} / ${STAGES.length * 3}` });
    this.hits.push({ r: cb, fn: () => { audio.play('click'); this.game.go('campaign'); } });

    const open = endlessUnlocked();
    const eb = { x: W / 2 - 190, y: by + 112, w: 380, h: 84 };
    button(ctx, eb, 'Endless Siege', {
      color: 'red', size: 30, disabled: !open,
      sub: open ? `Best: wave ${save.data.endlessBest || 0}` : `Clear stage ${ENDLESS.unlock} to unlock`,
    });
    if (open) this.hits.push({ r: eb, fn: () => { audio.play('click'); this.game.go('battle', 'endless'); } });

    const sb = { x: W / 2 - 110, y: H - safeBottom - 110, w: 220, h: 60 };
    button(ctx, sb, `Sound: ${audio.enabled ? 'On' : 'Off'}`, { color: 'wood', size: 22 });
    this.hits.push({ r: sb, fn: () => { audio.enabled = !audio.enabled; save.data.sound = audio.enabled; save.write(); audio.play('click'); } });
    text(ctx, 'No ads · No purchases', W / 2, H - safeBottom - 28, { size: 16, color: 'rgba(255,240,220,0.55)', weight: 700 });
  }

  pointerDown(x, y) {
    for (let i = this.hits.length - 1; i >= 0; i--) if (inRect(x, y, this.hits[i].r)) { this.hits[i].fn(); return; }
  }
}
