'use strict';

const { ZigBeeDevice } = require('homey-zigbeedriver');
const { CLUSTER } = require('zigbee-clusters');

/**
 * IKEA TRÅDFRI Motion Sensor
 */
class IkeaMotionSensorDevice extends ZigBeeDevice {

  async onNodeInit({ zclNode }) {
    this.log('IKEA Motion Sensor initializing...');

    // Occupancy sensing
    if (zclNode.endpoints[1]?.clusters?.occupancySensing) {
      this.log('[IKEA] Setting up occupancy sensing...');

      zclNode.endpoints[1].clusters.occupancySensing.on('attr.occupancy', (value) => {
        const motion = (value & 0x01) === 1;
        this.log(`[IKEA] Motion: ${motion}`);
        this.setCapabilityValue('alarm_motion', motion).catch(this.error);

        // Auto-reset after 3 minutes (IKEA default)
        if (motion && !this._resetTimer) {
          this._resetTimer = setTimeout(() => {
            this.setCapabilityValue('alarm_motion', false).catch(this.error);
            this._resetTimer = null;
          }, 180000);
        }
      });
    }

    // Battery
    if (zclNode.endpoints[1]?.clusters?.genPowerCfg) {
      this.registerCapability('measure_battery', CLUSTER.POWER_CONFIGURATION, {
        getOpts: {
          getOnStart: true,
          pollInterval: 86400000 // 24 hours
        },
        get: 'batteryPercentageRemaining',
        report: 'batteryPercentageRemaining',
        reportParser: value => Math.round(value / 2)
      });
    }

    this.log('IKEA Motion Sensor initialized');
  }

  onDeleted() {
    if (this._resetTimer) {
      clearTimeout(this._resetTimer);
    }
  }
}

module.exports = IkeaMotionSensorDevice;
