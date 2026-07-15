// Add measure_voltage to sensorCapabilities in device.js
const fs = require('fs');
const path = require('path');

const drivers = ['dimmer_wall_1gang', 'sensor_motion_presence', 'pir_sensor_2', 'sensor_contact_zigbee'];
const ROOT = path.resolve(__dirname, '..', '..');

for (const d of drivers) {
  const p = path.join(ROOT, 'drivers', d, 'device.js');
  if (!fs.existsSync(p)) { console.log(d + ': no device.js'); continue; }
  let txt = fs.readFileSync(p, 'utf8');
  // Find sensorCapabilities getter
  const re = /(sensorCapabilities\s*\(\s*\)\s*\{[\s\S]*?return\s*\[)([\s\S]*?)(\];\s*\})/;
  const m = txt.match(re);
  if (m && !m[2].includes('measure_voltage')) {
    const newArr = m[2].trimEnd().replace(/,\s*$/, '') + ", 'measure_voltage'";
    const newTxt = txt.replace(re, m[1] + '\n        ' + newArr + ',\n      ' + m[3]);
    if (newTxt !== txt) {
      fs.writeFileSync(p, newTxt);
      console.log(d + ': added measure_voltage to sensorCapabilities');
    } else {
      console.log(d + ': regex matched but no change');
    }
  } else if (m) {
    console.log(d + ': already has measure_voltage in sensorCapabilities');
  } else {
    console.log(d + ': no sensorCapabilities getter found');
  }
}
