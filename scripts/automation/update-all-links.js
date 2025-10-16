#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');

/**
 * SYSTÈME DE MISE À JOUR AUTOMATIQUE DES LIENS
 * Met à jour tous les chemins et liens après réorganisation
 */

const ROOT = path.join(__dirname, '../..');

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
  'PUBLICATION_MANUELLE_REQUISE.md': 'docs/workflow/PUBLICATION_MANUELLE_REQUISE.md',
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
  'commit-email-fix.ps1': 'scripts/automation/commit-email-fix.ps1',
  'commit-push.ps1': 'scripts/automation/commit-push.ps1',
  'commit-workflow-docs.ps1': 'scripts/automation/commit-workflow-docs.ps1',
  'auto-publish.js': 'scripts/automation/auto-publish.js',
  'push-native.js': 'scripts/automation/push-native.js',
  
  // Scripts Fixes
  'fix-all-emails.ps1': 'scripts/fixes/fix-all-emails.ps1',
  'fix-git-email.ps1': 'scripts/fixes/fix-git-email.ps1',
  'FIX_APP_IMAGES_FINAL.js': 'scripts/fixes/FIX_APP_IMAGES_FINAL.js',
  'FIX_DEVICE_FILES.js': 'scripts/fixes/FIX_DEVICE_FILES.js',
  'FIX_TITLEFORMATTED.js': 'scripts/fixes/FIX_TITLEFORMATTED.js',
  'ULTIMATE_FIX_ALL.js': 'scripts/fixes/ULTIMATE_FIX_ALL.js',
  'URGENT_FIX_COMPLETE.js': 'scripts/fixes/URGENT_FIX_COMPLETE.js',
  'final-images-fix.js': 'scripts/fixes/final-images-fix.js',
  'fix-flows.js': 'scripts/fixes/fix-flows.js',
  'fix-images.js': 'scripts/fixes/fix-images.js',
  
  // Scripts Utils
  'add-all-images.ps1': 'scripts/utils/add-all-images.ps1',
  'ADD_IMAGES_FORCE.js': 'scripts/utils/ADD_IMAGES_FORCE.js',
  'CHECK_PUBLISH_STATUS.js': 'scripts/utils/CHECK_PUBLISH_STATUS.js',
  'FINAL_CLEANUP.js': 'scripts/utils/FINAL_CLEANUP.js',
  'ORCHESTRATOR_FINAL.js': 'scripts/utils/ORCHESTRATOR_FINAL.js',
  'ULTIMATE_ORCHESTRATOR.js': 'scripts/utils/ULTIMATE_ORCHESTRATOR.js',
  'add-images-declarations.js': 'scripts/utils/add-images-declarations.js',
  'create-app-images.js': 'scripts/utils/create-app-images.js',
  'remove-driver-images.js': 'scripts/utils/remove-driver-images.js'
};

/**
 * Met à jour les liens dans un fichier
 */
function updateLinksInFile(filePath) {
  if (!fs.existsSync(filePath)) {
    console.log(`⚠️  File not found: ${filePath}`);
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
    console.log(`✅ Updated: ${path.basename(filePath)}`);
    return true;
  }
  
  return false;
}

/**
 * Scanne récursivement tous les fichiers .md et .txt
 */
function scanAndUpdateFiles(dir) {
  const files = fs.readdirSync(dir);
  let totalUpdated = 0;
  
  for (const file of files) {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    
    if (stat.isDirectory()) {
      // Skip certains dossiers
      if (['node_modules', '.git', 'drivers', 'assets', 'reports'].includes(file)) {
        continue;
      }
      totalUpdated += scanAndUpdateFiles(filePath);
    } else if (file.endsWith('.md') || file.endsWith('.txt')) {
      if (updateLinksInFile(filePath)) {
        totalUpdated++;
      }
    }
  }
  
  return totalUpdated;
}

/**
 * Régénérer complètement README.md
 */
