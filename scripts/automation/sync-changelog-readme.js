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
  console.log(' .homeychangelog.json not found');
  process.exit(0);
}

const changelog = JSON.parse(fs.readFileSync(changelogPath, 'utf8'));
const appJson = JSON.parse(fs.readFileSync(appJsonPath, 'utf8'));
const currentVersion = appJson.version;

// Get latest 10 versions (sorted descending)
const versions = Object.keys(changelog)
                                                .sort((a, b) => {
    const partsA = a.split('.').map(v => parseInt(v , 10) || 0);
    const partsB = b.split('.').map(v => parseInt(v , 10) || 0);
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

let changelogTable = `##  Latest Updates\n\n`;
changelogTable += `<!-- CHANGELOG_START - Auto-updated from .homeychangelog.json -->\n`;
changelogTable += `###  Recent Changes (${dateStr})\n\n`;
changelogTable += `| Version | Changes |\n`;
changelogTable += `|---------|---------|\n`;

for (const ver of versions) {
  let entry = changelog[ver].en || '';
  // Truncate if too long
  if (entry.length > 80) {
    entry = entry.substring(0, 77) + '...';
  }
  // Escape pipe characters for markdown table
  entry = entry.replace(/\|/g, '\\|').replace(/\n/g, ' ');
  changelogTable += `| **v${ver}** | ${entry} |\n`;
}
changelogTable += `<!-- CHANGELOG_END -->\n`;

// Read README
let readme = fs.readFileSync(readmePath, 'utf8');

// Replace changelog section
const startMarker = '##  Latest Updates';
const altStartMarker = '## Statistics';

const startIdx = readme.indexOf(startMarker);
if (startIdx !== -1) {
  const endMarker = '<!-- CHANGELOG_END -->';
  const endIdx = readme.indexOf(endMarker, startIdx);
  if (endIdx !== -1) {
     readme = readme.substring(0, startIdx) + changelogTable + readme.substring(endIdx + endMarker.length);
  } else {
     // Just insert before the next h2
     const nextH2 = readme.indexOf('## ', startIdx + 10);
     if (nextH2 !== -1) {
        readme = readme.substring(0, startIdx) + changelogTable + '\n' + readme.substring(nextH2);
     }
  }
} else {
  // Insert before Statistics
  const statIdx = readme.indexOf(altStartMarker);
  if (statIdx !== -1) {
     readme = readme.substring(0, statIdx) + changelogTable + '\n\n' + readme.substring(statIdx);
  }
}

fs.writeFileSync(readmePath, readme);
console.log(` README updated with ${versions.length} changelog entries`);
console.log(`   Current version: v${currentVersion}`);
console.log(`   Latest in changelog: v${versions[0]}`);
