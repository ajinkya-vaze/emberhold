// All sprites are drawn with canvas paths: no image files.
import { rng, TAU } from './util.js';

const OUT = '#2a1a12';
const SKIN = '#eab68c';

function circle(ctx, x, y, r, fill, stroke = OUT, lw = 3) {
  ctx.beginPath();
  ctx.arc(x, y, r, 0, TAU);
  if (fill) { ctx.fillStyle = fill; ctx.fill(); }
  if (stroke) { ctx.lineWidth = lw; ctx.strokeStyle = stroke; ctx.stroke(); }
}
function ellipse(ctx, x, y, rx, ry, fill, stroke = OUT, lw = 3) {
  ctx.beginPath();
  ctx.ellipse(x, y, rx, ry, 0, 0, TAU);
  if (fill) { ctx.fillStyle = fill; ctx.fill(); }
  if (stroke) { ctx.lineWidth = lw; ctx.strokeStyle = stroke; ctx.stroke(); }
}
function line(ctx, x1, y1, x2, y2, color, lw) {
  ctx.beginPath();
  ctx.moveTo(x1, y1);
  ctx.lineTo(x2, y2);
  ctx.lineCap = 'round';
  ctx.lineWidth = lw;
  ctx.strokeStyle = color;
  ctx.stroke();
}
export function shadow(ctx, x, y, rx, ry, a = 0.28) {
  ctx.beginPath();
  ctx.ellipse(x, y, rx, ry, 0, 0, TAU);
  ctx.fillStyle = `rgba(20,30,10,${a})`;
  ctx.fill();
}

