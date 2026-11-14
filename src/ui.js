export const FONT = (size, weight = 800) =>
  `${weight} ${size}px ui-rounded, "SF Pro Rounded", system-ui, -apple-system, "Segoe UI", Roboto, sans-serif`;

export function roundRect(ctx, x, y, w, h, r) {
  r = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

export function text(ctx, str, x, y, { size = 28, color = '#fff', align = 'center', base = 'middle', weight = 800, stroke = 'rgba(30,18,10,0.9)', lw = 0 } = {}) {
  ctx.font = FONT(size, weight);
  ctx.textAlign = align;
  ctx.textBaseline = base;
  if (lw > 0) {
    ctx.lineJoin = 'round';
    ctx.lineWidth = lw;
    ctx.strokeStyle = stroke;
    ctx.strokeText(str, x, y);
  }
  ctx.fillStyle = color;
  ctx.fillText(str, x, y);
}

const PALETTE = {
  gold:  ['#ffd866', '#e8a52a', '#7a4a10'],
  green: ['#8fdc6a', '#3f9a36', '#1d4d1a'],
  red:   ['#ff8a70', '#c8412e', '#5e1a10'],
  blue:  ['#8cc4ff', '#3b78c8', '#173a66'],
  grey:  ['#a39c95', '#6b645e', '#35302c'],
  wood:  ['#9a6a45', '#6b4529', '#2e1d11'],
};

export function button(ctx, r, label, { color = 'gold', size = 30, sub = null, disabled = false, icon = null } = {}) {
  const [hi, mid, dark] = PALETTE[disabled ? 'grey' : color];
  ctx.save();
  roundRect(ctx, r.x, r.y + 5, r.w, r.h, 16);
  ctx.fillStyle = dark;
  ctx.fill();
  roundRect(ctx, r.x, r.y, r.w, r.h, 16);
  const g = ctx.createLinearGradient(0, r.y, 0, r.y + r.h);
  g.addColorStop(0, hi);
  g.addColorStop(1, mid);
  ctx.fillStyle = g;
  ctx.fill();
  ctx.lineWidth = 3;
  ctx.strokeStyle = dark;
  ctx.stroke();
  // gloss
  roundRect(ctx, r.x + 6, r.y + 4, r.w - 12, r.h * 0.38, 12);
  ctx.fillStyle = 'rgba(255,255,255,0.18)';
  ctx.fill();
  const cy = sub ? r.y + r.h * 0.4 : r.y + r.h / 2 + 1;
  text(ctx, (icon ? icon + ' ' : '') + label, r.x + r.w / 2, cy, { size, lw: 5, stroke: dark });
  if (sub) text(ctx, sub, r.x + r.w / 2, r.y + r.h * 0.75, { size: size * 0.6, lw: 4, stroke: dark, color: '#fff3d6' });
  ctx.restore();
}

export function panel(ctx, x, y, w, h, { fill = '#3a281d', stroke = '#170e09', inner = '#5a3f2c', r = 20 } = {}) {
  roundRect(ctx, x, y + 6, w, h, r);
  ctx.fillStyle = 'rgba(0,0,0,0.35)';
  ctx.fill();
  roundRect(ctx, x, y, w, h, r);
  ctx.fillStyle = fill;
  ctx.fill();
  ctx.lineWidth = 4;
  ctx.strokeStyle = stroke;
  ctx.stroke();
  roundRect(ctx, x + 6, y + 6, w - 12, h - 12, r - 6);
  ctx.lineWidth = 2;
  ctx.strokeStyle = inner;
  ctx.stroke();
}

// Word-wrapped text; returns the number of lines drawn.
export function wrapText(ctx, str, x, y, maxW, lineH, opts = {}) {
  ctx.font = FONT(opts.size || 20, opts.weight || 700);
  const words = str.split(' ');
  const lines = [];
  let cur = '';
  for (const w of words) {
    const test = cur ? `${cur} ${w}` : w;
    if (ctx.measureText(test).width > maxW && cur) { lines.push(cur); cur = w; } else cur = test;
  }
  if (cur) lines.push(cur);
  lines.forEach((l, i) => text(ctx, l, x, y + i * lineH, opts));
  return lines.length;
}

export function star(ctx, x, y, r, filled) {
  ctx.beginPath();
  for (let i = 0; i < 10; i++) {
    const a = -Math.PI / 2 + (i * Math.PI) / 5;
    const rr = i % 2 === 0 ? r : r * 0.45;
    ctx.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr);
  }
  ctx.closePath();
  ctx.fillStyle = filled ? '#ffd23f' : '#3d2c22';
  ctx.fill();
  ctx.lineWidth = 3;
  ctx.strokeStyle = filled ? '#8a5a0a' : '#1f150f';
  ctx.stroke();
}

export function coin(ctx, x, y, r) {
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fillStyle = '#f5c242';
  ctx.fill();
  ctx.lineWidth = 3;
  ctx.strokeStyle = '#8a5a0a';
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(x, y, r * 0.55, 0, Math.PI * 2);
  ctx.strokeStyle = '#c98f1c';
  ctx.lineWidth = 2;
  ctx.stroke();
}
