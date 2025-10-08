#!/usr/bin/env node
/*
 * Phase 2 – Data_Enricher.js
 * --------------------------------------------------------------
 * Agrège les informations fabricants/produits depuis des sources
 * hétérogènes, applique des heuristiques de normalisation et
 * consigne un référentiel unifié pour les phases suivantes.
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '../../..');
const STATE_DIR = path.resolve(__dirname, '../state');
const REFERENCES_DIR = path.join(ROOT, 'ultimate_system', 'references_moved');
const DATA_SOURCES_DIR = path.join(ROOT, 'ultimate_system', 'data_sources');
const EXTERNAL_SOURCES_DIR = path.join(ROOT, '.external_sources');
const ROOT_REFERENCES_DIR = path.join(ROOT, 'references');

const SOURCE_FILES = [
  'enriched_manufacturer_db.json',
  'mega_manufacturer_db.json',
  'ultra_mfg_database.json',
  'scraping_holistique_v18.json',
  'web_scraped_v10.json',
  'scraping_v16.json',
];

const OPTIONAL_FILES = [
  'github.json',
  'github_data.json',
];

const MANUFACTURER_KEYS = [
  'manufacturerName',
  'manufacturerNames',
  'manufacturer',
  'manufacturers',
  'manufacturerId',
  'manufacturerIds',
  'manufacturerIDs',
  'mfg',
  'brands',
  'brand',
  'vendor',
  'vendors',
];

const PRODUCT_KEYS = [
  'productId',
  'productIds',
  'productIDs',
  'products',
  'prod',
  'model',
  'models',
];

const CLUSTER_KEYS = [
  'clusters',
  'clusterIds',
  'clusterIDs',
  'zigbeeClusters',
  'tuyaClusters',
];

const DP_KEYS = [
  'dps',
  'dp',
  'tuyaDp',
  'tuyaDps',
  'tuyaDP',
  'tuyaDPs',
];

const BATTERY_KEYS = [
  'batteries',
  'battery',
  'batteryTypes',
  'batteryType',
];

const SOURCE_HINT_KEYS = [
  'source',
  'sources',
  'origin',
  'reference',
  'references',
  'url',
  'urls',
];

const STOP_WORDS = new Set([
  'completed',
  'status',
  'sources',
  'google',
  'twitter',
  'reddit',
  'github',
  'homey',
  'domotique',
  'timepernetwork',
  'timerange',
  'notes',
  'heritage',
  'itemsfound',
  'searchterms',
]);

function ensureDir(dirPath) {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
}

function readJsonSafe(filePath) {
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
  } catch (error) {
    return null;
  }
}

function loadAuditMetrics() {
  return readJsonSafe(path.join(STATE_DIR, 'audit_state.json')) || null;
}

function collectStrings(value) {
  if (value === undefined || value === null) return [];
  if (typeof value === 'string') return [value];
  if (typeof value === 'number') return [String(value)];
  if (Array.isArray(value)) {
    return value.flatMap((entry) => collectStrings(entry));
  }
  return [];
}

function toNumberArray(values) {
  return collectStrings(values)
    .map((entry) => {
      if (entry.startsWith('0x') || entry.startsWith('0X')) {
        const parsed = Number.parseInt(entry, 16);
        return Number.isNaN(parsed) ? null : parsed;
      }
      const parsed = Number.parseInt(entry, 10);
      return Number.isNaN(parsed) ? null : parsed;
    })
    .filter((value) => Number.isFinite(value));
}

function toStringArray(values) {
  return collectStrings(values)
    .map((entry) => entry.trim())
    .filter((entry) => entry.length > 0);
}

function normalizeManufacturer(name) {
  if (!name) return null;
  const trimmed = name.trim();
  if (!trimmed) return null;
  const lower = trimmed.toLowerCase();
  if (STOP_WORDS.has(lower)) return null;
  if (/^ts[0-9a-z_-]+$/i.test(trimmed)) return null; // product ID masquerading as manufacturer
  if (trimmed.startsWith('_') && trimmed.length > 4) return trimmed;
  if (/^[0-9a-z_-]+$/i.test(trimmed) && /_/i.test(trimmed)) return trimmed;
  const knownBrands = ['tuya', 'lonsonho', 'zemismart', 'moes', 'lidl', 'aubess', 'matsee', 'nous'];
  if (knownBrands.includes(lower)) return trimmed;
  if (/^[A-Z][A-Za-z0-9-]{3,}$/.test(trimmed) && !STOP_WORDS.has(lower)) return trimmed;
  return null;
}

function normalizeProductId(candidate) {
  if (!candidate) return null;
  const trimmed = candidate.trim();
  if (!trimmed) return null;
  if (/^ts[0-9a-z_-]{2,}$/i.test(trimmed)) return trimmed.toUpperCase();
  if (/^0x[0-9a-f]{2,}$/i.test(trimmed)) return trimmed.toLowerCase();
  if (/^[A-Z]{2,}[0-9]{1,}$/i.test(trimmed)) return trimmed.toUpperCase();
  return null;
}

function normalizeBattery(candidate) {
  const trimmed = candidate.trim();
  if (!trimmed) return null;
  if (/^cr[0-9]{3,}$/i.test(trimmed)) return trimmed.toUpperCase();
  if (/^(aaa|aa|c|d|lr03|lr6)$/i.test(trimmed)) return trimmed.toUpperCase();
  return null;
}

function pathToString(pathParts) {
  if (!pathParts.length) return 'root';
  return pathParts.join('.');
}

function registerRecord(map, stats, manufacturer, data) {
  if (!manufacturer) return;
  if (!map.has(manufacturer)) {
    map.set(manufacturer, {
      manufacturer,
      productIds: new Set(),
      clusters: new Set(),
      dps: new Set(),
      batteries: new Set(),
      sources: new Set(),
      notes: new Set(),
    });
  }
  const record = map.get(manufacturer);
  data.productIds.forEach((productId) => {
    record.productIds.add(productId);
    stats.productIds.add(productId);
  });
  data.clusters.forEach((cluster) => {
    record.clusters.add(cluster);
    stats.clusters.add(cluster);
  });
  data.dps.forEach((dp) => {
    record.dps.add(dp);
    stats.dps.add(dp);
  });
  data.batteries.forEach((battery) => {
    record.batteries.add(battery);
    stats.batteries.add(battery);
  });
  data.sources.forEach((source) => {
    if (source) record.sources.add(source);
  });
  if (data.note) {
    record.notes.add(data.note);
  }
}

function processArray(node, origin, pathParts, map, stats, rejected) {
  const strings = node.filter((entry) => typeof entry === 'string' || typeof entry === 'number');
  if (strings.length) {
    const manufacturers = strings
      .map((entry) => normalizeManufacturer(String(entry)))
      .filter(Boolean);
    const productIds = strings
      .map((entry) => normalizeProductId(String(entry)))
      .filter(Boolean);

    if (manufacturers.length) {
      const note = pathToString(pathParts);
      manufacturers.forEach((manufacturer) => {
        registerRecord(map, stats, manufacturer, {
          productIds,
          clusters: [],
          dps: [],
          batteries: [],
          sources: [origin],
          note,
        });
      });
    }
  }

  node.forEach((entry, index) => {
    if (entry && typeof entry === 'object') {
      processNode(entry, origin, pathParts.concat(`[${index}]`), map, stats, rejected);
    }
  });
}

function processObject(node, origin, pathParts, map, stats, rejected) {
  const manufacturerCandidatesRaw = MANUFACTURER_KEYS
    .flatMap((key) => (key in node ? collectStrings(node[key]) : []));
  const productCandidatesRaw = PRODUCT_KEYS
    .flatMap((key) => (key in node ? collectStrings(node[key]) : []));
  const clustersRaw = CLUSTER_KEYS
    .flatMap((key) => (key in node ? collectStrings(node[key]) : []));
  const dpsRaw = DP_KEYS
    .flatMap((key) => (key in node ? collectStrings(node[key]) : []));
  const batteriesRaw = BATTERY_KEYS
    .flatMap((key) => (key in node ? collectStrings(node[key]) : []));
  const sourceHints = SOURCE_HINT_KEYS
    .flatMap((key) => (key in node ? collectStrings(node[key]) : []))
    .map((entry) => entry.trim())
    .filter((entry) => entry.length > 0);

  const manufacturers = manufacturerCandidatesRaw
    .map((entry) => normalizeManufacturer(entry))
    .filter(Boolean);

  const productIds = productCandidatesRaw
    .map((entry) => normalizeProductId(entry))
    .filter(Boolean);

  const clusters = toNumberArray(clustersRaw);
  const dps = toNumberArray(dpsRaw);
  const batteries = batteriesRaw
    .map((entry) => normalizeBattery(entry))
    .filter(Boolean);

  if (manufacturers.length) {
    const note = pathToString(pathParts);
    const sources = new Set([origin, ...sourceHints]);
    manufacturers.forEach((manufacturer) => {
      registerRecord(map, stats, manufacturer, {
        productIds,
        clusters,
        dps,
        batteries,
        sources: Array.from(sources),
        note,
      });
    });
  } else if (manufacturerCandidatesRaw.length) {
    rejected.push({
      file: origin,
      context: pathToString(pathParts),
      reason: 'missing_valid_manufacturer',
      sample: manufacturerCandidatesRaw.slice(0, 5),
    });
  }

  Object.entries(node).forEach(([key, value]) => {
    if (value && typeof value === 'object') {
      processNode(value, origin, pathParts.concat(key), map, stats, rejected);
    }
  });
}

function processNode(node, origin, pathParts, map, stats, rejected) {
  if (Array.isArray(node)) {
    processArray(node, origin, pathParts, map, stats, rejected);
  } else if (node && typeof node === 'object') {
    processObject(node, origin, pathParts, map, stats, rejected);
  }
}

function gatherFromFile(filePath, type, map, stats, rejected, sources) {
  if (!fs.existsSync(filePath)) return;
  const payload = readJsonSafe(filePath);
  if (!payload) return;
  const origin = path.relative(ROOT, filePath);
  sources.push({ file: origin, type });
  processNode(payload, origin, [], map, stats, rejected);
}

function gatherSourceData() {
  const accepted = new Map();
  const rejected = [];
  const sources = [];
  const stats = {
    productIds: new Set(),
    clusters: new Set(),
    dps: new Set(),
    batteries: new Set(),
  };

  SOURCE_FILES.forEach((fileName) => {
    const filePath = path.join(REFERENCES_DIR, fileName);
    gatherFromFile(filePath, 'reference', accepted, stats, rejected, sources);
  });

  OPTIONAL_FILES.forEach((fileName) => {
    const filePath = path.join(ROOT, 'ultimate_system', fileName);
    gatherFromFile(filePath, 'optional', accepted, stats, rejected, sources);
  });

  if (fs.existsSync(DATA_SOURCES_DIR)) {
    fs.readdirSync(DATA_SOURCES_DIR, { withFileTypes: true })
      .filter((entry) => entry.isFile() && entry.name.endsWith('.json'))
      .forEach((entry) => {
        const filePath = path.join(DATA_SOURCES_DIR, entry.name);
        gatherFromFile(filePath, 'local', accepted, stats, rejected, sources);
      });
  }

  // Also gather root-level references if present (e.g. references/*.json)
  if (fs.existsSync(ROOT_REFERENCES_DIR)) {
    fs.readdirSync(ROOT_REFERENCES_DIR, { withFileTypes: true })
      .filter((entry) => entry.isFile() && entry.name.endsWith('.json'))
      .forEach((entry) => {
        const filePath = path.join(ROOT_REFERENCES_DIR, entry.name);
        gatherFromFile(filePath, 'root_reference', accepted, stats, rejected, sources);
      });
  }

  // Include external analysis dumps (e.g. forum/community processed JSON)
  if (fs.existsSync(EXTERNAL_SOURCES_DIR)) {
    fs.readdirSync(EXTERNAL_SOURCES_DIR, { withFileTypes: true })
      .filter((entry) => entry.isFile() && entry.name.endsWith('.json'))
      .forEach((entry) => {
        const filePath = path.join(EXTERNAL_SOURCES_DIR, entry.name);
        gatherFromFile(filePath, 'external', accepted, stats, rejected, sources);
      });
  }

  const enriched = Array.from(accepted.values())
    .map((record) => ({
      manufacturer: record.manufacturer,
      productIds: Array.from(record.productIds).sort(),
      clusters: Array.from(record.clusters).sort((a, b) => a - b),
      dps: Array.from(record.dps).sort((a, b) => a - b),
      batteries: Array.from(record.batteries).sort(),
      sources: Array.from(record.sources).sort(),
      notes: Array.from(record.notes).sort(),
    }))
    .sort((a, b) => a.manufacturer.localeCompare(b.manufacturer));

  return {
    sources,
    enriched,
    rejected,
    stats,
  };
}

function saveState(state) {
  ensureDir(STATE_DIR);
  const stateFile = path.join(STATE_DIR, 'data_enrichment.json');
  fs.writeFileSync(stateFile, JSON.stringify(state, null, 2), 'utf8');
  return stateFile;
}

function main() {
  console.log('⚙️  Phase 2 • Data_Enricher.js – agrégation multi-source');

  const auditState = loadAuditMetrics();
  if (auditState) {
    console.log(`   • Contexte audit : ${auditState.metrics.drivers} drivers, ${auditState.metrics.manufacturers} fabricants`);
  }

  const enrichment = gatherSourceData();

  const totalManufacturers = enrichment.enriched.length;
  const totalProductIds = enrichment.stats.productIds.size;
  const totalClusters = enrichment.stats.clusters.size;
  const totalDps = enrichment.stats.dps.size;
  const totalBatteries = enrichment.stats.batteries.size;
  const rejectedCount = enrichment.rejected.length;

  console.log(`   • Fabricants enrichis : ${totalManufacturers}`);
  console.log(`   • Product IDs référencés : ${totalProductIds}`);
  console.log(`   • Clusters référencés : ${totalClusters}`);
  console.log(`   • Tuya DPs référencés : ${totalDps}`);
  console.log(`   • Batteries référencées : ${totalBatteries}`);
  console.log(`   • Rejets à revue manuelle : ${rejectedCount}`);

  const state = {
    generatedAt: new Date().toISOString(),
    metrics: {
      sourcesProcessed: enrichment.sources,
      manufacturers: totalManufacturers,
      productIds: totalProductIds,
      clusters: totalClusters,
      dps: totalDps,
      batteries: totalBatteries,
      rejected: rejectedCount,
    },
    enrichedManufacturers: enrichment.enriched,
    rejectedEntries: enrichment.rejected,
  };

  const stateFile = saveState(state);
  console.log(`   • Base d'enrichissement persistée dans ${path.relative(ROOT, stateFile)}`);
  console.log('✅ Phase 2 terminée – passer à Driver_Classifier_Corrector.js');
}

if (require.main === module) {
  try {
    main();
  } catch (error) {
    console.error('❌ Échec de l\'enrichissement multi-source :', error);
    process.exitCode = 1;
  }
}

module.exports = {
  main,
};
