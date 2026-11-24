// מעצב החידות — all rules as sentence cards, plus items, quests and "things that happen".
import { useState } from 'react';
import { newId, update, useProject } from './store';
import { askConfirm, Hint, Picker, SpriteImg, Tabs } from './ui';
import { addRule, createFlag, createItem, RuleCard } from './RuleEditor';
import { objectOptions, propOptions, sceneOfRule, sceneOptions } from './options';
import { setNav, useNav } from './nav';

type Tab = 'rules' | 'items' | 'quests' | 'flags';

function RulesTab() {
  const p = useProject();
  const [scene, setScene] = useState<string>('all');
  const rules = p.rules.filter((r) => scene === 'all' || (scene === 'none' ? !sceneOfRule(p, r) : sceneOfRule(p, r) === scene));
  const add = () => {
    const obj = objectOptions(p, scene !== 'all' && scene !== 'none' ? scene : undefined)[0]?.id ?? '';
    addRule({ name: 'חוק חדש', when: { type: 'click', objectId: obj }, if: [], then: [{ type: 'message', text: '' }] });
  };
  return (
    <>
      <Hint>כל חוק הוא משפט: <b>כאשר</b> משהו קורה, <b>אם</b> התנאים מתקיימים, <b>אז</b> הפעולות קורות. כשכמה חוקים מתאימים לאותה לחיצה, הראשון ברשימה מנצח.</Hint>
      <div className="toolbar">
        <span>להראות חוקים של:</span>
        <Picker compact value={scene} options={[{ id: 'all', label: 'כל המשחק' }, ...sceneOptions(p), { id: 'none', label: 'חיבורי חפצים' }]} onChange={setScene} />
        <span className="spacer" />
        <button type="button" className="primary" onClick={add}>+ חוק חדש</button>
        <button type="button" onClick={() => {
          const it = Object.keys(p.items);
          addRule({ name: 'חיבור חפצים', when: { type: 'combine', a: it[0] ?? '', b: it[1] ?? '' }, if: [], then: [{ type: 'message', text: '' }] });
          setScene('none');
        }}>+ חיבור של שני חפצים</button>
      </div>
      <div className="rules">
        {rules.length === 0 && <p className="muted">אין עדיין חוקים כאן.</p>}
        {rules.map((r) => <RuleCard key={r.id} rule={r} open={rules.length <= 6} />)}
      </div>
    </>
  );
}

function ItemsTab() {
  const p = useProject();
  const uses = (id: string) => JSON.stringify(p.rules).split(`"${id}"`).length - 1;
  const remove = async (id: string) => {
    const n = uses(id);
    if (!(await askConfirm(`למחוק את החפץ "${p.items[id].name}"?${n ? ` משתמשים בו ב-${n} מקומות בחוקים, והם לא יעבדו.` : ''}`))) return;
    update((d) => {
      delete d.items[id];
      for (const s of Object.values(d.scenes)) s.objects = s.objects.filter((o) => !(o.kind === 'item' && o.ref === id));
    });
  };
  return (
    <>
      <Hint>אלה כל הדברים שאפשר לשים בתיק. כדי שחפץ יופיע בסצנה, גוררים אותו לשם בבונה העולם.</Hint>
      <div className="toolbar"><span className="spacer" /><button type="button" className="primary" onClick={() => createItem('חפץ חדש')}>+ חפץ חדש</button></div>
      <div className="cards">
        {Object.values(p.items).map((it) => (
          <div className="card item-card" key={it.id} data-item={it.id}>
            <div className="item-pic"><SpriteImg id={it.spriteId} size={56} /></div>
            <div className="fields">
              <label>שם<input value={it.name} onChange={(e) => update((d) => { d.items[it.id].name = e.target.value; }, `iname:${it.id}`)} /></label>
              <label>תמונה<Picker value={it.spriteId} options={propOptions(p)} onChange={(v) => update((d) => { d.items[it.id].spriteId = v; })} /></label>
              <label>מה כתוב עליו<textarea rows={2} value={it.description} onChange={(e) => update((d) => { d.items[it.id].description = e.target.value; }, `idesc:${it.id}`)} /></label>
            </div>
            <button type="button" className="x corner" aria-label={`למחוק ${it.name}`} onClick={() => void remove(it.id)}>🗑</button>
          </div>
        ))}
      </div>
    </>
  );
}

