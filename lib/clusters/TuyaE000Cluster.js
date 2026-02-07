'use strict';

const { Cluster, ZCLDataTypes } = require('zigbee-clusters');

/**
 * TuyaE000Cluster - v5.8.54 MOES button fix (diag e5c0bbf5)
 * Registers cluster 0xE000 (57344) so SDK routes frames to handlers
 * Used by: _TZ3000_zgyzgdua, _TZ3000_abrsvsou, _TZ3000_an5rjiwd TS0044/TS0041
 *
 * v5.8.54: CRITICAL FIX - Previous version defined only cmd 0x00 + 0x01 with
 * rigid uint8 args. Moes devices send varying command IDs with different payload
 * formats. SDK silently dropped unrecognized frames → zero physical button events.
 * Fix: Define cmd 0x00-0x06 + 0xFD/FE/FF with buffer args so ANY frame parses.
 */
class TuyaE000Cluster extends Cluster {
  static get ID() { return 0xE000; }
  static get NAME() { return 'tuyaE000'; }

  static get ATTRIBUTES() {
    return {};
  }

  static get COMMANDS() {
    // v5.8.54: Wide range of cmd IDs with buffer args (diag e5c0bbf5)
    // Moes buttons send various cmd IDs - rigid uint8 args caused silent drops
    const cmds = {};
    const bufArgs = { data: ZCLDataTypes.buffer };
    // Standard range (0x00-0x06) covers most Tuya button variants
    for (let i = 0; i <= 6; i++) {
      cmds[`cmd${i}`] = { id: i, args: bufArgs };
    }
    // Extended range for Tuya-specific commands
    cmds.cmdFD = { id: 0xFD, args: bufArgs };
    cmds.cmdFE = { id: 0xFE, args: bufArgs };
    cmds.cmdFF = { id: 0xFF, args: bufArgs };
    return cmds;
  }
}

// Register cluster
try {
  Cluster.addCluster(TuyaE000Cluster);
} catch (e) {
  // May already be registered
}

module.exports = TuyaE000Cluster;