// ---------------------------------------------------------------- enemies
// (x, y) = feet. Enemies face DOWN the screen (toward the wall).
export function drawEnemy(ctx, e, time) {
  const { x, r } = e;
  let y = e.y;
  const walking = e.state === 'walk' && e.stunT <= 0;
  const bob = walking ? Math.sin(e.phase) * 2 : 0;
  const swing = e.swing || 0; // 1 → 0 after a wall strike
  const lean = swing * 6;
  shadow(ctx, x, y, r * 1.0, r * 0.42, e.alt ? 0.16 : 0.28);
  if (e.alt) y -= e.alt + Math.sin(time * 5 + e.phase) * 3; // flyers hover above their shadow
  const by = y - r * 0.55 + bob + lean * 0.3; // body centre
  const hy = by - r * 0.75;                   // head centre

  if (e.type === 'harpy') {
    const flap = e.stunT > 0 ? 0 : Math.sin(time * 14 + e.phase);
    for (const s of [-1, 1]) {
      ctx.beginPath();
      ctx.moveTo(x + s * r * 0.4, by - r * 0.2);
      ctx.quadraticCurveTo(x + s * r * 1.5, by - r * (0.9 + flap * 0.6), x + s * r * 1.95, by - r * (0.1 + flap * 0.7));
      ctx.quadraticCurveTo(x + s * r * 1.2, by + r * 0.25, x + s * r * 0.4, by + r * 0.3);
      ctx.closePath();
      ctx.fillStyle = '#54446a'; ctx.fill(); ctx.lineWidth = 2.5; ctx.strokeStyle = OUT; ctx.stroke();
    }
    line(ctx, x - r * 0.2, by + r * 0.6, x - r * 0.3, by + r * 0.95, '#d9a440', 3);
    line(ctx, x + r * 0.2, by + r * 0.6, x + r * 0.3, by + r * 0.95, '#d9a440', 3);
    ellipse(ctx, x, by, r * 0.6, r * 0.78, '#7a6a8e');
    circle(ctx, x, hy + r * 0.35, r * 0.42, '#d2a98a');
    ctx.beginPath(); ctx.arc(x, hy + r * 0.3, r * 0.46, Math.PI * 1.05, Math.PI * 1.95);
    ctx.lineWidth = r * 0.25; ctx.strokeStyle = '#3a2a4a'; ctx.stroke();
    circle(ctx, x - r * 0.15, hy + r * 0.38, r * 0.08, '#d23b3b', null);
    circle(ctx, x + r * 0.15, hy + r * 0.38, r * 0.08, '#d23b3b', null);
  } else if (e.type === 'shaman') {
    ellipse(ctx, x, by, r * 0.78, r * 0.75, '#2f8a7a');
    line(ctx, x - r * 0.7, by + r * 0.05, x + r * 0.7, by + r * 0.05, '#c9a84a', 3);
    const sx = x - r * 0.95;
    line(ctx, sx, by + r * 0.6, sx, by - r * 1.4, '#6b4a2b', 4);
    const glow = 0.6 + 0.4 * Math.sin(time * 4 + e.phase);
    ctx.save(); ctx.globalAlpha = 0.5 * glow;
    circle(ctx, sx, by - r * 1.5, r * 0.55, '#7dff9a', null);
    ctx.restore();
    circle(ctx, sx, by - r * 1.5, r * 0.25, '#b8ffc8', '#1d5a3a', 2);
    circle(ctx, x, hy, r * 0.48, '#b5835a');
    circle(ctx, x - r * 0.15, hy + r * 0.1, r * 0.07, '#fff', null);
    circle(ctx, x + r * 0.15, hy + r * 0.1, r * 0.07, '#fff', null);
    const fc = ['#e84a3a', '#f2c14e', '#3a8ae8'];
    for (let k = -1; k <= 1; k++) line(ctx, x + k * r * 0.22, hy - r * 0.35, x + k * r * 0.5, hy - r * 1.05, fc[k + 1], 5);
  } else if (e.type === 'xbow') {
    ellipse(ctx, x, by, r * 0.8, r * 0.72, '#7a5a34');
    line(ctx, x - r * 0.6, by - r * 0.5, x + r * 0.5, by + r * 0.5, '#4a321c', 3);
    circle(ctx, x, hy, r * 0.48, SKIN);
    ctx.beginPath(); ctx.arc(x, hy - r * 0.02, r * 0.5, Math.PI, 0); ctx.closePath();
    ctx.fillStyle = '#8e8a80'; ctx.fill(); ctx.lineWidth = 2.5; ctx.strokeStyle = OUT; ctx.stroke();
    line(ctx, x - r * 0.7, hy - r * 0.02, x + r * 0.7, hy - r * 0.02, '#6d6a62', 3);
    const cy = by + r * 0.35 - swing * 3;
    line(ctx, x, cy - r * 0.45, x, cy + r * 0.55, '#3a2a1a', 4);
    ctx.beginPath(); ctx.moveTo(x - r * 0.95, cy + r * 0.15); ctx.quadraticCurveTo(x, cy - r * 0.35, x + r * 0.95, cy + r * 0.15);
    ctx.lineWidth = 4; ctx.strokeStyle = '#5b3a22'; ctx.stroke();
    line(ctx, x - r * 0.9, cy + r * 0.15, x, cy + r * (0.35 - swing * 0.3), '#e8e0cf', 1.5);
    line(ctx, x + r * 0.9, cy + r * 0.15, x, cy + r * (0.35 - swing * 0.3), '#e8e0cf', 1.5);
  } else if (e.type === 'hexmother') {
    ctx.beginPath();
    ctx.moveTo(x - r * 0.5, by - r * 0.9);
    ctx.lineTo(x + r * 0.5, by - r * 0.9);
    ctx.lineTo(x + r * 1.0, by + r * 0.75);
    for (let k = 4; k >= -4; k--) ctx.lineTo(x + k * r * 0.25, by + r * (k % 2 ? 0.95 : 0.7));
    ctx.lineTo(x - r * 1.0, by + r * 0.75);
    ctx.closePath();
    ctx.fillStyle = '#2b3a2a'; ctx.fill(); ctx.lineWidth = 3; ctx.strokeStyle = OUT; ctx.stroke();
    line(ctx, x - r * 0.45, by - r * 0.25, x + r * 0.45, by + r * 0.1, '#7a2a6a', 5);
    const sx = x + r * 1.05, top = by - r * 1.6 - swing * 8;
    line(ctx, sx, by + r * 0.8, sx, top, '#3a2a1a', 5);
    const fl = 0.7 + 0.3 * Math.sin(time * 9);
    const g = ctx.createRadialGradient(sx, top - r * 0.35, 1, sx, top - r * 0.35, r * 0.7);
    g.addColorStop(0, 'rgba(200,255,140,0.95)'); g.addColorStop(0.5, `rgba(90,220,90,${0.6 * fl})`); g.addColorStop(1, 'rgba(40,140,40,0)');
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(sx, top - r * 0.35, r * 0.7, 0, TAU); ctx.fill();
    circle(ctx, sx, top, r * 0.24, '#e8e0cc', OUT, 2);
    circle(ctx, x, hy + r * 0.15, r * 0.55, '#1e2a1e');
    ctx.beginPath(); ctx.moveTo(x - r * 0.4, hy - r * 0.1); ctx.lineTo(x, hy - r * 0.9); ctx.lineTo(x + r * 0.4, hy - r * 0.1); ctx.closePath();
    ctx.fillStyle = '#1e2a1e'; ctx.fill(); ctx.stroke();
    ellipse(ctx, x, hy + r * 0.25, r * 0.32, r * 0.26, '#0c120c', null);
    const eg = 0.6 + 0.4 * Math.sin(time * 5);
    circle(ctx, x - r * 0.13, hy + r * 0.22, r * 0.07, `rgba(140,255,120,${eg})`, null);
    circle(ctx, x + r * 0.13, hy + r * 0.22, r * 0.07, `rgba(140,255,120,${eg})`, null);
  } else if (e.type === 'warlord') {
    // cape
    ctx.beginPath();
    ctx.moveTo(x - r * 0.9, by - r * 0.5);
    ctx.lineTo(x + r * 0.9, by - r * 0.5);
    ctx.lineTo(x + r * 1.15, by + r * 0.75);
    ctx.lineTo(x - r * 1.15, by + r * 0.75);
    ctx.closePath();
    ctx.fillStyle = '#9e1f26'; ctx.fill(); ctx.lineWidth = 3; ctx.strokeStyle = OUT; ctx.stroke();
    ellipse(ctx, x, by, r * 0.85, r * 0.72, '#33323d');
    line(ctx, x - r * 0.6, by, x + r * 0.6, by, '#5a5966', 4);
    circle(ctx, x - r * 0.75, by - r * 0.45, r * 0.32, '#4a4956');
    circle(ctx, x + r * 0.75, by - r * 0.45, r * 0.32, '#4a4956');
    // axe
    const ax = x + r * 1.0, ay = by - r * 0.2 - swing * 10;
    line(ctx, ax, ay + r * 0.6, ax + r * 0.3, ay - r * 0.9, '#5b3a22', 6);
    ctx.beginPath();
    ctx.moveTo(ax + r * 0.25, ay - r * 0.95);
    ctx.quadraticCurveTo(ax + r * 0.95, ay - r * 0.8, ax + r * 0.55, ay - r * 0.2);
    ctx.lineTo(ax + r * 0.28, ay - r * 0.5);
    ctx.closePath();
    ctx.fillStyle = '#c9ccd6'; ctx.fill(); ctx.lineWidth = 3; ctx.strokeStyle = OUT; ctx.stroke();
    // helm with horns
    circle(ctx, x, hy, r * 0.5, '#26252e');
    ctx.beginPath();
    ctx.moveTo(x - r * 0.4, hy - r * 0.2);
    ctx.quadraticCurveTo(x - r * 0.95, hy - r * 0.4, x - r * 0.8, hy - r * 1.0);
    ctx.quadraticCurveTo(x - r * 0.65, hy - r * 0.5, x - r * 0.25, hy - r * 0.4);
    ctx.moveTo(x + r * 0.4, hy - r * 0.2);
    ctx.quadraticCurveTo(x + r * 0.95, hy - r * 0.4, x + r * 0.8, hy - r * 1.0);
    ctx.quadraticCurveTo(x + r * 0.65, hy - r * 0.5, x + r * 0.25, hy - r * 0.4);
    ctx.fillStyle = '#efe4cc'; ctx.fill(); ctx.lineWidth = 2.5; ctx.strokeStyle = OUT; ctx.stroke();
    const glow = 0.6 + 0.4 * Math.sin(time * 6);
    circle(ctx, x - r * 0.17, hy + r * 0.08, r * 0.08, `rgba(255,60,40,${glow})`, null);
    circle(ctx, x + r * 0.17, hy + r * 0.08, r * 0.08, `rgba(255,60,40,${glow})`, null);
  } else if (e.type === 'brute') {
    ellipse(ctx, x, by, r * 0.95, r * 0.8, '#8a5a3c');
    ellipse(ctx, x, by + r * 0.15, r * 0.55, r * 0.45, '#b98a62', null);
    line(ctx, x - r * 0.8, by - r * 0.1, x + r * 0.8, by - r * 0.1, '#4a2e1c', 4);
    // club
    const cx = x + r * 0.95, cy = by - r * 0.2 - swing * 12;
    line(ctx, cx, cy + r * 0.5, cx + r * 0.2, cy - r * 0.8, '#6b4a2b', 8);
    circle(ctx, cx + r * 0.22, cy - r * 0.85, r * 0.3, '#7d5734');
    circle(ctx, x - r * 0.9, by - r * 0.1, r * 0.28, '#b98a62');
    // head + horns
    circle(ctx, x, hy + r * 0.15, r * 0.42, '#b98a62');
    line(ctx, x - r * 0.3, hy - r * 0.05, x - r * 0.55, hy - r * 0.45, '#efe4cc', 5);
    line(ctx, x + r * 0.3, hy - r * 0.05, x + r * 0.55, hy - r * 0.45, '#efe4cc', 5);
    circle(ctx, x - r * 0.14, hy + r * 0.2, r * 0.06, OUT, null);
    circle(ctx, x + r * 0.14, hy + r * 0.2, r * 0.06, OUT, null);
  } else if (e.type === 'shield') {
    ellipse(ctx, x, by, r * 0.8, r * 0.7, '#55657f');
    circle(ctx, x, hy, r * 0.5, SKIN);
    ctx.beginPath(); // helm
    ctx.arc(x, hy, r * 0.52, Math.PI, 0);
    ctx.closePath();
    ctx.fillStyle = '#9aa3b2'; ctx.fill(); ctx.lineWidth = 3; ctx.strokeStyle = OUT; ctx.stroke();
    line(ctx, x, hy - r * 0.5, x, hy + r * 0.1, '#6d7686', 3);
    // big shield in front
    const sx = x, sy = by + r * 0.15 - swing * 4;
    ctx.beginPath();
    ctx.moveTo(sx - r * 0.85, sy - r * 0.55);
    ctx.lineTo(sx + r * 0.85, sy - r * 0.55);
    ctx.lineTo(sx + r * 0.8, sy + r * 0.25);
    ctx.quadraticCurveTo(sx, sy + r * 0.95, sx - r * 0.8, sy + r * 0.25);
    ctx.closePath();
    ctx.fillStyle = '#7b2d2d'; ctx.fill(); ctx.lineWidth = 3; ctx.strokeStyle = OUT; ctx.stroke();
    ctx.lineWidth = 3; ctx.strokeStyle = '#d9b45a';
    ctx.beginPath();
    ctx.moveTo(sx, sy - r * 0.45); ctx.lineTo(sx, sy + r * 0.55);
    ctx.moveTo(sx - r * 0.55, sy - r * 0.1); ctx.lineTo(sx + r * 0.55, sy - r * 0.1);
    ctx.stroke();
  } else if (e.type === 'runner') {
    ellipse(ctx, x, by, r * 0.7, r * 0.65, '#3f6e33');
    const dx = x + r * 0.8, dy = by - swing * 6;
    line(ctx, dx, dy + r * 0.2, dx + r * 0.15, dy - r * 0.6, '#d8dde6', 3);
    circle(ctx, x, hy + r * 0.1, r * 0.55, '#35602b');
    ellipse(ctx, x, hy + r * 0.25, r * 0.32, r * 0.26, SKIN, null);
    circle(ctx, x - r * 0.12, hy + r * 0.25, r * 0.06, OUT, null);
    circle(ctx, x + r * 0.12, hy + r * 0.25, r * 0.06, OUT, null);
  } else {
    // grunt
    ellipse(ctx, x, by, r * 0.82, r * 0.72, '#b4442f');
    line(ctx, x - r * 0.7, by + r * 0.1, x + r * 0.7, by + r * 0.1, '#5a2a1a', 4);
    const cx = x + r * 0.85, cy = by - r * 0.1 - swing * 10;
    line(ctx, cx, cy + r * 0.4, cx + r * 0.25, cy - r * 0.75, '#6b4a2b', 5);
    circle(ctx, cx + r * 0.27, cy - r * 0.8, r * 0.22, '#7d5734', OUT, 2.5);
    circle(ctx, x, hy, r * 0.5, SKIN);
    ctx.beginPath();
    ctx.arc(x, hy - r * 0.05, r * 0.52, Math.PI, 0);
    ctx.closePath();
    ctx.fillStyle = '#7a6550'; ctx.fill(); ctx.lineWidth = 3; ctx.strokeStyle = OUT; ctx.stroke();
    circle(ctx, x - r * 0.15, hy + r * 0.15, r * 0.07, OUT, null);
    circle(ctx, x + r * 0.15, hy + r * 0.15, r * 0.07, OUT, null);
  }

  if (e.flash > 0) {
    ctx.globalAlpha = e.flash * 0.55;
    ellipse(ctx, x, by - r * 0.3, r * 1.0, r * 1.15, '#ffffff', null);
    ctx.globalAlpha = 1;
  }
  if (e.slowT > 0) {
    ctx.globalAlpha = 0.5;
    ellipse(ctx, x, y, r * 1.05, r * 0.45, null, '#8fd8ff', 3);
    ctx.globalAlpha = 1;
  }
  if (e.stunT > 0) {
    for (let i = 0; i < 3; i++) {
      const a = time * 5 + (i * TAU) / 3;
      const sx = x + Math.cos(a) * r * 0.7, sy = hy - r * 0.75 + Math.sin(a) * r * 0.2;
      ctx.fillStyle = '#ffe36b';
      ctx.font = `${Math.round(r * 0.6)}px sans-serif`;
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText('✦', sx, sy);
    }
  }
  // HP bar
  if (e.hp < e.maxHp) {
    const w = Math.max(30, r * 1.9), h = e.boss ? 8 : 6;
    const bx = x - w / 2, byy = hy - r * (e.boss ? 1.3 : e.type === 'shaman' ? 1.2 : 0.95) - 6;
    ctx.fillStyle = 'rgba(20,10,5,0.85)';
    ctx.fillRect(bx - 2, byy - 2, w + 4, h + 4);
    ctx.fillStyle = e.boss ? '#ff4d3a' : '#e8463a';
    ctx.fillRect(bx, byy, w * Math.max(0, e.hp / e.maxHp), h);
  }
}

