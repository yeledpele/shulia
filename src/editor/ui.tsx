// Small shared UI pieces for the studios: picture picker, confirm dialog, sprite image, tabs.
import { useEffect, useRef, useState, useSyncExternalStore, type ReactNode } from 'react';
import { useProject } from './store';

// ── Sprite image ──────────────────────────────────────────────────
export function SpriteImg({ id, size = 40, className = '' }: { id?: string; size?: number; className?: string }) {
  const p = useProject();
  const s = id ? p.sprites[id] : undefined;
  if (!s) return <span className={`spr empty ${className}`} style={{ width: size, height: size }} aria-hidden="true" />;
  const k = size / Math.max(s.w, s.h);
  return (
    <img className={`spr ${className}`} src={s.dataUrl} alt="" width={Math.round(s.w * k)} height={Math.round(s.h * k)}
      style={{ imageRendering: 'pixelated' }} draggable={false} />
  );
}

// ── Picker: a button that opens a grid of choices (with pictures) ─
export interface Option { id: string; label: string; icon?: string; group?: string }

export function Picker({ value, options, onChange, placeholder = 'לבחור…', onCreate, createLabel = 'חדש', testId, compact }: {
  value?: string; options: Option[]; onChange: (id: string) => void; placeholder?: string;
  onCreate?: (name: string) => string | void; createLabel?: string; testId?: string; compact?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const ref = useRef<HTMLSpanElement>(null);
  const cur = options.find((o) => o.id === value);
  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent) => { if (!ref.current?.contains(e.target as Node)) setOpen(false); };
    const esc = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false); };
    window.addEventListener('mousedown', close);
    window.addEventListener('keydown', esc);
    return () => { window.removeEventListener('mousedown', close); window.removeEventListener('keydown', esc); };
  }, [open]);
  const groups = [...new Set(options.map((o) => o.group ?? ''))];
  const create = () => {
    const n = name.trim();
    if (!n || !onCreate) return;
    const id = onCreate(n);
    if (id) onChange(id);
    setName(''); setOpen(false);
  };
  return (
    <span className={`picker ${compact ? 'compact' : ''}`} ref={ref}>
      <button type="button" className={`pick-btn ${cur ? '' : 'unset'}`} data-testid={testId} onClick={() => setOpen((o) => !o)} aria-expanded={open}>
        {cur?.icon && <SpriteImg id={cur.icon} size={22} />}
        <span>{cur ? cur.label : value ? `(${value} נמחק)` : placeholder}</span>
        <span className="caret" aria-hidden="true">▾</span>
      </button>
      {open && (
        <div className="pop" role="listbox">
          {options.length === 0 && !onCreate && <p className="muted">אין עדיין כלום לבחור.</p>}
          {groups.map((g) => (
            <div key={g} className="pop-group">
              {g && <h4>{g}</h4>}
              <div className="pop-grid">
                {options.filter((o) => (o.group ?? '') === g).map((o) => (
                  <button key={o.id} type="button" role="option" aria-selected={o.id === value} className={o.id === value ? 'on' : ''}
                    onClick={() => { onChange(o.id); setOpen(false); }}>
                    {o.icon && <SpriteImg id={o.icon} size={30} />}
                    <span>{o.label}</span>
                  </button>
                ))}
              </div>
            </div>
          ))}
          {onCreate && (
            <div className="pop-create">
              <input value={name} placeholder={`${createLabel}: שם…`} onChange={(e) => setName(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') create(); }} aria-label={createLabel} />
              <button type="button" onClick={create} disabled={!name.trim()}>+ {createLabel}</button>
            </div>
          )}
        </div>
      )}
    </span>
  );
}

// ── Confirm dialog (window.confirm is not available everywhere) ───
interface Ask { text: string; ok: string; resolve: (v: boolean) => void }
let ask: Ask | null = null;
const askListeners = new Set<() => void>();
const setAsk = (a: Ask | null) => { ask = a; askListeners.forEach((l) => l()); };

export function askConfirm(text: string, ok = 'כן, למחוק'): Promise<boolean> {
  return new Promise((resolve) => setAsk({ text, ok, resolve }));
}

export function ConfirmHost() {
  const a = useSyncExternalStore((l) => { askListeners.add(l); return () => askListeners.delete(l); }, () => ask);
  const okRef = useRef<HTMLButtonElement>(null);
  useEffect(() => { okRef.current?.focus(); }, [a]);
  if (!a) return null;
  const done = (v: boolean) => { a.resolve(v); setAsk(null); };
  return (
    <div className="modal-back" onMouseDown={() => done(false)}>
      <div className="modal" role="alertdialog" aria-modal="true" onMouseDown={(e) => e.stopPropagation()}
        onKeyDown={(e) => { if (e.key === 'Escape') done(false); }}>
        <p>{a.text}</p>
        <div className="modal-actions">
          <button type="button" className="danger" ref={okRef} onClick={() => done(true)}>{a.ok}</button>
          <button type="button" onClick={() => done(false)}>ביטול</button>
        </div>
      </div>
    </div>
  );
}

// ── Tabs ─────────────────────────────────────────────────────────
export function Tabs<T extends string>({ tabs, value, onChange }: { tabs: { id: T; label: string }[]; value: T; onChange: (t: T) => void }) {
  return (
    <div className="tabs" role="tablist">
      {tabs.map((t) => (
        <button key={t.id} type="button" role="tab" aria-selected={t.id === value} className={t.id === value ? 'on' : ''} onClick={() => onChange(t.id)}>
          {t.label}
        </button>
      ))}
    </div>
  );
}

export function Hint({ children }: { children: ReactNode }) {
  return <p className="hint"><span className="hint-cat" aria-hidden="true" />{children}</p>;
}
