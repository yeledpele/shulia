// מעבדת הסיפור — the story, the characters, and conversations with choices.
import type { Draft } from 'immer';
import type { AnimState, Dialogue, DialogueNode } from '../model/types';
import { getProject, newId, update, useProject } from './store';
import { askConfirm, Hint, Picker, SpriteImg, Tabs } from './ui';
import { ActionList, ConditionList, createDialogue } from './RuleEditor';
import { animOptions, propOptions } from './options';
import { setNav, useNav } from './nav';

type Tab = 'story' | 'characters' | 'dialogues';

const QUESTIONS = [
  'מי הגיבור של המשחק?', 'מה הגיבור רוצה?', 'מה מפריע לו?', 'איפה זה קורה?',
  'מי עוזר לגיבור?', 'מה הסוד של המשחק?', 'מה הדבר הכי מצחיק שקורה?', 'איך זה נגמר?',
];
const TRAITS = ['סקרן', 'אמיץ', 'ביישן', 'מצחיק', 'גרומפי', 'חכם', 'מבולבל', 'חם', 'חשדן', 'עליז', 'עצלן', 'פטפטן'];

function StoryTab() {
  const p = useProject();
  return (
    <div className="story">
      <label className="title-field">שם המשחק
        <input value={p.meta.title} onChange={(e) => update((d) => { d.meta.title = e.target.value; }, 'title')} />
      </label>
      <label className="title-field">שם היוצר/ת
        <input value={p.meta.author} placeholder="מי עשה את המשחק?" onChange={(e) => update((d) => { d.meta.author = e.target.value; }, 'author')} />
      </label>
      <div className="story-grid">
        <div className="paper">
          <label htmlFor="story-text">הסיפור</label>
          <textarea id="story-text" rows={10} value={p.story.text} placeholder="היה היה פעם…" onChange={(e) => update((d) => { d.story.text = e.target.value; }, 'story')} />
          {p.story.notes.map((n, i) => (
            <div className="note" key={i}>
              <div className="row"><strong>{n.question}</strong><span className="spacer" />
                <button type="button" className="x" aria-label="למחוק שאלה" onClick={async () => { if (await askConfirm(`למחוק את התשובה לשאלה "${n.question}"?`)) update((d) => { d.story.notes.splice(i, 1); }); }}>×</button>
              </div>
              <textarea rows={2} value={n.answer} placeholder="התשובה שלי…" onChange={(e) => update((d) => { d.story.notes[i].answer = e.target.value; }, `note:${i}`)} />
            </div>
          ))}
        </div>
        <aside className="qcards">
          <h3>שאלות שעוזרות לחשוב</h3>
          <p className="muted small">לוחצים על שאלה, והיא מופיעה בדף. התשובה שלכם.</p>
          {QUESTIONS.map((q) => {
            const used = p.story.notes.some((n) => n.question === q);
            return (
              <button type="button" key={q} className={`qcard ${used ? 'used' : ''}`} disabled={used}
                onClick={() => update((d) => { d.story.notes.push({ question: q, answer: '' }); })}>{q}</button>
            );
          })}
        </aside>
      </div>
    </div>
  );
}

