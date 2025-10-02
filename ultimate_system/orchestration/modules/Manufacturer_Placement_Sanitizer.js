#!/usr/bin/env node
/*
 * Manufacturer_Placement_Sanitizer.js
 * --------------------------------------------------------------
 * Enforce correct placement of manufacturer fields in driver.compose.json:
 * - Root-level `manufacturerName` is removed (moved into `zigbee.manufacturerName` if missing)
 * - `zigbee.manufacturerName` is collapsed to a single string (mono-fabricant)
 * - Remove non-SDK fields: `zigbee.manufacturerIds`, `zigbee.productIds`
 * - Normalize image paths (optional): keep `./assets/small.png` and `./assets/large.png`
 * Produces a summary in orchestration/state.
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '../../..');
const DRIVERS_DIR = path.join(ROOT, 'drivers');
const STATE_DIR = path.join(ROOT, 'ultimate_system', 'orchestration', 'state');

function readJsonSafe(filePath) {
  try { return JSON.parse(fs.readFileSync(filePath, 'utf8')); } catch (_) { return null; }
}
function writeJson(filePath, data) {
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8');
}
function ensureDir(dirPath) {
  if (!fs.existsSync(dirPath)) fs.mkdirSync(dirPath, { recursive: true });
}

function toSingleString(value) {
  if (!value) return null;
  if (typeof value === 'string') return value.trim();
  if (Array.isArray(value)) {
    const first = value.find((v) => typeof v === 'string' && v.trim());
    return first ? first.trim() : null;
  }
  return null;
}

function sanitizeManifest(manifest) {
  let changed = false;
  const m = { ...manifest };
  m.zigbee = m.zigbee || {};

  // Move root manufacturerName into zigbee if present
  if (typeof m.manufacturerName === 'string' && !m.zigbee.manufacturerName) {
    m.zigbee.manufacturerName = m.manufacturerName.trim();
    changed = true;
  }
  if (Object.prototype.hasOwnProperty.call(m, 'manufacturerName')) {
    delete m.manufacturerName;
    changed = true;
  }

  // Collapse zigbee.manufacturerName to a single string
  const single = toSingleString(m.zigbee.manufacturerName);
  if (single && m.zigbee.manufacturerName !== single) {
    m.zigbee.manufacturerName = single;
    changed = true;
  }

  // Remove non-SDK fields
  ['manufacturerIds', 'productIds'].forEach((key) => {
    if (Object.prototype.hasOwnProperty.call(m.zigbee, key)) {
      delete m.zigbee[key];
      changed = true;
    }
  });

  // Ensure productId is an array of strings if present
  if (typeof m.zigbee.productId === 'string') {
    m.zigbee.productId = [m.zigbee.productId];
    changed = true;
  }

  // Normalize images paths
  m.images = m.images || {};
  if (m.images.small !== './assets/small.png') { m.images.small = './assets/small.png'; changed = true; }
  if (m.images.large !== './assets/large.png') { m.images.large = './assets/large.png'; changed = true; }

  return { manifest: m, changed };
}

function main() {
  console.log('🧭 Sanitize manufacturer placement across drivers');
  const entries = fs.readdirSync(DRIVERS_DIR, { withFileTypes: true }).filter(e => e.isDirectory()).map(e => e.name);
  const summary = [];
  let updated = 0;

  entries.forEach((driverId) => {
    const file = path.join(DRIVERS_DIR, driverId, 'driver.compose.json');
    if (!fs.existsSync(file)) return;
    const data = readJsonSafe(file);
    if (!data) return;

    const { manifest, changed } = sanitizeManifest(data);
    if (changed) {
      writeJson(file, manifest);
      updated += 1;
      summary.push({ driver: driverId, action: 'sanitized' });
    }
  });

  ensureDir(STATE_DIR);
  const report = {
    generatedAt: new Date().toISOString(),
    driversScanned: entries.length,
    driversUpdated: updated,
    changes: summary.slice(0, 20),
  };
  fs.writeFileSync(path.join(STATE_DIR, 'manufacturer_placement_report.json'), JSON.stringify(report, null, 2), 'utf8');
  console.log(`✅ ${updated} drivers mis à jour. Rapport écrit dans ultimate_system/orchestration/state/manufacturer_placement_report.json`);
}

if (require.main === module) {
  try { main(); } catch (e) { console.error('❌ Échec:', e); process.exitCode = 1; }
}

module.exports = { main };
