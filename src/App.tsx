import { useEffect, useState } from 'react';
import { loadSaved, redo, undo, useHistory, useProject } from './editor/store';
import { go, useNav, type Route } from './editor/nav';
import { ConfirmHost } from './editor/ui';
import Home, { Gallery } from './editor/Home';
import WorldBuilder from './editor/WorldBuilder';
import PuzzleDesigner from './editor/PuzzleDesigner';
import StoryLab from './editor/StoryLab';
import Playtest from './editor/Playtest';
import PixelStudio from './editor/PixelStudio';
import BgStudio from './editor/BgStudio';

const TITLES: Record<Route, string> = {
  home: 'הסטודיו שלי', story: 'מעבדת הסיפור', world: 'בונה העולם', bg: 'סטודיו רקעים', pixel: 'סטודיו פיקסלים',
  anim: 'סטודיו אנימציה', puzzle: 'מעצב החידות', play: 'בדיקת משחק',
};

export default function App() {
  const p = useProject();
  const nav = useNav();
  const { canUndo, canRedo, saveState } = useHistory();
  const [ready, setReady] = useState(false);

  useEffect(() => { void loadSaved().finally(() => setReady(true)); }, []);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement;
      if (t.closest('input, textarea, [contenteditable]')) return;
      if (!(e.ctrlKey || e.metaKey)) return;
      const k = e.key.toLowerCase();
      if ((k === 'z' && !e.shiftKey) || k === 'ז') { e.preventDefault(); undo(); }
      else if (k === 'y' || (k === 'z' && e.shiftKey) || k === 'ט') { e.preventDefault(); redo(); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const saved = saveState === 'saving' ? 'שומר…' : saveState === 'error' ? 'לא נשמר!' : saveState === 'saved' ? 'נשמר ✓' : '';

  return (
    <div className={`shell r-${nav.route}`}>
      <header className="top">
        <button type="button" className="brand" onClick={() => go('home')} aria-label="לסטודיו הראשי">
          <span className="mark" aria-hidden="true" />
          <span className="brand-text">
            <span className="h1">{p.meta.title || 'המשחק שלי'}</span>
            <span className="crumb">{TITLES[nav.route]}</span>
          </span>
        </button>
        <div className="controls">
          {nav.route !== 'home' && <button type="button" className="home-btn" onClick={() => go('home')}>⌂ בית</button>}
          <button type="button" className="icon" id="btn-undo" onClick={undo} disabled={!canUndo} title="לבטל (Ctrl+Z)" aria-label="לבטל">↶ בטל</button>
          <button type="button" className="icon" id="btn-redo" onClick={redo} disabled={!canRedo} title="לחזור (Ctrl+Y)" aria-label="לחזור">↷ חזור</button>
          <span className={`save s-${saveState}`} aria-live="polite">{saved}</span>
          {nav.route !== 'play'
            ? <button key="play" type="button" id="btn-play" className="play" onClick={(e) => { e.currentTarget.blur(); go('play'); }}>▶ PLAY</button>
            : <button key="back" type="button" id="btn-back" className="play back" onClick={(e) => { e.currentTarget.blur(); go('world'); }}>✎ חזרה לעריכה</button>}
        </div>
      </header>
      {!ready ? <p className="muted">טוען…</p> : (
        <>
          {nav.route === 'home' && <Home />}
          {nav.route === 'world' && <WorldBuilder />}
          {nav.route === 'puzzle' && <PuzzleDesigner />}
          {nav.route === 'story' && <StoryLab />}
          {nav.route === 'pixel' && <PixelStudio />}
          {nav.route === 'bg' && <BgStudio />}
          {nav.route === 'anim' && <Gallery kind="anim" />}
          {nav.route === 'play' && <Playtest />}
        </>
      )}
      <ConfirmHost />
    </div>
  );
}
