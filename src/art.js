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

// ------------------------------------------------------------------ heroes
// Heroes stand on the wall facing UP the screen (we see their backs).
export function drawHero(ctx, h, time) {
  const { x, y } = h;
  const id = h.def.id;
  const kick = h.anim * 4;
  const breathe = Math.sin(time * 2 + x) * 1.2;
  shadow(ctx, x, y, 22, 8, 0.35);
  const by = y - 22 + breathe * 0.3;
  const hy = by - 22;
  if (id === 'wren') {
    // cloak
    ctx.beginPath();
    ctx.moveTo(x - 12, hy + 6);
    ctx.lineTo(x + 12, hy + 6);
    ctx.lineTo(x + 20, by + 18);
    ctx.lineTo(x - 20, by + 18);
    ctx.closePath();
    ctx.fillStyle = '#3d7d3a'; ctx.fill(); ctx.lineWidth = 3; ctx.strokeStyle = OUT; ctx.stroke();
    // quiver
    ctx.save(); ctx.translate(x + 8, by - 4); ctx.rotate(0.35);
    ctx.fillStyle = '#7a4d2a'; ctx.fillRect(-4, -14, 9, 22); ctx.strokeStyle = OUT; ctx.lineWidth = 2; ctx.strokeRect(-4, -14, 9, 22);
    line(ctx, -2, -14, -3, -20, '#e8e0cf', 2); line(ctx, 2, -14, 3, -20, '#e8e0cf', 2);
    ctx.restore();
    // hood
    circle(ctx, x, hy, 13, '#2f6a2e');
    // bow, aimed toward target angle
    ctx.save();
    ctx.translate(x, hy - 6 + kick);
    ctx.rotate(h.angle + Math.PI / 2);
    ctx.beginPath(); ctx.arc(0, 4, 18, Math.PI * 1.15, Math.PI * 1.85);
    ctx.lineWidth = 4; ctx.strokeStyle = '#8a5a2b'; ctx.stroke();
    line(ctx, -15, -5, 15, -5, '#efe8d8', 1.5);
    ctx.restore();
  } else if (id === 'bram') {
    // cape
    ctx.beginPath();
    ctx.moveTo(x - 16, hy + 8);
    ctx.lineTo(x + 16, hy + 8);
    ctx.lineTo(x + 22, by + 18);
    ctx.lineTo(x - 22, by + 18);
    ctx.closePath();
    ctx.fillStyle = '#2f5ea8'; ctx.fill(); ctx.lineWidth = 3; ctx.strokeStyle = OUT; ctx.stroke();
    circle(ctx, x - 16, hy + 10, 8, '#a7b0bf');
    circle(ctx, x + 16, hy + 10, 8, '#a7b0bf');
    // axe raised
    ctx.save();
    ctx.translate(x + 18, hy + 6);
    ctx.rotate(-0.4 - h.anim * 1.2);
    line(ctx, 0, 6, 0, -26, '#6b4529', 5);
    ctx.beginPath(); ctx.moveTo(0, -26); ctx.quadraticCurveTo(14, -28, 12, -12); ctx.lineTo(0, -16); ctx.closePath();
    ctx.fillStyle = '#d4d8e0'; ctx.fill(); ctx.lineWidth = 2.5; ctx.strokeStyle = OUT; ctx.stroke();
    ctx.restore();
    circle(ctx, x, hy, 14, '#a7b0bf');
    line(ctx, x, hy - 14, x, hy + 10, '#7d8696', 3);
    // plume
    ctx.beginPath(); ctx.moveTo(x, hy - 12); ctx.quadraticCurveTo(x + 4, hy - 26, x - 8, hy - 24);
    ctx.lineWidth = 5; ctx.strokeStyle = '#d23b3b'; ctx.stroke();
  } else if (id === 'vex') {
    ctx.beginPath();
    ctx.moveTo(x - 12, hy + 6);
    ctx.lineTo(x + 12, hy + 6);
    ctx.lineTo(x + 19, by + 18);
    ctx.lineTo(x - 19, by + 18);
    ctx.closePath();
    ctx.fillStyle = '#1f7a8c'; ctx.fill(); ctx.lineWidth = 3; ctx.strokeStyle = OUT; ctx.stroke();
    line(ctx, x, hy + 8, x, by + 16, '#9fe8f5', 2);
    const sx = x + 18, sy = hy - 10 + kick;
    line(ctx, sx, by + 14, sx, sy, '#3a3a48', 4);
    ctx.save();
    ctx.shadowColor = '#7ff0ff'; ctx.shadowBlur = 14;
    circle(ctx, sx, sy - 6, 6, '#c8f8ff', '#1f6a7a', 2);
    ctx.restore();
    if (Math.sin(time * 23 + x) > 0.4) {
      ctx.strokeStyle = '#bff6ff'; ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.moveTo(sx, sy - 6); ctx.lineTo(sx + 7, sy - 12); ctx.lineTo(sx + 3, sy - 15); ctx.lineTo(sx + 10, sy - 20); ctx.stroke();
    }
    circle(ctx, x, hy, 13, '#176070'); // hood from behind
    ctx.beginPath(); ctx.moveTo(x - 6, hy - 10); ctx.lineTo(x, hy - 20); ctx.lineTo(x + 6, hy - 10); ctx.closePath();
    ctx.fillStyle = '#176070'; ctx.fill(); ctx.lineWidth = 2.5; ctx.strokeStyle = OUT; ctx.stroke();
  } else {
    // ignis: robe + wizard hat + staff orb
    ctx.beginPath();
    ctx.moveTo(x - 12, hy + 6);
    ctx.lineTo(x + 12, hy + 6);
    ctx.lineTo(x + 19, by + 18);
    ctx.lineTo(x - 19, by + 18);
    ctx.closePath();
    ctx.fillStyle = '#6d3b98'; ctx.fill(); ctx.lineWidth = 3; ctx.strokeStyle = OUT; ctx.stroke();
    line(ctx, x - 14, by + 10, x + 14, by + 10, '#e2b647', 3);
    // staff
    const sx = x - 18, sy = hy - 8 + kick;
    line(ctx, sx, by + 14, sx, sy - 6, '#6b4529', 4);
    const pulse = 0.7 + 0.3 * Math.sin(time * 5);
    ctx.save();
    ctx.shadowColor = '#ff8a2a'; ctx.shadowBlur = 16 * pulse;
    circle(ctx, sx, sy - 12, 7, '#ffb347', '#8a3a0a', 2);
    ctx.restore();
    circle(ctx, x, hy + 2, 12, '#d9d4cc'); // white hair from behind
    ctx.beginPath(); // hat
    ctx.moveTo(x - 18, hy);
    ctx.quadraticCurveTo(x, hy - 6, x + 18, hy);
    ctx.lineTo(x + 4, hy - 30);
    ctx.quadraticCurveTo(x + 10, hy - 34, x + 12, hy - 30);
    ctx.lineTo(x - 2, hy - 34);
    ctx.closePath();
    ctx.fillStyle = '#5a2f82'; ctx.fill(); ctx.lineWidth = 3; ctx.strokeStyle = OUT; ctx.stroke();
  }
}

