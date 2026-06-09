const fs = require('fs');

// Z2M samples
const report = JSON.parse(fs.readFileSync('./data/community-sync/report.json', 'utf8'));
const z2mFps = report.src.z2m.fingerprints || [];
process.stdout.write('Z2M samples (first 5):\n');
z2mFps.slice(0, 5).forEach(f => process.stdout.write(JSON.stringify(f) + '\n'));

// Driver compose sample
const compose = JSON.parse(fs.readFileSync('./drivers/switch_1gang/driver.compose.json', 'utf8'));
process.stdout.write('\nswitch_1gang compose zigbee sample:\n');
if (compose.zigbee && compose.zigbee.manufacturerName && compose.zigbee.productId) {
  const mfrs = Array.isArray(compose.zigbee.manufacturerName) ? compose.zigbee.manufacturerName : [compose.zigbee.manufacturerName];
  const pids = Array.isArray(compose.zigbee.productId) ? compose.zigbee.productId : [compose.zigbee.productId];
  process.stdout.write('  mfrs (first 3): ' + mfrs.slice(0, 3).join(', ') + '\n');
  process.stdout.write('  pids (first 3): ' + pids.slice(0, 3).join(', ') + '\n');
  process.stdout.write('  total mfrs: ' + mfrs.length + '\n');
  process.stdout.write('  total pids: ' + pids.length + '\n');
}

// Check if there's a match at all
process.stdout.write('\nChecking one match:\n');
if (z2mFps.length > 0 && compose.zigbee) {
  const sample = z2mFps[0];
  const mfrs = Array.isArray(compose.zigbee.manufacturerName) ? compose.zigbee.manufacturerName : [compose.zigbee.manufacturerName];
  const pids = Array.isArray(compose.zigbee.productId) ? compose.zigbee.productId : [compose.zigbee.productId];
  process.stdout.write('Z2M first: ' + JSON.stringify(sample) + '\n');
  process.stdout.write('Mfr in switch_1gang? ' + mfrs.includes(sample.mfr) + '\n');
  process.stdout.write('Pid in switch_1gang? ' + pids.includes(sample.productId) + '\n');
}