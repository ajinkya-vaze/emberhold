export const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
export const lerp = (a, b, t) => a + (b - a) * t;
export const dist2 = (ax, ay, bx, by) => (bx - ax) ** 2 + (by - ay) ** 2;
export const smooth = (t) => { t = clamp(t, 0, 1); return t * t * (3 - 2 * t); };
export const rand = (a, b) => a + Math.random() * (b - a);
export const TAU = Math.PI * 2;

// Small seeded RNG so decorations stay put between frames/resizes.
export function rng(seed) {
  let s = seed >>> 0;
  return () => {
    s = (Math.imul(s, 1664525) + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

export function shuffle(arr) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export const inRect = (x, y, r) => x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h;

export class Path {
  constructor(pts) {
    this.pts = pts;
    this.segs = [];
    let L = 0;
    for (let i = 0; i < pts.length - 1; i++) {
      const a = pts[i], b = pts[i + 1];
      const len = Math.hypot(b[0] - a[0], b[1] - a[1]);
      this.segs.push({ a, b, len, start: L });
      L += len;
    }
    this.length = L;
  }
  // Point at distance d along the path, plus the unit direction of travel there.
  at(d) {
    const segs = this.segs;
    let s = segs[segs.length - 1];
    let t = 1;
    if (d <= 0) { s = segs[0]; t = 0; }
    else {
      for (const sg of segs) {
        if (d <= sg.start + sg.len) { s = sg; t = (d - sg.start) / sg.len; break; }
      }
    }
    const dx = (s.b[0] - s.a[0]) / (s.len || 1), dy = (s.b[1] - s.a[1]) / (s.len || 1);
    return { x: s.a[0] + (s.b[0] - s.a[0]) * t, y: s.a[1] + (s.b[1] - s.a[1]) * t, dx, dy };
  }
  // Closest point on the path: { d (distance along path), dist (off-path distance), dx, dy }.
  project(x, y) {
    let best = { d: 0, dist: Infinity, dx: 0, dy: 1 };
    for (const s of this.segs) {
      const [ax, ay] = s.a, [bx, by] = s.b;
      const vx = bx - ax, vy = by - ay;
      const t = clamp(((x - ax) * vx + (y - ay) * vy) / (vx * vx + vy * vy || 1), 0, 1);
      const dist = Math.hypot(x - (ax + vx * t), y - (ay + vy * t));
      if (dist < best.dist) best = { d: s.start + s.len * t, dist, dx: vx / (s.len || 1), dy: vy / (s.len || 1) };
    }
    return best;
  }
  // Shortest distance from a point to the path polyline.
  distTo(x, y) {
    let best = Infinity;
    for (const s of this.segs) {
      const [ax, ay] = s.a, [bx, by] = s.b;
      const dx = bx - ax, dy = by - ay;
      const t = clamp(((x - ax) * dx + (y - ay) * dy) / (dx * dx + dy * dy || 1), 0, 1);
      best = Math.min(best, Math.hypot(x - (ax + dx * t), y - (ay + dy * t)));
    }
    return best;
  }
}