// Front-facing portrait for skill cards.
export function drawPortrait(ctx, id, x, y, r) {
  ctx.save();
  ctx.beginPath();
  ctx.arc(x, y, r, 0, TAU);
  ctx.clip();
  const bg = { wren: '#2e5a33', bram: '#2c4672', ignis: '#4a2a63', vex: '#17505c' }[id];
  ctx.fillStyle = bg;
  ctx.fillRect(x - r, y - r, r * 2, r * 2);
  const s = r / 40;
  if (id === 'wren') {
    ellipse(ctx, x, y + 40 * s, 32 * s, 22 * s, '#3d7d3a');
    ctx.beginPath(); ctx.arc(x, y - 2 * s, 26 * s, Math.PI * 0.95, Math.PI * 2.05); ctx.closePath();
    ctx.fillStyle = '#2f6a2e'; ctx.fill();
    circle(ctx, x, y + 2 * s, 19 * s, SKIN, OUT, 2.5);
    ctx.beginPath(); ctx.arc(x, y - 4 * s, 20 * s, Math.PI, Math.PI * 2); ctx.closePath();
    ctx.fillStyle = '#a0522d'; ctx.fill();
    ctx.beginPath(); ctx.arc(x, y - 6 * s, 23 * s, Math.PI * 1.05, Math.PI * 1.95); ctx.lineWidth = 6 * s; ctx.strokeStyle = '#2f6a2e'; ctx.stroke();
    circle(ctx, x - 7 * s, y + 3 * s, 2.5 * s, OUT, null);
    circle(ctx, x + 7 * s, y + 3 * s, 2.5 * s, OUT, null);
    ctx.beginPath(); ctx.arc(x, y + 9 * s, 5 * s, 0.2, Math.PI - 0.2); ctx.lineWidth = 2 * s; ctx.strokeStyle = OUT; ctx.stroke();
  } else if (id === 'bram') {
    ellipse(ctx, x, y + 40 * s, 34 * s, 22 * s, '#a7b0bf');
    circle(ctx, x, y + 2 * s, 20 * s, SKIN, OUT, 2.5);
    ctx.beginPath(); ctx.arc(x, y - 2 * s, 22 * s, Math.PI, Math.PI * 2); ctx.lineTo(x + 22 * s, y + 4 * s); ctx.lineTo(x - 22 * s, y + 4 * s); ctx.closePath();
    ctx.fillStyle = '#a7b0bf'; ctx.fill(); ctx.lineWidth = 2.5; ctx.strokeStyle = OUT; ctx.stroke();
    line(ctx, x, y - 24 * s, x, y + 2 * s, '#7d8696', 3 * s);
    ctx.beginPath(); ctx.moveTo(x, y - 22 * s); ctx.quadraticCurveTo(x + 12 * s, y - 40 * s, x - 14 * s, y - 36 * s); ctx.lineWidth = 6 * s; ctx.strokeStyle = '#d23b3b'; ctx.stroke();
    circle(ctx, x - 7 * s, y + 8 * s, 2.5 * s, OUT, null);
    circle(ctx, x + 7 * s, y + 8 * s, 2.5 * s, OUT, null);
    ctx.beginPath(); ctx.moveTo(x - 10 * s, y + 18 * s); ctx.quadraticCurveTo(x, y + 26 * s, x + 10 * s, y + 18 * s); ctx.fillStyle = '#8a5a3a'; ctx.fill();
  } else if (id === 'vex') {
    ellipse(ctx, x, y + 42 * s, 32 * s, 22 * s, '#1f7a8c');
    ctx.beginPath(); ctx.moveTo(x - 27 * s, y + 30 * s); ctx.quadraticCurveTo(x - 30 * s, y - 20 * s, x, y - 34 * s);
    ctx.quadraticCurveTo(x + 30 * s, y - 20 * s, x + 27 * s, y + 30 * s); ctx.closePath();
    ctx.fillStyle = '#176070'; ctx.fill(); ctx.lineWidth = 2.5; ctx.strokeStyle = OUT; ctx.stroke();
    circle(ctx, x, y + 4 * s, 17 * s, '#e9d2c0', OUT, 2.5);
    ctx.beginPath(); ctx.moveTo(x - 17 * s, y); ctx.quadraticCurveTo(x - 4 * s, y - 16 * s, x + 17 * s, y - 2 * s);
    ctx.lineTo(x + 14 * s, y - 14 * s); ctx.quadraticCurveTo(x, y - 22 * s, x - 14 * s, y - 12 * s); ctx.closePath();
    ctx.fillStyle = '#e8eef2'; ctx.fill();
    ctx.save(); ctx.shadowColor = '#7ff0ff'; ctx.shadowBlur = 8;
    circle(ctx, x - 6 * s, y + 5 * s, 2.8 * s, '#7ff0ff', null);
    circle(ctx, x + 6 * s, y + 5 * s, 2.8 * s, '#7ff0ff', null);
    ctx.restore();
    ctx.strokeStyle = '#ffe36b'; ctx.lineWidth = 2.5 * s;
    ctx.beginPath(); ctx.moveTo(x + 2 * s, y + 30 * s); ctx.lineTo(x - 3 * s, y + 38 * s); ctx.lineTo(x + 3 * s, y + 38 * s); ctx.lineTo(x - 2 * s, y + 46 * s); ctx.stroke();
  } else {
    ellipse(ctx, x, y + 42 * s, 32 * s, 22 * s, '#6d3b98');
    circle(ctx, x, y + 6 * s, 18 * s, SKIN, OUT, 2.5);
    ctx.beginPath(); ctx.moveTo(x - 16 * s, y + 10 * s); ctx.quadraticCurveTo(x, y + 44 * s, x + 16 * s, y + 10 * s); ctx.fillStyle = '#e8e4dc'; ctx.fill(); ctx.lineWidth = 2; ctx.strokeStyle = OUT; ctx.stroke();
    ctx.beginPath(); ctx.moveTo(x - 30 * s, y - 4 * s); ctx.quadraticCurveTo(x, y - 12 * s, x + 30 * s, y - 4 * s); ctx.lineTo(x + 6 * s, y - 44 * s); ctx.lineTo(x - 4 * s, y - 40 * s); ctx.closePath();
    ctx.fillStyle = '#5a2f82'; ctx.fill(); ctx.lineWidth = 2.5; ctx.strokeStyle = OUT; ctx.stroke();
    circle(ctx, x - 6 * s, y + 4 * s, 2.5 * s, OUT, null);
    circle(ctx, x + 6 * s, y + 4 * s, 2.5 * s, OUT, null);
    ctx.save(); ctx.shadowColor = '#ffb347'; ctx.shadowBlur = 10; circle(ctx, x + 2 * s, y - 20 * s, 4 * s, '#ffcf5a', null); ctx.restore();
  }
  ctx.restore();
}

