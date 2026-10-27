'use strict';

const TuyaZigbeeDevice = require('../../lib/tuya/TuyaZigbeeDevice');
const { CLUSTER } = require('zigbee-clusters');

/**
 * P3080 — SONOFF MINI-ZBRBS roller shutter switch (standard ZCL 0x0102, no Tuya DP).
 * Source: zigbee-herdsman-converters sonoff.ts (windowCovering lift, coverInverted false).
 * WHY invert: ZCL lift 0 % = open while Homey windowcoverings_set 1 = open.
 * Nothing is mandatory at pairing: every step below is best effort and never throws.
 * eWeLink calibration attributes (0xFC11) are left out on purpose.
 */
class CurtainSonoffMiniZbrbsDevice extends TuyaZigbeeDevice {

  invertPercentageLiftValue = true;

  get mainsPowered() { return true; }

  async onNodeInit({ zclNode }) {
    await super.onNodeInit({ zclNode });
    if (this._destroyed) {return;}
    if (this.hasCapability('measure_battery')) {
      await this.removeCapability('measure_battery').catch(() => {});
    }
    if (!this.hasCapability('windowcoverings_set')) {return;}
    try {
      this.registerCapability('windowcoverings_set', CLUSTER.WINDOW_COVERING);
    } catch (err) {
      this.log(`[MINI-ZBRBS] windowcoverings_set not registered: ${err?.message || err}`);
    }
  }
}

module.exports = CurtainSonoffMiniZbrbsDevice;
