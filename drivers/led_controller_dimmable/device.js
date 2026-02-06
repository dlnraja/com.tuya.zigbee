'use strict';

const { ZigBeeDevice } = require('homey-zigbeedriver');
const { CLUSTER } = require('zigbee-clusters');
const TuyaSpecificCluster = require('../../lib/TuyaSpecificCluster');
const TuyaSpecificClusterDevice = require('../../lib/TuyaSpecificClusterDevice');

// Tuya DP IDs for LED dimmers
const TUYA_DP = {
  ON_OFF: 1,        // bool
  BRIGHTNESS: 2,    // value 0-1000 (some devices use 0-255)
  MIN_BRIGHTNESS: 3,
  MODE: 4,
  COUNTDOWN: 7
};

/**
 * LED Controller Dimmable (Single Channel) - v5.3.77
 *
 * For single-channel 24V/12V LED dimmers like:
 * - TS0501B / _TZB210_ngnt8kni (WoodUpp)
 * - Other mono-channel LED drivers
 *
 * Fixes Issue #83: xSondreBx - WoodUpp LED Driver
 *
 * v5.3.77 CHANGES:
 * - CRITICAL: Added TUYA DP support (cluster 0xEF00)
 * - Device uses Tuya DataPoints for dimming, NOT standard ZCL!
 * - DP 1 = On/Off, DP 2 = Brightness (0-1000)
 * - 10 dimming strategies including Tuya DP
 * - Ultra-verbose logging for diagnostics
 */
class LEDControllerDimmableDevice extends ZigBeeDevice {

  async onNodeInit({ zclNode }) {
    // Prevent double init
    if (this._ledControllerInited) return;
    this._ledControllerInited = true;

    this.zclNode = zclNode;

    this.log('');
    this.log('╔══════════════════════════════════════════════════════════════╗');
    this.log('║    LED CONTROLLER DIMMABLE (Single Channel) - v5.3.77       ║');
    this.log('║    Fixes Issue #83: WoodUpp 24V LED Driver                  ║');
    this.log('╠══════════════════════════════════════════════════════════════╣');
    this.log('║ ✅ TUYA DP support (cluster 0xEF00) - CRITICAL FIX          ║');
    this.log('║ ✅ 10 dimming strategies for maximum compatibility          ║');
    this.log('║ ✅ Ultra-verbose logging for diagnostics                    ║');
    this.log('╚══════════════════════════════════════════════════════════════╝');

    // Ensure capabilities exist
    if (!this.hasCapability('onoff')) await this.addCapability('onoff').catch(() => { });
    if (!this.hasCapability('dim')) await this.addCapability('dim').catch(() => { });

    // Get clusters
    const endpoint = zclNode.endpoints[1];
    this._onOffCluster = endpoint?.clusters?.onOff;
    this._levelCluster = endpoint?.clusters?.levelControl;
    this._tuyaCluster = endpoint?.clusters?.tuya;

    // Log cluster availability with detailed info
    this.log(`[LED] onOff cluster: ${this._onOffCluster ? '✅' : '❌'}`);
    this.log(`[LED] levelControl cluster: ${this._levelCluster ? '✅' : '❌'}`);
    this.log(`[LED] TUYA cluster (0xEF00): ${this._tuyaCluster ? '✅ FOUND!' : '❌'}`);

    // Log available methods on levelControl cluster
    if (this._levelCluster) {
      const methods = Object.keys(this._levelCluster).filter(k => typeof this._levelCluster[k] === 'function');
      this.log(`[LED] levelControl methods: ${methods.join(', ')}`);
    }

    // Log device info
    const settings = this.getSettings() || {};
    const store = this.getStore() || {};
    this.log(`[LED] Model: ${settings.zb_model_id || settings.zb_modelId || store.modelId || 'unknown'}`);
    this.log(`[LED] Manufacturer: ${settings.zb_manufacturer_name || settings.zb_manufacturerName || store.manufacturerName || 'unknown'}`);

    // Setup Tuya DP listener
    await this._setupTuyaListener();

    // Setup attribute listeners
    this._setupAttributeListeners();

    // Register capability listeners
    this._registerCapabilityListeners();

    // Try to read initial values
    await this._readInitialValues();

    this.log('[LED] ✅ Initialization complete');
  }

  async _setupTuyaListener() {
    try {
      const endpoint = this.zclNode.endpoints[1];
      if (!endpoint) return;

      // Try to get Tuya cluster
      const tuyaCluster = endpoint.clusters['tuya'] || endpoint.clusters[61184];
      if (tuyaCluster) {
        this._tuyaCluster = tuyaCluster;
        this.log('[LED] ✅ Tuya cluster found, setting up DP listener...');

        // Listen for Tuya datapoint reports
        tuyaCluster.on('response', this._onTuyaResponse.bind(this));
        tuyaCluster.on('datapoint', this._onTuyaDatapoint.bind(this));
        tuyaCluster.on('reporting', this._onTuyaDatapoint.bind(this));
      }
    } catch (err) {
      this.log(`[LED] Tuya setup error (non-fatal): ${err.message}`);
    }
  }

