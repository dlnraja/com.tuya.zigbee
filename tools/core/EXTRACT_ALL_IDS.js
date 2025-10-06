#!/usr/bin/env node
// EXTRACT ALL IDs - Maximum manufacturerName depuis toutes sources

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const root = 'c:\\Users\\HP\\Desktop\\tuya_repair';
const drivers = path.join(root, 'drivers');

const allIDs = new Set();
let totalFound = 0;

console.log('🔍 EXTRACTION MAXIMUM IDs\n');

// 1. GIT HISTORY
console.log('📜 Git history (100 commits)...');
try {
  const commits = execSync('git log --all -100 --pretty=format:"%H"', { cwd: root, encoding: 'utf8' })
    .trim().split('\n').slice(0, 50);
  
  for (const commit of commits) {
    try {
      const diff = execSync(`git show ${commit}:app.json`, { cwd: root, encoding: 'utf8' });
      
      // Extract _TZ IDs
      const tzMatches = diff.match(/"_TZ[^"]+"/g);
      if (tzMatches) {
        tzMatches.forEach(m => {
          const id = m.replace(/"/g, '');
          if (!allIDs.has(id)) {
            allIDs.add(id);
            totalFound++;
          }
        });
      }
    } catch (e) {}
  }
  console.log(`  ✅ ${totalFound} nouveaux IDs\n`);
} catch (e) {
  console.log(`  ⚠️ ${e.message}\n`);
}

// 2. DRIVERS ACTUELS
console.log('📁 Drivers actuels...');
let currentCount = 0;
fs.readdirSync(drivers).forEach(d => {
  const file = path.join(drivers, d, 'driver.compose.json');
  if (!fs.existsSync(file)) return;
  
  try {
    const content = fs.readFileSync(file, 'utf8');
    const tzMatches = content.match(/"_TZ[^"]+"/g);
    if (tzMatches) {
      tzMatches.forEach(m => {
        const id = m.replace(/"/g, '');
        if (!allIDs.has(id)) {
          allIDs.add(id);
          currentCount++;
        }
      });
    }
  } catch (e) {}
});
console.log(`  ✅ ${currentCount} nouveaux IDs\n`);

// 3. RÉFÉRENCES
console.log('📚 Références locales...');
const refs = path.join(root, 'references', 'addon_enrichment_data');
let refCount = 0;
if (fs.existsSync(refs)) {
  fs.readdirSync(refs).forEach(f => {
    if (!f.endsWith('.json')) return;
    try {
      const content = fs.readFileSync(path.join(refs, f), 'utf8');
      const tzMatches = content.match(/"_TZ[^"]+"/g);
      if (tzMatches) {
        tzMatches.forEach(m => {
          const id = m.replace(/"/g, '');
          if (!allIDs.has(id)) {
            allIDs.add(id);
            refCount++;
          }
        });
      }
    } catch (e) {}
  });
}
console.log(`  ✅ ${refCount} nouveaux IDs\n`);

// RÉSULTAT
console.log('='.repeat(80));
console.log(`📊 TOTAL: ${allIDs.size} IDs uniques trouvés`);
console.log('='.repeat(80) + '\n');

// Sauvegarder
const output = {
  timestamp: new Date().toISOString(),
  total: allIDs.size,
  ids: Array.from(allIDs).sort()
};

fs.writeFileSync(
  path.join(root, 'ALL_MANUFACTURER_IDS.json'),
  JSON.stringify(output, null, 2)
);

console.log('✅ Sauvegardé: ALL_MANUFACTURER_IDS.json\n');

// Grouper par préfixe
const groups = {};
allIDs.forEach(id => {
  const prefix = id.substring(0, 7); // _TZE200, _TZ3000, etc.
  if (!groups[prefix]) groups[prefix] = [];
  groups[prefix].push(id);
});

console.log('📊 GROUPES:\n');
Object.entries(groups).sort((a,b) => b[1].length - a[1].length).slice(0, 10).forEach(([prefix, ids]) => {
  console.log(`  ${prefix}*: ${ids.length} IDs`);
});

console.log('\n✅ Terminé');
