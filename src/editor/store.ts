// Project store: one Project, edited through `update()`. Every change is recorded as
// Immer patches so undo/redo works in every studio. Saves to IndexedDB automatically.
import { applyPatches, enablePatches, produceWithPatches, type Patch, type Draft } from 'immer';
import { get as idbGet, set as idbSet } from 'idb-keyval';
import { useSyncExternalStore } from 'react';
import type { Project } from '../model/types';
import { createStarterProject } from '../model/starterProject';
import { createEmptyProject } from '../model/emptyProject';
import { renderBg } from '../model/bgArt';

enablePatches();

interface Step { patches: Patch[]; inverse: Patch[]; key?: string; at: number }
type SaveState = 'saved' | 'saving' | 'error' | 'idle';

const SAVE_KEY = 'shulia-project-v1';
let project: Project = createStarterProject();
let past: Step[] = [];
let future: Step[] = [];
let saveState: SaveState = 'idle';
let version = 0;
const listeners = new Set<() => void>();
let saveTimer: number | undefined;

function emit() { version++; for (const l of listeners) l(); }

function scheduleSave() {
  window.clearTimeout(saveTimer);
  saveState = 'saving';
  saveTimer = window.setTimeout(async () => {
    try { await idbSet(SAVE_KEY, project); saveState = 'saved'; } catch { saveState = 'error'; }
    emit();
  }, 700);
}

/** Change the project. Pass `key` to merge quick repeated edits (typing, dragging) into one undo step. */
export function update(recipe: (d: Draft<Project>) => void, key?: string) {
  const [next, patches, inverse] = produceWithPatches(project, recipe);
  if (!patches.length) return;
  project = next;
  const now = Date.now();
  const last = past[past.length - 1];
  if (key && last && last.key === key && now - last.at < 1500) {
    last.patches.push(...patches);
    last.inverse.unshift(...inverse);
    last.at = now;
  } else {
    past.push({ patches, inverse, key, at: now });
    if (past.length > 200) past.shift();
  }
  future = [];
  scheduleSave();
  emit();
}

export function undo() {
  const s = past.pop();
  if (!s) return;
  project = applyPatches(project, s.inverse);
  future.push(s);
  scheduleSave();
  emit();
}

export function redo() {
  const s = future.pop();
  if (!s) return;
  project = applyPatches(project, s.patches);
  past.push(s);
  scheduleSave();
  emit();
}

export function replaceProject(p: Project) {
  project = p; past = []; future = [];
  scheduleSave();
  emit();
}
export const resetToStarter = () => replaceProject(createStarterProject());
export const resetToEmpty = () => replaceProject(createEmptyProject());

export async function loadSaved(): Promise<boolean> {
  try {
    const saved = await idbGet<Project>(SAVE_KEY);
    if (saved && saved.version === 1 && saved.scenes) {
      project = migrateNight(saved); saveState = 'saved'; emit();
      return true;
    }
  } catch { /* storage blocked: keep the starter project in memory */ }
  return false;
}

const subscribe = (l: () => void) => { listeners.add(l); return () => listeners.delete(l); };
export const getProject = () => project;

export function useProject(): Project {
  return useSyncExternalStore(subscribe, () => project);
}
export function useHistory() {
  useSyncExternalStore(subscribe, () => version);
  return { canUndo: past.length > 0, canRedo: future.length > 0, saveState };
}

/** Day or night for every scene at once. */
export function setAllScenesNight(on: boolean) {
  update((d) => { for (const sc of Object.values(d.scenes)) { if (on) sc.night = true; else delete sc.night; } });
}

/**
 * Older saves had night painted into the pictures themselves. Put the starter pictures back
 * to day and show those scenes at night instead, so the new day/night switch can go both ways.
 */
function migrateNight(p: Project): Project {
  const st = createStarterProject();
  const fixed = new Set<string>();
  for (const s of Object.values(p.sprites)) {
    if (s.night && !s.bg && st.sprites[s.id]) {
      // keep the old picture too, in case it had the child's own changes in it
      const keep = `${s.id}_before`;
      if (!p.sprites[keep]) p.sprites[keep] = { ...s, id: keep, name: `${s.name} (הגרסה הקודמת)` };
      p.sprites[s.id] = st.sprites[s.id];
      fixed.add(s.id);
    }
    else if (s.bg?.night && !s.bg.baseImage) {
      const rec = { ...s.bg, night: undefined };
      p.sprites[s.id] = { ...s, bg: rec, dataUrl: renderBg(rec).toDataURL('image/png') };
      fixed.add(s.id);
    }
  }
  for (const sc of Object.values(p.scenes)) if (sc.background.spriteId && fixed.has(sc.background.spriteId)) sc.night = true;
  return p;
}

export const newId = (prefix: string) => `${prefix}_${Math.random().toString(36).slice(2, 8)}`;

// read-only hook for automated playtests
(window as unknown as { __project?: () => Project }).__project = () => project;
