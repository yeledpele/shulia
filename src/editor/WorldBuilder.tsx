// בונה העולם — scenes, drag-and-drop objects, and the "when the player clicks…" card.
import { useEffect, useLayoutEffect, useRef, useState, type DragEvent, type PointerEvent as RPointerEvent } from 'react';
import type { Draft } from 'immer';
import type { Action, Condition, Project, SceneObject, Trigger } from '../model/types';
import { STAGE_H, STAGE_W } from '../runtime/game';
import { getProject, newId, update, useProject } from './store';
import { askConfirm, Hint, Picker, SpriteImg } from './ui';
import { addRule, createDialogue, createItem, makeAction, RuleCard } from './RuleEditor';
import { backgroundOptions, characterOptions, flagOptions, itemOptions, objectIcon, propOptions, sceneOptions } from './options';
import { go, setNav, useNav } from './nav';
import { createStarterProject } from '../model/starterProject';
import { nightColor, nightDataUrl } from '../model/night';

// night pictures for the editor stage, made once per picture
const nightCache = new Map<string, string>();
const nightPending = new Set<string>();
function useNightUrl(url: string | undefined, on: boolean) {
  const [, tick] = useState(0);
  if (!url || !on) return url;
  const done = nightCache.get(url);
  if (done) return done;
  if (!nightPending.has(url)) {
    nightPending.add(url);
    void nightDataUrl(url).then((n) => { nightCache.set(url, n); tick((t) => t + 1); });
  }
  return url;
}

let starterCache: Project | null = null;
const starter = () => (starterCache ??= createStarterProject());

type Drop = { kind: 'character'; ref: string } | { kind: 'item'; ref: string } | { kind: 'prop'; spriteId: string } | { kind: 'hotspot' } | { kind: 'exit' } | { kind: 'newItem' };

const KIND_LABEL: Record<SceneObject['kind'], string> = { character: 'דמות', item: 'חפץ לאיסוף', prop: 'קישוט', hotspot: 'אזור לחיצה', exit: 'יציאה' };

function spriteSize(p: Project, o: Pick<SceneObject, 'kind' | 'ref' | 'spriteId'>) {
  const id = objectIcon(p, o as SceneObject);
  const s = id ? p.sprites[id] : undefined;
  return s ? { w: s.w, h: s.h } : undefined;
}

function fitToSprite(p: Project, o: Draft<SceneObject>) {
  const s = spriteSize(p, o);
  if (s && o.kind !== 'hotspot' && o.kind !== 'exit') { o.w = Math.round(s.w * (o.scale ?? 4)); o.h = Math.round(s.h * (o.scale ?? 4)); }
}

function placeNew(sceneId: string, drop: Drop, x: number, yCenter: number): string {
  const p = getProject();
  const id = newId('o');
  let o: SceneObject;
  if (drop.kind === 'character') {
    const c = p.characters[drop.ref];
    o = { id, name: c?.name ?? 'דמות', kind: 'character', ref: drop.ref, x, y: 0, w: 80, h: 120, scale: 5, visible: true };
  } else if (drop.kind === 'item' || drop.kind === 'newItem') {
    const ref = drop.kind === 'item' ? drop.ref : createItem('חפץ חדש');
    o = { id, name: getProject().items[ref]?.name ?? 'חפץ', kind: 'item', ref, x, y: 0, w: 48, h: 48, scale: 4, visible: true };
  } else if (drop.kind === 'prop') {
    o = { id, name: p.sprites[drop.spriteId]?.name ?? 'קישוט', kind: 'prop', spriteId: drop.spriteId, x, y: 0, w: 64, h: 64, scale: 4, visible: true };
  } else if (drop.kind === 'hotspot') {
    o = { id, name: 'אזור חדש', kind: 'hotspot', description: '', x, y: 0, w: 140, h: 120, visible: true };
  } else {
    const other = Object.keys(p.scenes).find((s) => s !== sceneId);
    o = { id, name: other ? `אל ${p.scenes[other].name}` : 'יציאה', kind: 'exit', exitTo: other, x, y: 0, w: 80, h: 200, visible: true };
  }
  const s = spriteSize(getProject(), o);
  if (s && o.kind !== 'hotspot' && o.kind !== 'exit') { o.w = Math.round(s.w * (o.scale ?? 4)); o.h = Math.round(s.h * (o.scale ?? 4)); }
  o.y = Math.round(Math.min(STAGE_H, yCenter + o.h / 2));
  o.x = Math.round(Math.max(o.w / 2, Math.min(STAGE_W - o.w / 2, x)));
  update((d) => { d.scenes[sceneId].objects.push(o); });
  if (o.kind === 'item' && o.ref) {
    addRule({ name: `לוקחים ${o.name}`, when: { type: 'click', objectId: id }, if: [], then: [{ type: 'hide', objectId: id }, { type: 'addItem', itemId: o.ref }] });
  }
  return id;
}