// -------------------------------------------------------------------- king
// k: { x, y, aim (radians), moving, walk, anim (shot recoil 1→0), hurt (1→0) }
export function drawKing(ctx, k, time) {
  const { x, y } = k;
  const step = k.moving ? Math.sin(k.walk) : 0;
  const bob = k.moving ? Math.abs(Math.sin(k.walk)) * 2 : Math.sin(time * 2) * 0.8;
  // royal glow so you can always spot him
  const g = ctx.createRadialGradient(x, y, 4, x, y, 34);
  g.addColorStop(0, 'rgba(255,220,110,0.45)'); g.addColorStop(1, 'rgba(255,220,110,0)');
  ctx.fillStyle = g; ctx.beginPath(); ctx.ellipse(x, y, 34, 16, 0, 0, TAU); ctx.fill();
  shadow(ctx, x, y, 18, 7, 0.35);
  const by = y - 20 - bob;
  const hy = by - 19;
  // legs
  line(ctx, x - 6, by + 10, x - 6 + step * 3, y - 2, '#3a2a4a', 6);
  line(ctx, x + 6, by + 10, x + 6 - step * 3, y - 2, '#3a2a4a', 6);
  // cape (sways while walking)
  const sway = step * 3;
  ctx.beginPath();
  ctx.moveTo(x - 13, hy + 8);
  ctx.lineTo(x + 13, hy + 8);
  ctx.lineTo(x + 19 + sway, by + 18);
  ctx.lineTo(x - 19 + sway, by + 18);
  ctx.closePath();
  ctx.fillStyle = '#b8262e'; ctx.fill(); ctx.lineWidth = 3; ctx.strokeStyle = OUT; ctx.stroke();
  // tunic
  ellipse(ctx, x, by, 13, 15, '#2f5fb0');
  line(ctx, x - 12, by + 4, x + 12, by + 4, '#e8b84a', 3.5);
  ctx.fillStyle = '#f2d68a';
  ctx.fillRect(x - 3, by - 12, 6, 14);
  // head, beard, crown
  circle(ctx, x, hy, 11, SKIN);
  ctx.beginPath(); ctx.moveTo(x - 10, hy + 2); ctx.quadraticCurveTo(x, hy + 18, x + 10, hy + 2); ctx.closePath();
  ctx.fillStyle = '#8a5a2a'; ctx.fill(); ctx.lineWidth = 2; ctx.strokeStyle = OUT; ctx.stroke();
  circle(ctx, x - 4, hy - 1, 1.8, OUT, null);
  circle(ctx, x + 4, hy - 1, 1.8, OUT, null);
  ctx.beginPath();
  ctx.moveTo(x - 11, hy - 6);
  ctx.lineTo(x - 11, hy - 17); ctx.lineTo(x - 5.5, hy - 11); ctx.lineTo(x, hy - 20); ctx.lineTo(x + 5.5, hy - 11); ctx.lineTo(x + 11, hy - 17);
  ctx.lineTo(x + 11, hy - 6);
  ctx.closePath();
  ctx.fillStyle = '#ffd23f'; ctx.fill(); ctx.lineWidth = 2.5; ctx.strokeStyle = '#7a4a0a'; ctx.stroke();
  circle(ctx, x, hy - 9, 2.4, '#d23b3b', null);
  // bow, pointed at the target
  const kick = k.anim * 4;
  ctx.save();
  ctx.translate(x + Math.cos(k.aim) * 10, by - 2 + Math.sin(k.aim) * 10);
  ctx.rotate(k.aim);
  ctx.translate(-kick, 0);
  ctx.beginPath(); ctx.arc(-6, 0, 16, -1.1, 1.1);
  ctx.lineWidth = 4.5; ctx.strokeStyle = '#7a4a1e'; ctx.stroke();
  const sx = -6 + Math.cos(1.1) * 16, sy = Math.sin(1.1) * 16;
  const pull = -6 - k.anim * 0 + (k.anim > 0.5 ? 0 : -5);
  line(ctx, sx, -sy, pull, 0, '#efe8d8', 1.5);
  line(ctx, sx, sy, pull, 0, '#efe8d8', 1.5);
  ctx.restore();
  if (k.hurt > 0) {
    ctx.globalAlpha = k.hurt * 0.6;
    ellipse(ctx, x, by - 8, 18, 26, '#ff5a4a', null);
    ctx.globalAlpha = 1;
  }
}

