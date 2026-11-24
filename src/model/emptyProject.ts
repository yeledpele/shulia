// An empty project: one scene, one player, and the starter art library (until Phase 3 adds drawing).
import type { Project } from './types';
import { createStarterProject } from './starterProject';

export function createEmptyProject(): Project {
  const starter = createStarterProject();
  const now = new Date().toISOString();
  const keepAnims = ['anim_app_idle', 'anim_app_walk', 'anim_app_cheer', 'anim_cow_idle', 'anim_cow_moo', 'anim_bee', 'anim_sails'];
  return {
    version: 1,
    meta: { title: 'המשחק החדש שלי', author: '', createdAt: now, updatedAt: now },
    story: { text: '', notes: [] },
    startSceneId: 'scene_1',
    playerId: 'apprentice',
    characters: { apprentice: { ...starter.characters.apprentice, name: 'הגיבור' } },
    scenes: {
      scene_1: {
        id: 'scene_1', name: 'הסצנה הראשונה', background: { spriteId: 'bg_bakery', color: '#f1d6a8' },
        walkArea: { x: 40, y: 400, w: 880, h: 120 }, objects: [],
      },
    },
    items: {},
    dialogues: {},
    rules: [],
    quests: {},
    flags: {},
    sprites: starter.sprites,
    animations: Object.fromEntries(keepAnims.map((id) => [id, starter.animations[id]])),
    sounds: starter.sounds,
  };
}
