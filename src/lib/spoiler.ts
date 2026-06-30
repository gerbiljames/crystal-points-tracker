// Parses an Archipelago spoiler log (`*_Spoiler.txt`).
//
// In the Locations section each placement is one line. Multiworld spoilers
// carry the player names:
//   {Location} ({Slot}): {Item} ({Receiver})
// Single-player spoilers drop the parentheticals:
//   {Location}: {Item}
// We accept both and fall back to a synthetic slot for the solo form.

export interface Placement {
  location: string;
  slot: string;
  item: string;
  receiver: string;
}

export const SOLO_SLOT = "Player 1";

const MULTI_LINE = /^(.*) \(([^()]+)\): (.*) \(([^()]+)\)$/;

export function parseSpoiler(text: string): Placement[] {
  const placements: Placement[] = [];
  let inLocations = false;
  for (const raw of text.split(/\r?\n/)) {
    const line = raw.trimEnd();
    if (/^Locations:\s*$/.test(line)) {
      inLocations = true;
      continue;
    }
    if (!inLocations) continue;
    if (!line) continue;
    // A bare `Header:` line (e.g. "Playthrough:") ends the section.
    if (/^\S.*:\s*$/.test(line) && !line.includes(": ")) break;

    const multi = line.match(MULTI_LINE);
    if (multi) {
      placements.push({ location: multi[1], slot: multi[2], item: multi[3], receiver: multi[4] });
      continue;
    }
    const idx = line.indexOf(": ");
    if (idx > 0) {
      const location = line.slice(0, idx);
      const item = line.slice(idx + 2).trim();
      placements.push({ location, slot: SOLO_SLOT, item, receiver: SOLO_SLOT });
    }
  }
  return placements;
}

export function slotsIn(placements: Placement[]): string[] {
  return [...new Set(placements.map((p) => p.slot))].sort();
}

/**
 * The `Name: value` options header above the Locations section, scoped per
 * slot. A multiworld spoiler prefixes each player's option block with a
 * `Player N: <name>` line; a solo spoiler omits it, so its single block is
 * bucketed under SOLO_SLOT (matching how parseSpoiler labels solo placements).
 * Used to read seed modifiers (shopsanity, dexsanity, …) for the chosen slot.
 */
export function parseOptionsBySlot(text: string): Record<string, Record<string, string>> {
  const bySlot: Record<string, Record<string, string>> = {};
  let bucket: Record<string, string> = (bySlot[SOLO_SLOT] = {});
  for (const raw of text.split(/\r?\n/)) {
    const line = raw.trim();
    if (/^Locations:\s*$/.test(line)) break;
    const player = line.match(/^Player \d+:\s*(.+)$/);
    if (player) {
      const name = player[1].trim();
      bucket = bySlot[name] = bySlot[name] ?? {};
      continue;
    }
    const idx = line.indexOf(":");
    if (idx <= 0) continue;
    const key = line.slice(0, idx).trim();
    const value = line.slice(idx + 1).trim();
    if (key) bucket[key] = value;
  }
  return bySlot;
}
