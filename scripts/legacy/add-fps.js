#!/usr/bin/env node
'use strict';
const fs = require('fs'), p = require('path');
const D = p.join(__dirname, '..', 'drivers');

// Manufacturer name additions per driver
const MFR_ADDS = {
  presence_sensor_radar: [
    '_TZE284_pzm3wab5', '_TZE284_twybxdzl', '_TZE284_hgeqeyuv',
    '_TZE200_juzago6i', '_TZE284_vceqncho', '_TZE284_who1jxwd', 'B3876M9'
  ],
  motion_sensor: [
    '_TZE204_debczeci', '_TZE284_tre6haif', 'PIRIV01', 'VABRATE'
  ],
  climate_sensor: [
    '_TZE284_9yapgbuv', '_TZE284_hodyryli', '_TZE204_w2vunxzm',
    'DHT0001', 'DHTA001', 'NTCHT01'
  ],
  air_quality_comprehensive: [
    '_TZE284_8b9zpaav', '_TZE284_it9utkro'
  ],
  radiator_valve: ['_TZE284_noixx2uz', '_TZE204_wc2w9t1s'],
  switch_1gang: ['_TZ3000_trdx8uxs', '_TZ3000_gdsvhfao'],
  switch_4gang: ['_TZ3000_tyg4yiat'],
  switch_wall_6gang: ['_TZE204_ad2jkxwh', '_TZE204_72bewjky', 'TZE204_7sjncirf'],
  plug_smart: ['_TZ3210_ph1joc22', '_TZ3000_pl5v1yyy'],
  smoke_detector_advanced: ['_TZE200_ioxkjvuz', '_TZE204_qaxkdgyt'],
  dimmer_wall_1gang: ['_TZE284_68utemio', '_TZE200_dcnsggvz', '_TZE200_tgeqdjgk'],
  curtain_motor: ['_TZE210_inpjmc0h'],
  button_emergency_sos: ['_TZ3000_8utxxtzr'],
  ir_blaster: [
    '_TZ3290_jxvzqatwgsaqzx1u', '_TZ3290_lypnqvlem5eq1ree',
    '_TZ3290_nba3knpsarkawgnt'
  ],
  fan_controller: ['_TZE284_ikul00sx'],
  contact_sensor: ['_TZE284_2baujqot', 'CAT0001', 'DSS0010'],
  soil_sensor: ['_TZE284_hdml1aav'],
  gas_detector: ['_TZE200_ioxkjvuz']
};

// ProductId additions per driver (only non-standard ones)
const PID_ADDS = {
  presence_sensor_radar: ['ZP-301Z'],
  curtain_motor: ['TS0301'],
  climate_sensor: ['Excellux'],
  motion_sensor: ['Excellux'],
  contact_sensor: ['Excellux']
};

let totalMfr = 0, totalPid = 0;
for (const [drv, mfrs] of Object.entries(MFR_ADDS)) {
  const f = p.join(D, drv, 'driver.compose.json');
  if (!fs.existsSync(f)) { console.log('SKIP ' + drv + ' (no file)'); continue; }
  const j = JSON.parse(fs.readFileSync(f, 'utf8'));
  if (!j.zigbee) { console.log('SKIP ' + drv + ' (no zigbee)'); continue; }
  const exMfr = new Set((j.zigbee.manufacturerName || []).map(x => x.toLowerCase()));
  let addedM = 0;
  for (const m of mfrs) {
    if (!exMfr.has(m.toLowerCase())) {
      j.zigbee.manufacturerName.push(m);
      addedM++;
    }
  }
  // Add productIds if needed
  let addedP = 0;
  if (PID_ADDS[drv]) {
    const exPid = new Set((j.zigbee.productId || []).map(x => x.toLowerCase()));
    for (const pid of PID_ADDS[drv]) {
      if (!exPid.has(pid.toLowerCase())) {
        j.zigbee.productId.push(pid);
        addedP++;
      }
    }
  }
  if (addedM || addedP) {
    fs.writeFileSync(f, JSON.stringify(j, null, 2) + '\n');
    console.log(drv + ': +' + addedM + ' mfrs, +' + addedP + ' pids');
    totalMfr += addedM; totalPid += addedP;
  } else {
    console.log(drv + ': already up to date');
  }
}
console.log('\nTotal: +' + totalMfr + ' manufacturers, +' + totalPid + ' productIds');
console.log('Skipped 5 unknown/unmappable: _TZE204_dwcarsat, _TZE204_tuhfx7tf, _TZE284_q22avxbv, _TZE284_roujjevx, _TZE284_mxujdmxo');
