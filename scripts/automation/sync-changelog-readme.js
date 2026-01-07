#!/usr/bin/env node
/**
 * Auto-sync changelog to README.md
 * Updates the "Latest Updates" section with entries from .homeychangelog.json
 *
 * Usage: node scripts/automation/sync-changelog-readme.js
 */

const fs = require('fs');
const path = require('path');

// Find project root
const projectRoot = path.resolve(__dirname, '../..');

// Read changelog and app.json
const changelogPath = path.join(projectRoot, '.homeychangelog.json');
const appJsonPath = path.join(projectRoot, 'app.json');
const readmePath = path.join(projectRoot, 'README.md');

if (!fs.existsSync(changelogPath)) {
  console.log('⚠️ .homeychangelog.json not found');
  process.exit(0);
}

const changelog = JSON.parse(fs.readFileSync(changelogPath, 'utf8'));
const appJson = JSON.parse(fs.readFileSync(appJsonPath, 'utf8'));
const currentVersion = appJson.version;

// Get latest 10 versions (sorted descending)
const versions = Object.keys(changelog)
  .sort((a, b) => {
    const partsA = a.split('.').map(Number);
    const partsB = b.split('.').map(Number);
    for (let i = 0; i < 3; i++) {
      if (partsA[i] !== partsB[i]) return partsB[i] - partsA[i];
    }
    return 0;
  })
  .slice(0, 10);

// Build changelog table
const date = new Date();
const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const dateStr = `${monthNames[date.getMonth()]} ${date.getFullYear()}`;

let changelogTable = `## 🚀 Latest Updates\n\n`;
changelogTable += `<!-- CHANGELOG_START - Auto-updated from .homeychangelog.json -->\n`;
changelogTable += `### ✨ Recent Changes (${dateStr})\n\n`;
changelogTable += `| Version | Feature |\n`;
changelogTable += `|---------|---------|\n`;

for (const ver of versions) {
  let entry = changelog[ver].en || '';
  // Truncate if too long
  if (entry.length > 80) {
    entry = entry.substring(0, 77) + '...';
  }
  // Escape pipe characters for markdown table
  entry = entry.replace(/\|/g, '\\|');
  changelogTable += `| **v${ver}** | ${entry} |\n`;
}
changelogTable += `<!-- CHANGELOG_END -->\n`;

// Read README
let readme = fs.readFileSync(readmePath, 'utf8');

// Replace changelog section
const startMarker = '## 🚀 Latest Updates';
const endMarker = '### 🎯 Flow Enrichment';

const startIdx = readme.indexOf(startMarker);
const endIdx = readme.indexOf(endMarker);

if (startIdx !== -1 && endIdx !== -1) {
  readme = readme.substring(0, startIdx) + changelogTable + '\n' + readme.substring(endIdx);
  fs.writeFileSync(readmePath, readme);
  console.log(`✅ README updated with ${versions.length} changelog entries`);
  console.log(`   Current version: v${currentVersion}`);
  console.log(`   Latest in changelog: v${versions[0]}`);
} else {
  console.log('⚠️ Could not find changelog section markers in README');
  console.log(`   Start marker found: ${startIdx !== -1}`);
  console.log(`   End marker found: ${endIdx !== -1}`);
}
