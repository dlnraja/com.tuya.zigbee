const fs = require('fs');
const path = require('path');

// Read orphans
const orphans = fs.readFileSync('true_orphans_final.txt', 'utf8').trim().split('\n').filter(Boolean);
console.log(`Total orphans: ${orphans.length}`);

// Known Tuya ID patterns and their typical device types based on Z2M/ZHA research
// Format: _TZxyyz_xxxxxxxx where xy indicates device type
const patterns = {
  // TS0601 devices (Tuya DP protocol) - need context to determine
  '_TZE200_': { type: 'tuya_dp', driver: null }, // Various - thermostats, sensors, etc
  '_TZE204_': { type: 'tuya_dp', driver: null },
  '_TZE284_': { type: 'tuya_dp', driver: null },
  '_TZE600_': { type: 'tuya_dp', driver: null },
  '_TZE608_': { type: 'tuya_dp', driver: null },

  // Standard ZCL devices
  '_TZ3000_': { type: 'zcl', driver: null }, // Various standard devices
  '_TZ3210_': { type: 'zcl', driver: null },
  '_TZ3400_': { type: 'zcl', driver: null },
  '_TYZB01_': { type: 'zcl', driver: null },
  '_TYZB02_': { type: 'zcl', driver: null },

  // Specific patterns
  '_TZ3002_': { type: 'switch', driver: 'switch_1gang' },
  '_TZ3290_': { type: 'ir', driver: 'ir_blaster' },
};

// Group orphans by their lowercase normalized form to find case variants
const normalized = {};
for (const id of orphans) {
  const lower = id.toLowerCase();
  if (!normalized[lower]) normalized[lower] = [];
  normalized[lower].push(id);
}

// Check which normalized IDs already exist in drivers
const driversDir = path.join(__dirname, 'drivers');
let existingIds = new Set();

function scanDrivers(dir) {
  const items = fs.readdirSync(dir);
  for (const item of items) {
    const fullPath = path.join(dir, item);
    if (fs.statSync(fullPath).isDirectory()) {
      scanDrivers(fullPath);
    } else if (item === 'driver.compose.json') {
      const content = fs.readFileSync(fullPath, 'utf8');
      const matches = content.match(/"_[Tt][^"]+"/g) || [];
      matches.forEach(m => existingIds.add(m.replace(/"/g, '').toLowerCase()));
    }
  }
}

scanDrivers(driversDir);

// Find truly missing (not even lowercase version exists)
const trulyMissing = [];
const caseVariantsOnly = [];

for (const [lower, variants] of Object.entries(normalized)) {
  if (existingIds.has(lower)) {
    caseVariantsOnly.push(...variants);
  } else {
    trulyMissing.push(...variants);
  }
}

console.log(`\nCase variants only (lowercase exists): ${caseVariantsOnly.length}`);
console.log(`Truly missing (need to add): ${trulyMissing.length}`);

// Save truly missing for further analysis
fs.writeFileSync('truly_missing.txt', trulyMissing.join('\n'));
console.log('\nSaved truly missing to truly_missing.txt');

// Show sample of truly missing
console.log('\nSample of truly missing IDs:');
trulyMissing.slice(0, 30).forEach(id => console.log(`  ${id}`));
