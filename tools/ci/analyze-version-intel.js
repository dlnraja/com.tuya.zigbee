// analyze-version-intel.js
const fs = require('fs');
const path = require('path');

const base = '.github/state/all-diagnostics-2026-07-13/'.replace(/\//g, path.sep);
function findFile(dir, name) {
  function walk(d) {
    if (!fs.existsSync(d)) return null;
    for (const e of fs.readdirSync(d, { withFileTypes: true })) {
      const p = path.join(d, e.name);
      if (e.isDirectory()) { const r = walk(p); if (r) return r; }
      else if (e.name === name) return p;
    }
    return null;
  }
  return walk(dir);
}

const verFile = findFile(base, 'version-intelligence-report.json');
const ver = JSON.parse(fs.readFileSync(verFile, 'utf8'));

console.log('=== VERSION INTELLIGENCE ===');
console.log('App:', JSON.stringify(ver.app));
console.log('Generated:', ver.generatedAt);
console.log('\nCommits:', ver.commits?.total, 'total,', ver.commits?.versionMentionCount, 'version mentions');

if (ver.commits) {
  console.log('\nFirst commit:');
  console.log('  Date:', ver.commits.first?.date);
  console.log('  Subject:', ver.commits.first?.subject);
  console.log('\nLatest commit:');
  console.log('  Date:', ver.commits.latest?.date);
  console.log('  Subject:', ver.commits.latest?.subject);
}

if (ver.commitCategories) {
  console.log('\n=== COMMIT CATEGORIES ===');
  for (const [cat, items] of Object.entries(ver.commitCategories).slice(0, 20)) {
    console.log('  ' + cat + ': ' + (Array.isArray(items) ? items.length : 'n/a'));
  }
}

if (ver.latestByCategory) {
  console.log('\n=== LATEST BY CATEGORY ===');
  for (const [cat, info] of Object.entries(ver.latestByCategory).slice(0, 20)) {
    console.log('  ' + cat + ':');
    console.log('    ' + JSON.stringify(info).substring(0, 250));
  }
}

if (ver.dashboard) {
  console.log('\n=== DASHBOARD IN VERSION INTEL ===');
  console.log('  Keys:', Object.keys(ver.dashboard).join(', '));
}
