#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');

const DRIVERS_DIR = path.join(__dirname, '../../drivers');

function processFile(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');
  let changed = false;

  // Pattern for manufacturerNames starting with _tz, _ty
  // We want to uppercase the prefix: _tze -> _TZE, _tz3000 -> _TZ3000, _tyzb -> _TYZB, _tyst -> _TYST
  const patterns = [
    { search: /"_tze/g, replace: '"_TZE' },
    { search: /"_tz3/g, replace: '"_TZ3' },
    { search: /"_tyz/g, replace: '"_TYZ' },
    { search: /"_tys/g, replace: '"_TYS' },
    { search: /"_tz2/g, replace: '"_TZ2' },
    { search: /"_tzn/g, replace: '"_TZN' }
  ];

  patterns.forEach(p => {
    if (p.search.test(content)) {
      content = content.replace(p.search, p.replace);
      changed = true;
    }
  });

  if (changed) {
    fs.writeFileSync(filePath, content);
    console.log(`  [RECOVERED] ${filePath}`);
  }
}

function walk(dir) {
  const files = fs.readdirSync(dir);
  files.forEach(file => {
    const fullPath = path.join(dir, file);
    if (fs.statSync(fullPath).isDirectory()) {
      walk(fullPath);
    } else if (file === 'driver.compose.json') {
      processFile(fullPath);
    }
  });
}

console.log('Starting Fingerprint Case Recovery...');
walk(DRIVERS_DIR);
console.log('Done.');
