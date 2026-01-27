'use strict';

const { ZigBeeDevice } = require('homey-zigbeedriver');

/**
 * ╔══════════════════════════════════════════════════════════════════════════════╗
 * ║      3-GANG DIMMER - v5.5.829 (Tuya DP-based)                               ║
 * ╠══════════════════════════════════════════════════════════════════════════════╣
 * ║  MOES 3-Gang Dimmer - _TZE204_1v1dxkck / TS0601                              ║
 * ║  Uses Tuya cluster 0xEF00 for control                                        ║
 * ║                                                                              ║
 * ║  DP Mapping (from Z2M/forum research):                                       ║
 * ║  - DP1: Switch 1 (bool)      - DP2: Dimmer 1 (0-1000)                        ║
 * ║  - DP7: Switch 2 (bool)      - DP8: Dimmer 2 (0-1000)                        ║
 * ║  - DP15: Switch 3 (bool)     - DP16: Dimmer 3 (0-1000)                       ║
 * ╚══════════════════════════════════════════════════════════════════════════════╝
 */
class Dimmer3GangDevice extends ZigBeeDevice {

  // v5.5.829: Physical button detection (inspired by Attilla/packetninja PR #112)
  _appCommandPending = false;
  _appCommandTimeout = null;
  _lastStates = {}; // Track last known states for heartbeat filtering

  get dpMappings() {
    return {
      // Gang 1
      1: { capability: 'onoff', transform: (v) => v === 1 || v === true },
      2: { capability: 'dim', transform: (v) => Math.max(0.01, Math.min(1, v / 1000)) },
      // Gang 2
      7: { capability: 'onoff.channel2', transform: (v) => v === 1 || v === true },
      8: { capability: 'dim.channel2', transform: (v) => Math.max(0.01, Math.min(1, v / 1000)) },
      // Gang 3
      15: { capability: 'onoff.channel3', transform: (v) => v === 1 || v === true },
      16: { capability: 'dim.channel3', transform: (v) => Math.max(0.01, Math.min(1, v / 1000)) },
    };
  }

  async onNodeInit({ zclNode }) {
    this.log('╔══════════════════════════════════════════════════════════════╗');
    this.log('║         3-GANG DIMMER v5.5.829 (Tuya DP)                     ║');
    this.log('╚══════════════════════════════════════════════════════════════╝');

    this.zclNode = zclNode;

    // Setup Tuya cluster listener
    await this._setupTuyaCluster(zclNode);

    // Register capability listeners
    await this._registerCapabilityListeners();

    this.log('[DIMMER-3G] ✅ 3-Gang Dimmer Ready');
  }

  async _setupTuyaCluster(zclNode) {
    try {
      const endpoint = zclNode.endpoints[1];
      if (!endpoint) {
        this.log('[DIMMER-3G] ⚠️ No endpoint 1 found');
        return;
      }

      // Try to get Tuya cluster
      const tuyaCluster = endpoint.clusters['tuya'] ||
        endpoint.clusters[61184] ||
        endpoint.clusters['61184'];

      if (tuyaCluster && typeof tuyaCluster.on === 'function') {
        tuyaCluster.on('response', this._handleTuyaResponse.bind(this));
        tuyaCluster.on('reporting', this._handleTuyaResponse.bind(this));
        tuyaCluster.on('datapoint', this._handleTuyaResponse.bind(this));
        this.log('[DIMMER-3G] ✅ Tuya cluster listener registered');
      }
    } catch (err) {
      this.error('[DIMMER-3G] Error setting up Tuya cluster:', err.message);
    }
  }

  // v5.5.829: Mark app command to distinguish from physical button
  _markAppCommand() {
    this._appCommandPending = true;
    if (this._appCommandTimeout) clearTimeout(this._appCommandTimeout);
    this._appCommandTimeout = setTimeout(() => {
      this._appCommandPending = false;
    }, 2000);
  }