// ------------------------------------------------------------------ towers
export function drawPad(ctx, x, y, hl = false) {
  shadow(ctx, x, y + 6, 34, 14, 0.25);
  ellipse(ctx, x, y, 33, 24, hl ? '#cfc3a8' : '#a99d86', '#5d5446', 3);
  ellipse(ctx, x, y - 2, 24, 16, hl ? '#ddd2b9' : '#bcb09a', null);
  ctx.globalAlpha = hl ? 0.9 : 0.45;
  line(ctx, x - 8, y - 2, x + 8, y - 2, '#5d5446', 3);
  line(ctx, x, y - 9, x, y + 5, '#5d5446', 3);
  ctx.globalAlpha = 1;
}

export function drawTower(ctx, tw, time) {
  const { x, y, level } = tw;
  shadow(ctx, x, y + 8, 34, 14, 0.3);
  if (tw.type === 'arrow') {
    // stone base
    ellipse(ctx, x, y, 30, 20, '#8f8577', OUT, 3);
    // wooden tower body
    ctx.fillStyle = '#7a5434';
    ctx.fillRect(x - 20, y - 52, 40, 52);
    ctx.lineWidth = 3; ctx.strokeStyle = OUT; ctx.strokeRect(x - 20, y - 52, 40, 52);
    line(ctx, x - 20, y - 26, x + 20, y - 26, '#56391f', 3);
    line(ctx, x - 20, y - 52, x + 20, y - 26, '#56391f', 2);
    // platform
    ctx.fillStyle = '#9a6a45';
    ctx.fillRect(x - 26, y - 62, 52, 12);
    ctx.strokeRect(x - 26, y - 62, 52, 12);
    // archer head peeking
    const pa = tw.anim * 3;
    circle(ctx, x, y - 68 + pa, 8, SKIN, OUT, 2.5);
    ctx.beginPath(); ctx.arc(x, y - 70 + pa, 8.5, Math.PI, 0); ctx.fillStyle = '#3d7d3a'; ctx.fill();
    // roof
    ctx.beginPath();
    ctx.moveTo(x - 30, y - 74); ctx.lineTo(x, y - 98); ctx.lineTo(x + 30, y - 74);
    ctx.closePath();
    ctx.fillStyle = level >= 3 ? '#c9372c' : level === 2 ? '#a8432f' : '#7d4b2b';
    ctx.fill(); ctx.stroke();
    line(ctx, x - 26, y - 74, x - 26, y - 62, '#56391f', 3);
    line(ctx, x + 26, y - 74, x + 26, y - 62, '#56391f', 3);
    if (level >= 2) { // banner
      line(ctx, x, y - 98, x, y - 116, '#4a3020', 2.5);
      ctx.beginPath(); ctx.moveTo(x, y - 116); ctx.lineTo(x + 16, y - 111 + Math.sin(time * 4) * 2); ctx.lineTo(x, y - 106); ctx.closePath();
      ctx.fillStyle = level >= 3 ? '#ffd23f' : '#e8e0cf'; ctx.fill();
    }
  } else if (tw.type === 'frost') {
    ellipse(ctx, x, y, 30, 20, '#8f8577', OUT, 3);
    ctx.beginPath();
    ctx.moveTo(x - 20, y - 2); ctx.lineTo(x + 20, y - 2); ctx.lineTo(x + 13, y - 38); ctx.lineTo(x - 13, y - 38); ctx.closePath();
    ctx.fillStyle = '#a9b8c6'; ctx.fill(); ctx.lineWidth = 3; ctx.strokeStyle = OUT; ctx.stroke();
    line(ctx, x - 16, y - 18, x + 16, y - 18, '#7d8c9a', 2);
    const glow = 0.5 + 0.5 * Math.sin(time * 3 + x);
    const g = ctx.createRadialGradient(x, y - 66, 4, x, y - 66, 46);
    g.addColorStop(0, `rgba(190,240,255,${0.35 + 0.25 * glow + tw.anim * 0.4})`); g.addColorStop(1, 'rgba(190,240,255,0)');
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y - 66, 46, 0, TAU); ctx.fill();
    if (level >= 2) { shard(ctx, x - 13, y - 36, 7, 26, '#d8f3ff'); shard(ctx, x + 13, y - 36, 7, 26, '#d8f3ff'); }
    shard(ctx, x, y - 36, 12, 48 + level * 6, '#bfe9ff');
    if (level >= 3) {
      ctx.fillStyle = '#ffffff';
      ctx.font = '18px sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText('✦', x, y - 92 - level * 6 + Math.sin(time * 2) * 3);
    }
  } else if (tw.type === 'mage') {
    ellipse(ctx, x, y, 30, 20, '#7a6f86', OUT, 3);
    ctx.fillStyle = '#6b5a86';
    ctx.fillRect(x - 17, y - 66, 34, 66);
    ctx.lineWidth = 3; ctx.strokeStyle = OUT; ctx.strokeRect(x - 17, y - 66, 34, 66);
    for (const ly of [y - 22, y - 44]) line(ctx, x - 17, ly, x + 17, ly, '#4e4066', 2);
    if (level >= 2) {
      ctx.fillStyle = `rgba(230,150,255,${0.6 + 0.4 * Math.sin(time * 4)})`;
      ctx.fillRect(x - 4, y - 38, 8, 12);
    }
    ctx.beginPath(); ctx.moveTo(x - 24, y - 64); ctx.lineTo(x, y - 100); ctx.lineTo(x + 24, y - 64); ctx.closePath();
    ctx.fillStyle = '#4a2f6a'; ctx.fill(); ctx.strokeStyle = level >= 3 ? '#e8b84a' : OUT; ctx.lineWidth = 3; ctx.stroke();
    const oy = y - 116 + Math.sin(time * 2.5 + x) * 4 + tw.anim * 4;
    const orb = 8 + level * 1.5;
    const g = ctx.createRadialGradient(x, oy, 1, x, oy, orb * 2.4);
    g.addColorStop(0, '#fff0ff'); g.addColorStop(0.35, '#d07aff'); g.addColorStop(1, 'rgba(160,60,255,0)');
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, oy, orb * 2.4, 0, TAU); ctx.fill();
    if (level >= 3) {
      for (let i = 0; i < 3; i++) {
        const a = time * 3 + (i * TAU) / 3;
        circle(ctx, x + Math.cos(a) * 18, oy + Math.sin(a) * 7, 2.5, '#f4c8ff', null);
      }
    }
  } else {
    // cannon
    ellipse(ctx, x, y, 32, 21, '#7f7569', OUT, 3);
    ctx.fillStyle = '#9b9183';
    ctx.fillRect(x - 28, y - 30, 56, 30);
    ctx.lineWidth = 3; ctx.strokeStyle = OUT; ctx.strokeRect(x - 28, y - 30, 56, 30);
    for (let i = -1; i <= 1; i++) line(ctx, x + i * 18, y - 30, x + i * 18, y, '#6f6659', 2);
    ellipse(ctx, x, y - 30, 28, 12, '#b4aa9b', OUT, 3);
    // barrel rotates to aim
    ctx.save();
    ctx.translate(x, y - 34);
    ctx.rotate(tw.angle + Math.PI / 2);
    const recoil = tw.anim * 6;
    const bl = 30 + level * 3;
    ctx.fillStyle = level >= 3 ? '#3a3440' : '#2e2b2b';
    ctx.beginPath();
    ctx.moveTo(-9, recoil); ctx.lineTo(9, recoil); ctx.lineTo(7, -bl + recoil); ctx.lineTo(-7, -bl + recoil); ctx.closePath();
    ctx.fill(); ctx.lineWidth = 2.5; ctx.strokeStyle = '#111'; ctx.stroke();
    ctx.fillStyle = level >= 3 ? '#d9a531' : '#555';
    ctx.fillRect(-9, -bl + recoil - 3, 18, 6);
    ctx.restore();
    circle(ctx, x, y - 34, 10, '#4a4040', OUT, 2.5);
  }
  // level pips
  for (let i = 0; i < level; i++) {
    const px = x - (level - 1) * 8 + i * 16;
    circle(ctx, px, y + 14, 5, '#ffd23f', '#6b4a0a', 2);
  }
}

