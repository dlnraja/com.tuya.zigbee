#!/usr/bin/env node

/**
 * PROJECT ORGANIZATION & CLEANUP
 * Nettoie et range tous les fichiers du projet
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');

console.log('🧹 PROJECT CLEANUP & ORGANIZATION\n');
console.log('='.repeat(70) + '\n');

const actions = {
  moved: [],
  deleted: [],
  kept: []
};

// 1. FICHIERS À GARDER (nécessaires)
const keepFiles = [
  'app.json',
  'package.json',
  'package-lock.json',
  '.gitignore',
  '.homeyignore',
  '.prettierrc',
  '.prettierignore',
  'README.md',
  'CHANGELOG.md',
  '.homeychangelog.json'
];

// 2. DOSSIERS À GARDER
const keepDirs = [
  'drivers',
  'assets',
  'locales',
  'node_modules',
  '.git',
  '.github',
  '.homeybuild'
];

// 3. FICHIERS À DÉPLACER vers /archive
const moveToArchive = [
  'SESSION_COMPLETE_RAPPORT.md',
  'WORKFLOW_HEADLESS_GUIDE.md',
  'CI_CD_USAGE_GUIDE.md',
  'FORUM_BUGS_CORRECTIONS_RAPPORT.md',
  'RAPPORT_GENERATION_IMAGES_V2.md',
  'RAPPORT_SCRIPTS_COMPLETS.md',
  'SCRIPTS_COMPLETS_DOCUMENTATION.md',
  'SYSTEME_IMAGES_V2_COMPLETE.md',
  'COMMIT_MESSAGE_v2.1.40.txt',
  'FINALIZE_IMAGES_AND_PUBLISH.js',
  'SESSION_FINALE_COMPLETE.md',
  'FINAL_PUSH_SUMMARY.md'
];

// 4. PATTERNS À SUPPRIMER (fichiers temporaires)
const deletePatterns = [
  /\.backup$/,
  /\.bak$/,
  /\.tmp$/,
  /\.old$/,
  /~$/,
  /^temp_/,
  /^test_/
];

console.log('📋 STEP 1: Creating Archive Directory\n');

const archiveDir = path.join(ROOT, 'archive');
if (!fs.existsSync(archiveDir)) {
  fs.mkdirSync(archiveDir, { recursive: true });
  console.log('✅ Created: archive/\n');
}

console.log('📦 STEP 2: Moving Documentation to Archive\n');

moveToArchive.forEach(file => {
  const sourcePath = path.join(ROOT, file);
  if (fs.existsSync(sourcePath)) {
    const destPath = path.join(archiveDir, file);
    try {
      fs.renameSync(sourcePath, destPath);
      actions.moved.push(file);
      console.log(`   → ${file}`);
    } catch (err) {
      console.log(`   ⚠️  Could not move ${file}: ${err.message}`);
    }
  }
});

console.log(`\n✅ Moved ${actions.moved.length} files to archive/\n`);

console.log('🗑️  STEP 3: Cleaning Temporary Files\n');

// Scanner le dossier drivers pour les .backup
function scanDirectory(dir, depth = 0) {
  if (depth > 3) return; // Limite profondeur
  
  try {
    const items = fs.readdirSync(dir);
    
    items.forEach(item => {
      const fullPath = path.join(dir, item);
      const stat = fs.statSync(fullPath);
      
      if (stat.isDirectory()) {
        // Skip node_modules, .git, etc
        if (!['node_modules', '.git', '.homeybuild'].includes(item)) {
          scanDirectory(fullPath, depth + 1);
        }
      } else if (stat.isFile()) {
        // Check si fichier temporaire
        const shouldDelete = deletePatterns.some(pattern => pattern.test(item));
        
        if (shouldDelete) {
          try {
            fs.unlinkSync(fullPath);
            actions.deleted.push(fullPath.replace(ROOT, ''));
            console.log(`   🗑️  ${fullPath.replace(ROOT, '')}`);
          } catch (err) {
            console.log(`   ⚠️  Could not delete ${item}: ${err.message}`);
          }
        }
      }
    });
  } catch (err) {
    // Skip directories we can't read
  }
}

scanDirectory(ROOT);

console.log(`\n✅ Deleted ${actions.deleted.length} temporary files\n`);

console.log('📁 STEP 4: Organizing Scripts Directory\n');

const scriptsDir = path.join(ROOT, 'scripts');
const categories = {
  generation: ['GENERATE_', 'CREATE_', 'BUILD_'],
  analysis: ['ANALYZE_', 'DEEP_', 'VERIFY_', 'CHECK_'],
  fixes: ['FIX_', 'REPAIR_', 'CORRECT_'],
  automation: ['AUTO_', 'AUTONOMOUS_'],
  verification: ['VALIDATE_', 'TEST_', 'INSPECT_']
};

if (fs.existsSync(scriptsDir)) {
  const scripts = fs.readdirSync(scriptsDir).filter(f => f.endsWith('.js'));
  
  // Create subdirectories
  Object.keys(categories).forEach(cat => {
    const catDir = path.join(scriptsDir, cat);
    if (!fs.existsSync(catDir)) {
      fs.mkdirSync(catDir, { recursive: true });
    }
  });
  
  // Move scripts to categories
  scripts.forEach(script => {
    const scriptPath = path.join(scriptsDir, script);
    
    // Find matching category
    for (const [category, patterns] of Object.entries(categories)) {
      if (patterns.some(pattern => script.startsWith(pattern))) {
        const destPath = path.join(scriptsDir, category, script);
        
        // Only move if not already in subdirectory
        if (!scriptPath.includes(path.sep + category + path.sep)) {
          try {
            fs.renameSync(scriptPath, destPath);
            console.log(`   📂 ${script} → scripts/${category}/`);
          } catch (err) {
            // File might already be there
          }
        }
        break;
      }
    }
  });
}

console.log('\n✅ Scripts organized by category\n');

console.log('📊 STEP 5: Creating README in Archive\n');

const archiveReadme = `# Archive

This directory contains historical documentation and session reports.

## Contents

- Session reports and summaries
- Historical documentation
- Commit messages and reports
- Old workflow guides

## Note

These files are kept for reference but are not actively maintained.
For current documentation, see the main README.md.

---

**Last Updated:** ${new Date().toISOString().split('T')[0]}
`;

fs.writeFileSync(path.join(archiveDir, 'README.md'), archiveReadme);
console.log('✅ Created archive/README.md\n');

// 6. SUMMARY
console.log('='.repeat(70));
console.log('\n📊 CLEANUP SUMMARY\n');
console.log(`✅ Files moved to archive: ${actions.moved.length}`);
console.log(`🗑️  Temporary files deleted: ${actions.deleted.length}`);
console.log(`📁 Scripts organized by category`);
console.log(`📝 Archive README created`);

console.log('\n📁 PROJECT STRUCTURE (Clean)\n');
console.log(`
tuya_repair/
├── .github/          (workflows)
├── archive/          (old docs) ✨ NEW
├── assets/           (app images)
├── drivers/          (166 drivers)
├── reports/          (analysis reports)
├── scripts/          (organized by category) ✨ ORGANIZED
│   ├── analysis/
│   ├── automation/
│   ├── fixes/
│   ├── generation/
│   └── verification/
├── utils/
├── app.json
├── package.json
└── README.md
`);

console.log('\n🎉 PROJECT IS NOW CLEAN AND ORGANIZED!\n');

// Save report
const report = {
  timestamp: new Date().toISOString(),
  actions: {
    moved: actions.moved.length,
    deleted: actions.deleted.length
  },
  movedFiles: actions.moved,
  deletedFiles: actions.deleted
};

fs.writeFileSync(
  path.join(ROOT, 'reports', 'CLEANUP_REPORT.json'),
  JSON.stringify(report, null, 2)
);

console.log('📝 Report saved to reports/CLEANUP_REPORT.json\n');
