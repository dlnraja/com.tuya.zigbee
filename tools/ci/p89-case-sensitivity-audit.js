#!/usr/bin/env node
/**
 * p89-case-sensitivity-audit.js
 * =========================================================================
 * Comprehensive case-sensitivity audit:
 *  1. Find all `toLowerCase` calls in lib/ that touch manufacturerName/productId
 *  2. Find all `toLowerCase` calls in lib/ that touch cluster/attribute names
 *  3. Find case-sensitive duplicate mfrs in driver.compose.json
 *  4. Find case-sensitive duplicate mfrs in mfs_db.json
 *  5. Find case-sensitive duplicate mfrs in app.json
 *  6. Find files that use toLowerCase but DON'T use TuyaNormalizer
 *  7. Count normalization coverage
 */
'use strict';
const fs = require('fs');
const path = require('path');
const cp = require('child_process');

const ROOT = path.resolve(__dirname, '..', '..');
const OUT = path.join(ROOT, '.github', 'state', 'p89-case-sensitivity-audit.json');

function listJsFiles(dir) {
  return cp.execSync(
    `powershell -NoProfile -Command "Get-ChildItem -Path '${dir}' -Recurse -File -Include '*.js' | Select-Object -ExpandProperty FullName"`,
    { encoding: 'utf8' }
  ).split(/\r?\n/).filter(Boolean);
}

function findToLowerCaseContext(files) {
  const findings = [];
  for (const f of files) {
    const content = fs.readFileSync(f, 'utf8');
    const lines = content.split(/\r?\n/);
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      if (line.includes('toLowerCase')) {
        // Categorize by what comes before
        const trimmed = line.trim();
        let category = 'other';
        if (/manufacturer|mfr|productId|pid|model/i.test(trimmed)) category = 'mfr-or-pid';
        else if (/cluster|attribute|ep\.|endpoint|cmd|command|dir/i.test(trimmed)) category = 'cluster-or-attr';
        else if (/type|brand|model|name/i.test(trimmed)) category = 'name-or-type';
        findings.push({ file: f.replace(/\\/g, '/'), line: i+1, code: trimmed.slice(0, 150), category });
      }
    }
  }
  return findings;
}

function findDupsInFile(filePath, arrayKey) {
  if (!fs.existsSync(filePath)) return [];
  const j = JSON.parse(fs.readFileSync(filePath, 'utf8'));
  const arr = j[arrayKey];
  if (!Array.isArray(arr)) return [];
  const map = new Map();
  const dups = [];
  for (const item of arr) {
    const lower = (item || '').toLowerCase();
    if (map.has(lower)) {
      dups.push({ first: map.get(lower), second: item });
    } else {
      map.set(lower, item);
    }
  }
  return dups;
}

function findDriverDups() {
  const driverFiles = cp.execSync(
    `powershell -NoProfile -Command "Get-ChildItem -Path '${path.join(ROOT, 'drivers')}' -Recurse -File -Filter 'driver.compose.json' | Select-Object -ExpandProperty FullName"`,
    { encoding: 'utf8' }
  ).split(/\r?\n/).filter(Boolean);
  const findings = [];
  for (const f of driverFiles) {
    try {
      const j = JSON.parse(fs.readFileSync(f, 'utf8'));
      const mfrs = (j.zigbee && j.zigbee.manufacturerName) || [];
      const pids = (j.zigbee && j.zigbee.productId) || [];
      const mfrMap = new Map();
      const pidMap = new Map();
      for (const m of mfrs) {
        const lower = m.toLowerCase();
        if (mfrMap.has(lower)) {
          findings.push({ driver: f.replace(/\\/g, '/').split('drivers/')[1], type: 'mfr-dup', first: mfrMap.get(lower), second: m });
        } else {
          mfrMap.set(lower, m);
        }
      }
      for (const p of pids) {
        const lower = p.toLowerCase();
        if (pidMap.has(lower)) {
          findings.push({ driver: f.replace(/\\/g, '/').split('drivers/')[1], type: 'pid-dup', first: pidMap.get(lower), second: p });
        } else {
          pidMap.set(lower, p);
        }
      }
    } catch (e) {}
  }
  return findings;
}

function findMfsDbDups() {
  const mfsFile = path.join(ROOT, 'data/mfs_db.json');
  if (!fs.existsSync(mfsFile)) return [];
  const j = JSON.parse(fs.readFileSync(mfsFile, 'utf8'));
  const map = new Map();
  const dups = [];
  for (const [k, v] of Object.entries(j)) {
    const lower = k.toLowerCase();
    if (map.has(lower)) {
      dups.push({ first: map.get(lower), second: k, sameValue: JSON.stringify(v) === JSON.stringify(j[map.get(lower)]) });
    } else {
      map.set(lower, k);
    }
  }
  return dups;
}

function main() {
  console.error('Auditing case-sensitivity...');
  const libFiles = listJsFiles(path.join(ROOT, 'lib'));

  // 1. Find toLowerCase context
  const tlFindings = findToLowerCaseContext(libFiles);
  const tlByCategory = { 'mfr-or-pid': 0, 'cluster-or-attr': 0, 'name-or-type': 0, 'other': 0 };
  for (const f of tlFindings) tlByCategory[f.category]++;

  // 2. Find files with toLowerCase but NOT using TuyaNormalizer
  const filesWithTL = new Set();
  for (const f of tlFindings) filesWithTL.add(f.file);
  const filesUsingTN = new Set();
  for (const f of libFiles) {
    if (fs.readFileSync(f, 'utf8').includes('TuyaNormalizer')) {
      filesUsingTN.add(f.replace(/\\/g, '/'));
    }
  }
  const filesWithTLButNoTN = [...filesWithTL].filter(f => !filesUsingTN.has(f));

  // 3. Find driver duplicates
  const driverDups = findDriverDups();
  const driverMfrDups = driverDups.filter(d => d.type === 'mfr-dup');
  const driverPidDups = driverDups.filter(d => d.type === 'pid-dup');

  // 4. Find mfs_db duplicates
  const mfsDups = findMfsDbDups();

  // 5. Find app.json duplicates
  const appDups = findDupsInFile(path.join(ROOT, 'app.json'), 'manufacturerNames');

  const out = {
    timestamp: new Date().toISOString(),
    summary: {
      toLowerCaseFindings: tlFindings.length,
      byCategory: tlByCategory,
      filesWithToLowerCase: filesWithTL.size,
      filesUsingTuyaNormalizer: filesUsingTN.size,
      filesWithToLowerCaseButNoTN: filesWithTLButNoTN.length,
      driverMfrDuplicates: driverMfrDups.length,
      driverPidDuplicates: driverPidDups.length,
      mfsDbDuplicateKeys: mfsDups.length,
      appJsonManufacturerNameDuplicates: appDups.length
    },
    filesWithToLowerCaseButNoTN: filesWithTLButNoTN,
    driverMfrDuplicates: driverMfrDups.slice(0, 20),
    driverPidDuplicates: driverPidDups.slice(0, 20),
    mfsDbDuplicateKeys: mfsDups.slice(0, 20),
    appJsonManufacturerNameDuplicates: appDups.slice(0, 20)
  };
  fs.writeFileSync(OUT, JSON.stringify(out, null, 2));
  console.log(JSON.stringify(out.summary, null, 2));
}

main().catch(e => { console.error(e); process.exit(1); });
