// Starter pixel art for שוליית האופה. Every sprite becomes an ordinary PNG in the
// project, so the Pixel Art Studio (Phase 3) can replace any of them.
import type { Sprite } from './types';

type Ctx = CanvasRenderingContext2D;

function canvas(w: number, h: number): [HTMLCanvasElement, Ctx] {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  const ctx = c.getContext('2d')!;
  ctx.imageSmoothingEnabled = false;
  return [c, ctx];
}

const PAL: Record<string, string> = {
  K: '#2b1d1a', W: '#fbf8f2', S: '#f2c29b', E: '#2b1d1a', M: '#c0504d', H: '#6b3e26',
  B: '#3f7bd6', A: '#efe6d6', P: '#4a3a5a', O: '#3a2a22', G: '#8c6a52', Y: '#e0b84a',
  N: '#4f8a3c', U: '#3a5f8f', R: '#d9534f', L: '#ffffff', D: '#a37a4c', C: '#e8d4b0',
};

function fromRows(rows: string[], extra: Record<string, string> = {}): { w: number; h: number; url: string } {
  const pal = { ...PAL, ...extra };
  const h = rows.length, w = rows[0].length;
  const [c, ctx] = canvas(w, h);
  rows.forEach((row, y) => [...row].forEach((ch, x) => {
    if (ch === '.') return;
    ctx.fillStyle = pal[ch] ?? '#ff00ff';
    ctx.fillRect(x, y, 1, 1);
  }));
  return { w, h, url: c.toDataURL() };
}

function fromDraw(w: number, h: number, draw: (ctx: Ctx) => void) {
  const [c, ctx] = canvas(w, h);
  draw(ctx);
  return { w, h, url: c.toDataURL() };
}

/** backgrounds are drawn by day; a scene can be shown at night (Scene.night) */
const fromDrawNight = fromDraw;

const rect = (ctx: Ctx, col: string, x: number, y: number, w: number, h: number) => {
  ctx.fillStyle = col; ctx.fillRect(x, y, w, h);
};

const swap = (rows: string[], from: number, repl: string[]) =>
  rows.map((r, i) => (i >= from && i < from + repl.length ? repl[i - from] : r));

// ── Characters (16×24) ─────────────────────────────────────────────
const apprentice = [
  '......WWWW......',
  '.....WWWWWW.....',
  '....WWWWWWWW....',
  '....WWWWWWWW....',
  '.....KKKKKK.....',
  '....KHSSSSHK....',
  '....KSESSESK....',
  '....KSSSSSSK....',
  '....KSSMMSSK....',
  '.....KSSSSK.....',
  '....BBBBBBBB....',
  '...BBAAAAAABB...',
  '..SBBAAAAAABBS..',
  '..SBBAAAAAABBS..',
  '...BBAAAAAABB...',
  '....BAAAAAAB....',
  '....PPPPPPPP....',
  '....PPP..PPP....',
  '....PPP..PPP....',
  '....PPP..PPP....',
  '....PP....PP....',
  '...OOO....OOO...',
  '...OOO....OOO...',
  '................',
];
const apprenticeStep = swap(apprentice, 17, [
  '...PPP....PPP...',
  '..PPP......PPP..',
  '..PP........PP..',
  '..PP........PP..',
  '.OOO........OOO.',
  '.OOO........OOO.',
]);
const apprenticeCheer = swap(apprentice, 8, ['....KSMMMMSK....', '.....KSSSSK.....', 'S...BBBBBBBB...S', 'SS.BBAAAAAABB.SS', '.SBBBAAAAAABBBS.', '..BBBAAAAAABBB..']);

const baker = [
  '.....WWWWWW.....',
  '....WWWWWWWW....',
  '...WWWWWWWWWW...',
  '...WWWWWWWWWW...',
  '....KKKKKKKK....',
  '....KSSSSSSK....',
  '....KSESSESK....',
  '....KSSRRSSK....',
  '....KGGGGGGK....',
  '.....KSSSSK.....',
  '...WWWWWWWWWW...',
  '..WWWWWWWWWWWW..',
  '.SWWWWWWWWWWWWS.',
  '.SWWWWWWWWWWWWS.',
  '..WWWWWWWWWWWW..',
  '..WWWWWWWWWWWW..',
  '...PPPPPPPPPP...',
  '...PPPP..PPPP...',
  '...PPPP..PPPP...',
  '...PPP....PPP...',
  '...PPP....PPP...',
  '..OOOO....OOOO..',
  '..OOOO....OOOO..',
  '................',
];
const bakerBlink = swap(baker, 6, ['....KSSSSSSK....']);
const bakerTalk = swap(baker, 8, ['....KGGMMGGK....']);