  _handleTuyaResponse(data) {
    try {
      if (!data || !data.dp) return;

      const dp = data.dp;
      const value = data.value !== undefined ? data.value : data.data;
      
      // v5.5.829: Detect physical button press (no pending app command)
      const isPhysical = !this._appCommandPending;

      const mapping = this.dpMappings[dp];
      if (mapping && mapping.capability) {
        const transformedValue = mapping.transform ? mapping.transform(value) : value;
        const stateKey = `dp${dp}`;
        const lastValue = this._lastStates[stateKey];
        
        // v5.5.829: Heartbeat filter - only process if value changed
        if (lastValue !== transformedValue) {
          this._lastStates[stateKey] = transformedValue;
          this.log(`[DIMMER-3G] DP${dp} = ${transformedValue} (${isPhysical ? 'PHYSICAL' : 'APP'})`);
          
          this.setCapabilityValue(mapping.capability, transformedValue).catch(err => {
            this.error(`[DIMMER-3G] Error setting ${mapping.capability}:`, err.message);
          });
        }
      }
    } catch (err) {
      this.error('[DIMMER-3G] Error handling Tuya response:', err.message);
    }
  }

  async _registerCapabilityListeners() {
    // Gang 1
    if (this.hasCapability('onoff')) {
      this.registerCapabilityListener('onoff', async (value) => {
        this._markAppCommand(); // v5.5.829
        await this._sendTuyaDP(1, value ? 1 : 0, 'bool');
      });
    }

    if (this.hasCapability('dim')) {
      this.registerCapabilityListener('dim', async (value) => {
        this._markAppCommand(); // v5.5.829
        await this._sendTuyaDP(2, Math.round(value * 1000), 'value');
      });
    }

    // Gang 2
    if (this.hasCapability('onoff.channel2')) {
      this.registerCapabilityListener('onoff.channel2', async (value) => {
        this._markAppCommand(); // v5.5.829
        await this._sendTuyaDP(7, value ? 1 : 0, 'bool');
      });
    }

    if (this.hasCapability('dim.channel2')) {
      this.registerCapabilityListener('dim.channel2', async (value) => {
        this._markAppCommand(); // v5.5.829
        await this._sendTuyaDP(8, Math.round(value * 1000), 'value');
      });
    }

    // Gang 3
    if (this.hasCapability('onoff.channel3')) {
      this.registerCapabilityListener('onoff.channel3', async (value) => {
        this._markAppCommand(); // v5.5.829
        await this._sendTuyaDP(15, value ? 1 : 0, 'bool');
      });
    }

    if (this.hasCapability('dim.channel3')) {
      this.registerCapabilityListener('dim.channel3', async (value) => {
        this._markAppCommand(); // v5.5.829
        await this._sendTuyaDP(16, Math.round(value * 1000), 'value');
      });
    }
  }

  async _sendTuyaDP(dp, value, type) {
    try {
      const endpoint = this.zclNode?.endpoints?.[1];
      if (!endpoint) {
        this.error('[DIMMER-3G] No endpoint for sending DP');
        return;
      }

      const tuyaCluster = endpoint.clusters['tuya'] ||
        endpoint.clusters[61184] ||
        endpoint.clusters['61184'];

      if (!tuyaCluster) {
        this.error('[DIMMER-3G] No Tuya cluster found');
        return;
      }

      // Build Tuya DP payload
      const seqNum = Math.floor(Math.random() * 65535);
      let dataBuffer;

      if (type === 'bool') {
        dataBuffer = Buffer.alloc(1);
        dataBuffer.writeUInt8(value ? 1 : 0, 0);
      } else {
        dataBuffer = Buffer.alloc(4);
        dataBuffer.writeUInt32BE(value, 0);
      }

      const payload = Buffer.alloc(5 + dataBuffer.length);
      payload.writeUInt16BE(seqNum, 0);
      payload.writeUInt8(dp, 2);
      payload.writeUInt8(type === 'bool' ? 0x01 : 0x02, 3);
      payload.writeUInt8(dataBuffer.length, 4);
      dataBuffer.copy(payload, 5);

      this.log(`[DIMMER-3G] Sending DP${dp} = ${value} (type: ${type})`);

      if (typeof tuyaCluster.datapoint === 'function') {
        await tuyaCluster.datapoint({ data: payload });
      } else if (typeof tuyaCluster.setData === 'function') {
        await tuyaCluster.setData({ dp, dataType: type === 'bool' ? 1 : 2, data: value });
      }
    } catch (err) {
      this.error('[DIMMER-3G] Error sending DP:', err.message);
    }
  }
}

module.exports = Dimmer3GangDevice;
