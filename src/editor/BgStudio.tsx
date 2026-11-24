// סטודיו רקעים — build a scene background from a base and big stamps.
import { useEffect, useLayoutEffect, useMemo, useRef, useState, type PointerEvent as RPointerEvent } from 'react';
import type { BgItem, BgRecipe } from '../model/types';
import { BG_H, BG_W, BOTTOM_STYLES, itemBox, renderBg, STAMPS, stampById, stampThumb, TEMPLATES, TOP_STYLES } from '../model/bgArt';
import { getProject, newId, update, useProject } from './store';
import { askConfirm, Hint, Picker, SpriteImg } from './ui';
import { isBackground, sceneOptions } from './options';
import { go, setNav, useNav } from './nav';
import { PALETTES } from './pixel';

const SIZES = [{ v: 1, label: 'קטן' }, { v: 2, label: 'בינוני' }, { v: 3, label: 'גדול' }, { v: 4, label: 'ענק' }];
const QUICK = PALETTES[0].colors.concat(['#74c0fc', '#2f9e44', '#868e96', '#e64980', '#7048e8']);

// decoded base pictures, shared between renders
const imgs = new Map<string, HTMLImageElement>();
function useBaseImage(url?: string) {
  const [, tick] = useState(0);
  if (!url) return null;
  let im = imgs.get(url);
  if (!im) { im = new Image(); im.onload = () => tick((t) => t + 1); im.src = url; imgs.set(url, im); }
  return im;
}

const fresh = (rec: BgRecipe): BgRecipe => ({ ...rec, items: rec.items.map((i) => ({ ...i, id: newId('it') })) });

function save(id: string, rec: BgRecipe, key?: string) {
  const base = rec.baseImage ? imgs.get(rec.baseImage) : null;
  const url = renderBg(rec, base).toDataURL('image/png');
  update((d) => { const s = d.sprites[id]; s.bg = rec; s.dataUrl = url; delete s.layers; }, key);
}

function TemplatePicker({ onPick, onCancel }: { onPick: (id: string) => void; onCancel?: () => void }) {
  const thumbs = useMemo(() => TEMPLATES.map((t) => ({ ...t, url: renderBg(t.rec).toDataURL() })), []);
  const create = (t: (typeof TEMPLATES)[number]) => {
    const id = newId('bg');
    const rec = fresh(t.rec);
    update((d) => { d.sprites[id] = { id, name: t.id === 'empty' ? 'רקע חדש' : t.name, w: BG_W, h: BG_H, dataUrl: renderBg(rec).toDataURL('image/png'), bg: rec }; });
    onPick(id);
  };
  return (
    <div className="bg-new">
      <h2>רקע חדש</h2>
      <p className="muted">בחרו רקע להתחלה. אחר כך אפשר לשנות בו הכל.</p>
      <div className="bg-templates">
        {thumbs.map((t) => (
          <button type="button" key={t.id} onClick={() => create(t)} data-template={t.id}>
            <img src={t.url} alt="" />
            <span>{t.name}</span>
          </button>
        ))}
      </div>
      {onCancel && <button type="button" onClick={onCancel}>ביטול</button>}
    </div>
  );
}