const farmer = [
  '................',
  '................',
  '.....YYYYYY.....',
  '....YYYYYYYY....',
  '..YYYYYYYYYYYY..',
  '....KSSSSSSK....',
  '....KSESSESK....',
  '....KSSSSSSK....',
  '....KSSMMSSK....',
  '.....KSSSSK.....',
  '....NNNNNNNN....',
  '...NNUNNNNUNN...',
  '..SNNUUUUUUNNS..',
  '..SNNUUUUUUNNS..',
  '...NNUUUUUUNN...',
  '....UUUUUUUU....',
  '....UUUUUUUU....',
  '....UUU..UUU....',
  '....UUU..UUU....',
  '....UUU..UUU....',
  '....UU....UU....',
  '...OOO....OOO...',
  '...OOO....OOO...',
  '................',
];
const farmerTalk = swap(farmer, 8, ['....KSMMMMSK....']);

// ── Props and items ────────────────────────────────────────────────
const cow = (moo: boolean) => fromDraw(28, 20, (c) => {
  rect(c, '#f7f3ea', 6, 5, 18, 9);            // body
  rect(c, '#2b1d1a', 9, 6, 4, 3); rect(c, '#2b1d1a', 17, 9, 5, 3); // spots
  rect(c, '#f7f3ea', 0, 3, 7, 7);             // head
  rect(c, '#e9a3a3', 0, moo ? 7 : 8, 4, moo ? 4 : 2); // snout / open mouth
  rect(c, '#2b1d1a', 2, 4, 1, 1);             // eye
  rect(c, '#c9b48a', 1, 1, 1, 2); rect(c, '#c9b48a', 5, 1, 1, 2); // horns
  rect(c, '#f7f3ea', 7, 14, 2, 5); rect(c, '#f7f3ea', 11, 14, 2, 5);
  rect(c, '#f7f3ea', 18, 14, 2, 5); rect(c, '#f7f3ea', 21, 14, 2, 5);
  rect(c, '#2b1d1a', 7, 18, 2, 1); rect(c, '#2b1d1a', 11, 18, 2, 1);
  rect(c, '#2b1d1a', 18, 18, 2, 1); rect(c, '#2b1d1a', 21, 18, 2, 1);
  rect(c, '#e9a3a3', 14, 14, 3, 2);           // udder
  rect(c, '#2b1d1a', 24, moo ? 2 : 6, 1, 5); rect(c, '#2b1d1a', 24, moo ? 1 : 10, 2, 2); // tail
});

const oven = fromDraw(28, 28, (c) => {
  rect(c, '#9a4e33', 2, 6, 24, 22); rect(c, '#b8603f', 4, 4, 20, 4); rect(c, '#b8603f', 8, 1, 12, 4);
  for (let y = 9; y < 28; y += 4) for (let x = (y / 4) % 2 ? 2 : 4; x < 26; x += 6) rect(c, '#7d3c27', x, y, 4, 1);
  rect(c, '#2b1d1a', 8, 14, 12, 9); rect(c, '#f59f2a', 9, 18, 10, 5); rect(c, '#ffd166', 11, 19, 6, 3); rect(c, '#e8590c', 9, 21, 10, 2);
});

const flowerpot = fromDraw(14, 18, (c) => {
  rect(c, '#4f8a3c', 6, 2, 2, 8); rect(c, '#4f8a3c', 3, 5, 3, 2); rect(c, '#4f8a3c', 8, 4, 3, 2);
  rect(c, '#e64980', 5, 0, 4, 3); rect(c, '#ffd43b', 6, 1, 2, 1);
  rect(c, '#c8643b', 2, 10, 10, 2); rect(c, '#b05530', 3, 12, 8, 6);
});

const key = fromDraw(14, 8, (c) => {
  rect(c, '#f2c94c', 0, 1, 5, 5); rect(c, '#2b1d1a', 1, 2, 3, 3); rect(c, '#f2c94c', 2, 3, 1, 1);
  rect(c, '#f2c94c', 5, 3, 9, 2); rect(c, '#f2c94c', 10, 5, 1, 2); rect(c, '#f2c94c', 12, 5, 1, 3);
});

const flour = fromDraw(14, 16, (c) => {
  rect(c, '#e9dcc0', 2, 3, 10, 13); rect(c, '#d8c7a3', 2, 13, 10, 3); rect(c, '#c9b48a', 4, 0, 6, 4);
  rect(c, '#8c6a52', 3, 3, 8, 1); rect(c, '#3f7bd6', 5, 8, 4, 3);
});

