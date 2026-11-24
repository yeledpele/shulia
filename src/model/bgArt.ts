// Background Studio art: base styles, stamps and ready-made backgrounds.
// A background is a recipe (BgRecipe) that is rendered to a 240×135 picture.
import type { BgItem, BgRecipe } from './types';
import { nightCanvas } from './night';

export const BG_W = 240;
export const BG_H = 135;
type C = CanvasRenderingContext2D;

const r = (c: C, col: string, x: number, y: number, w: number, h: number) => { c.fillStyle = col; c.fillRect(x, y, w, h); };
const toRgb = (h: string) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
const toHex = (v: number[]) => `#${v.map((n) => Math.max(0, Math.min(255, Math.round(n))).toString(16).padStart(2, '0')).join('')}`;
export function mix(a: string, b: string, t: number) { const A = toRgb(a), B = toRgb(b); return toHex(A.map((x, i) => x + (B[i] - x) * t)); }
/** f > 0 lightens toward white, f < 0 darkens toward black */
export const shade = (c: string, f: number) => (f >= 0 ? mix(c, '#ffffff', f) : mix(c, '#000000', -f));
function rng(seed: number) { let s = seed; return () => { s = (s * 1664525 + 1013904223) % 4294967296; return s / 4294967296; }; }

// ── Base: top (sky or wall) and bottom (ground or floor) ──────────
export const TOP_STYLES: { id: string; label: string; color: string }[] = [
  { id: 'sky', label: 'שמיים', color: '#74c0fc' },
  { id: 'sunset', label: 'שקיעה', color: '#ff922b' },
  { id: 'night', label: 'לילה', color: '#364fc7' },
  { id: 'plain', label: 'קיר חלק', color: '#f1d6a8' },
  { id: 'stripes', label: 'טפט פסים', color: '#c3aed6' },
  { id: 'bricks', label: 'לבנים', color: '#d9a07a' },
  { id: 'planks', label: 'קרשים', color: '#8a5a35' },
  { id: 'stone', label: 'אבני טירה', color: '#868e96' },
];
export const BOTTOM_STYLES: { id: string; label: string; color: string }[] = [
  { id: 'grass', label: 'דשא', color: '#69db7c' },
  { id: 'sand', label: 'חול', color: '#ffe8a3' },
  { id: 'dirt', label: 'אדמה', color: '#d6b48c' },
  { id: 'cobbles', label: 'מרצפות רחוב', color: '#adb5bd' },
  { id: 'planks', label: 'רצפת עץ', color: '#9c6b3f' },
  { id: 'tiles', label: 'משבצות', color: '#dee2e6' },
  { id: 'water', label: 'מים', color: '#4dabf7' },
  { id: 'plain', label: 'חלק', color: '#9c6b3f' },
];

function drawTop(c: C, style: string, color: string, H: number) {
  const W = BG_W;
  if (style === 'sky' || style === 'sunset' || style === 'night') {
    const topCol = style === 'sky' ? shade(color, -0.18) : style === 'sunset' ? '#5f3dc4' : '#0b0820';
    const lowCol = style === 'sky' ? shade(color, 0.45) : style === 'sunset' ? shade(color, 0.35) : color;
    const bands = 6;
    for (let i = 0; i < bands; i++) {
      const y0 = Math.floor((H * i) / bands), y1 = Math.floor((H * (i + 1)) / bands);
      r(c, mix(topCol, lowCol, i / (bands - 1)), 0, y0, W, y1 - y0);
      if (i < bands - 1) for (let x = (i % 2) * 2; x < W; x += 4) r(c, mix(topCol, lowCol, (i + 1) / (bands - 1)), x, y1 - 1, 2, 1);
    }
    if (style === 'night') { const rnd = rng(7); for (let i = 0; i < 40; i++) r(c, '#fff9db', Math.floor(rnd() * W), Math.floor(rnd() * H * 0.8), 1, 1); }
    return;
  }
  r(c, color, 0, 0, W, H);
  if (style === 'stripes') for (let x = 0; x < W; x += 12) { r(c, shade(color, 0.12), x, 0, 6, H); r(c, shade(color, -0.06), x + 6, 0, 1, H); }
  if (style === 'bricks') {
    r(c, shade(color, -0.28), 0, 0, W, H);
    for (let y = 0, row = 0; y < H; y += 6, row++) for (let x = row % 2 ? -6 : 0; x < W; x += 12) {
      r(c, color, x + 1, y + 1, 11, 5); r(c, shade(color, 0.12), x + 1, y + 1, 11, 1);
    }
  }
  if (style === 'planks') for (let x = 0; x < W; x += 10) {
    r(c, x % 20 ? color : shade(color, 0.06), x, 0, 10, H); r(c, shade(color, -0.3), x, 0, 1, H);
    for (let y = 8; y < H; y += 30) r(c, shade(color, -0.4), x + 4, y + ((x / 10) % 3) * 6, 1, 1);
  }
  if (style === 'stone') {
    const rnd = rng(3); r(c, shade(color, -0.35), 0, 0, W, H);
    for (let y = 0, row = 0; y < H; y += 12, row++) for (let x = row % 2 ? -10 : 0; x < W; x += 20) {
      r(c, shade(color, (rnd() - 0.5) * 0.18), x + 1, y + 1, 19, 11); r(c, shade(color, 0.15), x + 1, y + 1, 19, 1);
    }
  }
}

