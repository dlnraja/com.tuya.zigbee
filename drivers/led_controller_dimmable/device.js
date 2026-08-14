'use strict';
const { CLUSTERS } = require('../../lib/constants/ZigbeeConstants.js');
const TuyaZigbeeDevice = require('../../lib/tuya/TuyaZigbeeDevice');
const { safeSetTimeout } = require('../../lib/utils/safe-timers');

// Tuya DP IDs for LED dimmers
const TUYA_DP = {
  ON_OFF: 1,
  BRIGHTNESS: 2,
  MIN_BRIGHTNESS: 3,
  MODE: 4,
  COUNTDOWN: 7
};

/**
 * LED Controller Dimmable (Single Channel) — P127: TuyaZigbeeDevice + safe-timers
 * Multi-path dim: Tuya DP → ZCL levelControl → writeAttributes → throw.
 * Fixes Issue #83: WoodUpp LED Driver
 */
class LEDControllerDimmableDevice extends TuyaZigbeeDevice {

  get mainsPowered() { return true; }

  async onNodeInit({ zclNode }) {
    await super.onNodeInit({ zclNode });
    if (this._ledControllerInited) { return; }
    this._ledControllerInited = true;

    this.zclNode = zclNode;
    this.log('[LED] LED CONTROLLER DIMMABLE — P127 TuyaZigbeeDevice');

    if (this.hasCapability('measure_battery')) {
      await this.removeCapability('measure_battery').catch(() => {});
    }
    if (!this.hasCapability('onoff')) { await this.addCapability('onoff').catch(() => {}); }
    if (!this.hasCapability('dim')) { await this.addCapability('dim').catch(() => {}); }

    const endpoint = zclNode.endpoints[1];
    this._onOffCluster = endpoint?.clusters?.onOff;
    this._levelCluster = endpoint?.clusters?.levelControl;
    this._tuyaCluster = endpoint?.clusters?.tuya || endpoint?.clusters?.[CLUSTERS.TUYA_EF00];

    this.log(`[LED] onOff=${!!this._onOffCluster} level=${!!this._levelCluster} tuya=${!!this._tuyaCluster}`);

    const settings = this.getSettings() || {};
    const store = this.getStore() || {};
    this.log(`[LED] Model: ${settings.zb_model_id || store.modelId || 'unknown'}`);
    this.log(`[LED] Manufacturer: ${settings.zb_manufacturer_name || store.manufacturerName || 'unknown'}`);

    await this._setupTuyaListener();
    this._setupAttributeListeners();
    this._registerCapabilityListeners();
    await this._readInitialValues();
    this.log('[LED] Initialization complete');
  }

  async _setupTuyaListener() {
    try {
      const endpoint = this.zclNode.endpoints[1];
      if (!endpoint) { return; }
      const tuyaCluster = endpoint.clusters['tuya'] || endpoint.clusters[CLUSTERS.TUYA_EF00];
      if (tuyaCluster) {
        this._tuyaCluster = tuyaCluster;
        this.log('[LED] Tuya cluster found, setting up DP listener...');
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
        this.safeSetCapabilityValue('onoff', !!value).catch(this._boundError || ((e) => { try { this.error(e); } catch (_) {} }));
      } else if (dp === TUYA_DP.BRIGHTNESS) {
        const dim = Math.max(0, Math.min(1, Number(value) / 1000));
        this.safeSetCapabilityValue('dim', parseFloat(dim)).catch(this._boundError || ((e) => { try { this.error(e); } catch (_) {} }));
      }
    }
  }

  _setupAttributeListeners() {
    if (this._onOffCluster) {
      this._onOffCluster.on('attr.onOff', (value) => {
        this.log(`[LED] onOff attribute changed: ${value}`);
        this.safeSetCapabilityValue('onoff', !!value).catch(this._boundError || ((e) => { try { this.error(e); } catch (_) {} }));
      });
    }
    if (this._levelCluster) {
      this._levelCluster.on('attr.currentLevel', (value) => {
        const dim = Math.max(0, Math.min(1, Number(value) / 254));
        this.log(`[LED] currentLevel: ${value} → dim=${dim}`);
        this.safeSetCapabilityValue('dim', parseFloat(dim)).catch(this._boundError || ((e) => { try { this.error(e); } catch (_) {} }));
      });
    }
  }