const bucket = fromDraw(14, 14, (c) => {
  rect(c, '#8a9aa8', 2, 4, 10, 10); rect(c, '#a9b8c4', 3, 5, 3, 8); rect(c, '#5d6d7a', 1, 4, 12, 1);
  rect(c, '#5d6d7a', 1, 0, 1, 4); rect(c, '#5d6d7a', 12, 0, 1, 4); rect(c, '#5d6d7a', 1, 0, 12, 1);
});

const eggs = fromDraw(16, 12, (c) => {
  rect(c, '#c48b4a', 0, 6, 16, 6); rect(c, '#a36d33', 1, 8, 14, 1);
  for (const x of [1, 6, 11]) { rect(c, '#fff8ec', x, 2, 4, 5); rect(c, '#fff8ec', x + 1, 1, 2, 1); }
});

const milk = fromDraw(10, 16, (c) => {
  rect(c, '#ffffff', 2, 4, 6, 12); rect(c, '#ffffff', 3, 2, 4, 2); rect(c, '#3f7bd6', 3, 0, 4, 2);
  rect(c, '#3f7bd6', 2, 8, 6, 3); rect(c, '#e3e8ef', 6, 5, 1, 10);
});

const basket = fromDraw(16, 12, (c) => {
  rect(c, '#a37a4c', 1, 5, 14, 7); rect(c, '#8a6238', 1, 7, 14, 1); rect(c, '#8a6238', 1, 10, 14, 1);
  rect(c, '#8a6238', 2, 0, 1, 5); rect(c, '#8a6238', 13, 0, 1, 5); rect(c, '#8a6238', 2, 0, 12, 1);
});

const bread = fromDraw(18, 12, (c) => {
  rect(c, '#c97b2c', 1, 3, 16, 8); rect(c, '#c97b2c', 3, 1, 12, 2); rect(c, '#e8a54a', 3, 3, 12, 5);
  for (const x of [5, 9, 13]) rect(c, '#f5d08a', x, 2, 1, 5);
});

// ── Backgrounds (240×135; shown ×4 on the 960×540 stage) ────────────
const bgBakery = fromDrawNight(240, 135, (c) => {
  rect(c, '#f1d6a8', 0, 0, 240, 95);                    // wall
  for (let y = 8; y < 95; y += 10) rect(c, '#e8c994', 0, y, 240, 1);
  rect(c, '#9c6b3f', 0, 95, 240, 40);                   // floor
  for (let x = 0; x < 240; x += 16) rect(c, '#875a33', x, 95, 1, 40);
  rect(c, '#7a4e2c', 0, 93, 240, 3);
  rect(c, '#6b3e26', 4, 40, 26, 55); rect(c, '#8a5a35', 6, 42, 22, 53); rect(c, '#f2c94c', 24, 68, 2, 3); // door (exit)
  rect(c, '#6b3e26', 92, 18, 40, 30); rect(c, '#a8d8f0', 95, 21, 34, 24); rect(c, '#6b3e26', 111, 21, 2, 24); rect(c, '#6b3e26', 95, 32, 34, 2); // window
  rect(c, '#7a4e2c', 50, 52, 36, 3);                     // shelf with loaves
  for (const x of [52, 61, 70, 79]) { rect(c, '#b5651d', x, 47, 7, 5); rect(c, '#b5651d', x + 1, 46, 5, 1); rect(c, '#f8f9fa', x + 1, 46, 5, 2); rect(c, '#c92a2a', x + 3, 46, 1, 1); }
  // hanukkiah on the window sill
  rect(c, '#e0b84a', 99, 48, 27, 2); rect(c, '#c99a2e', 111, 50, 3, 4); rect(c, '#c99a2e', 107, 53, 11, 2);
  for (let i = 0; i < 9; i++) {
    const x = 100 + i * 3, tall = i === 4;
    rect(c, '#e0b84a', x, tall ? 41 : 44, 1, tall ? 7 : 4);
    if (i === 4 || i === 8) { rect(c, '#ffd43b', x, tall ? 39 : 42, 1, 2); rect(c, '#ff922b', x, tall ? 40 : 43, 1, 1); }
  }
  rect(c, '#7a4e2c', 168, 44, 38, 50); rect(c, '#8f5f38', 170, 46, 16, 46); rect(c, '#8f5f38', 188, 46, 16, 46); // cupboard
  rect(c, '#f2c94c', 184, 66, 2, 4); rect(c, '#f2c94c', 189, 66, 2, 4);
  rect(c, '#c8a26f', 100, 70, 50, 4); rect(c, '#7a4e2c', 104, 74, 3, 21); rect(c, '#7a4e2c', 143, 74, 3, 21); // table
  rect(c, '#efe6d6', 112, 66, 14, 4);
});

