// הסטודיו שלי — six studio tiles, a "what now?" suggestion, and project actions.
import type { Project } from '../model/types';
import { resetToEmpty, resetToStarter, setAllScenesNight, useProject } from './store';
import { askConfirm, SpriteImg } from './ui';
import { go, type Route } from './nav';

export interface Tip { text: string; route: Route; sceneId?: string; storyTab?: string; puzzleTab?: string; dialogueId?: string }

export function suggestions(p: Project): Tip[] {
  const tips: Tip[] = [];
  const scenes = Object.values(p.scenes);
  const json = JSON.stringify(p.rules) + JSON.stringify(p.dialogues);
  for (const s of scenes) {
    if (scenes.length > 1 && !s.objects.some((o) => o.kind === 'exit' && o.exitTo)) {
      const goesHere = JSON.stringify(p.rules).includes(`"sceneId":"${s.id}"`);
      if (!goesHere) tips.push({ text: `מהסצנה "${s.name}" אי אפשר לצאת. הוסיפו לה יציאה.`, route: 'world', sceneId: s.id });
    }
    for (const o of s.objects) if (o.kind === 'exit' && (!o.exitTo || !p.scenes[o.exitTo])) tips.push({ text: `ליציאה "${o.name}" בסצנה "${s.name}" אין לאן להוביל.`, route: 'world', sceneId: s.id });
  }
  for (const s of scenes) {
    if (s.id === p.startSceneId) continue;
    const reachable = scenes.some((x) => x.objects.some((o) => o.exitTo === s.id)) || json.includes(`"sceneId":"${s.id}"`);
    if (!reachable) tips.push({ text: `אין דרך להגיע לסצנה "${s.name}".`, route: 'world', sceneId: s.id });
  }
  for (const it of Object.values(p.items)) {
    const given = json.includes(`"addItem","itemId":"${it.id}"`) || json.includes(`"itemId":"${it.id}"`);
    if (!given) tips.push({ text: `את החפץ "${it.name}" אי אפשר להשיג במשחק. שימו אותו בסצנה או תנו אותו בחוק.`, route: 'world' });
  }
  for (const d of Object.values(p.dialogues)) {
    if (!json.replace(JSON.stringify(p.dialogues), '').includes(`"${d.id}"`) && !JSON.stringify(p.rules).includes(`"${d.id}"`))
      tips.push({ text: `השיחה "${d.name}" לא מתחילה אף פעם.`, route: 'story', storyTab: 'dialogues', dialogueId: d.id });
  }
  if (!json.includes('"type":"win"')) tips.push({ text: 'עוד אין סוף למשחק. הוסיפו את הפעולה "ניצחון!" בחוק או בשיחה.', route: 'puzzle', puzzleTab: 'rules' });
  if (!p.story.text.trim()) tips.push({ text: 'עוד לא כתבתם את הסיפור. מה קורה במשחק?', route: 'story', storyTab: 'story' });
  return tips;
}

const TILES: { route: Route; title: string; sub: string; color: string; count: (p: Project) => string; soon?: string }[] = [
  { route: 'story', title: 'מעבדת הסיפור', sub: 'סיפור, דמויות ושיחות', color: '#7048e8', count: (p) => `${Object.keys(p.characters).length} דמויות · ${Object.keys(p.dialogues).length} שיחות` },
  { route: 'world', title: 'בונה העולם', sub: 'סצנות, דברים בסצנה, יציאות', color: '#1c9cc8', count: (p) => `${Object.keys(p.scenes).length} סצנות` },
  { route: 'bg', title: 'סטודיו רקעים', sub: 'לבנות רקע מחלקים מוכנים', color: '#0ca678', count: (p) => `${Object.values(p.sprites).filter((s) => s.w >= 200 && s.h >= 100).length} רקעים` },
  { route: 'pixel', title: 'סטודיו פיקסלים', sub: 'לצייר דמויות וחפצים', color: '#e64980', count: (p) => `${Object.keys(p.sprites).length} ציורים` },
  { route: 'anim', title: 'סטודיו אנימציה', sub: 'להזיז את הציורים', color: '#f08c00', count: (p) => `${Object.keys(p.animations).length} אנימציות`, soon: 'בשלב 4' },
  { route: 'puzzle', title: 'מעצב החידות', sub: 'חוקים, חפצים ומשימות', color: '#2b8a3e', count: (p) => `${p.rules.length} חוקים · ${Object.keys(p.items).length} חפצים` },
  { route: 'play', title: 'בדיקת משחק', sub: 'לשחק במה שבניתם', color: '#f5b400', count: () => 'לשחק עכשיו' },
];

