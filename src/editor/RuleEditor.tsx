// "כאשר … אם … אז …" — sentence cards for rules, conditions and actions.
// The same pieces are used by the Puzzle Designer, the interaction card and dialogue choices.
import type { Draft } from 'immer';
import type { Action, Condition, Project, Rule, Trigger } from '../model/types';
import { newId, update, useProject } from './store';
import { describeTrigger } from '../logic/rules';
import { askConfirm, Picker } from './ui';
import {
  animOptions, characterOptions, dialogueOptions, flagOptions, itemOptions, objectOptions,
  sceneOptions, soundOptions, stepOptions,
} from './options';

export type Edit<T> = (fn: (d: T) => void, key?: string) => void;

// creators used by pickers' "+ new" box
export function createFlag(name: string) {
  const id = newId('flag');
  update((d) => { d.flags[id] = { name, initial: false }; });
  return id;
}
export function createItem(name: string) {
  const id = newId('item');
  update((d) => { d.items[id] = { id, name, description: '' }; });
  return id;
}
export function createDialogue(name: string, speaker?: string) {
  const id = newId('dlg');
  update((d) => {
    d.dialogues[id] = { id, name, start: 'n1', nodes: { n1: { id: 'n1', speaker: speaker ?? 'narrator', text: '' } } };
  });
  return id;
}

// ── Conditions ────────────────────────────────────────────────────
type CondKind = 'has' | 'hasNot' | 'hasAll' | 'flagOn' | 'flagOff' | 'stepDone' | 'stepNotDone';
const COND_KINDS: { id: CondKind; label: string }[] = [
  { id: 'has', label: 'יש בתיק' },
  { id: 'hasNot', label: 'אין בתיק' },
  { id: 'hasAll', label: 'יש בתיק את כל אלה' },
  { id: 'flagOn', label: 'כבר קרה' },
  { id: 'flagOff', label: 'עוד לא קרה' },
  { id: 'stepDone', label: 'סיימתי את השלב' },
  { id: 'stepNotDone', label: 'עוד לא סיימתי את השלב' },
];
const condKind = (c: Condition): CondKind =>
  c.type === 'hasItem' ? (c.not ? 'hasNot' : 'has')
    : c.type === 'hasAllItems' ? 'hasAll'
      : c.type === 'flag' ? (c.value ? 'flagOn' : 'flagOff')
        : c.done ? 'stepDone' : 'stepNotDone';

function makeCond(k: CondKind, p: Project): Condition {
  const item = Object.keys(p.items)[0] ?? '';
  const flag = Object.keys(p.flags)[0] ?? '';
  const q = Object.values(p.quests)[0];
  switch (k) {
    case 'has': return { type: 'hasItem', itemId: item };
    case 'hasNot': return { type: 'hasItem', itemId: item, not: true };
    case 'hasAll': return { type: 'hasAllItems', itemIds: item ? [item] : [] };
    case 'flagOn': return { type: 'flag', flagId: flag, value: true };
    case 'flagOff': return { type: 'flag', flagId: flag, value: false };
    case 'stepDone': return { type: 'questStep', questId: q?.id ?? '', stepId: q?.steps[0]?.id ?? '', done: true };
    case 'stepNotDone': return { type: 'questStep', questId: q?.id ?? '', stepId: q?.steps[0]?.id ?? '', done: false };
  }
}

export function ConditionList({ conds, edit, keyBase, emptyText = 'תמיד (בלי תנאים)' }: {
  conds: Condition[]; edit: Edit<Condition[]>; keyBase: string; emptyText?: string;
}) {
  const p = useProject();
  return (
    <div className="clist">
      {conds.length === 0 && <span className="muted small">{emptyText}</span>}
      {conds.map((c, i) => (
        <div className="chip-row" key={i}>
          {i > 0 && <span className="and">וגם</span>}
          <Picker compact value={condKind(c)} options={COND_KINDS} onChange={(k) => edit((d) => { d[i] = makeCond(k as CondKind, p); })} />
          {c.type === 'hasItem' && (
            <Picker value={c.itemId} options={itemOptions(p)} onCreate={createItem} createLabel="חפץ חדש"
              onChange={(v) => edit((d) => { (d[i] as typeof c).itemId = v; })} />
          )}
          {c.type === 'hasAllItems' && (
            <span className="multi">
              {c.itemIds.map((it, j) => (
                <span className="tag" key={j}>
                  <Picker compact value={it} options={itemOptions(p)} onChange={(v) => edit((d) => { (d[i] as typeof c).itemIds[j] = v; })} />
                  <button type="button" className="x" aria-label="להוריד" onClick={() => edit((d) => { (d[i] as typeof c).itemIds.splice(j, 1); })}>×</button>
                </span>
              ))}
              <Picker compact placeholder="+ עוד חפץ" options={itemOptions(p)} onChange={(v) => edit((d) => { (d[i] as typeof c).itemIds.push(v); })} />
            </span>
          )}
          {c.type === 'flag' && (
            <Picker value={c.flagId} options={flagOptions(p)} onCreate={createFlag} createLabel="משהו שקורה"
              onChange={(v) => edit((d) => { (d[i] as typeof c).flagId = v; })} />
          )}
          {c.type === 'questStep' && (
            <Picker value={`${c.questId}/${c.stepId}`} options={stepOptions(p)}
              onChange={(v) => edit((d) => { const [q, s] = v.split('/'); Object.assign(d[i], { questId: q, stepId: s }); })} />
          )}
          <button type="button" className="x" aria-label="למחוק תנאי" title="למחוק תנאי" onClick={() => edit((d) => { d.splice(i, 1); })}>×</button>
        </div>
      ))}
      <button type="button" className="add small" onClick={() => edit((d) => { d.push(makeCond('has', p)); }, `${keyBase}:addc`)}>+ תנאי</button>
    </div>
  );
}

