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
    if (!mfr.toLowerCase().includes('famkxci2')) return;

    this.log('[BUTTON3-E000] 🔧 LoraTap TS0043 E000 setup...');
    this._e000Dedup = {};

    for (let ep = 1; ep <= 3; ep++) {
      const cluster = zclNode?.endpoints?.[ep]?.clusters?.onOff || zclNode?.endpoints?.[ep]?.clusters?.[6];
      if (!cluster?.on) continue;

      const handle = async (cmd, type) => {
        const now = Date.now();
        if (now - (this._e000Dedup[`${ep}_${cmd}`] || 0) < 500) return;
        this._e000Dedup[`${ep}_${cmd}`] = now;
        this.log(`[BUTTON3-E000] 🔘 EP${ep} ${cmd} → Button ${ep} ${type}`);
        await this.triggerButtonPress(ep, type);
      };

      cluster.on('commandOn', () => handle('on', 'single'));
      cluster.on('commandOff', () => handle('off', 'double'));
      cluster.on('commandToggle', () => handle('toggle', 'long'));
      this.log(`[BUTTON3-E000] ✅ EP${ep} listeners ready`);
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
