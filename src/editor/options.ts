// Turns project content into picker options and readable names.
import type { Project, SceneObject } from '../model/types';
import type { Option } from './ui';

export function objectIcon(p: Project, o: SceneObject): string | undefined {
  if (o.kind === 'character' && o.ref) return p.characters[o.ref]?.spriteId;
  if (o.kind === 'item' && o.ref) return o.spriteId ?? p.items[o.ref]?.spriteId;
  return o.spriteId;
}

export function findObject(p: Project, id: string): { o: SceneObject; sceneId: string } | undefined {
  for (const s of Object.values(p.scenes)) {
    const o = s.objects.find((x) => x.id === id);
    if (o) return { o, sceneId: s.id };
  }
  return undefined;
}

export const itemOptions = (p: Project): Option[] =>
  Object.values(p.items).map((i) => ({ id: i.id, label: i.name, icon: i.spriteId }));

export const objectOptions = (p: Project, onlyScene?: string): Option[] =>
  Object.values(p.scenes)
    .filter((s) => !onlyScene || s.id === onlyScene)
    .flatMap((s) => s.objects.map((o) => ({ id: o.id, label: o.name, icon: objectIcon(p, o), group: s.name })));

export const sceneOptions = (p: Project): Option[] =>
  Object.values(p.scenes).map((s) => ({ id: s.id, label: s.name, icon: s.background.spriteId }));

export const characterOptions = (p: Project): Option[] =>
  Object.values(p.characters).map((c) => ({ id: c.id, label: c.name, icon: c.spriteId }));

export const dialogueOptions = (p: Project): Option[] =>
  Object.values(p.dialogues).map((d) => ({ id: d.id, label: d.name }));

export const flagOptions = (p: Project): Option[] =>
  Object.entries(p.flags).map(([id, f]) => ({ id, label: f.name }));

export const stepOptions = (p: Project): Option[] =>
  Object.values(p.quests).flatMap((q) => q.steps.map((s) => ({ id: `${q.id}/${s.id}`, label: s.text, group: q.name })));

export const animOptions = (p: Project): Option[] =>
  Object.values(p.animations).map((a) => ({ id: a.id, label: a.name, icon: a.frames[0]?.spriteId }));

export const soundOptions = (p: Project): Option[] =>
  Object.entries(p.sounds).map(([id, s]) => ({ id, label: s.name }));

export const isBackground = (w: number, h: number) => w >= 200 && h >= 100;

export const backgroundOptions = (p: Project): Option[] =>
  Object.values(p.sprites).filter((s) => isBackground(s.w, s.h)).map((s) => ({ id: s.id, label: s.name, icon: s.id }));

export const propOptions = (p: Project): Option[] =>
  Object.values(p.sprites).filter((s) => !isBackground(s.w, s.h)).map((s) => ({ id: s.id, label: s.name, icon: s.id }));

export function sceneOfRule(p: Project, r: Project['rules'][number]): string | undefined {
  const w = r.when;
  if (w.type === 'enterScene') return w.sceneId;
  if (w.type === 'click' || w.type === 'useItem') return findObject(p, w.objectId)?.sceneId;
  return undefined;
}
