/**
 * Fix All CLUSTER Constants to Numeric IDs
 * 
 * This script replaces all CLUSTER constant usages with numeric cluster IDs
 * to prevent NaN errors that cause device pairing and functionality issues.
 */

const fs = require('fs');
const path = require('path');

const CLUSTER_MAPPINGS = {
  'CLUSTER.BASIC': '0',
  'CLUSTER.POWER_CONFIGURATION': '1',
  'CLUSTER.IDENTIFY': '3',
  'CLUSTER.GROUPS': '4',
  'CLUSTER.SCENES': '5',
  'CLUSTER.ON_OFF': '6',
  'CLUSTER.LEVEL_CONTROL': '8',
  'CLUSTER.DOOR_LOCK': '257',
  'CLUSTER.WINDOW_COVERING': '258',
  'CLUSTER.THERMOSTAT': '513',
  'CLUSTER.COLOR_CONTROL': '768',
  'CLUSTER.ILLUMINANCE_MEASUREMENT': '1024',
  'CLUSTER.TEMPERATURE_MEASUREMENT': '1026',
  'CLUSTER.RELATIVE_HUMIDITY': '1029',
  'CLUSTER.OCCUPANCY_SENSING': '1030',
  'CLUSTER.IAS_ZONE': '1280',
  'CLUSTER.IAS_WD': '1282',
  'CLUSTER.METERING': '1794',
  'CLUSTER.ELECTRICAL_MEASUREMENT': '2820',
  'CLUSTER.TUYA_CLUSTER': '61184'
};

function fixFile(filePath) {
  console.log(`Processing: ${filePath}`);
  
  let content = fs.readFileSync(filePath, 'utf8');
  let modified = false;
  
  // Replace each CLUSTER constant
  for (const [clusterName, numericId] of Object.entries(CLUSTER_MAPPINGS)) {
    const regex = new RegExp(String(clusterName).replace(/\./g, '\\.'), 'g');
    if (content.includes(clusterName)) {
      content = String(content).replace(regex, numericId);
      modified = true;
      console.log(`  ✅ Replaced ${clusterName} with ${numericId}`);
    }
  }
  
  if (modified) {
    fs.writeFileSync(filePath, content, 'utf8');
    console.log(`  💾 File saved`);
    return 1;
  }
  
  return 0;
}

function walkDir(dir, callback) {
  const files = fs.readdirSync(dir);
  
  files.forEach(file => {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    
    if (stat.isDirectory()) {
      walkDir(filePath, callback);
    } else if (stat.isFile() && file === 'device.js') {
      callback(filePath);
    }
  });
}

console.log('🔧 Fixing CLUSTER Constants in All Drivers\n');
console.log('=' .repeat(60));

const driversDir = path.join(__dirname, '../..', 'drivers');
let filesFixed = 0;

walkDir(driversDir, (filePath) => {
  const fixed = fixFile(filePath);
  filesFixed += fixed;
});

console.log('=' .repeat(60));
console.log(`\n✅ COMPLETE: Fixed ${filesFixed} driver files`);
console.log('\nCluster mappings applied:');
Object.entries(CLUSTER_MAPPINGS).forEach(([name, id]) => {
  console.log(`  ${name} → ${id}`);
});

console.log('\n📝 Commit with:');
console.log('git add drivers/');
console.log('git commit -m "fix: Replace all CLUSTER constants with numeric IDs to prevent NaN errors"');
