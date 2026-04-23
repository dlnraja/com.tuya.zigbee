const fs = require('fs');
const path = require('path');

// New fingerprints from GitHub issues and forum reports
const newFingerprints = [
  // GitHub #1352: TS0041 1-button wireless (_TZ3000_kxaow5ki)
  { mfr: '_TZ3000_kxaow5ki', pid: 'TS0041', driver: 'button_wireless_1' },
  // GitHub #1351: PIR Motion Brightness (_TZE284_bquwrqh1)
  { mfr: '_TZE284_bquwrqh1', pid: 'TS0601', driver: 'presence_sensor_radar' },
  // GitHub #1349: Smart Knob Dimmer (_TZ3000_402vrq2i)
  { mfr: '_TZ3000_402vrq2i', pid: 'TS004F', driver: 'smart_knob' },
  // GitHub #1345: AVATTO WT198 (_TZE284_xnbkhhdr)
  { mfr: '_TZE284_xnbkhhdr', pid: 'TS0601', driver: 'radiator_valve' },
  // GitHub #1344: _TZ3000_bgsigers stopped working
  { mfr: '_TZ3000_bgsigers', pid: 'TS0201', driver: 'climate_sensor' },
  // GitHub #1343: 10G 4in1 motionsensor (_TZE200_rhgsbacq)
  { mfr: '_TZE200_rhgsbacq', pid: 'TS0601', driver: 'presence_sensor_radar' },
  // GitHub #1341: Plant sensor (_TZE284_aao3yzhs)
  { mfr: '_TZE284_aao3yzhs', pid: 'TS0601', driver: 'climate_sensor' },
  // GitHub #1339: BSEED 1 button (_TZ3000_blhvsaqf)
  { mfr: '_TZ3000_blhvsaqf', pid: 'TS0001', driver: 'wall_switch_1gang_1way' },
];

// Check which ones are already in drivers
const d = 'drivers';
let added = 0, existing = 0;
newFingerprints.forEach(fp => {
  let found = false;
  fs.readdirSync(d).forEach(dr => {
    try {
      const c = JSON.parse(fs.readFileSync(path.join(d, dr, 'driver.compose.json'), 'utf8'));
      const z = Array.isArray(c.zigbee) ? c.zigbee : [c.zigbee]      ;
      z.forEach(entry => {
        if ((entry.manufacturerName || []).includes(fp.mfr) && (entry.productId || []).includes(fp.pid)) {
          found = true;
          if (dr !== fp.driver) {
            console.log('MISMATCH: ' + fp.mfr + '|' + fp.pid + ' in ' + dr + ' but expected ' + fp.driver);
          }
        }
      });
    } catch(e) {}
  });
  if (found) { existing++; }
  else { console.log('NEEDS ADD: ' + fp.mfr + '|' + fp.pid + ' -> ' + fp.driver); added++; }
});
console.log('\nExisting: ' + existing + ', Need to add: ' + added);
