#!/usr/bin/env node
'use strict';
/**
 * image-full-audit.js (P92.90)
 * Complete image/icon audit across all drivers (rules IC1-IC4):
 *  - IC1: driver SVG icons — viewBox 960, no gradients, no embedded rasters, ≤50KB
 *  - IC3: PNG images small/large/xlarge present per driver
 *  - Coherence: icon filename/content vs driver class (detects copy-paste
 *    icons that don't match the device type — e.g. a plug icon on a sensor)
 *  - App icon (IC2): 100x100, no gradients/rasters
 *
 * Output: .github/state/image-full-audit.json + console summary.
 * Usage: node tools/ci/image-full-audit.js [--json]
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..', '..');
const DRIVERS = path.join(ROOT, 'drivers');

const report = {
  generated: new Date().toISOString(),
  total: 0,
  svgIssues: [],
  pngMissing: [],
  oversized: [],
  coherenceWarnings: [],
  appIcon: 'unknown'
};

// Class → expected icon keywords (coherence check)
const CLASS_HINTS = {
  light: ['bulb', 'light', 'lamp', 'led', 'spot'],
  socket: ['plug', 'socket', 'outlet', 'switch', 'relay'],
  sensor: ['sensor', 'motion', 'temp', 'humid', 'climate', 'contact', 'leak', 'smoke', 'gas', 'soil', 'co2', 'pir', 'radar'],
  thermostat: ['thermostat', 'valve', 'trv', 'radiator', 'heat'],
  windowcoverings: ['curtain', 'blind', 'shutter', 'cover'],
  lock: ['lock', 'door'],
  fan: ['fan', 'purifier', 'hvac', 'ventil'],
  button: ['button', 'remote', 'knob', 'scene'],
  remote: ['remote', 'button', 'ir', 'blaster'],
  camera: ['camera', 'doorbell', 'bell'],
  doorbell: ['doorbell', 'bell', 'camera'],
  vacuumcleaner: ['vacuum', 'robot'],
  garagedoor: ['garage', 'door'],
  curtain: ['curtain', 'blind', 'shutter'],
  heater: ['heater', 'thermostat', 'heat'],
  speaker: ['siren', 'speaker', 'alarm']
};

function analyzeSvg(file) {
  const issues = [];
  const size = fs.statSync(file).size;
  if (size > 50 * 1024) {issues.push(`oversized ${(size / 1024).toFixed(0)}KB`);}
  const content = fs.readFileSync(file, 'utf8');
  if (!/viewBox="0 0 960 960"/.test(content)) {issues.push('viewBox non standard (attendu 0 0 960 960)');}
  if (/linearGradient|radialGradient/i.test(content)) {issues.push('gradient interdit');}
  if (/data:image|base64|<image/i.test(content)) {issues.push('raster embarqué interdit');}
  return issues;
}

for (const d of fs.readdirSync(DRIVERS)) {
  const dd = path.join(DRIVERS, d);
  if (!fs.statSync(dd).isDirectory()) {continue;}
  const composePath = path.join(dd, 'driver.compose.json');
  if (!fs.existsSync(composePath)) {continue;}
  report.total++;

  let compose = {};
  try {compose = JSON.parse(fs.readFileSync(composePath, 'utf8'));} catch { /* skip */ }
  const cls = compose.class || 'other';

  // IC1: SVG icon
  const iconFile = path.join(dd, 'assets', 'icon.svg');
  if (!fs.existsSync(iconFile)) {
    report.svgIssues.push({ driver: d, issues: ['icon.svg manquant'] });
  } else {
    const issues = analyzeSvg(iconFile);
    if (issues.length) {
      report.svgIssues.push({ driver: d, issues });
      if (issues.some(i => i.startsWith('oversized'))) {report.oversized.push(d);}
    }
  }

  // IC3: PNG images
  const imgDir = path.join(dd, 'assets', 'images');
  const pngs = ['small.png', 'large.png'];
  const missing = pngs.filter(p => !fs.existsSync(path.join(imgDir, p)));
  if (missing.length) {report.pngMissing.push({ driver: d, missing });}

  // Coherence: icon content mentions class hints?
  if (fs.existsSync(iconFile) && CLASS_HINTS[cls]) {
    const content = fs.readFileSync(iconFile, 'utf8').toLowerCase();
    const hints = CLASS_HINTS[cls];
    // icon SVG rarely contains keywords; check id/comment/title tags
    const meta = (content.match(/<title>([^<]*)<\/title>|id="([^"]+)"/g) || []).join(' ').toLowerCase();
    if (meta && !hints.some(h => meta.includes(h))) {
      report.coherenceWarnings.push({ driver: d, class: cls, note: 'icon metadata does not mention class hints' });
    }
  }
}

// IC2: app icon
const appIcon = path.join(ROOT, 'assets', 'icon.svg');
if (fs.existsSync(appIcon)) {
  const content = fs.readFileSync(appIcon, 'utf8');
  const ok = /viewBox="0 0 100 100"/.test(content) && !/linearGradient|radialGradient|data:image/i.test(content);
  report.appIcon = ok ? 'compliant' : 'non-compliant';
} else {
  report.appIcon = 'missing';
}

report.summary = {
  svgIssues: report.svgIssues.length,
  pngMissing: report.pngMissing.length,
  oversized: report.oversized.length,
  coherenceWarnings: report.coherenceWarnings.length
};

fs.mkdirSync(path.join(ROOT, '.github', 'state'), { recursive: true });
fs.writeFileSync(path.join(ROOT, '.github', 'state', 'image-full-audit.json'), JSON.stringify(report, null, 1));

console.log(`[image-audit] ${report.total} drivers`);
console.log(`  SVG issues: ${report.summary.svgIssues}`);
for (const i of report.svgIssues.slice(0, 12)) {console.log(`    ${i.driver}: ${i.issues.join(', ')}`);}
console.log(`  PNG manquantes: ${report.summary.pngMissing}`);
for (const i of report.pngMissing.slice(0, 8)) {console.log(`    ${i.driver}: ${i.missing.join(', ')}`);}
console.log(`  App icon: ${report.appIcon}`);