const bgSquare = fromDrawNight(240, 135, (c) => {
  rect(c, '#a5d8ff', 0, 0, 240, 70); rect(c, '#ffffff', 30, 12, 24, 5); rect(c, '#ffffff', 36, 9, 12, 3); rect(c, '#ffffff', 160, 18, 30, 5);
  rect(c, '#e8b4a0', 170, 30, 70, 62); rect(c, '#b05530', 165, 24, 80, 8); rect(c, '#fff3bf', 180, 44, 14, 12); rect(c, '#6b3e26', 224, 58, 14, 34); // bakery house (right)
  rect(c, '#8c7a6b', 70, 34, 70, 58); rect(c, '#5c4d42', 66, 28, 78, 8);                      // warehouse
  rect(c, '#5c3b22', 92, 56, 26, 36); rect(c, '#7a5232', 94, 58, 22, 34); rect(c, '#2b1d1a', 94, 74, 22, 2); rect(c, '#f2c94c', 112, 72, 3, 5); // warehouse door
  rect(c, '#2b1d1a', 74, 40, 62, 8); rect(c, '#f1d6a8', 76, 41, 58, 6);                       // sign board
  rect(c, '#9fb7a0', 0, 40, 60, 52); rect(c, '#6f8f71', 0, 34, 64, 7);                        // left house
  rect(c, '#c7b9a8', 0, 92, 240, 43);                                                           // cobbles
  for (let y = 95; y < 135; y += 6) for (let x = (y % 12 ? 0 : 6); x < 240; x += 12) rect(c, '#b3a491', x, y, 10, 1);
});

const bgFarm = fromDrawNight(240, 135, (c) => {
  rect(c, '#bde3ff', 0, 0, 240, 72); rect(c, '#ffe066', 200, 10, 14, 14);
  rect(c, '#94c973', 0, 60, 240, 20); rect(c, '#7cb85a', 0, 80, 240, 55);
  for (let x = 0; x < 240; x += 14) rect(c, '#6aa64a', x + 4, 90 + ((x * 7) % 30), 2, 3);
  rect(c, '#c0392b', 20, 30, 64, 50); rect(c, '#8e2a20', 14, 24, 76, 8); rect(c, '#f7f3ea', 40, 50, 24, 30); rect(c, '#c0392b', 51, 50, 2, 30); // barn
  for (let x = 100; x < 240; x += 12) rect(c, '#d9c3a0', x, 70, 3, 16);
  rect(c, '#d9c3a0', 100, 74, 140, 2); rect(c, '#d9c3a0', 100, 80, 140, 2);                // fence
});

const bgWarehouse = fromDrawNight(240, 135, (c) => {
  rect(c, '#5a4636', 0, 0, 240, 95);
  for (let x = 0; x < 240; x += 20) rect(c, '#4c3b2e', x, 0, 2, 95);
  rect(c, '#3d2f25', 0, 95, 240, 40);
  rect(c, '#2b1d1a', 210, 40, 26, 55); rect(c, '#c9e2f2', 214, 44, 18, 47);        // open door (exit, right)
  rect(c, '#7a5a3c', 20, 70, 30, 25); rect(c, '#5c4029', 20, 70, 30, 2); rect(c, '#5c4029', 34, 70, 2, 25); // crates
  rect(c, '#7a5a3c', 26, 50, 20, 20); rect(c, '#5c4029', 26, 50, 20, 2);
  rect(c, '#6b4e33', 70, 30, 70, 3); rect(c, '#6b4e33', 70, 55, 70, 3);              // shelves
  for (const x of [74, 90, 110, 126]) rect(c, '#8c7a6b', x, 22, 10, 8);
  rect(c, '#fff3bf', 150, 0, 2, 20); rect(c, '#ffd43b', 146, 20, 10, 6);            // lamp
});


// ── Second act: market, mill, garden ───────────────────────────────
const talk8 = (rows: string[], row: string) => swap(rows, 8, [row]);
const MOUTH = '....KSMMMMSK....';
const millerPal = { W: '#e9e4d8', B: '#7d7468', A: '#f3efe6', P: '#4a4038', H: '#9a9a9a' };
const candyPal = { Y: '#f783ac', N: '#e64980', U: '#5f3dc4' };
const spicePal = { Y: '#e8590c', N: '#d9480f', U: '#5c940d', S: '#c98f6b' };
const cheesePal = { W: '#ffe8a3', G: '#5c3b22', P: '#495057' };

