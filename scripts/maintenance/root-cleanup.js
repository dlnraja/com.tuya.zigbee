#!/usr/bin/env node
/**
 * root-cleanup.js — Nettoyage des fichiers temporaires, orphelins et junk à la racine
 *
 * Catégorise et déplace les fichiers qui n'ont rien à faire à la racine du projet.
 * Les fichiers sont déplacés vers .archive/ (pas supprimés).
 *
 * Usage:
 *   node scripts/maintenance/root-cleanup.js [--dry-run] [--delete] [--verbose]
 *
 * @version 1.0.0
 */
'use strict';

const fs   = require('fs');
const path = require('path');

const ROOT      = path.resolve(__dirname, '../..');
const ARCHIVE   = path.join(ROOT, '.archive', 'root-cleanup-' + new Date().toISOString().slice(0,10));
const ARGS      = new Set(process.argv.slice(2));
const DRY       = ARGS.has('--dry-run');
const DELETE    = ARGS.has('--delete');
const VERBOSE   = ARGS.has('--verbose') || ARGS.has('-v');

// ── Fichiers à GARDER à la racine (whitelist) ───────────────────────────────
const KEEP_FILES = new Set([
  'app.js', 'app.json', 'api.js', 'icon.svg',
  'package.json', 'package-lock.json',
  'stable_app.json', 'driver-mapping-database.json',
  'README.md', 'CHANGELOG.md', 'LICENSE',
  'CODE_OF_CONDUCT.md', 'CONTRIBUTING.md',
  'GLOBAL_IMPROVEMENT_PLAN.md', 'PROJECT_INDEX.md',
  'AI_CONTEXT_MANDATE.md', 'AI_INSTRUCTIONS.md',
  'jest.config.js',
  '.gitignore', '.gitattributes', '.homeyignore',
  '.homeychangelog.json', '.homeyplugins.json',
  '.editorconfig', '.eslintrc.json', '.nycrc',
  '.prettierrc', '.prettierignore',
  '.cascade', '.cursorrules', '.windsurfrules',
  '.clinerule', '.clinerules', '.antigravityignore',
  '.env.example',
]);

// ── Répertoires à garder ──────────────────────────────────────────────────────
const KEEP_DIRS = new Set([
  '.agents', '.ai', '.cache', '.gemini', '.git', '.github',
  '.homeybuild', '.homeycompose', '.memory', '.vscode', '.windsurf',
  'assets', 'capabilities', 'data', 'diagnostics', 'docs', 'drivers',
  'lib', 'locales', 'node_modules', 'reference pdf', 'reimplementation_gateway',
  'reports', 'scripts', 'settings', 'skills', 'test', 'tests',
]);

// ── Catégorisation des fichiers junk ──────────────────────────────────────────
function categorize(name) {
  // Fichiers cassés par PowerShell (noms invalides)
  if (['!d.startsWith(\'.\')', '$null', '\'+after+\'', '.FullName',
       'm.toLowerCase())', 'p.toLowerCase())}', 'SDK3', 'NUL'].includes(name)) {
    return 'powershell_junk';
  }
  // Backups
  if (name.endsWith('.backup') || name.endsWith('.backup2') || name.includes('.bak')) return 'backup';
  // Fichiers temporaires
  if (name.startsWith('tmp_') || name.startsWith('tmp.') || name === 'tmp') return 'temp';
  // Dumps de texte
  if (name.endsWith('.txt') && !KEEP_FILES.has(name)) return 'temp_text_dump';
  // Scripts orphelins à la racine
  if ((name.endsWith('.js') || name.endsWith('.py')) && !KEEP_FILES.has(name)) return 'orphan_script';
  // JSON temporaires à la racine
  if (name.endsWith('.json') && !KEEP_FILES.has(name) && !name.startsWith('.')) return 'temp_json';
  // Patch files
  if (name.endsWith('.patch')) return 'patch';
  // MD de rapport/analyse (pas les essentiels)
  if (name.endsWith('.md') && !KEEP_FILES.has(name)) return 'report_md';
  // Fichiers vides ou nommés bizarrement
  if (name.length <= 3 && !name.includes('.')) return 'junk';
  return null; // keep
}