function shard(ctx, cx, baseY, w, h, color) {
  ctx.beginPath();
  ctx.moveTo(cx, baseY - h);
  ctx.lineTo(cx + w, baseY - h * 0.4);
  ctx.lineTo(cx, baseY);
  ctx.lineTo(cx - w, baseY - h * 0.4);
  ctx.closePath();
  ctx.fillStyle = color; ctx.fill();
  ctx.lineWidth = 2.5; ctx.strokeStyle = '#3d6e94'; ctx.stroke();
  line(ctx, cx, baseY - h + 4, cx - w * 0.45, baseY - h * 0.45, 'rgba(255,255,255,0.85)', 2);
}

// Jagged lightning through a list of [x, y] points. Re-randomised each frame for flicker.
export function drawLightning(ctx, pts, alpha = 1) {
  const path = [];
  for (let i = 0; i < pts.length - 1; i++) {
    const [ax, ay] = pts[i], [bx, by] = pts[i + 1];
    const n = Math.max(3, Math.round(Math.hypot(bx - ax, by - ay) / 22));
    for (let k = 0; k < n; k++) {
      const t = k / n;
      const j = k === 0 ? 0 : 9;
      path.push([ax + (bx - ax) * t + (Math.random() - 0.5) * j * 2, ay + (by - ay) * t + (Math.random() - 0.5) * j * 2]);
    }
  }
  path.push(pts[pts.length - 1]);
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.lineJoin = 'round'; ctx.lineCap = 'round';
  for (const [w, c] of [[9, 'rgba(90,200,255,0.35)'], [4, '#9ee8ff'], [1.8, '#ffffff']]) {
    ctx.beginPath();
    path.forEach(([px, py], i) => (i ? ctx.lineTo(px, py) : ctx.moveTo(px, py)));
    ctx.lineWidth = w; ctx.strokeStyle = c; ctx.stroke();
  }
  ctx.restore();
}

