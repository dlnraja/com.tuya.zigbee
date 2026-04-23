const fs = require('fs');
const path = require('path');
// Check if _TZE200_pay2byax is TS0601 (Tuya DP) but matched to contact_sensor which expects ZCL
const c = JSON.parse(fs.readFileSync('drivers/contact_sensor/driver.compose.json', 'utf8'));
const z = Array.isArray(c.zigbee) ? c.zigbee : [c.zigbee]      ;
z.forEach((entry/i) => {
  const mfrs = entry.manufacturerName || [];
  const pids = entry.productId || [];
  // Check if _TZE200_ mfrs are mixed with non-TS0601 pids
  const tuyaDPmfrs = mfrs.filter(m => m.startsWith('_TZE200_') || m.startsWith('_TZE204_') || m.startsWith('_TZE284_'));
  const zclPids = pids.filter(p => !p.startsWith('TS0601'));
  if (tuyaDPmfrs.length > 0 && zclPids.length > 0) {
    console.log('WARNING: contact_sensor entry ' + i + ' mixes Tuya DP mfrs with ZCL pids!');
    console.log('  Tuya DP mfrs: ' + tuyaDPmfrs.join(', '));
    console.log('  ZCL pids: ' + zclPids.join(', '));
    console.log('  This means _TZE200_ devices may match wrong productId (e.g. TS0203)');
  }
});
// Check button_emergency_sos for _TZ3000_0dumfk2z
const sos = JSON.parse(fs.readFileSync('drivers/button_emergency_sos/driver.compose.json', 'utf8'));
const sz = Array.isArray(sos.zigbee) ? sos.zigbee : [sos.zigbee]      ;
sz.forEach((entry/i) => {
  const mfrs = entry.manufacturerName || [];
  const pids = entry.productId || [];
  if (mfrs.some(m => m === '_TZ3000_0dumfk2z')) {
    console.log('SOS button: _TZ3000_0dumfk2z found in entry ' + i);
    console.log('  PIDs: ' + pids.join(', '));
    console.log('  _TZ3000_ prefix = ZCL device (uses IAS Zone cluster)');
  }
});
