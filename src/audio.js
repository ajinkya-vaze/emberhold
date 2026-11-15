// Tiny synthesized sound effects (no audio files needed).
let ac = null;
let master = null;
let noiseBuf = null;
let enabled = true;
const lastPlayed = {};
const MIN_GAP = { bow: 0.06, hit: 0.05, coin: 0.07, wall: 0.18, fire: 0.08, cannon: 0.08, frost: 0.15, zap: 0.06, arcane: 0.08, heal: 0.3, ebolt: 0.1, thunder: 0.12, hurt: 0.15, pay: 0.05, pickup: 0.04 };

function tone(t, { type = 'sine', f0, f1, dur, vol = 0.3, attack = 0.005 }) {
  const o = ac.createOscillator();
  const g = ac.createGain();
  o.type = type;
  o.frequency.setValueAtTime(f0, t);
  if (f1) o.frequency.exponentialRampToValueAtTime(f1, t + dur);
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(vol, t + attack);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g);
  g.connect(master);
  o.start(t);
  o.stop(t + dur + 0.02);
}

function noise(t, { dur, vol = 0.3, freq = 1000, f1, q = 1, type = 'bandpass' }) {
  if (!noiseBuf) {
    noiseBuf = ac.createBuffer(1, ac.sampleRate, ac.sampleRate);
    const d = noiseBuf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  }
  const s = ac.createBufferSource();
  s.buffer = noiseBuf;
  const fl = ac.createBiquadFilter();
  fl.type = type;
  fl.frequency.setValueAtTime(freq, t);
  if (f1) fl.frequency.exponentialRampToValueAtTime(f1, t + dur);
  fl.Q.value = q;
  const g = ac.createGain();
  g.gain.setValueAtTime(vol, t);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  s.connect(fl);
  fl.connect(g);
  g.connect(master);
  s.start(t);
  s.stop(t + dur);
}

const notes = (t, freqs, step, dur, vol, type = 'triangle') =>
  freqs.forEach((f, i) => tone(t + i * step, { type, f0: f, dur, vol }));