const bee = (up: boolean) => fromDraw(16, 16, (c) => {
  rect(c, '#d0ebff', up ? 4 : 3, up ? 1 : 4, 4, 4); rect(c, '#d0ebff', up ? 8 : 9, up ? 1 : 4, 4, 4);
  rect(c, '#ffd43b', 3, 6, 10, 7); rect(c, '#2b1d1a', 5, 6, 2, 7); rect(c, '#2b1d1a', 9, 6, 2, 7);
  rect(c, '#2b1d1a', 12, 6, 4, 6); rect(c, '#ffffff', 14, 7, 1, 2);
  rect(c, '#f2c94c', 12, 3, 4, 2); rect(c, '#f2c94c', 12, 2, 1, 1); rect(c, '#f2c94c', 14, 2, 1, 1);
  rect(c, '#2b1d1a', 1, 9, 2, 1);
});
const hive = fromDraw(18, 24, (c) => {
  rect(c, '#6b3e26', 8, 14, 2, 10);
  rect(c, '#e0a93b', 4, 0, 10, 3); rect(c, '#f2c14e', 2, 3, 14, 3); rect(c, '#e0a93b', 1, 6, 16, 3); rect(c, '#f2c14e', 2, 9, 14, 3);
  rect(c, '#2b1d1a', 7, 8, 4, 3);
});
const bush = fromDraw(24, 16, (c) => {
  rect(c, '#2f9e44', 2, 6, 20, 10); rect(c, '#37b24d', 4, 2, 8, 8); rect(c, '#37b24d', 12, 1, 9, 9); rect(c, '#51cf66', 6, 4, 4, 3); rect(c, '#51cf66', 15, 3, 4, 3);
});
const well = fromDraw(24, 26, (c) => {
  rect(c, '#6b3e26', 3, 2, 2, 14); rect(c, '#6b3e26', 19, 2, 2, 14); rect(c, '#9c3d2a', 1, 0, 22, 3);
  rect(c, '#6b3e26', 5, 6, 14, 1); rect(c, '#8a9aa8', 11, 7, 2, 5);
  rect(c, '#adb5bd', 1, 14, 22, 12); for (let x = 1; x < 23; x += 5) rect(c, '#868e96', x, 14, 1, 12);
  rect(c, '#868e96', 1, 19, 22, 1); rect(c, '#495057', 3, 14, 18, 2);
});
const sails = (diag: boolean) => fromDraw(33, 33, (c) => {
  const blade = '#f8f0e3', frame = '#6b3e26';
  if (!diag) {
    rect(c, frame, 16, 0, 1, 33); rect(c, frame, 0, 16, 33, 1);
    rect(c, blade, 17, 1, 5, 14); rect(c, blade, 11, 18, 5, 14); rect(c, blade, 1, 11, 14, 5); rect(c, blade, 18, 17, 14, 5);
  } else {
    for (let i = 0; i < 33; i++) { rect(c, frame, i, i, 1, 1); rect(c, frame, 32 - i, i, 1, 1); }
    for (let i = 2; i < 14; i++) { rect(c, blade, i + 2, i - 2, 3, 1); rect(c, blade, 30 - i - 2, i - 2, 3, 1); rect(c, blade, i - 2, 32 - i - 2, 3, 1); rect(c, blade, 32 - i, 32 - i + 2, 3, 1); }
  }
  rect(c, '#2b1d1a', 15, 15, 3, 3);
});

