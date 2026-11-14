const KEY = 'emberhold.v1';

const data = { best: {}, sound: true };
try {
  const raw = localStorage.getItem(KEY);
  if (raw) Object.assign(data, JSON.parse(raw));
} catch (e) { /* storage unavailable: play without saving */ }

export const save = {
  data,
  write() {
    try { localStorage.setItem(KEY, JSON.stringify(data)); } catch (e) { /* ignore */ }
  },
};
