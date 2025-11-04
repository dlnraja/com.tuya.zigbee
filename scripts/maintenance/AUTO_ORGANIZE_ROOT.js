#!/usr/bin/env node
'use strict';

/**
 * AUTO ORGANIZE ROOT DIRECTORY
 * 
 * Nettoie automatiquement la racine du projet
 * Garde uniquement les fichiers essentiels
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '../..');
const DOCS_DIR = path.join(ROOT, 'docs');
const SESSIONS_DIR = path.join(DOCS_DIR, 'sessions');
const COMMITS_DIR = path.join(DOCS_DIR, 'commits');

console.log('🧹 AUTO ORGANIZE ROOT DIRECTORY\n');
console.log('═══════════════════════════════════════════════════\n');

// Fichiers à GARDER à la racine
const KEEP_AT_ROOT = [
  // Documentation essentielle
  'README.md',
  'README.txt',
  'CHANGELOG.md',
  'CONTRIBUTING.md',
  'LICENSE',
  
  // Configuration Homey
  'app.json',
  'app.js',
  '.homeychangelog.json',
  '.homeyignore',
  
  // Configuration Node/NPM
  'package.json',
  'package-lock.json',
  
  // Configuration Git
  '.gitignore',
  '.gitattributes',
  
  // Configuration IDE/Tools
  '.prettierrc',
  '.prettierignore',
  '.env.example',
  'jest.config.js',
  
  // Scripts utiles
  'git_push.bat'
];

// Patterns de fichiers à déplacer
const MOVE_PATTERNS = {
  // Sessions/status/summary → docs/sessions/
  sessions: {
    patterns: [
      /SESSION.*\.md$/i,
      /PHASE.*\.md$/i,
      /FINAL.*SESSION.*\.md$/i,
      /COMPLETE.*SUMMARY.*\.md$/i,
      /STATUS.*\.md$/i,
      /RECAP.*\.md$/i,
      /ABSOLUTE.*\.md$/i,
      /ULTIMATE.*\.md$/i,
      /ULTRA.*\.md$/i
    ],
    destination: SESSIONS_DIR
  },
  
  // Commits messages → docs/commits/
  commits: {
    patterns: [
      /^commit_.*\.txt$/i,
      /COMMIT.*\.txt$/i,
      /PUSH.*\.txt$/i,
      /DEPLOY.*\.txt$/i
    ],
    destination: COMMITS_DIR
  },
  
  // Analyses & recherches → docs/analysis/
  analysis: {
    patterns: [
      /ANALYSIS.*\.md$/i,
      /DIAGNOSTIC.*\.md$/i,
      /RESEARCH.*\.md$/i,
      /INSIGHTS.*\.md$/i,
      /ENRICHMENT.*\.md$/i
    ],
    destination: path.join(DOCS_DIR, 'analysis')
  },
  
  // Guides & tutorials → docs/guides/
  guides: {
    patterns: [
      /GUIDE.*\.md$/i,
      /INSTRUCTIONS.*\.md$/i,
      /QUICK_START.*\.md$/i,
      /AUTO_PUBLISH.*\.md$/i
    ],
    destination: path.join(DOCS_DIR, 'guides')
  },
  
  // Implementations & features → docs/implementation/
  implementation: {
    patterns: [
      /IMPLEMENTATION.*\.md$/i,
      /FEATURES.*\.md$/i,
      /INTEGRATION.*\.md$/i,
      /PLAN.*\.md$/i
    ],
    destination: path.join(DOCS_DIR, 'implementation')
  },
  
  // Compliance & validation → docs/compliance/
  compliance: {
    patterns: [
      /COMPLIANCE.*\.md$/i,
      /VALIDATION.*\.md$/i,
      /SDK3.*\.md$/i
    ],
    destination: path.join(DOCS_DIR, 'compliance')
  },
  
  // Driver updates → docs/drivers/
  drivers: {
    patterns: [
      /DRIVERS.*\.md$/i,
      /LOIC.*\.md$/i,
      /BSEED.*\.md$/i
    ],
    destination: path.join(DOCS_DIR, 'drivers')
  },
  
  // README variants → docs/readme-variants/
  readme_variants: {
    patterns: [
      /README_.*\.md$/i,
      /README.*DEPLOYMENT.*\.md$/i,
      /README.*SYNC.*\.md$/i
    ],
    destination: path.join(DOCS_DIR, 'readme-variants')
  },
  
  // Tuya & Zigate → docs/integrations/
  integrations: {
    patterns: [
      /TUYA.*\.md$/i,
      /ZIGATE.*\.md$/i
    ],
    destination: path.join(DOCS_DIR, 'integrations')
  },
  
  // Actions finales → docs/deployment/
  deployment: {
    patterns: [
      /ACTION.*\.md$/i,
      /FINAL.*DEPLOYMENT.*\.md$/i
    ],
    destination: path.join(DOCS_DIR, 'deployment')
  }
};

let movedCount = 0;
let skippedCount = 0;

/**
 * Create directory if not exists
 */
function ensureDir(dir) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

/**
 * Move file
 */
function moveFile(source, dest) {
  try {
    ensureDir(path.dirname(dest));
    
    // Si le fichier existe déjà, ajouter timestamp
    if (fs.existsSync(dest)) {
      const ext = path.extname(dest);
      const base = path.basename(dest, ext);
      const dir = path.dirname(dest);
      dest = path.join(dir, `${base}_${Date.now()}${ext}`);
    }
    
    fs.renameSync(source, dest);
    return true;
  } catch (err) {
    console.error(`   ❌ Error moving ${path.basename(source)}:`, err.message);
    return false;
  }
}

