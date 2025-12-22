'use strict';

const { Cluster, ZCLDataTypes, BoundCluster } = require('zigbee-clusters');

/**
 * IAS ACE (Ancillary Control Equipment) Cluster - 0x0501 / 1281
 * v5.5.145 - Complete implementation for TS0215A SOS button
 *
 * This cluster is used by security devices like SOS buttons, panic buttons,
 * and keypads to send alarm commands to the coordinator.
 *
 * CRITICAL: The TS0215A SOS button sends 'commandEmergency' on this cluster,
 * NOT on the IAS Zone cluster!
 *
 * Message format from Zigbee2MQTT debug:
 * "Received Zigbee message type 'commandEmergency', cluster 'ssIasAce', data '{}' from endpoint 1"
 *
 * Source: Zigbee Cluster Library (ZCL) Specification + Zigbee2MQTT converters
 */

const CLUSTER_ID = 0x0501; // 1281 decimal
const CLUSTER_NAME = 'iasAce';

/**
 * IAS ACE Cluster - Client side (sends commands TO devices like keypads)
 */
class IasAceCluster extends Cluster {

  static get ID() {
    return CLUSTER_ID;
  }

  static get NAME() {
    return CLUSTER_NAME;
  }

  static get ATTRIBUTES() {
    return {};
  }

  static get COMMANDS() {
    return {
      // Commands sent TO the device (client -> server)
      arm: {
        id: 0x00,
        args: {
          armMode: ZCLDataTypes.enum8({
            disarm: 0,
            armDayHomeZonesOnly: 1,
            armNightSleepZonesOnly: 2,
            armAllZones: 3,
          }),
          armDisarmCode: ZCLDataTypes.string,
          zoneId: ZCLDataTypes.uint8,
        },
      },
      bypass: {
        id: 0x01,
        args: {
          numberOfZones: ZCLDataTypes.uint8,
          zoneIds: ZCLDataTypes.Array8(ZCLDataTypes.uint8),
          armDisarmCode: ZCLDataTypes.string,
        },
      },
      // Commands 0x02-0x04 are sent FROM the device (emergency, fire, panic)
      // They are defined here but received via BoundCluster
      emergency: {
        id: 0x02,
        args: {},
      },
      fire: {
        id: 0x03,
        args: {},
      },
      panic: {
        id: 0x04,
        args: {},
      },
      getZoneIdMap: {
        id: 0x05,
        args: {},
      },
      getZoneInformation: {
        id: 0x06,
        args: {
          zoneId: ZCLDataTypes.uint8,
        },
      },
      getPanelStatus: {
        id: 0x07,
        args: {},
      },
      getBypassedZoneList: {
        id: 0x08,
        args: {},
      },
      getZoneStatus: {
        id: 0x09,
        args: {
          startingZoneId: ZCLDataTypes.uint8,
          maxNumberOfZoneIds: ZCLDataTypes.uint8,
          zoneStatusMaskFlag: ZCLDataTypes.bool,
          zoneStatusMask: ZCLDataTypes.map16('alarm1', 'alarm2', 'tamper', 'battery', 'supervisionReports', 'restoreReports', 'trouble', 'ac'),
        },
      },
    };
  }
}

/**
 * IAS ACE Bound Cluster - Server side (RECEIVES commands FROM SOS buttons)
 *
 * This is the KEY class that receives commandEmergency from TS0215A!
 * The device sends commands to this bound cluster on the coordinator.
 *
 * Usage in device.js:
 *   zclNode.endpoints[1].bind('iasAce', new IasAceBoundCluster({
 *     onEmergency: () => { this._handleAlarm(); },
 *     onFire: () => { this._handleAlarm(); },
 *     onPanic: () => { this._handleAlarm(); }
 *   }));
 */
class IasAceBoundCluster extends BoundCluster {

  constructor({ onArm, onEmergency, onFire, onPanic, onGetZoneIdMap, onGetZoneInfo, onGetPanelStatus, onGetBypassedZoneList, onGetZoneStatus } = {}) {
    super();
    this._onArm = onArm;
    this._onEmergency = onEmergency;
    this._onFire = onFire;
    this._onPanic = onPanic;
    this._onGetZoneIdMap = onGetZoneIdMap;
    this._onGetZoneInfo = onGetZoneInfo;
    this._onGetPanelStatus = onGetPanelStatus;
    this._onGetBypassedZoneList = onGetBypassedZoneList;
    this._onGetZoneStatus = onGetZoneStatus;
  }

  // Command 0x00: arm
  arm(payload) {
    console.log('[IasAceBoundCluster] 🔐 ARM command received:', payload);
    if (typeof this._onArm === 'function') {
      this._onArm(payload);
    }
  }

  // Command 0x02: emergency - THIS IS THE SOS BUTTON PRESS!
  emergency(payload) {
    console.log('[IasAceBoundCluster] 🆘🆘🆘 EMERGENCY command received!', payload);
    if (typeof this._onEmergency === 'function') {
      this._onEmergency(payload);
    }
  }

  // Command 0x03: fire
  fire(payload) {
    console.log('[IasAceBoundCluster] 🔥🔥🔥 FIRE command received!', payload);
    if (typeof this._onFire === 'function') {
      this._onFire(payload);
    }
  }

  // Command 0x04: panic
  panic(payload) {
    console.log('[IasAceBoundCluster] 🚨🚨🚨 PANIC command received!', payload);
    if (typeof this._onPanic === 'function') {
      this._onPanic(payload);
    }
  }

  // Command 0x05: getZoneIdMap
  getZoneIdMap(payload) {
    console.log('[IasAceBoundCluster] getZoneIdMap received:', payload);
    if (typeof this._onGetZoneIdMap === 'function') {
      this._onGetZoneIdMap(payload);
    }
  }

  // Command 0x06: getZoneInformation
  getZoneInformation(payload) {
    console.log('[IasAceBoundCluster] getZoneInformation received:', payload);
    if (typeof this._onGetZoneInfo === 'function') {
      this._onGetZoneInfo(payload);
    }
  }

  // Command 0x07: getPanelStatus
  getPanelStatus(payload) {
    console.log('[IasAceBoundCluster] getPanelStatus received:', payload);
    if (typeof this._onGetPanelStatus === 'function') {
      this._onGetPanelStatus(payload);
    }
  }

  // Command 0x08: getBypassedZoneList
  getBypassedZoneList(payload) {
    console.log('[IasAceBoundCluster] getBypassedZoneList received:', payload);
    if (typeof this._onGetBypassedZoneList === 'function') {
      this._onGetBypassedZoneList(payload);
    }
  }

  // Command 0x09: getZoneStatus
  getZoneStatus(payload) {
    console.log('[IasAceBoundCluster] getZoneStatus received:', payload);
    if (typeof this._onGetZoneStatus === 'function') {
      this._onGetZoneStatus(payload);
    }
  }
}

// Register the cluster with zigbee-clusters
try {
  Cluster.addCluster(IasAceCluster);
  console.log('[IasAceCluster] ✅ Cluster registered (ID: 0x0501 / 1281)');
} catch (e) {
  // Cluster may already exist
  if (!e.message.includes('already exists')) {
    console.log('[IasAceCluster] Registration note:', e.message);
  }
}

module.exports = {
  IasAceCluster,
  IasAceBoundCluster,
  CLUSTER_ID,
  CLUSTER_NAME
};
