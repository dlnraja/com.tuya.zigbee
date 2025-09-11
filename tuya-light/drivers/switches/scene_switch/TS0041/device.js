'use strict';

const BaseDevice = require('../../../common/BaseDevice');

// Tuya Scene Switch (e.g., TS0041, TS004F)
class TuyaSceneSwitch extends BaseDevice {

  /**
   * Handles Tuya-specific datapoint messages.
   * @param {number} dp The datapoint ID.
   * @param {Buffer} data The datapoint data.
   */
  onDatapoint(dp, data) {
    this.log(`Received datapoint ${dp} with data:`, data);

    // Datapoint 1 indicates the button action
    if (dp === 1) {
      const action = data[0];
      switch (action) {
        case 0: // Single press
          this.log('Button pressed: single');
          this.homey.flow.getDeviceTriggerCard('ts0041_single_press').trigger(this, {}, {});
          break;
        case 1: // Double press
          this.log('Button pressed: double');
          this.homey.flow.getDeviceTriggerCard('ts0041_double_press').trigger(this, {}, {});
          break;
        case 2: // Hold
          this.log('Button pressed: hold');
          this.homey.flow.getDeviceTriggerCard('ts0041_hold').trigger(this, {}, {});
          break;
        default:
          this.log(`Unknown button action: ${action}`);
      }
    }
  }

}

module.exports = TuyaSceneSwitch;
