'use strict';

const ButtonDevice = require('../../lib/devices/ButtonDevice');

/**
 * Button3GangDevice - v5.7.52
 *
 * FIX v5.2.92: Was incorrectly extending HybridDevice (detected as SWITCH)
 * FIX v5.5.452: Dynamic capabilities now in ButtonDevice base class
 * FIX v5.7.52: Added cluster 0xE000 support for LoraTap TS0043 (GitHub #98)
 *
 * Handles single/double/long press for 3 buttons
 */
class Button3GangDevice extends ButtonDevice {

  async onNodeInit({ zclNode }) {
    this.log('╔═══════════════════════════════════════════════════════════════════╗');
    this.log('║           BUTTON 3-GANG v5.7.52 - E000 SUPPORT                    ║');
    this.log('╚═══════════════════════════════════════════════════════════════════╝');

    // Set button count BEFORE calling super (base class uses this!)
    this.buttonCount = 3;

    // Base class handles dynamic capabilities via _ensureDynamicCapabilities()
    await super.onNodeInit({ zclNode }).catch(err => this.error('[INIT] Error:', err.message));

    // v5.7.52: Setup E000 detection for LoraTap TS0043 (GitHub #98)
    await this._setupE000Detection(zclNode);
    this.log('[INIT] ✅ Button3GangDevice initialized - 3 buttons ready');
  }

  async _setupE000Detection(zclNode) {
    const mfr = this.getData()?.manufacturerName || this.getSetting?.('zb_manufacturer_name') || '';
    
    // v5.8.1: Always setup E000 for all 3-button devices (GitHub #98)
    // LoraTap TS0043 and similar devices use onOff commands or cluster 0xE000
    this.log('[BUTTON3-E000] 🔧 Setting up button detection for 3-button device...');
    this.log(`[BUTTON3-E000] 📋 Manufacturer: ${mfr || 'unknown'}`);
    this._e000Dedup = {};

    // Setup onOff command listeners on all 3 endpoints
    for (let ep = 1; ep <= 3; ep++) {
      const endpoint = zclNode?.endpoints?.[ep];
      if (!endpoint) {
        this.log(`[BUTTON3-E000] ⚠️ EP${ep} not available`);
        continue;
      }

      const cluster = endpoint?.clusters?.onOff || endpoint?.clusters?.[6];
      if (!cluster) {
        this.log(`[BUTTON3-E000] ⚠️ EP${ep} no onOff cluster`);
        continue;
      }

      const handle = async (cmd, type) => {
        const now = Date.now();
        if (now - (this._e000Dedup[`${ep}_${cmd}`] || 0) < 500) return;
        this._e000Dedup[`${ep}_${cmd}`] = now;
        this.log(`[BUTTON3-E000] 🔘 EP${ep} ${cmd} → Button ${ep} ${type}`);
        await this.triggerButtonPress(ep, type);
      };

      // Listen for onOff commands (button presses)
      if (cluster.on) {
        cluster.on('commandOn', () => handle('on', 'single'));
        cluster.on('commandOff', () => handle('off', 'double'));
        cluster.on('commandToggle', () => handle('toggle', 'long'));
      }

      // v5.8.1: Also listen for attribute reports (some devices use this instead)
      if (cluster.on) {
        cluster.on('attr.onOff', (value) => {
          this.log(`[BUTTON3-E000] 📊 EP${ep} onOff attr: ${value}`);
          // Attribute change = button press detected
          handle('attr', 'single');
        });
      }

      this.log(`[BUTTON3-E000] ✅ EP${ep} listeners ready`);
    }

    // v5.8.1: Setup BoundCluster for cluster 0xE000 if available
    await this._setupE000BoundCluster(zclNode);
  }

  // v5.8.1: Setup BoundCluster for cluster 0xE000 (GitHub #98)
  async _setupE000BoundCluster(zclNode) {
    try {
      let TuyaE000BoundCluster;
      try {
        TuyaE000BoundCluster = require('../../lib/clusters/TuyaE000BoundCluster');
      } catch (e) {
        this.log('[BUTTON3-E000] ℹ️ TuyaE000BoundCluster not available');
        return;
      }

      for (let ep = 1; ep <= 3; ep++) {
        const endpoint = zclNode?.endpoints?.[ep];
        if (!endpoint) continue;

        const boundCluster = new TuyaE000BoundCluster({
          device: this,
          onButtonPress: async (button, pressType) => {
            const buttonNum = (button >= 1 && button <= 3) ? button : ep;
            this.log(`[BUTTON3-E000] 🔘 Button ${buttonNum} ${pressType.toUpperCase()} (BoundCluster EP${ep})`);
            await this.triggerButtonPress(buttonNum, pressType);
          }
        });

        boundCluster.endpoint = ep;
        if (!endpoint.bindings) endpoint.bindings = {};
        endpoint.bindings[57344] = boundCluster;
        this.log(`[BUTTON3-E000] ✅ BoundCluster EP${ep} cluster 57344`);
      }
    } catch (err) {
      this.log('[BUTTON3-E000] ⚠️ BoundCluster setup error:', err.message);
    }
  }

  async onDeleted() {
    this.log('Button3GangDevice deleted');
    if (this._clickState) {
      if (this._clickState.clickTimer) clearTimeout(this._clickState.clickTimer);
      if (this._clickState.longPressTimer) clearTimeout(this._clickState.longPressTimer);
    }
    if (super.onDeleted) await super.onDeleted();
  }
}

module.exports = Button3GangDevice;
