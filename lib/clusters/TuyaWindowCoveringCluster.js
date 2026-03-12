'use strict';

const { WindowCoveringCluster, ZCLDataTypes } = require('zigbee-clusters');

/**
 * TuyaWindowCoveringCluster - Extended WindowCovering for Tuya curtain devices
 * Adds Tuya-specific attributes for ZCL-based curtains (TS130F, etc.)
 * - windowCoverStatus (0xF000): Tuya private status (Open/Stop/Close)
 * - calibrationMode (61441): Start/End calibration
 * - motorReversal (61442): On/Off direction reversal
 * - calibrationTime (61443): Calibration duration
 * Source: JohanBendz SDK3 lib/TuyaWindowCoveringCluster.js
 */
class TuyaWindowCoveringCluster extends WindowCoveringCluster {

  static get ATTRIBUTES() {
    return {
      ...super.ATTRIBUTES,
      windowCoverStatus: {
        id: 0xF000,
        type: ZCLDataTypes.enum8({
          Open: 0,
          Stop: 1,
          Close: 2,
        }),
      },
      calibrationMode: {
        id: 61441,
        type: ZCLDataTypes.enum8({
          Start: 0,
          End: 1,
        }),
      },
      motorReversal: {
        id: 61442,
        type: ZCLDataTypes.enum8({
          Off: 0,
          On: 1,
        }),
      },
      calibrationTime: {
        id: 61443,
        type: ZCLDataTypes.uint16,
      },
    };
  }

  static get COMMANDS() {
    return {
      ...super.COMMANDS,
    };
  }
}

module.exports = TuyaWindowCoveringCluster;
