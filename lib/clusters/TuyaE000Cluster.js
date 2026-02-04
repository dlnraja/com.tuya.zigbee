'use strict';

const { Cluster, ZCLDataTypes } = require('zigbee-clusters');

/**
 * TuyaE000Cluster - v5.8.15 MOES button fix
 * Registers cluster 0xE000 (57344) so SDK routes frames to handlers
 * Used by: _TZ3000_zgyzgdua, _TZ3000_abrsvsou TS0044
 */
class TuyaE000Cluster extends Cluster {
  static get ID() { return 0xE000; }
  static get NAME() { return 'tuyaE000'; }

  static get ATTRIBUTES() {
    return {};
  }

  static get COMMANDS() {
    return {
      buttonPress: {
        id: 0x00,
        args: {
          button: ZCLDataTypes.uint8,
          pressType: ZCLDataTypes.uint8,
        },
      },
      buttonEvent: {
        id: 0x01,
        args: {
          data: ZCLDataTypes.buffer,
        },
      },
    };
  }
}

// Register cluster
try {
  Cluster.addCluster(TuyaE000Cluster);
} catch (e) {
  // May already be registered
}

module.exports = TuyaE000Cluster;