// ── Stage ─────────────────────────────────────────────────────────
function Stage({ sceneId, selected, setSelected, walkEdit }: { sceneId: string; selected?: string; setSelected: (id?: string) => void; walkEdit: boolean }) {
  const p = useProject();
  const sc = p.scenes[sceneId];
  const box = useRef<HTMLDivElement>(null);
  const [k, setK] = useState(1);
  useLayoutEffect(() => {
    const el = box.current!;
    const ro = new ResizeObserver(() => setK(el.clientWidth / STAGE_W));
    ro.observe(el);
    setK(el.clientWidth / STAGE_W);
    return () => ro.disconnect();
  }, []);

  const toGame = (cx: number, cy: number) => {
    const r = box.current!.getBoundingClientRect();
    return { x: (cx - r.left) / k, y: (cy - r.top) / k };
  };

  const startDrag = (e: RPointerEvent, mode: 'move' | 'resize', o: SceneObject) => {
    e.stopPropagation(); e.preventDefault();
    setSelected(o.id);
    const start = toGame(e.clientX, e.clientY);
    const o0 = { ...o };
    const key = `drag:${o.id}:${Date.now()}`;
    const sp = spriteSize(p, o);
    const move = (ev: PointerEvent) => {
      const g = toGame(ev.clientX, ev.clientY);
      update((d) => {
        const ob = d.scenes[sceneId].objects.find((x) => x.id === o.id);
        if (!ob) return;
        if (mode === 'move') {
          ob.x = Math.round(Math.max(0, Math.min(STAGE_W, o0.x + g.x - start.x)));
          ob.y = Math.round(Math.max(20, Math.min(STAGE_H, o0.y + g.y - start.y)));
        } else if (sp && o.kind !== 'hotspot' && o.kind !== 'exit') {
          const h = Math.max(8, o0.y - g.y);
          ob.scale = Math.max(1, Math.min(12, Math.round((h / sp.h) * 2) / 2));
          fitToSprite(getProject(), ob);
        } else {
          ob.w = Math.round(Math.max(30, Math.abs(g.x - o0.x) * 2));
          ob.h = Math.round(Math.max(30, o0.y - g.y));
        }
      }, key);
    };
    const up = () => { window.removeEventListener('pointermove', move); window.removeEventListener('pointerup', up); };
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
  };

  const dragWalk = (e: RPointerEvent, mode: 'move' | 'resize') => {
    e.stopPropagation(); e.preventDefault();
    const start = toGame(e.clientX, e.clientY);
    const w0 = { ...sc.walkArea };
    const key = `walk:${Date.now()}`;
    const move = (ev: PointerEvent) => {
      const g = toGame(ev.clientX, ev.clientY);
      const dx = g.x - start.x, dy = g.y - start.y;
      update((d) => {
        const w = d.scenes[sceneId].walkArea;
        if (mode === 'move') { w.x = Math.round(Math.max(0, Math.min(STAGE_W - w.w, w0.x + dx))); w.y = Math.round(Math.max(0, Math.min(STAGE_H - w.h, w0.y + dy))); }
        else { w.w = Math.round(Math.max(60, Math.min(STAGE_W - w.x, w0.w + dx))); w.h = Math.round(Math.max(30, Math.min(STAGE_H - w.y, w0.h + dy))); }
      }, key);
    };
    const up = () => { window.removeEventListener('pointermove', move); window.removeEventListener('pointerup', up); };
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
  };

  const onDrop = (e: DragEvent) => {
    e.preventDefault();
    const raw = e.dataTransfer.getData('application/x-shulia') || e.dataTransfer.getData('text/plain');
    let drop: Drop;
    try { drop = JSON.parse(raw); } catch { return; }
    const g = toGame(e.clientX, e.clientY);
    setSelected(placeNew(sceneId, drop, g.x, g.y));
  };

  const bg = sc.background.spriteId ? p.sprites[sc.background.spriteId] : undefined;
  const bgUrl = useNightUrl(bg?.dataUrl, !!sc.night && !bg?.night);
  const objs = [...sc.objects].sort((a, b) => a.y - b.y);
  const wa = sc.walkArea;
  return (
    <div className="wb-stage" ref={box} style={{ background: sc.night ? nightColor(sc.background.color) : sc.background.color, height: STAGE_H * k }}
      onPointerDown={() => setSelected(undefined)} onDragOver={(e) => e.preventDefault()} onDrop={onDrop} data-testid="stage">
      {bg && bgUrl && <img className="wb-bg" src={bgUrl} alt="" draggable={false} />}
      <div className={`wb-walk ${walkEdit ? 'edit' : ''}`} style={{ left: wa.x * k, top: wa.y * k, width: wa.w * k, height: wa.h * k }}
        onPointerDown={walkEdit ? (e) => dragWalk(e, 'move') : undefined}>
        {walkEdit && <><span className="wb-tag">אזור הליכה</span><span className="handle br" onPointerDown={(e) => dragWalk(e, 'resize')} /></>}
      </div>
      {objs.map((o) => {
        const icon = objectIcon(p, o);
        const spr = icon ? p.sprites[icon] : undefined;
        const sel = o.id === selected;
        const hidden = !o.visible || !!o.visibleFlag;
        return (
          <div key={o.id} className={`wb-obj k-${o.kind} ${sel ? 'sel' : ''} ${hidden ? 'hidden' : ''}`} data-obj={o.id}
            style={{ left: (o.x - o.w / 2) * k, top: (o.y - o.h) * k, width: o.w * k, height: o.h * k, zIndex: sel ? 900 : Math.round(o.y) }}
            onPointerDown={walkEdit ? undefined : (e) => startDrag(e, 'move', o)} title={o.name}>
            {spr && o.kind !== 'hotspot' && o.kind !== 'exit' && (
              <img src={spr.dataUrl} alt="" draggable={false}
                style={{ width: spr.w * (o.scale ?? 4) * k, height: spr.h * (o.scale ?? 4) * k }} />
            )}
            {o.kind === 'exit' && <span className="wb-arrow" aria-hidden="true">{(o.arrow ?? (o.x < STAGE_W / 2 ? 'left' : 'right')) === 'left' ? '‹' : o.arrow === 'up' ? '˄' : o.arrow === 'down' ? '˅' : '›'}</span>}
            {(sel || o.kind === 'hotspot' || o.kind === 'exit' || !spr) && <span className="wb-tag">{o.name}{hidden ? ' · מוסתר' : ''}</span>}
            {sel && !walkEdit && <span className="handle tl" title="לשנות גודל" onPointerDown={(e) => startDrag(e, 'resize', o)} />}
          </div>
        );
      })}
    </div>
  );
}