// ── Actions ───────────────────────────────────────────────────────
type ActKind = Action['type'];
export const ACT_KINDS: { id: ActKind; label: string }[] = [
  { id: 'message', label: 'להציג הודעה' },
  { id: 'say', label: 'דמות אומרת' },
  { id: 'addItem', label: 'לתת חפץ לשחקן' },
  { id: 'removeItem', label: 'לקחת חפץ מהשחקן' },
  { id: 'goToScene', label: 'לעבור לסצנה' },
  { id: 'startDialogue', label: 'להתחיל שיחה' },
  { id: 'setFlag', label: 'לסמן שמשהו קרה' },
  { id: 'show', label: 'להראות דבר מוסתר' },
  { id: 'hide', label: 'להעלים דבר' },
  { id: 'playAnim', label: 'להפעיל אנימציה' },
  { id: 'playSound', label: 'להשמיע צליל' },
  { id: 'completeStep', label: 'לסמן שלב במשימה' },
  { id: 'win', label: 'ניצחון! סוף המשחק' },
];

export function makeAction(k: ActKind, p: Project, objectId?: string): Action {
  const first = <T,>(o: Record<string, T>) => Object.keys(o)[0] ?? '';
  const q = Object.values(p.quests)[0];
  switch (k) {
    case 'message': return { type: 'message', text: '' };
    case 'say': return { type: 'say', characterId: first(p.characters), text: '' };
    case 'addItem': return { type: 'addItem', itemId: first(p.items) };
    case 'removeItem': return { type: 'removeItem', itemId: first(p.items) };
    case 'goToScene': return { type: 'goToScene', sceneId: first(p.scenes) };
    case 'startDialogue': return { type: 'startDialogue', dialogueId: first(p.dialogues) };
    case 'setFlag': return { type: 'setFlag', flagId: first(p.flags), value: true };
    case 'show': return { type: 'show', objectId: objectId ?? '' };
    case 'hide': return { type: 'hide', objectId: objectId ?? '' };
    case 'playAnim': return { type: 'playAnim', objectId: objectId ?? '', animId: first(p.animations) };
    case 'playSound': return { type: 'playSound', soundId: first(p.sounds) };
    case 'completeStep': return { type: 'completeStep', questId: q?.id ?? '', stepId: q?.steps[0]?.id ?? '' };
    case 'win': return { type: 'win', text: 'כל הכבוד! ניצחת!' };
  }
}