function CharactersTab() {
  const p = useProject();
  const add = () => {
    const id = newId('char');
    update((d) => { d.characters[id] = { id, name: 'דמות חדשה', description: '', personality: [], color: '#7950f2', spriteId: 'spr_farmer', anims: {} }; });
  };
  const remove = async (id: string) => {
    const c = p.characters[id];
    if (!(await askConfirm(`למחוק את ${c.name}? היא/הוא ייעלמו גם מכל הסצנות.`))) return;
    update((d) => {
      delete d.characters[id];
      for (const s of Object.values(d.scenes)) s.objects = s.objects.filter((o) => !(o.kind === 'character' && o.ref === id));
    });
  };
  const STATES: { id: AnimState; label: string }[] = [
    { id: 'idle', label: 'עומד' }, { id: 'walk', label: 'הולך' }, { id: 'talk', label: 'מדבר' }, { id: 'celebrate', label: 'חוגג' },
  ];
  return (
    <>
      <div className="toolbar"><span className="spacer" /><button type="button" className="primary" onClick={add}>+ דמות חדשה</button></div>
      <div className="cards">
        {Object.values(p.characters).map((c) => {
          const set = (fn: (d: Draft<typeof c>) => void, key?: string) => update((d) => fn(d.characters[c.id]), key);
          return (
            <div className="card char-card" key={c.id} data-char={c.id}>
              <div className="char-pic" style={{ borderColor: c.color }}><SpriteImg id={c.spriteId} size={96} /></div>
              <div className="fields">
                <input className="big-name" value={c.name} aria-label="שם" onChange={(e) => set((d) => { d.name = e.target.value; }, `cname:${c.id}`)} />
                {p.playerId === c.id
                  ? <p className="ok small">★ זאת הדמות שהשחקן משחק</p>
                  : <button type="button" className="small" onClick={() => update((d) => { d.playerId = c.id; })}>★ לשחק בדמות הזאת</button>}
                <label>תמונה<Picker value={c.spriteId} options={propOptions(p)} onChange={(v) => set((d) => { d.spriteId = v; })} /></label>
                <label>מי זה?<textarea rows={2} value={c.description} onChange={(e) => set((d) => { d.description = e.target.value; }, `cdesc:${c.id}`)} /></label>
                <div className="traits" role="group" aria-label="אופי">
                  {TRAITS.map((t) => {
                    const on = c.personality.includes(t);
                    return <button type="button" key={t} className={`trait ${on ? 'on' : ''}`} aria-pressed={on}
                      onClick={() => set((d) => { d.personality = on ? d.personality.filter((x) => x !== t) : [...d.personality, t]; })}>{t}</button>;
                  })}
                </div>
                <label className="row">צבע הדיבור <input type="color" value={c.color} onChange={(e) => set((d) => { d.color = e.target.value; }, `ccolor:${c.id}`)} /></label>
                <details>
                  <summary>אנימציות</summary>
                  {STATES.map((s) => (
                    <label key={s.id} className="row">{s.label}
                      <Picker compact value={c.anims[s.id]} placeholder="בלי" options={animOptions(p)} onChange={(v) => set((d) => { d.anims[s.id] = v; })} />
                    </label>
                  ))}
                </details>
              </div>
              {p.playerId !== c.id && <button type="button" className="x corner" aria-label={`למחוק ${c.name}`} onClick={() => void remove(c.id)}>🗑</button>}
            </div>
          );
        })}
      </div>
    </>
  );
}

/** Bubbles in reading order: from the start, following next/choices; leftovers at the end. */
function orderNodes(d: Dialogue): DialogueNode[] {
  const seen = new Set<string>(); const out: DialogueNode[] = []; const q = [d.start];
  while (q.length) {
    const id = q.shift()!;
    if (seen.has(id) || !d.nodes[id]) continue;
    seen.add(id); out.push(d.nodes[id]);
    const n = d.nodes[id];
    if (n.next) q.push(n.next);
    for (const c of n.choices ?? []) if (c.next) q.push(c.next);
  }
  for (const n of Object.values(d.nodes)) if (!seen.has(n.id)) out.push(n);
  return out;
}