const oilcan = fromDraw(16, 14, (c) => {
  rect(c, '#c92a2a', 2, 5, 9, 9); rect(c, '#e03131', 3, 6, 3, 7); rect(c, '#868e96', 10, 6, 5, 2); rect(c, '#868e96', 14, 4, 2, 2);
  rect(c, '#495057', 4, 3, 5, 2); rect(c, '#495057', 0, 7, 2, 4);
});
const stick = fromDraw(18, 6, (c) => { rect(c, '#8a5a35', 0, 2, 18, 2); rect(c, '#6b3e26', 0, 3, 18, 1); rect(c, '#8a5a35', 12, 0, 1, 2); rect(c, '#4f8a3c', 12, 0, 3, 1); });
const gum = fromDraw(12, 8, (c) => { rect(c, '#f783ac', 1, 1, 10, 6); rect(c, '#ffc9de', 2, 2, 4, 2); rect(c, '#e64980', 1, 6, 10, 1); });
const sticky = fromDraw(18, 8, (c) => { rect(c, '#8a5a35', 0, 4, 14, 2); rect(c, '#6b3e26', 0, 5, 14, 1); rect(c, '#f783ac', 13, 2, 5, 6); rect(c, '#ffc9de', 14, 3, 2, 2); });
const coin = fromDraw(12, 12, (c) => { rect(c, '#f59f00', 2, 0, 8, 12); rect(c, '#f59f00', 0, 2, 12, 8); rect(c, '#ffd43b', 2, 2, 8, 8); rect(c, '#f59f00', 5, 3, 2, 6); });
const letter = fromDraw(16, 11, (c) => {
  rect(c, '#fff8ec', 0, 0, 16, 11); rect(c, '#d8c7a3', 0, 0, 16, 1); rect(c, '#d8c7a3', 0, 10, 16, 1);
  for (let i = 0; i < 8; i++) { rect(c, '#d8c7a3', i, i * 0.6 | 0, 1, 1); rect(c, '#d8c7a3', 15 - i, i * 0.6 | 0, 1, 1); }
  rect(c, '#c92a2a', 6, 4, 4, 3);
});
const flower = fromDraw(12, 18, (c) => {
  rect(c, '#2f9e44', 5, 6, 2, 12); rect(c, '#37b24d', 2, 11, 3, 2); rect(c, '#37b24d', 7, 9, 3, 2);
  rect(c, '#f03e3e', 2, 1, 8, 6); rect(c, '#f03e3e', 4, 0, 4, 8); rect(c, '#ffd43b', 5, 3, 2, 2);
});
const sugar = fromDraw(14, 12, (c) => {
  for (const [x, y] of [[0, 6], [5, 6], [10, 6], [2, 1], [7, 1]]) { rect(c, '#ffffff', x, y, 4, 4); rect(c, '#dee2e6', x, y + 3, 4, 1); rect(c, '#dee2e6', x + 3, y, 1, 4); }
});
const salt = fromDraw(10, 16, (c) => {
  rect(c, '#e9ecef', 1, 4, 8, 12); rect(c, '#ffffff', 2, 5, 3, 10); rect(c, '#868e96', 1, 1, 8, 3); rect(c, '#495057', 3, 2, 1, 1); rect(c, '#495057', 6, 2, 1, 1);
  rect(c, '#1c7ed6', 1, 9, 8, 3);
});
const yeast = fromDraw(14, 10, (c) => { rect(c, '#e9d8a6', 1, 2, 12, 8); rect(c, '#d4b483', 1, 8, 12, 2); rect(c, '#d4b483', 3, 4, 2, 2); rect(c, '#d4b483', 8, 5, 2, 2); rect(c, '#2b8a3e', 1, 0, 12, 2); });
const butter = fromDraw(16, 10, (c) => { rect(c, '#f1f3f5', 0, 6, 16, 4); rect(c, '#ffe066', 2, 1, 12, 6); rect(c, '#fff3bf', 3, 2, 6, 2); rect(c, '#fcc419', 2, 6, 12, 1); });
const strawberries = fromDraw(14, 12, (c) => {
  for (const [x, y] of [[1, 4], [7, 3], [4, 7]]) {
    rect(c, '#e03131', x, y + 1, 6, 4); rect(c, '#e03131', x + 1, y + 5, 4, 1); rect(c, '#e03131', x + 2, y + 6, 2, 1);
    rect(c, '#2f9e44', x + 1, y, 4, 1); rect(c, '#2f9e44', x + 2, y - 1, 2, 1);
    rect(c, '#ffe066', x + 1, y + 2, 1, 1); rect(c, '#ffe066', x + 4, y + 3, 1, 1);
  }
});
const fryoil = fromDraw(10, 18, (c) => {
  rect(c, '#c92a2a', 3, 0, 4, 2); rect(c, '#f1f3f5', 3, 2, 4, 3);
  rect(c, '#f1f3f5', 1, 5, 8, 13); rect(c, '#fcc419', 2, 7, 6, 10); rect(c, '#ffe066', 2, 7, 2, 10);
  rect(c, '#2b8a3e', 2, 10, 6, 3);
});
const sufganiya = fromDraw(18, 14, (c) => {
  rect(c, '#b5651d', 2, 4, 14, 9); rect(c, '#b5651d', 4, 2, 10, 12); rect(c, '#d9822b', 4, 4, 10, 4);
  rect(c, '#f8f9fa', 4, 2, 10, 3); rect(c, '#f8f9fa', 3, 4, 3, 1); rect(c, '#f8f9fa', 12, 4, 3, 1); rect(c, '#e9ecef', 6, 1, 6, 1);
  rect(c, '#c92a2a', 7, 3, 4, 3); rect(c, '#f03e3e', 8, 3, 2, 1);
  rect(c, '#8a4b14', 3, 12, 12, 2);
});

