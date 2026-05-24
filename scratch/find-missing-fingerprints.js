const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// 1. Get all local branches
const branches = [
  '#1139-add_TZ3000_o4mkahkc',
  'add-_TZE200_kb5noeto',
  'antonhagg/SDK3',
  'auto-sync-johan-enhanced',
  'feature/accept-upstream-prs',
  'fix/motion_sensor_2',
  'moes_6_gang',
  'new_device_issue_1059_rgb_led_strip_controller',
  'patch-1',
  'pr-1137',
  'pr-321',
  'sinan92/SDK3'
];

console.log('=== STEP 1: SCANNING ALL FINGERPRINTS IN MASTER ===');
const masterFPs = new Set();
const scanMaster = (dir) => {
  if (!fs.existsSync(dir)) return;
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    if (fs.statSync(fullPath).isDirectory()) {
      scanMaster(fullPath);
    } else if (file === 'driver.compose.json') {
      try {
        const json = JSON.parse(fs.readFileSync(fullPath, 'utf8'));
        if (json.zigbee && Array.isArray(json.zigbee.manufacturerName)) {
          for (const mfr of json.zigbee.manufacturerName) {
            masterFPs.add(mfr.toLowerCase().trim());
          }
        }
      } catch (e) {}
    }
  }
};
scanMaster('drivers');
console.log(`Found ${masterFPs.size} unique fingerprints in master.\n`);

console.log('=== STEP 2: SCANNING BRANCHES FOR MISSING FINGERPRINTS (OPTIMIZED) ===');
const missingFPs = [];

for (const b of branches) {
  console.log(`Checking branch: ${b}...`);
  try {
    // Only diff driver.compose.json files added or modified in the branch relative to master
    // We use --diff-filter=AM to only see added/modified files
    let filesList = '';
    try {
      filesList = execSync(`git diff --name-only --diff-filter=AM master..${b} -- "*driver.compose.json"`, { encoding: 'utf8' }).trim();
    } catch (e) {
      // Branch might not have master in its history cleanly, let's fallback to regular diff
      filesList = execSync(`git diff --name-only master..${b} -- "*driver.compose.json"`, { encoding: 'utf8' }).trim();
    }
    
    if (!filesList) {
      console.log(`  No driver.compose.json files modified or added.`);
      continue;
    }
    
    const files = filesList.split('\n').filter(f => f.includes('driver.compose.json'));
    for (const file of files) {
      try {
        // Read file from branch
        const fileContent = execSync(`git show ${b}:${file}`, { encoding: 'utf8' }).trim();
        const json = JSON.parse(fileContent);
        if (json.zigbee && Array.isArray(json.zigbee.manufacturerName)) {
          for (const mfr of json.zigbee.manufacturerName) {
            const mfrClean = mfr.toLowerCase().trim();
            if (!masterFPs.has(mfrClean)) {
              console.log(`  🚩 FOUND MISSING FINGERPRINT in ${b} (${file}): ${mfr}`);
              missingFPs.push({
                branch: b,
                file: file,
                fingerprint: mfr,
                productIds: json.zigbee.productId || []
              });
            }
          }
        }
      } catch (err) {
        // Ignore read/parse errors (e.g. if file doesn't exist on branch or not json)
      }
    }
  } catch (e) {
    console.log(`  Error checking branch: ${e.message}`);
  }
}

console.log('\n=== SUMMARY OF MISSING FINGERPRINTS ===');
if (missingFPs.length === 0) {
  console.log('🎉 ZERO missing fingerprints! All branch fingerprints are already fully integrated in master!');
} else {
  console.log(`Found ${missingFPs.length} missing fingerprints across branches:`);
  console.log(JSON.stringify(missingFPs, null, 2));
}
