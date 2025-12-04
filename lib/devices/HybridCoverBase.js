'use strict';

const { ZigBeeDevice } = require('homey-zigbeedriver');

/**
 * HybridCoverBase - Base class for curtains, blinds, shutters
 * v5.3.66 - Fixed capability migration order + listener guards
 */
class HybridCoverBase extends ZigBeeDevice {

  get mainsPowered() { return true; }
  get maxListeners() { return 50; }

  get coverCapabilities() {
    return ['windowcoverings_state', 'windowcoverings_set'];
  }

  get dpMappings() {
    return {
      1: { capability: 'windowcoverings_state', transform: (v) => v === 0 ? 'up' : v === 1 ? 'idle' : 'down' },
      2: { capability: 'windowcoverings_set', divisor: 100 },
      3: { capability: 'windowcoverings_set', divisor: 100 }, // Alternative position DP
      7: { capability: 'windowcoverings_state', transform: (v) => v === 0 ? 'up' : v === 1 ? 'down' : 'idle' } // work_state
    };
  }

  async onNodeInit({ zclNode }) {
    // CRITICAL: Migrate capabilities FIRST before anything else
    await this._migrateCapabilities();

    if (this._hybridCoverInited) return;
    this._hybridCoverInited = true;

    const data = this.getData();
    if (data.subDeviceId !== undefined) {
      await this.setUnavailable('⚠️ Phantom device').catch(() => { });
      return;
    }

    this.zclNode = zclNode;
    this._bumpMaxListeners(zclNode);
    this._protocolInfo = this._detectProtocol();

    this.log(`[COVER] Model: ${this._protocolInfo.modelId} | Mode: ${this._protocolInfo.protocol}`);

    if (this._protocolInfo.isTuyaDP) {
      this._isPureTuyaDP = true;
      this._setupTuyaDPMode();
    } else {
      this._setupZCLMode(zclNode);
    }

    this._registerCapabilityListeners();
    this.log('[COVER] ✅ Ready');
  }

  _detectProtocol() {
    const settings = this.getSettings?.() || {};
    const store = this.getStore?.() || {};
    const modelId = settings.zb_modelId || store.modelId || '';
    const mfr = settings.zb_manufacturerName || store.manufacturerName || '';
    const isTuyaDP = modelId === 'TS0601' || mfr.startsWith('_TZE');
    return { protocol: isTuyaDP ? 'TUYA_DP' : 'ZCL', isTuyaDP, modelId, mfr };
  }

  async _migrateCapabilities() {
    for (const cap of this.coverCapabilities) {
      if (!this.hasCapability(cap)) {
        await this.addCapability(cap).catch(() => { });
      }
    }
  }

  _bumpMaxListeners(zclNode) {
    try {
      if (!zclNode?.endpoints) return;
      for (const ep of Object.values(zclNode.endpoints)) {
        if (typeof ep.setMaxListeners === 'function') ep.setMaxListeners(50);
        for (const c of Object.values(ep?.clusters || {})) {
          if (typeof c?.setMaxListeners === 'function') c.setMaxListeners(50);
        }
      }
    } catch (e) { }
  }

  _setupTuyaDPMode() {
    if (this.tuyaEF00Manager) {
      this.tuyaEF00Manager.on('dpReport', ({ dpId, value }) => this._handleDP(dpId, value));
    }
  }

  _setupZCLMode(zclNode) {
    const ep = zclNode?.endpoints?.[1];
    const cluster = ep?.clusters?.windowCovering || ep?.clusters?.closuresWindowCovering;
    if (cluster) {
      cluster.on('attr.currentPositionLiftPercentage', (v) => {
        this.setCapabilityValue('windowcoverings_set', v / 100).catch(() => { });
      });
    }
  }