const bgMarket = fromDrawNight(240, 135, (c) => {
  rect(c, '#ffd8a8', 0, 0, 240, 92); rect(c, '#ffc078', 0, 0, 240, 30);
  rect(c, '#e8b4a0', 0, 22, 70, 50); rect(c, '#b0c4de', 70, 16, 90, 56); rect(c, '#c3aed6', 160, 26, 80, 46);
  for (const x of [12, 40, 90, 120, 180, 210]) rect(c, '#fff3bf', x, 34, 10, 10);
  rect(c, '#d6b48c', 0, 92, 240, 43); for (let y = 96; y < 135; y += 7) for (let x = (y % 14 ? 0 : 7); x < 240; x += 14) rect(c, '#c4a27a', x, y, 12, 1);
  const stall = (x: number, a: string, goods: (x: number) => void) => {
    rect(c, '#6b3e26', x + 2, 50, 2, 42); rect(c, '#6b3e26', x + 56, 50, 2, 42);
    for (let i = 0; i < 60; i += 10) { rect(c, a, x + i, 44, 5, 10); rect(c, '#ffffff', x + i + 5, 44, 5, 10); }
    rect(c, a, x - 2, 42, 64, 3);
    rect(c, '#a0703f', x, 74, 60, 18); rect(c, '#8a5a35', x, 74, 60, 3);
    goods(x);
  };
  stall(20, '#e64980', (x) => { for (let i = 0; i < 9; i++) rect(c, ['#f03e3e', '#fab005', '#7950f2', '#40c057'][i % 4], x + 6 + i * 6, 69, 4, 4); });
  stall(90, '#e8590c', (x) => { for (let i = 0; i < 6; i++) { rect(c, '#f1f3f5', x + 5 + i * 9, 64, 6, 10); rect(c, ['#e8590c', '#fab005', '#2b8a3e', '#c92a2a'][i % 4], x + 6 + i * 9, 67, 4, 6); } });
  stall(160, '#fab005', (x) => { for (let i = 0; i < 4; i++) { rect(c, '#ffd43b', x + 5 + i * 13, 64, 11, 10); rect(c, '#fcc419', x + 5 + i * 13, 64, 11, 2); } });
});

const bgMill = fromDrawNight(240, 135, (c) => {
  rect(c, '#a5d8ff', 0, 0, 240, 135); rect(c, '#ffffff', 170, 14, 30, 5); rect(c, '#ffffff', 176, 10, 16, 4); rect(c, '#ffffff', 20, 24, 24, 4);
  rect(c, '#8ce99a', 0, 70, 240, 65); rect(c, '#69db7c', 0, 92, 240, 43);
  for (let i = 0; i < 40; i++) rect(c, '#69db7c', 0, 70 + i, 240 - i * 2 > 0 ? 60 - i : 0, 1);
  rect(c, '#e9d8a6', 90, 92, 70, 43); // path
  for (let y = 20; y < 95; y++) { const half = 14 + (y - 20) * 0.18; rect(c, '#ced4da', 135 - half, y, half * 2, 1); }
  for (let y = 26; y < 95; y += 8) rect(c, '#adb5bd', 122, y, 26, 1);
  rect(c, '#868e96', 116, 14, 38, 8); rect(c, '#6b3e26', 128, 70, 14, 25); rect(c, '#f2c94c', 138, 82, 2, 2);
  rect(c, '#8a5a35', 165, 72, 26, 20); rect(c, '#6b3e26', 165, 72, 26, 2);
  rect(c, '#868e96', 172, 76, 12, 12); rect(c, '#495057', 176, 80, 4, 4); for (const [x, y] of [[176, 74], [176, 88], [170, 80], [184, 80]]) rect(c, '#868e96', x, y, 4, 2);
  rect(c, '#e9d8a6', 60, 86, 12, 10); rect(c, '#d8c7a3', 74, 88, 10, 8);
});

const bgGarden = fromDrawNight(240, 135, (c) => {
  rect(c, '#c5f6fa', 0, 0, 240, 80); rect(c, '#ffe066', 30, 10, 12, 12);
  rect(c, '#94d82d', 0, 70, 240, 65); rect(c, '#82c91e', 0, 100, 240, 35);
  for (let x = 60; x < 240; x += 10) rect(c, '#f8f0e3', x, 58, 3, 18); rect(c, '#f8f0e3', 60, 62, 180, 2); rect(c, '#f8f0e3', 60, 70, 180, 2);
  rect(c, '#8a5a35', 18, 30, 8, 70); rect(c, '#2f9e44', 0, 6, 48, 30); rect(c, '#37b24d', 6, 0, 34, 20); rect(c, '#e03131', 10, 14, 3, 3); rect(c, '#e03131', 30, 20, 3, 3);
  rect(c, '#8a5a35', 148, 84, 54, 14); rect(c, '#6b3e26', 148, 84, 54, 2);
  for (let i = 0; i < 12; i++) { const x = 151 + i * 4; rect(c, '#2f9e44', x + 1, 80, 1, 5); rect(c, ['#f03e3e', '#fab005', '#e64980', '#7950f2'][i % 4], x, 77, 3, 3); }
  rect(c, '#e9d8a6', 0, 108, 240, 10);
});

