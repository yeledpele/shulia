// Rule engine: pure functions, no UI. Given a trigger and the game state,
// decide which actions run and explain (in Hebrew) why each rule did or didn't fire.
import type { Action, Condition, GameState, Id, Project, Rule, Trigger } from '../model/types';

export interface RuleCheck { ruleId: Id; ruleName: string; passed: boolean; reasons: string[] }
export interface Trace {
  trigger: string;          // human description of what the player did
  checks: RuleCheck[];      // every rule that listens to this trigger
  fired?: string;           // name of the rule that ran
  fallback?: string;        // message shown when nothing ran
}
export interface Outcome { actions: Action[]; trace: Trace; ruleId?: Id }

const itemName = (p: Project, id: Id) => p.items[id]?.name ?? id;
const flagName = (p: Project, id: Id) => p.flags[id]?.name ?? id;

export function objectById(p: Project, id: Id) {
  for (const s of Object.values(p.scenes)) {
    const o = s.objects.find((x) => x.id === id);
    if (o) return o;
  }
  return undefined;
}

export function describeTrigger(p: Project, t: Trigger): string {
  switch (t.type) {
    case 'click': return `לחיצה על ${objectById(p, t.objectId)?.name ?? t.objectId}`;
    case 'useItem': return `שימוש ב${itemName(p, t.itemId)} על ${objectById(p, t.objectId)?.name ?? t.objectId}`;
    case 'combine': return `חיבור ${itemName(p, t.a)} עם ${itemName(p, t.b)}`;
    case 'enterScene': return `כניסה ל${p.scenes[t.sceneId]?.name ?? t.sceneId}`;
  }
}

function matches(w: Trigger, t: Trigger): boolean {
  if (w.type !== t.type) return false;
  switch (t.type) {
    case 'click': return (w as typeof t).objectId === t.objectId;
    case 'useItem': return (w as typeof t).objectId === t.objectId && (w as typeof t).itemId === t.itemId;
    case 'enterScene': return (w as typeof t).sceneId === t.sceneId;
    case 'combine': {
      const c = w as typeof t;
      return (c.a === t.a && c.b === t.b) || (c.a === t.b && c.b === t.a);
    }
  }
}

/** Returns a Hebrew reason when the condition is NOT met, or null when it is. */
export function checkCondition(p: Project, s: GameState, c: Condition): string | null {
  switch (c.type) {
    case 'hasItem': {
      const has = s.inventory.includes(c.itemId);
      if (c.not) return has ? `כבר יש לך: ${itemName(p, c.itemId)}` : null;
      return has ? null : `חסר לך: ${itemName(p, c.itemId)}`;
    }
    case 'hasAllItems': {
      const missing = c.itemIds.filter((i) => !s.inventory.includes(i));
      return missing.length ? `חסרים לך: ${missing.map((i) => itemName(p, i)).join(', ')}` : null;
    }
    case 'flag': {
      const v = !!s.flags[c.flagId];
      if (v === c.value) return null;
      return c.value ? `עוד לא קרה: ${flagName(p, c.flagId)}` : `זה כבר קרה: ${flagName(p, c.flagId)}`;
    }
    case 'questStep': {
      const done = !!s.questDone[`${c.questId}/${c.stepId}`];
      if (done === c.done) return null;
      const step = p.quests[c.questId]?.steps.find((x) => x.id === c.stepId)?.text ?? c.stepId;
      return c.done ? `עוד לא סיימת את השלב: ${step}` : `כבר סיימת את השלב: ${step}`;
    }
  }
}

export function conditionsMet(p: Project, s: GameState, cs: Condition[] = []): boolean {
  return cs.every((c) => checkCondition(p, s, c) === null);
}

function checkRule(p: Project, s: GameState, r: Rule): RuleCheck {
  const reasons: string[] = [];
  if (r.once && s.firedOnce.includes(r.id)) reasons.push('החוק הזה כבר קרה פעם אחת');
  for (const c of r.if) {
    const why = checkCondition(p, s, c);
    if (why) reasons.push(why);
  }
  return { ruleId: r.id, ruleName: r.name, passed: reasons.length === 0, reasons };
}

/** The first matching rule whose conditions pass wins. */
export function evaluate(p: Project, s: GameState, t: Trigger): Outcome {
  const listening = p.rules.filter((r) => matches(r.when, t));
  const checks = listening.map((r) => checkRule(p, s, r));
  const trace: Trace = { trigger: describeTrigger(p, t), checks };
  const winner = checks.find((c) => c.passed);
  if (winner) {
    const rule = listening.find((r) => r.id === winner.ruleId)!;
    trace.fired = rule.name;
    return { actions: rule.then, trace, ruleId: rule.id };
  }
  trace.fallback = fallbackMessage(p, t, listening);
  return { actions: [], trace };
}

function fallbackMessage(p: Project, t: Trigger, listening: Rule[]): string | undefined {
  const withElse = listening.find((r) => r.elseMessage);
  if (withElse) return withElse.elseMessage;
  switch (t.type) {
    case 'click': {
      const o = objectById(p, t.objectId);
      return o?.description || (o?.ref && p.items[o.ref]?.description) || 'אין פה שום דבר מיוחד.';
    }
    case 'useItem': return 'זה לא עובד.';
    case 'combine': return 'אי אפשר לחבר את שני אלה.';
    case 'enterScene': return undefined;
  }
}