// ── Palette (drag things into the scene) ──────────────────────────
function Palette({ sceneId, onAdd }: { sceneId: string; onAdd: (id: string) => void }) {
  const p = useProject();
  const chip = (drop: Drop, label: string, icon?: string) => (
    <button type="button" className="pal-chip" draggable title={`לגרור לסצנה: ${label}`}
      onDragStart={(e) => { const s = JSON.stringify(drop); e.dataTransfer.setData('application/x-shulia', s); e.dataTransfer.setData('text/plain', s); e.dataTransfer.effectAllowed = 'copy'; }}
      onClick={() => onAdd(placeNew(sceneId, drop, STAGE_W / 2, 400))}>
      {icon ? <SpriteImg id={icon} size={34} /> : <span className="pal-shape" aria-hidden="true" />}
      <span>{label}</span>
    </button>
  );
  // decorations: drawings that aren't a character, an item, or a later frame of an animation
  const used = new Set<string>([
    ...Object.values(p.characters).map((c) => c.spriteId ?? ''),
    ...Object.values(p.items).map((i) => i.spriteId ?? ''),
    ...Object.values(p.animations).flatMap((a) => a.frames.slice(1).map((f) => f.spriteId)),
    ...Object.values(p.characters).flatMap((c) => Object.values(c.anims).flatMap((id) => (id && p.animations[id]?.frames.map((f) => f.spriteId)) || [])),
  ]);
  const props = propOptions(p).filter((o) => !used.has(o.id) && !o.label.includes(' – '));
  return (
    <div className="palette">
      <div className="pal-group"><h4>אזורים</h4>
        <div className="pal-row">
          <button type="button" className="pal-chip zone" draggable onDragStart={(e) => { const s = JSON.stringify({ kind: 'hotspot' }); e.dataTransfer.setData('application/x-shulia', s); e.dataTransfer.setData('text/plain', s); }}
            onClick={() => onAdd(placeNew(sceneId, { kind: 'hotspot' }, STAGE_W / 2, 300))}><span className="pal-shape dash" aria-hidden="true" /><span>אזור לחיצה</span></button>
          <button type="button" className="pal-chip zone" draggable onDragStart={(e) => { const s = JSON.stringify({ kind: 'exit' }); e.dataTransfer.setData('application/x-shulia', s); e.dataTransfer.setData('text/plain', s); }}
            onClick={() => onAdd(placeNew(sceneId, { kind: 'exit' }, STAGE_W - 60, 400))}><span className="pal-shape arrow" aria-hidden="true">›</span><span>יציאה</span></button>
        </div>
      </div>
      <div className="pal-group"><h4>דמויות</h4>
        <div className="pal-row">{Object.values(p.characters).filter((c) => c.id !== p.playerId).map((c) => <span key={c.id}>{chip({ kind: 'character', ref: c.id }, c.name, c.spriteId)}</span>)}
          <button type="button" className="pal-chip ghost" onClick={() => go('story', { storyTab: 'characters' })}>+ דמות חדשה</button>
        </div>
      </div>
      <div className="pal-group"><h4>חפצים לאיסוף</h4>
        <div className="pal-row">{Object.values(p.items).map((i) => <span key={i.id}>{chip({ kind: 'item', ref: i.id }, i.name, i.spriteId)}</span>)}
          {chip({ kind: 'newItem' }, '+ חפץ חדש')}
        </div>
      </div>
      <div className="pal-group"><h4>קישוטים</h4>
        <div className="pal-row">{props.map((o) => <span key={o.id}>{chip({ kind: 'prop', spriteId: o.id }, o.label, o.icon)}</span>)}</div>
      </div>
    </div>
  );
}

