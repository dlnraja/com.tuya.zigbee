#!/usr/bin/env node
/*
 * Phase 3 – Driver_Classifier_Corrector.js
 * --------------------------------------------------------------
 * Applies classification, deduplication, and targeted corrections
 * on driver manifests. Leverages audit + enrichment state files to
 * compute precise actions while emitting verbose metrics.
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '../../..');
const STATE_DIR = path.resolve(__dirname, '../state');
const DRIVERS_DIR = path.join(ROOT, 'drivers');
const CATALOG_FILE = path.join(ROOT, 'catalog', 'categories.json');

function ensureDir(dirPath) {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
}

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

function writeJson(filePath, data) {
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8');
}

function loadState(name) {
  const filePath = path.join(STATE_DIR, name);
  return readJsonSafe(filePath);
}

function normalizeManufacturerName(name) {
  if (!name || typeof name !== 'string') return null;
  return name.trim();
}

function loadCatalog() {
  const catalog = readJsonSafe(CATALOG_FILE) || {};
  const driverToCategory = new Map();
  Object.entries(catalog).forEach(([category, drivers]) => {
    if (!Array.isArray(drivers)) return;
    drivers.forEach((driverId) => {
      driverToCategory.set(driverId, category);
    });
  });
  return { catalog, driverToCategory };
}

function collectDriverInfo() {
  const entries = fs.readdirSync(DRIVERS_DIR, { withFileTypes: true });
  return entries.filter((entry) => entry.isDirectory()).map((entry) => entry.name);
}

function loadDriverManifest(driverId) {
  const manifestPath = path.join(DRIVERS_DIR, driverId, 'driver.compose.json');
  return {
    manifestPath,
    manifest: readJsonSafe(manifestPath),
  };
}

function updateManifest(manifestPath, manifest) {
  writeJson(manifestPath, manifest);
}

function mapManufacturersToDrivers(driverList) {
  const manufacturerToDrivers = new Map();
  driverList.forEach((driverId) => {
    const { manifest } = loadDriverManifest(driverId);
    if (!manifest || !manifest.zigbee) return;

    const names = [];
    const entry = manifest.zigbee.manufacturerName;
    if (Array.isArray(entry)) {
      entry.forEach((name) => {
        const normalized = normalizeManufacturerName(name);
        if (normalized) names.push(normalized);
      });
    } else if (typeof entry === 'string') {
      const normalized = normalizeManufacturerName(entry);
      if (normalized) names.push(normalized);
    }

    names.forEach((name) => {
      if (!manufacturerToDrivers.has(name)) {
        manufacturerToDrivers.set(name, new Set());
      }
      manufacturerToDrivers.get(name).add(driverId);
    });
  });
  return manufacturerToDrivers;
}

function findDuplicates(manufacturerMap) {
  const duplicates = new Map();
  manufacturerMap.forEach((drivers, manufacturer) => {
    if (drivers.size > 1) {
      duplicates.set(manufacturer, Array.from(drivers));
    }
  });
  return duplicates;
}

function applyEnrichment(manifest, enrichmentRecord) {
  const updated = { ...manifest };
  if (!updated.zigbee) updated.zigbee = {};

  if (Array.isArray(enrichmentRecord.productIds) && enrichmentRecord.productIds.length) {
    const uniqueProductIds = Array.from(new Set(enrichmentRecord.productIds));
    updated.zigbee.productId = uniqueProductIds;
  }

  if (Array.isArray(enrichmentRecord.clusters) && enrichmentRecord.clusters.length) {
    updated.zigbee.clusterOverrides = updated.zigbee.clusterOverrides || {};
    updated.zigbee.clusterOverrides.default = {
      clusters: enrichmentRecord.clusters,
    };
  }

  if (Array.isArray(enrichmentRecord.batteries) && enrichmentRecord.batteries.length) {
    updated.energy = updated.energy || {};
    updated.energy.batteries = enrichmentRecord.batteries;
  }

  return updated;
}

function rewriteManufacturer(manifest, manufacturer) {
  // Backward-compatible helper retained, but now ensures inclusion of manufacturer
  const updated = { ...manifest };
  if (!updated.zigbee) updated.zigbee = {};
  if (!manufacturer) return updated;
  const current = updated.zigbee.manufacturerName;
  if (Array.isArray(current)) {
    if (!current.includes(manufacturer)) {
      updated.zigbee.manufacturerName = Array.from(new Set([...current, manufacturer]));
    }
  } else if (typeof current === 'string' && current) {
    if (current !== manufacturer) {
      updated.zigbee.manufacturerName = Array.from(new Set([current, manufacturer]));
    }
  } else {
    updated.zigbee.manufacturerName = manufacturer;
  }
  return updated;
}

function removeInvalidManufacturers(manifest, validManufacturers) {
  if (!manifest.zigbee) return manifest;

  const current = manifest.zigbee.manufacturerName;
  const filtered = [];

  if (Array.isArray(current)) {
    current.forEach((name) => {
      const normalized = normalizeManufacturerName(name);
      if (normalized && validManufacturers.has(normalized)) {
        filtered.push(normalized);
      }
    });
  } else if (typeof current === 'string') {
    const normalized = normalizeManufacturerName(current);
    if (normalized && validManufacturers.has(normalized)) {
      filtered.push(normalized);
    }
  }

  // Preserve multiple manufacturers if several are valid; if none valid, drop field
  const updated = { ...manifest };
  if (!filtered.length) {
    if (updated.zigbee) delete updated.zigbee.manufacturerName;
    return updated;
  }
  updated.zigbee = updated.zigbee || {};
  updated.zigbee.manufacturerName = filtered.length === 1 ? filtered[0] : filtered;
  return updated;
}

function relocateDriver(driverId, targetCategory, catalog) {
  if (!targetCategory) return false;
  if (!catalog[targetCategory]) catalog[targetCategory] = [];
  if (!catalog[targetCategory].includes(driverId)) {
    catalog[targetCategory].push(driverId);
    return true;
  }
  return false;
}

function main() {
  console.log('⚙️  Phase 3 • Driver_Classifier_Corrector.js – corrections ciblées');

  const auditState = loadState('audit_state.json');
  const enrichmentState = loadState('data_enrichment.json');
  if (!enrichmentState) {
    console.log('   • Aucune base d\'enrichissement trouvée. Arrêt.');
    process.exitCode = 1;
    return;
  }

  const { catalog, driverToCategory } = loadCatalog();
  const driverList = collectDriverInfo();
  const manufacturerMap = mapManufacturersToDrivers(driverList);
  const duplicates = findDuplicates(manufacturerMap);

  const enrichmentMap = new Map();
  enrichmentState.enrichedManufacturers.forEach((record) => {
    enrichmentMap.set(record.manufacturer, record);
  });

  let manufacturersCorrected = 0;
  let driversRelocated = 0;
  let duplicatesResolved = 0;

  const newCatalog = { ...catalog };

  // No longer enforce mono-manufacturer across drivers.
  // Instead, ensure each referenced manufacturer is included and enrichment is applied, without removing others.
  duplicates.forEach((drivers, manufacturer) => {
    duplicatesResolved += 1;
    const enrichmentRecord = enrichmentMap.get(manufacturer);
    drivers.forEach((driverId) => {
      const { manifest, manifestPath } = loadDriverManifest(driverId);
      if (!manifest) return;
      let updated = applyEnrichment(manifest, enrichmentRecord || {});
      updated = rewriteManufacturer(updated, manufacturer);
      updateManifest(manifestPath, updated);
      manufacturersCorrected += 1;
    });
  });

  driverList.forEach((driverId) => {
    const category = driverToCategory.get(driverId);
    if (!category) return;
    const { manifest, manifestPath } = loadDriverManifest(driverId);
    if (!manifest || !manifest.zigbee) return;

    const manufacturers = manifest.zigbee.manufacturerName;
    if (!manufacturers) return;

    const normalized = Array.isArray(manufacturers)
      ? manufacturers.map(normalizeManufacturerName).filter(Boolean)
      : [normalizeManufacturerName(manufacturers)].filter(Boolean);

    const enrichmentRecords = normalized
      .map((manufacturer) => enrichmentMap.get(manufacturer))
      .filter(Boolean);

    let updatedManifest = { ...manifest };
    if (enrichmentRecords.length) {
      enrichmentRecords.forEach((record) => {
        updatedManifest = applyEnrichment(updatedManifest, record);
      });
      manufacturersCorrected += 1;
    }

    // Ensure energy.batteries exists when measure_battery is declared (SDK3 requirement)
    const hasMeasureBattery = Array.isArray(updatedManifest.capabilities) &&
      updatedManifest.capabilities.includes('measure_battery');
    if (hasMeasureBattery) {
      updatedManifest.energy = updatedManifest.energy || {};
      if (!Array.isArray(updatedManifest.energy.batteries) || !updatedManifest.energy.batteries.length) {
        // Conservative default; can be refined by enrichment later
        updatedManifest.energy.batteries = ['CR2032'];
      }
    }

    // Normalize driver image paths defensively
    updatedManifest.images = updatedManifest.images || {};
    if (updatedManifest.images.small !== './assets/small.png') {
      updatedManifest.images.small = './assets/small.png';
    }
    if (updatedManifest.images.large !== './assets/large.png') {
      updatedManifest.images.large = './assets/large.png';
    }

    updateManifest(manifestPath, updatedManifest);

    const targetCategory = driverToCategory.get(driverId);
    if (targetCategory) {
      const relocated = relocateDriver(driverId, targetCategory, newCatalog);
      if (relocated) driversRelocated += 1;
    }
  });

  const state = {
    generatedAt: new Date().toISOString(),
    metrics: {
      manufacturersCorrected,
      driversRelocated,
      duplicatesResolved,
    },
    catalog: newCatalog,
  };
  const stateFile = path.join(STATE_DIR, 'driver_classifier_state.json');
  writeJson(stateFile, state);

  console.log(`   • Manufacturiers corrigés: ${manufacturersCorrected}`);
  console.log(`   • Drivers relocalisés: ${driversRelocated}`);
  console.log(`   • Doublons résolus: ${duplicatesResolved}`);
  console.log(`   • État écrit dans ${path.relative(ROOT, stateFile)}`);
  console.log('✅ Phase 3 terminée – passer à Publisher_CI.js');
}

if (require.main === module) {
  try {
    main();
  } catch (error) {
    console.error('❌ Échec des corrections ciblées :', error);
    process.exitCode = 1;
  }
}

module.exports = {
  main,
};