// ------------------------------------------------------------- build spots
export function drawPad(ctx, x, y, hl = false) {
  shadow(ctx, x, y + 6, 34, 14, 0.25);
  ellipse(ctx, x, y, 33, 24, hl ? '#cfc3a8' : '#a99d86', '#5d5446', 3);
  ellipse(ctx, x, y - 2, 24, 16, hl ? '#ddd2b9' : '#bcb09a', null);
  ctx.globalAlpha = hl ? 0.9 : 0.45;
  line(ctx, x - 8, y - 2, x + 8, y - 2, '#5d5446', 3);
  line(ctx, x, y - 9, x, y + 5, '#5d5446', 3);
  ctx.globalAlpha = 1;
}

// Coin price tag with a fill bar showing coins paid so far.
export function drawCostBubble(ctx, x, y, cost, paid, canAfford) {
  const label = `${cost - paid}`;
  ctx.font = `800 18px ui-rounded, system-ui, sans-serif`;
  const w = Math.max(54, ctx.measureText(label).width + 40), h = 28;
  const bx = x - w / 2, by = y - h / 2;
  ctx.beginPath();
  ctx.roundRect ? ctx.roundRect(bx, by, w, h, 14) : ctx.rect(bx, by, w, h);
  ctx.fillStyle = 'rgba(30,18,10,0.85)'; ctx.fill();
  if (paid > 0) {
    ctx.save();
    ctx.clip();
    ctx.fillStyle = 'rgba(255,200,60,0.55)';
    ctx.fillRect(bx, by, (w * paid) / cost, h);
    ctx.restore();
  }
  ctx.lineWidth = 2.5; ctx.strokeStyle = canAfford ? '#ffd34d' : '#6b5a4a'; ctx.stroke();
  drawCoinIcon(ctx, bx + 15, y, 8);
  ctx.fillStyle = canAfford ? '#ffe9a8' : '#b8a48a';
  ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
  ctx.fillText(label, bx + 28, y + 1);
}