export default function Home() {
  const p = useProject();
  const tips = suggestions(p).slice(0, 3);
  const scenes = Object.values(p.scenes);
  return (
    <div className="home">
      <div className="tiles">
        {TILES.map((t) => (
          <button type="button" key={t.route} className={`tile t-${t.route}`} style={{ ['--tile' as string]: t.color }} onClick={() => go(t.route)} data-tile={t.route}>
            <span className="tile-art" aria-hidden="true">
              {t.route === 'world' && scenes[0]?.background.spriteId && <SpriteImg id={scenes[0].background.spriteId} size={150} />}
              {t.route === 'bg' && <SpriteImg id={scenes[1]?.background.spriteId ?? scenes[0]?.background.spriteId} size={150} />}
              {t.route === 'story' && <SpriteImg id={p.characters[p.playerId]?.spriteId} size={64} />}
              {t.route === 'pixel' && <SpriteImg id={Object.values(p.sprites).find((s) => s.w <= 32)?.id} size={64} />}
              {t.route === 'anim' && <SpriteImg id={p.animations[Object.keys(p.animations)[0]]?.frames[0]?.spriteId} size={64} />}
              {t.route === 'puzzle' && <SpriteImg id={Object.values(p.items)[0]?.spriteId ?? 'spr_key'} size={56} />}
              {t.route === 'play' && <span className="play-tri" />}
            </span>
            <span className="tile-title">{t.title}</span>
            <span className="tile-sub">{t.sub}</span>
            <span className="tile-count">{t.count(p)}{t.soon && <em> · {t.soon}</em>}</span>
          </button>
        ))}
      </div>
      <aside className="side">
        <section className="whatnow">
          <h2>מה עכשיו?</h2>
          {tips.length === 0 && <p>הכל נראה מוכן. לחצו PLAY ובדקו את המשחק!</p>}
          <ul>
            {tips.map((t) => (
              <li key={t.text}><button type="button" className="link" onClick={() => go(t.route, { sceneId: t.sceneId, storyTab: t.storyTab, puzzleTab: t.puzzleTab, dialogueId: t.dialogueId })}>{t.text}</button></li>
            ))}
          </ul>
        </section>
        <section className="proj">
          <h2>הפרויקט</h2>
          <p className="muted small">כל שינוי נשמר לבד בדפדפן הזה.</p>
          <div className="row daynight">
            <button type="button" data-action="all-night" onClick={() => setAllScenesNight(true)}>🌙 כל הסצנות בלילה</button>
            <button type="button" data-action="all-day" onClick={() => setAllScenesNight(false)}>☀ כל הסצנות ביום</button>
          </div>
          <button type="button" onClick={async () => { if (await askConfirm('להתחיל משחק חדש וריק? המשחק הנוכחי יימחק.', 'כן, משחק חדש')) { resetToEmpty(); go('world'); } }}>משחק חדש וריק</button>
          <button type="button" onClick={async () => { if (await askConfirm('לטעון מחדש את "שוליית האופה" המקורי? השינויים שלכם יימחקו.', 'כן, לטעון')) resetToStarter(); }}>לטעון את שוליית האופה המקורי</button>
        </section>
      </aside>
    </div>
  );
}

export function Gallery({ kind }: { kind: 'pixel' | 'anim' }) {
  const p = useProject();
  return (
    <div className="studio">
      <div className="soon">
        <h2>{kind === 'pixel' ? 'סטודיו פיקסלים' : 'סטודיו אנימציה'} ייבנה בשלב {kind === 'pixel' ? 3 : 4}</h2>
        <p>{kind === 'pixel' ? 'כאן תוכלו לצייר דמויות, חפצים ורקעים פיקסל אחרי פיקסל. בינתיים, אלה הציורים שכבר יש במשחק:' : 'כאן תוכלו לצייר פריים אחרי פריים ולהזיז את הדמויות. בינתיים, אלה האנימציות שכבר יש:'}</p>
      </div>
      <div className="gallery">
        {kind === 'pixel' && Object.values(p.sprites).map((s) => (
          <figure key={s.id}><SpriteImg id={s.id} size={s.w > 100 ? 160 : 72} /><figcaption>{s.name}</figcaption></figure>
        ))}
        {kind === 'anim' && Object.values(p.animations).map((a) => (
          <figure key={a.id}>
            <span className="frames">{a.frames.map((f, i) => <SpriteImg key={i} id={f.spriteId} size={48} />)}</span>
            <figcaption>{a.name} · {a.frames.length} פריימים</figcaption>
          </figure>
        ))}
      </div>
    </div>
  );
}
