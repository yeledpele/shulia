// Adventure runtime: plays any Project. Knows nothing about the editor.
import Phaser from 'phaser';
import type { Action, Character, DialogueChoice, DialogueNode, GameState, Id, Project, SceneObject, Trigger } from '../model/types';
import { initialState } from '../model/types';
import { conditionsMet, evaluate, type Trace } from '../logic/rules';
import { playSound } from './sfx';
import { nightCanvas, nightColor } from '../model/night';

export const STAGE_W = 960;
export const STAGE_H = 540;
const BAR_H = 76;
export const GAME_H = STAGE_H + BAR_H;
const FONT = '"Rubik", "Arial Hebrew", "Segoe UI", Arial, sans-serif';
const INK = '#fffaf0';
const BOX_BG = 0x241a35;
const YOLK = 0xf5b400;

export interface DebugInfo {
  sceneId: Id;
  sceneName: string;
  inventory: string[];
  flags: { name: string; value: boolean }[];
  quests: { name: string; steps: { text: string; done: boolean }[] }[];
  lastTrace?: Trace;
}
export interface GameOptions { debug?: boolean; muted?: boolean; startSceneId?: Id; onDebug?: (d: DebugInfo) => void }
export interface GameHandle { destroy(): void; setDebug(on: boolean): void; setMuted(on: boolean): void; restart(sceneId?: Id): void }

interface View { def: SceneObject; sprite?: Phaser.GameObjects.Sprite; arrow?: Phaser.GameObjects.Graphics; defaultAnim?: string }
interface Box { root: Phaser.GameObjects.Container; choices: { rect: Phaser.Geom.Rectangle; text: Phaser.GameObjects.Text }[] }

const txt = (size: number, color = INK, extra: Phaser.Types.GameObjects.Text.TextStyle = {}): Phaser.Types.GameObjects.Text.TextStyle =>
  ({ fontFamily: FONT, fontSize: `${size}px`, color, rtl: true, ...extra });

class AdventureScene extends Phaser.Scene {
  private state!: GameState;
  private views = new Map<Id, View>();
  private bg?: Phaser.GameObjects.GameObject;
  private player!: Phaser.GameObjects.Sprite;
  private walkTween?: Phaser.Tweens.Tween;
  private walkResolve?: (ok: boolean) => void;
  private busy = 0;
  private waiter: ((i: number) => void) | null = null;
  private box?: Box;
  private selected: Id | null = null;
  private hoverPill!: Phaser.GameObjects.Container;
  private hoverText!: Phaser.GameObjects.Text;
  private barHint!: Phaser.GameObjects.Text;
  private invLayer!: Phaser.GameObjects.Container;
  private slots: { id: Id; rect: Phaser.Geom.Rectangle }[] = [];
  private questText!: Phaser.GameObjects.Text;
  private questBg!: Phaser.GameObjects.Graphics;
  private debugGfx!: Phaser.GameObjects.Graphics;
  private debugLabels: Phaser.GameObjects.Text[] = [];
  private winLayer?: Phaser.GameObjects.Container;
  private winButton?: Phaser.Geom.Rectangle;
  private lastTrace?: Trace;
  private ready = false;
  private gen = 0;

  private p: Project;
  private imgs: Record<Id, HTMLImageElement>;
  private opts: GameOptions;

  constructor(p: Project, imgs: Record<Id, HTMLImageElement>, opts: GameOptions) {
    super('adventure');
    this.p = p; this.imgs = imgs; this.opts = opts;
  }

