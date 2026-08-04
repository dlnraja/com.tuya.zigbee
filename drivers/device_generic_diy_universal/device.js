'use strict';
const { safeParse } = require('../../lib/utils/tuyaUtils.js');
const TuyaSpecificClusterDevice = require('../../lib/tuya/TuyaSpecificClusterDevice');

// Energy scaling divisors for the standard Tuya energy DPs (raw value / divisor).
// Scaled via the base class registerTuyaDatapoint()/convertTuyaValue() scale mechanism
// (unified-base Tuya-DP drivers use smartDivisor: true via SmartDivisorManager instead).
const ENERGY_DP_DIVISORS = {
  17: { capability: 'measure_current', divisor: 1000 }, // mA -> A
  18: { capability: 'measure_power', divisor: 10 },     // 0.1W -> W
  19: { capability: 'measure_voltage', divisor: 10 },   // 0.1V -> V
  20: { capability: 'meter_power', divisor: 100 },      // 0.01kWh -> kWh
};

class GenericDiyUniversalDevice extends TuyaSpecificClusterDevice {
  async onNodeInit({ zclNode }) {
    await super.onNodeInit({ zclNode });

    // Register standard Tuya energy DPs with their scaling divisors
    for (const [dp, { capability, divisor }] of Object.entries(ENERGY_DP_DIVISORS)) {
      this.registerTuyaDatapoint(Number(dp), capability, { scale: divisor });
    }

    // v5.12.56 (P92.124): instantiate the DIY bridge — its capabilities
    // (tuya_dp_value/string/raw/cluster_event) were declared but dead.
    try {
      const TuyaUniversalBridge = require('../../lib/TuyaUniversalBridge');
      this._universalBridge = new TuyaUniversalBridge(this);
      await this._universalBridge.init();
    } catch (e) {
      this.log('[BRIDGE] init failed (non-critical):', e.message);
    }
  }

  handleTuyaDataReport(data) {
     this.log('DP:', data.dp, data.value);
     super.handleTuyaDataReport(data);
  }
}

module.exports = GenericDiyUniversalDevice;
