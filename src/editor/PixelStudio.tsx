// סטודיו פיקסלים — draw and edit every picture in the game.
// Each finished stroke is written into the project, so undo/redo and autosave just work,
// and the game picks up the new drawing immediately.
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState, type PointerEvent as RPointerEvent } from 'react';
import type { Project } from '../model/types';
import { getProject, newId, update, useProject } from './store';
import { askConfirm, Hint, SpriteImg } from './ui';
import { isBackground } from './options';
import { go, setNav, useNav } from './nav';
import { composite, decodeSprite, flatten, floodFill, linePoints, PALETTES, rectPoints, toImageData, type Layer, type Px } from './pixel';

type Tool = 'pencil' | 'eraser' | 'fill' | 'picker' | 'line' | 'rect' | 'select' | 'hand';
const TOOLS: { id: Tool; label: string; ico: string; key: string }[] = [
  { id: 'pencil', label: 'עיפרון', ico: '✏️', key: 'KeyB' },
  { id: 'eraser', label: 'מחק', ico: '🧽', key: 'KeyE' },
  { id: 'fill', label: 'דלי צבע', ico: '🪣', key: 'KeyG' },
  { id: 'picker', label: 'טפטפת', ico: '💧', key: 'KeyI' },
  { id: 'line', label: 'קו', ico: '📏', key: 'KeyL' },
  { id: 'rect', label: 'מלבן', ico: '⬜', key: 'KeyR' },
  { id: 'select', label: 'בחירה', ico: '⬚', key: 'KeyM' },
  { id: 'hand', label: 'להזיז', ico: '🖐', key: 'KeyH' },
];
const SIZES = [
  { id: '16', w: 16, h: 16, label: 'קטן', sub: '16×16' },
  { id: '32', w: 32, h: 32, label: 'בינוני', sub: '32×32' },
  { id: '64', w: 64, h: 64, label: 'גדול', sub: '64×64' },
  { id: '128', w: 128, h: 128, label: 'ענק', sub: '128×128' },
  { id: 'char', w: 16, h: 24, label: 'דמות', sub: '16×24' },
  { id: 'bg', w: 240, h: 135, label: 'רקע לסצנה', sub: '240×135' },
];

interface Rect { x: number; y: number; w: number; h: number }
interface Float { px: Px[]; w: number; h: number; x: number; y: number }
let clipboard: { px: Px[]; w: number; h: number } | null = null;

function usage(p: Project, id: string): string[] {
  const out: string[] = [];
  for (const c of Object.values(p.characters)) if (c.spriteId === id) out.push(`הדמות ${c.name}`);
  for (const i of Object.values(p.items)) if (i.spriteId === id) out.push(`החפץ ${i.name}`);
  for (const s of Object.values(p.scenes)) {
    if (s.background.spriteId === id) out.push(`הרקע של ${s.name}`);
    for (const o of s.objects) if (o.spriteId === id) out.push(`${o.name} ב${s.name}`);
  }
  for (const a of Object.values(p.animations)) if (a.frames.some((f) => f.spriteId === id)) out.push(`האנימציה ${a.name}`);
  return out;
}

function groupOf(p: Project, id: string): string {
  const s = p.sprites[id];
  if (isBackground(s.w, s.h)) return 'רקעים';
  if (Object.values(p.characters).some((c) => c.spriteId === id) || Object.values(p.animations).some((a) => a.frames.some((f) => f.spriteId === id) && Object.values(p.characters).some((c) => Object.values(c.anims).includes(a.id)))) return 'דמויות';
  if (Object.values(p.items).some((i) => i.spriteId === id)) return 'חפצים';
  return 'אחר';
}

// ── Sprite list ───────────────────────────────────────────────────
function SpriteList({ current, onPick, onNew }: { current?: string; onPick: (id: string) => void; onNew: () => void }) {
  const p = useProject();
  const groups = ['דמויות', 'חפצים', 'אחר', 'רקעים'];
  const byGroup = useMemo(() => {
    const m: Record<string, string[]> = {};
    for (const id of Object.keys(p.sprites)) (m[groupOf(p, id)] ??= []).push(id);
    return m;
  }, [p]);
  return (
    <nav className="px-list" aria-label="ציורים">
      <button type="button" className="primary wide" onClick={onNew}>+ ציור חדש</button>
      {groups.filter((g) => byGroup[g]?.length).map((g) => (
        <div key={g}>
          <h4>{g}</h4>
          <div className="px-thumbs">
            {byGroup[g].map((id) => (
              <button type="button" key={id} className={id === current ? 'on' : ''} onClick={() => onPick(id)} title={p.sprites[id].name} data-sprite={id}>
                <SpriteImg id={id} size={g === 'רקעים' ? 72 : 36} />
                <span>{p.sprites[id].name}</span>
              </button>
            ))}
          </div>
        </div>
      ))}
    </nav>
  );
}

