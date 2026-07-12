#!/usr/bin/env node
/**
 * design-system-audit.js
 *
 * Audits the existing driver image design system:
 *  - PNG dimensions and sizes
 *  - SVG viewBox conventions
 *  - Color palettes
 *  - Style patterns
 *
 * @author Mavis continuous flow 2026-07-12
 */

'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..', '..');
const DRIVERS_DIR = path.join(ROOT, 'drivers');

const SAMPLES = [
  'contact_sensor', 'motion_sensor', 'plug', 'bulb_dimmable', 'climate_sensor',
  'water_leak_sensor', 'switch_1gang', 'thermostat', 'dimmer_1_gang',
  'button_wireless_1', 'smoke_detector_advanced', 'soil_sensor', 'door_sensor',
  'valve_irrigation', 'presence_detector', 'air_purifier', 'gas_sensor', 'illuminance_sensor',
];

function parsePNG(buf) {
  if (buf[0] !== 0x89 || buf[1] !== 0x50) return null;
  return { width: buf.readUInt32BE(16), height: buf.readUInt32BE(20), size: buf.length };
}

function parseSVG(content) {
  const viewBox = (content.match(/viewBox=["']([^"']+)["']/) || [])[1];
  const fillMatch = content.match(/fill=["']#([0-9A-Fa-f]{6})["']/g) || [];
  const colors = [...new Set(fillMatch.map(m => '#' + m.match(/#([0-9A-Fa-f]{6})/)[1].toUpperCase()))];
  return { viewBox, colors };
}

function main() {
  console.log('=== DESIGN SYSTEM AUDIT ===\n');

  const pngStats = { sizes: new Map(), missing: [] };
  const svgStats = { viewBoxes: new Map(), palettes: new Map() };

  for (const d of SAMPLES) {
    const imgDir = path.join(DRIVERS_DIR, d, 'assets', 'images');
    for (const f of ['small.png', 'large.png']) {
      const fp = path.join(imgDir, f);
      if (fs.existsSync(fp)) {
        const data = parsePNG(fs.readFileSync(fp));
        if (data) {
          const key = data.width + 'x' + data.height;
          pngStats.sizes.set(key, (pngStats.sizes.get(key) || 0) + 1);
        }
      } else {
        pngStats.missing.push(d + '/' + f);
      }
    }

    const svgPath = path.join(DRIVERS_DIR, d, 'assets', 'icon.svg');
    if (fs.existsSync(svgPath)) {
      const data = parseSVG(fs.readFileSync(svgPath, 'utf8'));
      if (data.viewBox) {
        svgStats.viewBoxes.set(data.viewBox, (svgStats.viewBoxes.get(data.viewBox) || 0) + 1);
      }
      for (const c of data.colors) {
        svgStats.palettes.set(c, (svgStats.palettes.get(c) || 0) + 1);
      }
    } else {
      pngStats.missing.push(d + '/icon.svg');
    }
  }

  console.log('=== PNG RESOLUTIONS ===');
  [...pngStats.sizes.entries()].sort((a, b) => b[1] - a[1]).forEach(([k, v]) => {
    console.log('  ' + k + ': ' + v + ' drivers');
  });

  console.log('\n=== SVG VIEWBOXES ===');
  [...svgStats.viewBoxes.entries()].sort((a, b) => b[1] - a[1]).forEach(([k, v]) => {
    console.log('  ' + k + ': ' + v + ' drivers');
  });

  console.log('\n=== SVG PALETTE TOP 10 ===');
  [...svgStats.palettes.entries()].sort((a, b) => b[1] - a[1]).slice(0, 10).forEach(([k, v]) => {
    console.log('  ' + k + ': ' + v + ' occurrences');
  });

  console.log('\n=== MISSING ===');
  pngStats.missing.slice(0, 15).forEach(m => console.log('  ' + m));
  console.log('  Total missing:', pngStats.missing.length);
}

if (require.main === module) main();
