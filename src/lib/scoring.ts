// Turns a slot's placements into per-region point totals.

import { Placement } from "./spoiler";
import { REGIONS, regionForLocation, defaultPointsForItem } from "./data";

export interface ScoredItem {
  item: string; // display label (friendlier name when one exists)
  location: string; // unique key for a single placement
  region: string;
  points: number;
}

export interface RegionScore {
  id: string;
  name: string;
  total: number; // points of every scoring item placed in the region
  remaining: number; // points of items not yet marked found
  found: ScoredItem[]; // items the player has located (revealed in the basket)
  count: number; // number of scoring items in the region
}

/**
 * Scoring items in this slot, one entry per placement. `overrides` maps an
 * item display name to a custom point value (0 removes it from scoring).
 * `bonuses` adds seed-modifier uplift on top of a scoring item's base value.
 */
export function scorePlacements(
  placements: Placement[],
  overrides: Record<string, number> = {},
  bonuses: Record<string, number> = {},
  conditionalBase: Record<string, number> = {},
  labels: Record<string, string> = {},
): ScoredItem[] {
  const out: ScoredItem[] = [];
  for (const p of placements) {
    const base = p.item in overrides
      ? overrides[p.item]
      : (defaultPointsForItem(p.item) ?? conditionalBase[p.item]);
    if (!base) continue; // undefined/0 -> not a scoring key item
    const region = regionForLocation(p.location);
    if (!region) continue;
    out.push({
      item: labels[p.item] ?? p.item,
      location: p.location,
      region,
      points: base + (bonuses[p.item] ?? 0),
    });
  }
  return out;
}

export function regionScores(
  scored: ScoredItem[],
  found: Record<string, boolean>,
): RegionScore[] {
  const byRegion = new Map<string, ScoredItem[]>();
  for (const s of scored) {
    const list = byRegion.get(s.region) || [];
    list.push(s);
    byRegion.set(s.region, list);
  }
  return REGIONS.map((r) => {
    const items = byRegion.get(r.id) || [];
    const foundItems = items.filter((i) => found[i.location]);
    const total = items.reduce((n, i) => n + i.points, 0);
    const remaining = items.reduce((n, i) => n + (found[i.location] ? 0 : i.points), 0);
    return { id: r.id, name: r.name, total, remaining, found: foundItems, count: items.length };
  });
}
