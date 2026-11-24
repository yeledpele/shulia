// Which studio is open, and what is selected inside it. Kept in the URL hash (#world, #story…).
import { useSyncExternalStore } from 'react';

export type Route = 'home' | 'story' | 'world' | 'bg' | 'pixel' | 'anim' | 'puzzle' | 'play';
export interface Nav { route: Route; sceneId?: string; dialogueId?: string; storyTab?: string; puzzleTab?: string; spriteId?: string; bgId?: string; bgForScene?: string }

const ROUTES: Route[] = ['home', 'story', 'world', 'bg', 'pixel', 'anim', 'puzzle', 'play'];
const fromHash = (): Route => {
  const h = location.hash.replace('#', '') as Route;
  return ROUTES.includes(h) ? h : 'home';
};

let nav: Nav = { route: fromHash() };
const ls = new Set<() => void>();
window.addEventListener('hashchange', () => { const r = fromHash(); if (r !== nav.route) { nav = { ...nav, route: r }; ls.forEach((l) => l()); } });

export function go(route: Route, extra: Partial<Nav> = {}) {
  nav = { ...nav, ...extra, route };
  const h = route === 'home' ? '' : `#${route}`;
  if (location.hash !== h) {
    try { history.replaceState(null, '', h || location.pathname + location.search); } catch { /* sandboxed */ }
  }
  ls.forEach((l) => l());
  window.scrollTo(0, 0);
}
export function setNav(extra: Partial<Nav>) { nav = { ...nav, ...extra }; ls.forEach((l) => l()); }
export const useNav = () => useSyncExternalStore((l) => { ls.add(l); return () => ls.delete(l); }, () => nav);
