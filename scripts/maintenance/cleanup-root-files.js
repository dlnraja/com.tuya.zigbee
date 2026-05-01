#!/usr/bin/env node
'use strict';

/**
 * cleanup-root-files.js
 * 
 * Script de nettoyage intelligent des fichiers racine
 * Déplace les fichiers de logs, diagnostics et rapports dans les dossiers appropriés
 * 
 * Usage: node scripts/maintenance/cleanup-root-files.js [--dry-run]
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '../..');
const DRY_RUN = process.argv.includes('--dry-run');

// Patterns de fichiers à déplacer
const MOVE_RULES = [
  // Logs → reports/
  { pattern: /^.*\.txt$/i, target: 'reports/logs', description: 'Log files' },
  { pattern: /^.*\.log$/i, target: 'reports/logs', description: 'Log files' },
  
  // Rapports d'audit → reports/
  { pattern: /audit.*\.md$/i, target: 'reports/audits', description: 'Audit reports' },
  { pattern: /report.*\.md$/i, target: 'reports', description: 'Reports' },
  { pattern: /analysis.*\.md$/i, target: 'reports/analysis', description: 'Analysis reports' },
  { pattern: /enrichment.*\.md$/i, target: 'reports/enrichment', description: 'Enrichment reports' },
  
  // Change logs → docs/releases/
  { pattern: /CHANGE.*\.md$/i, target: 'docs/releases', description: 'Change logs' },
  { pattern: /V\d+\.\d+\.\d+.*\.md$/i, target: 'docs/releases', description: 'Version logs' },
  
  // Plans d'amélioration → docs/
  { pattern: /PLAN.*\.md$/i, target: 'docs/plans', description: 'Improvement plans' },
  { pattern: /IMPROVEMENT.*\.md$/i, target: 'docs/plans', description: 'Improvement plans' },
  
  // Issues analysis → docs/
  { pattern: /issue\d+\.txt$/i, target: 'reports/issues', description: 'Issue dumps' },
  { pattern: /ISSUES.*\.md$/i, target: 'docs/issues', description: 'Issues analysis' },
  { pattern: /pr\d+\.txt$/i, target: 'reports/issues', description: 'PR dumps' },
  
  // Syntax reports → reports/
  { pattern: /syntax.*\.txt$/i, target: 'reports/syntax', description: 'Syntax reports' },
  { pattern: /syntax.*\.md$/i, target: 'reports/syntax', description: 'Syntax reports' },
  
  // Meta/context files → docs/
  { pattern: /META.*\.md$/i, target: 'docs/meta', description: 'Meta context' },
  { pattern: /OPUS.*\.md$/i, target: 'docs/meta', description: 'AI context' },
  { pattern: /SUPERIOR.*\.md$/i, target: 'docs/meta', description: 'AI context' },
  { pattern: /COMPREHENSIVE.*\.md$/i, target: 'docs/meta', description: 'AI context' },
  { pattern: /GLOBAL.*\.md$/i, target: 'docs/meta', description: 'AI context' },
  
  // Audit reports → reports/
  { pattern: /IMAGE_AUDIT.*\.md$/i, target: 'reports', description: 'Image audit' },
  { pattern: /bot-audit.*\.md$/i, target: 'reports', description: 'Bot audit' },
  
  // Repomix → reports/
  { pattern: /repomix.*\.md$/i, target: 'reports', description: 'Repomix output' },
  
  // Collision logs → reports/
  { pattern: /collisions.*\.log$/i, target: 'reports/syntax', description: 'Collision logs' },
  
  // Gem dump → reports/
  { pattern: /gemini.*\.txt$/i, target: 'reports/ai', description: 'AI dumps' },
];

// Fichiers à SUPPRIMER (vides, NUL, temporaires)
const DELETE_PATTERNS = [
  /^NUL$/i,
  /^temp_/i,
  /^filtered_run/i,
  /^remaining_errors/i,
  /^run_log/i,
  /^\+after\+/,
];

// Fichiers à GARDER à la racine (whitelist)
const KEEP_AT_ROOT = new Set([
  'app.js',
  'app.json',
  'package.json',
  'package-lock.json',
  'README.md',
  'README.txt',
  '.eslintrc.json',
  '.gitignore',
  '.homeyignore',
  '.homeychangelog.json',
  'driver-mapping-database.json',
]);

function ensureDir(dirPath) {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
}

function moveFile(src, dest) {
  const destDir = path.dirname(dest);
  ensureDir(destDir);
  
  if (DRY_RUN) {
    console.log(`  [DRY] MOVE: ${path.relative(ROOT, src)} → ${path.relative(ROOT, dest)}`);
    return true;
  }
  
  try {
    fs.renameSync(src, dest);
    console.log(`  ✅ MOVE: ${path.relative(ROOT, src)} → ${path.relative(ROOT, dest)}`);
    return true;
  } catch (err) {
    // Cross-device move fallback
    try {
      fs.copyFileSync(src, dest);
      fs.unlinkSync(src);
      console.log(`  ✅ MOVE (copy+delete): ${path.relative(ROOT, src)} → ${path.relative(ROOT, dest)}`);
      return true;
    } catch (err2) {
      console.error(`  ❌ FAILED: ${path.relative(ROOT, src)}: ${err2.message}`);
      return false;
    }
  }
}

function deleteFile(filePath) {
  if (DRY_RUN) {
    console.log(`  [DRY] DELETE: ${path.relative(ROOT, filePath)}`);
    return true;
  }
  
  try {
    fs.unlinkSync(filePath);
    console.log(`  🗑️ DELETE: ${path.relative(ROOT, filePath)}`);
    return true;
  } catch (err) {
    console.error(`  ❌ DELETE FAILED: ${path.relative(ROOT, filePath)}: ${err.message}`);
    return false;
  }
}

function main() {
  console.log('🧹 Root File Cleanup');
  console.log(`   Mode: ${DRY_RUN ? 'DRY RUN' : 'EXECUTE'}`);
  console.log(`   Root: ${ROOT}`);
  console.log('');
  
  const rootFiles = fs.readdirSync(ROOT)
    .filter(f => {
      const fullPath = path.join(ROOT, f);
      return fs.statSync(fullPath).isFile();
    });
  
  let moved = 0;
  let deleted = 0;
  let kept = 0;
  let skipped = 0;
  
  for (const file of rootFiles) {
    const fullPath = path.join(ROOT, file);
    
    // Whitelist check
    if (KEEP_AT_ROOT.has(file)) {
      kept++;
      continue;
    }
    
    // Delete check
    let shouldDelete = false;
    for (const pattern of DELETE_PATTERNS) {
      if (pattern.test(file)) {
        deleteFile(fullPath);
        deleted++;
        shouldDelete = true;
        break;
      }
    }
    if (shouldDelete) continue;
    
    // Move check
    let moved_flag = false;
    for (const rule of MOVE_RULES) {
      if (rule.pattern.test(file)) {
        const dest = path.join(ROOT, rule.target, file);
        if (moveFile(fullPath, dest)) {
          moved++;
          moved_flag = true;
        }
        break;
      }
    }
    
    if (!moved_flag) {
      skipped++;
      console.log(`  ⏭️ SKIP: ${file} (no rule matched)`);
    }
  }
  
  console.log('');
  console.log('📊 Summary:');
  console.log(`   Kept at root: ${kept}`);
  console.log(`   Moved: ${moved}`);
  console.log(`   Deleted: ${deleted}`);
  console.log(`   Skipped: ${skipped}`);
  console.log(`   Total processed: ${rootFiles.length}`);
}

main();