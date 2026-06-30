// Seed-conditional point bumps, translated from the original's keyItems.js
// `upgradeModifier`/`upgradeAmt` system. The original reads a `Modifiers:`
// section; AP spoilers don't have one, so each modifier maps to the AP
// options-header flag that turns the same checks on. A rule fires (adding
// `amount` to the item) when ANY of its triggers passes. See src/data/upgrades.json.

import rulesData from "../data/upgrades.json";
import conditionalData from "../data/conditionalItems.json";

interface Trigger {
  option: string;
  test: "nonzero" | "truthy" | "notEquals" | "equals";
  value?: string;
}
interface Rule {
  item: string;
  amount: number;
  modifier: string;
  triggers: Trigger[];
}
interface ConditionalRule {
  item: string; // spoiler item name to match
  points: number; // value when active
  triggers: Trigger[];
}

const RULES = rulesData as Rule[];
const CONDITIONAL = conditionalData as ConditionalRule[];
const FALSEY = new Set(["", "off", "no", "none", "vanilla", "0", "disabled", "false"]);

const truthy = (v?: string) => v != null && !FALSEY.has(v.trim().toLowerCase());
const num = (v?: string) => {
  const n = parseInt((v ?? "").trim(), 10);
  return Number.isNaN(n) ? 0 : n;
};

function passes(t: Trigger, opts: Record<string, string>): boolean {
  const v = opts[t.option];
  switch (t.test) {
    case "nonzero":
      return num(v) !== 0;
    case "truthy":
      return truthy(v);
    // A missing option is "no information" — never fire on it.
    case "notEquals":
      return v != null && v.trim() !== t.value;
    case "equals":
      return v != null && v.trim() === t.value;
  }
  return false;
}

/** item display name -> bonus points granted by active seed modifiers. */
export function upgradeBonuses(opts: Record<string, string> = {}): Record<string, number> {
  const out: Record<string, number> = {};
  for (const r of RULES) {
    if (r.triggers.some((t) => passes(t, opts))) out[r.item] = (out[r.item] ?? 0) + r.amount;
  }
  return out;
}

/** Active modifiers, the items they uplift, and the bump amount — for display. */
export function activeModifiers(
  opts: Record<string, string> = {},
): { modifier: string; items: string[]; amount: number }[] {
  const m = new Map<string, { items: string[]; amount: number }>();
  for (const r of RULES) {
    if (r.triggers.some((t) => passes(t, opts))) {
      const entry = m.get(r.modifier) ?? { items: [], amount: r.amount };
      entry.items.push(r.item);
      m.set(r.modifier, entry);
    }
  }
  return [...m.entries()].map(([modifier, { items, amount }]) => ({ modifier, items, amount }));
}

/**
 * Items that only score when a seed setting turns their checks on (e.g. Sweet
 * Scent under dexsanity). Returns spoiler item name -> point value, active only.
 */
export function conditionalPoints(opts: Record<string, string> = {}): Record<string, number> {
  const out: Record<string, number> = {};
  for (const r of CONDITIONAL) {
    if (r.triggers.some((t) => passes(t, opts))) out[r.item] = r.points;
  }
  return out;
}