export function ActionList({ acts, edit, keyBase, objectId }: { acts: Action[]; edit: Edit<Action[]>; keyBase: string; objectId?: string }) {
  const p = useProject();
  const set = <A extends Action>(i: number, fn: (a: A) => void, key?: string) => edit((d) => fn(d[i] as A), key);
  return (
    <div className="alist">
      {acts.length === 0 && <span className="muted small">עוד לא בחרתם מה קורה.</span>}
      {acts.map((a, i) => (
        <div className="act" key={i}>
          <span className="num">{i + 1}</span>
          <div className="act-body">
            <div className="chip-row">
              <Picker compact value={a.type} options={ACT_KINDS} onChange={(k) => edit((d) => { d[i] = makeAction(k as ActKind, p, objectId); })} />
              {(a.type === 'addItem' || a.type === 'removeItem') && (
                <Picker value={a.itemId} options={itemOptions(p)} onCreate={createItem} createLabel="חפץ חדש" onChange={(v) => set<typeof a>(i, (x) => { x.itemId = v; })} />
              )}
              {a.type === 'say' && <Picker value={a.characterId} options={characterOptions(p)} onChange={(v) => set<typeof a>(i, (x) => { x.characterId = v; })} />}
              {a.type === 'goToScene' && <Picker value={a.sceneId} options={sceneOptions(p)} onChange={(v) => set<typeof a>(i, (x) => { x.sceneId = v; })} />}
              {a.type === 'startDialogue' && (
                <Picker value={a.dialogueId} options={dialogueOptions(p)} onCreate={(n) => createDialogue(n)} createLabel="שיחה חדשה"
                  onChange={(v) => set<typeof a>(i, (x) => { x.dialogueId = v; })} />
              )}
              {a.type === 'setFlag' && (
                <>
                  <Picker value={a.flagId} options={flagOptions(p)} onCreate={createFlag} createLabel="משהו שקורה" onChange={(v) => set<typeof a>(i, (x) => { x.flagId = v; })} />
                  <label className="check"><input type="checkbox" checked={!a.value} onChange={(e) => set<typeof a>(i, (x) => { x.value = !e.target.checked; })} /> לבטל (לא קרה)</label>
                </>
              )}
              {(a.type === 'show' || a.type === 'hide' || a.type === 'playAnim') && (
                <Picker value={a.objectId} options={objectOptions(p)} onChange={(v) => set<typeof a>(i, (x) => { x.objectId = v; })} />
              )}
              {a.type === 'playAnim' && <Picker value={a.animId} options={animOptions(p)} onChange={(v) => set<typeof a>(i, (x) => { x.animId = v; })} />}
              {a.type === 'playSound' && <Picker value={a.soundId} options={soundOptions(p)} onChange={(v) => set<typeof a>(i, (x) => { x.soundId = v; })} />}
              {a.type === 'completeStep' && (
                <Picker value={`${a.questId}/${a.stepId}`} options={stepOptions(p)}
                  onChange={(v) => edit((d) => { const [q, s] = v.split('/'); Object.assign(d[i], { questId: q, stepId: s }); })} />
              )}
            </div>
            {(a.type === 'message' || a.type === 'say' || a.type === 'win') && (
              <textarea rows={2} value={a.text} placeholder={a.type === 'win' ? 'הודעת הניצחון…' : 'מה כתוב?'} aria-label="טקסט"
                onChange={(e) => set<typeof a>(i, (x) => { x.text = e.target.value; }, `${keyBase}:t${i}`)} />
            )}
          </div>
          <div className="act-tools">
            <button type="button" className="x" aria-label="להזיז למעלה" title="למעלה" disabled={i === 0} onClick={() => edit((d) => { const [x] = d.splice(i, 1); d.splice(i - 1, 0, x); })}>↑</button>
            <button type="button" className="x" aria-label="למחוק פעולה" title="למחוק" onClick={() => edit((d) => { d.splice(i, 1); })}>×</button>
          </div>
        </div>
      ))}
      <Picker compact placeholder="+ פעולה" options={ACT_KINDS} onChange={(k) => edit((d) => { d.push(makeAction(k as ActKind, p, objectId)); })} />
    </div>
  );
}

// ── Trigger ───────────────────────────────────────────────────────
type TrigKind = Trigger['type'];
const TRIG_KINDS: { id: TrigKind; label: string }[] = [
  { id: 'click', label: 'השחקן לוחץ על' },
  { id: 'useItem', label: 'השחקן משתמש בחפץ על' },
  { id: 'combine', label: 'השחקן מחבר שני חפצים' },
  { id: 'enterScene', label: 'השחקן נכנס לסצנה' },
];
function makeTrigger(k: TrigKind, p: Project, objectId?: string): Trigger {
  const obj = objectId ?? objectOptions(p)[0]?.id ?? '';
  const items = Object.keys(p.items);
  switch (k) {
    case 'click': return { type: 'click', objectId: obj };
    case 'useItem': return { type: 'useItem', itemId: items[0] ?? '', objectId: obj };
    case 'combine': return { type: 'combine', a: items[0] ?? '', b: items[1] ?? '' };
    case 'enterScene': return { type: 'enterScene', sceneId: Object.keys(p.scenes)[0] ?? '' };
  }
}