// ── Interaction card ──────────────────────────────────────────────
function InteractionCard({ o, sceneId }: { o: SceneObject; sceneId: string }) {
  const p = useProject();
  const rules = p.rules.filter((r) => 'objectId' in r.when && r.when.objectId === o.id);
  const firstItem = () => Object.keys(p.items)[0] ?? createItem('חפץ חדש');
  const add = (kind: string) => {
    const click: Trigger = { type: 'click', objectId: o.id };
    let name = `לוחצים על ${o.name}`, then: Action[] = [], iff: Condition[] = [], when: Trigger = click, elseMessage: string | undefined;
    if (kind === 'message') then = [{ type: 'message', text: '' }];
    if (kind === 'anim') then = [makeAction('playAnim', p, o.id)];
    if (kind === 'give') then = [{ type: 'addItem', itemId: firstItem() }];
    if (kind === 'scene') then = [{ type: 'goToScene', sceneId: Object.keys(p.scenes).find((s) => s !== sceneId) ?? sceneId }];
    if (kind === 'dialogue') {
      const speaker = o.kind === 'character' ? o.ref : undefined;
      then = [{ type: 'startDialogue', dialogueId: createDialogue(`שיחה עם ${o.name}`, speaker) }];
      name = `מדברים עם ${o.name}`;
    }
    if (kind === 'puzzle') {
      iff = [{ type: 'hasItem', itemId: firstItem() }];
      then = [{ type: 'message', text: 'זה עבד!' }];
      elseMessage = 'חסר לי משהו…';
      name = `חידה: ${o.name}`;
    }
    if (kind === 'use') {
      when = { type: 'useItem', itemId: firstItem(), objectId: o.id };
      then = [{ type: 'message', text: '' }];
      name = `משתמשים בחפץ על ${o.name}`;
    }
    addRule({ name, when, if: iff, then, elseMessage });
  };
  const QUICK = [
    { id: 'message', label: 'להציג הודעה', ico: '💬' },
    { id: 'anim', label: 'להפעיל אנימציה', ico: '🎞' },
    { id: 'give', label: 'לתת חפץ', ico: '🎁' },
    { id: 'scene', label: 'לעבור לסצנה', ico: '🚪' },
    { id: 'dialogue', label: 'להתחיל שיחה', ico: '🗨' },
    { id: 'puzzle', label: 'חידה: צריך חפץ', ico: '🧩' },
  ];
  const dialogues = rules.flatMap((r) => r.then).filter((a): a is Extract<Action, { type: 'startDialogue' }> => a.type === 'startDialogue');
  return (
    <section className="icard">
      <h3>כשהשחקן לוחץ על <em>{o.name}</em>…</h3>
      {o.kind === 'exit' && rules.length === 0 && <Hint>יציאה עובדת לבד: לחיצה עליה מעבירה לסצנה. אפשר להוסיף חוק אם רוצים משהו מיוחד, כמו דלת נעולה.</Hint>}
      {o.kind !== 'exit' && rules.length === 0 && <Hint>עוד לא קורה כלום. בחרו מה יקרה:</Hint>}
      {rules.length > 1 && <p className="muted small">החוק הראשון שהתנאים שלו מתקיימים הוא זה שקורה. אפשר לשנות את הסדר עם החצים.</p>}
      <div className="rules">
        {rules.map((r, i) => <RuleCard key={r.id} rule={r} showTrigger={r.when.type !== 'click'} open={rules.length <= 2 || i === rules.length - 1} />)}
      </div>
      <div className="quick">
        {QUICK.map((q) => (
          <button type="button" key={q.id} onClick={() => add(q.id)}><span aria-hidden="true">{q.ico}</span>{q.label}</button>
        ))}
        <button type="button" className="wide" onClick={() => add('use')}><span aria-hidden="true">🖐</span>כשמשתמשים בחפץ על {o.name}…</button>
      </div>
      {dialogues.map((a) => p.dialogues[a.dialogueId] && (
        <button type="button" key={a.dialogueId} className="link" onClick={() => go('story', { storyTab: 'dialogues', dialogueId: a.dialogueId })}>
          לכתוב את השיחה "{p.dialogues[a.dialogueId].name}" במעבדת הסיפור ←
        </button>
      ))}
    </section>
  );
}

