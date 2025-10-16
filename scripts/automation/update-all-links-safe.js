#!/usr/bin/env node
'use strict';

/**
 * SAFE VERSION - Update all links without auto-modifying maintenance files
 * Only updates links when explicitly needed, not on every commit
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '../..');

// Check if we should skip auto-updates
const SKIP_AUTO_UPDATE = process.env.SKIP_AUTO_UPDATE === 'true';

if (SKIP_AUTO_UPDATE) {
  console.log('ℹ️  Auto-update skipped (SKIP_AUTO_UPDATE=true)');
  process.exit(0);
}

// Mapping des anciens chemins vers nouveaux
const PATH_MAPPINGS = {
  // Documentation Fixes
  'CRITICAL_FIX_SUMMARY_v2.15.130.md': 'docs/fixes/CRITICAL_FIX_SUMMARY_v2.15.130.md',
  'PETER_IAS_ZONE_FIX_COMPLETE.md': 'docs/fixes/PETER_IAS_ZONE_FIX_COMPLETE.md',
  'PETER_INSTRUCTIONS_COURTES.md': 'docs/fixes/PETER_INSTRUCTIONS_COURTES.md',
  'EMAIL_CORRECTION_SUMMARY.md': 'docs/fixes/EMAIL_CORRECTION_SUMMARY.md',
  'STATUS_FINAL.md': 'docs/fixes/STATUS_FINAL.md',
  
  // Documentation Workflow
  'WORKFLOW_GUIDE.md': 'docs/workflow/WORKFLOW_GUIDE.md',
  'QUICK_WORKFLOW.md': 'docs/workflow/QUICK_WORKFLOW.md',
  'README_WORKFLOW.md': 'docs/workflow/README_WORKFLOW.md',
  'PUBLICATION_SUCCESS.md': 'docs/workflow/PUBLICATION_SUCCESS.md',
  'FORCE_PUBLISH.md': 'docs/workflow/FORCE_PUBLISH.md',
  
  // Documentation Community
  'COMMUNITY_APPS_ANALYSIS.md': 'docs/community/COMMUNITY_APPS_ANALYSIS.md',
  'QUICK_IMPROVEMENTS.md': 'docs/community/QUICK_IMPROVEMENTS.md',
  
  // Documentation Forum
  'FORUM_POSTS_COPY_PASTE.txt': 'docs/forum/FORUM_POSTS_COPY_PASTE.txt',
  'FORUM_RESPONSE_PETER_DUTCHDUKE.md': 'docs/forum/FORUM_RESPONSE_PETER_DUTCHDUKE.md',
  
  // Scripts Automation
  'commit-analysis.ps1': 'scripts/automation/commit-analysis.ps1',
  'commit-critical-fixes.ps1': 'scripts/automation/commit-critical-fixes.ps1',
  'commit-push.ps1': 'scripts/automation/commit-push.ps1',
  'auto-publish.js': 'scripts/automation/auto-publish.js',
  'push-native.js': 'scripts/automation/push-native.js',
  
  // Scripts Fixes
  'FIX_APP_IMAGES_FINAL.js': 'scripts/fixes/FIX_APP_IMAGES_FINAL.js',
  'FIX_DEVICE_FILES.js': 'scripts/fixes/FIX_DEVICE_FILES.js',
  'ULTIMATE_FIX_ALL.js': 'scripts/fixes/ULTIMATE_FIX_ALL.js',
  'fix-flows.js': 'scripts/fixes/fix-flows.js',
  'fix-images.js': 'scripts/fixes/fix-images.js',
  
  // Scripts Utils
  'add-all-images.ps1': 'scripts/utils/add-all-images.ps1',
  'create-app-images.js': 'scripts/utils/create-app-images.js',
  'remove-driver-images.js': 'scripts/utils/remove-driver-images.js'
};

// Files to NEVER auto-modify
const PROTECTED_FILES = [
  'scripts/maintenance/README.md',
  'scripts/maintenance/ORGANIZE_PROJECT_CLEAN.js',
  '.git/hooks/pre-commit',
  '.git/hooks/post-commit'
];

/**
 * Check if file should be protected from auto-modification
 */
function isProtectedFile(filePath) {
  const relativePath = path.relative(ROOT, filePath);
  return PROTECTED_FILES.some(protected => {
    return relativePath.includes(protected) || filePath.includes(protected);
  });
}

/**
 * Met à jour les liens dans un fichier
 */
function updateLinksInFile(filePath) {
  if (!fs.existsSync(filePath)) {
    return false;
  }
  
  // Skip protected files
  if (isProtectedFile(filePath)) {
    console.log(`🔒 Skipping protected file: ${path.relative(ROOT, filePath)}`);
    return false;
  }
  
  let content = fs.readFileSync(filePath, 'utf8');
  let updated = false;
  
  // Remplacer les anciens chemins par les nouveaux
  for (const [oldPath, newPath] of Object.entries(PATH_MAPPINGS)) {
    // Pattern pour liens Markdown
    const mdPattern = new RegExp(`\\[([^\\]]+)\\]\\(${oldPath.replace(/\./g, '\\.')}\\)`, 'g');
    if (mdPattern.test(content)) {
      content = content.replace(mdPattern, `[$1](${newPath})`);
      updated = true;
      console.log(`  ✓ Updated MD link: ${oldPath} → ${newPath}`);
    }
    
    // Pattern pour chemins directs
    const directPattern = new RegExp(`(?<!\\[)${oldPath.replace(/\./g, '\\.')}(?!\\))`, 'g');
    if (directPattern.test(content)) {
      content = content.replace(directPattern, newPath);
      updated = true;
      console.log(`  ✓ Updated path: ${oldPath} → ${newPath}`);
    }
  }
  
  if (updated) {
    fs.writeFileSync(filePath, content, 'utf8');
  }
  
  return updated;
}

/**
 * Scanner récursivement
 */
function scanAndUpdateFiles(dir, level = 0) {
  if (level > 5) return 0; // Limite de profondeur
  
  let count = 0;
  
  const items = fs.readdirSync(dir);
  
  for (const item of items) {
    const fullPath = path.join(dir, item);
    
    // Skip ignorés
    if (item === 'node_modules' || item === '.git' || item === 'backup' || 
        item === 'dumps' || item === 'archives' || item === '.dev') {
      continue;
    }
    
    const stat = fs.statSync(fullPath);
    
    if (stat.isDirectory()) {
      count += scanAndUpdateFiles(fullPath, level + 1);
    } else if (item.endsWith('.md') || item.endsWith('.txt') || item.endsWith('.json')) {
      if (updateLinksInFile(fullPath)) {
        console.log(`✅ Updated: ${path.relative(ROOT, fullPath)}`);
        count++;
      }
    }
  }
  
  return count;
}

/**
 * Main - Only run if not skipped
 */
function main() {
  console.log('🔄 SAFE UPDATE - Updating links (protected files excluded)...\n');
  
  const updated = scanAndUpdateFiles(ROOT);
  console.log(`\n✅ Updated ${updated} files (protected files skipped)\n`);
  
  console.log('ℹ️  To skip auto-updates, set: SKIP_AUTO_UPDATE=true');
  console.log('✅ SAFE UPDATE COMPLETE!');
}

main();
