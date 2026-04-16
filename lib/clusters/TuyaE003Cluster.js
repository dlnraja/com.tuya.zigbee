'use strict';
const { Cluster, ZCLDataTypes } = require('zigbee-clusters');

/**
 * TuyaE003Cluster - v5.11.30
 * Cluster 0xE003 (57347) - Tuya Scene/Button Events
 * Used by some Tuya remotes and scene controllers.
 * Sources: zigpy #823, Z2M tuya.ts, field observation
 */
class TuyaE003Cluster extends Cluster {
  static get ID() { return 0xE003; }
  static get NAME() { return 'tuyaE003'; }

  static get ATTRIBUTES() {
    return {
      sceneMode: { id: 0xD020, type: ZCLDataTypes.enum8 },
      sceneId: { id: 0xD021, type: ZCLDataTypes.uint8 },
    };
  }

  static get COMMANDS() {
    const cmds = {};
    const bufArgs = { data: ZCLDataTypes.buffer };
    for (let i = 0; i <= 6; i++) {
      cmds[`cmd${i}`] = { id: i, args: bufArgs };
    }
    cmds.cmdFD = { id: 0xFD, args: bufArgs };
    cmds.cmdFE = { id: 0xFE, args: bufArgs };
    return cmds;
  }
}

try { Cluster.addCluster(TuyaE003Cluster); } catch (e) {}
module.exports = TuyaE003Cluster;