function drawBottom(c: C, style: string, color: string, y0: number) {
  const W = BG_W, H = BG_H - y0;
  r(c, color, 0, y0, W, H);
  const rnd = rng(11);
  if (style === 'grass') {
    r(c, shade(color, -0.12), 0, y0, W, 2);
    for (let i = 0; i < 160; i++) { const x = Math.floor(rnd() * W), y = y0 + 3 + Math.floor(rnd() * (H - 3)); r(c, shade(color, rnd() > 0.5 ? -0.15 : 0.15), x, y, 1, 2); }
  }
  if (style === 'sand') for (let i = 0; i < 140; i++) r(c, shade(color, rnd() > 0.5 ? -0.1 : 0.2), Math.floor(rnd() * W), y0 + Math.floor(rnd() * H), 1, 1);
  if (style === 'dirt') for (let i = 0; i < 60; i++) r(c, shade(color, -0.2), Math.floor(rnd() * W), y0 + 2 + Math.floor(rnd() * (H - 2)), 2, 1);
  if (style === 'cobbles') {
    r(c, shade(color, -0.25), 0, y0, W, H);
    for (let y = y0 + 1, row = 0; y < BG_H; y += 6, row++) for (let x = row % 2 ? -5 : 0; x < W; x += 10) {
      r(c, shade(color, (rnd() - 0.5) * 0.15), x + 1, y, 8, 4); r(c, shade(color, 0.18), x + 1, y, 8, 1);
    }
  }
  if (style === 'planks') {
    for (let y = y0; y < BG_H; y += 7) { r(c, shade(color, -0.3), 0, y, W, 1); for (let x = ((y - y0) / 7) % 2 ? 20 : 0; x < W; x += 40) r(c, shade(color, -0.3), x, y, 1, 7); }
    r(c, shade(color, -0.45), 0, y0, W, 2);
  }
  if (style === 'tiles') {
    for (let y = y0, row = 0; y < BG_H; y += 10, row++) for (let x = 0, col = 0; x < W; x += 10, col++) if ((row + col) % 2) r(c, shade(color, -0.35), x, y, 10, 10);
    r(c, shade(color, -0.5), 0, y0, W, 1);
  }
  if (style === 'water') for (let y = y0 + 3; y < BG_H; y += 5) for (let x = (y % 2) * 4; x < W; x += 9) r(c, shade(color, 0.35), x, y, 4, 1);
  if (style === 'plain') r(c, shade(color, -0.25), 0, y0, W, 1);
}

// ── Stamps ────────────────────────────────────────────────────────
export interface Stamp { id: string; name: string; group: 'בבית' | 'בחוץ' | 'בשמיים'; w: number; h: number; color: string; place: 'wall' | 'ground' | 'sky'; draw: (c: C, col: string) => void }

