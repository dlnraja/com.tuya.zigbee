'use strict';

/**
 * P3013 — AE-5503-S-H-ZIGBEE sauna thermostat (`_TZE204_eaasry7v` / TS0601).
 * Source: Koenkk/zigbee-herdsman-converters PR #13225 (Vadim Surpin, 2026-09-18).
 * Runtime = thermostat_tuya_dp; only the DP table and three write paths differ:
 * DP1 heat on/off (bool), DP16 setpoint 0–120 °C raw, DP24 local temp raw, DP40 child lock.
 */
const ThermostatTuyaDPDevice = require('../thermostat_tuya_dp/device');
const { SAUNA_AE5503: P, rxTable, sendEncoded } = require('../../lib/tuya/profiles/P3013DedicatedZ2MProfiles');

class SaunaThermostatAE5503Device extends ThermostatTuyaDPDevice {
  get mainsPowered() { return true; }

  get dpMappings() { return rxTable(P); }

  async onNodeInit(args) {
    await super.onNodeInit(args);
    // WHY: manufacturer-variation maps must never shadow the exact sauna table (÷1, not ÷10).
    this._dynamicDpMappings = rxTable(P);
    this._isPureTuyaDP = true;
    this.registerCapabilityListener('onoff', async (v) => sendEncoded(this, P.encodeOnOff(v)));
    this.registerCapabilityListener('target_temperature', async (v) => sendEncoded(this, P.encodeSetpoint(v)));
    if (this.hasCapability('child_lock')) {
      this.registerCapabilityListener('child_lock', async (v) => sendEncoded(this, P.encodeChildLock(v)));
    }
    this.log('[P3013] AE-5503 sauna profile active (DP1/16/24/40)');
  }
}

module.exports = SaunaThermostatAE5503Device;
