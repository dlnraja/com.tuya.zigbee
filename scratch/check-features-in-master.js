const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const fingerprintsToCheck = [
  { fp: '_TZ3000_o4mkahkc', label: '#1139-add_TZ3000_o4mkahkc motion sensor' },
  { fp: '_TZE200_kb5noeto', label: 'add-_TZE200_kb5noeto motion_sensor_2' },
  { fp: '_TZ3000_an5rjiwd', label: 'patch-1 smart_button_switch' },
  { fp: '_TZ3210_eejm8dcr', label: 'new_device_issue_1059_rgb_led_strip_controller' },
  { fp: '_TZE200_y8jijhba', label: 'sinan92/SDK3 PIR mmWave sensor' },
  { fp: '_TZ3000_famkxci2', label: 'Loratap 3-btn (Issue 184 / ISSUES_ANALYSIS.md)' },
  { fp: '_TZ3000_ee8nrt2l', label: 'Loratap 4-btn (Issue 184 / ISSUES_ANALYSIS.md)' },
  { fp: '_TZ3000_tzvbimpq', label: '2-gang Wall remote (ISSUES_ANALYSIS.md)' },
  { fp: '_TZE284_8se38w3c', label: 'Temp/Humidity External (Issue 184 / ISSUES_ANALYSIS.md)' },
  { fp: '_TZ3000_tsgqxdb4', label: 'Climate sensor TS0201 (Issue 183 / ISSUES_ANALYSIS.md)' }
];

console.log('=== CHECKING IF FINGERPRINTS ARE ALREADY IN MASTER ===\n');

for (const item of fingerprintsToCheck) {
  let found = false;
  let foundInFile = '';
  // Check files in drivers recursively
  const scan = (dir) => {
    if (!fs.existsSync(dir)) return;
    const files = fs.readdirSync(dir);
    for (const file of files) {
      const fullPath = path.join(dir, file);
      if (fs.statSync(fullPath).isDirectory()) {
        scan(fullPath);
      } else if (file === 'driver.compose.json') {
        const content = fs.readFileSync(fullPath, 'utf8');
        if (content.toLowerCase().includes(item.fp.toLowerCase())) {
          found = true;
          foundInFile = fullPath;
          break;
        }
      }
    }
  };
  scan('drivers');
  
  if (found) {
    console.log(`✅ ${item.fp} (${item.label}) is ALREADY present in master in ${foundInFile}`);
  } else {
    console.log(`❌ ${item.fp} (${item.label}) is MISSING in master!`);
  }
}

console.log('\n=== CHECKING IF DRIVERS EXIST IN MASTER ===\n');
const driversToCheck = [
  { name: 'sr_zs_switch', label: 'moes_6_gang' },
  { name: 'pir_mmwave_sensor', label: 'sinan92/SDK3' }
];

for (const d of driversToCheck) {
  const dir = path.join('drivers', d.name);
  if (fs.existsSync(dir)) {
    console.log(`✅ Driver "${d.name}" (${d.label}) ALREADY exists in master`);
  } else {
    console.log(`❌ Driver "${d.name}" (${d.label}) is MISSING in master!`);
  }
}
