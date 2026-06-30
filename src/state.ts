// App-wide reactive state: the loaded spoiler (one slot only), what the player
// has found, and the derived per-region scores. Persisted to localStorage so a
// refresh keeps the in-progress race.
//
// On upload we parse every slot, but only ever KEEP one: a single-slot spoiler
// commits immediately; a multi-slot one is held in `pending` until the user
// picks their slot via the dialog, then only that slot's data is retained.

import { createRoot, createMemo, createEffect, createSignal } from "solid-js";
import { createStore, reconcile } from "solid-js/store";
import { Placement, parseOptionsBySlot } from "./lib/spoiler";
import { SpoilerSource } from "./lib/source";
import { scorePlacements, regionScores } from "./lib/scoring";
import { ITEM_LABELS } from "./lib/data";
import { upgradeBonuses, activeModifiers, conditionalPoints } from "./lib/upgrades";
import { load, save } from "./lib/storage";

const KEY = "crystal-points:v1";

export interface Session {
  fileName: string | null;
  slot: string | null;
  placements: Placement[]; // chosen slot only
  options: Record<string, string>; // chosen slot's options header
  found: Record<string, boolean>; // location label -> found
  overrides: Record<string, number>; // item name -> custom point value
  revealPoints: boolean;
}

// A freshly-uploaded multi-slot spoiler, awaiting the user's slot choice.
export interface Pending {
  fileName: string;
  slots: string[];
  placements: Placement[];
  optionsBySlot: Record<string, Record<string, string>>;
}

const EMPTY: Session = {
  fileName: null,
  slot: null,
  placements: [],
  options: {},
  found: {},
  overrides: {},
  revealPoints: true,
};

function build() {
  // Merge over EMPTY so a session persisted by an older schema can't leave
  // required keys undefined.
  const [session, setSession] = createStore<Session>({ ...EMPTY, ...load(KEY, {}) });
  const [pending, setPending] = createSignal<Pending | null>(null);
  createEffect(() => save(KEY, { ...session }));

  const bonuses = createMemo(() => upgradeBonuses(session.options));
  const conditional = createMemo(() => conditionalPoints(session.options));
  const modifiers = createMemo(() => activeModifiers(session.options));
  const scored = createMemo(() =>
    scorePlacements(session.placements, session.overrides, bonuses(), conditional(), ITEM_LABELS),
  );
  const scores = createMemo(() => regionScores(scored(), session.found));

  return { session, setSession, pending, setPending, modifiers, scored, scores };
}

const store = createRoot(build);

export const session = store.session;
export const scored = store.scored;
export const scores = store.scores;
export const modifiers = store.modifiers;
export const pending = store.pending;

function commit(p: Pending, slot: string): void {
  store.setSession({
    fileName: p.fileName,
    slot,
    placements: p.placements.filter((pl) => pl.slot === slot),
    options: p.optionsBySlot[slot] ?? {},
    found: {},
    // keep any custom point overrides across uploads
  });
  store.setPending(null);
}

export async function loadSpoilerFile(file: File): Promise<void> {
  const text = await file.text();
  const source = new SpoilerSource(file.name, text);
  const p: Pending = {
    fileName: file.name,
    slots: source.slots(),
    placements: source.allPlacements(),
    optionsBySlot: parseOptionsBySlot(text),
  };
  if (p.slots.length <= 1) commit(p, p.slots[0] ?? "");
  else store.setPending(p);
}

/** Resolve the pending multi-slot upload to the chosen slot. */
export function selectSlot(slot: string): void {
  const p = store.pending();
  if (p) commit(p, slot);
}

export function cancelUpload(): void {
  store.setPending(null);
}

export function toggleFound(location: string): void {
  store.setSession("found", location, (v) => !v);
}

export function setReveal(v: boolean): void {
  store.setSession("revealPoints", v);
}

export function setOverride(item: string, points: number | null): void {
  if (points === null) store.setSession("overrides", item, undefined as any);
  else store.setSession("overrides", item, points);
}

export function resetAll(): void {
  store.setPending(null);
  store.setSession(reconcile(EMPTY));
}
