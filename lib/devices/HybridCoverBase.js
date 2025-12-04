'use strict';

const { ZigBeeDevice } = require('homey-zigbeedriver');

/**
 * HybridCoverBase - Base class for curtains, blinds, shutters
 * v5.3.64
 */
class HybridCoverBase extends ZigBeeDevice {

  get mainsPowered() { return true; }
  get maxListeners() { return 50; }

  get coverCapabilities() {
    return ['windowcoverings_state', 'windowcoverings_set', 'dim'];
  }

  get dpMappings() {
    return {
      1: { capability: 'windowcoverings_state', transform: (v) => v === 0 ? 'up' : v === 1 ? 'idle' : 'down' },
      2: { capability: 'windowcoverings_set', divisor: 100 },
      3: { capability: 'dim', divisor: 100 } // Position 0-100
    };
  }

  async onNodeInit({ zclNode }) {
    if (this._hybridCoverInited) return;
    this._hybridCoverInited = true;

    const data = this.getData();
    if (data.subDeviceId !== undefined) {
      await this.setUnavailable('⚠️ Phantom device').catch(() => { });
      return;
    }

    this.zclNode = zclNode;
    this._protocolInfo = this._detectProtocol();

    this.log(`[COVER] Model: ${this._protocolInfo.modelId} | Mode: ${this._protocolInfo.protocol}`);

    await this._migrateCapabilities();
    this._bumpMaxListeners(zclNode);

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
    if (this.hasCapability('windowcoverings_set')) {
      this.registerCapabilityListener('windowcoverings_set', async (value) => {
        if (this._isPureTuyaDP && this.tuyaEF00Manager) {
          await this.tuyaEF00Manager.sendDP(2, Math.round(value * 100), 'value');
        }
      });
    }

    if (this.hasCapability('windowcoverings_state')) {
      this.registerCapabilityListener('windowcoverings_state', async (state) => {
        if (this._isPureTuyaDP && this.tuyaEF00Manager) {
          const cmd = state === 'up' ? 0 : state === 'down' ? 2 : 1;
          await this.tuyaEF00Manager.sendDP(1, cmd, 'enum');
        }
      });
    }
  }

  async registerCapability(cap, cluster, opts) {
    if (this._isPureTuyaDP) return;
    return super.registerCapability(cap, cluster, opts);
  }
}

module.exports = HybridCoverBase;
