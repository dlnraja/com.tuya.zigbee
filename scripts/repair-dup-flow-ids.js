/**
 * repair-dup-flow-ids.js
 *
 * NETTOIE tous les drivers.flow.compose.json des IDs avec suffixe _dup_XXXXX
 * Générés lors des merges automatiques de flow cards.
 *
 * Usage: node scripts/repair-dup-flow-ids.js
 *
 * v8.4.2 — Phoenix Sovereign
 */

const fs = require('fs');
const path = require('path');

const DRIVERS_DIR = path.join(__dirname, '..', 'drivers');

// Pattern: _dup_ followed by 5 alphanumeric chars at end of ID
const DUP_PATTERN = /_dup_[a-z0-9]{5}$/;

// Track replacements for reporting
const results = {
  cleaned: 0,
  errors: [],
  files: []
};

function scanDriverFlowCompose(dirPath) {
  const entries = fs.readdirSync(dirPath, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = path.join(dirPath, entry.name);

    if (entry.isDirectory()) {
      scanDriverFlowCompose(fullPath);
    } else if (entry.name === 'driver.flow.compose.json') {
      processFile(fullPath, dirPath);
    }
  }
}

function processFile(filePath, driverDir) {
  const driverName = path.basename(driverDir);
  let content;

  try {
    content = fs.readFileSync(filePath, 'utf8');
  } catch (e) {
    results.errors.push(`  [ERR] Cannot read ${filePath}: ${e.message}`);
    return;
  }

  // Parse JSON
  let json;
  try {
    json = JSON.parse(content);
  } catch (e) {
    results.errors.push(`  [ERR] Invalid JSON in ${filePath}: ${e.message}`);
    return;
  }

  // Collect all sections that have 'id' fields
  const sections = ['triggers', 'conditions', 'actions'];
  let modified = false;
  const seenIds = new Map(); // id -> {type, file}

  for (const sectionKey of sections) {
    const section = json[sectionKey];
    if (!section || !Array.isArray(section)) continue;

    for (const item of section) {
      if (!item.id) continue;

      const originalId = item.id;

      // Remove _dup_ suffix
      const cleanId = originalId.replace(DUP_PATTERN, '');

      if (cleanId !== originalId) {
        // Check for collision after cleanup
        if (seenIds.has(cleanId)) {
          // Duplicate after cleanup — skip this entry (it's a dupe)
          const existing = seenIds.get(cleanId);
          console.log(`  ⚠️  SKIP ${driverName}: ${originalId} → DUPLICATE of ${cleanId}`);
          item._skip = true; // mark for removal
          modified = true;
        } else {
          // Clean rename
          console.log(`  ✅ ${driverName}: ${originalId} → ${cleanId}`);
          item.id = cleanId;
          seenIds.set(cleanId, { driver: driverName, original: originalId });
          modified = true;
        }
      } else {
        seenIds.set(originalId, { driver: driverName });
      }
    }
  }

  if (!modified) return;

  // Remove skipped entries (duplicates)
  for (const sectionKey of sections) {
    const section = json[sectionKey];
    if (!section || !Array.isArray(section)) continue;
    json[sectionKey] = section.filter(item => !item._skip);
  }

  // Write back
  const newContent = JSON.stringify(json, null, 2) + '\n';
  fs.writeFileSync(filePath, newContent, 'utf8');

  results.cleaned += 1;
  results.files.push(driverName);
  console.log(`  💾 Saved: ${filePath}`);
}

// Run
console.log('=== REPAIR DUP FLOW IDS v8.4.2 ===\n');
scanDriverFlowCompose(DRIVERS_DIR);
console.log(`\n=== SUMMARY ===`);
console.log(`  Files cleaned: ${results.cleaned}`);
console.log(`  Errors: ${results.errors.length}`);
if (results.errors.length > 0) {
  console.log(`  Errors detail:`);
  results.errors.forEach(e => console.log(e));
}
if (results.files.length > 0) {
  console.log(`  Modified drivers: ${results.files.join(', ')}`);
}
console.log('\n✅ Done.');