function NewDrawing({ onCreate, onCancel }: { onCreate: (id: string) => void; onCancel: () => void }) {
  const [name, setName] = useState('ציור חדש');
  const create = (w: number, h: number) => {
    const id = newId('spr');
    const layers: Layer[] = [{ name: 'שכבה 1', visible: true, pixels: new Array(w * h).fill(null) }];
    update((d) => { d.sprites[id] = { id, name: name.trim() || 'ציור חדש', w, h, layers, dataUrl: flatten(layers, w, h) }; });
    onCreate(id);
  };
  return (
    <div className="px-new">
      <h2>ציור חדש</h2>
      <label>איך קוראים לו?<input value={name} onChange={(e) => setName(e.target.value)} autoFocus /></label>
      <p className="muted small">באיזה גודל? (מספר הפיקסלים לרוחב × לגובה)</p>
      <div className="px-sizes">
        {SIZES.map((s) => (
          <button type="button" key={s.id} onClick={() => create(s.w, s.h)} data-size={s.id}>
            <span className="px-size-box" style={{ width: Math.min(84, 20 + s.w / 2), height: Math.min(56, (20 + s.w / 2) * (s.h / s.w)) }} />
            <strong>{s.label}</strong><span className="muted small">{s.sub}</span>
          </button>
        ))}
      </div>
      <button type="button" onClick={onCancel}>ביטול</button>
    </div>
  );
}