// ── Inspectors ────────────────────────────────────────────────────
function ObjectInspector({ o, sceneId, onDeleted }: { o: SceneObject; sceneId: string; onDeleted: () => void }) {
  const p = useProject();
  const edit = (fn: (d: Draft<SceneObject>) => void, key?: string) =>
    update((d) => { const ob = d.scenes[sceneId].objects.find((x) => x.id === o.id); if (ob) fn(ob); }, key);
  const remove = async () => {
    const n = p.rules.filter((r) => 'objectId' in r.when && r.when.objectId === o.id).length;
    if (!(await askConfirm(`למחוק את "${o.name}" מהסצנה?${n ? ` גם ${n} החוקים שלו יימחקו.` : ''}`))) return;
    update((d) => {
      d.scenes[sceneId].objects = d.scenes[sceneId].objects.filter((x) => x.id !== o.id);
      d.rules = d.rules.filter((r) => !('objectId' in r.when && r.when.objectId === o.id));
    });
    onDeleted();
  };
  const item = o.kind === 'item' && o.ref ? p.items[o.ref] : undefined;
  return (
    <div className="insp">
      <div className="insp-head">
        <span className="kind">{KIND_LABEL[o.kind]}</span>
        <input className="big-name" value={o.name} aria-label="שם" onChange={(e) => edit((d) => { d.name = e.target.value; }, `name:${o.id}`)} />
      </div>
      <div className="fields">
        {o.kind === 'character' && (
          <label>איזו דמות<Picker value={o.ref} options={characterOptions(p).filter((c) => c.id !== p.playerId)} onChange={(v) => edit((d) => { d.ref = v; d.name = getProject().characters[v].name; fitToSprite(getProject(), d); })} /></label>
        )}
        {o.kind === 'item' && (
          <>
            <label>איזה חפץ<Picker value={o.ref} options={itemOptions(p)} onCreate={createItem} createLabel="חפץ חדש" onChange={(v) => edit((d) => { d.ref = v; d.name = getProject().items[v].name; fitToSprite(getProject(), d); })} /></label>
            {item && <label>התמונה של החפץ<Picker value={item.spriteId} options={propOptions(p)} onChange={(v) => update((d) => { d.items[item.id].spriteId = v; const ob = d.scenes[sceneId].objects.find((x) => x.id === o.id); if (ob) fitToSprite(getProject(), ob); })} /></label>}
            {item && <label>השם של החפץ<input value={item.name} onChange={(e) => update((d) => {
              const old = d.items[item.id].name;
              d.items[item.id].name = e.target.value;
              for (const sc of Object.values(d.scenes)) for (const ob of sc.objects) if (ob.kind === 'item' && ob.ref === item.id && ob.name === old) ob.name = e.target.value;
              for (const r of d.rules) if (r.name === `לוקחים ${old}`) r.name = `לוקחים ${e.target.value}`;
            }, `iname:${item.id}`)} /></label>}
          </>
        )}
        {o.kind === 'prop' && (
          <label>תמונה<Picker value={o.spriteId} options={propOptions(p)} onChange={(v) => edit((d) => { d.spriteId = v; d.animId = undefined; fitToSprite(getProject(), d); })} /></label>
        )}
        {o.kind === 'exit' && (
          <>
            <label>יוצאים אל<Picker value={o.exitTo} options={sceneOptions(p).filter((s) => s.id !== sceneId)} onChange={(v) => edit((d) => { d.exitTo = v; })} /></label>
            <label>כיוון החץ<Picker compact value={o.arrow ?? 'auto'} options={[{ id: 'auto', label: 'אוטומטי' }, { id: 'right', label: 'ימינה ›' }, { id: 'left', label: 'שמאלה ‹' }, { id: 'up', label: 'למעלה ˄' }, { id: 'down', label: 'למטה ˅' }]}
              onChange={(v) => edit((d) => { d.arrow = v === 'auto' ? undefined : (v as SceneObject['arrow']); })} /></label>
          </>
        )}
        {o.kind !== 'hotspot' && o.kind !== 'exit' && (
          <label>גודל <output>{o.scale ?? 4}×</output>
            <input type="range" min={1} max={12} step={0.5} value={o.scale ?? 4} onChange={(e) => edit((d) => { d.scale = Number(e.target.value); fitToSprite(getProject(), d); }, `scale:${o.id}`)} />
          </label>
        )}
        {o.kind !== 'exit' && o.kind !== 'item' && (
          <label>מה רואים כשלוחצים (אם אין חוק)
            <textarea rows={2} value={o.description ?? ''} placeholder="למשל: ארון ישן ומאובק." onChange={(e) => edit((d) => { d.description = e.target.value || undefined; }, `desc:${o.id}`)} />
          </label>
        )}
        <label className="check"><input type="checkbox" checked={!o.visible} onChange={(e) => edit((d) => { d.visible = !e.target.checked; })} /> מוסתר בהתחלה (חוק יכול להראות אותו)</label>
        <label>מופיע רק אחרי ש…
          <span className="row">
            <Picker value={o.visibleFlag} placeholder="תמיד" options={flagOptions(p)} onChange={(v) => edit((d) => { d.visibleFlag = v; })} />
            {o.visibleFlag && <button type="button" className="x" aria-label="לבטל" onClick={() => edit((d) => { d.visibleFlag = undefined; })}>×</button>}
          </span>
        </label>
      </div>
      <InteractionCard o={o} sceneId={sceneId} />
      <button type="button" className="danger wide" onClick={() => void remove()}>למחוק את {o.name}</button>
    </div>
  );
}