  _handleDP(dpId, raw) {
    const mapping = this.dpMappings[dpId];
    if (!mapping?.capability) return;

    let value = typeof raw === 'number' ? raw : Buffer.isBuffer(raw) ? raw.readIntBE(0, raw.length) : raw;
    if (mapping.divisor) value = value / mapping.divisor;
    if (mapping.transform) value = mapping.transform(value);

    if (this.hasCapability(mapping.capability)) {
      this.setCapabilityValue(mapping.capability, value).catch(() => { });
    }
  }

  _registerCapabilityListeners() {
    // Guard against double registration
    if (this._coverListenersRegistered) return;
    this._coverListenersRegistered = true;

    if (this.hasCapability('windowcoverings_set')) {
      this.registerCapabilityListener('windowcoverings_set', async (value) => {
        this.log(`[COVER] Setting position: ${Math.round(value * 100)}%`);
        if (this._isPureTuyaDP) {
          await this._sendTuyaDP(2, Math.round(value * 100), 'value');
        } else {
          // ZCL command
          const ep = this.zclNode?.endpoints?.[1];
          const cluster = ep?.clusters?.windowCovering || ep?.clusters?.closuresWindowCovering;
          if (cluster?.goToLiftPercentage) {
            await cluster.goToLiftPercentage({ percentageLiftValue: Math.round(value * 100) });
          }
        }
      });
    }

    if (this.hasCapability('windowcoverings_state')) {
      this.registerCapabilityListener('windowcoverings_state', async (state) => {
        this.log(`[COVER] Setting state: ${state}`);
        if (this._isPureTuyaDP) {
          const cmd = state === 'up' ? 0 : state === 'down' ? 2 : 1;
          await this._sendTuyaDP(1, cmd, 'enum');
        } else {
          // ZCL command
          const ep = this.zclNode?.endpoints?.[1];
          const cluster = ep?.clusters?.windowCovering || ep?.clusters?.closuresWindowCovering;
          if (cluster) {
            if (state === 'up') await cluster.upOpen?.();
            else if (state === 'down') await cluster.downClose?.();
            else await cluster.stop?.();
          }
        }
      });
    }
  }

  /**
   * Send Tuya DP command with fallback methods
   */
  async _sendTuyaDP(dpId, value, dataType = 'value') {
    try {
      // Method 1: TuyaEF00Manager
      if (this.tuyaEF00Manager?.sendDP) {
        return await this.tuyaEF00Manager.sendDP(dpId, value, dataType);
      }

      // Method 2: Direct cluster command
      const ep = this.zclNode?.endpoints?.[1];
      const tuyaCluster = ep?.clusters?.tuya || ep?.clusters?.manuSpecificTuya || ep?.clusters?.[61184];

      if (tuyaCluster) {
        const dpData = this._buildTuyaPayload(dpId, value, dataType);
        if (typeof tuyaCluster.dataRequest === 'function') {
          await tuyaCluster.dataRequest({ data: dpData });
        } else if (typeof tuyaCluster.setData === 'function') {
          await tuyaCluster.setData({ data: dpData });
        }
      }
    } catch (err) {
      this.error(`[COVER] Failed to send DP${dpId}:`, err.message);
    }
  }

  _buildTuyaPayload(dpId, value, dataType) {
    const buf = Buffer.alloc(6);
    buf.writeUInt8(dpId, 0);

    if (dataType === 'enum' || dataType === 'bool') {
      buf.writeUInt8(value ? 1 : 4, 1); // type: 1=bool, 4=enum
      buf.writeUInt16BE(1, 2); // length
      buf.writeUInt8(value, 4);
      return buf.slice(0, 5);
    } else {
      buf.writeUInt8(2, 1); // type: 2=value
      buf.writeUInt16BE(4, 2); // length
      buf.writeInt32BE(value, 4);
      return buf.slice(0, 8);
    }
  }

  async registerCapability(cap, cluster, opts) {
    if (this._isPureTuyaDP) return;
    return super.registerCapability(cap, cluster, opts);
  }
}

module.exports = HybridCoverBase;