export const STAMPS: Stamp[] = [
  { id: 'window', name: 'חלון', group: 'בבית', w: 30, h: 26, color: '#6b3e26', place: 'wall', draw: (c, f) => {
    r(c, f, 0, 0, 30, 24); r(c, '#a8d8f0', 2, 2, 26, 20); r(c, '#d0ebff', 4, 4, 6, 4); r(c, f, 14, 2, 2, 20); r(c, f, 2, 11, 26, 2); r(c, shade(f, 0.2), 0, 24, 30, 2);
  } },
  { id: 'door', name: 'דלת', group: 'בבית', w: 22, h: 40, color: '#8a5a35', place: 'ground', draw: (c, f) => {
    r(c, shade(f, -0.35), 0, 0, 22, 40); r(c, f, 2, 2, 18, 38); r(c, shade(f, -0.14), 4, 5, 14, 12); r(c, shade(f, -0.14), 4, 21, 14, 15); r(c, '#f2c94c', 16, 22, 2, 2);
  } },
  { id: 'shelf', name: 'מדף', group: 'בבית', w: 36, h: 12, color: '#7a4e2c', place: 'wall', draw: (c, f) => {
    r(c, '#e9ecef', 3, 2, 5, 6); r(c, '#c92a2a', 3, 1, 5, 1); r(c, '#f2c94c', 10, 3, 4, 5); r(c, '#3f7bd6', 18, 1, 3, 7); r(c, '#2f9e44', 21, 2, 3, 6); r(c, '#e8590c', 24, 0, 3, 8); r(c, '#c8643b', 30, 3, 4, 5);
    r(c, f, 0, 8, 36, 3); r(c, shade(f, -0.3), 3, 11, 2, 1); r(c, shade(f, -0.3), 31, 11, 2, 1);
  } },
  { id: 'cupboard', name: 'ארון', group: 'בבית', w: 30, h: 44, color: '#7a4e2c', place: 'ground', draw: (c, f) => {
    r(c, shade(f, -0.28), 0, 0, 30, 44); r(c, f, 2, 2, 12, 40); r(c, f, 16, 2, 12, 40); r(c, shade(f, 0.15), 0, 0, 30, 2); r(c, '#f2c94c', 11, 20, 2, 3); r(c, '#f2c94c', 17, 20, 2, 3);
  } },
  { id: 'table', name: 'שולחן', group: 'בבית', w: 40, h: 20, color: '#c8a26f', place: 'ground', draw: (c, f) => {
    r(c, f, 0, 0, 40, 4); r(c, shade(f, -0.2), 0, 4, 40, 1); r(c, shade(f, -0.38), 3, 5, 3, 15); r(c, shade(f, -0.38), 34, 5, 3, 15);
  } },
  { id: 'chair', name: 'כיסא', group: 'בבית', w: 14, h: 22, color: '#8a5a35', place: 'ground', draw: (c, f) => {
    r(c, f, 1, 0, 3, 22); r(c, f, 1, 11, 12, 3); r(c, shade(f, -0.25), 11, 14, 2, 8); r(c, shade(f, 0.15), 1, 0, 3, 1);
  } },
  { id: 'picture', name: 'תמונה', group: 'בבית', w: 18, h: 14, color: '#c99a2e', place: 'wall', draw: (c, f) => {
    r(c, f, 0, 0, 18, 14); r(c, '#a5d8ff', 2, 2, 14, 10); r(c, '#69db7c', 2, 8, 14, 4); r(c, '#ffd43b', 11, 3, 3, 3); r(c, '#2f9e44', 4, 6, 3, 3);
  } },
  { id: 'rug', name: 'שטיח', group: 'בבית', w: 50, h: 8, color: '#c92a2a', place: 'ground', draw: (c, f) => {
    r(c, f, 2, 0, 46, 8); r(c, f, 0, 1, 50, 6); r(c, shade(f, 0.4), 4, 2, 42, 1); r(c, shade(f, 0.4), 4, 5, 42, 1); for (let x = 8; x < 44; x += 6) r(c, '#ffd43b', x, 3, 2, 2);
  } },
  { id: 'lamp', name: 'מנורה תלויה', group: 'בבית', w: 12, h: 26, color: '#f2c94c', place: 'wall', draw: (c, f) => {
    r(c, '#495057', 5, 0, 2, 14); r(c, f, 1, 14, 10, 6); r(c, shade(f, 0.3), 2, 15, 4, 2); r(c, '#fff3bf', 4, 20, 4, 3);
  } },
  { id: 'fireplace', name: 'אח / תנור', group: 'בבית', w: 40, h: 34, color: '#9a4e33', place: 'ground', draw: (c, f) => {
    r(c, f, 0, 4, 40, 30); r(c, shade(f, -0.3), 0, 0, 40, 5); for (let y = 8; y < 34; y += 5) r(c, shade(f, -0.18), 0, y, 40, 1);
    r(c, '#2b1d1a', 8, 12, 24, 22); r(c, '#f59f2a', 12, 22, 16, 12); r(c, '#ffd166', 15, 25, 10, 9); r(c, '#e8590c', 12, 31, 16, 3);
  } },
  { id: 'plant', name: 'עציץ', group: 'בבית', w: 12, h: 20, color: '#2f9e44', place: 'ground', draw: (c, f) => {
    r(c, f, 2, 0, 3, 9); r(c, f, 7, 1, 3, 8); r(c, shade(f, 0.25), 4, 3, 4, 8); r(c, '#c8643b', 2, 11, 8, 2); r(c, '#b05530', 3, 13, 6, 7);
  } },
  { id: 'clock', name: 'שעון', group: 'בבית', w: 12, h: 12, color: '#f8f0e3', place: 'wall', draw: (c, f) => {
    r(c, '#6b3e26', 2, 0, 8, 12); r(c, '#6b3e26', 0, 2, 12, 8); r(c, f, 2, 2, 8, 8); r(c, '#2b1d1a', 5, 3, 1, 3); r(c, '#2b1d1a', 6, 5, 3, 1);
  } },
  { id: 'tree', name: 'עץ', group: 'בחוץ', w: 32, h: 46, color: '#2f9e44', place: 'ground', draw: (c, f) => {
    r(c, '#8a5a35', 13, 26, 6, 20); r(c, '#6b3e26', 13, 26, 2, 20);
    r(c, f, 4, 8, 24, 18); r(c, f, 8, 2, 16, 26); r(c, f, 0, 12, 32, 10); r(c, shade(f, 0.25), 10, 5, 8, 6); r(c, shade(f, -0.2), 4, 20, 24, 4);
  } },
  { id: 'pine', name: 'אורן', group: 'בחוץ', w: 22, h: 46, color: '#2b8a3e', place: 'ground', draw: (c, f) => {
    r(c, '#6b3e26', 9, 38, 4, 8);
    for (let k = 0; k < 3; k++) for (let row = 0; row < 16; row++) { const half = 1 + Math.round((row / 15) * (5 + k * 2)); r(c, row > 12 ? shade(f, -0.2) : f, 11 - half, k * 11 + row, half * 2, 1); }
  } },
  { id: 'bush', name: 'שיח', group: 'בחוץ', w: 24, h: 12, color: '#37b24d', place: 'ground', draw: (c, f) => {
    r(c, shade(f, -0.15), 2, 4, 20, 8); r(c, f, 4, 1, 8, 8); r(c, f, 12, 0, 9, 9); r(c, shade(f, 0.25), 6, 3, 3, 2); r(c, shade(f, 0.25), 15, 2, 3, 2);
  } },
  { id: 'house', name: 'בית', group: 'בחוץ', w: 44, h: 42, color: '#e8b4a0', place: 'ground', draw: (c, f) => {
    r(c, '#8c7a6b', 32, 2, 4, 8);
    for (let row = 0; row < 15; row++) { const half = 4 + Math.round(row * 1.25); r(c, row === 14 ? '#8e2a20' : '#b05530', 22 - half, row, half * 2, 1); }
    r(c, f, 4, 15, 36, 27); r(c, '#6b3e26', 18, 28, 8, 14); r(c, '#fff3bf', 8, 20, 8, 7); r(c, '#6b3e26', 11, 20, 1, 7); r(c, '#fff3bf', 28, 20, 8, 7); r(c, '#6b3e26', 31, 20, 1, 7);
  } },
  { id: 'fence', name: 'גדר', group: 'בחוץ', w: 40, h: 16, color: '#f8f0e3', place: 'ground', draw: (c, f) => {
    r(c, f, 0, 4, 40, 2); r(c, f, 0, 10, 40, 2); for (let x = 1; x < 40; x += 7) { r(c, f, x, 0, 3, 16); r(c, shade(f, -0.15), x + 2, 1, 1, 15); }
  } },
  { id: 'mountain', name: 'הר', group: 'בחוץ', w: 80, h: 40, color: '#868e96', place: 'ground', draw: (c, f) => {
    for (let y = 0; y < 40; y++) { const half = y + 1; r(c, f, 40 - half, y, half, 1); r(c, shade(f, -0.15), 40, y, half, 1); if (y < 9 + (y % 3)) r(c, '#f8f9fa', 40 - half, y, half * 2, 1); }
  } },
  { id: 'flowers', name: 'פרחים', group: 'בחוץ', w: 30, h: 8, color: '#f03e3e', place: 'ground', draw: (c, f) => {
    const cols = [f, '#fab005', '#e64980', '#7950f2'];
    for (let i = 0; i < 7; i++) { const x = 1 + i * 4; r(c, '#2f9e44', x + 1, 3, 1, 5); r(c, cols[i % 4], x, i % 2, 3, 3); }
  } },
  { id: 'rock', name: 'סלע', group: 'בחוץ', w: 18, h: 10, color: '#adb5bd', place: 'ground', draw: (c, f) => {
    r(c, f, 2, 2, 14, 8); r(c, f, 4, 0, 9, 2); r(c, f, 0, 5, 18, 5); r(c, shade(f, 0.3), 4, 2, 5, 2); r(c, shade(f, -0.25), 1, 8, 16, 2);
  } },
  { id: 'stall', name: 'דוכן שוק', group: 'בחוץ', w: 44, h: 38, color: '#e64980', place: 'ground', draw: (c, f) => {
    r(c, '#6b3e26', 2, 8, 2, 30); r(c, '#6b3e26', 40, 8, 2, 30); r(c, f, 0, 2, 44, 3);
    for (let x = 0; x < 44; x += 8) { r(c, f, x, 4, 4, 9); r(c, '#ffffff', x + 4, 4, 4, 9); }
    r(c, '#a0703f', 0, 24, 44, 14); r(c, '#8a5a35', 0, 24, 44, 3); for (let i = 0; i < 7; i++) r(c, ['#f03e3e', '#fab005', '#40c057'][i % 3], 4 + i * 5, 20, 4, 4);
  } },
  { id: 'lamppost', name: 'פנס רחוב', group: 'בחוץ', w: 10, h: 42, color: '#343a40', place: 'ground', draw: (c, f) => {
    r(c, f, 4, 8, 2, 34); r(c, f, 2, 38, 6, 4); r(c, f, 1, 2, 8, 7); r(c, '#fff3bf', 2, 3, 6, 5); r(c, f, 3, 0, 4, 2);
  } },
  { id: 'palm', name: 'דקל', group: 'בחוץ', w: 30, h: 46, color: '#2f9e44', place: 'ground', draw: (c, f) => {
    for (let y = 14; y < 46; y++) { const x = 13 + Math.round(Math.sin(y / 9) * 2); r(c, y % 4 ? '#a0703f' : '#8a5a35', x, y, 4, 1); }
    r(c, f, 4, 10, 12, 3); r(c, f, 16, 10, 12, 3); r(c, f, 1, 13, 4, 3); r(c, f, 26, 13, 4, 3); r(c, f, 9, 6, 13, 4); r(c, shade(f, 0.2), 12, 4, 7, 2);
    r(c, '#6b3e26', 13, 13, 3, 3); r(c, '#6b3e26', 17, 14, 3, 3);
  } },
  { id: 'sea', name: 'ים', group: 'בחוץ', w: 120, h: 14, color: '#4dabf7', place: 'ground', draw: (c, f) => {
    r(c, f, 0, 0, 120, 14); r(c, shade(f, -0.15), 0, 0, 120, 2); for (let x = 0; x < 120; x += 8) r(c, shade(f, 0.4), x, 4 + ((x / 8) % 2) * 4, 5, 1); r(c, '#ffffff', 0, 13, 120, 1);
  } },
  { id: 'sign', name: 'שלט', group: 'בחוץ', w: 22, h: 20, color: '#c8a26f', place: 'ground', draw: (c, f) => {
    r(c, '#6b3e26', 10, 8, 2, 12); r(c, f, 0, 0, 22, 10); r(c, shade(f, -0.25), 0, 9, 22, 1); r(c, '#6b3e26', 4, 3, 14, 1); r(c, '#6b3e26', 4, 6, 10, 1);
  } },
  { id: 'cloud', name: 'ענן', group: 'בשמיים', w: 32, h: 12, color: '#ffffff', place: 'sky', draw: (c, f) => {
    r(c, f, 6, 4, 22, 8); r(c, f, 10, 1, 10, 4); r(c, f, 2, 7, 28, 5); r(c, shade(f, -0.08), 2, 10, 28, 2);
  } },
  { id: 'sun', name: 'שמש', group: 'בשמיים', w: 18, h: 18, color: '#ffd43b', place: 'sky', draw: (c, f) => {
    r(c, f, 5, 3, 8, 12); r(c, f, 3, 5, 12, 8); for (const [x, y] of [[8, 0], [8, 16], [0, 8], [16, 8], [2, 2], [14, 2], [2, 14], [14, 14]]) r(c, f, x, y, 2, 2); r(c, shade(f, 0.45), 6, 5, 3, 3);
  } },
  { id: 'moon', name: 'ירח', group: 'בשמיים', w: 14, h: 14, color: '#fff3bf', place: 'sky', draw: (c, f) => {
    r(c, f, 4, 0, 6, 14); r(c, f, 2, 2, 10, 10); r(c, f, 0, 4, 14, 6); r(c, shade(f, -0.12), 4, 4, 2, 2); r(c, shade(f, -0.12), 8, 8, 3, 2);
  } },
  { id: 'stars', name: 'כוכבים', group: 'בשמיים', w: 60, h: 30, color: '#fff9db', place: 'sky', draw: (c, f) => {
    for (const [x, y] of [[3, 4], [15, 20], [27, 8], [40, 24], [52, 5], [33, 16], [9, 27], [57, 18]]) r(c, f, x, y, 1, 1);
    for (const [x, y] of [[20, 3], [46, 13], [6, 15]]) { r(c, f, x, y - 1, 1, 3); r(c, f, x - 1, y, 3, 1); }
  } },
];
export const stampById = (id: string) => STAMPS.find((s) => s.id === id);

