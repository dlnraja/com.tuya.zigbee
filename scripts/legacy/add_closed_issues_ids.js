/**
 * ADD IDs FROM CLOSED GITHUB ISSUES (Page 2)
 * Verifying implementations of closed issues
 */

const fs = require('fs');
const path = require('path');

const driversDir = path.join(__dirname, '..', 'drivers');

// IDs from closed GitHub issues page 2
const closedIssuesIds = {
  // Issue #859 - Tuya curtain _TZ3210_ol1uhvza / TS130F
  'curtain_motor': [
    '_TZ3210_ol1uhvza', '_tz3210_ol1uhvza',
  ],

  // Issue #144 - 1 Gang Dimmer TS110E / _TZ3210_ngqk6jia
  'dimmer_wall_1gang': [
    '_TZ3210_ngqk6jia', '_tz3210_ngqk6jia',
  ],

  // Issue #970 - One gang switch module _TZ3000_prits6g4 / TS0001
  'switch_1gang': [
    '_TZ3000_prits6g4', '_tz3000_prits6g4',
  ],

  // Issue #1196 - Temp/humid sensor _TZ3000_v1w2k9dd / TS0201
  'climate_sensor': [
    '_TZ3000_v1w2k9dd', '_tz3000_v1w2k9dd',
  ],

  // Issue #103 - Smoke detector _TZE200_t5p1vj8r / TS0601
  'smoke_detector': [
    '_TZE200_t5p1vj8r', '_tze200_t5p1vj8r',
  ],

  // Forum page 15 - CCT LED strip _TZ3210_frm6149r / TS0502B
  'led_strip_cct': [
    '_TZ3210_frm6149r', '_tz3210_frm6149r',
  ],

  // Issue #1003 - _TZE200_vvmbj46n / TS0601 (thermostat)
  'thermostat_tuya_dp': [
    '_TZE200_vvmbj46n', '_tze200_vvmbj46n',
  ],

  // Issue #660 - Fridge temp sensor _TZE204_upagmta9 / TS0601
  'climate_sensor_2': [
    '_TZE204_upagmta9', '_tze204_upagmta9',
  ],

  // Issue #1181 - MOES TS0011 _TZ3000_hhiodade
  'switch_module_1gang': [
    '_TZ3000_hhiodade', '_tz3000_hhiodade',
  ],
};

function addIdsToDriver(driverName, newIds) {
  const filePath = path.join(driversDir, driverName, 'driver.compose.json');
  if (!fs.existsSync(filePath)) {
    console.log(`  ❌ Driver not found: ${driverName}`);
    return { added: 0, driver: driverName };
  }

  let content = fs.readFileSync(filePath, 'utf8');
  let data;
  try {
    data = JSON.parse(content);
  } catch (e) {
    console.log(`  ❌ Parse error: ${driverName}`);
    return { added: 0, driver: driverName, error: 'parse' };
  }

  if (!data.zigbee || !data.zigbee.manufacturerName) {
    console.log(`  ❌ No manufacturerName: ${driverName}`);
    return { added: 0, driver: driverName, error: 'no_mfname' };
  }

  const existing = data.zigbee.manufacturerName;
  let added = 0;
  const addedIds = [];

  newIds.forEach(id => {
    if (!existing.includes(id)) {
      existing.push(id);
      addedIds.push(id);
      added++;
    }
  });

  if (added > 0) {
    data.zigbee.manufacturerName = existing.sort((a, b) =>
      a.toLowerCase().localeCompare(b.toLowerCase())
    );
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8');
    console.log(`  ✅ ${driverName}: +${added} IDs`);
    addedIds.forEach(id => console.log(`     → ${id}`));
  } else {
    console.log(`  ⚪ ${driverName}: All IDs present`);
  }

  return { added, driver: driverName, ids: addedIds };
}

console.log('\n╔══════════════════════════════════════════════════════════════╗');
console.log('║  CLOSED ISSUES VERIFICATION SYNC                             ║');
console.log('║  Sources: GitHub Closed Issues Page 2 + Forum Archive        ║');
console.log('╚══════════════════════════════════════════════════════════════╝\n');

let totalAdded = 0;
const results = [];

for (const [driver, ids] of Object.entries(closedIssuesIds)) {
  const result = addIdsToDriver(driver, ids);
  results.push(result);
  totalAdded += result.added;
}

console.log('\n╔══════════════════════════════════════════════════════════════╗');
console.log(`║  TOTAL: +${totalAdded} manufacturer IDs added                          ║`);
console.log('╚══════════════════════════════════════════════════════════════╝\n');

const modified = results.filter(r => r.added > 0);
if (modified.length > 0) {
  console.log('Modified drivers:');
  modified.forEach(r => console.log(`  - ${r.driver}: +${r.added}`));
}
