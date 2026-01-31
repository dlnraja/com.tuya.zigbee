'use strict';
const { HybridPlugBase } = require('../../lib/devices/HybridPlugBase');
const VirtualButtonMixin = require('../../lib/mixins/VirtualButtonMixin');
const PhysicalButtonMixin = require('../../lib/mixins/PhysicalButtonMixin');

/**
 * ╔══════════════════════════════════════════════════════════════════════════════╗
 * ║      VALVE SINGLE - v5.6.0 + Bidirectional Buttons                          ║
 * ╠══════════════════════════════════════════════════════════════════════════════╣
 * ║  Smart valve with bidirectional physical/virtual button support             ║
 * ╚══════════════════════════════════════════════════════════════════════════════╝
 */
class ValveSingleDevice extends PhysicalButtonMixin(VirtualButtonMixin(HybridPlugBase)) {
  get plugCapabilities() { return ['onoff']; }
  get gangCount() { return 1; }

  async onNodeInit({ zclNode }) {
    // v5.6.0: Track state for physical button detection
    this._lastOnoffState = null;
    this._appCommandPending = false;
    this._appCommandTimeout = null;

    await super.onNodeInit({ zclNode });

    // v5.6.0: Initialize bidirectional button support
    await this.initPhysicalButtonDetection(zclNode);
    await this.initVirtualButtons();

    this.log('[VALVE] v5.6.0 ✅ Ready with bidirectional buttons');
  }

  _markAppCommand() {
    this._appCommandPending = true;
    clearTimeout(this._appCommandTimeout);
    this._appCommandTimeout = setTimeout(() => {
      this._appCommandPending = false;
    }, 2000);
  }
}
module.exports = ValveSingleDevice;