export function drawCoinIcon(ctx, x, y, r) {
  circle(ctx, x, y, r, '#f5c242', '#8a5a0a', 2);
  circle(ctx, x, y, r * 0.5, null, '#c98f1c', 1.5);
}

// A dropped coin on the ground (spins; blinks before it vanishes).
export function drawCoin(ctx, c, time) {
  if (c.life < 4 && Math.sin(time * 18) > 0.2) return;
  const spin = Math.abs(Math.cos(time * 5 + c.phase));
  const r = 7 + Math.min(3, c.value);
  const hop = c.z || 0;
  shadow(ctx, c.x, c.y + 2, r * 0.9, r * 0.35, 0.3);
  ctx.beginPath();
  ctx.ellipse(c.x, c.y - r - hop, r * (0.25 + 0.75 * spin), r, 0, 0, TAU);
  ctx.fillStyle = spin > 0.5 ? '#ffd24a' : '#e0a82a';
  ctx.fill();
  ctx.lineWidth = 2; ctx.strokeStyle = '#8a5a0a'; ctx.stroke();
  if (spin > 0.6) {
    ctx.fillStyle = 'rgba(255,255,255,0.7)';
    ctx.beginPath(); ctx.arc(c.x - r * 0.3 * spin, c.y - r * 1.3 - hop, 1.8, 0, TAU); ctx.fill();
  }
}

