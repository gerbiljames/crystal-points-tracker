// Runtime access to the curated region list and the generated lookup tables.

import regionsData from "../data/regions.json";
import locationRegions from "../generated/locationRegions.json";
import itemPoints from "../generated/itemPoints.json";
import itemLabelsData from "../data/itemLabels.json";
import { resolveRegion } from "./regionResolve";

export interface Region {
  id: string;
  name: string;
  order: number;
}

export const REGIONS: Region[] = (regionsData as Region[]).slice().sort((a, b) => a.order - b.order);
export const REGION_BY_ID: Map<string, Region> = new Map(REGIONS.map((r) => [r.id, r]));

const LOCATION_REGIONS = locationRegions as Record<string, string>;
export const DEFAULT_ITEM_POINTS = itemPoints as Record<string, number>;

export function regionForLocation(label: string): string | undefined {
  // Static apworld locations hit the precise generated map; dynamic ones
  // (shops, rematches, Mom's Savings) fall through to the runtime resolver.
  return LOCATION_REGIONS[label] ?? resolveRegion(label);
}

/** Default (uncustomised) point value for an item display name, if it scores. */
export function defaultPointsForItem(item: string): number | undefined {
  return DEFAULT_ITEM_POINTS[item];
}

/** Scoring item display names, highest tier first. */
export const SCORING_ITEMS: string[] = Object.keys(DEFAULT_ITEM_POINTS).sort(
  (a, b) => DEFAULT_ITEM_POINTS[b] - DEFAULT_ITEM_POINTS[a] || a.localeCompare(b),
);

// Friendlier display names for items whose spoiler name is opaque (the TMs).
export const ITEM_LABELS = itemLabelsData as Record<string, string>;
export const displayName = (item: string): string => ITEM_LABELS[item] ?? item;
