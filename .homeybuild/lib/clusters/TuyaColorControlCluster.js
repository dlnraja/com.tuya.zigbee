'use strict';

const { ColorControlCluster, ZCLDataTypes } = require('zigbee-clusters');

/**
 * TuyaColorControlCluster - Extended ColorControl for Tuya RGB devices
 * Adds tuyaRgbMode command (id 240) for switching between RGB and white mode.
 * Adds tuyaBrightness (0xF001) and tuyaRgbMode (0xF000) attributes.
 * Source: JohanBendz SDK3 lib/TuyaColorControlCluster.js
 * WARNING: Only register for devices that need it (TS0505B ZCL-only RGB variants)
 */
class TuyaColorControlCluster extends ColorControlCluster {

  static get ATTRIBUTES() {
    return {
      ...super.ATTRIBUTES,
      tuyaBrightness: { id: 0xF001, type: ZCLDataTypes.uint16 },
      tuyaRgbMode: { id: 0xF000, type: ZCLDataTypes.uint16 },
    };
  }

  static get COMMANDS() {
    return {
      ...super.COMMANDS,
      tuyaRgbMode: {
        id: 240,
        args: { enable: ZCLDataTypes.uint8 },
      },
    };
  }
}

module.exports = TuyaColorControlCluster;