const stampCache = new Map<string, HTMLCanvasElement>();
function stampCanvas(st: Stamp, color: string) {
  const key = `${st.id}|${color}`;
  let cv = stampCache.get(key);
  if (!cv) {
    cv = document.createElement('canvas'); cv.width = st.w; cv.height = st.h;
    st.draw(cv.getContext('2d')!, color);
    stampCache.set(key, cv);
  }
  return cv;
}
const thumbCache = new Map<string, string>();
export function stampThumb(id: string) {
  const st = stampById(id)!;
  if (!thumbCache.has(id)) thumbCache.set(id, stampCanvas(st, st.color).toDataURL());
  return thumbCache.get(id)!;
}

export const itemBox = (it: BgItem) => {
  const st = stampById(it.stamp);
  const w = (st?.w ?? 10) * it.size, h = (st?.h ?? 10) * it.size;
  return { x: it.x - w / 2, y: it.y - h, w, h };
};

/** Draw a recipe. `base` is the decoded base picture, when the recipe has one. */
export function renderBg(rec: BgRecipe, base?: HTMLImageElement | null, target?: HTMLCanvasElement): HTMLCanvasElement {
  const cv = target ?? document.createElement('canvas');
  cv.width = BG_W; cv.height = BG_H;
  const c = cv.getContext('2d')!;
  c.imageSmoothingEnabled = false;
  c.clearRect(0, 0, BG_W, BG_H);
  if (rec.baseImage) { if (base?.complete) c.drawImage(base, 0, 0, BG_W, BG_H); else r(c, '#dee2e6', 0, 0, BG_W, BG_H); }
  else {
    const hz = Math.max(10, Math.min(BG_H - 5, Math.round(rec.horizon)));
    drawTop(c, rec.top.style, rec.top.color, hz);
    drawBottom(c, rec.bottom.style, rec.bottom.color, hz);
  }
  for (const it of rec.items) {
    const st = stampById(it.stamp);
    if (!st) continue;
    const b = itemBox(it);
    c.save();
    if (it.flip) { c.translate(Math.round(b.x) + b.w, Math.round(b.y)); c.scale(-1, 1); c.drawImage(stampCanvas(st, it.color), 0, 0, b.w, b.h); }
    else c.drawImage(stampCanvas(st, it.color), Math.round(b.x), Math.round(b.y), b.w, b.h);
    c.restore();
  }
  if (rec.night) nightCanvas(c);
  return cv;
}