/**
 * Check if file should be kept at root
 */
function shouldKeepAtRoot(filename) {
  return KEEP_AT_ROOT.includes(filename);
}

/**
 * Find category for file
 */
function findCategory(filename) {
  for (const [category, config] of Object.entries(MOVE_PATTERNS)) {
    for (const pattern of config.patterns) {
      if (pattern.test(filename)) {
        return { category, destination: config.destination };
      }
    }
  }
  return null;
}

/**
 * Clean backup files
 */
function cleanBackupFiles() {
  console.log('🗑️  Cleaning backup files...\n');
  
  const files = fs.readdirSync(ROOT);
  let cleaned = 0;
  
  for (const file of files) {
    if (file.startsWith('app.json.backup-')) {
      const fullPath = path.join(ROOT, file);
      try {
        fs.unlinkSync(fullPath);
        console.log(`   ✅ Deleted: ${file}`);
        cleaned++;
      } catch (err) {
        console.error(`   ❌ Failed to delete ${file}:`, err.message);
      }
    }
  }
  
  console.log(`\n✅ Cleaned ${cleaned} backup files\n`);
}

/**
 * Organize root files
 */
function organizeRootFiles() {
  console.log('📁 Organizing root files...\n');
  
  const files = fs.readdirSync(ROOT);
  
  for (const file of files) {
    const fullPath = path.join(ROOT, file);
    const stat = fs.statSync(fullPath);
    
    // Skip directories
    if (stat.isDirectory()) continue;
    
    // Skip files to keep at root
    if (shouldKeepAtRoot(file)) {
      console.log(`   ⏭️  Keep: ${file}`);
      skippedCount++;
      continue;
    }
    
    // Find category
    const category = findCategory(file);
    
    if (category) {
      const dest = path.join(category.destination, file);
      console.log(`   📦 Move: ${file} → docs/${category.category}/`);
      
      if (moveFile(fullPath, dest)) {
        movedCount++;
      }
    } else {
      // Fichier non catégorisé - déplacer vers docs/misc/
      if (file.endsWith('.md') || file.endsWith('.txt')) {
        const dest = path.join(DOCS_DIR, 'misc', file);
        console.log(`   📦 Move: ${file} → docs/misc/ (uncategorized)`);
        
        if (moveFile(fullPath, dest)) {
          movedCount++;
        }
      } else {
        console.log(`   ⏭️  Skip: ${file} (unknown type)`);
        skippedCount++;
      }
    }
  }
}

/**
 * Create root index
 */
function createRootIndex() {
  console.log('\n📝 Creating root organization index...\n');
  
  const index = `# Project Root Organization

**Last updated:** ${new Date().toISOString()}

## Files at Root

### Essential Files

**Documentation:**
- \`README.md\` - Main project documentation
- \`README.txt\` - Text version
- \`CHANGELOG.md\` - Version history
- \`CONTRIBUTING.md\` - Contribution guidelines
- \`LICENSE\` - Project license

**Homey Configuration:**
- \`app.json\` - Homey app manifest
- \`app.js\` - Main app file
- \`.homeychangelog.json\` - Changelog for Homey App Store
- \`.homeyignore\` - Files to ignore in Homey build

**Node/NPM:**
- \`package.json\` - Node dependencies
- \`package-lock.json\` - Locked versions

**Git:**
- \`.gitignore\` - Git ignore patterns
- \`.gitattributes\` - Git attributes

**Tools:**
- \`.prettierrc\` - Prettier config
- \`.prettierignore\` - Prettier ignore
- \`.env.example\` - Environment variables template
- \`jest.config.js\` - Jest testing config

### Organized Documentation

All other documentation is organized in \`docs/\`:

- \`docs/sessions/\` - Development sessions and status
- \`docs/commits/\` - Commit messages archive
- \`docs/analysis/\` - Analyses and diagnostics
- \`docs/guides/\` - Guides and tutorials
- \`docs/implementation/\` - Implementation docs
- \`docs/compliance/\` - SDK3 & Homey Pro compliance
- \`docs/drivers/\` - Driver updates and fixes
- \`docs/integrations/\` - Tuya, Zigate, etc.
- \`docs/deployment/\` - Deployment instructions
- \`docs/misc/\` - Miscellaneous docs

## Automatic Organization

This root directory is automatically organized by:
- Script: \`scripts/maintenance/AUTO_ORGANIZE_ROOT.js\`
- GitHub Action: \`.github/workflows/auto-organize.yml\`

Runs automatically after each push to master.

## Manual Cleanup

To manually organize the root:

\`\`\`bash
node scripts/maintenance/AUTO_ORGANIZE_ROOT.js
\`\`\`
`;
  
  fs.writeFileSync(path.join(ROOT, 'ROOT_ORGANIZATION.md'), index, 'utf8');
  console.log('✅ Created ROOT_ORGANIZATION.md\n');
}

/**
 * Main
 */
function main() {
  const startTime = Date.now();
  
  // Clean backup files
  cleanBackupFiles();
  
  // Organize files
  organizeRootFiles();
  
  // Create index
  createRootIndex();
  
  const duration = ((Date.now() - startTime) / 1000).toFixed(1);
  
  console.log('═══════════════════════════════════════════════════');
  console.log('✅ ORGANIZATION COMPLETE');
  console.log('═══════════════════════════════════════════════════\n');
  
  console.log(`Duration: ${duration}s`);
  console.log(`Files moved: ${movedCount}`);
  console.log(`Files kept: ${skippedCount}`);
  console.log('');
  console.log('Root is now clean! ✨');
  console.log('');
}

main();
