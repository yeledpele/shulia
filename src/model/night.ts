// Night filter: turns any picture into a night version.
// Sky that touches the top edge becomes a dark starry sky; everything else gets blue night light,
// except light sources (flames, lamps, lit windows) which keep glowing.

// sky colours used by the starter art and the Background Studio, beyond plain light blue
const WARM_SKIES = new Set(['ffd8a8', 'ffc078']);

const hex = (r: number, g: number, b: number) => [r, g, b].map((v) => v.toString(16).padStart(2, '0')).join('');
// clearly blue (not pale grey stone or white walls)
const skyish = (r: number, g: number, b: number) => b > 170 && b >= r + 30 && b >= g - 12;
const glowing = (r: number, g: number, b: number) =>
  (r > 240 && g > 190 && b < 120) ||            // yellow light, candle, sun
  (r > 240 && g > 120 && g < 200 && b < 80) ||  // orange flame
  (r > 250 && g > 235 && b >= 170 && b <= 200); // warm lit window

export function nightImageData(d: ImageData) {
  const { width: w, height: h, data } = d;
  const sky = new Uint8Array(w * h);
  const isSkyPx = (i: number) => {
    const r = data[i * 4], g = data[i * 4 + 1], b = data[i * 4 + 2];
    return data[i * 4 + 3] > 0 && (skyish(r, g, b) || WARM_SKIES.has(hex(r, g, b)));
  };
  // flood from the top edge through sky colours
  const stack: number[] = [];
  const seed = (i: number) => { if (!sky[i] && isSkyPx(i)) { sky[i] = 1; stack.push(i); } };
  for (let x = 0; x < w; x++) seed(x);
  // sky can also peek in from the sides, e.g. under a tree's crown
  for (let y = 0; y < h * 0.6; y++) { seed(y * w); seed(y * w + w - 1); }
  while (stack.length) {
    const i = stack.pop()!, x = i % w, y = (i / w) | 0;
    for (const j of [x > 0 ? i - 1 : -1, x < w - 1 ? i + 1 : -1, y > 0 ? i - w : -1, y < h - 1 ? i + w : -1]) {
      if (j >= 0 && !sky[j] && isSkyPx(j)) { sky[j] = 1; stack.push(j); }
    }
  }
  // pockets of the very same sky colour (between fence slats, under branches) are sky too
  const skyCols = new Set<number>();
  for (let i = 0; i < w * h; i++) if (sky[i]) skyCols.add((data[i * 4] << 16) | (data[i * 4 + 1] << 8) | data[i * 4 + 2]);
  for (let i = 0; i < w * h * 0.6; i++) {
    if (!sky[i] && data[i * 4 + 3] > 0 && skyCols.has((data[i * 4] << 16) | (data[i * 4 + 1] << 8) | data[i * 4 + 2]) && isSkyPx(i)) sky[i] = 1;
  }
  // how far down the sky reaches, for the gradient
  let skyBottom = 1;
  for (let i = 0; i < w * h; i++) if (sky[i]) skyBottom = Math.max(skyBottom, ((i / w) | 0) + 1);
  const top = [11, 8, 32], low = [46, 42, 107];
  for (let i = 0; i < w * h; i++) {
    const p = i * 4;
    if (data[p + 3] === 0) continue;
    if (sky[i]) {
      const x = i % w, y = (i / w) | 0, t = Math.min(1, y / skyBottom);
      const star = ((x * 73856093) ^ (y * 19349663)) % 97 === 0;
      const c = star ? [255, 249, 219] : top.map((v, k) => Math.round(v + (low[k] - v) * t));
      data[p] = c[0]; data[p + 1] = c[1]; data[p + 2] = c[2];
      continue;
    }
    const r = data[p], g = data[p + 1], b = data[p + 2];
    if (glowing(r, g, b)) continue;
    data[p] = Math.round(r * 0.55 + 10);
    data[p + 1] = Math.round(g * 0.55 + 14);
    data[p + 2] = Math.round(b * 0.7 + 34);
  }
  return d;
}

export function nightCanvas(c: CanvasRenderingContext2D) {
  const { width, height } = c.canvas;
  c.putImageData(nightImageData(c.getImageData(0, 0, width, height)), 0, 0);
}

/** Night version of a picture given as a data URL. */
export function nightDataUrl(url: string): Promise<string> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const cv = document.createElement('canvas');
      cv.width = img.width; cv.height = img.height;
      const c = cv.getContext('2d')!;
      c.drawImage(img, 0, 0);
      nightCanvas(c);
      resolve(cv.toDataURL('image/png'));
    };
    img.onerror = () => resolve(url);
    img.src = url;
  });
}

/** The night version of a single colour (for scenes with a colour instead of a picture). */
export function nightColor(hexColor: string): string {
  const v = [1, 3, 5].map((i) => parseInt(hexColor.slice(i, i + 2), 16));
  const n = [Math.round(v[0] * 0.55 + 10), Math.round(v[1] * 0.55 + 14), Math.round(v[2] * 0.7 + 34)];
  return `#${n.map((x) => Math.min(255, x).toString(16).padStart(2, '0')).join('')}`;
}
