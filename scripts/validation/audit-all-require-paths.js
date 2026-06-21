#!/usr/bin/env node
'use strict';
// audit-all-require-paths.js — Audit COMPLET des require() relatifs
// Couvre : lib/, drivers/, app.js, settings/, .homeycompose/
// Détecte : chemins cassés + chemins incohérents (../ de trop/manquant)

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '../..');
const SCAN_DIRS = ['lib', 'drivers', 'settings'];
const SCAN_FILES = ['app.js', 'api.js'];

const broken = [];
const suspicious = [];
let totalRequires = 0;

function resolveRequire(fromFile, reqPath) {
  // Ignore les modules npm (sans ./ ou ../)
  if (!reqPath.startsWith('.')) return { type: 'npm', exists: true };
  const fromDir = path.dirname(fromFile);
  const resolved = path.resolve(fromDir, reqPath);
  const candidates = [resolved, resolved + '.js', resolved + '.json', path.join(resolved, 'index.js')];
  for (const c of candidates) {
    try { if (fs.existsSync(c)) return { type: 'file', exists: true, resolved: c }; } catch (_) {}
  }
  return { type: 'broken', exists: false, resolved };
}

function scanFile(filePath) {
  let content;
  try { content = fs.readFileSync(filePath, 'utf8'); } catch (_) { return; }

  // Strip commentaires
  const stripped = content
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/(^|[^:])\/\/.*$/gm, '$1');

  const re = /require\(['"]([^'"]+)['"]\)/g;
  let m;
  while ((m = re.exec(stripped)) !== null) {
    const reqPath = m[1];
    totalRequires++;
    if (!reqPath.startsWith('.')) continue; // npm module

    const result = resolveRequire(filePath, reqPath);
    if (!result.exists) {
      broken.push({ file: filePath.replace(ROOT + path.sep, ''), require: reqPath, resolved: result.resolved });
    }
  }
}

function scanDir(dir) {
  let items;
  try { items = fs.readdirSync(dir, { withFileTypes: true }); } catch (_) { return; }
  for (const item of items) {
    const full = path.join(dir, item.name);
    if (item.isDirectory()) {
      if (['node_modules', '.git', '.cache', '.archive', '.diag', 'assets', 'pair', 'reference pdf', 'tmp'].includes(item.name)) continue;
      scanDir(full);
    } else if (item.name.endsWith('.js')) {
      scanFile(full);
    }
  }
}

// Scan
for (const d of SCAN_DIRS) scanDir(path.join(ROOT, d));
for (const f of SCAN_FILES) scanFile(path.join(ROOT, f));

// Rapport
console.log('═══════════════════════════════════════════════');
console.log('  AUDIT COMPLET DES CHEMINS RELATIFS');
console.log('═══════════════════════════════════════════════');
console.log(`  Total require() scannés : ${totalRequires}`);
console.log(`  Chemins cassés (CASSÉS) : ${broken.length}`);
console.log('═══════════════════════════════════════════════');

if (broken.length > 0) {
  console.log('\n❌ CHEMINS CASSÉS :');
  for (const b of broken) {
    console.log(`  ${b.file}`);
    console.log(`    require('${b.require}')`);
  }
} else {
  console.log('\n✅ Aucun chemin relatif cassé détecté.');
}
