'use strict';

const ButtonDevice = require('../../lib/devices/ButtonDevice');

/**
 * Button2GangDevice - v5.8.16 Enhanced
 *
 * FIX v5.2.92: Was incorrectly extending HybridDevice
 * FIX v5.8.16: Added cluster 0xE000 + tuyaE000 support
 *
 * Handles single/double/long press for 2 buttons
 */
class Button2GangDevice extends ButtonDevice {

  async onNodeInit({ zclNode }) {
    this.log('╔═══════════════════════════════════════════════════════════════════╗');
    this.log('║           BUTTON 2-GANG v5.8.16 - E000 ENHANCED                   ║');
    this.log('╚═══════════════════════════════════════════════════════════════════╝');

    this.buttonCount = 2;
    await super.onNodeInit({ zclNode }).catch(err => this.error('[INIT] Error:', err.message));
    await this._setupE000Detection(zclNode);
    this.log('[INIT] ✅ Button2GangDevice initialized - 2 buttons ready');
  }

  async _setupE000Detection(zclNode) {
    const mfr = this.getData()?.manufacturerName || this.getSetting?.('zb_manufacturer_name') || '';
    this.log(`[BUTTON2-E000] 🔧 Setting up E000 detection (mfr: ${mfr || 'unknown'})`);
    this._e000Dedup = {};

    for (let ep = 1; ep <= 2; ep++) {
      const endpoint = zclNode?.endpoints?.[ep];
      if (!endpoint) continue;

      // v5.8.16: Try registered tuyaE000 cluster
      const e000Cluster = endpoint.clusters?.tuyaE000 || endpoint.clusters?.[57344];
      if (e000Cluster && typeof e000Cluster.on === 'function') {
        this.log(`[BUTTON2-E000] 📡 EP${ep} tuyaE000 cluster available`);
        e000Cluster.on('buttonPress', async ({ button, pressType }) => {
          const types = { 0: 'single', 1: 'double', 2: 'long' };
          const btn = (button >= 1 && button <= 2) ? button : ep;
          this.log(`[BUTTON2-E000] 🔘 Button ${btn} ${types[pressType] || 'single'}`);
          await this.triggerButtonPress(btn, types[pressType] || 'single');
        });
      }

      // Setup onOff listeners as fallback
      const onOff = endpoint.clusters?.onOff || endpoint.clusters?.[6];
      if (onOff && typeof onOff.on === 'function') {
        const handle = async (cmd, type) => {
          const now = Date.now();
          if (now - (this._e000Dedup[`${ep}_${cmd}`] || 0) < 500) return;
          this._e000Dedup[`${ep}_${cmd}`] = now;
          this.log(`[BUTTON2-E000] 🔘 EP${ep} ${cmd} → Button ${ep} ${type}`);
          await this.triggerButtonPress(ep, type);
        };
        onOff.on('commandOn', () => handle('on', 'single'));
        onOff.on('commandOff', () => handle('off', 'double'));
        onOff.on('commandToggle', () => handle('toggle', 'long'));
        this.log(`[BUTTON2-E000] ✅ EP${ep} onOff listeners ready`);
      }
    }

    // Setup BoundCluster for cluster 0xE000
    await this._setupE000BoundCluster(zclNode);
  }

  async _setupE000BoundCluster(zclNode) {
    try {
      const TuyaE000BoundCluster = require('../../lib/clusters/TuyaE000BoundCluster');
      for (let ep = 1; ep <= 2; ep++) {
        const endpoint = zclNode?.endpoints?.[ep];
        if (!endpoint) continue;
        const bc = new TuyaE000BoundCluster({
          device: this,
          onButtonPress: async (button, pressType) => {
            const btn = (button >= 1 && button <= 2) ? button : ep;
            this.log(`[BUTTON2-E000] 🔘 BoundCluster EP${ep} → Button ${btn} ${pressType}`);
            await this.triggerButtonPress(btn, pressType);
          }
        });
        bc.endpoint = ep;
        if (!endpoint.bindings) endpoint.bindings = {};
        endpoint.bindings[57344] = bc;
        this.log(`[BUTTON2-E000] ✅ BoundCluster EP${ep} ready`);
      }
    } catch (e) {
      this.log('[BUTTON2-E000] ℹ️ BoundCluster not available');
    }
  }

  async onDeleted() {
    this.log('Button2GangDevice deleted');
    if (this._clickState) {
      if (this._clickState.clickTimer) clearTimeout(this._clickState.clickTimer);
      if (this._clickState.longPressTimer) clearTimeout(this._clickState.longPressTimer);
    }
    if (super.onDeleted) await super.onDeleted();
  }
}

module.exports = Button2GangDevice;
