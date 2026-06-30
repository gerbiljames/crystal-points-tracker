// Resolve a location label to a region at runtime.
//
// The generated locationRegions.json covers every *static* apworld location.
// But a seed also places items on dynamic locations that aren't in that list:
// shop slots, trainer rematches, Mom's Savings. Those carry a fly-region or
// scaling suffix (".. - Champion", ".. - Olivine") that would mislead a naive
// keyword search, so we resolve from the label's FIRST segment (the real
// place) and parse "Route N" by number before falling back to keywords.

import areaTagsData from "../data/areaTags.json";
import labelKeywordsData from "../data/labelKeywords.json";

const areaTags = areaTagsData as Record<string, string>;
const labelKeywords = labelKeywordsData as [string, string][];

// Longer tags first so "Olivine Lighthouse" wins over a bare city match.
const areaTagEntries: [string, string][] = Object.entries(areaTags).sort(
  (a, b) => b[0].length - a[0].length,
);

const ROUTE_REGION: Record<string, string> = {};
for (const [tag, region] of Object.entries(areaTags)) {
  const m = tag.match(/^Route (\d+)$/);
  if (m) ROUTE_REGION[m[1]] = region;
}

function searchKeywords(text: string): string | undefined {
  for (const [tag, region] of areaTagEntries) if (text.includes(tag)) return region;
  for (const [kw, region] of labelKeywords) if (text.includes(kw)) return region;
  return undefined;
}

export function resolveRegion(label: string): string | undefined {
  const seg = label.split(" - ")[0];
  const route = seg.match(/^Route (\d+)/);
  if (route && ROUTE_REGION[route[1]]) return ROUTE_REGION[route[1]];
  return searchKeywords(seg) ?? searchKeywords(label);
}
