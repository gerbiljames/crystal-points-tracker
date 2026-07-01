// App-wide reactive state: the loaded spoiler (one slot only), what the player
// has found, and the derived per-region scores. Persisted to localStorage so a
// refresh keeps the in-progress race.
//
// On upload we parse every slot, but only ever KEEP one: a single-slot spoiler
// commits immediately; a multi-slot one is held in `pending` until the user
// picks their slot via the dialog, then only that slot's data is retained.

import { createRoot, createMemo, createEffect, createSignal } from "solid-js";
import { createStore, reconcile } from "solid-js/store";
import { Placement, parseOptionsBySlot, crystalSlotName, SOLO_SLOT } from "./lib/spoiler";
import { SpoilerSource } from "./lib/source";
import { scorePlacements, regionScores } from "./lib/scoring";
import { ITEM_LABELS } from "./lib/data";
import { upgradeBonuses, activeModifiers, conditionalPoints } from "./lib/upgrades";
import { load, save } from "./lib/storage";

const KEY = "crystal-points:v1";
const OVERRIDES_KEY = "crystal-points:overrides:v1";
const REVEAL_KEY = "crystal-points:reveal:v1";

export interface Session {
  fileName: string | null;
  slot: string | null;
  placements: Placement[]; // chosen slot only
  options: Record<string, string>; // chosen slot's options header
  found: Record<string, boolean>; // location label -> found
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
};

// ---------- global preferences (independent of the loaded seed) ----------
// Custom point values and the reveal toggle used to live inside the session
// blob; they're now their own persisted keys so a seed reset never wipes them.

function migrate(): void {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return;
    const legacy = JSON.parse(raw);
    if (!legacy || typeof legacy !== "object") return;
    if (localStorage.getItem(OVERRIDES_KEY) == null && legacy.overrides)
      save(OVERRIDES_KEY, legacy.overrides);
    if (localStorage.getItem(REVEAL_KEY) == null && typeof legacy.revealPoints === "boolean")
      save(REVEAL_KEY, legacy.revealPoints);
    // Drop the now-global props so the session blob stops carrying dead data.
    if ("overrides" in legacy || "revealPoints" in legacy) {
      delete legacy.overrides;
      delete legacy.revealPoints;
      save(KEY, legacy);
    }
  } catch {
    /* private mode / bad json — nothing to migrate */
  }
}
migrate();

// item name -> custom point value
export const [itemOverrides, _setItemOverrides] = createSignal<Record<string, number>>(
  load<Record<string, number>>(OVERRIDES_KEY, {}),
);
export function setItemOverride(item: string, points: number | null): void {
  const next = { ...itemOverrides() };
  if (points === null) delete next[item];
  else next[item] = points;
  _setItemOverrides(next);
  save(OVERRIDES_KEY, next);
}
export function clearItemOverrides(): void {
  _setItemOverrides({});
  save(OVERRIDES_KEY, {});
}

export const [revealPoints, _setReveal] = createSignal<boolean>(load<boolean>(REVEAL_KEY, true));
export function setReveal(v: boolean): void {
  _setReveal(v);
  save(REVEAL_KEY, v);
}

export const [settingsOpen, setSettingsOpen] = createSignal(false);

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
    scorePlacements(session.placements, itemOverrides(), bonuses(), conditional(), ITEM_LABELS),
  );
  const scores = createMemo(() => regionScores(scored(), session.found));

  return { session, setSession, pending, setPending, modifiers, conditional, scored, scores };
}

const store = createRoot(build);

export const session = store.session;
export const scored = store.scored;
export const scores = store.scores;
export const modifiers = store.modifiers;
export const conditional = store.conditional;
export const pending = store.pending;

function commit(p: Pending, slot: string): void {
  store.setSession({
    fileName: p.fileName,
    slot,
    placements: p.placements.filter((pl) => pl.slot === slot),
    options: p.optionsBySlot[slot] ?? {},
    found: {},
  });
  store.setPending(null);
}

export async function loadSpoilerFile(file: File): Promise<void> {
  const text = await file.text();
  const source = new SpoilerSource(file.name, text);
  let slots = source.slots();
  let placements = source.allPlacements();
  const optionsBySlot = parseOptionsBySlot(text);

  // Solo spoilers don't carry the slot name in placement lines (we tag them
  // SOLO_SLOT). Recover the real name from the Crystal world's header line.
  if (slots.length === 1 && slots[0] === SOLO_SLOT) {
    const name = crystalSlotName(text);
    if (name && name !== SOLO_SLOT) {
      placements = placements.map((pl) => ({ ...pl, slot: name }));
      if (optionsBySlot[SOLO_SLOT]) {
        optionsBySlot[name] = optionsBySlot[SOLO_SLOT];
        delete optionsBySlot[SOLO_SLOT];
      }
      slots = [name];
    }
  }

  const p: Pending = { fileName: file.name, slots, placements, optionsBySlot };
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

export function resetAll(): void {
  store.setPending(null);
  store.setSession(reconcile(EMPTY));
}
