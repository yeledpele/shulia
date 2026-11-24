// בדיקת משחק — runs a fresh copy of the current project, with the debug board.
import { useEffect, useRef, useState } from 'react';
import { startGame, type DebugInfo, type GameHandle } from '../runtime/game';
import { getProject, useProject } from './store';

export default function Playtest() {
  const p = useProject();
  const host = useRef<HTMLDivElement>(null);
  const game = useRef<GameHandle | null>(null);
  const [debug, setDebug] = useState(false);
  const [muted, setMuted] = useState(false);
  const [info, setInfo] = useState<DebugInfo | null>(null);
  const [startScene, setStartScene] = useState(p.startSceneId); // the game's real start; the menu can try another scene
  const [run, setRun] = useState(0);

  useEffect(() => {
    let alive = true;
    let handle: GameHandle | null = null;
    const copy = JSON.parse(JSON.stringify(getProject()));
    startGame(host.current!, copy, { onDebug: (d) => alive && setInfo(d), debug, muted, startSceneId: startScene }).then((h) => {
      if (!alive) { h.destroy(); return; }
      handle = h; game.current = h;
      host.current?.focus({ preventScroll: true }); // keyboard (Space, 1-4) goes to the game, not to a button
    });
    return () => { alive = false; handle?.destroy(); game.current = null; };
    // a new run picks up the latest project
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [run]);

  useEffect(() => { game.current?.setDebug(debug); }, [debug, info === null]);
  useEffect(() => { game.current?.setMuted(muted); }, [muted, info === null]);
  const trace = info?.lastTrace;

  return (
    <div className="play-screen">
      <div className="controls">
        <label className="pick" htmlFor="start-scene">
          <span>להתחיל מ:</span>
          <select id="start-scene" value={startScene} onChange={(e) => setStartScene(e.target.value)}>
            {Object.values(p.scenes).map((s) => <option key={s.id} value={s.id}>{s.id === p.startSceneId ? `★ ${s.name} (ההתחלה)` : s.name}</option>)}
          </select>
        </label>
        <button id="btn-restart" className="primary" onClick={(e) => { e.currentTarget.blur(); setRun((r) => r + 1); }}>↻ להתחיל מחדש</button>
        <button id="btn-debug" className={`toggle ${debug ? 'on' : ''}`} aria-pressed={debug} onClick={(e) => { e.currentTarget.blur(); setDebug((d) => !d); }}>
          מצב בדיקה {debug ? 'פעיל' : 'כבוי'}
        </button>
        <button id="btn-mute" className={`toggle ${muted ? '' : 'on'}`} aria-pressed={!muted} onClick={(e) => { e.currentTarget.blur(); setMuted((m) => !m); }}>
          צלילים {muted ? 'כבויים' : 'פועלים'}
        </button>
      </div>

      <main className={`stage ${debug ? 'with-panel' : ''}`}>
        <div className="screen-wrap">
          <div className="screen" ref={host} key={run} tabIndex={-1} aria-label="מסך המשחק" onPointerDown={() => host.current?.focus({ preventScroll: true })} />
          <p className="how">לחצו כדי ללכת. לחצו על דברים כדי לבדוק אותם. בחרו חפץ מהתיק ואז לחצו על משהו כדי להשתמש בו. רווח או מספרים מקדמים שיחות.</p>
        </div>

        {debug && info && (
          <aside className="panel" aria-label="מצב בדיקה">
            <section className="why">
              <h2>למה זה (לא) עבד?</h2>
              {!trace && <p className="muted">לחצו על משהו במשחק, וכאן יופיע ההסבר.</p>}
              {trace && (
                <>
                  <p className="did">{trace.trigger}</p>
                  {trace.fired && <p className="ok">✔ קרה: {trace.fired}</p>}
                  {!trace.fired && trace.checks.length === 0 && <p className="muted">אין חוק לזה. לכן מוצג התיאור הרגיל.</p>}
                  <ul className="checks">
                    {trace.checks.map((c) => {
                      const ran = c.passed && c.ruleName === trace.fired;
                      const skipped = c.passed && !ran;
                      return (
                        <li key={c.ruleId} className={ran ? 'pass' : skipped ? 'skip' : 'fail'}>
                          <strong>{ran ? '✔' : skipped ? '–' : '✘'} {c.ruleName}</strong>
                          {skipped && <span>לא הגיע תורו: חוק קודם ברשימה כבר קרה</span>}
                          {c.reasons.map((r) => <span key={r}>{r}</span>)}
                        </li>
                      );
                    })}
                  </ul>
                  {trace.fallback && !trace.fired && <p className="muted">הודעה: {trace.fallback}</p>}
                </>
              )}
            </section>
            <section><h2>איפה אני</h2><p>{info.sceneName}</p></section>
            <section><h2>בתיק</h2><p>{info.inventory.length ? info.inventory.join(' · ') : 'ריק'}</p></section>
            <section>
              <h2>מה כבר קרה</h2>
              <ul className="flags">
                {info.flags.map((f) => <li key={f.name} className={f.value ? 'yes' : 'no'}>{f.value ? '✔' : '○'} {f.name}</li>)}
              </ul>
            </section>
            <section className="legend">
              <span><i className="sw yolk" /> אפשר ללחוץ</span>
              <span><i className="sw sky" /> יציאה / אזור הליכה</span>
              <span><i className="sw grey" /> מוסתר</span>
            </section>
          </aside>
        )}
      </main>
    </div>
  );
}
