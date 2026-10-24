'use strict';

/**
 * P3013 — TS0601 6-gang wall panel with power metering (`_TZE284_hbxadcl0`).
 * Source: Koenkk/zigbee-herdsman-converters PR #13085 (hammondses, 2026-09-04), TS0601_6gang_switch_2.
 * Gangs DP1–6 as switch_wall_6gang; adds DP20 kWh÷100, DP21 A÷1000, DP22 W÷10, DP23 V÷10.
 * DP15 here is power-on behaviour (not backlight) so it is kept internal and never written.
 */
const Switch6GangDevice = require('../switch_wall_6gang/device');
const { SWITCH6_HBXADCL0: P, rxTable } = require('../../lib/tuya/profiles/P3013DedicatedZ2MProfiles');

class SwitchWall6GangMeteringDevice extends Switch6GangDevice {
  get dpMappings() { return rxTable(P); }

  _handleDP(dpId, rawValue) {
    const m = P.rx[dpId];
    if (m && !m.capability) {
      this.setStoreValue?.(`p3013_${m.internal}`, rawValue)?.catch?.(() => {});
      return;
    }
    return super._handleDP(dpId, rawValue);
  }
}

module.exports = SwitchWall6GangMeteringDevice;
