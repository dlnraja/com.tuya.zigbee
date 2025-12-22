'use strict';

const { ZigBeeDevice } = require('homey-zigbeedriver');
const { CLUSTER } = require('zigbee-clusters');

/**
 * DimmerDualChannelDevice - v5.3.90
 *
 * Supports 2-channel dimmers like TS1101 / _TZ3000_7ysdnebc
 *
 * Channel 1: Endpoint 1 (onoff, dim)
 * Channel 2: Endpoint 2 (onoff.channel2, dim.channel2)
 */
class DimmerDualChannelDevice extends ZigBeeDevice {

  async onNodeInit({ zclNode }) {
    this.log('╔══════════════════════════════════════════════════════════════╗');
    this.log('║         DUAL CHANNEL DIMMER v5.3.90                          ║');
    this.log('╚══════════════════════════════════════════════════════════════╝');

    // ═══════════════════════════════════════════════════════════════════════
    // CHANNEL 1 - Endpoint 1 (onoff, dim)
    // ═══════════════════════════════════════════════════════════════════════

    if (this.hasCapability('onoff')) {
      this.registerCapability('onoff', CLUSTER.ON_OFF, {
        endpoint: 1,
      });
      this.log('[CH1] ✅ onoff → endpoint 1');
    }

    if (this.hasCapability('dim')) {
      this.registerCapability('dim', CLUSTER.LEVEL_CONTROL, {
        endpoint: 1,
      });
      this.log('[CH1] ✅ dim → endpoint 1');
    }

    // ═══════════════════════════════════════════════════════════════════════
    // CHANNEL 2 - Endpoint 2 (onoff.channel2, dim.channel2)
    // ═══════════════════════════════════════════════════════════════════════

    if (this.hasCapability('onoff.channel2')) {
      this.registerCapability('onoff.channel2', CLUSTER.ON_OFF, {
        endpoint: 2,
      });
      this.log('[CH2] ✅ onoff.channel2 → endpoint 2');
    }

    if (this.hasCapability('dim.channel2')) {
      this.registerCapability('dim.channel2', CLUSTER.LEVEL_CONTROL, {
        endpoint: 2,
      });
      this.log('[CH2] ✅ dim.channel2 → endpoint 2');
    }

    this.log('[DIMMER-DUAL] ✅ 2-Channel Dimmer Ready');
  }
}

module.exports = DimmerDualChannelDevice;