function TriggerEditor({ t, edit }: { t: Trigger; edit: (fn: (t: Draft<Trigger>) => void) => void }) {
  const p = useProject();
  return (
    <div className="chip-row">
      <Picker compact value={t.type} options={TRIG_KINDS} onChange={(k) => edit((d) => { Object.keys(d).forEach((key) => delete (d as Record<string, unknown>)[key]); Object.assign(d, makeTrigger(k as TrigKind, p, 'objectId' in t ? t.objectId : undefined)); })} />
      {t.type === 'useItem' && <Picker value={t.itemId} options={itemOptions(p)} onCreate={createItem} createLabel="חפץ חדש" onChange={(v) => edit((d) => { (d as typeof t).itemId = v; })} />}
      {t.type === 'useItem' && <span className="word">על</span>}
      {(t.type === 'click' || t.type === 'useItem') && <Picker value={t.objectId} options={objectOptions(p)} onChange={(v) => edit((d) => { (d as typeof t).objectId = v; })} />}
      {t.type === 'combine' && (
        <>
          <Picker value={t.a} options={itemOptions(p)} onChange={(v) => edit((d) => { (d as typeof t).a = v; })} />
          <span className="word">עם</span>
          <Picker value={t.b} options={itemOptions(p)} onChange={(v) => edit((d) => { (d as typeof t).b = v; })} />
        </>
      )}
      {t.type === 'enterScene' && <Picker value={t.sceneId} options={sceneOptions(p)} onChange={(v) => edit((d) => { (d as typeof t).sceneId = v; })} />}
    </div>
  );
}

// ── Rule card ─────────────────────────────────────────────────────
export function RuleCard({ rule, showTrigger = true, open = true }: { rule: Rule; showTrigger?: boolean; open?: boolean }) {
  const p = useProject();
  const idx = p.rules.findIndex((r) => r.id === rule.id);
  const editRule = (fn: (r: Draft<Rule>) => void, key?: string) =>
    update((d) => { const r = d.rules.find((x) => x.id === rule.id); if (r) fn(r); }, key);
  const objectId = 'objectId' in rule.when ? rule.when.objectId : undefined;
  const move = (dir: -1 | 1) => update((d) => {
    const i = d.rules.findIndex((x) => x.id === rule.id);
    // move past the neighbouring rule that listens to the same thing, so order matters where it should
    let j = i + dir;
    while (j >= 0 && j < d.rules.length && JSON.stringify(d.rules[j].when) !== JSON.stringify(rule.when)) j += dir;
    if (j < 0 || j >= d.rules.length) j = i + dir;
    if (j < 0 || j >= d.rules.length) return;
    const [r] = d.rules.splice(i, 1);
    d.rules.splice(j, 0, r);
  });
  const remove = async () => {
    if (await askConfirm(`למחוק את החוק "${rule.name}"?`)) update((d) => { d.rules = d.rules.filter((r) => r.id !== rule.id); });
  };
  return (
    <details className="rule" open={open} data-rule={rule.id}>
      <summary>
        <input className="rule-name" value={rule.name} aria-label="שם החוק" onClick={(e) => e.preventDefault()}
          onKeyDown={(e) => e.stopPropagation()} onChange={(e) => editRule((r) => { r.name = e.target.value; }, `rule:${rule.id}:name`)} />
        {!showTrigger ? null : <span className="rule-when muted small">{describeTrigger(p, rule.when)}</span>}
        <span className="rule-tools">
          <button type="button" className="x" title="להזיז למעלה (קודם)" aria-label="למעלה" disabled={idx <= 0} onClick={(e) => { e.preventDefault(); move(-1); }}>↑</button>
          <button type="button" className="x" title="להזיז למטה" aria-label="למטה" disabled={idx >= p.rules.length - 1} onClick={(e) => { e.preventDefault(); move(1); }}>↓</button>
          <button type="button" className="x" title="למחוק חוק" aria-label="למחוק חוק" onClick={(e) => { e.preventDefault(); void remove(); }}>🗑</button>
        </span>
      </summary>
      {showTrigger && (
        <div className="clause when"><span className="kw">כאשר</span>
          <TriggerEditor t={rule.when} edit={(fn) => editRule((r) => fn(r.when))} />
        </div>
      )}
      <div className="clause if"><span className="kw">אם</span>
        <ConditionList conds={rule.if} keyBase={`rule:${rule.id}`} edit={(fn, key) => editRule((r) => fn(r.if), key)} />
      </div>
      <div className="clause then"><span className="kw">אז</span>
        <ActionList acts={rule.then} keyBase={`rule:${rule.id}`} objectId={objectId} edit={(fn, key) => editRule((r) => fn(r.then), key)} />
      </div>
      <div className="clause opts">
        <label className="check"><input type="checkbox" checked={!!rule.once} onChange={(e) => editRule((r) => { r.once = e.target.checked || undefined; })} /> רק פעם אחת</label>
        {rule.if.length > 0 && (
          <label className="else">אם התנאים לא מתקיימים, להציג:
            <input value={rule.elseMessage ?? ''} placeholder="למשל: הדלת נעולה." onChange={(e) => editRule((r) => { r.elseMessage = e.target.value || undefined; }, `rule:${rule.id}:else`)} />
          </label>
        )}
      </div>
    </details>
  );
}

export function addRule(rule: Omit<Rule, 'id'>): string {
  const id = newId('rule');
  update((d) => { d.rules.push({ id, ...rule }); });
  return id;
}
