// Build-time data generation.
//
// Reads the AP-Crystal apworld data (locations.json / items.json) and the
// curated tables under src/data, then emits two lookup tables the app uses
// at runtime:
//   src/generated/locationRegions.json  locationLabel -> regionId
//   src/generated/itemPoints.json       itemDisplayName -> point value
//
// Run via `npm run gen` (also chained before dev/build).

import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, "..");
const dataDir = resolve(root, "src/data");
const outDir = resolve(root, "src/generated");

// Location of the AP-Crystal world data. Override with AP_DATA_DIR if the
// sibling checkout lives elsewhere.
const apDataDir =
  process.env.AP_DATA_DIR ||
  resolve(root, "../Archipelago-Crystal/worlds/pokemon_crystal_prerelease/data");

// The generated tables are committed, so a build without the sibling apworld
// checkout (e.g. CI) just uses what's on disk. Only regenerate when the source
// data is present; error only if there's nothing to fall back on.
if (!existsSync(resolve(apDataDir, "locations.json"))) {
  const haveOutputs =
    existsSync(resolve(outDir, "locationRegions.json")) &&
    existsSync(resolve(outDir, "itemPoints.json"));
  if (haveOutputs) {
    console.log(`gen: apworld data not found at ${apDataDir} — using committed generated tables.`);
    process.exit(0);
  }
  console.error(
    `gen: apworld data not found at ${apDataDir} and no committed tables to fall back on.\n` +
      `     Set AP_DATA_DIR to the pokemon_crystal_prerelease/data directory.`,
  );
  process.exit(1);
}

const readJson = (p) => JSON.parse(readFileSync(p, "utf8"));

const apLocations = readJson(resolve(apDataDir, "locations.json"));
const apItems = readJson(resolve(apDataDir, "items.json"));
const regions = readJson(resolve(dataDir, "regions.json"));
const areaTags = readJson(resolve(dataDir, "areaTags.json"));
const labelKeywords = readJson(resolve(dataDir, "labelKeywords.json"));
const ignoreLabels = readJson(resolve(dataDir, "ignoreLabels.json"));
const itemTiers = readJson(resolve(dataDir, "itemTiers.json"));

const regionIds = new Set(regions.map((r) => r.id));

// Sanity-check the curated tables point at real region ids.
for (const [tag, id] of Object.entries(areaTags))
  if (!regionIds.has(id)) console.warn(`! areaTags["${tag}"] -> unknown region "${id}"`);
for (const [kw, id] of labelKeywords)
  if (!regionIds.has(id)) console.warn(`! labelKeyword "${kw}" -> unknown region "${id}"`);

function resolveRegion(label, tags) {
  for (const t of tags) if (areaTags[t]) return areaTags[t];
  for (const [kw, id] of labelKeywords) if (label.includes(kw)) return id;
  return null;
}

const locationRegions = {};
const unresolved = [];
for (const loc of Object.values(apLocations)) {
  const label = loc.label;
  if (!label) continue;
  if (ignoreLabels.some((s) => label.includes(s))) continue;
  const region = resolveRegion(label, loc.tags || []);
  if (region) locationRegions[label] = region;
  else unresolved.push(label);
}

const itemPoints = {};
const missingItems = [];
for (const [id, points] of Object.entries(itemTiers)) {
  const item = apItems[id];
  if (!item) {
    missingItems.push(id);
    continue;
  }
  itemPoints[item.name] = points;
}

mkdirSync(outDir, { recursive: true });
writeFileSync(
  resolve(outDir, "locationRegions.json"),
  JSON.stringify(locationRegions, null, 0) + "\n",
);
writeFileSync(
  resolve(outDir, "itemPoints.json"),
  JSON.stringify(itemPoints, null, 0) + "\n",
);

console.log(
  `generated: ${Object.keys(locationRegions).length} locations mapped, ` +
    `${Object.keys(itemPoints).length} scoring items.`,
);
if (missingItems.length)
  console.warn(`! ${missingItems.length} tier ids absent from items.json: ${missingItems.join(", ")}`);
if (unresolved.length) {
  console.warn(`! ${unresolved.length} locations could not be mapped to a region:`);
  for (const l of unresolved) console.warn(`    ${l}`);
}
