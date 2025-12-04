'use strict';

const { ZigBeeDevice } = require('homey-zigbeedriver');
const { CLUSTER } = require('zigbee-clusters');

/**
 * DimmerDualChannelDevice - v5.3.88
 *
 * Supports 2-channel dimmers like TS1101 / _TZ3000_7ysdnebc
 *
 * Channel 1: Endpoint 1 (onoff, dim)
 * Channel 2: Endpoint 2 (onoff.1, dim.1)
 */
class DimmerDualChannelDevice extends ZigBeeDevice {

  async onNodeInit({ zclNode }) {
    this.log('╔══════════════════════════════════════════════════════════════╗');
    this.log('║         DUAL CHANNEL DIMMER v5.3.88                          ║');
    this.log('╚══════════════════════════════════════════════════════════════╝');

    // ═══════════════════════════════════════════════════════════════════════
    // CHANNEL 1 - Endpoint 1 (main capabilities: onoff, dim)
    // ═══════════════════════════════════════════════════════════════════════

    // OnOff Channel 1
    if (this.hasCapability('onoff')) {
      this.registerCapability('onoff', CLUSTER.ON_OFF, {
        endpoint: 1,
      });
      this.log('[CH1] ✅ onoff registered on endpoint 1');
    }

    // Dim Channel 1
    if (this.hasCapability('dim')) {
      this.registerCapability('dim', CLUSTER.LEVEL_CONTROL, {
        endpoint: 1,
      });
      this.log('[CH1] ✅ dim registered on endpoint 1');
    }

    // ═══════════════════════════════════════════════════════════════════════
    // CHANNEL 2 - Endpoint 2 (sub-capabilities: onoff.1, dim.1)
    // ═══════════════════════════════════════════════════════════════════════

    // OnOff Channel 2
    if (this.hasCapability('onoff.1')) {
      this.registerCapability('onoff.1', CLUSTER.ON_OFF, {
        endpoint: 2,
      });
      this.log('[CH2] ✅ onoff.1 registered on endpoint 2');
    }

    // Dim Channel 2
    if (this.hasCapability('dim.1')) {
      this.registerCapability('dim.1', CLUSTER.LEVEL_CONTROL, {
        endpoint: 2,
      });
      this.log('[CH2] ✅ dim.1 registered on endpoint 2');
    }

    this.log('[DIMMER-DUAL] ✅ 2-Channel Dimmer Ready');
  }
}

module.exports = DimmerDualChannelDevice;