// -------------------------------------------------------------- the wall
export function drawWall(ctx, W, wallY, hpFrac, time) {
  const h = 84;
  const g = ctx.createLinearGradient(0, wallY, 0, wallY + h);
  g.addColorStop(0, '#a49a8b');
  g.addColorStop(1, '#6e665b');
  // walkway top
  ctx.fillStyle = '#8a8172';
  ctx.fillRect(0, wallY - 4, W, 30);
  // face
  ctx.fillStyle = g;
  ctx.fillRect(0, wallY + 26, W, h - 26);
  ctx.strokeStyle = 'rgba(40,30,22,0.55)';
  ctx.lineWidth = 2;
  for (let row = 0; row < 3; row++) {
    const yy = wallY + 26 + row * 19;
    ctx.beginPath(); ctx.moveTo(0, yy); ctx.lineTo(W, yy); ctx.stroke();
    for (let xx = (row % 2) * 24; xx < W; xx += 48) {
      ctx.beginPath(); ctx.moveTo(xx, yy); ctx.lineTo(xx, yy + 19); ctx.stroke();
    }
  }
  // crenellations along the field side
  for (let xx = 0; xx < W; xx += 48) {
    ctx.fillStyle = '#b3a998';
    ctx.fillRect(xx + 4, wallY - 20, 30, 18);
    ctx.lineWidth = 2.5; ctx.strokeStyle = '#3b2f25';
    ctx.strokeRect(xx + 4, wallY - 20, 30, 18);
  }
  ctx.fillStyle = 'rgba(0,0,0,0.25)';
  ctx.fillRect(0, wallY + 22, W, 5);
  // cracks as HP falls
  ctx.strokeStyle = '#2b2119';
  ctx.lineWidth = 3;
  ctx.lineJoin = 'round';
  const cracks = [
    [[150, 30], [162, 48], [154, 64], [168, 80]],
    [[520, 28], [508, 44], [522, 58], [512, 78]],
    [[330, 30], [346, 46], [336, 60], [352, 82]],
    [[60, 34], [74, 52], [64, 70]],
    [[640, 30], [628, 50], [642, 68]],
  ];
  const n = hpFrac > 0.75 ? 0 : hpFrac > 0.5 ? 2 : hpFrac > 0.25 ? 3 : 5;
  for (let i = 0; i < n; i++) {
    ctx.beginPath();
    cracks[i].forEach(([cx, cy], j) => (j ? ctx.lineTo(cx, wallY + cy) : ctx.moveTo(cx, wallY + cy)));
    ctx.stroke();
  }
  // banners
  for (const bx of [255, 465]) {
    const wave = Math.sin(time * 2 + bx) * 2;
    ctx.fillStyle = '#9e2a2a';
    ctx.beginPath();
    ctx.moveTo(bx - 14, wallY + 28); ctx.lineTo(bx + 14, wallY + 28);
    ctx.lineTo(bx + 14 + wave, wallY + 74); ctx.lineTo(bx + wave, wallY + 64); ctx.lineTo(bx - 14 + wave, wallY + 74);
    ctx.closePath(); ctx.fill();
    ctx.lineWidth = 2; ctx.strokeStyle = '#3b1414'; ctx.stroke();
    circle(ctx, bx + wave * 0.5, wallY + 44, 6, '#f2c14e', '#6b4a0a', 2);
  }
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
  return c;
}