export default function BgStudio() {
  const p = useProject();
  const nav = useNav();
  const bgs = Object.values(p.sprites).filter((s) => isBackground(s.w, s.h));
  const id = nav.bgId && p.sprites[nav.bgId] ? nav.bgId : undefined;
  const sprite = id ? p.sprites[id] : undefined;
  const [showNew, setShowNew] = useState(!id);
  const [selected, setSelected] = useState<string | null>(null);
  const [draft, setDraft] = useState<BgRecipe | null>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const stage = useRef<HTMLDivElement>(null);
  const rec = draft ?? sprite?.bg;
  const base = useBaseImage(rec?.baseImage);

  useEffect(() => { setSelected(null); setDraft(null); if (id) setShowNew(false); }, [id]);
  useLayoutEffect(() => { if (rec && canvas.current) renderBg(rec, base, canvas.current); });

  /** Every change goes through here. A background edited by hand in the Pixel Studio is first frozen into a picture. */
  const change = async (fn: (r: BgRecipe) => BgRecipe, key?: string) => {
    if (!id || !rec) return;
    let cur = rec;
    if (cur.handEdited) {
      const ok = await askConfirm('את הרקע הזה שיניתם בסטודיו הפיקסלים. כדי לשמור את מה שציירתם, הרקע יהפוך לתמונה אחת, ואפשר יהיה להוסיף מעליה דברים חדשים. מה שכבר בתמונה לא יזוז יותר. להמשיך?', 'כן, להמשיך');
      if (!ok) return;
      cur = { ...cur, baseImage: getProject().sprites[id].dataUrl, items: [], handEdited: false };
      setSelected(null);
    }
    save(id, fn(cur), key);
  };
  const setItem = (iid: string, fn: (i: BgItem) => BgItem, key?: string) => change((r) => ({ ...r, items: r.items.map((i) => (i.id === iid ? fn(i) : i)) }), key);
  const sel = rec?.items.find((i) => i.id === selected);

  const addStamp = (sid: string) => {
    const st = stampById(sid)!;
    const hz = rec?.horizon ?? 90;
    const y = st.place === 'sky' ? 30 : st.place === 'wall' ? Math.max(st.h + 4, hz - 8) : Math.min(BG_H - 4, hz + 22);
    const item: BgItem = { id: newId('it'), stamp: sid, x: 120 + Math.round((Math.random() - 0.5) * 60), y, size: 1, color: st.color };
    void change((r) => ({ ...r, items: [...r.items, item] }));
    setSelected(item.id);
  };

  // drag items
  const startDrag = (e: RPointerEvent, item: BgItem) => {
    e.stopPropagation(); e.preventDefault();
    if (!rec) return;
    setSelected(item.id);
    if (rec.handEdited) return; // the first change asks first; dragging waits for that
    const box = stage.current!.getBoundingClientRect();
    const k = box.width / BG_W;
    const sx = e.clientX, sy = e.clientY;
    let last = rec;
    const move = (ev: PointerEvent) => {
      const dx = Math.round((ev.clientX - sx) / k), dy = Math.round((ev.clientY - sy) / k);
      last = { ...rec, items: rec.items.map((i) => (i.id === item.id ? { ...i, x: Math.max(0, Math.min(BG_W, item.x + dx)), y: Math.max(4, Math.min(BG_H + 20, item.y + dy)) } : i)) };
      setDraft(last);
    };
    const up = () => {
      window.removeEventListener('pointermove', move); window.removeEventListener('pointerup', up);
      if (last !== rec && id) save(id, last);
      setDraft(null);
    };
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
  };

  // keyboard: delete and nudge the selected stamp
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement;
      if (!sel || t.closest('input, textarea, [contenteditable]')) return;
      if (e.key === 'Delete' || e.key === 'Backspace') { e.preventDefault(); void change((r) => ({ ...r, items: r.items.filter((i) => i.id !== sel.id) })); setSelected(null); }
      const d = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] }[e.key];
      if (d) { e.preventDefault(); void setItem(sel.id, (i) => ({ ...i, x: i.x + d[0], y: i.y + d[1] }), `nudge:${sel.id}`); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  const usedIn = (sid: string) => Object.values(p.scenes).filter((s) => s.background.spriteId === sid);
  const remove = async () => {
    if (!sprite) return;
    const used = usedIn(sprite.id);
    if (used.length) { await askConfirm(`אי אפשר למחוק: זה הרקע של ${used.map((s) => s.name).join(', ')}. קודם בחרו שם רקע אחר.`, 'הבנתי'); return; }
    if (!(await askConfirm(`למחוק את הרקע "${sprite.name}"?`))) return;
    update((d) => { delete d.sprites[sprite.id]; });
    setNav({ bgId: undefined }); setShowNew(true);
  };
  const [targetScene, setTargetScene] = useState<string | undefined>(nav.bgForScene);
  const useInScene = () => {
    if (!sprite || !targetScene) return;
    update((d) => { d.scenes[targetScene].background.spriteId = sprite.id; });
    go('world', { sceneId: targetScene, bgForScene: undefined });
  };

  const groups = ['בבית', 'בחוץ', 'בשמיים'] as const;
  const top = rec ? TOP_STYLES.find((s) => s.id === rec.top.style) : undefined;

  return (
    <div className="bgs">
      <nav className="px-list" aria-label="רקעים">
        <button type="button" className="primary wide" onClick={() => { setShowNew(true); setNav({ bgId: undefined }); }}>+ רקע חדש</button>
        <h4>הרקעים במשחק</h4>
        <div className="bg-list">
          {bgs.map((s) => (
            <button type="button" key={s.id} className={s.id === id && !showNew ? 'on' : ''} onClick={() => { setShowNew(false); setNav({ bgId: s.id }); }} data-bg={s.id}>
              <SpriteImg id={s.id} size={150} />
              <span>{s.name}{usedIn(s.id).length ? ' ★' : ''}</span>
            </button>
          ))}
        </div>
        <p className="muted small">★ = רקע של סצנה במשחק</p>
      </nav>

      {showNew || !sprite ? (
        <TemplatePicker onPick={(nid) => { setShowNew(false); setNav({ bgId: nid }); }} onCancel={id ? () => setShowNew(false) : undefined} />
      ) : !rec ? (
        <div className="bg-new">
          <h2>{sprite.name}</h2>
          <SpriteImg id={sprite.id} size={480} className="bg-big" />
          <p>את הרקע הזה ציירו פיקסל אחרי פיקסל. אפשר להוסיף מעליו חלונות, עצים, עננים וכל השאר, בלי לקלקל את מה שכבר יש.</p>
          <div className="row">
            <button type="button" className="primary" onClick={() => save(sprite.id, { top: { style: 'sky', color: '#74c0fc' }, bottom: { style: 'grass', color: '#69db7c' }, horizon: 90, baseImage: sprite.dataUrl, items: [] })}>
              להוסיף דברים מעל הרקע הזה
            </button>
            <button type="button" onClick={() => go('pixel', { spriteId: sprite.id })}>לצייר עליו בסטודיו הפיקסלים</button>
          </div>
        </div>
      ) : (
        <>
          <div className="bg-main">
            <div className="px-head">
              <input className="big-name" value={sprite.name} aria-label="שם הרקע" onChange={(e) => update((d) => { d.sprites[sprite.id].name = e.target.value; }, `bgname:${sprite.id}`)} />
              <span className="spacer" />
              <button type="button" className="small" onClick={() => go('pixel', { spriteId: sprite.id })}>לצייר פרטים קטנים בפיקסלים</button>
              <button type="button" className="small danger" onClick={() => void remove()}>למחוק</button>
            </div>
            {rec.handEdited && <Hint>הרקע הזה שונה ביד בסטודיו הפיקסלים. בשינוי הבא כאן, הציור יישמר כתמונה ואפשר יהיה להוסיף מעליו.</Hint>}
            <div className="bg-stage" ref={stage} onPointerDown={() => setSelected(null)} data-testid="bg-stage">
              <canvas ref={canvas} width={BG_W} height={BG_H} />
              {rec.items.map((i) => {
                const b = itemBox(i);
                return (
                  <div key={i.id} className={`bg-item ${i.id === selected ? 'sel' : ''}`} data-item={i.id} title={stampById(i.stamp)?.name}
                    style={{ left: `${(b.x / BG_W) * 100}%`, top: `${(b.y / BG_H) * 100}%`, width: `${(b.w / BG_W) * 100}%`, height: `${(b.h / BG_H) * 100}%` }}
                    onPointerDown={(e) => startDrag(e, i)} />
                );
              })}
            </div>
            <div className="bg-stamps">
              {groups.map((g) => (
                <div key={g} className="pal-group">
                  <h4>{g}</h4>
                  <div className="pal-row">
                    {STAMPS.filter((s) => s.group === g).map((s) => (
                      <button type="button" key={s.id} className="pal-chip" onClick={() => addStamp(s.id)} data-stamp={s.id} title={`להוסיף ${s.name}`}>
                        <img src={stampThumb(s.id)} alt="" style={{ height: 30, maxWidth: 46, objectFit: 'contain', imageRendering: 'pixelated' }} />
                        <span>{s.name}</span>
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <aside className="px-side">
            {sel ? (
              <section className="bg-insp">
                <h3>{stampById(sel.stamp)?.name}</h3>
                <p className="muted small">גוררים בתמונה כדי להזיז. החצים במקלדת מזיזים בפיקסל.</p>
                <span className="lbl">גודל</span>
                <div className="seg">
                  {SIZES.map((s) => <button type="button" key={s.v} className={sel.size === s.v ? 'on' : ''} onClick={() => void setItem(sel.id, (i) => ({ ...i, size: s.v }))}>{s.label}</button>)}
                </div>
                <span className="lbl">צבע</span>
                <div className="row">
                  <label className="px-current" style={{ background: sel.color, width: 44, height: 44 }}>
                    <input type="color" value={sel.color} aria-label="צבע" onChange={(e) => void setItem(sel.id, (i) => ({ ...i, color: e.target.value }), `color:${sel.id}`)} />
                  </label>
                  <button type="button" className="small" onClick={() => void setItem(sel.id, (i) => ({ ...i, color: stampById(i.stamp)!.color }))}>הצבע המקורי</button>
                </div>
                <div className="swatches">
                  {QUICK.map((c) => <button type="button" key={c} style={{ background: c }} aria-label={c} className={c === sel.color ? 'on' : ''} onClick={() => void setItem(sel.id, (i) => ({ ...i, color: c }))} />)}
                </div>
                <div className="row">
                  <button type="button" className="small" onClick={() => void setItem(sel.id, (i) => ({ ...i, flip: !i.flip }))}>להפוך ↔</button>
                  <button type="button" className="small" onClick={() => void change((r) => { const i = r.items.findIndex((x) => x.id === sel.id); const items = [...r.items]; const [x] = items.splice(i, 1); items.push(x); return { ...r, items }; })}>להביא קדימה</button>
                  <button type="button" className="small" onClick={() => void change((r) => { const i = r.items.findIndex((x) => x.id === sel.id); const items = [...r.items]; const [x] = items.splice(i, 1); items.unshift(x); return { ...r, items }; })}>לשלוח אחורה</button>
                </div>
                <div className="row">
                  <button type="button" className="small" onClick={() => { const copy = { ...sel, id: newId('it'), x: sel.x + 16 }; void change((r) => ({ ...r, items: [...r.items, copy] })); setSelected(copy.id); }}>לשכפל</button>
                  <button type="button" className="small danger" onClick={() => { void change((r) => ({ ...r, items: r.items.filter((i) => i.id !== sel.id) })); setSelected(null); }}>להוריד מהרקע</button>
                </div>
                <button type="button" className="link" onClick={() => setSelected(null)}>← חזרה להגדרות הרקע</button>
              </section>
            ) : (
              <section className="bg-insp">
                <h3>הבסיס</h3>
                {rec.baseImage ? (
                  <>
                    <p className="muted small">הבסיס הוא תמונה מוכנה. אפשר להוסיף מעליה דברים מהרשימה למטה.</p>
                    <button type="button" className="small" onClick={async () => { if (await askConfirm('להחליף את התמונה בשמיים ואדמה? מה שמצויר בתמונה יימחק (החפצים שהוספתם יישארו).', 'כן, להחליף')) void change((r) => ({ ...r, baseImage: undefined })); }}>להחליף בשמיים ואדמה</button>
                  </>
                ) : (
                  <>
                    <span className="lbl">למעלה: {top?.id === 'sky' || top?.id === 'sunset' || top?.id === 'night' ? 'שמיים' : 'קיר'}</span>
                    <div className="chips">
                      {TOP_STYLES.map((s) => <button type="button" key={s.id} className={rec.top.style === s.id ? 'on' : ''} data-top={s.id}
                        onClick={() => void change((r) => ({ ...r, top: { style: s.id, color: s.color } }))}>{s.label}</button>)}
                    </div>
                    <label className="row">צבע <input type="color" value={rec.top.color} onChange={(e) => void change((r) => ({ ...r, top: { ...r.top, color: e.target.value } }), 'topcolor')} /></label>
                    <span className="lbl">למטה: אדמה או רצפה</span>
                    <div className="chips">
                      {BOTTOM_STYLES.map((s) => <button type="button" key={s.id} className={rec.bottom.style === s.id ? 'on' : ''} data-bottom={s.id}
                        onClick={() => void change((r) => ({ ...r, bottom: { style: s.id, color: s.color } }))}>{s.label}</button>)}
                    </div>
                    <label className="row">צבע <input type="color" value={rec.bottom.color} onChange={(e) => void change((r) => ({ ...r, bottom: { ...r.bottom, color: e.target.value } }), 'botcolor')} /></label>
                    <label className="lbl">איפה נגמר הקיר או השמיים
                      <input type="range" min={30} max={125} value={rec.horizon} onChange={(e) => void change((r) => ({ ...r, horizon: Number(e.target.value) }), 'horizon')} />
                    </label>
                  </>
                )}
                <Hint>לחצו על משהו מהרשימה למטה כדי להוסיף אותו, ואז גררו אותו למקום. לחיצה על משהו ברקע בוחרת אותו.</Hint>
              </section>
            )}
            <section className="bg-insp">
              <h3>להשתמש ברקע</h3>
              {usedIn(sprite.id).length > 0 && <p className="ok small">★ הרקע של: {usedIn(sprite.id).map((s) => s.name).join(', ')}</p>}
              <label className="lbl">לשים ברקע של הסצנה
                <Picker value={targetScene} placeholder="לבחור סצנה…" options={sceneOptions(p)} onChange={setTargetScene} />
              </label>
              <button type="button" className="primary" disabled={!targetScene} onClick={useInScene}>לשים ולעבור לבונה העולם</button>
            </section>
          </aside>
        </>
      )}
    </div>
  );
}