function SceneInspector({ sceneId, walkEdit, setWalkEdit, onDeleted }: { sceneId: string; walkEdit: boolean; setWalkEdit: (b: boolean) => void; onDeleted: (next: string) => void }) {
  const p = useProject();
  const sc = p.scenes[sceneId];
  const enterRules = p.rules.filter((r) => r.when.type === 'enterScene' && r.when.sceneId === sceneId);
  // scenes that came with שוליית האופה can get their own background back
  const origBg = starter().scenes[sceneId]?.background.spriteId;
  const bgChanged = !!origBg && (sc.background.spriteId !== origBg || p.sprites[origBg]?.dataUrl !== starter().sprites[origBg]?.dataUrl);
  const restoreBg = async () => {
    if (!origBg || !(await askConfirm(`להחזיר ל"${sc.name}" את הרקע המקורי שלה?`, 'כן, להחזיר'))) return;
    const orig = starter().sprites[origBg];
    update((d) => {
      const wrongPicture = d.scenes[sceneId].background.spriteId !== origBg;
      d.scenes[sceneId].background.spriteId = origBg;
      // the scene only pointed at another picture: that's all to fix. Otherwise the picture itself changed:
      // put the original back, but keep the changed one as an extra background so nothing is lost.
      if (!wrongPicture || !d.sprites[origBg]) {
        const cur = d.sprites[origBg];
        if (cur) d.sprites[`${origBg}_${Date.now().toString(36)}`] = { ...JSON.parse(JSON.stringify(cur)), id: `${origBg}_${Date.now().toString(36)}`, name: `${cur.name} (הגרסה הקודמת)` };
        d.sprites[origBg] = JSON.parse(JSON.stringify(orig));
      }
    });
  };
  const remove = async () => {
    if (Object.keys(p.scenes).length < 2) return;
    if (!(await askConfirm(`למחוק את הסצנה "${sc.name}" עם כל מה שיש בה?`))) return;
    const ids = new Set(sc.objects.map((o) => o.id));
    const next = Object.keys(p.scenes).find((s) => s !== sceneId)!;
    update((d) => {
      delete d.scenes[sceneId];
      d.rules = d.rules.filter((r) => !(('objectId' in r.when && ids.has(r.when.objectId)) || (r.when.type === 'enterScene' && r.when.sceneId === sceneId)));
      for (const s of Object.values(d.scenes)) for (const o of s.objects) if (o.exitTo === sceneId) o.exitTo = undefined;
      if (d.startSceneId === sceneId) d.startSceneId = next;
    });
    onDeleted(next);
  };
  return (
    <div className="insp">
      <div className="insp-head">
        <span className="kind">סצנה</span>
        <input className="big-name" value={sc.name} aria-label="שם הסצנה" onChange={(e) => update((d) => { d.scenes[sceneId].name = e.target.value; }, `sname:${sceneId}`)} />
      </div>
      <Hint>גררו דמויות וחפצים מלמטה לתוך הסצנה. לחצו על משהו בסצנה כדי לבחור מה יקרה כשלוחצים עליו.</Hint>
      <div className="fields">
        <label>רקע<Picker value={sc.background.spriteId} placeholder="צבע בלבד" options={backgroundOptions(p)} onChange={(v) => update((d) => { d.scenes[sceneId].background.spriteId = v; })} /></label>
        <div className="row">
          <button type="button" className="small" onClick={() => go('bg', { sceneId, bgId: undefined, bgForScene: sceneId })}>🎨 לעצב רקע חדש</button>
          {sc.background.spriteId && <button type="button" className="small" onClick={() => go('bg', { sceneId, bgId: sc.background.spriteId, bgForScene: sceneId })}>לשנות את הרקע הזה</button>}
          {origBg && bgChanged && <button type="button" className="small" data-action="restore-bg" onClick={() => void restoreBg()}>↺ להחזיר את הרקע המקורי</button>}
        </div>
        <div className="daynight-switch" role="group" aria-label="יום או לילה">
          <button type="button" className={!sc.night ? 'on' : ''} aria-pressed={!sc.night} data-action="day" onClick={() => update((d) => { delete d.scenes[sceneId].night; })}>☀ יום</button>
          <button type="button" className={sc.night ? 'on' : ''} aria-pressed={!!sc.night} data-action="night" onClick={() => update((d) => { d.scenes[sceneId].night = true; })}>🌙 לילה</button>
        </div>
        {sc.night && sc.background.spriteId && p.sprites[sc.background.spriteId]?.night && <p className="muted small">הרקע הזה צויר כבר בלילה, אז הוא נראה אותו דבר ביום ובלילה.</p>}
        <label>צבע רקע<input type="color" value={sc.background.color} onChange={(e) => update((d) => { d.scenes[sceneId].background.color = e.target.value; }, `scolor:${sceneId}`)} /></label>
        <button type="button" className={`toggle ${walkEdit ? 'on' : ''}`} aria-pressed={walkEdit} onClick={() => setWalkEdit(!walkEdit)}>
          {walkEdit ? 'סיימתי לערוך את אזור ההליכה' : 'לערוך את אזור ההליכה'}
        </button>
        {p.startSceneId === sceneId
          ? <p className="ok small">★ המשחק מתחיל בסצנה הזאת</p>
          : <button type="button" onClick={() => update((d) => { d.startSceneId = sceneId; })}>★ להתחיל את המשחק כאן</button>}
      </div>
      <section className="icard">
        <h3>כשנכנסים ל<em>{sc.name}</em>…</h3>
        <div className="rules">{enterRules.map((r) => <RuleCard key={r.id} rule={r} showTrigger={false} />)}</div>
        <div className="quick">
          <button type="button" className="wide" onClick={() => addRule({ name: `נכנסים ל${sc.name}`, when: { type: 'enterScene', sceneId }, if: [], then: [{ type: 'message', text: '' }], once: true })}>
            <span aria-hidden="true">💬</span>להציג הודעה כשנכנסים
          </button>
        </div>
      </section>
      {Object.keys(p.scenes).length > 1 && <button type="button" className="danger wide" onClick={() => void remove()}>למחוק את הסצנה</button>}
    </div>
  );
}

