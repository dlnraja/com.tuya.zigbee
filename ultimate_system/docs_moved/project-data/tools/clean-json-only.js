#!/usr/bin/env node
'use strict';
const fs = require('fs'), path = require('path');

const IGNORE_DIRS = [
  'backups', '.tmp_', 'tmp_', 'catalog', 'release',
  '.backup', 'backup_', 'migration-', 'cleanup-',
  'node_modules' // Ignorer complètement node_modules
];

function shouldIgnore(dirPath) {
  const dirName = path.basename(dirPath);
  return IGNORE_DIRS.some(ignore => dirName.includes(ignore));
}

function* walk(dir) {
  if (shouldIgnore(dir)) return;

  try {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);

      if (entry.isDirectory()) {
        if (shouldIgnore(fullPath)) continue;
        yield* walk(fullPath);
      } else if (entry.isFile() && entry.name.endsWith('.json')) {
        yield fullPath;
      }
    }
  } catch (e) {
    // Ignorer les erreurs de lecture
  }
}

let fixed = 0, errors = 0;
const errorFiles = [];

console.log('🧹 Nettoyage JSON ciblé (drivers actifs uniquement)...');

for (const file of walk(process.cwd())) {
  try {
    const content = fs.readFileSync(file, 'utf8');

    // Vérifier si c'est du JSON valide
    JSON.parse(content);

    // Vérifier et corriger les BOM
    if (content.length >= 3 &&
        content.charCodeAt(0) === 0xEF &&
        content.charCodeAt(1) === 0xBB &&
        content.charCodeAt(2) === 0xBF) {

      const cleanContent = content.slice(3);
      fs.writeFileSync(file, cleanContent, 'utf8');
      console.log('✂️  BOM supprimé:', file);
      fixed++;
    }

  } catch (e) {
    errors++;
    errorFiles.push({ file, error: e.message });
    console.log('❌ JSON invalide:', file, '-', e.message);
  }
}

console.log(`\n📊 Résumé:`);
console.log(`✅ Fichiers traités: ${fixed + errors}`);
console.log(`✂️  BOM supprimés: ${fixed}`);
console.log(`❌ Erreurs JSON: ${errors}`);

if (errors > 0) {
  console.log('\n⚠️  Fichiers avec erreurs JSON:');
  errorFiles.slice(0, 10).forEach(({ file, error }) => {
    console.log(`   ${file}: ${error}`);
  });
  if (errorFiles.length > 10) {
    console.log(`   ... et ${errorFiles.length - 10} autres`);
  }
}

// Sauvegarder le rapport d'erreurs
if (errorFiles.length > 0) {
  const report = {
    timestamp: new Date().toISOString(),
    summary: { total: fixed + errors, fixed, errors },
    errorFiles: errorFiles.slice(0, 50)
  };

  fs.mkdirSync('dumps', { recursive: true });
  fs.writeFileSync('dumps/json-cleanup-report.json', JSON.stringify(report, null, 2));
  console.log('\n📝 Rapport sauvegardé: dumps/json-cleanup-report.json');
}