  _registerCapabilityListeners() {
    this.registerCapabilityListener('onoff', async (value) => {
      this.log(`[LED] Setting onoff: ${value}`);
      if (this._onOffCluster) {
        try {
          if (value) { await this._onOffCluster.setOn(); }
          else { await this._onOffCluster.setOff(); }
          this.log('[LED] onoff via ZCL');
          return;
        } catch (err) {
          this.log(`[LED] ZCL onoff failed: ${err.message}`);
        }
      }
      if (this._tuyaCluster) {
        await this._sendTuyaDP(TUYA_DP.ON_OFF, !!value, 'bool');
        this.log('[LED] onoff via Tuya DP1');
        return;
      }
      throw new Error('No onOff cluster or Tuya DP available');
    });

    this.registerCapabilityListener('dim', async (value) => {
      this.log(`[LED] DIM COMMAND: ${Math.round(value * 100)}%`);
      const level = Math.max(1, Math.min(254, Math.round(value * 254)));
      const tuyaBrightness = Math.max(10, Math.min(1000, Math.round(value * 1000)));
      this.log(`[LED] Target: ZCL=${level} Tuya=${tuyaBrightness}`);

      const strategies = [];
      if (this._tuyaCluster) {
        strategies.push({
          name: 'TUYA DP2 brightness (0-1000)',
          fn: async () => { await this._sendTuyaDP(TUYA_DP.BRIGHTNESS, tuyaBrightness, 'value'); }
        });
        strategies.push({
          name: 'TUYA DP2 brightness (0-255)',
          fn: async () => { await this._sendTuyaDP(TUYA_DP.BRIGHTNESS, level, 'value'); }
        });
        strategies.push({
          name: 'TUYA DP1 on + DP2 brightness',
          fn: async () => {
            if (value > 0) {
              await this._sendTuyaDP(TUYA_DP.ON_OFF, true, 'bool');
              await new Promise((r) => safeSetTimeout(this, r, 100));
              if (this._destroyed) { return; }
            }
            await this._sendTuyaDP(TUYA_DP.BRIGHTNESS, tuyaBrightness, 'value');
          }
        });
      }
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
                await new Promise((r) => safeSetTimeout(this, r, 200));
                if (this._destroyed) { return; }
              }
              await this._levelCluster.moveToLevel?.({ level, transitionTime: 10 });
            }
          }
        );
      }

      let successStrategy = null;
      for (const strategy of strategies) {
        try {
          this.log(`[LED] Trying: ${strategy.name}...`);
          const result = strategy.fn();
          if (result && typeof result.then === 'function') { await result; }
          this.log(`[LED] SUCCESS via ${strategy.name}`);
          successStrategy = strategy.name;
          break;
        } catch (err) {
          this.log(`[LED] ${strategy.name} failed: ${err.message}`);
        }
      }
      if (!successStrategy) {
        this.error('[LED] ALL dimming strategies failed!');
        throw new Error('All dimming strategies failed');
      }
    });
  }

  async _sendTuyaDP(dp, value, dataType = 'value') {
    this.log(`[LED] Sending Tuya DP${dp} = ${value} (type: ${dataType})`);
    if (!this._tuyaCluster) { throw new Error('No Tuya cluster'); }
    try {
      if (typeof this._tuyaCluster.datapoint === 'function') {
        await this._tuyaCluster.datapoint({ dp, value, dataType });
        return;
      }
      if (typeof this._tuyaCluster.setDatapoint === 'function') {
        await this._tuyaCluster.setDatapoint(dp, value, dataType);
        return;
      }
      if (typeof this.writeDataPoint === 'function') {
        await this.writeDataPoint(dp, value);
        return;
      }
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
    let typeId, data;
    if (dataType === 'bool') {
      typeId = 0x01;
      data = Buffer.from([value ? 1 : 0]);
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
      if (this._onOffCluster) {
        const onOffAttrs = await this._onOffCluster.readAttributes(['onOff']).catch(() => ({}));
        if (onOffAttrs.onOff !== undefined) {
          await this.safeSetCapabilityValue('onoff', !!onOffAttrs.onOff).catch(() => {});
        }
      }
      if (this._levelCluster) {
        const levelAttrs = await this._levelCluster.readAttributes(['currentLevel']).catch(() => ({}));
        if (levelAttrs.currentLevel !== undefined) {
          const dim = Math.max(0, Math.min(1, Number(levelAttrs.currentLevel) / 254));
          await this.safeSetCapabilityValue('dim', parseFloat(dim)).catch(() => {});
        }
      }
    } catch (err) {
      this.log(`[LED] Could not read initial values: ${err.message}`);
    }
  }

  async onDeleted() {
    this._destroyed = true;
    await super.onDeleted();
    this.log('Device deleted, cleaning up');
  }
}

module.exports = LEDControllerDimmableDevice;
