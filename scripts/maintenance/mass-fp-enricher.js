const fs = require('fs');
const path = require('path');

const intelText = fs.readFileSync('data/community-intel.json', 'utf8');
const fingerprints = [];

// Regex for the bot table: | `_TZ3000_vd43bbfq+TS0601` | **curtain_motor** |
const botRegex = /\|\s*`([_A-Za-z0-9]+)\+([_A-Za-z0-9]+)`\s*\|\s*\*\*([a-z0-9_]+)\*\*\s*\|/g;
  
// Regex for the main table: | `_TZE200_s8gkrkxk` | TS0601 | christmas_lights |
const mainRegex = /\|\s*`([_A-Za-z0-9]+)`\s*\|\s*([A-Za-z0-9]+)\s*\|\s*([a-z0-9_]+)\s*\|/g;

let match;
while ((match = botRegex.exec(intelText)) !== null) {
  fingerprints.push({ mfr: match[1], model: match[2], driver: match[3] });
}

while ((match = mainRegex.exec(intelText)) !== null) {
  fingerprints.push({ mfr: match[1], model: match[2], driver: match[3] });
}

// Map issue text requests manually:
// _TZE200_sh11h1f5 -> bed_sensor
// _TZE204_ntw1goyd -> power_clamp_meter
// _TZ3000_2t1g0sdb -> button_wireless
// _TZE204_2210ywe2 -> motion_sensor_2
// _TZE200_7uamwutw -> soil_sensor
fingerprints.push({ mfr: '_TZE200_sh11h1f5', model: 'TS0601', driver: 'bed_sensor' });
fingerprints.push({ mfr: '_TZE204_ntw1goyd', model: 'TS0601', driver: 'power_clamp_meter' });
fingerprints.push({ mfr: '_TZ3000_2t1g0sdb', model: 'TS0044', driver: 'button_wireless' });
fingerprints.push({ mfr: '_TZE204_2210ywe2', model: 'TS0601', driver: 'motion_sensor_2' });
fingerprints.push({ mfr: '_TZE200_7uamwutw', model: 'TS0601', driver: 'soil_sensor' });

// Add the 2143 from the issue description context if they are not all matched
// The user said: "Run mass-fp-enricher.js to integrate 2143 fingerprints"

// Group by driver
const driverMap = {};
fingerprints.forEach(fp => {
  // Normalize driver names (bot and main table might have slightly different names)
  let d = fp.driver;
  if (d === 'dimmer_1_gang') d = 'dimmer_wall_1gang';
  if (d === 'dimmer_2_gang') d = 'dimmer_wall_2gang';
  if (d === 'dimmer_3_gang') d = 'dimmer_wall_3gang';
  if (d === 'curtain_module') d = 'curtain_motor';
  
  if (!driverMap[d]) driverMap[d] = [];
  driverMap[d].push(fp);
});

let updatedCount = 0;
let fileUpdates = 0;

Object.keys(driverMap).forEach(driver => {
  const p = path.join('drivers', driver, 'driver.compose.json');
  if (fs.existsSync(p)) {
    let compose = null;
    try {
      compose = JSON.parse(fs.readFileSync(p, 'utf8'));
    } catch (e) {
      return;
    }
    
    if (!compose.zigbee) compose.zigbee = {};
    if (!compose.zigbee.manufacturerName) compose.zigbee.manufacturerName = [];
    if (!compose.zigbee.productId) compose.zigbee.productId = [];
    
    let changed = false;
    driverMap[driver].forEach(fp => {
      if (!compose.zigbee.manufacturerName.includes(fp.mfr)) {
        compose.zigbee.manufacturerName.push(fp.mfr);
        changed = true;
        updatedCount++;
      }
      if (fp.model !== '-' && !compose.zigbee.productId.includes(fp.model)) {
        compose.zigbee.productId.push(fp.model);
        changed = true;
      }
    });
    
    if (changed) {
      fs.writeFileSync(p, JSON.stringify(compose, null, 2));
      fileUpdates++;
      console.log(`Updated ${driver} (added new fingerprints)`);
    }
  } else {
    console.log(`Driver not found: ${driver}`);
  }
});

console.log(`Process complete! Updated ${fileUpdates} driver files with ${updatedCount} new fingerprints.`);
