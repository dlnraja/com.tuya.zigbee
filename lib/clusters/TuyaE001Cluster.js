'use strict';

const { Cluster, ZCLDataTypes } = require('zigbee-clusters');

/**
 * TuyaE001Cluster - v5.8.22 Switch Mode Cluster
 * Cluster 0xE001 (57345) - Power-on behavior, external switch type
 * Sources: zigpy #823, zha-device-handlers #3123
 */
class TuyaE001Cluster extends Cluster {
  static get ID() { return 0xE001; }
  static get NAME() { return 'tuyaE001'; }

  static get ATTRIBUTES() {
    return {
      // 0xD010: Power On Behavior - 0=Off, 1=On, 2=Last state
      powerOnBehavior: { id: 0xD010, type: ZCLDataTypes.enum8 },
      // 0xD011: Tuya magic (used during pairing)
      tuyaMagic: { id: 0xD011, type: ZCLDataTypes.uint8 },
      // 0xD030: Switch Mode / External Switch Type - 0=Toggle, 1=State, 2=Momentary
      switchMode: { id: 0xD030, type: ZCLDataTypes.enum8 },
      externalSwitchType: { id: 0xD030, type: ZCLDataTypes.enum8 }, // ZHA alias
    };
  }

  static get COMMANDS() {
    return {};
  }
}

// Export values for use in device handlers
TuyaE001Cluster.POWER_ON_BEHAVIOR = { OFF: 0, ON: 1, LAST_STATE: 2 };
TuyaE001Cluster.SWITCH_MODE = { TOGGLE: 0, STATE: 1, MOMENTARY: 2 };
TuyaE001Cluster.EXTERNAL_SWITCH_TYPE = TuyaE001Cluster.SWITCH_MODE; // ZHA alias

module.exports = TuyaE001Cluster;
