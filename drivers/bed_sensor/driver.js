'use strict';

const BaseZigBeeDriver = require('../../lib/drivers/BaseZigBeeDriver');

/**
 * Bed Sensor Driver — SDK3 Compliant
 *
 * Flow card registration for bed presence detection.
 * Uses idempotent registration pattern (no duplicate listeners on reconnect).
 *
 * @version 8.2.0
 */
class BedSensorDriver extends BaseZigBeeDriver {

  async onInit() {
    await super.onInit();
    this.log('[BedSensor] Driver initialized');
    this._registerFlowCards();
  }

  _registerFlowCards() {
    // Condition: Is bed occupied?
    try {
      const card = this.homey.flow.getConditionCard('bed_sensor_is_occupied');
      if (card) {
        card.registerRunListener(async (args) => {
          if (!args.device) return false;
          return args.device.getCapabilityValue('alarm_contact') === true;
        });
      }
    } catch (err) {
      this.error('[BedSensor] Flow card registration error:', err.message);
    }

    this.log('[BedSensor] Flow cards registered');
  }
}

module.exports = BedSensorDriver;
