#!/usr/bin/env node
// find-incoherent-icons.js - Find drivers whose icons don't follow the design system
'use strict';
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..', '..');
const DRIVERS_DIR = path.join(ROOT, 'drivers');

const EXPECTED_VIEWBOX = '0 0 960 960';
const EXPECTED_SMALL = 75;
const EXPECTED_LARGE = 500;

const drivers = fs.readdirSync(DRIVERS_DIR).filter(d =>
  fs.existsSync(path.join(DRIVERS_DIR, d, 'driver.compose.json')));

const issues = [];
const stats = {
  total: drivers.length,
  withSvg: 0,
  withSmall: 0,
  withLarge: 0,
  coherent: 0,
};

for (const d of drivers) {
  const dir = path.join(DRIVERS_DIR, d, 'assets');
  const issues4d = [];

  // SVG
  const svgPath = path.join(dir, 'icon.svg');
  if (fs.existsSync(svgPath)) {
    stats.withSvg++;
    const c = fs.readFileSync(svgPath, 'utf8');
    const vb = (c.match(/viewBox="([^"]+)"/) || [])[1];
    if (vb && vb !== EXPECTED_VIEWBOX) {
      issues4d.push('viewBox=' + vb);
    }
    const hasMoji = ['Ǹ', 'Ǭ', 'Ǡ', 'Ǧ', 'Ã©', 'Ã¨', '��'].some(m => c.includes(m));
    if (hasMoji) issues4d.push('mojibake');
  } else {
    issues4d.push('no-svg');
  }

  // PNGs
  const smallPath = path.join(dir, 'images', 'small.png');
  if (fs.existsSync(smallPath)) {
    stats.withSmall++;
    const buf = fs.readFileSync(smallPath);
    if (buf[0] === 0x89 && buf[1] === 0x50) {
      const w = buf.readUInt32BE(16);
      const h = buf.readUInt32BE(20);
      if (w !== EXPECTED_SMALL || h !== EXPECTED_SMALL) {
        issues4d.push('small=' + w + 'x' + h);
      }
    }
  } else {
    issues4d.push('no-small');
  }

  const largePath = path.join(dir, 'images', 'large.png');
  if (fs.existsSync(largePath)) {
    stats.withLarge++;
    const buf = fs.readFileSync(largePath);
    if (buf[0] === 0x89 && buf[1] === 0x50) {
      const w = buf.readUInt32BE(16);
      const h = buf.readUInt32BE(20);
      if (w !== EXPECTED_LARGE || h !== EXPECTED_LARGE) {
        issues4d.push('large=' + w + 'x' + h);
      }
    }
  } else {
    issues4d.push('no-large');
  }

  if (issues4d.length === 0) {
    stats.coherent++;
  } else {
    issues.push({ driver: d, issues: issues4d });
  }
}

console.log('=== DESIGN SYSTEM COHERENCE ===');
console.log('Total drivers:', stats.total);
console.log('With SVG:', stats.withSvg, '/', stats.total);
console.log('With small PNG:', stats.withSmall);
console.log('With large PNG:', stats.withLarge);
console.log('Fully coherent:', stats.coherent, '/', stats.total, '(' + ((stats.coherent / stats.total) * 100).toFixed(1) + '%)');
console.log('Incoherent:', issues.length);

console.log('\n=== TOP 30 INCOHERENT DRIVERS ===');
const grouped = {};
for (const i of issues) {
  for (const issue of i.issues) {
    if (!grouped[issue]) grouped[issue] = [];
    grouped[issue].push(i.driver);
  }
}
for (const [issue, drivers] of Object.entries(grouped).sort((a, b) => b[1].length - a[1].length)) {
  console.log('  ' + issue + ': ' + drivers.length + ' drivers');
  drivers.slice(0, 5).forEach(d => console.log('    - ' + d));
  if (drivers.length > 5) console.log('    ... and ' + (drivers.length - 5) + ' more');
}

// Save full list
fs.writeFileSync('.github/state/icon-coherence-issues.json', JSON.stringify(issues, null, 2));
console.log('\n✓ Full list: .github/state/icon-coherence-issues.json');
