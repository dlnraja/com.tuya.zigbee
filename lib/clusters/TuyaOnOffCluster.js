'use strict';

const { CLUSTERS } = require('../constants/ZigbeeConstants.js');


/**
 * TuyaOnOffCluster — Extended OnOff cluster with Tuya-specific attributes
 *
 * Source: Johan Bendz (JohanBendz/com.tuya.zigbee), integrated complementarily.
 *
 * Tuya devices extend the standard OnOff cluster (0x0006) with custom attributes:
 * - 0x8000: childLock (bool) — prevent physical button presses
 * - 0x8001: indicatorMode (enum8) — LED indicator behavior (off/status/position)
 * - 0x8002: relayStatus (enum8) — power-on behavior (off/on/remember)
 *
 * These are standard ZCL attributes on Tuya's extended OnOff cluster,
 * NOT Tuya DP (CLUSTERS.TUYA_EF00) datapoints. This is the ZCL-native way to configure
 * these settings, and is more reliable than the DP approach for devices
 * that support it (the TX/RX issue from Rudi's forum post #5417).
 *
 * Usage:
 *   const TuyaOnOffCluster = require('../../lib/clusters/TuyaOnOffCluster');
 *   const { Cluster } = require('zigbee-clusters');
 *   Cluster.addCluster(TuyaOnOffCluster);
 *   // Then: zclNode.endpoints[1].clusters.onOff.readAttributes(['childLock', 'indicatorMode', 'relayStatus'])
 */

const { ZCLDataTypes, OnOffCluster } = require('zigbee-clusters');

// Define Tuya-specific enum types
ZCLDataTypes.enum8IndicatorMode = ZCLDataTypes.enum8({
  Off: 0x00,
  Status: 0x01,
  Position: 0x02
});

ZCLDataTypes.enum8RelayStatus = ZCLDataTypes.enum8({
  Off: 0x00,
  On: 0x01,
  Remember: 0x02
});

class TuyaOnOffCluster extends OnOffCluster {

  static get ATTRIBUTES() {
    return {
      ...super.ATTRIBUTES,
      // Tuya custom ZCL attributes on OnOff cluster
      childLock: { id: 0x8000, type: ZCLDataTypes.bool },
      indicatorMode: { id: 0x8001, type: ZCLDataTypes.enum8IndicatorMode },
      relayStatus: { id: 0x8002, type: ZCLDataTypes.enum8RelayStatus }
    };
  }
}

module.exports = TuyaOnOffCluster;

/*
 * Reference (from Johan Bendz):
 *
 * Attribute power_on_state (relayStatus, 0x8002):
 *   0 = off (relay off after power restore)
 *   1 = on  (relay on after power restore)
 *   2 = last state (remember state before power loss)
 *
 * This can be read/written via standard ZCL readAttributes/writeAttributes
 * on the OnOff cluster, which is more reliable than Tuya DP14 for devices
 * that support it (identified by having these attributes respond to reads).
 *
 * TX/RX optimization (from Rudi forum #5417):
 * Using ZCL attributes instead of Tuya DP reduces the message overhead
 * because ZCL attribute reports are standard Zigbee, while DP commands
 * go through the Tuya CLUSTERS.TUYA_EF00 custom cluster which requires extra framing.
 */