// ── World Builder screen ──────────────────────────────────────────
export default function WorldBuilder() {
  const p = useProject();
  const nav = useNav();
  const sceneId = nav.sceneId && p.scenes[nav.sceneId] ? nav.sceneId : p.startSceneId;
  const [selected, setSelected] = useState<string | undefined>();
  const [walkEdit, setWalkEdit] = useState(false);
  const sc = p.scenes[sceneId];
  const sel = sc?.objects.find((o) => o.id === selected);

  useEffect(() => { setSelected(undefined); setWalkEdit(false); }, [sceneId]);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement;
      if (t.closest('input, textarea, select, [contenteditable]')) return;
      if (e.key === 'Escape') setSelected(undefined);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const newScene = () => {
    const id = newId('scene');
    const n = Object.keys(p.scenes).length + 1;
    update((d) => { d.scenes[id] = { id, name: `סצנה ${n}`, background: { color: '#cfe8ff', spriteId: undefined }, walkArea: { x: 40, y: 400, w: 880, h: 120 }, objects: [] }; });
    setNav({ sceneId: id });
  };

  if (!sc) return null;
  return (
    <div className="wb">
      <nav className="scene-list" aria-label="סצנות">
        <h2>סצנות</h2>
        {Object.values(p.scenes).map((s) => (
          <button type="button" key={s.id} className={`scene-thumb ${s.id === sceneId ? 'on' : ''}`} onClick={() => setNav({ sceneId: s.id })} data-scene={s.id}>
            <span className="thumb" style={{ background: s.background.color }}>{s.background.spriteId && <SpriteImg id={s.background.spriteId} size={120} />}</span>
            <span>{p.startSceneId === s.id ? '★ ' : ''}{s.name}{s.night ? ' 🌙' : ''}</span>
          </button>
        ))}
        <button type="button" className="add" onClick={newScene}>+ סצנה חדשה</button>
      </nav>
      <div className="wb-main">
        <Stage sceneId={sceneId} selected={selected} setSelected={setSelected} walkEdit={walkEdit} />
        <Palette sceneId={sceneId} onAdd={setSelected} />
      </div>
      <aside className="wb-side">
        {sel
          ? <ObjectInspector key={sel.id} o={sel} sceneId={sceneId} onDeleted={() => setSelected(undefined)} />
          : <SceneInspector sceneId={sceneId} walkEdit={walkEdit} setWalkEdit={setWalkEdit} onDeleted={(next) => setNav({ sceneId: next })} />}
      </aside>
    </div>
  );
}
