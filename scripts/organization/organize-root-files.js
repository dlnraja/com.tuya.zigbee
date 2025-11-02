#!/usr/bin/env node
'use strict';

/**
 * ORGANIZATION SCRIPT - Clean Root Directory
 * Moves all documentation, commits, emails, etc. to proper folders
 * Keeps only essential files at root
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '../..');

// Define what should stay at root
const KEEP_AT_ROOT = [
  // Essential files
  'app.js',
  'app.json',
  'package.json',
  'package-lock.json',
  'README.md',
  'CHANGELOG.md',
  'LICENSE',
  'CONTRIBUTING.md',
  '.env',
  '.env.example',
  '.gitignore',
  '.gitattributes',
  '.homeyignore',
  '.homeychangelog.json',
  '.prettierrc',
  '.prettierignore',
  'jest.config.js',
  'cookbook.md',
  
  // Directories
  'node_modules',
  '.git',
  '.github',
  '.vscode',
  'drivers',
  'lib',
  'locales',
  'assets',
  'settings',
  'flow',
  'api',
  'utils',
  'docs',
  'scripts',
  'tests',
  'test'
];

// Mapping of file patterns to destination folders
const ORGANIZATION_RULES = [
  // Documentation
  { pattern: /^(DIAGNOSTIC|ANALYSIS|COMPARAISON|INVESTIGATION|CONCLUSION).*\.md$/i, dest: 'docs/diagnostics' },
  { pattern: /^(EMAIL_RESPONSE|FORUM_RESPONSE|FORUM_REPLY).*\.(md|txt)$/i, dest: 'docs/support' },
  { pattern: /^(CRITICAL|HOTFIX|FIX|PATCH|RESOLUTION).*\.md$/i, dest: 'docs/fixes' },
  { pattern: /^(DEPLOYMENT|RELEASE|VERSION).*\.md$/i, dest: 'docs/releases' },
  { pattern: /^(GUIDE|COOKBOOK|BEST_PRACTICES|DRIVER).*\.md$/i, dest: 'docs/guides' },
  { pattern: /^(ARCHITECTURE|SYSTEM|ENGINE|IMPLEMENTATION).*\.md$/i, dest: 'docs/technical' },
  { pattern: /^(ROADMAP|PLAN|TODO|STATUS).*\.(md|txt)$/i, dest: 'docs/planning' },
  { pattern: /^(FINAL|COMPLETE|SUMMARY).*\.(md|txt)$/i, dest: 'docs/summaries' },
  
  // Commits
  { pattern: /^\.?commit.*\.(txt|md)$/i, dest: 'commits' },
  { pattern: /^COMMIT.*\.(txt|md)$/i, dest: 'commits' },
  
  // Data files
  { pattern: /\.(json|csv)$/, dest: 'data', except: ['package.json', 'package-lock.json', 'app.json', '.homeychangelog.json', 'jest.config.js'] },
  
  // Scripts
  { pattern: /^(fix|resolve|apply|organize|cleanup).*\.js$/i, dest: 'scripts/fixes' },
  { pattern: /\.bat$/, dest: 'scripts/automation' },
  
  // Validation/Reports
  { pattern: /validation.*\.txt$/i, dest: 'reports/validation' },
  { pattern: /deprecation.*\.json$/i, dest: 'reports/deprecation' },
  
  // Misc
  { pattern: /^SETUP.*\.txt$/i, dest: 'docs/setup' },
  { pattern: /^README.*\.txt$/i, dest: 'docs' },
  { pattern: /^URGENT.*\.md$/i, dest: 'docs/urgent' },
  { pattern: /^USER.*\.md$/i, dest: 'docs/support' }
];

function shouldKeepAtRoot(filename) {
  return KEEP_AT_ROOT.includes(filename);
}

function getDestinationFolder(filename) {
  // Check each rule
  for (const rule of ORGANIZATION_RULES) {
    if (rule.pattern.test(filename)) {
      // Check exceptions
      if (rule.except && rule.except.includes(filename)) {
        continue;
      }
      return rule.dest;
    }
  }
  return null;
}

function ensureDirectory(dir) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
    console.log(`📁 Created directory: ${path.relative(ROOT, dir)}`);
  }
}

function moveFile(source, destination) {
  try {
    ensureDirectory(path.dirname(destination));
    
    // If destination exists, add timestamp
    if (fs.existsSync(destination)) {
      const ext = path.extname(destination);
      const base = path.basename(destination, ext);
      const dir = path.dirname(destination);
      const timestamp = Date.now();
      destination = path.join(dir, `${base}_${timestamp}${ext}`);
    }
    
    fs.renameSync(source, destination);
    console.log(`✅ Moved: ${path.basename(source)} → ${path.relative(ROOT, destination)}`);
    return true;
  } catch (err) {
    console.error(`❌ Failed to move ${path.basename(source)}:`, err.message);
    return false;
  }
}

function organizeRootFiles() {
  console.log('🧹 Starting root directory organization...\n');
  
  const files = fs.readdirSync(ROOT);
  let movedCount = 0;
  let skippedCount = 0;
  
  for (const file of files) {
    const fullPath = path.join(ROOT, file);
    const stats = fs.statSync(fullPath);
    
    // Skip directories
    if (stats.isDirectory()) {
      continue;
    }
    
    // Keep essential files
    if (shouldKeepAtRoot(file)) {
      skippedCount++;
      continue;
    }
    
    // Find destination
    const dest = getDestinationFolder(file);
    if (dest) {
      const destPath = path.join(ROOT, dest, file);
      if (moveFile(fullPath, destPath)) {
        movedCount++;
      }
    } else {
      // Unknown file - move to misc
      const destPath = path.join(ROOT, 'docs/misc', file);
      if (moveFile(fullPath, destPath)) {
        movedCount++;
      }
    }
  }
  
  console.log(`\n✨ Organization complete!`);
  console.log(`   📦 Files moved: ${movedCount}`);
  console.log(`   📌 Files kept at root: ${skippedCount}`);
  console.log(`\n📁 Root directory is now clean!`);
}

// Run organization
if (require.main === module) {
  organizeRootFiles();
}

module.exports = { organizeRootFiles };