// ------------------------------------------------------------ watch tower
export function drawTower(ctx, tw, time) {
  const { x, y, level } = tw;
  shadow(ctx, x, y + 8, 34, 14, 0.3);
  ellipse(ctx, x, y, 30, 20, level >= 2 ? '#9a917f' : '#8f8577', OUT, 3);
  ctx.fillStyle = level >= 3 ? '#8a6038' : '#7a5434';
  ctx.fillRect(x - 20, y - 52, 40, 52);
  ctx.lineWidth = 3; ctx.strokeStyle = OUT; ctx.strokeRect(x - 20, y - 52, 40, 52);
  line(ctx, x - 20, y - 26, x + 20, y - 26, '#56391f', 3);
  line(ctx, x - 20, y - 52, x + 20, y - 26, '#56391f', 2);
  if (level >= 2) { // stone footing
    ctx.fillStyle = '#a49a8b';
    ctx.fillRect(x - 22, y - 14, 44, 14);
    ctx.strokeRect(x - 22, y - 14, 44, 14);
  }
  ctx.fillStyle = '#9a6a45';
  ctx.fillRect(x - 26, y - 62, 52, 12);
  ctx.strokeRect(x - 26, y - 62, 52, 12);
  const pa = tw.anim * 3;
  circle(ctx, x, y - 68 + pa, 8, SKIN, OUT, 2.5);
  ctx.beginPath(); ctx.arc(x, y - 70 + pa, 8.5, Math.PI, 0); ctx.fillStyle = '#3d7d3a'; ctx.fill();
  ctx.beginPath();
  ctx.moveTo(x - 30, y - 74); ctx.lineTo(x, y - 98); ctx.lineTo(x + 30, y - 74);
  ctx.closePath();
  ctx.fillStyle = level >= 3 ? '#2f5fb0' : level === 2 ? '#a8432f' : '#7d4b2b';
  ctx.fill(); ctx.stroke();
  line(ctx, x - 26, y - 74, x - 26, y - 62, '#56391f', 3);
  line(ctx, x + 26, y - 74, x + 26, y - 62, '#56391f', 3);
  if (level >= 2) {
    line(ctx, x, y - 98, x, y - 116, '#4a3020', 2.5);
    ctx.beginPath(); ctx.moveTo(x, y - 116); ctx.lineTo(x + 16, y - 111 + Math.sin(time * 4) * 2); ctx.lineTo(x, y - 106); ctx.closePath();
    ctx.fillStyle = level >= 3 ? '#ffd23f' : '#e8e0cf'; ctx.fill();
  }
  for (let i = 0; i < level; i++) circle(ctx, x - (level - 1) * 8 + i * 16, y + 14, 5, '#ffd23f', '#6b4a0a', 2);
}

// --------------------------------------------------------------- barricade
// b: { x, y, dx, dy (road direction), level (0 = empty spot), hp, maxHp, hit (1→0) }
export function drawBarricade(ctx, b, time, ghost = false) {
  const px = -b.dy, py = b.dx; // across the road
  const level = ghost ? 1 : b.level;
  const shakeX = (b.hit || 0) * Math.sin(time * 60) * 3;
  const stakes = [];
  for (let i = -3; i <= 3; i++) stakes.push({ x: b.x + px * i * 11 + shakeX, y: b.y + py * i * 11 });
  stakes.sort((a, c) => a.y - c.y);
  ctx.save();
  if (ghost) ctx.globalAlpha = 0.35;
  if (!ghost) shadow(ctx, b.x, b.y + 4, 42, 14, 0.3);
  if (level >= 2 && !ghost) { // stone base
    for (const s of stakes) { ctx.fillStyle = '#9a917f'; ctx.fillRect(s.x - 8, s.y - 8, 16, 10); }
  }
  for (const s of stakes) {
    const h = 30 + (level >= 3 ? 6 : 0);
    ctx.beginPath();
    ctx.moveTo(s.x - 5, s.y);
    ctx.lineTo(s.x - 5, s.y - h);
    ctx.lineTo(s.x, s.y - h - 9);
    ctx.lineTo(s.x + 5, s.y - h);
    ctx.lineTo(s.x + 5, s.y);
    ctx.closePath();
    ctx.fillStyle = ghost ? '#ffffff' : '#8a5a32';
    ctx.fill();
    ctx.lineWidth = 2.5; ctx.strokeStyle = OUT; ctx.stroke();
    if (level >= 3 && !ghost) line(ctx, s.x - 5, s.y - 12, s.x + 5, s.y - 12, '#5a5a66', 3);
  }
  if (!ghost) { // cross beam
    const a = stakes[0], z = stakes[stakes.length - 1];
    line(ctx, a.x, a.y - 18, z.x, z.y - 18, '#6b4529', 5);
  }
  ctx.restore();
}

// ------------------------------------------------------------------- keep
export function drawKeep(ctx, cx, top, time, flash = 0) {
  const w = 230, h = 150;
  const x = cx - w / 2, y = top + 18;
  shadow(ctx, cx, y + h, w * 0.6, 18, 0.35);
  // side towers
  for (const tx of [x - 6, x + w - 46]) {
    ctx.fillStyle = '#a49a8b'; ctx.fillRect(tx, y - 20, 52, h + 20);
    ctx.lineWidth = 3; ctx.strokeStyle = OUT; ctx.strokeRect(tx, y - 20, 52, h + 20);
    ctx.beginPath(); ctx.moveTo(tx - 6, y - 20); ctx.lineTo(tx + 26, y - 62); ctx.lineTo(tx + 58, y - 20); ctx.closePath();
    ctx.fillStyle = '#2f5fb0'; ctx.fill(); ctx.stroke();
    ctx.fillStyle = `rgba(255,200,100,${0.75 + 0.25 * Math.sin(time * 3 + tx)})`;
    ctx.fillRect(tx + 20, y + 10, 12, 18);
  }
  // main hall
  ctx.fillStyle = '#b3a998'; ctx.fillRect(x + 40, y + 10, w - 80, h - 10);
  ctx.lineWidth = 3; ctx.strokeStyle = OUT; ctx.strokeRect(x + 40, y + 10, w - 80, h - 10);
  for (let i = 0; i < 5; i++) {
    ctx.fillStyle = '#c4baa8'; ctx.fillRect(x + 44 + i * 30, y - 6, 20, 16);
    ctx.strokeRect(x + 44 + i * 30, y - 6, 20, 16);
  }
  ctx.strokeStyle = 'rgba(40,30,22,0.4)'; ctx.lineWidth = 2;
  for (let r = 0; r < 4; r++) { ctx.beginPath(); ctx.moveTo(x + 40, y + 40 + r * 28); ctx.lineTo(x + w - 40, y + 40 + r * 28); ctx.stroke(); }
  // gate
  ctx.beginPath();
  ctx.moveTo(cx - 26, y + h); ctx.lineTo(cx - 26, y + 70); ctx.arc(cx, y + 70, 26, Math.PI, 0); ctx.lineTo(cx + 26, y + h); ctx.closePath();
  ctx.fillStyle = '#5a3a20'; ctx.fill(); ctx.lineWidth = 3; ctx.strokeStyle = OUT; ctx.stroke();
  for (const gx of [cx - 13, cx, cx + 13]) line(ctx, gx, y + 52, gx, y + h, '#3a2412', 2);
  // banner
  const wv = Math.sin(time * 2) * 2;
  ctx.fillStyle = '#b8262e';
  ctx.beginPath(); ctx.moveTo(cx - 16, y + 14); ctx.lineTo(cx + 16, y + 14); ctx.lineTo(cx + 16 + wv, y + 44); ctx.lineTo(cx + wv, y + 36); ctx.lineTo(cx - 16 + wv, y + 44); ctx.closePath();
  ctx.fill(); ctx.lineWidth = 2; ctx.strokeStyle = '#4a1010'; ctx.stroke();
  circle(ctx, cx + wv * 0.5, y + 24, 5, '#ffd23f', '#6b4a0a', 1.5);
  if (flash > 0) {
    ctx.fillStyle = `rgba(255,60,40,${flash * 0.3})`;
    ctx.fillRect(x - 10, y - 60, w + 20, h + 60);
  }
}