// ── Main ──────────────────────────────────────────────────────────────────────
function main() {
  console.log('\n╔═══════════════════════════════════════════════╗');
  console.log('║   🧹 ROOT DIRECTORY CLEANUP                   ║');
  console.log('╚═══════════════════════════════════════════════╝');
  if (DRY) console.log('  Mode: DRY-RUN (aucune modification)\n');

  const entries = fs.readdirSync(ROOT);
  const results = { keep: [], move: [], dirs_keep: [], dirs_move: [] };

  entries.forEach(name => {
    if (name.startsWith('.') && KEEP_FILES.has(name)) { results.keep.push(name); return; }

    const fpath = path.join(ROOT, name);
    let stat;
    try { stat = fs.statSync(fpath); } catch { return; }

    if (stat.isDirectory()) {
      if (KEEP_DIRS.has(name) || name.startsWith('.')) {
        results.dirs_keep.push(name);
      } else {
        results.dirs_move.push({ name, category: 'orphan_dir' });
      }
      return;
    }

    if (KEEP_FILES.has(name)) {
      results.keep.push(name);
      return;
    }

    const cat = categorize(name);
    if (cat) {
      results.move.push({ name, category: cat, size: stat.size });
    } else {
      results.keep.push(name);
    }
  });

  // Rapport
  console.log('📋 Fichiers à GARDER:', results.keep.length);
  if (VERBOSE) results.keep.forEach(n => console.log('  ✅', n));

  console.log('📁 Répertoires gardés:', results.dirs_keep.length);
  console.log('📁 Répertoires orphelins:', results.dirs_move.length);
  results.dirs_move.forEach(d => console.log('  📁', d.name, '→ archive'));

  console.log('\n🗑️  Fichiers à ARCHIVER:', results.move.length);
  const byCat = {};
  results.move.forEach(f => {
    if (!byCat[f.category]) byCat[f.category] = [];
    byCat[f.category].push(f);
  });

  Object.entries(byCat).sort().forEach(([cat, files]) => {
    console.log(`\n  [${cat}] (${files.length} fichiers)`);
    files.forEach(f => {
      const sz = f.size > 1024 ? (f.size/1024).toFixed(0) + 'KB' : f.size + 'B';
      console.log('    →', f.name, '(' + sz + ')');
    });
  });

  // Exécution
  if (!DRY && results.move.length > 0) {
    if (!fs.existsSync(ARCHIVE)) fs.mkdirSync(ARCHIVE, { recursive: true });

    let moved = 0;
    results.move.forEach(f => {
      const src = path.join(ROOT, f.name);
      const dst = path.join(ARCHIVE, f.name);
      try {
        if (DELETE) {
          fs.unlinkSync(src);
        } else {
          fs.renameSync(src, dst);
        }
        moved++;
      } catch(e) {
        console.error('  ❌ Échec:', f.name, e.message);
      }
    });

    // Archiver les répertoires orphelins aussi
    results.dirs_move.forEach(d => {
      const src = path.join(ROOT, d.name);
      const dst = path.join(ARCHIVE, d.name);
      try {
        fs.renameSync(src, dst);
        moved++;
      } catch(e) {
        console.error('  ❌ Dir move failed:', d.name, e.message);
      }
    });

    console.log('\n✅ Archivés:', moved, 'éléments vers', ARCHIVE);
  }

  // Résumé pour .gitignore
  console.log('\n📌 Ajouter à .gitignore si absent:');
  console.log('  .archive/');

  const totalJunk = results.move.reduce((s,f) => s + f.size, 0);
  console.log('\n📊 Espace récupérable:', (totalJunk/1048576).toFixed(1), 'MB');
}

main();
