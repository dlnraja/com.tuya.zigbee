'use strict';

/**
 * P3013 — Novato ZPV-01 battery water valve (`_TZE284_zm8zpwas` / TS0601).
 * Source: Koenkk/zigbee-herdsman-converters src/devices/tuya.ts (ZPV-01 definition).
 * DP1 valve on/off (bool), DP8 valve_state enum (0 unknown, 1 open, 2 closed), DP101 battery %.
 * NOTE: the long form `_TZE2841000000_zm8zpwas` (Zemismart PF-PM07D, P2835) stays on water_valve_smart.
 */
const WaterValveSmartDevice = require('../water_valve_smart/device');
const { VALVE_NOVATO_ZPV01: P, rxTable, sendEncoded } = require('../../lib/tuya/profiles/P3013DedicatedZ2MProfiles');

class ValveNovatoZPV01Device extends WaterValveSmartDevice {
  get dpMappings() { return rxTable(P); }

  async _setOnOff(value) {
    return sendEncoded(this, P.encodeOnOff(value));
  }

  _handleDP(dpId, rawValue) {
    const m = P.rx[dpId];
    if (m && !m.capability) {
      const v = typeof m.transform === 'function' ? m.transform(rawValue) : rawValue;
      this.setStoreValue?.(`p3013_${m.internal}`, v)?.catch?.(() => {});
      return;
    }
    return super._handleDP(dpId, rawValue);
  }
}

module.exports = ValveNovatoZPV01Device;