// Armory spot icons (bow / quiver / volley / repair) on a stone pad.
export function drawArmorySpot(ctx, kind, x, y, level, max, active) {
  shadow(ctx, x, y + 6, 36, 14, 0.25);
  ellipse(ctx, x, y, 36, 26, active ? '#d9c7a0' : '#a99d86', '#5d5446', 3);
  ellipse(ctx, x, y - 2, 27, 18, kind === 'repair' ? '#b8c8a0' : '#c9b48a', null);
  ctx.save();
  ctx.translate(x, y - 4);
  ctx.lineCap = 'round';
  if (kind === 'bow') {
    ctx.beginPath(); ctx.arc(-4, 0, 14, -1.2, 1.2); ctx.lineWidth = 4; ctx.strokeStyle = '#6b3a12'; ctx.stroke();
    line(ctx, -4 + Math.cos(1.2) * 14, -Math.sin(1.2) * 14, -4 + Math.cos(1.2) * 14, Math.sin(1.2) * 14, '#efe8d8', 1.5);
    line(ctx, -12, 0, 14, 0, '#4a3220', 2.5);
  } else if (kind === 'quiver') {
    ctx.rotate(0.4);
    ctx.fillStyle = '#7a4d2a'; ctx.fillRect(-6, -8, 12, 20); ctx.lineWidth = 2; ctx.strokeStyle = OUT; ctx.strokeRect(-6, -8, 12, 20);
    for (const ax of [-3, 0, 3]) line(ctx, ax, -8, ax, -16, '#efe8d8', 2);
    for (const ax of [-3, 0, 3]) line(ctx, ax, -16, ax, -18, '#d23b3b', 3);
  } else if (kind === 'volley') {
    for (const a of [-0.45, 0, 0.45]) {
      ctx.save(); ctx.rotate(a);
      line(ctx, 0, 10, 0, -12, '#4a3220', 2.5);
      ctx.beginPath(); ctx.moveTo(-4, -10); ctx.lineTo(0, -17); ctx.lineTo(4, -10); ctx.closePath(); ctx.fillStyle = '#ddd'; ctx.fill();
      ctx.restore();
    }
  } else {
    ctx.rotate(-0.6);
    line(ctx, 0, 12, 0, -6, '#6b4529', 4);
    ctx.fillStyle = '#8e95a3'; ctx.fillRect(-10, -14, 20, 9); ctx.lineWidth = 2; ctx.strokeStyle = OUT; ctx.strokeRect(-10, -14, 20, 9);
  }
  ctx.restore();
  for (let i = 0; i < max; i++) circle(ctx, x - (max - 1) * 8 + i * 16, y + 18, 4.5, i < level ? '#ffd23f' : '#4a3a2e', '#2a1a0a', 1.5);
}