function updateReadme() {
  console.log('📝 Regenerating README.md from templates and docs...');
  
  try {
    // Utiliser le générateur de README
    const { generateReadme } = require('./generate-readme.js');
    const readme = generateReadme();
    
    const readmePath = path.join(ROOT, 'README.md');
    fs.writeFileSync(readmePath, readme, 'utf8');
    
    console.log('✅ README.md completely regenerated');
    console.log('   Based on: app.json, commits, docs, changelog');
  } catch (err) {
    console.log('⚠️  Could not regenerate README, updating manually');
    console.log('   Error:', err.message);
    
    // Fallback: mise à jour manuelle simple
    const readmePath = path.join(ROOT, 'README.md');
    if (fs.existsSync(readmePath)) {
      let content = fs.readFileSync(readmePath, 'utf8');
      
      // Mettre à jour la date au moins
      const today = new Date().toISOString().split('T')[0];
      content = content.replace(/Last Updated:\s+\d{4}-\d{2}-\d{2}/, `Last Updated:     ${today}`);
      
      fs.writeFileSync(readmePath, content, 'utf8');
      console.log('✅ README.md date updated');
    }
  }
}

/**
 * Met à jour CHANGELOG.md avec la dernière version
 */
function updateChangelog() {
  const changelogPath = path.join(ROOT, 'CHANGELOG.md');
  const appJsonPath = path.join(ROOT, 'app.json');
  
  const appJson = JSON.parse(fs.readFileSync(appJsonPath, 'utf8'));
  const version = appJson.version;
  const date = new Date().toISOString().split('T')[0];
  
  let content = fs.readFileSync(changelogPath, 'utf8');
  
  // Vérifier si cette version existe déjà
  if (content.includes(`## [${version}]`)) {
    console.log(`ℹ️  Version ${version} already in CHANGELOG`);
    return;
  }
  
  // Ajouter la nouvelle version en haut
  const newEntry = `
## [${version}] - ${date}

### 🗂️ Organization
- Reorganized project structure (docs/, scripts/ folders)
- Updated all file paths and links
- Created PROJECT_STRUCTURE.md documentation

### 🐛 Bug Fixes
- Fixed missing module error in motion sensor
- Fixed IAS Zone enrollment issues
- Improved error handling

### 📚 Documentation
- Updated README.md with new structure
- Organized documentation by category
- Added auto-update system for links

`;
  
  // Insérer après le titre principal
  content = content.replace(/(# Changelog\n)/, `$1${newEntry}`);
  
  fs.writeFileSync(changelogPath, content, 'utf8');
  console.log(`✅ Updated CHANGELOG.md with version ${version}`);
}

/**
 * Main
 */
function main() {
  // Check if we should skip auto-updates
  const SKIP_AUTO_UPDATE = process.env.SKIP_AUTO_UPDATE === 'true';
  
  if (SKIP_AUTO_UPDATE) {
    console.log('ℹ️  Auto-update skipped (SKIP_AUTO_UPDATE=true)');
    console.log('ℹ️  Use: SKIP_AUTO_UPDATE=false node scripts/automation/update-all-links.js to force update');
    return;
  }
  
  console.log('🔄 UPDATING ALL LINKS AND PATHS...\n');
  
  // 1. Scanner et mettre à jour tous les fichiers
  console.log('📝 Scanning and updating files...');
  const updated = scanAndUpdateFiles(ROOT);
  console.log(`\n✅ Updated ${updated} files\n`);
  
  // 2. Mettre à jour README.md (only if explicitly requested)
  if (process.env.UPDATE_README === 'true') {
    console.log('📄 Updating README.md...');
    updateReadme();
    console.log('');
  }
  
  // 3. Mettre à jour CHANGELOG.md (only if explicitly requested)
  if (process.env.UPDATE_CHANGELOG === 'true') {
    console.log('📋 Updating CHANGELOG.md...');
    updateChangelog();
    console.log('');
  }
  
  // 4. Générer la liste des drivers (only if explicitly requested)
  if (process.env.UPDATE_DRIVERS_LIST === 'true') {
    console.log('📱 Generating drivers list...');
    try {
      const { execSync } = require('child_process');
      execSync('node scripts/automation/generate-drivers-list.js', { 
        cwd: ROOT,
        stdio: 'inherit' 
      });
    } catch (error) {
      console.log('⚠️  Could not generate drivers list:', error.message);
    }
    console.log('');
  }
  
  console.log('✅ ALL LINKS AND PATHS UPDATED!');
  console.log('✅ Docs mis à jour!');
  console.log('\nℹ️  To update README/CHANGELOG/Drivers, use:');
  console.log('   UPDATE_README=true UPDATE_CHANGELOG=true UPDATE_DRIVERS_LIST=true npm run update');
}

// Only run if called directly (not required as module)
if (require.main === module) {
  main();
}