function QuestsTab() {
  const p = useProject();
  const addQuest = () => {
    const id = newId('quest');
    update((d) => { d.quests[id] = { id, name: 'משימה חדשה', steps: [{ id: newId('step'), text: 'שלב ראשון' }] }; });
  };
  return (
    <>
      <Hint>משימה היא רשימת שלבים שהשחקן רואה בפינת המסך. חוק עם הפעולה "לסמן שלב במשימה" מסמן שלב כגמור.</Hint>
      <div className="toolbar"><span className="spacer" /><button type="button" className="primary" onClick={addQuest}>+ משימה חדשה</button></div>
      <div className="cards">
        {Object.values(p.quests).map((q) => (
          <div className="card" key={q.id}>
            <input className="big-name" value={q.name} aria-label="שם המשימה" onChange={(e) => update((d) => { d.quests[q.id].name = e.target.value; }, `qname:${q.id}`)} />
            <ol className="steps">
              {q.steps.map((s, i) => (
                <li key={s.id}>
                  <input value={s.text} aria-label={`שלב ${i + 1}`} onChange={(e) => update((d) => { d.quests[q.id].steps[i].text = e.target.value; }, `step:${s.id}`)} />
                  <button type="button" className="x" aria-label="למעלה" disabled={i === 0} onClick={() => update((d) => { const st = d.quests[q.id].steps; [st[i - 1], st[i]] = [st[i], st[i - 1]]; })}>↑</button>
                  <button type="button" className="x" aria-label="למחוק שלב" onClick={async () => { if (await askConfirm(`למחוק את השלב "${s.text}"?`)) update((d) => { d.quests[q.id].steps.splice(i, 1); }); }}>×</button>
                </li>
              ))}
            </ol>
            <div className="row">
              <button type="button" className="add small" onClick={() => update((d) => { d.quests[q.id].steps.push({ id: newId('step'), text: '' }); })}>+ שלב</button>
              <span className="spacer" />
              <button type="button" className="danger small" onClick={async () => { if (await askConfirm(`למחוק את המשימה "${q.name}"?`)) update((d) => { delete d.quests[q.id]; }); }}>למחוק משימה</button>
            </div>
          </div>
        ))}
      </div>
    </>
  );
}

function FlagsTab() {
  const p = useProject();
  return (
    <>
      <Hint>"דברים שקורים" הם סימנים שהמשחק זוכר, כמו "הדלת נפתחה" או "דיברתי עם האופה". חוק יכול לסמן אותם, וחוק אחר יכול לבדוק אותם.</Hint>
      <div className="toolbar"><span className="spacer" /><button type="button" className="primary" onClick={() => createFlag('משהו חדש קרה')}>+ דבר חדש שקורה</button></div>
      <ul className="flag-list">
        {Object.entries(p.flags).map(([id, f]) => (
          <li key={id}>
            <input value={f.name} aria-label="שם" onChange={(e) => update((d) => { d.flags[id].name = e.target.value; }, `fname:${id}`)} />
            <label className="check"><input type="checkbox" checked={f.initial} onChange={(e) => update((d) => { d.flags[id].initial = e.target.checked; })} /> כבר קרה בהתחלה</label>
            <button type="button" className="x" aria-label="למחוק" onClick={async () => { if (await askConfirm(`למחוק את "${f.name}"?`)) update((d) => { delete d.flags[id]; }); }}>×</button>
          </li>
        ))}
      </ul>
    </>
  );
}

export default function PuzzleDesigner() {
  const nav = useNav();
  const tab = (nav.puzzleTab as Tab) ?? 'rules';
  return (
    <div className="studio">
      <Tabs<Tab> value={tab} onChange={(t) => setNav({ puzzleTab: t })}
        tabs={[{ id: 'rules', label: 'חוקים' }, { id: 'items', label: 'חפצים' }, { id: 'quests', label: 'משימות' }, { id: 'flags', label: 'דברים שקורים' }]} />
      {tab === 'rules' && <RulesTab />}
      {tab === 'items' && <ItemsTab />}
      {tab === 'quests' && <QuestsTab />}
      {tab === 'flags' && <FlagsTab />}
    </div>
  );
}