function DialogueEditor({ d }: { d: Dialogue }) {
  const p = useProject();
  const nodes = orderNodes(d);
  const num = (id?: string) => (id ? nodes.findIndex((n) => n.id === id) + 1 : 0);
  const edit = (fn: (dd: Draft<Dialogue>) => void, key?: string) => update((x) => fn(x.dialogues[d.id]), key);
  const speakers = [
    { id: 'narrator', label: 'מספר/ת' },
    ...Object.values(p.characters).map((c) => ({ id: c.id, label: c.name, icon: c.spriteId })),
  ];
  const nextOptions = (self: string) => [
    { id: '__end', label: 'סוף השיחה' },
    ...nodes.filter((n) => n.id !== self).map((n) => ({ id: n.id, label: `בועה ${num(n.id)}: ${n.text.slice(0, 24) || '…'}` })),
    { id: '__new', label: '+ בועה חדשה' },
  ];
  const setNext = (pick: string, apply: (dd: Draft<Dialogue>, next: string | undefined) => void, speaker: string) => {
    edit((dd) => {
      if (pick === '__new') {
        const id = newId('n');
        dd.nodes[id] = { id, speaker: speaker === 'narrator' ? speaker : (Object.keys(getProject().characters).find((c) => c === speaker) ?? 'narrator'), text: '' };
        apply(dd, id);
      } else apply(dd, pick === '__end' ? undefined : pick);
    });
  };
  const removeNode = async (id: string) => {
    if (!(await askConfirm(`למחוק את בועה ${num(id)}?`))) return;
    edit((dd) => {
      delete dd.nodes[id];
      for (const n of Object.values(dd.nodes)) {
        if (n.next === id) n.next = undefined;
        for (const c of n.choices ?? []) if (c.next === id) c.next = undefined;
      }
    });
  };
  return (
    <div className="dlg">
      <input className="big-name" value={d.name} aria-label="שם השיחה" onChange={(e) => edit((dd) => { dd.name = e.target.value; }, `dname:${d.id}`)} />
      {nodes.map((n) => {
        const editN = (fn: (nn: Draft<DialogueNode>) => void, key?: string) => edit((dd) => fn(dd.nodes[n.id]), key);
        const ch = p.characters[n.speaker];
        return (
          <div className={`bubble ${n.id === d.start ? 'start' : ''}`} key={n.id} data-node={n.id} style={{ borderInlineStartColor: ch?.color ?? 'var(--muted)' }}>
            <div className="row">
              <span className="bnum">בועה {num(n.id)}</span>
              {n.id === d.start ? <span className="badge">ההתחלה</span>
                : <button type="button" className="small ghost" onClick={() => edit((dd) => { dd.start = n.id; })}>להתחיל מכאן</button>}
              <span className="spacer" />
              {n.id !== d.start && <button type="button" className="x" aria-label="למחוק בועה" onClick={() => void removeNode(n.id)}>🗑</button>}
            </div>
            <div className="row speaker">
              {ch?.spriteId && <SpriteImg id={ch.spriteId} size={40} />}
              <Picker value={n.speaker} options={speakers} onChange={(v) => editN((nn) => { nn.speaker = v; })} />
              <span>אומר/ת:</span>
            </div>
            <textarea rows={2} value={n.text} placeholder="מה נאמר?" aria-label="טקסט הבועה" onChange={(e) => editN((nn) => { nn.text = e.target.value; }, `ntext:${d.id}:${n.id}`)} />
            {(n.choices?.length ?? 0) === 0 ? (
              <div className="row then-row">
                <span>ואז:</span>
                <Picker compact value={n.next ?? '__end'} options={nextOptions(n.id)} onChange={(v) => setNext(v, (dd, nx) => { dd.nodes[n.id].next = nx; }, n.speaker)} />
                <button type="button" className="small" onClick={() => editN((nn) => { nn.choices = [{ text: '' }, { text: '' }]; nn.next = undefined; })}>+ בחירות לשחקן</button>
              </div>
            ) : (
              <div className="choices">
                <span className="muted small">השחקן בוחר:</span>
                {n.choices!.map((c, i) => (
                  <div className="choice" key={i}>
                    <div className="row">
                      <span className="cnum">{i + 1}.</span>
                      <input value={c.text} placeholder="מה השחקן אומר?" aria-label={`בחירה ${i + 1}`} onChange={(e) => editN((nn) => { nn.choices![i].text = e.target.value; }, `ch:${n.id}:${i}`)} />
                      <button type="button" className="x" aria-label="למחוק בחירה" onClick={() => editN((nn) => { nn.choices!.splice(i, 1); if (!nn.choices!.length) nn.choices = undefined; })}>×</button>
                    </div>
                    <div className="row then-row">
                      <span>ואז:</span>
                      <Picker compact value={c.next ?? '__end'} options={nextOptions(n.id)} onChange={(v) => setNext(v, (dd, nx) => { dd.nodes[n.id].choices![i].next = nx; }, n.speaker)} />
                    </div>
                    <details>
                      <summary>{(c.when?.length || c.actions?.length) ? `תנאים ופעולות (${(c.when?.length ?? 0) + (c.actions?.length ?? 0)})` : 'תנאים ופעולות'}</summary>
                      <div className="clause if"><span className="kw">רק אם</span>
                        <ConditionList conds={c.when ?? []} keyBase={`ch:${n.id}:${i}`} emptyText="תמיד אפשר לבחור"
                          edit={(fn, key) => editN((nn) => { const cc = nn.choices![i]; cc.when = cc.when ?? []; fn(cc.when); if (!cc.when.length) cc.when = undefined; }, key)} />
                      </div>
                      <div className="clause then"><span className="kw">אז</span>
                        <ActionList acts={c.actions ?? []} keyBase={`cha:${n.id}:${i}`}
                          edit={(fn, key) => editN((nn) => { const cc = nn.choices![i]; cc.actions = cc.actions ?? []; fn(cc.actions); if (!cc.actions.length) cc.actions = undefined; }, key)} />
                      </div>
                    </details>
                  </div>
                ))}
                <button type="button" className="add small" disabled={n.choices!.length >= 4} onClick={() => editN((nn) => { nn.choices!.push({ text: '' }); })}>+ עוד בחירה</button>
              </div>
            )}
            <details>
              <summary>{n.actions?.length ? `מה קורה אחרי הבועה (${n.actions.length})` : 'מה קורה אחרי הבועה'}</summary>
              <ActionList acts={n.actions ?? []} keyBase={`na:${n.id}`}
                edit={(fn, key) => editN((nn) => { nn.actions = nn.actions ?? []; fn(nn.actions); if (!nn.actions.length) nn.actions = undefined; }, key)} />
            </details>
          </div>
        );
      })}
      <button type="button" className="add" onClick={() => edit((dd) => { const id = newId('n'); dd.nodes[id] = { id, speaker: 'narrator', text: '' }; })}>+ בועה חדשה</button>
    </div>
  );
}

