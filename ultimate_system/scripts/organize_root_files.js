#!/usr/bin/env node
/*
 * organize_root_files.js
 * --------------------------------------------------------------
 * Organizes root-level files into logical directories to keep
 * the project root clean and maintainable.
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '../..');

const ORGANIZATION_RULES = {
  'archive/old_docs': [
    'DISABLE_GITHUB_PAGES.md',
    'FORCE_DISABLE_PAGES.md',
    'FORCE_DISABLE_PAGES_COMPLETE.md',
    'GITHUB_ACTIONS_TRIGGER.md',
    'GITHUB_PAGES_DISABLED.md',
    'PAGES_DELETED_TEST.md',
    'FINAL_ACTION_REQUIRED.md',
    'SUCCESS.md',
    'PUBLICATION_STATUS.md',
    'PUBLISH_STATUS.md',
    'DRIVER_STATS.md',
    'METADATA_ENRICHED_REPORT.md',
    'README.txt',
  ],
  'archive/old_scripts': [
    'CLEAN_BUILD_V2.bat',
    'COMMIT_AND_PUBLISH.bat',
    'FINAL_BUILD_PUBLISH.bat',
    'FINAL_COMPLETE_PUBLISH.bat',
    'FINAL_PUBLISH.bat',
    'FORCE_CLEAN.bat',
    'NUCLEAR_CLEAN.bat',
    'publish_manual.bat',
    'PUBLISH_AUTO.ps1',
    'publish.ps1',
    'check_image.ps1',
    'create_app_icon.ps1',
    'create_large_icon.ps1',
    'fix_all_driver_images.ps1',
    'fix_app_images.ps1',
    'generate_all_driver_icons.ps1',
  ],
  'archive/old_data': [
    'CLASSIFIED.json',
    'MANUFACTURERS_DOCUMENTATION.html',
  ],
  'archive/old_backups': [
    'corrected',
    'drivers_backup_co',
    'mega_evolution',
    'v18_complete',
  ],
};

function ensureDir(dirPath) {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
}

function moveFile(source, destination) {
  try {
    const sourcePath = path.join(ROOT, source);
    const destPath = path.join(ROOT, destination, path.basename(source));
    
    if (!fs.existsSync(sourcePath)) {
      return { moved: false, reason: 'source_not_found', source };
    }
    
    const stat = fs.statSync(sourcePath);
    ensureDir(path.join(ROOT, destination));
    
    if (stat.isDirectory()) {
      fs.renameSync(sourcePath, destPath);
    } else {
      fs.renameSync(sourcePath, destPath);
    }
    
    return { moved: true, source, destination: path.relative(ROOT, destPath) };
  } catch (error) {
    return { moved: false, reason: error.message, source };
  }
}

function main() {
  console.log('🗂️  Organisation des fichiers racine');
  
  const summary = {
    moved: [],
    notFound: [],
    failed: [],
  };
  
  Object.entries(ORGANIZATION_RULES).forEach(([targetDir, items]) => {
    console.log(`\n📁 ${targetDir}:`);
    items.forEach((item) => {
      const result = moveFile(item, targetDir);
      if (result.moved) {
        console.log(`   ✓ ${item} → ${result.destination}`);
        summary.moved.push(result);
      } else if (result.reason === 'source_not_found') {
        console.log(`   ⊘ ${item} (introuvable)`);
        summary.notFound.push(result);
      } else {
        console.log(`   ✗ ${item} (${result.reason})`);
        summary.failed.push(result);
      }
    });
  });
  
  console.log('\n📊 Résumé:');
  console.log(`   • Fichiers déplacés: ${summary.moved.length}`);
  console.log(`   • Introuvables: ${summary.notFound.length}`);
  console.log(`   • Échecs: ${summary.failed.length}`);
  
  const stateFile = path.join(ROOT, 'ultimate_system', 'orchestration', 'state', 'organization_report.json');
  ensureDir(path.dirname(stateFile));
  fs.writeFileSync(stateFile, JSON.stringify({
    generatedAt: new Date().toISOString(),
    summary,
  }, null, 2), 'utf8');
  
  console.log(`\n✅ Rapport sauvegardé: ${path.relative(ROOT, stateFile)}`);
}

if (require.main === module) {
  try {
    main();
  } catch (error) {
    console.error('❌ Échec organisation :', error);
    process.exitCode = 1;
  }
}

module.exports = { main };