// ── Ready-made backgrounds ────────────────────────────────────────
let n = 0;
const it = (stamp: string, x: number, y: number, size = 1, color?: string, flip?: boolean): BgItem =>
  ({ id: `t${n++}`, stamp, x, y, size, color: color ?? stampById(stamp)!.color, flip });

export const TEMPLATES: { id: string; name: string; rec: BgRecipe }[] = [
  { id: 'kitchen', name: 'מטבח', rec: { top: { style: 'bricks', color: '#d9a07a' }, bottom: { style: 'planks', color: '#9c6b3f' }, horizon: 92, items: [
    it('window', 120, 62, 2), it('shelf', 48, 52), it('clock', 190, 36), it('fireplace', 52, 94), it('cupboard', 208, 94), it('table', 128, 116), it('plant', 132, 97), it('chair', 98, 118), it('chair', 160, 118, 1, undefined, true),
  ] } },
  { id: 'forest', name: 'יער', rec: { top: { style: 'sky', color: '#74c0fc' }, bottom: { style: 'grass', color: '#69db7c' }, horizon: 80, items: [
    it('cloud', 60, 26), it('cloud', 150, 36, 1), it('sun', 210, 30), it('mountain', 70, 82), it('mountain', 190, 82, 1, '#748ffc', true),
    it('pine', 20, 108, 2), it('pine', 220, 104, 1), it('tree', 120, 110, 2), it('bush', 170, 118), it('flowers', 80, 128), it('rock', 210, 126),
  ] } },
  { id: 'beach', name: 'חוף ים', rec: { top: { style: 'sky', color: '#a5d8ff' }, bottom: { style: 'sand', color: '#ffe8a3' }, horizon: 70, items: [
    it('sea', 120, 92, 2), it('sun', 200, 30), it('cloud', 70, 22), it('palm', 40, 124, 2), it('palm', 215, 128, 1, undefined, true), it('rock', 150, 126),
  ] } },
  { id: 'city', name: 'עיר בלילה', rec: { top: { style: 'night', color: '#364fc7' }, bottom: { style: 'cobbles', color: '#868e96' }, horizon: 96, items: [
    it('stars', 70, 42, 2), it('moon', 200, 32, 2), it('house', 44, 98, 2), it('house', 130, 98, 1, '#b0c4de'), it('house', 200, 98, 2, '#c3aed6', true),
    it('lamppost', 92, 122, 2), it('lamppost', 168, 126, 2),
  ] } },
  { id: 'castle', name: 'חדר בטירה', rec: { top: { style: 'stone', color: '#868e96' }, bottom: { style: 'tiles', color: '#adb5bd' }, horizon: 100, items: [
    it('door', 120, 100, 2, '#6b3e26'), it('window', 50, 64, 1, '#495057'), it('window', 190, 64, 1, '#495057'), it('picture', 82, 52), it('picture', 158, 52, 1, '#adb5bd'),
    it('lamp', 60, 26), it('lamp', 180, 26), it('rug', 120, 126, 2, '#862e9c'),
  ] } },
  { id: 'market', name: 'שוק', rec: { top: { style: 'sunset', color: '#ff922b' }, bottom: { style: 'dirt', color: '#d6b48c' }, horizon: 88, items: [
    it('cloud', 120, 22, 1, '#ffd8a8'), it('house', 30, 90, 1, '#e8b4a0'), it('house', 210, 90, 1, '#c3aed6', true),
    it('stall', 50, 112, 1, '#e64980'), it('stall', 120, 112, 1, '#1c7ed6'), it('stall', 190, 112, 1, '#2f9e44'), it('sign', 120, 128),
  ] } },
  { id: 'empty', name: 'רקע ריק', rec: { top: { style: 'sky', color: '#74c0fc' }, bottom: { style: 'grass', color: '#69db7c' }, horizon: 85, items: [] } },
];