  _onTuyaResponse(data) {
    this.log(`[LED] Tuya response: ${JSON.stringify(data)}`);
  }

  _onTuyaDatapoint(data) {
    this.log(`[LED] Tuya DP received: ${JSON.stringify(data)}`);
    if (data && data.dp !== undefined) {
      const dp = data.dp;
      const value = data.value;

      if (dp === TUYA_DP.ON_OFF) {
        this.setCapabilityValue('onoff', !!value).catch(this.error);
      } else if (dp === TUYA_DP.BRIGHTNESS) {
        // Tuya brightness is typically 0-1000
        const dim = Math.max(0, Math.min(1, value / 1000));
        this.setCapabilityValue('dim', parseFloat(dim)).catch(this.error);
      }
    }
  }

  _setupAttributeListeners() {
    // On/Off attribute listener
    if (this._onOffCluster) {
      this._onOffCluster.on('attr.onOff', (value) => {
        this.log(`[LED] onOff attribute changed: ${value}`);
        this.setCapabilityValue('onoff', !!value).catch(this.error);
      });
    }

    // Level attribute listener
    if (this._levelCluster) {
      this._levelCluster.on('attr.currentLevel', (value) => {
        const dim = Math.max(0, Math.min(1, value / 254));
        this.log(`[LED] currentLevel attribute changed: ${value} → dim=${dim}`);
        this.setCapabilityValue('dim', parseFloat(dim)).catch(this.error);
      });
    }
  }

  _registerCapabilityListeners() {
    // On/Off capability
    this.registerCapabilityListener('onoff', async (value) => {
      this.log(`[LED] Setting onoff: ${value}`);

      if (!this._onOffCluster) {
        this.error('[LED] No onOff cluster!');
        throw new Error('No onOff cluster available');
      }

      try {
        if (value) {
          await this._onOffCluster.setOn();
        } else {
          await this._onOffCluster.setOff();
        }
        this.log('[LED] ✅ onoff command sent');
      } catch (err) {
        this.error(`[LED] onoff error: ${err.message}`);
        throw err;
      }
    });

    // Dim capability - v5.3.77: 10 STRATEGIES including TUYA DP
    this.registerCapabilityListener('dim', async (value, opts) => {
      this.log('');
      this.log('┌─────────────────────────────────────────────────────────────┐');
      this.log(`│ 💡 DIM COMMAND: ${Math.round(value * 100)}%`);
      this.log('└─────────────────────────────────────────────────────────────┘');

      const level = Math.max(1, Math.min(254, Math.round(value * 254)));
      const tuyaBrightness = Math.max(10, Math.min(1000, Math.round(value * 1000))); // Tuya uses 0-1000
      this.log(`[LED] Target level: ${level} (ZCL 0-254) / ${tuyaBrightness} (Tuya 0-1000)`);

      // Build strategies array - TUYA DP FIRST since device has cluster 0xEF00
      const strategies = [];

      // TUYA DP strategies (PRIORITY - device has 0xEF00 cluster!)
      if (this._tuyaCluster) {
        // Strategy 1: Tuya DP brightness (0-1000)
        strategies.push({
          name: 'TUYA DP2 brightness (0-1000)',
          fn: async () => {
            await this._sendTuyaDP(TUYA_DP.BRIGHTNESS, tuyaBrightness, 'value');
          }
        });

        // Strategy 2: Tuya DP brightness (0-255)
        strategies.push({
          name: 'TUYA DP2 brightness (0-255)',
          fn: async () => {
            await this._sendTuyaDP(TUYA_DP.BRIGHTNESS, level, 'value');
          }
        });

        // Strategy 3: Tuya DP on + brightness
        strategies.push({
          name: 'TUYA DP1 on + DP2 brightness',
          fn: async () => {
            if (value > 0) {
              await this._sendTuyaDP(TUYA_DP.ON_OFF, true, 'bool');
              await new Promise(r => setTimeout(r, 100));
            }
            await this._sendTuyaDP(TUYA_DP.BRIGHTNESS, tuyaBrightness, 'value');
          }
        });
      }

      // Standard ZCL strategies
      if (this._levelCluster) {
        strategies.push(
          { name: 'moveToLevelWithOnOff (t=0)', fn: () => this._levelCluster.moveToLevelWithOnOff?.({ level, transitionTime: 0 }) },
          { name: 'moveToLevelWithOnOff (t=10)', fn: () => this._levelCluster.moveToLevelWithOnOff?.({ level, transitionTime: 10 }) },
          { name: 'moveToLevel (t=0)', fn: () => this._levelCluster.moveToLevel?.({ level, transitionTime: 0 }) },
          { name: 'moveToLevel (t=10)', fn: () => this._levelCluster.moveToLevel?.({ level, transitionTime: 10 }) },
          { name: 'writeAttributes(currentLevel)', fn: () => this._levelCluster.writeAttributes?.({ currentLevel: level }) },
          {
            name: 'setOn + moveToLevel',
            fn: async () => {
              if (value > 0 && this._onOffCluster) {
                await this._onOffCluster.setOn();
                await new Promise(r => setTimeout(r, 200));
              }
              await this._levelCluster.moveToLevel?.({ level, transitionTime: 10 });
            }
          }
        );
      }

      let successStrategy = null;

      for (const strategy of strategies) {
        try {
          this.log(`[LED] 🔄 Trying: ${strategy.name}...`);
          const result = strategy.fn();
          if (result && typeof result.then === 'function') {
            await result;
          }
          this.log(`[LED] ✅ SUCCESS via ${strategy.name}`);
          successStrategy = strategy.name;
          break;
        } catch (err) {
          this.log(`[LED] ❌ ${strategy.name} failed: ${err.message}`);
        }
      }

      if (!successStrategy) {
        this.error('[LED] ❌ ALL dimming strategies failed!');
        throw new Error('All dimming strategies failed');
      }

      this.log('');
    });
  }