export function makeStarterSprites(): Record<string, Sprite> {
  const out: Record<string, Sprite> = {};
  const add = (id: string, name: string, s: { w: number; h: number; url: string }) => {
    out[id] = { id, name, w: s.w, h: s.h, dataUrl: s.url };
  };
  add('spr_apprentice', 'שוליה', fromRows(apprentice));
  add('spr_apprentice_step', 'שוליה – צעד', fromRows(apprenticeStep));
  add('spr_apprentice_cheer', 'שוליה – חוגג', fromRows(apprenticeCheer));
  add('spr_baker', 'אופה', fromRows(baker));
  add('spr_baker_blink', 'אופה – מצמוץ', fromRows(bakerBlink));
  add('spr_baker_talk', 'אופה – מדבר', fromRows(bakerTalk));
  add('spr_farmer', 'חוואית', fromRows(farmer));
  add('spr_farmer_talk', 'חוואית – מדברת', fromRows(farmerTalk));
  add('spr_cow', 'פרה', cow(false));
  add('spr_cow_moo', 'פרה – מו', cow(true));
  add('spr_oven', 'תנור', oven);
  add('spr_flowerpot', 'עציץ', flowerpot);
  add('spr_key', 'מפתח', key);
  add('spr_flour', 'שק קמח', flour);
  add('spr_bucket', 'דלי', bucket);
  add('spr_eggs', 'ביצים', eggs);
  add('spr_milk', 'חלב', milk);
  add('spr_basket', 'סל', basket);
  add('spr_bread', 'לחם', bread);
  add('bg_bakery', 'רקע מאפייה', bgBakery);
  add('bg_square', 'רקע כיכר', bgSquare);
  add('bg_farm', 'רקע חווה', bgFarm);
  add('bg_warehouse', 'רקע מחסן', bgWarehouse);
  add('spr_miller', 'הטוחן', fromRows(apprentice, millerPal));
  add('spr_miller_talk', 'הטוחן – מדבר', fromRows(talk8(apprentice, MOUTH), millerPal));
  add('spr_candy', 'מוכר הממתקים', fromRows(farmer, candyPal));
  add('spr_candy_talk', 'מוכר הממתקים – מדבר', fromRows(farmerTalk, candyPal));
  add('spr_spice', 'סבתא זעתר', fromRows(farmer, spicePal));
  add('spr_spice_talk', 'סבתא זעתר – מדברת', fromRows(farmerTalk, spicePal));
  add('spr_cheese', 'מוטי הגבינות', fromRows(baker, cheesePal));
  add('spr_cheese_talk', 'מוטי הגבינות – מדבר', fromRows(bakerTalk, cheesePal));
  add('spr_bee', 'המלכה זומזומה', bee(true));
  add('spr_bee_down', 'המלכה זומזומה – כנפיים', bee(false));
  add('spr_hive', 'כוורת', hive);
  add('spr_bush', 'שיח', bush);
  add('spr_well', 'באר', well);
  add('spr_sails', 'כנפי טחנה', sails(false));
  add('spr_sails_diag', 'כנפי טחנה – מסתובבות', sails(true));
  add('spr_oilcan', 'פחית שמן', oilcan);
  add('spr_stick', 'מקל', stick);
  add('spr_gum', 'מסטיק', gum);
  add('spr_sticky', 'מקל דביק', sticky);
  add('spr_coin', 'מטבע', coin);
  add('spr_letter', 'מכתב', letter);
  add('spr_flower', 'פרח', flower);
  add('spr_sugar', 'סוכר', sugar);
  add('spr_salt', 'מלח', salt);
  add('spr_yeast', 'שמרים', yeast);
  add('spr_butter', 'חמאה', butter);
  add('spr_strawberries', 'תותים', strawberries);
  add('spr_fryoil', 'שמן לטיגון', fryoil);
  add('spr_sufganiya', 'סופגנייה', sufganiya);
  add('bg_market', 'רקע שוק', bgMarket);
  add('bg_mill', 'רקע טחנה', bgMill);
  add('bg_garden', 'רקע גינה', bgGarden);
  return out;
}
