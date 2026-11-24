// שוליית האופה — the starter game. Placeholder story the child can rewrite.
// Hanukkah sufganiyot: nine ingredients across seven places; each one is a different kind of puzzle.
import type { Action, Project, Rule } from './types';
import { makeStarterSprites } from './starterArt';

const INGREDIENTS = ['flour', 'eggs', 'milk', 'sugar', 'salt', 'yeast', 'strawberries', 'butter', 'fryoil'];

const take = (objectId: string, itemId: string, step?: string): Action[] => [
  { type: 'hide', objectId },
  { type: 'addItem', itemId },
  ...(step ? [{ type: 'completeStep', questId: 'main', stepId: step } as Action] : []),
];
const got = (itemId: string, step: string): Action[] => [
  { type: 'addItem', itemId },
  { type: 'completeStep', questId: 'main', stepId: step },
];

export function createStarterProject(): Project {
  const now = new Date().toISOString();
  const rules: Rule[] = [
    // ── המאפייה ──
    { id: 'r_intro', name: 'ברוך הבא למאפייה', when: { type: 'enterScene', sceneId: 'bakery' }, if: [], once: true,
      then: [{ type: 'message', text: 'בוקר טוב! האופה מחכה לך. לחץ עליו כדי לדבר.' }] },
    { id: 'r_baker_win', name: 'מביאים לאופה את כל תשעת המצרכים', when: { type: 'click', objectId: 'o_baker' },
      if: [{ type: 'hasAllItems', itemIds: INGREDIENTS }], then: [{ type: 'startDialogue', dialogueId: 'd_baker_end' }] },
    { id: 'r_baker_intro', name: 'האופה מבקש עזרה', when: { type: 'click', objectId: 'o_baker' },
      if: [{ type: 'flag', flagId: 'met_baker', value: false }], then: [{ type: 'startDialogue', dialogueId: 'd_baker_intro' }] },
    { id: 'r_baker_wait', name: 'האופה מחכה', when: { type: 'click', objectId: 'o_baker' }, if: [],
      then: [{ type: 'startDialogue', dialogueId: 'd_baker_hint' }] },
    { id: 'r_baker_machineoil', name: 'מנסים לתת לאופה שמן מכונות', when: { type: 'useItem', itemId: 'oilcan', objectId: 'o_baker' }, if: [],
      then: [{ type: 'say', characterId: 'baker', text: 'פויה! זה שמן של מכונות! לסופגניות צריך שמן לטיגון.' }] },
    { id: 'r_oven', name: 'הסיר חם', when: { type: 'click', objectId: 'o_oven' }, if: [],
      then: [{ type: 'message', text: 'סיר הטיגון כבר על האש. עכשיו רק צריך מצרכים.' }] },
    { id: 'r_cupboard', name: 'מוצאים סל בארון', when: { type: 'click', objectId: 'o_cupboard' }, if: [], once: true,
      then: [{ type: 'addItem', itemId: 'basket' }, { type: 'message', text: 'מצאת סל קש בארון!' }] },

    // ── הכיכר ──
    { id: 'r_pot', name: 'מזיזים את העציץ', when: { type: 'click', objectId: 'o_pot' }, if: [], once: true,
      then: [{ type: 'show', objectId: 'o_key' }, { type: 'message', text: 'הזזת את העציץ... משהו נוצץ מתחתיו!' }] },
    { id: 'r_key', name: 'לוקחים את המפתח', when: { type: 'click', objectId: 'o_key' }, if: [], then: take('o_key', 'key') },
    { id: 'r_door_open', name: 'נכנסים למחסן הפתוח', when: { type: 'click', objectId: 'o_warehouse_door' },
      if: [{ type: 'flag', flagId: 'warehouse_open', value: true }], then: [{ type: 'goToScene', sceneId: 'warehouse' }] },
    { id: 'r_door_key', name: 'פותחים את המחסן עם המפתח', when: { type: 'click', objectId: 'o_warehouse_door' },
      if: [{ type: 'hasItem', itemId: 'key' }], elseMessage: 'הדלת נעולה. אולי יש מפתח איפשהו בכיכר?',
      then: [
        { type: 'removeItem', itemId: 'key' }, { type: 'setFlag', flagId: 'warehouse_open', value: true },
        { type: 'playSound', soundId: 'snd_door' }, { type: 'message', text: 'קליק! הדלת נפתחה.' },
        { type: 'goToScene', sceneId: 'warehouse' },
      ] },
    { id: 'r_door_use_key', name: 'משתמשים במפתח על הדלת', when: { type: 'useItem', itemId: 'key', objectId: 'o_warehouse_door' }, if: [],
      then: [
        { type: 'removeItem', itemId: 'key' }, { type: 'setFlag', flagId: 'warehouse_open', value: true },
        { type: 'playSound', soundId: 'snd_door' }, { type: 'message', text: 'קליק! הדלת נפתחה.' },
        { type: 'goToScene', sceneId: 'warehouse' },
      ] },
    { id: 'r_well', name: 'מסתכלים בבאר', when: { type: 'click', objectId: 'o_well' },
      if: [{ type: 'flag', flagId: 'got_coin', value: false }], elseMessage: 'באר עמוקה. כבר אין בה שום דבר נוצץ.',
      then: [{ type: 'message', text: 'משהו נוצץ בתחתית הבאר! אבל היד לא מגיעה עד לשם.' }] },
    { id: 'r_well_stick', name: 'מנסים להוציא עם מקל', when: { type: 'useItem', itemId: 'stick', objectId: 'o_well' }, if: [],
      then: [{ type: 'message', text: 'המקל מגיע עד למטבע, אבל המטבע לא נדבק אליו. אם רק המקל היה דביק...' }] },
    { id: 'r_well_sticky', name: 'דגים מטבע עם המקל הדביק', when: { type: 'useItem', itemId: 'sticky', objectId: 'o_well' }, if: [],
      then: [
        { type: 'removeItem', itemId: 'sticky' }, { type: 'addItem', itemId: 'coin' }, { type: 'setFlag', flagId: 'got_coin', value: true },
        { type: 'playSound', soundId: 'snd_boing' }, { type: 'message', text: 'בום! המטבע נדבק למסטיק. דגת מטבע זהב!' },
      ] },
    { id: 'r_combine_sticky', name: 'מחברים מקל ומסטיק', when: { type: 'combine', a: 'stick', b: 'gum' }, if: [],
      then: [
        { type: 'removeItem', itemId: 'stick' }, { type: 'removeItem', itemId: 'gum' }, { type: 'addItem', itemId: 'sticky' },
        { type: 'message', text: 'לעסת את המסטיק והדבקת אותו לקצה המקל. איכס... אבל זה מקל דביק מצוין!' },
      ] },

    // ── המחסן ──
    { id: 'r_flour', name: 'לוקחים קמח', when: { type: 'click', objectId: 'o_flour' }, if: [], then: take('o_flour', 'flour', 'flour') },
    { id: 'r_bucket', name: 'לוקחים דלי', when: { type: 'click', objectId: 'o_bucket' }, if: [], then: take('o_bucket', 'bucket') },
    { id: 'r_crates', name: 'מזיזים את הארגזים', when: { type: 'click', objectId: 'o_crates' }, if: [], once: true,
      elseMessage: 'ארגזים כבדים מלאים בתפוחי אדמה.',
      then: [{ type: 'show', objectId: 'o_fryoil' }, { type: 'message', text: 'דחפת את הארגזים... מאחוריהם מסתתר בקבוק שמן לטיגון!' }] },
    { id: 'r_fryoil', name: 'לוקחים שמן לטיגון', when: { type: 'click', objectId: 'o_fryoil' }, if: [], then: take('o_fryoil', 'fryoil', 'fryoil') },
    { id: 'r_oil', name: 'לוקחים פחית שמן', when: { type: 'click', objectId: 'o_oilcan' }, if: [], then: take('o_oilcan', 'oilcan') },

    // ── החווה ──
    { id: 'r_farmer', name: 'מדברים עם החוואית על ביצים', when: { type: 'click', objectId: 'o_farmer' },
      if: [{ type: 'flag', flagId: 'got_eggs', value: false }], then: [{ type: 'startDialogue', dialogueId: 'd_farmer' }] },
    { id: 'r_farmer_letter', name: 'החוואית מבקשת למסור מכתב', when: { type: 'click', objectId: 'o_farmer' },
      if: [{ type: 'flag', flagId: 'got_letter', value: false }], then: [{ type: 'startDialogue', dialogueId: 'd_farmer_letter' }] },
    { id: 'r_farmer_done', name: 'החוואית מאחלת בהצלחה', when: { type: 'click', objectId: 'o_farmer' }, if: [],
      then: [{ type: 'say', characterId: 'farmer', text: 'בהצלחה עם הטיגון! ואל תשכח לשמור לי סופגנייה.' }] },
    { id: 'r_milk', name: 'חולבים את הפרה עם הדלי', when: { type: 'useItem', itemId: 'bucket', objectId: 'o_cow' }, if: [],
      then: [
        { type: 'playAnim', objectId: 'o_cow', animId: 'anim_cow_moo' }, { type: 'playSound', soundId: 'snd_moo' },
        { type: 'removeItem', itemId: 'bucket' }, ...got('milk', 'milk'), { type: 'message', text: 'מווו! קיבלת חלב טרי.' },
      ] },
    { id: 'r_cow', name: 'מלטפים את הפרה', when: { type: 'click', objectId: 'o_cow' }, if: [],
      then: [
        { type: 'playAnim', objectId: 'o_cow', animId: 'anim_cow_moo' }, { type: 'playSound', soundId: 'snd_moo' },
        { type: 'message', text: 'הפרה מסתכלת עליך. אם רק היה לך דלי...' },
      ] },

    // ── הטחנה ──
    { id: 'r_gears_oil', name: 'משמנים את הגלגלים', when: { type: 'useItem', itemId: 'oilcan', objectId: 'o_gears' }, if: [],
      then: [
        { type: 'removeItem', itemId: 'oilcan' }, { type: 'setFlag', flagId: 'mill_fixed', value: true },
        { type: 'hide', objectId: 'o_sails_stuck' }, { type: 'playSound', soundId: 'snd_whirr' },
        { type: 'message', text: 'שמנת את הגלגלים... והכנפיים של הטחנה מתחילות להסתובב!' },
      ] },
    { id: 'r_gears', name: 'בודקים את הגלגלים', when: { type: 'click', objectId: 'o_gears' },
      if: [{ type: 'flag', flagId: 'mill_fixed', value: false }], elseMessage: 'הגלגלים מסתובבים בשמחה.',
      then: [{ type: 'message', text: 'הגלגלים חלודים וחורקים. צריך לשמן אותם.' }] },
    { id: 'r_miller_stuck', name: 'הטוחן מתלונן', when: { type: 'click', objectId: 'o_miller' },
      if: [{ type: 'flag', flagId: 'mill_fixed', value: false }], then: [{ type: 'startDialogue', dialogueId: 'd_miller_stuck' }] },
    { id: 'r_miller_yeast', name: 'הטוחן נותן שמרים', when: { type: 'click', objectId: 'o_miller' },
      if: [{ type: 'flag', flagId: 'got_yeast', value: false }], then: [{ type: 'startDialogue', dialogueId: 'd_miller_yeast' }] },
    { id: 'r_miller_done', name: 'הטוחן שמח', when: { type: 'click', objectId: 'o_miller' }, if: [],
      then: [{ type: 'say', characterId: 'miller', text: 'שומע את הכנפיים? ווווש! תודה לך, שוליה.' }] },

    // ── השוק ──
    { id: 'r_candy_gum', name: 'מוכר הממתקים מציע מסטיק', when: { type: 'click', objectId: 'o_candy' },
      if: [{ type: 'flag', flagId: 'got_gum', value: false }], then: [{ type: 'startDialogue', dialogueId: 'd_candy' }] },
    { id: 'r_candy_wait', name: 'מוכר הממתקים רוצה פרח', when: { type: 'click', objectId: 'o_candy' },
      if: [{ type: 'hasItem', itemId: 'sugar', not: true }],
      then: [{ type: 'say', characterId: 'candy', text: 'סוכר? יש לי הרבה! אבל קודם... הדוכן שלי כל כך משעמם. פרח יפה היה עושה אותו שמח.' }] },
    { id: 'r_candy_done', name: 'מוכר הממתקים מודה', when: { type: 'click', objectId: 'o_candy' }, if: [],
      then: [{ type: 'say', characterId: 'candy', text: 'תראה איך הפרח זורח על הדוכן! תודה!' }] },
    { id: 'r_give_flower', name: 'נותנים פרח למוכר הממתקים', when: { type: 'useItem', itemId: 'flower', objectId: 'o_candy' }, if: [],
      then: [
        { type: 'removeItem', itemId: 'flower' }, { type: 'say', characterId: 'candy', text: 'איזה פרח מקסים! הנה, שקית סוכר בשבילך.' },
        ...got('sugar', 'sugar'),
      ] },
    { id: 'r_spice', name: 'מדברים עם סבתא זעתר', when: { type: 'click', objectId: 'o_spice' },
      if: [{ type: 'hasItem', itemId: 'salt', not: true }],
      then: [{ type: 'say', characterId: 'spice', text: 'מלח? בטח, מותק. מטבע אחד, בבקשה. אין מטבע? תחפש. מטבעות אוהבים להתחבא במקומות עמוקים.' }] },
    { id: 'r_spice_done', name: 'סבתא זעתר מברכת', when: { type: 'click', objectId: 'o_spice' }, if: [],
      then: [{ type: 'say', characterId: 'spice', text: 'קצת מלח, והסופגניות יהיו מושלמות.' }] },
    { id: 'r_give_coin', name: 'נותנים מטבע לסבתא זעתר', when: { type: 'useItem', itemId: 'coin', objectId: 'o_spice' }, if: [],
      then: [{ type: 'removeItem', itemId: 'coin' }, { type: 'say', characterId: 'spice', text: 'מטבע זהב! הנה צנצנת מלח, והעודף... זה בשבילך, על המאמץ.' }, ...got('salt', 'salt')] },
    { id: 'r_cheese', name: 'מדברים עם מוטי הגבינות', when: { type: 'click', objectId: 'o_cheese' },
      if: [{ type: 'hasItem', itemId: 'butter', not: true }],
      then: [{ type: 'say', characterId: 'cheese', text: 'חמאה? היא לא למכירה. אני שומר אותה רק לחברים של אחותי רותי מהחווה.' }] },
    { id: 'r_cheese_done', name: 'מוטי הגבינות שמח', when: { type: 'click', objectId: 'o_cheese' }, if: [],
      then: [{ type: 'say', characterId: 'cheese', text: 'תגיד לרותי שאני מתגעגע!' }] },
    { id: 'r_give_letter', name: 'נותנים מכתב למוטי', when: { type: 'useItem', itemId: 'letter', objectId: 'o_cheese' }, if: [],
      then: [{ type: 'removeItem', itemId: 'letter' }, { type: 'startDialogue', dialogueId: 'd_cheese_letter' }] },

    // ── הגינה ──
    { id: 'r_stick', name: 'לוקחים מקל', when: { type: 'click', objectId: 'o_stick' }, if: [], then: take('o_stick', 'stick') },
    { id: 'r_flowers', name: 'קוטפים פרח', when: { type: 'click', objectId: 'o_flowerbed' }, if: [], once: true,
      elseMessage: 'כבר קטפת את הפרח הכי יפה. השאר הם של הדבורים.',
      then: [{ type: 'addItem', itemId: 'flower' }, { type: 'message', text: 'קטפת פרח אדום ויפה.' }] },
    { id: 'r_bees', name: 'שרים לדבורים בשביל תותים', when: { type: 'click', objectId: 'o_bee' },
      if: [{ type: 'flag', flagId: 'got_strawberries', value: false }],
      then: [{ type: 'playSound', soundId: 'snd_buzz' }, { type: 'startDialogue', dialogueId: 'd_bees' }] },
    { id: 'r_bees_done', name: 'הדבורים מרוצות', when: { type: 'click', objectId: 'o_bee' }, if: [],
      then: [{ type: 'playSound', soundId: 'snd_buzz' }, { type: 'say', characterId: 'bee', text: 'בזזז... תביא לנו סופגנייה אחת, טוב?' }] },
    { id: 'r_hive', name: 'נוגעים בכוורת', when: { type: 'click', objectId: 'o_hive' }, if: [],
      then: [{ type: 'playSound', soundId: 'snd_buzz' }, { type: 'message', text: 'בזזזז! עדיף לא לגעת בכוורת. אולי כדאי לדבר עם המלכה?' }] },
  ];

  return {
    version: 1,
    meta: { title: 'שוליית האופה', author: '', createdAt: now, updatedAt: now },
    story: {
      text: 'חנוכה בעיר! האופה זלמן צריך לטגן מאות סופגניות לחג. אבל נגמרו לו כל המצרכים! השוליה יוצא לעיר לאסוף תשעה מצרכים: קמח, ביצים, חלב, סוכר, מלח, שמרים, חמאה, תותים לריבה ושמן לטיגון.',
      notes: [],
    },
    startSceneId: 'bakery',
    playerId: 'apprentice',
    characters: {
      apprentice: { id: 'apprentice', name: 'השוליה', description: 'עוזר צעיר במאפייה', personality: ['סקרן', 'אמיץ'], color: '#3f7bd6',
        spriteId: 'spr_apprentice', anims: { idle: 'anim_app_idle', walk: 'anim_app_walk', celebrate: 'anim_app_cheer' } },
      baker: { id: 'baker', name: 'האופה זלמן', description: 'אופה זקן עם שפם עבות ולב רך.', personality: ['חם', 'מבולבל'], color: '#c97b2c',
        spriteId: 'spr_baker', anims: { idle: 'anim_baker_idle', talk: 'anim_baker_talk' } },
      farmer: { id: 'farmer', name: 'החוואית רותי', description: 'חוואית עם כובע קש גדול.', personality: ['ישירה', 'מצחיקה'], color: '#4f8a3c',
        spriteId: 'spr_farmer', anims: { idle: 'anim_farmer_idle', talk: 'anim_farmer_talk' } },
      miller: { id: 'miller', name: 'הטוחן משה', description: 'טוחן מכוסה כולו בקמח.', personality: ['עייף', 'אדיב'], color: '#868e96',
        spriteId: 'spr_miller', anims: { talk: 'anim_miller_talk' } },
      candy: { id: 'candy', name: 'דודו הממתקים', description: 'מוכר ממתקים צבעוני.', personality: ['עליז', 'פטפטן'], color: '#e64980',
        spriteId: 'spr_candy', anims: { talk: 'anim_candy_talk' } },
      spice: { id: 'spice', name: 'סבתא זעתר', description: 'מוכרת תבלינים חכמה.', personality: ['חכמה', 'חמה'], color: '#e8590c',
        spriteId: 'spr_spice', anims: { talk: 'anim_spice_talk' } },
      cheese: { id: 'cheese', name: 'מוטי הגבינות', description: 'האח של רותי. מוכר גבינות וחמאה.', personality: ['חשדן', 'רגשן'], color: '#f2c14e',
        spriteId: 'spr_cheese', anims: { talk: 'anim_cheese_talk' } },
      bee: { id: 'bee', name: 'המלכה זומזומה', description: 'מלכת הדבורים של הגינה.', personality: ['מלכותית', 'אוהבת מוזיקה'], color: '#fab005',
        spriteId: 'spr_bee', anims: { idle: 'anim_bee', talk: 'anim_bee' } },
    },
    scenes: {
      bakery: {
        id: 'bakery', name: 'המאפייה', background: { spriteId: 'bg_bakery', color: '#f1d6a8' },
        walkArea: { x: 40, y: 400, w: 880, h: 120 }, night: true,
        objects: [
          { id: 'o_baker', name: 'האופה זלמן', kind: 'character', ref: 'baker', x: 520, y: 470, w: 80, h: 120, scale: 5, visible: true },
          { id: 'o_oven', name: 'תנור', kind: 'prop', spriteId: 'spr_oven', x: 876, y: 440, w: 112, h: 112, scale: 4, visible: true },
          { id: 'o_cupboard', name: 'ארון', kind: 'hotspot', description: 'הארון ריק עכשיו.', x: 748, y: 376, w: 152, h: 200, visible: true },
          { id: 'o_window', name: 'חלון', kind: 'hotspot', description: 'בחוץ השמש זורחת. יום טוב לאפייה!', x: 448, y: 192, w: 160, h: 120, visible: true },
          { id: 'x_bakery_square', name: 'יציאה לכיכר', kind: 'exit', exitTo: 'square', x: 68, y: 380, w: 104, h: 220, visible: true },
        ],
      },
      square: {
        id: 'square', name: 'כיכר העיר', background: { spriteId: 'bg_square', color: '#c7b9a8' },
        walkArea: { x: 40, y: 390, w: 880, h: 130 }, night: true,
        objects: [
          { id: 'o_warehouse_door', name: 'דלת המחסן', kind: 'hotspot', x: 420, y: 368, w: 104, h: 144, visible: true },
          { id: 'o_pot', name: 'עציץ', kind: 'prop', spriteId: 'spr_flowerpot', x: 600, y: 430, w: 56, h: 72, scale: 4, visible: true },
          { id: 'o_key', name: 'מפתח', kind: 'item', ref: 'key', x: 660, y: 440, w: 48, h: 30, scale: 3, visible: false },
          { id: 'o_well', name: 'באר', kind: 'prop', spriteId: 'spr_well', x: 190, y: 450, w: 96, h: 104, scale: 4, visible: true },
          { id: 'x_square_bakery', name: 'חזרה למאפייה', kind: 'exit', exitTo: 'bakery', x: 920, y: 368, w: 70, h: 136, visible: true },
          { id: 'x_square_farm', name: 'שביל לחווה', kind: 'exit', exitTo: 'farm', x: 40, y: 500, w: 70, h: 200, visible: true },
          { id: 'x_square_market', name: 'סמטה לשוק', kind: 'exit', exitTo: 'market', arrow: 'down', x: 780, y: 536, w: 150, h: 70, visible: true },
        ],
      },
      warehouse: {
        id: 'warehouse', name: 'המחסן', background: { spriteId: 'bg_warehouse', color: '#5a4636' },
        walkArea: { x: 40, y: 400, w: 880, h: 120 }, night: true,
        objects: [
          { id: 'o_flour', name: 'שק קמח', kind: 'item', ref: 'flour', x: 320, y: 470, w: 56, h: 64, scale: 4, visible: true },
          { id: 'o_bucket', name: 'דלי', kind: 'item', ref: 'bucket', x: 520, y: 470, w: 56, h: 56, scale: 4, visible: true },
          { id: 'o_oilcan', name: 'פחית שמן', kind: 'item', ref: 'oilcan', x: 700, y: 480, w: 64, h: 56, scale: 4, visible: true },
          { id: 'o_crates', name: 'ארגזים', kind: 'hotspot', description: 'ארגזים כבדים מלאים בתפוחי אדמה.', x: 140, y: 380, w: 120, h: 180, visible: true },
          { id: 'o_fryoil', name: 'בקבוק שמן לטיגון', kind: 'item', ref: 'fryoil', x: 240, y: 480, w: 40, h: 72, scale: 4, visible: false },
          { id: 'x_warehouse_square', name: 'חזרה לכיכר', kind: 'exit', exitTo: 'square', x: 892, y: 380, w: 104, h: 220, visible: true },
        ],
      },
      farm: {
        id: 'farm', name: 'החווה', background: { spriteId: 'bg_farm', color: '#7cb85a' },
        walkArea: { x: 40, y: 400, w: 880, h: 120 }, night: true,
        objects: [
          { id: 'o_farmer', name: 'החוואית רותי', kind: 'character', ref: 'farmer', x: 300, y: 450, w: 80, h: 120, scale: 5, visible: true },
          { id: 'o_cow', name: 'פרה', kind: 'prop', spriteId: 'spr_cow', animId: 'anim_cow_idle', x: 640, y: 470, w: 140, h: 100, scale: 5, visible: true },
          { id: 'o_barn', name: 'אסם', kind: 'hotspot', description: 'אסם אדום. מריח כמו חציר.', x: 208, y: 320, w: 256, h: 220, visible: true },
          { id: 'x_farm_square', name: 'חזרה לכיכר', kind: 'exit', exitTo: 'square', x: 920, y: 500, w: 70, h: 200, visible: true },
          { id: 'x_farm_mill', name: 'שביל לטחנה', kind: 'exit', exitTo: 'mill', x: 40, y: 500, w: 70, h: 200, visible: true },
        ],
      },
      mill: {
        id: 'mill', name: 'טחנת הרוח', background: { spriteId: 'bg_mill', color: '#a5d8ff' },
        walkArea: { x: 40, y: 400, w: 880, h: 120 }, night: true,
        objects: [
          { id: 'o_miller', name: 'הטוחן משה', kind: 'character', ref: 'miller', x: 320, y: 470, w: 80, h: 120, scale: 5, visible: true },
          { id: 'o_sails_stuck', name: 'כנפי הטחנה', kind: 'prop', spriteId: 'spr_sails', description: 'הכנפיים תקועות. הן לא זזות בכלל.', x: 540, y: 180, w: 198, h: 198, scale: 6, visible: true },
          { id: 'o_sails_spin', name: 'כנפי הטחנה', kind: 'prop', spriteId: 'spr_sails', animId: 'anim_sails', description: 'ווווש! הכנפיים מסתובבות ברוח.', x: 540, y: 180, w: 198, h: 198, scale: 6, visible: true, visibleFlag: 'mill_fixed' },
          { id: 'o_gears', name: 'גלגלי שיניים', kind: 'hotspot', x: 710, y: 372, w: 110, h: 90, visible: true },
          { id: 'o_mill_door', name: 'דלת הטחנה', kind: 'hotspot', description: 'הדלת נעולה. הטוחן אומר שבפנים יש רק אבק וקמח.', x: 540, y: 380, w: 64, h: 100, visible: true },
          { id: 'x_mill_farm', name: 'חזרה לחווה', kind: 'exit', exitTo: 'farm', x: 920, y: 500, w: 70, h: 200, visible: true },
        ],
      },
      market: {
        id: 'market', name: 'השוק', background: { spriteId: 'bg_market', color: '#ffd8a8' },
        walkArea: { x: 40, y: 400, w: 880, h: 120 }, night: true,
        objects: [
          { id: 'o_candy', name: 'דודו הממתקים', kind: 'character', ref: 'candy', x: 200, y: 450, w: 80, h: 120, scale: 5, visible: true },
          { id: 'o_spice', name: 'סבתא זעתר', kind: 'character', ref: 'spice', x: 480, y: 450, w: 80, h: 120, scale: 5, visible: true },
          { id: 'o_cheese', name: 'מוטי הגבינות', kind: 'character', ref: 'cheese', x: 760, y: 450, w: 80, h: 120, scale: 5, visible: true },
          { id: 'x_market_square', name: 'חזרה לכיכר', kind: 'exit', exitTo: 'square', x: 40, y: 500, w: 70, h: 200, visible: true },
          { id: 'x_market_garden', name: 'שער לגינה', kind: 'exit', exitTo: 'garden', x: 920, y: 500, w: 70, h: 200, visible: true },
        ],
      },
      garden: {
        id: 'garden', name: 'הגינה', background: { spriteId: 'bg_garden', color: '#94d82d' },
        walkArea: { x: 40, y: 410, w: 880, h: 110 }, night: true,
        objects: [
          { id: 'o_stick', name: 'מקל', kind: 'item', ref: 'stick', x: 220, y: 490, w: 80, h: 36, scale: 4, visible: true },
          { id: 'o_flowerbed', name: 'ערוגת פרחים', kind: 'hotspot', x: 700, y: 392, w: 220, h: 80, visible: true },
          { id: 'o_hive', name: 'כוורת', kind: 'prop', spriteId: 'spr_hive', x: 420, y: 430, w: 72, h: 96, scale: 4, visible: true },
          { id: 'o_bee', name: 'המלכה זומזומה', kind: 'character', ref: 'bee', x: 520, y: 330, w: 80, h: 80, scale: 5, visible: true },
          { id: 'o_bush', name: 'שיח', kind: 'prop', spriteId: 'spr_bush', description: 'שיח קוצני. אאוץ\'!', x: 840, y: 500, w: 96, h: 64, scale: 4, visible: true },
          { id: 'x_garden_market', name: 'חזרה לשוק', kind: 'exit', exitTo: 'market', x: 40, y: 500, w: 70, h: 200, visible: true },
        ],
      },
    },
    items: {
      key: { id: 'key', name: 'מפתח', description: 'מפתח זהב קטן.', spriteId: 'spr_key' },
      basket: { id: 'basket', name: 'סל', description: 'סל קש. טוב לסחוב דברים שבירים.', spriteId: 'spr_basket' },
      bucket: { id: 'bucket', name: 'דלי', description: 'דלי ריק.', spriteId: 'spr_bucket' },
      oilcan: { id: 'oilcan', name: 'פחית שמן', description: 'שמן למכונות שחורקות.', spriteId: 'spr_oilcan' },
      stick: { id: 'stick', name: 'מקל', description: 'מקל ארוך מהעץ.', spriteId: 'spr_stick' },
      gum: { id: 'gum', name: 'מסטיק', description: 'מסטיק ורוד ודביק.', spriteId: 'spr_gum' },
      sticky: { id: 'sticky', name: 'מקל דביק', description: 'מקל עם מסטיק בקצה. מושלם לדוג דברים.', spriteId: 'spr_sticky' },
      coin: { id: 'coin', name: 'מטבע', description: 'מטבע זהב נוצץ.', spriteId: 'spr_coin' },
      letter: { id: 'letter', name: 'מכתב', description: 'מכתב מרותי לאח שלה, מוטי.', spriteId: 'spr_letter' },
      flower: { id: 'flower', name: 'פרח', description: 'פרח אדום ויפה.', spriteId: 'spr_flower' },
      flour: { id: 'flour', name: 'קמח', description: 'שק קמח לבן.', spriteId: 'spr_flour' },
      eggs: { id: 'eggs', name: 'ביצים', description: 'שש ביצים טריות. זהירות!', spriteId: 'spr_eggs' },
      milk: { id: 'milk', name: 'חלב', description: 'בקבוק חלב טרי.', spriteId: 'spr_milk' },
      sugar: { id: 'sugar', name: 'סוכר', description: 'קוביות סוכר מתוקות.', spriteId: 'spr_sugar' },
      salt: { id: 'salt', name: 'מלח', description: 'צנצנת מלח.', spriteId: 'spr_salt' },
      yeast: { id: 'yeast', name: 'שמרים', description: 'שמרים טריים. בזכותם הבצק תופח.', spriteId: 'spr_yeast' },
      strawberries: { id: 'strawberries', name: 'תותים', description: 'תותים אדומים מהגינה. מהם האופה יבשל ריבה למילוי.', spriteId: 'spr_strawberries' },
      butter: { id: 'butter', name: 'חמאה', description: 'חמאה רכה וצהובה.', spriteId: 'spr_butter' },
      fryoil: { id: 'fryoil', name: 'שמן לטיגון', description: 'בקבוק שמן לטגן בו את הסופגניות. לא שמן של מכונות!', spriteId: 'spr_fryoil' },
    },
    flags: {
      met_baker: { name: 'דיברת עם האופה', initial: false },
      warehouse_open: { name: 'דלת המחסן נפתחה', initial: false },
      got_eggs: { name: 'קיבלת ביצים מהחוואית', initial: false },
      got_letter: { name: 'קיבלת מכתב מהחוואית', initial: false },
      got_gum: { name: 'קיבלת מסטיק', initial: false },
      got_coin: { name: 'דגת מטבע מהבאר', initial: false },
      mill_fixed: { name: 'הטחנה תוקנה', initial: false },
      got_yeast: { name: 'קיבלת שמרים מהטוחן', initial: false },
      got_strawberries: { name: 'שרת לדבורים', initial: false },
    },
    quests: {
      main: {
        id: 'main', name: 'סופגניות לחנוכה',
        steps: [
          { id: 'flour', text: 'קמח' }, { id: 'eggs', text: 'ביצים' }, { id: 'milk', text: 'חלב' },
          { id: 'sugar', text: 'סוכר' }, { id: 'salt', text: 'מלח' }, { id: 'yeast', text: 'שמרים' },
          { id: 'strawberries', text: 'תותים לריבה' }, { id: 'butter', text: 'חמאה' }, { id: 'fryoil', text: 'שמן לטיגון' },
          { id: 'bake', text: 'להביא הכל לאופה' },
        ],
      },
    },
    dialogues: {
      d_baker_intro: {
        id: 'd_baker_intro', name: 'האופה מבקש עזרה', start: 'n1',
        nodes: {
          n1: { id: 'n1', speaker: 'baker', text: 'סוף סוף הגעת! הערב מדליקים נר ראשון של חנוכה, וכל העיר מחכה לסופגניות שלנו.', next: 'n2' },
          n2: {
            id: 'n2', speaker: 'baker', text: 'אבל אוי ואבוי, נגמרו לנו כל המצרכים. צריך תשעה: קמח, ביצים, חלב, סוכר, מלח, שמרים, חמאה, תותים לריבה ושמן לטיגון!',
            choices: [
              { text: 'אני אמצא את כולם!', next: 'n3', actions: [{ type: 'setFlag', flagId: 'met_baker', value: true }] },
              { text: 'איפה אני מחפש?', next: 'n4' },
            ],
          },
          n3: { id: 'n3', speaker: 'baker', text: 'כל הכבוד! הרשימה למעלה תזכיר לך מה עוד חסר. ואל תשכח לבדוק בארון, אולי יש שם משהו שימושי.' },
          n4: { id: 'n4', speaker: 'baker', text: 'קמח במחסן בכיכר. ביצים וחלב בחווה. סוכר, מלח וחמאה בשוק. שמרים אצל הטוחן. תותים בגינה, אבל הדבורים שומרות עליהם. ושמן לטיגון... מישהו החביא אותו.', next: 'n2' },
        },
      },
      d_baker_hint: {
        id: 'd_baker_hint', name: 'האופה נותן רמז', start: 'n1',
        nodes: {
          n1: {
            id: 'n1', speaker: 'baker', text: 'עדיין חסרים לנו מצרכים. צריך עזרה?',
            choices: [
              { text: 'איפה אני מחפש?', next: 'n2' },
              { text: 'לא, אני מסתדר!', next: 'n3' },
            ],
          },
          n2: { id: 'n2', speaker: 'baker', text: 'קמח במחסן בכיכר. ביצים וחלב בחווה. סוכר, מלח וחמאה בשוק. שמרים אצל הטוחן. תותים בגינה, אבל הדבורים שומרות עליהם. ושמן לטיגון... מישהו החביא אותו.' },
          n3: { id: 'n3', speaker: 'baker', text: 'יופי! התנור מחכה.' },
        },
      },
      d_farmer: {
        id: 'd_farmer', name: 'החוואית והביצים', start: 'n1',
        nodes: {
          n1: { id: 'n1', speaker: 'farmer', text: 'שלום! אתה השוליה של זלמן?',
            choices: [{ text: 'כן! אני צריך ביצים לסופגניות.', next: 'n2' }, { text: 'סתם עובר פה.', next: 'n5' }] },
          n2: {
            id: 'n2', speaker: 'farmer', text: 'אני אתן לך ביצים. אבל במה תסחב אותן בלי לשבור?',
            choices: [
              { text: 'יש לי סל!', next: 'n3', when: [{ type: 'hasItem', itemId: 'basket' }],
                actions: [{ type: 'removeItem', itemId: 'basket' }, { type: 'setFlag', flagId: 'got_eggs', value: true }, ...got('eggs', 'eggs')] },
              { text: 'אין לי כלום...', next: 'n4' },
            ],
          },
          n3: { id: 'n3', speaker: 'farmer', text: 'הנה, שש ביצים טריות. ותגיד לזלמן שאני רוצה סופגנייה עם הרבה ריבה!' },
          n4: { id: 'n4', speaker: 'farmer', text: 'תחפש סל. אולי יש אחד במאפייה?' },
          n5: { id: 'n5', speaker: 'farmer', text: 'טוב, אז תעבור בזהירות. הפרה לא אוהבת הפתעות.' },
        },
      },
      d_farmer_letter: {
        id: 'd_farmer_letter', name: 'החוואית והמכתב', start: 'n1',
        nodes: {
          n1: { id: 'n1', speaker: 'farmer', text: 'רגע, לפני שאתה הולך! אתה עובר בשוק?',
            choices: [{ text: 'כן, אני צריך חמאה משם.', next: 'n2' }, { text: 'אולי. למה?', next: 'n2' }] },
          n2: { id: 'n2', speaker: 'farmer', text: 'אח שלי מוטי מוכר שם גבינות. הוא נורא חשדן ולא מוכר חמאה לזרים. תן לו את המכתב הזה, והוא יבין שאתה חבר.',
            actions: [{ type: 'addItem', itemId: 'letter' }, { type: 'setFlag', flagId: 'got_letter', value: true }] },
        },
      },
      d_miller_stuck: {
        id: 'd_miller_stuck', name: 'הטוחן והטחנה התקועה', start: 'n1',
        nodes: {
          n1: { id: 'n1', speaker: 'miller', text: 'אוף! הטחנה שלי תקועה מהבוקר. בלי רוח בכנפיים, אין לי איך לעבוד.',
            choices: [{ text: 'יש לך שמרים?', next: 'n2' }, { text: 'מה תקוע?', next: 'n3' }] },
          n2: { id: 'n2', speaker: 'miller', text: 'יש לי שמרים טריים! אבל קודם תעזור לי עם הטחנה, בסדר?' },
          n3: { id: 'n3', speaker: 'miller', text: 'גלגלי השיניים בצד חלודים. אם רק היה לי קצת שמן... אולי יש במחסן בכיכר?' },
        },
      },
      d_miller_yeast: {
        id: 'd_miller_yeast', name: 'הטוחן נותן שמרים', start: 'n1',
        nodes: {
          n1: { id: 'n1', speaker: 'miller', text: 'הטחנה עובדת! אתה גיבור אמיתי!', next: 'n2' },
          n2: { id: 'n2', speaker: 'miller', text: 'הנה השמרים שביקשת. בלעדיהם הסופגניות יהיו שטוחות כמו לביבות.',
            actions: [{ type: 'setFlag', flagId: 'got_yeast', value: true }, ...got('yeast', 'yeast')] },
        },
      },
      d_candy: {
        id: 'd_candy', name: 'דודו הממתקים', start: 'n1',
        nodes: {
          n1: { id: 'n1', speaker: 'candy', text: 'ממתקים! ממתקים צבעוניים! רוצה מסטיק? מתנה!',
            choices: [
              { text: 'כן, תודה!', next: 'n2', actions: [{ type: 'addItem', itemId: 'gum' }, { type: 'setFlag', flagId: 'got_gum', value: true }] },
              { text: 'אני צריך סוכר.', next: 'n3' },
            ] },
          n2: { id: 'n2', speaker: 'candy', text: 'רק אל תדביק אותו מתחת לשולחן!' },
          n3: { id: 'n3', speaker: 'candy', text: 'סוכר אני אתן לך בשמחה, אם תביא לי פרח לדוכן. בינתיים, קח מסטיק!',
            actions: [{ type: 'addItem', itemId: 'gum' }, { type: 'setFlag', flagId: 'got_gum', value: true }] },
        },
      },
      d_cheese_letter: {
        id: 'd_cheese_letter', name: 'מוטי קורא את המכתב', start: 'n1',
        nodes: {
          n1: { id: 'n1', speaker: 'cheese', text: 'מכתב מרותי? תן לראות... "מוטי, תן לשוליה חמאה, ותבוא לבקר!"', next: 'n2' },
          n2: { id: 'n2', speaker: 'cheese', text: 'נו, חבר של רותי הוא חבר שלי. הנה, החמאה הכי טובה בעיר.', actions: got('butter', 'butter') },
        },
      },
      d_bees: {
        id: 'd_bees', name: 'שיר לדבורים', start: 'n1',
        nodes: {
          n1: { id: 'n1', speaker: 'bee', text: 'בזזז! מי מעז להפריע למלכה? אתה רוצה תותים מהערוגה שלנו? קודם תשיר לנו שיר. אבל רק שיר שמתאים לדבורים!',
            choices: [
              { text: 'לה-לה-לה, אני אוהב סופגניות!', next: 'n2' },
              { text: 'זום-זום-זום, פרח בכל יום!', next: 'n3' },
              { text: 'מו-מו-מו, הפרה פה למטה!', next: 'n2' },
              { text: 'אחזור אחר כך.', next: 'n4' },
            ] },
          n2: { id: 'n2', speaker: 'bee', text: 'בזזזז! זה לא שיר של דבורים! נסה שוב.', next: 'n1' },
          n3: { id: 'n3', speaker: 'bee', text: 'אוהההה... זה השיר האהוב עלינו! קטפנו לך סל תותים, זמר קטן.',
            actions: [{ type: 'setFlag', flagId: 'got_strawberries', value: true }, { type: 'playSound', soundId: 'snd_win' }, ...got('strawberries', 'strawberries')] },
          n4: { id: 'n4', speaker: 'bee', text: 'בזזז. אנחנו כאן.' },
        },
      },
      d_baker_end: {
        id: 'd_baker_end', name: 'הסוף', start: 'n1',
        nodes: {
          n1: { id: 'n1', speaker: 'baker', text: 'קמח! ביצים! חלב! סוכר! מלח! שמרים! חמאה! תותים! ושמן לטיגון! הבאת את כל התשעה!', next: 'n2' },
          n2: {
            id: 'n2', speaker: 'baker', text: 'בוא נלוש, נטגן ונמלא בריבה. סופגניות לכולם!',
            actions: [
              ...INGREDIENTS.map((itemId) => ({ type: 'removeItem', itemId }) as Action),
              { type: 'completeStep', questId: 'main', stepId: 'bake' },
              { type: 'playSound', soundId: 'snd_win' },
              { type: 'win', text: 'חנוכה שמח! הסופגניות מוכנות, ומוטי, רותי, סבתא זעתר, דודו, הטוחן ואפילו המלכה זומזומה באו לטעום.' },
            ],
          },
        },
      },
    },
    rules,
    sprites: makeStarterSprites(),
    animations: {
      anim_app_idle: { id: 'anim_app_idle', name: 'שוליה עומד', mode: 'loop', frames: [{ spriteId: 'spr_apprentice', ms: 1000 }] },
      anim_app_walk: { id: 'anim_app_walk', name: 'שוליה הולך', mode: 'loop', frames: [{ spriteId: 'spr_apprentice', ms: 160 }, { spriteId: 'spr_apprentice_step', ms: 160 }] },
      anim_app_cheer: { id: 'anim_app_cheer', name: 'שוליה חוגג', mode: 'loop', frames: [{ spriteId: 'spr_apprentice', ms: 220 }, { spriteId: 'spr_apprentice_cheer', ms: 220 }] },
      anim_baker_idle: { id: 'anim_baker_idle', name: 'אופה עומד', mode: 'loop', frames: [{ spriteId: 'spr_baker', ms: 2200 }, { spriteId: 'spr_baker_blink', ms: 160 }] },
      anim_baker_talk: { id: 'anim_baker_talk', name: 'אופה מדבר', mode: 'loop', frames: [{ spriteId: 'spr_baker', ms: 140 }, { spriteId: 'spr_baker_talk', ms: 140 }] },
      anim_farmer_idle: { id: 'anim_farmer_idle', name: 'חוואית עומדת', mode: 'loop', frames: [{ spriteId: 'spr_farmer', ms: 1000 }] },
      anim_farmer_talk: { id: 'anim_farmer_talk', name: 'חוואית מדברת', mode: 'loop', frames: [{ spriteId: 'spr_farmer', ms: 150 }, { spriteId: 'spr_farmer_talk', ms: 150 }] },
      anim_miller_talk: { id: 'anim_miller_talk', name: 'טוחן מדבר', mode: 'loop', frames: [{ spriteId: 'spr_miller', ms: 150 }, { spriteId: 'spr_miller_talk', ms: 150 }] },
      anim_candy_talk: { id: 'anim_candy_talk', name: 'דודו מדבר', mode: 'loop', frames: [{ spriteId: 'spr_candy', ms: 130 }, { spriteId: 'spr_candy_talk', ms: 130 }] },
      anim_spice_talk: { id: 'anim_spice_talk', name: 'סבתא מדברת', mode: 'loop', frames: [{ spriteId: 'spr_spice', ms: 170 }, { spriteId: 'spr_spice_talk', ms: 170 }] },
      anim_cheese_talk: { id: 'anim_cheese_talk', name: 'מוטי מדבר', mode: 'loop', frames: [{ spriteId: 'spr_cheese', ms: 150 }, { spriteId: 'spr_cheese_talk', ms: 150 }] },
      anim_bee: { id: 'anim_bee', name: 'מלכה מעופפת', mode: 'loop', frames: [{ spriteId: 'spr_bee', ms: 90 }, { spriteId: 'spr_bee_down', ms: 90 }] },
      anim_sails: { id: 'anim_sails', name: 'כנפיים מסתובבות', mode: 'loop', frames: [{ spriteId: 'spr_sails', ms: 180 }, { spriteId: 'spr_sails_diag', ms: 180 }] },
      anim_cow_idle: { id: 'anim_cow_idle', name: 'פרה', mode: 'loop', frames: [{ spriteId: 'spr_cow', ms: 1000 }] },
      anim_cow_moo: { id: 'anim_cow_moo', name: 'פרה גועה', mode: 'once', frames: [{ spriteId: 'spr_cow', ms: 120 }, { spriteId: 'spr_cow_moo', ms: 700 }, { spriteId: 'spr_cow', ms: 120 }] },
    },
    sounds: {
      snd_pickup: { name: 'איסוף', dataUrl: 'synth:pickup' },
      snd_door: { name: 'דלת', dataUrl: 'synth:door' },
      snd_moo: { name: 'מו', dataUrl: 'synth:moo' },
      snd_win: { name: 'ניצחון', dataUrl: 'synth:win' },
      snd_whirr: { name: 'טחנה', dataUrl: 'synth:whirr' },
      snd_buzz: { name: 'זמזום', dataUrl: 'synth:buzz' },
      snd_boing: { name: 'בוינג', dataUrl: 'synth:boing' },
    },
  };
}