  // Send Tuya DataPoint command
  async _sendTuyaDP(dp, value, dataType = 'value') {
    this.log(`[LED] Sending Tuya DP${dp} = ${value} (type: ${dataType})`);

    if (!this._tuyaCluster) {
      throw new Error('No Tuya cluster');
    }

    try {
      // Try different methods to send Tuya DP
      if (typeof this._tuyaCluster.datapoint === 'function') {
        await this._tuyaCluster.datapoint({ dp, value, dataType });
        return;
      }

      if (typeof this._tuyaCluster.setDatapoint === 'function') {
        await this._tuyaCluster.setDatapoint(dp, value, dataType);
        return;
      }

      // Manual frame construction
      const seqNum = this._tuyaSeqNum = ((this._tuyaSeqNum || 0) + 1) % 65536;
      const payload = this._buildTuyaPayload(dp, value, dataType, seqNum);

      if (typeof this._tuyaCluster.writeData === 'function') {
        await this._tuyaCluster.writeData(payload);
        return;
      }

      throw new Error('No method to send Tuya DP');
    } catch (err) {
      this.log(`[LED] Tuya DP error: ${err.message}`);
      throw err;
    }
  }

  _buildTuyaPayload(dp, value, dataType, seqNum) {
    // Tuya frame format: seqNum(2) + dp(1) + dataType(1) + len(2) + data(n)
    let typeId, data;

    if (dataType === 'bool') {
      typeId = 0x01;
      data = Buffer.from([value ? 1 : 0]);
    } else if (dataType === 'value') {
      typeId = 0x02;
      data = Buffer.alloc(4);
      data.writeUInt32BE(value, 0);
    } else if (dataType === 'enum') {
      typeId = 0x04;
      data = Buffer.from([value]);
    } else {
      typeId = 0x02;
      data = Buffer.alloc(4);
      data.writeUInt32BE(value, 0);
    }

    const payload = Buffer.alloc(6 + data.length);
    payload.writeUInt16BE(seqNum, 0);
    payload.writeUInt8(dp, 2);
    payload.writeUInt8(typeId, 3);
    payload.writeUInt16BE(data.length, 4);
    data.copy(payload, 6);

    return payload;
  }

  async _readInitialValues() {
    try {
      // Read onOff state
      if (this._onOffCluster) {
        const onOffAttrs = await this._onOffCluster.readAttributes(['onOff']).catch(() => ({}));
        if (onOffAttrs.onOff !== undefined) {
          await this.setCapabilityValue('onoff', !!onOffAttrs.onOff).catch(() => { });
          this.log(`[LED] Initial onoff: ${onOffAttrs.onOff}`);
        }
      }

      // Read level
      if (this._levelCluster) {
        const levelAttrs = await this._levelCluster.readAttributes(['currentLevel']).catch(() => ({}));
        if (levelAttrs.currentLevel !== undefined) {
          const dim = Math.max(0, Math.min(1, levelAttrs.currentLevel / 254));
          await this.setCapabilityValue('dim', parseFloat(dim)).catch(() => { });
          this.log(`[LED] Initial level: ${levelAttrs.currentLevel} → dim=${dim}`);
        }
      }
    } catch (err) {
      this.log(`[LED] Could not read initial values: ${err.message}`);
    }
  }
}

module.exports = LEDControllerDimmableDevice;