  // ── setup ─────────────────────────────────────────────────────────
  create() {
    for (const [id, img] of Object.entries(this.imgs)) {
      if (!this.textures.exists(id)) this.textures.addImage(id, img);
      this.textures.get(id).setFilter(Phaser.Textures.FilterMode.NEAREST);
    }
    // night versions of backgrounds for scenes shown at night
    for (const sc of Object.values(this.p.scenes)) {
      const id = sc.background.spriteId;
      if (!sc.night || !id || !this.imgs[id] || this.p.sprites[id]?.night || this.textures.exists(`${id}__night`)) continue;
      const img = this.imgs[id], cv = document.createElement('canvas');
      cv.width = img.width; cv.height = img.height;
      const c = cv.getContext('2d')!;
      c.drawImage(img, 0, 0); nightCanvas(c);
      this.textures.addCanvas(`${id}__night`, cv)?.setFilter(Phaser.Textures.FilterMode.NEAREST);
    }
    for (const a of Object.values(this.p.animations)) {
      const frames = a.frames.filter((f) => this.textures.exists(f.spriteId))
        .map((f) => ({ key: f.spriteId, duration: Math.max(1, f.ms - 1) }));
      if (frames.length) this.anims.create({ key: a.id, frames, frameRate: 1000, repeat: a.mode === 'once' ? 0 : -1, yoyo: a.mode === 'pingpong' });
    }
    this.buildUi();
    this.input.on('pointerdown', (ptr: Phaser.Input.Pointer) => void this.onDown(ptr.x, ptr.y));
    this.input.on('pointermove', (ptr: Phaser.Input.Pointer) => this.onMove(ptr.x, ptr.y));
    this.input.keyboard?.on('keydown', (e: KeyboardEvent) => {
      if (!this.waiter) return;
      const n = Number(e.key);
      if (this.box?.choices.length) {
        if (n >= 1 && n <= this.box.choices.length) { e.preventDefault(); const w = this.waiter; this.waiter = null; w(n - 1); }
      } else if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); const w = this.waiter; this.waiter = null; w(0); }
    });
    this.ready = true;
    (window as unknown as { __shulia?: unknown }).__shulia = this; // playtest/debug hook
    this.restart(this.opts.startSceneId);
  }

  private buildUi() {
    const bar = this.add.graphics().setDepth(2000);
    bar.fillStyle(0x1b1428, 1).fillRect(0, STAGE_H, STAGE_W, BAR_H);
    bar.fillStyle(0x3a2b52, 1).fillRect(0, STAGE_H, STAGE_W, 3);
    this.invLayer = this.add.container(0, 0).setDepth(2001);
    this.barHint = this.add.text(20, STAGE_H + BAR_H / 2, '', txt(19, '#d9cdea', { rtl: false })).setOrigin(0, 0.5).setDepth(2001);

    this.hoverPill = this.add.container(STAGE_W / 2, 26).setDepth(1500).setVisible(false);
    const pillBg = this.add.graphics();
    this.hoverText = this.add.text(0, 0, '', txt(24)).setOrigin(0.5);
    this.hoverPill.add([pillBg, this.hoverText]);
    this.hoverPill.setData('bg', pillBg);

    this.questBg = this.add.graphics().setDepth(1400);
    this.questText = this.add.text(STAGE_W - 22, 18, '', txt(19, INK, { lineSpacing: 4 })).setOrigin(1, 0).setDepth(1401);
    this.debugGfx = this.add.graphics().setDepth(1300);
  }

  // ── public controls ───────────────────────────────────────────────
  setDebug(on: boolean) { this.opts.debug = on; if (this.ready) this.drawDebug(); }
  setMuted(on: boolean) { this.opts.muted = on; }

  restart(sceneId?: Id) {
    if (!this.ready) { this.opts.startSceneId = sceneId; return; }
    this.gen++;
    this.tweens.killAll();
    this.winLayer?.destroy(); this.winLayer = undefined; this.winButton = undefined;
    this.closeBox();
    if (this.waiter) { const w = this.waiter; this.waiter = null; w(-1); }
    this.busy = 0; this.selected = null; this.lastTrace = undefined;
    const start = sceneId && this.p.scenes[sceneId] ? sceneId : this.p.startSceneId;
    this.state = initialState(this.p, start);
    this.buildRoom(start);
    this.refreshInventory(); this.refreshQuest();
    void this.trigger({ type: 'enterScene', sceneId: start }, true);
  }

  // ── room ──────────────────────────────────────────────────────────
  private isVisible(o: SceneObject) {
    return this.state.visible[o.id] !== false && (!o.visibleFlag || !!this.state.flags[o.visibleFlag]);
  }

  private textureFor(o: SceneObject): string | undefined {
    if (o.kind === 'character' && o.ref) return this.p.characters[o.ref]?.spriteId;
    if (o.kind === 'item' && o.ref) return o.spriteId ?? this.p.items[o.ref]?.spriteId;
    return o.spriteId;
  }

  private buildRoom(sceneId: Id, from?: Id) {
    const sc = this.p.scenes[sceneId];
    this.bg?.destroy();
    for (const v of this.views.values()) { v.sprite?.destroy(); v.arrow?.destroy(); }
    this.views.clear();

    const dayTex = sc.background.spriteId;
    const bgTex = dayTex && sc.night && this.textures.exists(`${dayTex}__night`) ? `${dayTex}__night` : dayTex;
    const bgCol = sc.night ? nightColor(sc.background.color) : sc.background.color;
    this.bg = bgTex && this.textures.exists(bgTex)
      ? this.add.image(0, 0, bgTex).setOrigin(0).setDisplaySize(STAGE_W, STAGE_H).setDepth(0)
      : this.add.rectangle(0, 0, STAGE_W, STAGE_H, Phaser.Display.Color.HexStringToColor(bgCol).color).setOrigin(0).setDepth(0);

    for (const o of sc.objects) {
      const v: View = { def: o };
      const tex = this.textureFor(o);
      if (o.kind === 'exit') {
        v.arrow = this.drawExitArrow(o);
      } else if (tex && this.textures.exists(tex)) {
        v.sprite = this.add.sprite(o.x, o.y, tex).setOrigin(0.5, 1).setScale(o.scale ?? 4).setDepth(o.y);
        const anim = o.kind === 'character' && o.ref ? this.p.characters[o.ref]?.anims.idle : o.animId;
        if (anim && this.anims.exists(anim)) { v.defaultAnim = anim; v.sprite.play(anim); }
      }
      this.applyVisibility(v);
      this.views.set(o.id, v);
    }

    const pc = this.p.characters[this.p.playerId];
    const wa = sc.walkArea;
    let sx = wa.x + wa.w / 2, sy = wa.y + wa.h * 0.6;
    const back = from && sc.objects.find((o) => o.kind === 'exit' && o.exitTo === from);
    if (back) sx = Phaser.Math.Clamp(back.x + (back.x < STAGE_W / 2 ? 90 : -90), wa.x, wa.x + wa.w);
    if (!this.player) {
      this.player = this.add.sprite(sx, sy, pc?.spriteId ?? '__DEFAULT').setOrigin(0.5, 1).setScale(5);
    }
    this.player.setPosition(sx, sy).setDepth(sy).setVisible(!!pc);
    this.playCharAnim(this.player, pc, 'idle');
    this.drawDebug();
    this.emitDebug();
  }

  private drawExitArrow(o: SceneObject) {
    const dir = o.arrow ?? (o.x < STAGE_W / 2 ? 'left' : 'right');
    const cx = o.x, cy = o.y - Math.min(o.h, 160) / 2;
    const g = this.add.graphics().setDepth(5).setPosition(cx, cy);
    const pts = {
      left: [[8, -14], [-8, 0], [8, 14]], right: [[-8, -14], [8, 0], [-8, 14]],
      up: [[-14, 8], [0, -8], [14, 8]], down: [[-14, -8], [0, 8], [14, -8]],
    }[dir];
    g.fillStyle(0x1b1428, 0.55).fillCircle(0, 0, 30);
    g.lineStyle(6, 0xfffaf0, 1);
    g.beginPath(); g.moveTo(pts[0][0], pts[0][1]); g.lineTo(pts[1][0], pts[1][1]); g.lineTo(pts[2][0], pts[2][1]); g.strokePath();
    const [dx, dy] = { left: [-6, 0], right: [6, 0], up: [0, -6], down: [0, 6] }[dir];
    this.tweens.add({ targets: g, x: cx + dx, y: cy + dy, duration: 700, yoyo: true, repeat: -1, ease: 'Sine.inOut' });
    return g;
  }

  private applyVisibility(v: View) {
    const on = this.isVisible(v.def);
    v.sprite?.setVisible(on);
    v.arrow?.setVisible(on);
  }

  private playCharAnim(s: Phaser.GameObjects.Sprite, c: Character | undefined, state: 'idle' | 'walk' | 'talk' | 'celebrate') {
    const key = c?.anims[state] ?? c?.anims.idle;
    if (key && this.anims.exists(key)) s.play(key, true);
    else { s.stop(); if (c?.spriteId) s.setTexture(c.spriteId); }
  }

  // ── input ─────────────────────────────────────────────────────────
  private hitObject(x: number, y: number): SceneObject | undefined {
    const sc = this.p.scenes[this.state.sceneId];
    const hits = sc.objects.filter((o) => this.isVisible(o) && x >= o.x - o.w / 2 && x <= o.x + o.w / 2 && y >= o.y - o.h && y <= o.y);
    hits.sort((a, b) => a.w * a.h - b.w * b.h);
    return hits[0];
  }

  private onMove(x: number, y: number) {
    if (this.box) {
      for (const c of this.box.choices) c.text.setColor(c.rect.contains(x, y) ? '#ffd43b' : INK);
      return;
    }
    if (this.winLayer || y >= STAGE_H) { this.showHover(''); return; }
    const o = this.hitObject(x, y);
    const item = this.selected ? this.p.items[this.selected]?.name : null;
    if (item) this.showHover(o ? `להשתמש ב${item} על ${o.name}` : `להשתמש ב${item} על...`);
    else this.showHover(o?.name ?? '');
    this.input.setDefaultCursor(o ? 'pointer' : 'default');
  }

  private showHover(label: string) {
    if (!label) { this.hoverPill.setVisible(false); return; }
    this.hoverText.setText(label);
    const g = this.hoverPill.getData('bg') as Phaser.GameObjects.Graphics;
    const w = this.hoverText.width + 36, h = 44;
    g.clear().fillStyle(0x1b1428, 0.85).fillRoundedRect(-w / 2, -h / 2, w, h, 22);
    this.hoverPill.setVisible(true);
  }

  private async onDown(x: number, y: number) {
    if (this.winLayer) {
      if (this.winButton?.contains(x, y)) this.restart();
      return;
    }
    if (this.waiter) {
      if (this.box?.choices.length) {
        const i = this.box.choices.findIndex((c) => c.rect.contains(x, y));
        if (i >= 0) { const w = this.waiter; this.waiter = null; w(i); }
      } else { const w = this.waiter; this.waiter = null; w(0); }
      return;
    }
    if (this.busy) return;
    if (y >= STAGE_H) { this.onInventory(x, y); return; }

    const o = this.hitObject(x, y);
    if (this.selected) {
      const item = this.selected;
      this.select(null);
      if (!o) return;
      if (await this.approach(o)) await this.trigger({ type: 'useItem', itemId: item, objectId: o.id });
      return;
    }
    if (!o) { void this.walkTo(x, y); return; }
    if (!(await this.approach(o))) return;
    const hasRules = this.p.rules.some((r) => r.when.type === 'click' && r.when.objectId === o.id);
    if (o.kind === 'exit' && o.exitTo && !hasRules) {
      this.lastTrace = { trigger: `לחיצה על ${o.name}`, checks: [], fired: `יציאה אל ${this.p.scenes[o.exitTo]?.name ?? o.exitTo}` };
      this.busy++; await this.changeScene(o.exitTo); this.busy--;
      return;
    }
    await this.trigger({ type: 'click', objectId: o.id });
  }

  private onInventory(x: number, y: number) {
    const hit = this.slots.find((s) => s.rect.contains(x, y));
    if (!hit) { this.select(null); return; }
    if (!this.selected) { this.select(hit.id); playSound('synth:click', !!this.opts.muted); return; }
    if (this.selected === hit.id) { this.select(null); return; }
    const a = this.selected;
    this.select(null);
    void this.trigger({ type: 'combine', a, b: hit.id });
  }

  private select(id: Id | null) {
    this.selected = id;
    this.refreshInventory();
  }

  // ── movement ──────────────────────────────────────────────────────
  private clampToWalk(x: number, y: number) {
    const wa = this.p.scenes[this.state.sceneId].walkArea;
    return { x: Phaser.Math.Clamp(x, wa.x, wa.x + wa.w), y: Phaser.Math.Clamp(y, wa.y, wa.y + wa.h) };
  }

  private approach(o: SceneObject): Promise<boolean> {
    const side = this.player.x < o.x ? -1 : 1;
    const standX = o.kind === 'exit' || o.kind === 'hotspot' ? o.x : o.x + side * (o.w / 2 + 34);
    return this.walkTo(standX, o.y + 8);
  }

  private walkTo(tx: number, ty: number): Promise<boolean> {
    const pc = this.p.characters[this.p.playerId];
    const t = this.clampToWalk(tx, ty);
    this.walkTween?.stop();
    this.walkResolve?.(false);
    const dist = Phaser.Math.Distance.Between(this.player.x, this.player.y, t.x, t.y);
    if (dist < 6) return Promise.resolve(true);
    this.player.setFlipX(t.x < this.player.x);
    this.playCharAnim(this.player, pc, 'walk');
    return new Promise((resolve) => {
      this.walkResolve = resolve;
      this.walkTween = this.tweens.add({
        targets: this.player, x: t.x, y: t.y, duration: dist / 0.34,
        onUpdate: () => this.player.setDepth(this.player.y),
        onComplete: () => { this.walkResolve = undefined; this.playCharAnim(this.player, pc, 'idle'); resolve(true); },
        onStop: () => this.playCharAnim(this.player, pc, 'idle'),
      });
    });
  }

  // ── rules & actions ───────────────────────────────────────────────
  private async trigger(t: Trigger, silent = false) {
    this.busy++;
    try {
      const out = evaluate(this.p, this.state, t);
      if (!silent || out.ruleId) this.lastTrace = out.trace;
      if (out.ruleId && this.p.rules.find((r) => r.id === out.ruleId)?.once) this.state.firedOnce.push(out.ruleId);
      this.emitDebug();
      if (out.actions.length) await this.run(out.actions);
      else if (out.trace.fallback && !silent) await this.showBox(null, out.trace.fallback);
    } finally {
      this.busy--;
    }
  }

  private async run(actions: Action[]) {
    const gen = this.gen;
    for (const a of actions) {
      if (this.winLayer || gen !== this.gen) return;
      switch (a.type) {
        case 'message': await this.showBox(null, a.text); break;
        case 'say': await this.say(a.characterId, a.text); break;
        case 'addItem':
          if (!this.state.inventory.includes(a.itemId)) this.state.inventory.push(a.itemId);
          playSound(this.p.sounds.snd_pickup?.dataUrl ?? 'synth:pickup', !!this.opts.muted);
          this.refreshInventory(a.itemId);
          break;
        case 'removeItem':
          this.state.inventory = this.state.inventory.filter((i) => i !== a.itemId);
          if (this.selected === a.itemId) this.selected = null;
          this.refreshInventory();
          break;
        case 'setFlag':
          this.state.flags[a.flagId] = a.value;
          for (const v of this.views.values()) this.applyVisibility(v);
          break;
        case 'goToScene': await this.changeScene(a.sceneId); break;
        case 'startDialogue': await this.runDialogue(a.dialogueId); break;
        case 'show':
        case 'hide': {
          this.state.visible[a.objectId] = a.type === 'show';
          const v = this.views.get(a.objectId);
          if (v) {
            this.applyVisibility(v);
            if (a.type === 'show' && v.sprite) {
              const s = v.sprite.scale;
              v.sprite.setScale(0);
              this.tweens.add({ targets: v.sprite, scale: s, duration: 260, ease: 'Back.out' });
            }
          }
          break;
        }
        case 'playAnim': {
          const v = this.views.get(a.objectId);
          if (v?.sprite && this.anims.exists(a.animId)) {
            v.sprite.play(a.animId);
            const back = () => { if (v.defaultAnim) v.sprite?.play(v.defaultAnim); };
            if (this.p.animations[a.animId]?.mode === 'once') v.sprite.once('animationcomplete', back);
            else this.time.delayedCall(1500, back);
          }
          break;
        }
        case 'playSound': playSound(this.p.sounds[a.soundId]?.dataUrl, !!this.opts.muted); break;
        case 'completeStep':
          this.state.questDone[`${a.questId}/${a.stepId}`] = true;
          this.refreshQuest(true);
          break;
        case 'win': this.showWin(a.text); break;
      }
      this.drawDebug();
      this.emitDebug();
    }
  }

  private async changeScene(id: Id) {
    if (!this.p.scenes[id]) return;
    const from = this.state.sceneId;
    this.walkTween?.stop();
    await new Promise<void>((r) => { this.cameras.main.fadeOut(220, 27, 20, 40); this.cameras.main.once('camerafadeoutcomplete', () => r()); });
    this.state.sceneId = id;
    this.buildRoom(id, from);
    this.cameras.main.fadeIn(220, 27, 20, 40);
    await this.trigger({ type: 'enterScene', sceneId: id }, true);
  }

  private speakerView(charId: Id): Phaser.GameObjects.Sprite | undefined {
    if (charId === this.p.playerId) return this.player;
    for (const v of this.views.values()) if (v.def.kind === 'character' && v.def.ref === charId && this.isVisible(v.def)) return v.sprite;
    return undefined;
  }

  private async say(charId: Id, text: string, choices?: string[]) {
    const c = this.p.characters[charId];
    const s = this.speakerView(charId);
    if (s && c) this.playCharAnim(s, c, 'talk');
    const pick = await this.showBox(c?.name ?? null, text, c?.color, choices);
    if (s && c) this.playCharAnim(s, c, 'idle');
    return pick;
  }

  private async runDialogue(id: Id) {
    const d = this.p.dialogues[id];
    if (!d) return;
    let nodeId: Id | undefined = d.start;
    let guard = 0;
    while (nodeId && guard++ < 200 && !this.winLayer) {
      const n: DialogueNode | undefined = d.nodes[nodeId];
      if (!n) break;
      const speaker = n.speaker === 'player' ? this.p.playerId : n.speaker;
      const open: DialogueChoice[] = (n.choices ?? []).filter((c: DialogueChoice) => conditionsMet(this.p, this.state, c.when));
      if (open.length) {
        const i = speaker === 'narrator'
          ? await this.showBox(null, n.text, undefined, open.map((c) => c.text))
          : await this.say(speaker, n.text, open.map((c) => c.text));
        if (i < 0 || this.winLayer) return;
        const ch: DialogueChoice = open[i];
        if (ch.actions) await this.run(ch.actions);
        nodeId = ch.next;
      } else {
        const r = speaker === 'narrator' ? await this.showBox(null, n.text) : await this.say(speaker, n.text);
        if (r < 0) return;
        if (n.actions) await this.run(n.actions);
        nodeId = n.next;
      }
    }
  }

  // ── text box ──────────────────────────────────────────────────────
  private closeBox() { this.box?.root.destroy(); this.box = undefined; }

  /** Shows a message (or a line of dialogue). Resolves with the chosen index, 0 for "continue", -1 if cancelled. */
  private showBox(name: string | null, text: string, color?: string, choices?: string[]): Promise<number> {
    this.closeBox();
    this.showHover('');
    const W = 900, x0 = (STAGE_W - W) / 2, right = x0 + W - 28;
    const root = this.add.container(0, 0).setDepth(1800);
    const parts: Phaser.GameObjects.GameObject[] = [];
    let y = 22;
    if (name) {
      const nt = this.add.text(right, y, name, txt(22, color ?? '#ffd43b', { fontStyle: 'bold' })).setOrigin(1, 0);
      parts.push(nt); y += nt.height + 6;
    }
    const body = this.add.text(right, y, text, txt(27, INK, { wordWrap: { width: W - 56, useAdvancedWrap: true }, align: 'right', lineSpacing: 6 })).setOrigin(1, 0);
    parts.push(body); y += body.height + 14;
    const rows: { text: Phaser.GameObjects.Text; top: number }[] = [];
    for (const [i, c] of (choices ?? []).entries()) {
      const t = this.add.text(right, y, `${i + 1}. ${c}`, txt(25, INK, { wordWrap: { width: W - 80, useAdvancedWrap: true } })).setOrigin(1, 0);
      rows.push({ text: t, top: y }); parts.push(t); y += t.height + 12;
    }
    if (!choices?.length) {
      const hint = this.add.text(x0 + 26, y - 6, 'לחצו להמשך', txt(17, '#b9a9d4')).setOrigin(0, 0);
      this.tweens.add({ targets: hint, alpha: 0.35, duration: 700, yoyo: true, repeat: -1 });
      parts.push(hint); y += 18;
    }
    const H = y + 8;
    const top = STAGE_H - H - 14;
    const g = this.add.graphics();
    g.fillStyle(BOX_BG, 0.94).fillRoundedRect(x0, 0, W, H, 18);
    g.lineStyle(3, color ? Phaser.Display.Color.HexStringToColor(color).color : YOLK, 1).strokeRoundedRect(x0, 0, W, H, 18);
    root.add([g, ...parts]);
    root.setY(top);
    root.setAlpha(0);
    this.tweens.add({ targets: root, alpha: 1, duration: 120 });
    this.box = {
      root,
      choices: rows.map((r) => ({ text: r.text, rect: new Phaser.Geom.Rectangle(x0, top + r.top - 6, W, r.text.height + 12) })),
    };
    return new Promise((resolve) => {
      this.waiter = (i) => { this.closeBox(); resolve(i); };
    });
  }

  // ── HUD ───────────────────────────────────────────────────────────
  private refreshInventory(flashId?: Id) {
    this.invLayer.removeAll(true);
    this.slots = [];
    const size = 52, gap = 8, cy = STAGE_H + BAR_H / 2;
    this.state.inventory.forEach((id, i) => {
      const item = this.p.items[id];
      const cx = STAGE_W - 20 - size / 2 - i * (size + gap);
      const sel = this.selected === id;
      const g = this.add.graphics();
      g.fillStyle(sel ? 0x4a3a12 : 0x2f2445, 1).fillRoundedRect(cx - size / 2, cy - size / 2, size, size, 12);
      g.lineStyle(sel ? 4 : 2, sel ? YOLK : 0x4b3c66, 1).strokeRoundedRect(cx - size / 2, cy - size / 2, size, size, 12);
      this.invLayer.add(g);
      if (item?.spriteId && this.textures.exists(item.spriteId)) {
        const im = this.add.image(cx, cy, item.spriteId);
        im.setScale(Math.floor(40 / Math.max(im.width, im.height)) || 1);
        this.invLayer.add(im);
        if (id === flashId) this.tweens.add({ targets: im, scale: { from: im.scale * 1.8, to: im.scale }, duration: 350, ease: 'Back.out' });
      } else {
        this.invLayer.add(this.add.text(cx, cy, item?.name ?? id, txt(14)).setOrigin(0.5));
      }
      this.slots.push({ id, rect: new Phaser.Geom.Rectangle(cx - size / 2, cy - size / 2, size, size) });
    });
    const used = this.state.inventory.length * (size + gap);
    const sel = this.selected ? this.p.items[this.selected] : null;
    this.barHint.setText(
      sel ? `${sel.name}: ${sel.description}`
        : this.state.inventory.length ? 'לחצו על חפץ כדי להשתמש בו' : 'התיק ריק',
    );
    this.barHint.setWordWrapWidth(Math.max(120, STAGE_W - 60 - used));
  }

  private refreshQuest(pulse = false) {
    const lines: string[] = [];
    for (const q of Object.values(this.p.quests)) {
      const isDone = (id: Id) => !!this.state.questDone[`${q.id}/${id}`];
      const done = q.steps.filter((st) => isDone(st.id)).length;
      lines.push(`${q.name} · ${done}/${q.steps.length}`);
      const open = q.steps.filter((st) => !isDone(st.id));
      if (!open.length) lines.push('✔  הכל מוכן!');
      for (const st of open.slice(0, 3)) lines.push(`○  ${st.text}`);
      if (open.length > 3) lines.push(`ועוד ${open.length - 3}…`);
    }
    this.questText.setText(lines.join('\n'));
    const b = this.questText.getBounds();
    this.questBg.clear().fillStyle(0x1b1428, 0.72).fillRoundedRect(b.x - 16, b.y - 10, b.width + 32, b.height + 20, 14);
    this.questText.setVisible(lines.length > 0); this.questBg.setVisible(lines.length > 0);
    if (pulse) this.tweens.add({ targets: [this.questText], scale: { from: 1.08, to: 1 }, duration: 300 });
  }

  private showWin(text: string) {
    this.closeBox();
    const pc = this.p.characters[this.p.playerId];
    this.playCharAnim(this.player, pc, 'celebrate');
    const L = this.add.container(0, 0).setDepth(3000);
    const g = this.add.graphics();
    g.fillStyle(0x1b1428, 0.82).fillRect(0, 0, STAGE_W, GAME_H);
    L.add(g);
    const winPic = ['spr_sufganiya', 'spr_bread'].find((k) => this.textures.exists(k));
    if (winPic) {
      const b = this.add.image(STAGE_W / 2, 170, winPic).setScale(9);
      this.tweens.add({ targets: b, angle: { from: -4, to: 4 }, duration: 900, yoyo: true, repeat: -1, ease: 'Sine.inOut' });
      L.add(b);
    }
    L.add(this.add.text(STAGE_W / 2, 280, 'ניצחת!', txt(64, '#ffd43b', { fontStyle: 'bold' })).setOrigin(0.5));
    L.add(this.add.text(STAGE_W / 2, 350, text, txt(30, INK, { wordWrap: { width: 760 }, align: 'center' })).setOrigin(0.5, 0));
    const bw = 260, bh = 64, bx = STAGE_W / 2 - bw / 2, by = 470;
    const btn = this.add.graphics();
    btn.fillStyle(YOLK, 1).fillRoundedRect(bx, by, bw, bh, 32);
    L.add(btn);
    L.add(this.add.text(STAGE_W / 2, by + bh / 2, 'לשחק שוב', txt(28, '#241a35', { fontStyle: 'bold' })).setOrigin(0.5));
    this.winButton = new Phaser.Geom.Rectangle(bx, by, bw, bh);
    this.winLayer = L;
    this.emitDebug();
  }

  // ── debug ─────────────────────────────────────────────────────────
  private drawDebug() {
    this.debugGfx.clear();
    this.debugLabels.forEach((t) => t.destroy());
    this.debugLabels = [];
    if (!this.opts.debug || !this.state) return;
    const sc = this.p.scenes[this.state.sceneId];
    const wa = sc.walkArea;
    this.debugGfx.lineStyle(2, 0x4dd4ff, 0.8).strokeRect(wa.x, wa.y, wa.w, wa.h);
    for (const o of sc.objects) {
      const vis = this.isVisible(o);
      const col = !vis ? 0xadb5bd : o.kind === 'exit' ? 0x4dd4ff : 0xffd43b;
      this.debugGfx.lineStyle(3, col, vis ? 1 : 0.6);
      this.debugGfx.strokeRect(o.x - o.w / 2, o.y - o.h, o.w, o.h);
      if (vis) this.debugGfx.fillStyle(col, 0.12).fillRect(o.x - o.w / 2, o.y - o.h, o.w, o.h);
      const label = this.add.text(o.x + o.w / 2 - 4, o.y - o.h + 4, vis ? o.name : `${o.name} (מוסתר)`, txt(16, '#1b1428', { backgroundColor: vis ? (o.kind === 'exit' ? '#4dd4ff' : '#ffd43b') : '#adb5bd', padding: { x: 6, y: 2 } }))
        .setOrigin(1, 0).setDepth(1301);
      this.debugLabels.push(label);
    }
  }

  private emitDebug() {
    if (!this.opts.onDebug || !this.state) return;
    const p = this.p, s = this.state;
    this.opts.onDebug({
      sceneId: s.sceneId,
      sceneName: p.scenes[s.sceneId]?.name ?? s.sceneId,
      inventory: s.inventory.map((i) => p.items[i]?.name ?? i),
      flags: Object.entries(p.flags).map(([id, f]) => ({ name: f.name, value: !!s.flags[id] })),
      quests: Object.values(p.quests).map((q) => ({ name: q.name, steps: q.steps.map((st) => ({ text: st.text, done: !!s.questDone[`${q.id}/${st.id}`] })) })),
      lastTrace: this.lastTrace,
    });
  }
}