const SFX = {
  bow: (t) => noise(t, { dur: 0.07, vol: 0.12, freq: 3200, q: 2 }),
  axe: (t) => noise(t, { dur: 0.12, vol: 0.12, freq: 900, f1: 400, q: 2 }),
  fire: (t) => noise(t, { dur: 0.25, vol: 0.16, freq: 900, f1: 250 }),
  cannon: (t) => {
    noise(t, { dur: 0.3, vol: 0.35, freq: 500, f1: 80, type: 'lowpass' });
    tone(t, { f0: 130, f1: 45, dur: 0.25, vol: 0.3 });
  },
  boom: (t) => {
    noise(t, { dur: 0.9, vol: 0.6, freq: 700, f1: 50, type: 'lowpass' });
    tone(t, { f0: 90, f1: 28, dur: 0.8, vol: 0.55 });
  },
  hit: (t) => noise(t, { dur: 0.05, vol: 0.08, freq: 1600, q: 3 }),
  coin: (t) => {
    tone(t, { type: 'square', f0: 988, dur: 0.05, vol: 0.04 });
    tone(t + 0.05, { type: 'square', f0: 1319, dur: 0.1, vol: 0.04 });
  },
  wall: (t) => noise(t, { dur: 0.16, vol: 0.22, freq: 260, type: 'lowpass' }),
  click: (t) => tone(t, { type: 'triangle', f0: 660, f1: 880, dur: 0.06, vol: 0.12 }),
  build: (t) => {
    noise(t, { dur: 0.1, vol: 0.2, freq: 500 });
    tone(t + 0.05, { type: 'triangle', f0: 300, f1: 620, dur: 0.16, vol: 0.15 });
  },
  sell: (t) => tone(t, { type: 'triangle', f0: 620, f1: 300, dur: 0.18, vol: 0.12 }),
  skill: (t) => tone(t, { type: 'sawtooth', f0: 220, f1: 880, dur: 0.3, vol: 0.08 }),
  shout: (t) => {
    tone(t, { type: 'sawtooth', f0: 150, f1: 90, dur: 0.55, vol: 0.18 });
    noise(t, { dur: 0.5, vol: 0.18, freq: 380 });
  },
  wave: (t) => notes(t, [392, 523, 659], 0.12, 0.25, 0.14),
  boon: (t) => notes(t, [659, 880, 1175], 0.08, 0.3, 0.11, 'sine'),
  win: (t) => notes(t, [523, 659, 784, 1047], 0.15, 0.45, 0.16),
  lose: (t) => notes(t, [392, 330, 262, 196], 0.2, 0.5, 0.16),
  roar: (t) => {
    tone(t, { type: 'sawtooth', f0: 110, f1: 60, dur: 0.7, vol: 0.2 });
    noise(t, { dur: 0.6, vol: 0.2, freq: 300, f1: 120 });
  },
  error: (t) => tone(t, { type: 'square', f0: 200, f1: 150, dur: 0.12, vol: 0.05 }),
  frost: (t) => {
    noise(t, { dur: 0.3, vol: 0.08, freq: 5000, f1: 2500, q: 4 });
    tone(t, { type: 'sine', f0: 1800, f1: 2400, dur: 0.2, vol: 0.04 });
  },
  zap: (t) => {
    noise(t, { dur: 0.12, vol: 0.12, freq: 2500, q: 0.7, type: 'highpass' });
    tone(t, { type: 'sawtooth', f0: 900, f1: 300, dur: 0.1, vol: 0.05 });
  },
  arcane: (t) => tone(t, { type: 'sine', f0: 520, f1: 1040, dur: 0.18, vol: 0.07 }),
  heal: (t) => notes(t, [523, 784], 0.07, 0.2, 0.06, 'sine'),
  summon: (t) => {
    tone(t, { type: 'sawtooth', f0: 200, f1: 400, dur: 0.4, vol: 0.08 });
    noise(t, { dur: 0.4, vol: 0.1, freq: 600, f1: 1500 });
  },
  thunder: (t) => {
    noise(t, { dur: 0.6, vol: 0.4, freq: 1500, f1: 100, type: 'lowpass' });
    noise(t, { dur: 0.08, vol: 0.25, freq: 4000, type: 'highpass' });
  },
  ebolt: (t) => noise(t, { dur: 0.06, vol: 0.08, freq: 2200, q: 3 }),
  hurt: (t) => {
    tone(t, { type: 'square', f0: 220, f1: 110, dur: 0.15, vol: 0.06 });
    noise(t, { dur: 0.1, vol: 0.12, freq: 700 });
  },
  pay: (t) => tone(t, { type: 'triangle', f0: 1200, f1: 1500, dur: 0.04, vol: 0.04 }),
  pickup: (t) => tone(t, { type: 'sine', f0: 1320, f1: 1760, dur: 0.07, vol: 0.06 }),
  smash: (t) => {
    noise(t, { dur: 0.45, vol: 0.35, freq: 500, f1: 120, type: 'lowpass' });
    tone(t, { type: 'triangle', f0: 160, f1: 60, dur: 0.3, vol: 0.2 });
  },
  respawn: (t) => notes(t, [523, 659, 784], 0.09, 0.25, 0.1),
};

export const audio = {
  unlock() {
    try {
      if (!ac) {
        const AC = window.AudioContext || window.webkitAudioContext;
        if (!AC) return;
        ac = new AC();
        master = ac.createGain();
        master.gain.value = 0.5;
        master.connect(ac.destination);
      }
      if (ac.state === 'suspended') ac.resume();
    } catch (e) { /* no audio */ }
  },
  get enabled() { return enabled; },
  set enabled(v) { enabled = v; },
  play(name) {
    if (!enabled || !ac || ac.state !== 'running') return;
    const t = ac.currentTime;
    if (lastPlayed[name] !== undefined && t - lastPlayed[name] < (MIN_GAP[name] ?? 0.03)) return;
    lastPlayed[name] = t;
    try { SFX[name]?.(t); } catch (e) { /* ignore */ }
  },
};
