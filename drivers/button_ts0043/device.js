'use strict';

const { ZigBeeDevice } = require('homey-zigbeedriver');

/**
 * TS0043 - 3 Button Wireless Remote
 * STABLE DRIVER - Aligned with Homey Guidelines
 */
class TS0043Device extends ZigBeeDevice {

  async onNodeInit({ zclNode }) {
    this.log('TS0043 Button (3 buttons) initializing...');

    // Battery
    if (this.hasCapability('measure_battery')) {
      this.registerAttrReportListener('genPowerCfg', 'batteryPercentageRemaining', 1, 43200, 2,
        value => {
          this.setCapabilityValue('measure_battery', Math.round(value / 2)).catch(this.error);
        }, 1
      ).catch(this.error);
    }

    // Button 1
    this.registerCommandListener('onOff', 'on', async () => {
      await this.homey.flow.getDeviceTriggerCard('button_1_pressed').trigger(this).catch(this.error);
    }, 1);

    // Button 2
    this.registerCommandListener('onOff', 'on', async () => {
      await this.homey.flow.getDeviceTriggerCard('button_2_pressed').trigger(this).catch(this.error);
    }, 2);

    // Button 3
    this.registerCommandListener('onOff', 'on', async () => {
      await this.homey.flow.getDeviceTriggerCard('button_3_pressed').trigger(this).catch(this.error);
    }, 3);

    this.log('✅ TS0043 ready');
  }
}

module.exports = TS0043Device;