// -------------------------------------------------------------- background
export function renderBackground(W, H, scale, dpr, paths, pads, fieldTop, wallY) {
  const c = document.createElement('canvas');
  c.width = Math.round(W * scale * dpr);
  c.height = Math.round(H * scale * dpr);
  const ctx = c.getContext('2d');
  ctx.setTransform(scale * dpr, 0, 0, scale * dpr, 0, 0);
  const R = rng(1337);

  // grass
  const g = ctx.createLinearGradient(0, 0, 0, wallY);
  g.addColorStop(0, '#5f8f4a');
  g.addColorStop(1, '#78a85a');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);
  for (let i = 0; i < 160; i++) {
    const x = R() * W, y = R() * wallY, r = 20 + R() * 70;
    ctx.fillStyle = R() < 0.5 ? 'rgba(40,70,25,0.07)' : 'rgba(170,210,110,0.07)';
    ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.fill();
  }
  // tufts and flowers
  for (let i = 0; i < 260; i++) {
    const x = R() * W, y = R() * wallY;
    ctx.strokeStyle = 'rgba(45,85,30,0.55)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(x - 4, y - 6); ctx.lineTo(x, y); ctx.lineTo(x + 4, y - 7);
    ctx.stroke();
  }
  for (let i = 0; i < 70; i++) {
    const x = R() * W, y = R() * wallY;
    ctx.fillStyle = ['#fff6d8', '#ffd84d', '#f2a0c8'][Math.floor(R() * 3)];
    ctx.beginPath(); ctx.arc(x, y, 2.5, 0, TAU); ctx.fill();
  }

  // dirt road
  const stroke = (pts, w, color) => {
    ctx.beginPath();
    pts.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
    ctx.lineJoin = 'round'; ctx.lineCap = 'round';
    ctx.lineWidth = w; ctx.strokeStyle = color; ctx.stroke();
  };
  for (const p of paths) stroke(p.pts, 76, 'rgba(60,45,25,0.35)');
  for (const p of paths) stroke(p.pts, 66, '#9b7a52');
  for (const p of paths) stroke(p.pts, 54, '#c7a676');
  for (const p of paths) stroke(p.pts, 22, 'rgba(225,200,150,0.45)');
  for (const p of paths) {
    for (let i = 0; i < p.length / 14; i++) {
      const pt = p.at(R() * p.length);
      ctx.fillStyle = R() < 0.5 ? 'rgba(110,85,55,0.5)' : 'rgba(235,215,175,0.6)';
      ctx.beginPath(); ctx.arc(pt.x + (R() - 0.5) * 46, pt.y + (R() - 0.5) * 46, 1.5 + R() * 2.5, 0, TAU); ctx.fill();
    }
  }

  // trees & rocks away from road/pads
  const items = [];
  const clear = (x, y, m) =>
    paths.every((p) => p.distTo(x, y) > m) && pads.every((pd) => Math.hypot(pd.x - x, pd.y - y) > m + 30) && y < wallY - 40 && y > fieldTop - 30;
  for (let tries = 0; tries < 900 && items.length < 46; tries++) {
    const edge = R() < 0.65;
    const x = edge ? (R() < 0.5 ? R() * 70 : W - R() * 70) : R() * W;
    const y = fieldTop - 20 + R() * (wallY - fieldTop);
    const r = 20 + R() * 16;
    if (clear(x, y, r + 40) && items.every((t) => Math.hypot(t.x - x, t.y - y) > (t.r + r) * 0.9)) {
      items.push({ x, y, r, rock: R() < 0.22 });
    }
  }
  items.sort((a, b) => a.y - b.y);
  for (const t of items) {
    if (t.rock) {
      shadow(ctx, t.x, t.y + 4, t.r * 0.8, t.r * 0.32);
      ctx.beginPath();
      ctx.moveTo(t.x - t.r * 0.7, t.y + 2);
      ctx.lineTo(t.x - t.r * 0.5, t.y - t.r * 0.5);
      ctx.lineTo(t.x + t.r * 0.1, t.y - t.r * 0.7);
      ctx.lineTo(t.x + t.r * 0.7, t.y - t.r * 0.2);
      ctx.lineTo(t.x + t.r * 0.6, t.y + 3);
      ctx.closePath();
      ctx.fillStyle = '#9a958a'; ctx.fill(); ctx.lineWidth = 3; ctx.strokeStyle = '#4a463e'; ctx.stroke();
      ctx.beginPath(); ctx.moveTo(t.x - t.r * 0.4, t.y - t.r * 0.4); ctx.lineTo(t.x + t.r * 0.1, t.y - t.r * 0.6);
      ctx.strokeStyle = '#c4c0b6'; ctx.lineWidth = 3; ctx.stroke();
    } else {
      shadow(ctx, t.x + 6, t.y + 6, t.r * 0.95, t.r * 0.4, 0.3);
      ctx.fillStyle = '#6b4529';
      ctx.fillRect(t.x - 4, t.y - 10, 8, 14);
      const shades = ['#2f5e2a', '#3f7a35', '#5a9a46'];
      circle(ctx, t.x, t.y - t.r * 0.7, t.r, shades[0], '#1f3b1a', 3);
      circle(ctx, t.x - t.r * 0.25, t.y - t.r * 0.85, t.r * 0.65, shades[1], null);
      circle(ctx, t.x - t.r * 0.35, t.y - t.r * 1.0, t.r * 0.3, shades[2], null);
    }
  }
  // town plaza below the field
  const pg = ctx.createLinearGradient(0, wallY, 0, H);
  pg.addColorStop(0, '#b8a47c'); pg.addColorStop(1, '#8f7c5a');
  ctx.fillStyle = pg;
  ctx.fillRect(0, wallY, W, H - wallY);
  for (let row = 0, y = wallY + 10; y < H; row++, y += 22) {
    for (let x = (row % 2) * 18; x < W; x += 36) {
      ctx.fillStyle = R() < 0.5 ? 'rgba(80,60,40,0.18)' : 'rgba(255,240,210,0.12)';
      ctx.beginPath(); ctx.ellipse(x + R() * 4, y + R() * 3, 15, 8, 0, 0, TAU); ctx.fill();
    }
  }
  // low stone border between field and town
  for (let x = 0; x < W; x += 30) {
    ctx.fillStyle = '#9a917f';
    ctx.beginPath(); ctx.ellipse(x + 15, wallY + 2, 14, 7, 0, 0, TAU); ctx.fill();
    ctx.lineWidth = 2; ctx.strokeStyle = '#4a3f33'; ctx.stroke();
  }
  ctx.fillStyle = '#c7a676'; // road continues to the gate
  ctx.fillRect(W / 2 - 27, wallY - 4, 54, 30);
  return c;
}