// ── Editor ────────────────────────────────────────────────────────
export default function PixelStudio() {
  const p = useProject();
  const nav = useNav();
  const fallback = p.characters[p.playerId]?.spriteId ?? Object.keys(p.sprites)[0];
  const id = nav.spriteId && p.sprites[nav.spriteId] ? nav.spriteId : fallback;
  const sprite = id ? p.sprites[id] : undefined;
  const [showNew, setShowNew] = useState(false);

  const [layers, setLayers] = useState<Layer[] | null>(null);
  const [active, setActive] = useState(0);
  const [tool, setTool] = useState<Tool>('pencil');
  const [color, setColor] = useState('#c97b2c');
  const [recent, setRecent] = useState<string[]>([]);
  const [palette, setPalette] = useState('bakery');
  const [zoom, setZoom] = useState(16);
  const [brush, setBrush] = useState(1);
  const scroller = useRef<HTMLDivElement>(null);
  const centerNext = useRef(false);
  const anchor = useRef<{ px: number; py: number; cx: number; cy: number } | null>(null);
  const pan = useRef<{ sx: number; sy: number; sl: number; st: number } | null>(null);
  const [grid, setGrid] = useState(true);
  const [mirror, setMirror] = useState(false);
  const [filled, setFilled] = useState(false);
  const [sel, setSel] = useState<Rect | null>(null);
  const [float, setFloat] = useState<Float | null>(null);
  const [hover, setHover] = useState<[number, number] | null>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const preview = useRef<Px[] | null>(null);
  const stroke = useRef<{ base: Px[]; x0: number; y0: number; last: [number, number]; erase: boolean; mode: Tool; fdx?: number; fdy?: number } | null>(null);
  const w = sprite?.w ?? 16, h = sprite?.h ?? 16;

  // load the drawing (decode older pictures into one layer)
  useEffect(() => {
    if (!sprite || stroke.current) return;
    let alive = true;
    void decodeSprite(sprite).then((l) => { if (alive) setLayers(l); });
    return () => { alive = false; };
  }, [sprite]);
  // a new picture: fit zoom, reset selection
  useEffect(() => {
    setSel(null); setFloat(null); setActive(0);
    // big pixels: at least 8 screen points each; large pictures scroll
    if (sprite) { setZoom(Math.max(8, Math.min(32, Math.floor(560 / Math.max(sprite.w, sprite.h))))); centerNext.current = true; }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);
  const act = layers ? Math.min(active, layers.length - 1) : 0;

  const commit = useCallback((next: Layer[]) => {
    if (!id) return;
    setLayers(next);
    const url = flatten(next, w, h);
    update((d) => { const s = d.sprites[id]; s.layers = next.map((l) => ({ ...l, pixels: l.pixels.slice() })); s.dataUrl = url; if (s.bg) s.bg.handEdited = true; });
  }, [id, w, h]);

  const withActive = (px: Px[]) => layers!.map((l, i) => (i === act ? { ...l, pixels: px } : l));

  // ── drawing to the screen ──
  useLayoutEffect(() => {
    const c = canvas.current;
    if (!c || !layers) return;
    const z = zoom;
    c.width = w * z; c.height = h * z;
    const ctx = c.getContext('2d')!;
    ctx.imageSmoothingEnabled = false;
    // transparent checkerboard
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      ctx.fillStyle = (x + y) % 2 ? '#d9dde6' : '#f4f6fa';
      ctx.fillRect(x * z, y * z, z, z);
    }
    const shown = layers.map((l, i) => (i === act && preview.current ? { ...l, pixels: preview.current } : l));
    let px = composite(shown, w, h);
    if (float) {
      px = px.slice();
      for (let y = 0; y < float.h; y++) for (let x = 0; x < float.w; x++) {
        const v = float.px[y * float.w + x], tx = float.x + x, ty = float.y + y;
        if (v && tx >= 0 && ty >= 0 && tx < w && ty < h) px[ty * w + tx] = v;
      }
    }
    const off = document.createElement('canvas');
    off.width = w; off.height = h;
    off.getContext('2d')!.putImageData(toImageData(px, w, h), 0, 0);
    ctx.drawImage(off, 0, 0, w * z, h * z);
    if (grid && z >= 6) {
      ctx.lineWidth = 1;
      for (let x = 0; x <= w; x++) { ctx.strokeStyle = x % 8 ? 'rgba(27,20,40,.10)' : 'rgba(27,20,40,.28)'; ctx.beginPath(); ctx.moveTo(x * z + 0.5, 0); ctx.lineTo(x * z + 0.5, h * z); ctx.stroke(); }
      for (let y = 0; y <= h; y++) { ctx.strokeStyle = y % 8 ? 'rgba(27,20,40,.10)' : 'rgba(27,20,40,.28)'; ctx.beginPath(); ctx.moveTo(0, y * z + 0.5); ctx.lineTo(w * z, y * z + 0.5); ctx.stroke(); }
    }
    if (mirror) { ctx.strokeStyle = '#e64980'; ctx.lineWidth = 2; ctx.setLineDash([6, 4]); ctx.beginPath(); ctx.moveTo((w * z) / 2, 0); ctx.lineTo((w * z) / 2, h * z); ctx.stroke(); ctx.setLineDash([]); }
    const box = float ? { x: float.x, y: float.y, w: float.w, h: float.h } : sel;
    if (box) {
      ctx.lineWidth = 2; ctx.strokeStyle = '#1b1428'; ctx.setLineDash([5, 4]);
      ctx.strokeRect(box.x * z + 1, box.y * z + 1, box.w * z - 2, box.h * z - 2);
      ctx.strokeStyle = '#ffd43b'; ctx.lineDashOffset = 5; ctx.strokeRect(box.x * z + 1, box.y * z + 1, box.w * z - 2, box.h * z - 2);
      ctx.setLineDash([]); ctx.lineDashOffset = 0;
    }
    if (hover && tool !== 'hand' && tool !== 'select') {
      const b = tool === 'fill' || tool === 'picker' ? 1 : brush, o = Math.floor((b - 1) / 2);
      ctx.lineWidth = 2; ctx.strokeStyle = tool === 'eraser' ? '#e64980' : '#1b1428';
      ctx.strokeRect((hover[0] - o) * z + 1, (hover[1] - o) * z + 1, b * z - 2, b * z - 2);
      ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 1;
      ctx.strokeRect((hover[0] - o) * z + 3, (hover[1] - o) * z + 3, b * z - 6, b * z - 6);
    }
    // keep the view steady after zooming, and start big pictures in the middle
    const sc = scroller.current;
    if (sc && anchor.current) {
      const a = anchor.current, nr = c.getBoundingClientRect();
      sc.scrollLeft += nr.left - (a.cx - a.px * z);
      sc.scrollTop += nr.top - (a.cy - a.py * z);
      anchor.current = null;
    } else if (sc && centerNext.current) {
      sc.scrollLeft = (sc.scrollWidth - sc.clientWidth) / 2;
      sc.scrollTop = (sc.scrollHeight - sc.clientHeight) / 2;
      centerNext.current = false;
    }
  });

  /** zoom so the pixel under (cx, cy) stays under the mouse */
  const zoomTo = (nz: number, cx?: number, cy?: number) => {
    const c = canvas.current, sc = scroller.current;
    nz = Math.max(1, Math.min(40, Math.round(nz)));
    if (c && sc && nz !== zoom) {
      const r = c.getBoundingClientRect(), sr = sc.getBoundingClientRect();
      const x = cx ?? sr.left + sr.width / 2, y = cy ?? sr.top + sr.height / 2;
      anchor.current = { px: (x - r.left) / zoom, py: (y - r.top) / zoom, cx: x, cy: y };
    }
    setZoom(nz);
  };
  const fitZoom = () => {
    const sc = scroller.current;
    if (!sc) return;
    centerNext.current = true;
    setZoom(Math.max(1, Math.min(40, Math.floor(Math.min((sc.clientWidth - 30) / w, (sc.clientHeight - 30) / h)))));
  };
  // Ctrl + mouse wheel zooms (needs a non-passive listener so the page itself doesn't zoom)
  useEffect(() => {
    const sc = scroller.current;
    if (!sc) return;
    const onWheel = (e: WheelEvent) => {
      if (!e.ctrlKey && !e.metaKey) return;
      e.preventDefault();
      zoomTo(zoom * (e.deltaY < 0 ? 1.25 : 0.8) + (e.deltaY < 0 ? 1 : -1), e.clientX, e.clientY);
    };
    sc.addEventListener('wheel', onWheel, { passive: false });
    return () => sc.removeEventListener('wheel', onWheel);
  });

  // ── pointer ──
  const cell = (e: { clientX: number; clientY: number }): [number, number] => {
    const r = canvas.current!.getBoundingClientRect();
    return [Math.floor(((e.clientX - r.left) / r.width) * w), Math.floor(((e.clientY - r.top) / r.height) * h)];
  };
  const inside = (x: number, y: number) => x >= 0 && y >= 0 && x < w && y < h;
  const paint = (px: Px[], x: number, y: number, v: Px) => {
    const o = Math.floor((brush - 1) / 2);
    for (let dy = 0; dy < brush; dy++) for (let dx = 0; dx < brush; dx++) {
      const X = x - o + dx, Y = y - o + dy;
      if (inside(X, Y)) px[Y * w + X] = v;
      if (mirror && inside(w - 1 - X, Y)) px[Y * w + (w - 1 - X)] = v;
    }
  };
  const useColor = (c: string) => { setColor(c); setRecent((r) => [c, ...r.filter((x) => x !== c)].slice(0, 10)); };

  const commitFloat = (f = float) => {
    if (!f || !layers) return;
    const px = layers[act].pixels.slice();
    for (let y = 0; y < f.h; y++) for (let x = 0; x < f.w; x++) {
      const v = f.px[y * f.w + x], tx = f.x + x, ty = f.y + y;
      if (v && inside(tx, ty)) px[ty * w + tx] = v;
    }
    setFloat(null);
    setSel({ x: f.x, y: f.y, w: f.w, h: f.h });
    commit(withActive(px));
  };

  const onDown = (e: RPointerEvent<HTMLCanvasElement>) => {
    if (!layers) return;
    e.preventDefault();
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    if (tool === 'hand' || e.button === 1) {
      const sc = scroller.current!;
      pan.current = { sx: e.clientX, sy: e.clientY, sl: sc.scrollLeft, st: sc.scrollTop };
      return;
    }
    const [x, y] = cell(e);
    const erase = e.button === 2;
    const mode: Tool = erase && (tool === 'pencil' || tool === 'line' || tool === 'rect') ? 'eraser' : tool;
    const base = layers[act].pixels.slice();
    if (mode === 'picker') {
      const c = composite(layers, w, h)[y * w + x];
      if (c) { useColor(c); setTool('pencil'); }
      return;
    }
    if (mode === 'fill') {
      if (inside(x, y) && floodFill(base, w, h, x, y, erase ? null : color)) { commit(withActive(base)); if (!erase) useColor(color); }
      return;
    }
    if (mode === 'select') {
      if (float && x >= float.x && y >= float.y && x < float.x + float.w && y < float.y + float.h) {
        stroke.current = { base, x0: x, y0: y, last: [x, y], erase: false, mode, fdx: float.x, fdy: float.y };
        return;
      }
      if (float) commitFloat();
      setSel({ x, y, w: 1, h: 1 });
      stroke.current = { base, x0: x, y0: y, last: [x, y], erase: false, mode };
      return;
    }
    if (float) commitFloat();
    stroke.current = { base, x0: x, y0: y, last: [x, y], erase: mode === 'eraser', mode };
    const px = base.slice();
    if (mode === 'pencil' || mode === 'eraser') paint(px, x, y, mode === 'eraser' ? null : color);
    if (mode === 'line' || mode === 'rect') paint(px, x, y, color);
    preview.current = px;
    setHover([x, y]);
  };

  const onMove = (e: RPointerEvent<HTMLCanvasElement>) => {
    if (pan.current) {
      const sc = scroller.current!, pn = pan.current;
      sc.scrollLeft = pn.sl - (e.clientX - pn.sx); sc.scrollTop = pn.st - (e.clientY - pn.sy);
      return;
    }
    const [x, y] = cell(e);
    setHover(inside(x, y) ? [x, y] : null);
    const s = stroke.current;
    if (!s) return;
    if (s.mode === 'select') {
      if (float && s.fdx !== undefined) setFloat({ ...float, x: s.fdx + x - s.x0, y: s.fdy! + y - s.y0 });
      else {
        const cx = Math.max(0, Math.min(w - 1, x)), cy = Math.max(0, Math.min(h - 1, y));
        setSel({ x: Math.min(s.x0, cx), y: Math.min(s.y0, cy), w: Math.abs(cx - s.x0) + 1, h: Math.abs(cy - s.y0) + 1 });
      }
      return;
    }
    if (s.mode === 'pencil' || s.mode === 'eraser') {
      const px = preview.current!;
      for (const [a, b] of linePoints(s.last[0], s.last[1], x, y)) paint(px, a, b, s.mode === 'eraser' ? null : color);
      s.last = [x, y];
    } else if (s.mode === 'line' || s.mode === 'rect') {
      const px = s.base.slice();
      const pts = s.mode === 'line' ? linePoints(s.x0, s.y0, x, y) : rectPoints(s.x0, s.y0, x, y, filled);
      for (const [a, b] of pts) paint(px, a, b, s.erase ? null : color);
      preview.current = px;
    }
  };

  const onUp = () => {
    pan.current = null;
    const s = stroke.current;
    stroke.current = null;
    if (!s || s.mode === 'select') return;
    const px = preview.current;
    preview.current = null;
    if (px) { commit(withActive(px)); if (s.mode !== 'eraser') useColor(color); }
  };

  // ── selection actions ──
  const region = (): Rect => sel ?? { x: 0, y: 0, w, h };
  const copy = () => {
    if (!layers) return;
    if (float) { clipboard = { px: float.px.slice(), w: float.w, h: float.h }; return; }
    const r = region(), src = layers[act].pixels, px: Px[] = [];
    for (let y = 0; y < r.h; y++) for (let x = 0; x < r.w; x++) px.push(src[(r.y + y) * w + r.x + x]);
    clipboard = { px, w: r.w, h: r.h };
  };
  const clearRegion = () => {
    if (!layers || !sel) return;
    const px = layers[act].pixels.slice();
    for (let y = 0; y < sel.h; y++) for (let x = 0; x < sel.w; x++) px[(sel.y + y) * w + sel.x + x] = null;
    commit(withActive(px));
  };
  const cut = () => { copy(); if (float) setFloat(null); else clearRegion(); };
  const paste = () => {
    if (!clipboard) return;
    if (float) commitFloat();
    const at = sel ?? { x: 0, y: 0 };
    setTool('select');
    setFloat({ px: clipboard.px.slice(), w: clipboard.w, h: clipboard.h, x: at.x, y: at.y });
  };
  const flip = (dir: 'h' | 'v') => {
    if (!layers) return;
    if (float) {
      const px: Px[] = new Array(float.px.length);
      for (let y = 0; y < float.h; y++) for (let x = 0; x < float.w; x++)
        px[y * float.w + x] = dir === 'h' ? float.px[y * float.w + (float.w - 1 - x)] : float.px[(float.h - 1 - y) * float.w + x];
      setFloat({ ...float, px });
      return;
    }
    const r = region(), src = layers[act].pixels, px = src.slice();
    for (let y = 0; y < r.h; y++) for (let x = 0; x < r.w; x++) {
      const sx = dir === 'h' ? r.x + r.w - 1 - x : r.x + x, sy = dir === 'v' ? r.y + r.h - 1 - y : r.y + y;
      px[(r.y + y) * w + r.x + x] = src[sy * w + sx];
    }
    commit(withActive(px));
  };

  // ── keyboard ──
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement;
      if (t.closest('input, textarea, [contenteditable]')) return;
      const mod = e.ctrlKey || e.metaKey;
      if (mod && e.code === 'KeyC') { e.preventDefault(); copy(); return; }
      if (mod && e.code === 'KeyX') { e.preventDefault(); cut(); return; }
      if (mod && e.code === 'KeyV') { e.preventDefault(); paste(); return; }
      if (mod) return;
      if (e.key === 'Enter' && float) { commitFloat(); return; }
      if (e.key === 'Escape') { if (float) setFloat(null); setSel(null); return; }
      if ((e.key === 'Delete' || e.key === 'Backspace') && (sel || float)) { e.preventDefault(); if (float) setFloat(null); else clearRegion(); return; }
      const tl = TOOLS.find((x) => x.key === e.code);
      if (tl) { if (float && tl.id !== 'select') commitFloat(); setTool(tl.id); }
      if (e.key === '+' || e.key === '=') zoomTo(zoom + 2);
      if (e.key === '-') zoomTo(zoom - 2);
      if (e.key === ']') setBrush((b) => Math.min(8, b * 2));
      if (e.key === '[') setBrush((b) => Math.max(1, b / 2));
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  // ── layers ──
  const setLayer = (i: number, fn: (l: Layer) => Layer) => commit(layers!.map((l, j) => (j === i ? fn(l) : l)));
  const addLayer = () => { const next = [...layers!, { name: `שכבה ${layers!.length + 1}`, visible: true, pixels: new Array(w * h).fill(null) }]; commit(next); setActive(next.length - 1); };
  const dupLayer = () => { const l = layers![act]; const next = [...layers!]; next.splice(act + 1, 0, { ...l, name: `${l.name} (עותק)`, pixels: l.pixels.slice() }); commit(next); setActive(act + 1); };
  const delLayer = async () => {
    if (layers!.length < 2) return;
    const l = layers![act];
    if (l.pixels.some(Boolean) && !(await askConfirm(`למחוק את "${l.name}" עם כל מה שצויר בה?`))) return;
    commit(layers!.filter((_, i) => i !== act)); setActive(Math.max(0, act - 1));
  };
  const moveLayer = (dir: 1 | -1) => {
    const j = act + dir; if (j < 0 || j >= layers!.length) return;
    const next = [...layers!]; [next[act], next[j]] = [next[j], next[act]]; commit(next); setActive(j);
  };

  // ── picture actions ──
  const pick = (sid: string) => { if (float) commitFloat(); setShowNew(false); setNav({ spriteId: sid }); };
  const duplicate = () => {
    if (!sprite || !layers) return;
    const nid = newId('spr');
    update((d) => { d.sprites[nid] = { id: nid, name: `${sprite.name} (עותק)`, w, h, dataUrl: sprite.dataUrl, layers: layers.map((l) => ({ ...l, pixels: l.pixels.slice() })) }; });
    setNav({ spriteId: nid });
  };
  const remove = async () => {
    if (!sprite) return;
    const used = usage(getProject(), sprite.id);
    if (used.length) { await askConfirm(`אי אפשר למחוק: הציור מופיע במשחק (${used.slice(0, 3).join(', ')}${used.length > 3 ? '…' : ''}). קודם בחרו שם ציור אחר.`, 'הבנתי'); return; }
    if (!(await askConfirm(`למחוק את הציור "${sprite.name}"?`))) return;
    const next = Object.keys(p.sprites).find((s) => s !== sprite.id);
    update((d) => { delete d.sprites[sprite.id]; });
    setNav({ spriteId: next });
  };

  const used = sprite ? usage(p, sprite.id) : [];
  const pal = PALETTES.find((x) => x.id === palette)!;

  return (
    <div className="px">
      <SpriteList current={id} onPick={pick} onNew={() => setShowNew(true)} />
      {showNew || !sprite ? (
        <NewDrawing onCreate={(nid) => { setShowNew(false); setNav({ spriteId: nid }); }} onCancel={() => setShowNew(false)} />
      ) : (
        <>
          <div className="px-main">
            <div className="px-head">
              <input className="big-name" value={sprite.name} aria-label="שם הציור" onChange={(e) => update((d) => { d.sprites[sprite.id].name = e.target.value; }, `sprname:${sprite.id}`)} />
              <span className="muted small">{w}×{h} פיקסלים</span>
              <span className="spacer" />
              {w >= 200 && <button type="button" className="small" onClick={() => go('bg', { bgId: sprite.id })}>🎨 לפתוח בסטודיו הרקעים</button>}
              <button type="button" className="small" onClick={duplicate}>לשכפל</button>
              <button type="button" className="small danger" onClick={() => void remove()}>למחוק</button>
            </div>
            <div className="px-work">
              <div className="px-tools" role="toolbar" aria-label="כלים">
                {TOOLS.map((t) => (
                  <button type="button" key={t.id} className={tool === t.id ? 'on' : ''} aria-pressed={tool === t.id} title={`${t.label}`} data-tool={t.id}
                    onClick={() => { if (float && t.id !== 'select') commitFloat(); setTool(t.id); }}>
                    <span aria-hidden="true">{t.ico}</span><small>{t.label}</small>
                  </button>
                ))}
              </div>
              <div className="px-canvas-wrap">
                <div className="px-canvas-scroll" ref={scroller}>
                  {layers ? (
                    <canvas ref={canvas} className={`px-canvas t-${tool}`} data-testid="px-canvas" style={{ width: w * zoom, height: h * zoom }}
                      onPointerDown={onDown} onPointerMove={onMove} onPointerUp={onUp} onPointerCancel={onUp} onPointerLeave={() => setHover(null)}
                      onContextMenu={(e) => e.preventDefault()} onAuxClick={(e) => e.preventDefault()} />
                  ) : <p className="muted">טוען את הציור…</p>}
                </div>
                <div className="px-under">
                  {(tool === 'pencil' || tool === 'eraser' || tool === 'line' || tool === 'rect') && (
                    <span className="brushes" role="group" aria-label="עובי המכחול">
                      <span className="lbl-inline">עובי:</span>
                      {[1, 2, 4, 8].map((b) => (
                        <button type="button" key={b} className={brush === b ? 'on' : ''} aria-pressed={brush === b} title={`${b} פיקסלים`} data-brush={b} onClick={() => setBrush(b)}>
                          <span style={{ width: 3 + b * 2.5, height: 3 + b * 2.5 }} />
                        </button>
                      ))}
                    </span>
                  )}
                  <span className="zoombar">
                    <button type="button" aria-label="להקטין" onClick={() => zoomTo(zoom - 2)}>−</button>
                    <input type="range" min={1} max={40} value={zoom} aria-label="זום" onChange={(e) => zoomTo(Number(e.target.value))} />
                    <button type="button" aria-label="להגדיל" onClick={() => zoomTo(zoom + 2)}>+</button>
                    <button type="button" className="small" onClick={fitZoom}>כל הציור</button>
                  </span>
                  <label className="check"><input type="checkbox" checked={grid} onChange={(e) => setGrid(e.target.checked)} /> רשת</label>
                  <label className="check" title="מה שמציירים בצד אחד מופיע גם בצד השני"><input type="checkbox" checked={mirror} onChange={(e) => setMirror(e.target.checked)} /> ציור במראה</label>
                  {tool === 'rect' && <label className="check"><input type="checkbox" checked={filled} onChange={(e) => setFilled(e.target.checked)} /> מלבן מלא</label>}
                  {hover && <span className="muted small coords">{hover[0] + 1}, {hover[1] + 1}</span>}
                </div>
                {(tool === 'select' || float || sel) && (
                  <div className="px-selbar">
                    <span className="muted small">{float ? 'גוררים את מה שהודבק, ולוחצים "להניח"' : sel ? 'בחרתם אזור:' : 'גוררים כדי לבחור אזור'}</span>
                    <button type="button" className="small" onClick={copy}>להעתיק</button>
                    <button type="button" className="small" onClick={cut}>לגזור</button>
                    <button type="button" className="small" onClick={paste} disabled={!clipboard}>להדביק</button>
                    <button type="button" className="small" onClick={() => flip('h')}>להפוך ↔</button>
                    <button type="button" className="small" onClick={() => flip('v')}>להפוך ↕</button>
                    {float && <button type="button" className="small primary" onClick={() => commitFloat()}>להניח</button>}
                    {(sel || float) && <button type="button" className="x" aria-label="לבטל בחירה" onClick={() => { setFloat(null); setSel(null); }}>×</button>}
                  </div>
                )}
                <Hint>לחיצה ימנית מוחקת. Ctrl+גלגלת מגדיל איפה שהעכבר. גרירה עם הגלגלת (או הכלי 🖐) מזיזה את הציור. Ctrl+Z מבטל. {used.length ? `הציור הזה מופיע במשחק: ${used.slice(0, 3).join(', ')}${used.length > 3 ? '…' : ''}. כל שינוי נראה מיד במשחק.` : 'הציור עוד לא בשימוש. בבונה העולם אפשר לבחור אותו לדמות, לחפץ או לקישוט.'}</Hint>
              </div>
            </div>
          </div>

          <aside className="px-side">
            <section className="px-colors">
              <h3>צבע</h3>
              <div className="row">
                <label className="px-current" style={{ background: color }} title="לבחור כל צבע">
                  <input type="color" value={color} onChange={(e) => setColor(e.target.value)} aria-label="בחירת צבע" />
                </label>
                <span className="muted small">{color}</span>
              </div>
              {recent.length > 0 && (
                <div className="swatches small-sw" aria-label="צבעים אחרונים">
                  {recent.map((c) => <button type="button" key={c} style={{ background: c }} aria-label={c} className={c === color ? 'on' : ''} onClick={() => setColor(c)} />)}
                </div>
              )}
              <div className="pal-tabs">
                {PALETTES.map((x) => <button type="button" key={x.id} className={x.id === palette ? 'on' : ''} onClick={() => setPalette(x.id)}>{x.name}</button>)}
              </div>
              <div className="swatches">
                {pal.colors.map((c) => <button type="button" key={c} style={{ background: c }} aria-label={c} className={c === color ? 'on' : ''} data-color={c} onClick={() => { setColor(c); if (tool === 'eraser' || tool === 'picker') setTool('pencil'); }} />)}
              </div>
            </section>
            {layers && (
              <section className="px-layers">
                <h3>שכבות</h3>
                <p className="muted small">השכבה העליונה מכסה את מה שמתחתיה.</p>
                <ul>
                  {layers.map((l, i) => ({ l, i })).reverse().map(({ l, i }) => (
                    <li key={i} className={i === act ? 'on' : ''} onClick={() => setActive(i)}>
                      <button type="button" className="x" aria-label={l.visible ? 'להסתיר שכבה' : 'להראות שכבה'} title={l.visible ? 'להסתיר' : 'להראות'}
                        onClick={(e) => { e.stopPropagation(); setLayer(i, (x) => ({ ...x, visible: !x.visible })); }}>{l.visible ? '👁' : '—'}</button>
                      <input value={l.name} aria-label="שם השכבה" onClick={(e) => e.stopPropagation()} onFocus={() => setActive(i)}
                        onChange={(e) => { const v = e.target.value; setLayers(layers.map((x, j) => (j === i ? { ...x, name: v } : x))); }}
                        onBlur={(e) => setLayer(i, (x) => ({ ...x, name: e.target.value }))} />
                    </li>
                  ))}
                </ul>
                <div className="row">
                  <button type="button" className="small" onClick={addLayer}>+ שכבה</button>
                  <button type="button" className="small" onClick={dupLayer}>לשכפל</button>
                  <button type="button" className="x" aria-label="שכבה למעלה" title="למעלה" onClick={() => moveLayer(1)} disabled={act >= layers.length - 1}>↑</button>
                  <button type="button" className="x" aria-label="שכבה למטה" title="למטה" onClick={() => moveLayer(-1)} disabled={act === 0}>↓</button>
                  <button type="button" className="x" aria-label="למחוק שכבה" title="למחוק שכבה" onClick={() => void delLayer()} disabled={layers.length < 2}>🗑</button>
                </div>
              </section>
            )}
            <section className="px-preview">
              <h3>בגודל אמיתי</h3>
              <div className="row">
                {Math.max(w, h) <= 64 && <SpriteImg id={sprite.id} size={Math.max(w, h)} />}
                <SpriteImg id={sprite.id} size={Math.min(Math.max(w, h) * 3, 236)} />
              </div>
            </section>
          </aside>
        </>
      )}
    </div>
  );
}
