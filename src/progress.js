import { save } from './save.js';
import { STAGES, ENDLESS } from './data/stages.js';
import { HEROES } from './data/units.js';

const d = save.data;
d.best ??= {};
d.endlessBest ??= 0;
d.lineup ??= ['wren', 'bram', 'ignis'];
d.seenUnlocks ??= [];

export const cleared = (id) => (d.best[id] || 0) > 0;
export const stageUnlocked = (i) => i === 0 || cleared(STAGES[i - 1].id);
export const endlessUnlocked = () => cleared(ENDLESS.unlock);
export const heroUnlocked = (h) => !h.unlock || cleared(h.unlock);
export const unlockedHeroes = () => HEROES.filter(heroUnlocked);
export const totalStars = () => STAGES.reduce((s, st) => s + (d.best[st.id] || 0), 0);

// Lineup of exactly 3 unlocked hero defs (falls back to defaults if the save is odd).
export function lineup() {
  const ids = d.lineup.filter((id) => unlockedHeroes().some((h) => h.id === id));
  for (const h of unlockedHeroes()) if (ids.length < 3 && !ids.includes(h.id)) ids.push(h.id);
  return ids.slice(0, 3).map((id) => HEROES.find((h) => h.id === id));
}

// Things that became available after clearing `stageId` for the first time.
export function unlocksFrom(stageId) {
  const out = [];
  const i = STAGES.findIndex((s) => s.id === stageId);
  if (i >= 0 && STAGES[i + 1]) out.push(`Stage ${STAGES[i + 1].id}: ${STAGES[i + 1].name}`);
  for (const h of HEROES) if (h.unlock === stageId) out.push(`New hero: ${h.name} the ${h.role}`);
  if (ENDLESS.unlock === stageId) out.push('Endless Siege mode');
  return out;
}
