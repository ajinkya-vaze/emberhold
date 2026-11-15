import { save } from './save.js';
import { STAGES, ENDLESS } from './data/stages.js';

const d = save.data;
d.best ??= {};
d.endlessBest ??= 0;

export const cleared = (id) => (d.best[id] || 0) > 0;
export const stageUnlocked = (i) => i === 0 || cleared(STAGES[i - 1].id);
export const endlessUnlocked = () => cleared(ENDLESS.unlock);
export const totalStars = () => STAGES.reduce((s, st) => s + (d.best[st.id] || 0), 0);

// Things that became available after clearing `stageId` for the first time.
export function unlocksFrom(stageId) {
  const out = [];
  const i = STAGES.findIndex((s) => s.id === stageId);
  if (i >= 0 && STAGES[i + 1]) out.push(`Stage ${STAGES[i + 1].id}: ${STAGES[i + 1].name}`);
  if (ENDLESS.unlock === stageId) out.push('Endless Siege mode');
  return out;
}
