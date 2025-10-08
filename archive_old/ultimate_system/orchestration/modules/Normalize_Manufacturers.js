#!/usr/bin/env node
/*
 * Normalize_Manufacturers.js
 * --------------------------------------------------------------
 * Ensures that every driver manifest contains a single
 * `zigbee.manufacturerName`, picking the best candidate using the
 * enrichment database produced in Phase 2. Produces a summary in the
 * orchestration state directory for audit trail.
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '../../..');
const DRIVERS_DIR = path.join(ROOT, 'drivers');
const STATE_DIR = path.join(ROOT, 'ultimate_system', 'orchestration', 'state');
const ENRICHMENT_FILE = path.join(STATE_DIR, 'data_enrichment.json');
const OUTPUT_FILE = path.join(STATE_DIR, 'manufacturer_normalization.json');

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function readJsonSafe(filePath) {
  try {
    return readJson(filePath);
  } catch (error) {
    return null;
  }
}

function ensureDir(dirPath) {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
}

function collectDrivers(dir) {
  return fs.readdirSync(dir, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name);
}

function scoreRecord(record) {
  if (!record) return 0;
  const productScore = (record.productIds || []).length * 4;
  const clusterScore = (record.clusters || []).length * 2;
  const dpScore = (record.dps || []).length;
  const batteryScore = (record.batteries || []).length;
  return productScore + clusterScore + dpScore + batteryScore;
}

function normaliseCandidates(value) {
  if (!value) return [];
  if (typeof value === 'string') return [value.trim()];
  if (Array.isArray(value)) {
    const seen = new Set();
    return value
      .map((entry) => (typeof entry === 'string' ? entry.trim() : null))
      .filter((entry) => entry && !seen.has(entry) && seen.add(entry));
  }
  return [];
}

function choosePrimary(candidates, enrichmentMap) {
  if (!candidates.length) return null;
  const scored = candidates.map((name) => ({
    name,
    score: scoreRecord(enrichmentMap.get(name)),
  }));
  scored.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    return a.name.localeCompare(b.name);
  });
  return scored[0].name;
}

function updateManifest(filePath, manifest, manufacturer) {
  const updated = { ...manifest };
  updated.zigbee = updated.zigbee || {};
  if (manufacturer) {
    updated.zigbee.manufacturerName = manufacturer;
  } else {
    delete updated.zigbee.manufacturerName;
  }
  // Remove any root-level manufacturerName to avoid duplication
  if (Object.prototype.hasOwnProperty.call(updated, 'manufacturerName')) {
    delete updated.manufacturerName;
  }
  fs.writeFileSync(filePath, JSON.stringify(updated, null, 2), 'utf8');
}

function main() {
  console.log('🧹 Normalisation des manufacturerName');

  const enrichment = readJsonSafe(ENRICHMENT_FILE);
  if (!enrichment) {
    console.error(`❌ Base d\'enrichissement introuvable : ${path.relative(ROOT, ENRICHMENT_FILE)}`);
    process.exitCode = 1;
    return;
  }

  const enrichmentMap = new Map();
  (enrichment.enrichedManufacturers || []).forEach((record) => {
    enrichmentMap.set(record.manufacturer, record);
  });

  const driverIds = collectDrivers(DRIVERS_DIR);
  const summary = [];

  driverIds.forEach((driverId) => {
    const manifestPath = path.join(DRIVERS_DIR, driverId, 'driver.compose.json');
    if (!fs.existsSync(manifestPath)) return;

    const manifest = readJsonSafe(manifestPath);
    if (!manifest || !manifest.zigbee) return;

    const original = manifest.zigbee.manufacturerName;
    const candidates = normaliseCandidates(original);

    if (candidates.length <= 1) {
      if (candidates.length === 1) {
        // Trim and ensure string
        const primary = candidates[0];
        if (typeof original !== 'string' || original.trim() !== primary) {
          updateManifest(manifestPath, manifest, primary);
          summary.push({ driver: driverId, action: 'normalized_string', chosen: primary });
        }
      }
      if (candidates.length === 0 && original) {
        // Non-string manufacturer (unlikely)
        updateManifest(manifestPath, manifest, null);
        summary.push({ driver: driverId, action: 'removed_invalid', removed: String(original) });
      }
      return;
    }

    const primary = choosePrimary(candidates, enrichmentMap) || candidates[0];
    const removed = candidates.filter((name) => name !== primary);

    updateManifest(manifestPath, manifest, primary);
    summary.push({
      driver: driverId,
      action: 'collapsed',
      chosen: primary,
      removed,
      totalBefore: candidates.length,
    });
  });

  ensureDir(STATE_DIR);
  const output = {
    generatedAt: new Date().toISOString(),
    driversProcessed: driverIds.length,
    changes: summary,
  };
  fs.writeFileSync(OUTPUT_FILE, JSON.stringify(output, null, 2), 'utf8');
  console.log(`✅ Normalisation terminée, résumé dans ${path.relative(ROOT, OUTPUT_FILE)}`);
}

if (require.main === module) {
  try {
    main();
  } catch (error) {
    console.error('❌ Échec de la normalisation mono-fabricant :', error);
    process.exitCode = 1;
  }
}

module.exports = {
  main,
};
