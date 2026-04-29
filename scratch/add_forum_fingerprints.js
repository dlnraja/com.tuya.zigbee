const fs = require('fs');
const path = require('path');

function addFingerprint(driver, mfr) {
  const file = path.join('drivers', driver, 'driver.compose.json');
  if(!fs.existsSync(file)) {
    console.log(`Driver ${driver} not found!`);
    return;
  }
  const data = JSON.parse(fs.readFileSync(file, 'utf8'));
  if(!data.zigbee) data.zigbee = {};
  if(!data.zigbee.manufacturerName) data.zigbee.manufacturerName = [];
  
  if(!data.zigbee.manufacturerName.includes(mfr)) {
    data.zigbee.manufacturerName.push(mfr);
  }
  if(!data.zigbee.manufacturerName.includes(mfr.toLowerCase())) {
    data.zigbee.manufacturerName.push(mfr.toLowerCase());
  }
  fs.writeFileSync(file, JSON.stringify(data, null, 2));
  console.log(`Added ${mfr} to ${driver}`);
}

addFingerprint('temphumidsensor', '_TZE200_vvmbj46n');
addFingerprint('button_wireless_1', '_TZ3000_kxaow5ki');
addFingerprint('presence_sensor_radar', '_TZE284_bquwrqh1');
addFingerprint('smart_knob', '_TZ3000_402vrq2i');
addFingerprint('radiator_valve', '_TZE284_xnbkhhdr');
addFingerprint('climate_sensor', '_TZ3000_bgsigers');
addFingerprint('presence_sensor_radar', '_TZE200_rhgsbacq');
addFingerprint('wall_switch_1gang_1way', '_TZ3000_blhvsaqf');

addFingerprint('switch_2gang', '_TZ3000_l9brjwau');
addFingerprint('switch_3gang', '_TZ3000_qkixdnon');

addFingerprint('switch_1gang', '_TZ3000_famkxci2');
addFingerprint('switch_1gang', '_TZ3000_ee8nrt2l');

addFingerprint('switch_1gang', '_TZ3000_itb0omhv');
addFingerprint('switch_1gang', '_TZ3000_u3nv1jwk');
addFingerprint('switch_1gang', '_TZ3000_qeuvnohg');
addFingerprint('switch_1gang', '_TZ3000_wkr3jqmr');
addFingerprint('switch_1gang', '_TZ3000_wzmuk9ai');
addFingerprint('switch_1gang', '_TZ3000_ww6drja5');
addFingerprint('switch_1gang', '_TZ3000_pjb1ua0m');
addFingerprint('switch_1gang', '_TZ3000_mrpevh8p');
