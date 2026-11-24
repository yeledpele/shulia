// Tiny sound player: built-in synth sounds ("synth:name") or any audio data URL.
let ac: AudioContext | null = null;
const ctx = () => (ac ??= new (window.AudioContext || (window as any).webkitAudioContext)());

function tone(freq: number, start: number, dur: number, type: OscillatorType = 'square', vol = 0.12, slideTo?: number) {
  const a = ctx(), o = a.createOscillator(), g = a.createGain();
  o.type = type;
  o.frequency.setValueAtTime(freq, a.currentTime + start);
  if (slideTo) o.frequency.linearRampToValueAtTime(slideTo, a.currentTime + start + dur);
  g.gain.setValueAtTime(vol, a.currentTime + start);
  g.gain.exponentialRampToValueAtTime(0.001, a.currentTime + start + dur);
  o.connect(g).connect(a.destination);
  o.start(a.currentTime + start);
  o.stop(a.currentTime + start + dur + 0.02);
}

const SYNTH: Record<string, () => void> = {
  pickup: () => { tone(660, 0, 0.08); tone(990, 0.08, 0.12); },
  door: () => { tone(180, 0, 0.06, 'square', 0.15); tone(120, 0.08, 0.18, 'sawtooth', 0.1, 90); },
  moo: () => tone(150, 0, 0.7, 'sawtooth', 0.1, 110),
  win: () => [523, 659, 784, 1046].forEach((f, i) => tone(f, i * 0.13, 0.22, 'triangle', 0.16)),
  whirr: () => { for (let i = 0; i < 6; i++) tone(220 + i * 40, i * 0.09, 0.12, 'sawtooth', 0.06); },
  buzz: () => tone(240, 0, 0.6, 'sawtooth', 0.05, 260),
  boing: () => tone(300, 0, 0.25, 'triangle', 0.15, 700),
  click: () => tone(880, 0, 0.04, 'square', 0.05),
};

export function playSound(dataUrl: string | undefined, muted: boolean) {
  if (muted || !dataUrl) return;
  try {
    if (dataUrl.startsWith('synth:')) SYNTH[dataUrl.slice(6)]?.();
    else void new Audio(dataUrl).play().catch(() => {});
  } catch { /* sound is optional */ }
}
