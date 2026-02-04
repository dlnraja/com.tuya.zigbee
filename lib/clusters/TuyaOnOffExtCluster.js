'use strict';

const { Cluster, ZCLDataTypes } = require('zigbee-clusters');

/**
 * TuyaOnOffExtCluster - v5.8.23 Extended OnOff Attributes
 * Custom Tuya attributes on cluster 0x0006 - zigpy #823
 * 
 * WARNING: DO NOT register with Cluster.addCluster() - would override standard OnOff!
 * Use as reference for attribute IDs only. Access via zclNode.endpoints[N].clusters.onOff
 * 
 * Sources: zha-device-handlers TuyaZBOnOffAttributeCluster, TuyaSmartRemoteOnOffCluster
 */
class TuyaOnOffExtCluster extends Cluster {
  static get ID() { return 0x0006; }
  static get NAME() { return 'onOff'; }

  static get ATTRIBUTES() {
    return {
      onOff: { id: 0, type: ZCLDataTypes.bool },
      backlightSwitch: { id: 0x5000, type: ZCLDataTypes.enum8 },
      childLock: { id: 0x8000, type: ZCLDataTypes.bool },
      backlightMode: { id: 0x8001, type: ZCLDataTypes.enum8 },
      powerOnState: { id: 0x8002, type: ZCLDataTypes.enum8 },
      overCurrentAlarm: { id: 0x8003, type: ZCLDataTypes.bool },
      switchOperationMode: { id: 0x8004, type: ZCLDataTypes.enum8 },
    };
  }

  static get COMMANDS() {
    return {
      setOff: { id: 0 },
      setOn: { id: 1 },
      toggle: { id: 2 },
      rotateCommand: { id: 0xFC, args: { direction: ZCLDataTypes.enum8 } },
      sceneCommand: { id: 0xFD, args: { action: ZCLDataTypes.enum8 } },
    };
  }
}

TuyaOnOffExtCluster.BACKLIGHT_MODE = { OFF: 0, MODE_1: 1, MODE_2: 2 };
TuyaOnOffExtCluster.POWER_ON_STATE = { OFF: 0, ON: 1, LAST_STATE: 2 };
TuyaOnOffExtCluster.OPERATION_MODE = { COMMAND: 0, EVENT: 1 };
TuyaOnOffExtCluster.ROTATE_DIR = { RIGHT: 0, LEFT: 1, STOP: 2 };
TuyaOnOffExtCluster.SCENE_ACTION = { SINGLE: 0, DOUBLE: 1, LONG: 2 };

module.exports = TuyaOnOffExtCluster;
