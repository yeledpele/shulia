// Project data model — the single format the editor writes and the runtime reads.
export type Id = string;

export interface Project {
  version: 1;
  meta: { title: string; author: string; createdAt: string; updatedAt: string };
  story: { text: string; notes: { question: string; answer: string }[] };
  startSceneId: Id;
  playerId: Id;
  characters: Record<Id, Character>;
  scenes: Record<Id, Scene>;
  items: Record<Id, Item>;
  dialogues: Record<Id, Dialogue>;
  rules: Rule[];
  quests: Record<Id, Quest>;
  flags: Record<Id, { name: string; initial: boolean }>;
  sprites: Record<Id, Sprite>;
  animations: Record<Id, Animation>;
  sounds: Record<Id, { name: string; dataUrl: string }>; // "synth:<name>" = built-in sound
}

export type AnimState = 'idle' | 'walk' | 'talk' | 'interact' | 'celebrate';

export interface Character {
  id: Id;
  name: string;
  description: string;
  personality: string[];
  color: string;
  spriteId?: Id;
  anims: Partial<Record<AnimState, Id>>;
}

export interface Scene {
  id: Id;
  name: string;
  background: { spriteId?: Id; color: string };
  walkArea: { x: number; y: number; w: number; h: number };
  night?: boolean;            // show this scene at night (the picture itself stays as drawn)
  objects: SceneObject[];
  music?: Id;
}

/** x,y = bottom-center of the object in game pixels (960×540 stage); w,h = clickable size. */
export interface SceneObject {
  id: Id;
  name: string;
  description?: string;
  kind: 'character' | 'item' | 'prop' | 'hotspot' | 'exit';
  ref?: Id;
  spriteId?: Id;
  animId?: Id;
  scale?: number;
  x: number;
  y: number;
  w: number;
  h: number;
  visible: boolean;
  visibleFlag?: Id;
  exitTo?: Id;
  arrow?: 'left' | 'right' | 'up' | 'down'; // exit arrow direction (default: toward the nearest side)
}

export interface Item { id: Id; name: string; description: string; spriteId?: Id }

export interface DialogueChoice { text: string; next?: Id; when?: Condition[]; actions?: Action[] }
export interface DialogueNode {
  id: Id;
  speaker: Id | 'player' | 'narrator';
  text: string;
  next?: Id;
  choices?: DialogueChoice[];
  actions?: Action[];
}
export interface Dialogue { id: Id; name: string; start: Id; nodes: Record<Id, DialogueNode> }

export interface Rule {
  id: Id;
  name: string;
  when: Trigger;
  if: Condition[];
  then: Action[];
  once?: boolean;
  elseMessage?: string;
}

export type Trigger =
  | { type: 'click'; objectId: Id }
  | { type: 'useItem'; itemId: Id; objectId: Id }
  | { type: 'combine'; a: Id; b: Id }
  | { type: 'enterScene'; sceneId: Id };

export type Condition =
  | { type: 'hasItem'; itemId: Id; not?: boolean }
  | { type: 'hasAllItems'; itemIds: Id[] }
  | { type: 'flag'; flagId: Id; value: boolean }
  | { type: 'questStep'; questId: Id; stepId: Id; done: boolean };

export type Action =
  | { type: 'message'; text: string }
  | { type: 'say'; characterId: Id; text: string }
  | { type: 'addItem'; itemId: Id }
  | { type: 'removeItem'; itemId: Id }
  | { type: 'setFlag'; flagId: Id; value: boolean }
  | { type: 'goToScene'; sceneId: Id }
  | { type: 'startDialogue'; dialogueId: Id }
  | { type: 'show'; objectId: Id }
  | { type: 'hide'; objectId: Id }
  | { type: 'playAnim'; objectId: Id; animId: Id }
  | { type: 'playSound'; soundId: Id }
  | { type: 'completeStep'; questId: Id; stepId: Id }
  | { type: 'win'; text: string };

export interface Quest { id: Id; name: string; steps: { id: Id; text: string }[] }

export interface Sprite {
  id: Id;
  name: string;
  w: number;
  h: number;
  dataUrl: string;
  layers?: { name: string; visible: boolean; pixels: (string | null)[] }[];
  bg?: BgRecipe; // made in the Background Studio (can be edited again there)
  night?: boolean; // a picture that was itself turned into night earlier (not shown darker again)
}

/** A background built from a base and stamps (240×135). */
export interface BgRecipe {
  top: { style: string; color: string };
  bottom: { style: string; color: string };
  horizon: number;            // y where the top meets the bottom
  baseImage?: string;         // start from an existing picture instead of top/bottom
  items: BgItem[];
  handEdited?: boolean;       // changed afterwards in the Pixel Studio
  night?: boolean;            // draw it as night
}
export interface BgItem { id: Id; stamp: string; x: number; y: number; size: number; color: string; flip?: boolean }

export interface Animation {
  id: Id;
  name: string;
  frames: { spriteId: Id; ms: number }[];
  mode: 'loop' | 'pingpong' | 'once';
}

export interface GameState {
  sceneId: Id;
  inventory: Id[];
  flags: Record<Id, boolean>;
  questDone: Record<string, boolean>; // `${questId}/${stepId}`
  firedOnce: Id[];
  visible: Record<Id, boolean>;
}

export function initialState(p: Project, sceneId?: Id): GameState {
  const flags: Record<Id, boolean> = {};
  for (const [id, f] of Object.entries(p.flags)) flags[id] = f.initial;
  const visible: Record<Id, boolean> = {};
  for (const s of Object.values(p.scenes)) for (const o of s.objects) visible[o.id] = o.visible;
  return { sceneId: sceneId ?? p.startSceneId, inventory: [], flags, questDone: {}, firedOnce: [], visible };
}
