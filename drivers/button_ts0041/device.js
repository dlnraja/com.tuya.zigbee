'use strict';

const { ZigBeeDevice } = require('homey-zigbeedriver');

/**
 * TS0041 - 1 Button Wireless Remote
 * STABLE DRIVER - Aligned with Homey Guidelines
 *
 * - class: button (controller, NOT controllable)
 * - NO onoff/dim capabilities
 * - Flow cards for button events
 * - measure_battery only
 */
class TS0041Device extends ZigBeeDevice {

  async onNodeInit({ zclNode }) {
    this.log('TS0041 Button initializing...');

    // Battery reporting
    if (this.hasCapability('measure_battery')) {
      this.registerAttrReportListener('genPowerCfg', 'batteryPercentageRemaining', 1, 43200, 2,
        value => {
          const battery = Math.round(value / 2);
          this.log('Battery:', battery, '%');
          this.setCapabilityValue('measure_battery', battery).catch(this.error);
        }, 1
      ).catch(this.error);
    }

    // Button commands (scene triggers)
    this.registerCommandListener('onOff', 'on', async () => {
      this.log('Button pressed');
      await this.homey.flow.getDeviceTriggerCard('button_pressed').trigger(this, {}, {}).catch(this.error);
    }, 1);

    this.registerCommandListener('onOff', 'off', async () => {
      this.log('Button pressed (off variant)');
      await this.homey.flow.getDeviceTriggerCard('button_pressed').trigger(this, {}, {}).catch(this.error);
    }, 1);

    this.log('✅ TS0041 Button ready');
  }
}

module.exports = TS0041Device;