function DialoguesTab() {
  const p = useProject();
  const nav = useNav();
  const list = Object.values(p.dialogues);
  const cur = (nav.dialogueId && p.dialogues[nav.dialogueId]) || list[0];
  const used = (id: string) => JSON.stringify(p.rules).includes(`"${id}"`);
  const remove = async (id: string) => {
    if (!(await askConfirm(`למחוק את השיחה "${p.dialogues[id].name}"?`))) return;
    update((d) => { delete d.dialogues[id]; });
    setNav({ dialogueId: undefined });
  };
  return (
    <div className="dlg-layout">
      <nav className="dlg-list" aria-label="שיחות">
        {list.map((d) => (
          <button type="button" key={d.id} className={d.id === cur?.id ? 'on' : ''} onClick={() => setNav({ dialogueId: d.id })} data-dialogue={d.id}>
            {d.name}{!used(d.id) && <span className="warn" title="אף חוק לא מתחיל את השיחה הזאת"> · לא בשימוש</span>}
          </button>
        ))}
        <button type="button" className="add" onClick={() => setNav({ dialogueId: createDialogue('שיחה חדשה') })}>+ שיחה חדשה</button>
      </nav>
      <div className="dlg-main">
        {!cur && <Hint>עוד אין שיחות. לחצו "+ שיחה חדשה", או בחרו דמות בבונה העולם ולחצו "להתחיל שיחה".</Hint>}
        {cur && !used(cur.id) && <Hint>השיחה הזאת עוד לא מתחילה אף פעם. בבונה העולם, בחרו דמות ולחצו "להתחיל שיחה", או הוסיפו את הפעולה בחוק.</Hint>}
        {cur && <DialogueEditor key={cur.id} d={cur} />}
        {cur && <button type="button" className="danger" onClick={() => void remove(cur.id)}>למחוק את השיחה</button>}
      </div>
    </div>
  );
}

export default function StoryLab() {
  const nav = useNav();
  const tab = (nav.storyTab as Tab) ?? 'story';
  return (
    <div className="studio">
      <Tabs<Tab> value={tab} onChange={(t) => setNav({ storyTab: t })}
        tabs={[{ id: 'story', label: 'הסיפור' }, { id: 'characters', label: 'דמויות' }, { id: 'dialogues', label: 'שיחות' }]} />
      {tab === 'story' && <StoryTab />}
      {tab === 'characters' && <CharactersTab />}
      {tab === 'dialogues' && <DialoguesTab />}
    </div>
  );
}
