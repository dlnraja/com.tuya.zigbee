'use strict';
const { safeParse } = require('../../lib/utils/tuyaUtils.js');
const TuyaSpecificClusterDevice = require('../../lib/tuya/TuyaSpecificClusterDevice');
const { smartParse } = require('../../lib/managers/SmartDivisorManager');

// Standard Tuya energy DPs — scaled via SmartDivisorManager auto divisor detection
const ENERGY_DP_MAP = {
  17: 'measure_current', // A
  18: 'measure_power',   // W
  19: 'measure_voltage', // V
  20: 'meter_power',     // kWh
};

class GenericTuyaDevice extends TuyaSpecificClusterDevice {
  async onNodeInit({ zclNode }) {
    await super.onNodeInit({ zclNode });
    // v9.0.416 (P92.124): the DIY capabilities (tuya_dp_value/string/raw/
    // cluster_event) were declared but the bridge that serves them was
    // never instantiated — dead caps on the DIY driver itself.
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

     const capability = ENERGY_DP_MAP[data.dp];
     if (!capability || typeof data.value !== 'number' || !this.hasCapability(capability)) { return; }

     const value = smartParse(data.value, data.dp, {
       manufacturerName: this.getSetting('zb_manufacturer_name') || '',
       capability,
       deviceId: this.getData()?.id || '',
     });
     this.safeSetCapabilityValue(capability, value).catch(err => this.error(`Failed to set ${capability}:`, err));
  }
}

module.exports = GenericTuyaDevice;
