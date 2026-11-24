// Pixel helpers: decode a sprite into layers, flatten layers to PNG, fill, lines.
import type { Sprite } from '../model/types';

export type Px = string | null; // '#rrggbb' or transparent
export interface Layer { name: string; visible: boolean; pixels: Px[] }

const hex = (n: number) => n.toString(16).padStart(2, '0');

export function decodeSprite(s: Sprite): Promise<Layer[]> {
  if (s.layers?.length) return Promise.resolve(s.layers.map((l) => ({ ...l, pixels: l.pixels.slice() })));
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const c = document.createElement('canvas');
      c.width = s.w; c.height = s.h;
      const ctx = c.getContext('2d')!;
      ctx.drawImage(img, 0, 0);
      const d = ctx.getImageData(0, 0, s.w, s.h).data;
      const pixels: Px[] = new Array(s.w * s.h);
      for (let i = 0; i < s.w * s.h; i++) {
        pixels[i] = d[i * 4 + 3] < 128 ? null : `#${hex(d[i * 4])}${hex(d[i * 4 + 1])}${hex(d[i * 4 + 2])}`;
      }
      resolve([{ name: 'שכבה 1', visible: true, pixels }]);
    };
    img.onerror = () => resolve([{ name: 'שכבה 1', visible: true, pixels: new Array(s.w * s.h).fill(null) }]);
    img.src = s.dataUrl;
  });
}

/** Top layer wins; layers[0] is the bottom. */
export function composite(layers: Layer[], w: number, h: number): Px[] {
  const out: Px[] = new Array(w * h).fill(null);
  for (const l of layers) {
    if (!l.visible) continue;
    for (let i = 0; i < out.length; i++) if (l.pixels[i]) out[i] = l.pixels[i];
  }
  return out;
}

export function toImageData(px: Px[], w: number, h: number): ImageData {
  const id = new ImageData(w, h);
  for (let i = 0; i < px.length; i++) {
    const c = px[i];
    if (!c) continue;
    id.data[i * 4] = parseInt(c.slice(1, 3), 16);
    id.data[i * 4 + 1] = parseInt(c.slice(3, 5), 16);
    id.data[i * 4 + 2] = parseInt(c.slice(5, 7), 16);
    id.data[i * 4 + 3] = 255;
  }
  return id;
}

export function flatten(layers: Layer[], w: number, h: number): string {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  c.getContext('2d')!.putImageData(toImageData(composite(layers, w, h), w, h), 0, 0);
  return c.toDataURL('image/png');
}

export function floodFill(px: Px[], w: number, h: number, x: number, y: number, color: Px): boolean {
  const target = px[y * w + x];
  if (target === color) return false;
  const stack = [y * w + x];
  while (stack.length) {
    const i = stack.pop()!;
    if (px[i] !== target) continue;
    px[i] = color;
    const cx = i % w, cy = (i / w) | 0;
    if (cx > 0) stack.push(i - 1);
    if (cx < w - 1) stack.push(i + 1);
    if (cy > 0) stack.push(i - w);
    if (cy < h - 1) stack.push(i + w);
  }
  return true;
}

export function linePoints(x0: number, y0: number, x1: number, y1: number): [number, number][] {
  const pts: [number, number][] = [];
  const dx = Math.abs(x1 - x0), dy = -Math.abs(y1 - y0);
  const sx = x0 < x1 ? 1 : -1, sy = y0 < y1 ? 1 : -1;
  let err = dx + dy;
  for (;;) {
    pts.push([x0, y0]);
    if (x0 === x1 && y0 === y1) break;
    const e2 = 2 * err;
    if (e2 >= dy) { err += dy; x0 += sx; }
    if (e2 <= dx) { err += dx; y0 += sy; }
  }
  return pts;
}

export function rectPoints(x0: number, y0: number, x1: number, y1: number, filled: boolean): [number, number][] {
  const [ax, bx] = [Math.min(x0, x1), Math.max(x0, x1)];
  const [ay, by] = [Math.min(y0, y1), Math.max(y0, y1)];
  const pts: [number, number][] = [];
  for (let y = ay; y <= by; y++) for (let x = ax; x <= bx; x++) {
    if (filled || y === ay || y === by || x === ax || x === bx) pts.push([x, y]);
  }
  return pts;
}

export const PALETTES: { id: string; name: string; colors: string[] }[] = [
  { id: 'bakery', name: 'מאפייה', colors: ['#2b1d1a', '#6b3e26', '#8a5a35', '#c97b2c', '#e8a54a', '#f5d08a', '#fbf8f2', '#f2c29b', '#c0504d', '#e0b84a', '#4f8a3c', '#3f7bd6', '#4a3a5a', '#ffffff'] },
  { id: 'pico', name: 'קלאסי 16', colors: ['#000000', '#1d2b53', '#7e2553', '#008751', '#ab5236', '#5f574f', '#c2c3c7', '#fff1e8', '#ff004d', '#ffa300', '#ffec27', '#00e436', '#29adff', '#83769c', '#ff77a8', '#ffccaa'] },
  { id: 'nature', name: 'טבע', colors: ['#1e3a1e', '#2f9e44', '#51cf66', '#94d82d', '#d8f5a2', '#5c3b22', '#8a5a35', '#d6b48c', '#a5d8ff', '#4dabf7', '#1864ab', '#ffe066', '#f03e3e', '#e64980', '#ffffff'] },
  { id: 'night', name: 'לילה', colors: ['#0b0820', '#1b1428', '#2e2540', '#4a3a6a', '#7048e8', '#9775fa', '#d0bfff', '#364fc7', '#748ffc', '#ffd43b', '#fff3bf', '#f8f9fa'] },
  { id: 'pastel', name: 'פסטל', colors: ['#ffc9c9', '#ffd8a8', '#fff3bf', '#d3f9d8', '#c3fae8', '#d0ebff', '#e5dbff', '#fcc2d7', '#ffffff', '#868e96'] },
  { id: 'grey', name: 'אפור', colors: ['#000000', '#212529', '#495057', '#868e96', '#adb5bd', '#ced4da', '#e9ecef', '#ffffff'] },
];
