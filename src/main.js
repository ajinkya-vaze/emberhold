import { view } from './view.js';
import { audio } from './audio.js';
import { save } from './save.js';
import { Menu } from './scenes/menu.js';
import { Battle } from './scenes/battle.js';
import { Campaign } from './scenes/campaign.js';
import './progress.js';

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
audio.enabled = save.data.sound !== false;

const game = {
  scene: null,
  // go('menu') | go('campaign', sel?) | go('battle', stageIndex | 'endless')
  go(name, arg) {
    if (name === 'battle') this.scene = new Battle(this, arg);
    else if (name === 'campaign') this.scene = new Campaign(this, arg);
    else this.scene = new Menu(this);
  },
};

function resize() {
  const cw = window.innerWidth, ch = window.innerHeight;
  const W = 720;
  const H = Math.round(Math.min(1700, Math.max(1100, (W * ch) / cw)));
  const scale = Math.min(cw / W, ch / H);
  const dpr = Math.min(window.devicePixelRatio || 1, 3);
  canvas.style.width = `${W * scale}px`;
  canvas.style.height = `${H * scale}px`;
  canvas.width = Math.round(W * scale * dpr);
  canvas.height = Math.round(H * scale * dpr);
  const probe = getComputedStyle(document.getElementById('safe'));
  Object.assign(view, {
    W, H, scale, dpr,
    safeTop: (parseFloat(probe.paddingTop) || 0) / scale,
    safeBottom: (parseFloat(probe.paddingBottom) || 0) / scale,
  });
  game.scene?.resize?.();
}

function toLogical(e) {
  const r = canvas.getBoundingClientRect();
  return [(e.clientX - r.left) / view.scale, (e.clientY - r.top) / view.scale];
}

canvas.addEventListener('pointerdown', (e) => {
  e.preventDefault();
  audio.unlock();
  const [x, y] = toLogical(e);
  game.scene.pointerMove?.(x, y);
  game.scene.pointerDown?.(x, y);
});
canvas.addEventListener('pointermove', (e) => {
  const [x, y] = toLogical(e);
  game.scene.pointerMove?.(x, y);
});
document.addEventListener('gesturestart', (e) => e.preventDefault());
document.addEventListener('visibilitychange', () => { if (document.hidden) game.scene?.onHide?.(); });
window.addEventListener('resize', resize);

resize();
game.go('menu');

let last = performance.now();
function frame(now) {
  const dt = Math.min(0.05, (now - last) / 1000);
  last = now;
  game.scene.update(dt);
  ctx.setTransform(view.scale * view.dpr, 0, 0, view.scale * view.dpr, 0, 0);
  game.scene.render(ctx);
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);

// Handy for debugging in the browser console.
window.__game = game;

// Offline support (needs HTTPS, or localhost).
if ('serviceWorker' in navigator && window.isSecureContext) {
  navigator.serviceWorker.register('./sw.js').catch(() => { /* offline mode unavailable */ });
}

// iOS may evict storage for websites; ask for persistent storage where supported.
navigator.storage?.persist?.().catch(() => {});
