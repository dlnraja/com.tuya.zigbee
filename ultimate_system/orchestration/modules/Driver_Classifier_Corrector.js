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

// Cap manufacturerName list based on relevance to current PIDs and category usage
function capManufacturers(manifest, enrichmentMap, categoryPidIndex, category, maxCount = 12) {
  if (!manifest?.zigbee) return manifest;
  const current = manifest.zigbee.manufacturerName;
  const mlist = Array.isArray(current) ? current.slice() : (current ? [current] : []);
  if (!mlist.length) return manifest;

  const pids = Array.isArray(manifest.zigbee.productId)
    ? manifest.zigbee.productId.map((p) => (typeof p === 'string' ? p.trim().toUpperCase() : String(p).trim().toUpperCase())).filter(Boolean)
    : [];
  const catKnown = categoryPidIndex.get(category) || new Set();

  const scored = mlist.map((m) => {
    const rec = enrichmentMap.get(m) || {};
    const recPids = Array.isArray(rec.productIds)
      ? rec.productIds.map((p) => (typeof p === 'string' ? p.trim().toUpperCase() : String(p).trim().toUpperCase())).filter(Boolean)
      : [];
    let pidIntersect = 0;
    let catIntersect = 0;
    recPids.forEach((rp) => {
      if (pids.includes(rp)) pidIntersect += 1;
      if (catKnown.has(rp)) catIntersect += 1;
    });
    const score = pidIntersect * 2 + catIntersect; // prioritize direct intersection
    return { m, score };
  });

  scored.sort((a, b) => b.score - a.score || a.m.localeCompare(b.m));
  const keep = scored.slice(0, Math.max(1, maxCount)).map((s) => s.m);

  const updated = { ...manifest };
  updated.zigbee.manufacturerName = keep.length === 1 ? keep[0] : Array.from(new Set(keep));
  return updated;
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

  // Merge productIds (do not replace)
  if (Array.isArray(enrichmentRecord.productIds) && enrichmentRecord.productIds.length) {
    const existing = Array.isArray(updated.zigbee.productId) ? updated.zigbee.productId : [];
    const merged = Array.from(new Set([...existing, ...enrichmentRecord.productIds]));
    if (merged.length) updated.zigbee.productId = merged;
  }

  // Merge clusters into clusterOverrides.default.clusters (union)
  if (Array.isArray(enrichmentRecord.clusters) && enrichmentRecord.clusters.length) {
    updated.zigbee.clusterOverrides = updated.zigbee.clusterOverrides || {};
    const prev = updated.zigbee.clusterOverrides.default && Array.isArray(updated.zigbee.clusterOverrides.default.clusters)
      ? updated.zigbee.clusterOverrides.default.clusters
      : [];
    const merged = Array.from(new Set([...(prev || []), ...enrichmentRecord.clusters]))
      .filter((n) => Number.isFinite(n))
      .sort((a, b) => a - b);
    updated.zigbee.clusterOverrides.default = { clusters: merged };
  }

  // Merge batteries (union)
  if (Array.isArray(enrichmentRecord.batteries) && enrichmentRecord.batteries.length) {
    updated.energy = updated.energy || {};
    const prev = Array.isArray(updated.energy.batteries) ? updated.energy.batteries : [];
    const merged = Array.from(new Set([...prev, ...enrichmentRecord.batteries]));
    if (merged.length) updated.energy.batteries = merged;
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

// Heuristic: infer a broad device category from a Tuya TS model code.
// Returns one of: 'light' | 'socket' | 'sensor' | 'button' | null
function inferCategoryFromTS(ts) {
  if (!ts || typeof ts !== 'string') return null;
  const s = ts.toUpperCase();
  // Lighting families: bulbs, LED controllers
  if (/^TS05\d/.test(s)) return 'light';
  if (/^TS110/.test(s)) return 'light';
  // Socket/relay families
  if (/^TS010/.test(s) || /^TS011/.test(s)) return 'socket';
  // Buttons/remotes
  if (/^TS021/.test(s) || /^TS030/.test(s) || /^TS004/.test(s)) return 'button';
  // Sensors (motion/contact/env)
  if (/^TS020/.test(s) || /^TS022/.test(s) || s === 'TS0901') return 'sensor';
  // Many others (e.g., TS0601) are too generic → do not filter
  return null;
}

// Filter manufacturers to those that map to at least one remaining productId
function filterManufacturersByProductIds(manifest, enrichmentMap) {
  if (!manifest?.zigbee) return manifest;
  const current = manifest.zigbee.manufacturerName;
  const pids = Array.isArray(manifest.zigbee.productId)
    ? manifest.zigbee.productId.map((p) => (typeof p === 'string' ? p.trim().toUpperCase() : String(p).trim().toUpperCase())).filter(Boolean)
    : [];
  if (!current || !pids.length) return manifest;

  const origList = Array.isArray(current) ? current.slice() : [current];
  const keep = [];
  origList.forEach((m) => {
    const rec = enrichmentMap.get(m);
    if (!rec) return; // no info → drop unless nothing else remains
    const recPids = Array.isArray(rec.productIds) ? rec.productIds.map((p) => String(p).trim().toUpperCase()) : [];
    const ok = recPids.some((pid) => pids.includes(pid));
    if (ok) keep.push(m);
  });

  const updated = { ...manifest };
  if (keep.length) {
    updated.zigbee.manufacturerName = keep.length === 1 ? keep[0] : Array.from(new Set(keep));
  } else {
    // fallback: preserve the first original value to avoid emptying field
    updated.zigbee.manufacturerName = Array.isArray(current) ? current[0] : current;
  }
  return updated;
}

// Derive manufacturerName strictly from the current productIds using the reverse index
function setManufacturersFromPids(manifest, productIdToManufacturers) {
  if (!manifest?.zigbee) return manifest;
  const pids = Array.isArray(manifest.zigbee.productId)
    ? manifest.zigbee.productId
        .map((p) => (typeof p === 'string' ? p.trim().toUpperCase() : String(p).trim().toUpperCase()))
        .filter(Boolean)
    : [];
  if (!pids.length) return manifest;

  const derived = new Set();
  pids.forEach((pid) => {
    const mset = productIdToManufacturers.get(pid);
    if (mset) mset.forEach((m) => derived.add(m));
  });

  if (!derived.size) return manifest;

  const updated = { ...manifest };
  const arr = Array.from(new Set([...derived]));
  updated.zigbee.manufacturerName = arr.length === 1 ? arr[0] : arr.sort();
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

  // Reverse index: productId -> Set(manufacturers) for cross-enrichment
  const productIdToManufacturers = new Map();
  enrichmentState.enrichedManufacturers.forEach((record) => {
    const pids = Array.isArray(record.productIds) ? record.productIds : [];
    pids.forEach((pidRaw) => {
      const pid = typeof pidRaw === 'string' ? pidRaw.trim().toUpperCase() : String(pidRaw).trim().toUpperCase();
      if (!pid) return;
      if (!productIdToManufacturers.has(pid)) productIdToManufacturers.set(pid, new Set());
      productIdToManufacturers.get(pid).add(record.manufacturer);
    });
  });

  // Curated overrides (prefix-based PID allowlists, class corrections)
  const curatedOverrides = readJsonSafe(path.join(STATE_DIR, 'curated_overrides.json')) || {};

  // Build category -> Set(productIds) observed across current drivers (for conservative cross-check)
  const categoryPidIndex = new Map();
  driverList.forEach((d) => {
    const cat = driverToCategory.get(d);
    if (!cat) return;
    const { manifest } = loadDriverManifest(d);
    const ids = Array.isArray(manifest?.zigbee?.productId) ? manifest.zigbee.productId : [];
    ids.forEach((pidRaw) => {
      const pid = typeof pidRaw === 'string' ? pidRaw.trim().toUpperCase() : String(pidRaw).trim().toUpperCase();
      if (!pid) return;
      if (!categoryPidIndex.has(cat)) categoryPidIndex.set(cat, new Set());
      categoryPidIndex.get(cat).add(pid);
    });
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

    const normalized = Array.isArray(manufacturers)
      ? manufacturers.map(normalizeManufacturerName).filter(Boolean)
      : (manufacturers ? [normalizeManufacturerName(manufacturers)].filter(Boolean) : []);

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

    // Cross-enrich manufacturers by intersecting productIds with external mappings
    const driverPids = Array.isArray(updatedManifest?.zigbee?.productId)
      ? updatedManifest.zigbee.productId.map((p) => (typeof p === 'string' ? p.trim().toUpperCase() : String(p).trim().toUpperCase())).filter(Boolean)
      : [];
    if (driverPids.length) {
      const extraManufacturers = new Set();
      driverPids.forEach((pid) => {
        const mset = productIdToManufacturers.get(pid);
        if (mset) mset.forEach((m) => extraManufacturers.add(m));
      });
      if (extraManufacturers.size) {
        extraManufacturers.forEach((m) => {
          updatedManifest = rewriteManufacturer(updatedManifest, m);
        });
      }
    }

    // Apply curated overrides per driver (PID prefixes and class)
    const ov = curatedOverrides[driverId];
    if (ov && Array.isArray(ov.allowProductIdPrefixes) && updatedManifest.zigbee && Array.isArray(updatedManifest.zigbee.productId)) {
      const prefs = ov.allowProductIdPrefixes.map((x) => String(x).toUpperCase());
      const before = updatedManifest.zigbee.productId.slice();
      const after = before.filter((pid) => {
        const p = typeof pid === 'string' ? pid.trim().toUpperCase() : String(pid).trim().toUpperCase();
        return prefs.some((pf) => p.startsWith(pf));
      });
      if (after.length > 0 && after.length <= before.length) {
        updatedManifest.zigbee.productId = Array.from(new Set(after));
      }
    }
    if (ov && ov.class && updatedManifest.class !== ov.class) {
      updatedManifest.class = ov.class;
    }

    // Apply curated endpoint bindings (override OTA etc.)
    if (ov && Array.isArray(ov.bindings)) {
      updatedManifest.zigbee = updatedManifest.zigbee || {};
      updatedManifest.zigbee.endpoints = updatedManifest.zigbee.endpoints || {};
      const ep1 = updatedManifest.zigbee.endpoints['1'] || {};
      ep1.bindings = Array.from(new Set(ov.bindings));
      updatedManifest.zigbee.endpoints['1'] = ep1;
    }

    // Apply curated batteries preference
    if (ov && Array.isArray(ov.batteries) && ov.batteries.length) {
      updatedManifest.energy = updatedManifest.energy || {};
      updatedManifest.energy.batteries = Array.from(new Set(ov.batteries));
    }

    // First pass: filter productIds by inferred category only (conservative)
    if (updatedManifest.zigbee && Array.isArray(updatedManifest.zigbee.productId) && updatedManifest.zigbee.productId.length) {
      const original = updatedManifest.zigbee.productId.slice();
      const filteredByCategory = original.filter((pid) => {
        const p = typeof pid === 'string' ? pid.trim().toUpperCase() : String(pid).trim().toUpperCase();
        const inf = inferCategoryFromTS(p);
        return !inf || inf === category;
      });
      if (filteredByCategory.length > 0 && filteredByCategory.length < original.length) {
        updatedManifest.zigbee.productId = Array.from(new Set(filteredByCategory));
      }
    }

    // Trim manufacturers by PID intersection (now that PIDs are category-filtered)
    updatedManifest = filterManufacturersByProductIds(updatedManifest, enrichmentMap);

    // Second pass: remove unknown TS not mapped to the now-trimmed manufacturers
    if (updatedManifest.zigbee && Array.isArray(updatedManifest.zigbee.productId) && updatedManifest.zigbee.productId.length) {
      const original2 = updatedManifest.zigbee.productId.slice();
      const mlist2 = Array.isArray(updatedManifest.zigbee.manufacturerName)
        ? updatedManifest.zigbee.manufacturerName
        : (updatedManifest.zigbee.manufacturerName ? [updatedManifest.zigbee.manufacturerName] : []);
      const knownSet2 = new Set();
      mlist2.forEach((m) => {
        const rec = enrichmentMap.get(m);
        if (rec && Array.isArray(rec.productIds)) {
          rec.productIds.forEach((p) => {
            const u = typeof p === 'string' ? p.trim().toUpperCase() : String(p).trim().toUpperCase();
            if (u) knownSet2.add(u);
          });
        }
      });
      const catKnown = categoryPidIndex.get(category) || new Set();
      if (knownSet2.size) {
        const filteredByKnown = original2.filter((pid) => {
          const p = typeof pid === 'string' ? pid.trim().toUpperCase() : String(pid).trim().toUpperCase();
          const inf = inferCategoryFromTS(p);
          if (inf) return inf === category; // already ensured by first pass but keep invariant
          // unknown family: require presence in both manufacturer known set and category-observed set
          return knownSet2.has(p) && catKnown.has(p);
        });
        if (filteredByKnown.length > 0 && filteredByKnown.length < original2.length) {
          updatedManifest.zigbee.productId = Array.from(new Set(filteredByKnown));
        }
      }
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

    // After second-pass filtering, trim manufacturers again by PID intersection
    updatedManifest = filterManufacturersByProductIds(updatedManifest, enrichmentMap);

    // Aggressive consolidation for unbranded/over-broad sets: derive directly from PIDs
    updatedManifest = setManufacturersFromPids(updatedManifest, productIdToManufacturers);

    // Cap manufacturer list size by relevance to category and PIDs
    updatedManifest = capManufacturers(updatedManifest, enrichmentMap, categoryPidIndex, category, 12);

    // Normalize driver image paths defensively
    updatedManifest.images = updatedManifest.images || {};
    if (updatedManifest.images.small !== './assets/small.png') {
      updatedManifest.images.small = './assets/small.png';
    }
    if (updatedManifest.images.large !== './assets/large.png') {
      updatedManifest.images.large = './assets/large.png';
    }

    updateManifest(manifestPath, updatedManifest);

    // Determine target category: curated override wins if it maps to a known catalog category
    const overrideCategory = (ov && typeof ov.class === 'string' && newCatalog[ov.class]) ? ov.class : null;
    const targetCategory = overrideCategory || driverToCategory.get(driverId);
    if (targetCategory) {
      // If an override category is set, remove the driver from all other categories first
      if (overrideCategory) {
        Object.keys(newCatalog).forEach((cat) => {
          if (cat === targetCategory) return;
          const arr = newCatalog[cat];
          if (Array.isArray(arr)) {
            newCatalog[cat] = arr.filter((d) => d !== driverId);
          }
        });
      }
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

  // Persist updated catalog categories
  writeJson(CATALOG_FILE, newCatalog);

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