function loadImages(p: Project): Promise<Record<Id, HTMLImageElement>> {
  const entries = Object.values(p.sprites).map((s) => new Promise<[Id, HTMLImageElement] | null>((res) => {
    const img = new Image();
    img.onload = () => res([s.id, img]);
    img.onerror = () => res(null);
    img.src = s.dataUrl;
  }));
  return Promise.all(entries).then((list) => Object.fromEntries(list.filter((x): x is [Id, HTMLImageElement] => !!x)));
}

export async function startGame(parent: HTMLElement, project: Project, opts: GameOptions = {}): Promise<GameHandle> {
  const imgs = await loadImages(project);
  try { await document.fonts.load('28px Rubik'); } catch { /* fallback font is fine */ }
  const scene = new AdventureScene(project, imgs, opts);
  const game = new Phaser.Game({
    type: Phaser.AUTO,
    parent,
    width: STAGE_W,
    height: GAME_H,
    backgroundColor: '#1b1428',
    // The host page sizes the canvas with CSS (width:100%); Phaser only measures it.
    scale: { mode: Phaser.Scale.NONE, expandParent: false },
    audio: { noAudio: true },
    banner: false,
    scene,
  });
  // Phaser caches the canvas position; keep it fresh when the page layout shifts.
  const sync = () => game.scale?.updateBounds();
  const ro = new ResizeObserver(() => sync());
  ro.observe(parent);
  ro.observe(document.body);
  for (const ev of ['pointerdown', 'pointermove', 'mousedown', 'touchstart']) parent.addEventListener(ev, sync, { capture: true, passive: true });
  window.addEventListener('scroll', sync, { passive: true });
  return {
    destroy: () => {
      ro.disconnect();
      window.removeEventListener('scroll', sync);
      for (const ev of ['pointerdown', 'pointermove', 'mousedown', 'touchstart']) parent.removeEventListener(ev, sync, { capture: true });
      game.destroy(true);
    },
    setDebug: (on) => scene.setDebug(on),
    setMuted: (on) => scene.setMuted(on),
    restart: (id) => scene.restart(id),
  };
}
