'use strict';

const { ZigBeeDevice } = require('homey-zigbeedriver');

class TS0044Device extends ZigBeeDevice {
  async onNodeInit({ zclNode }) {
    this.log('TS0044 (4 buttons) init...');

    // Battery
    if (this.hasCapability('measure_battery')) {
      this.registerAttrReportListener('genPowerCfg', 'batteryPercentageRemaining', 1, 43200, 2,
        v => this.setCapabilityValue('measure_battery', Math.round(v / 2)).catch(this.error), 1
      ).catch(this.error);
    }

    // Buttons 1-4
    for (let ep = 1; ep <= 4; ep++) {
      this.registerCommandListener('onOff', 'on', async () => {
        await this.homey.flow.getDeviceTriggerCard(`button_${ep}_pressed`).trigger(this).catch(this.error);
      }, ep);
    }

    this.log('✅ TS0044 ready');
  }
}

module.exports = TS0044Device;
