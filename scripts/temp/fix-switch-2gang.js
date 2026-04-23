const fs = require('fs');

// Enhance switch_2gang with better error handling
const deviceFile = 'drivers/switch_2gang/device.js';
let content = fs.readFileSync(deviceFile, 'utf8');

// Add comprehensive try-catch in onNodeInit
const enhancement = `  async onNodeInit({ zclNode }) {
    try {
      if (this.isZclOnlyDevice) {
        this.log('[SWITCH-2G]  ZCL-ONLY MODE (BSEED)');
        await this._initZclOnlyMode(zclNode);
        return;
      }
      
      // v6.0: Robust initialization with error recovery
      try {
        await super.onNodeInit({ zclNode });
      } catch (superErr) {
        this.error('[SWITCH-2G]  Super init error (non-fatal):', superErr.message);
        // Continue with basic setup even if super fails
        this.zclNode = zclNode;
      }

      // v5.5.43: Cleanup orphan capabilities
      await this._cleanupOrphanCapabilities().catch(e => {
        this.log('[SWITCH-2G] Cleanup warning:', e.message);
      });

      // v5.5.26: Setup power measurement for ZCL devices
      await this._setupPowerMeasurement(zclNode).catch(e => {
        this.log('[SWITCH-2G] Power measurement skipped:', e.message);
      });

      // v5.5.896: Initialize physical button detection (single/double/long/triple)
      await this.initPhysicalButtonDetection(zclNode).catch(e => {
        this.log('[SWITCH-2G] Button detection warning:', e.message);
      });

      // v5.5.412: Initialize virtual buttons
      await this.initVirtualButtons().catch(e => {
        this.log('[SWITCH-2G] Virtual buttons warning:', e.message);
      });

      this.log('[SWITCH-2G]  v6.0 - Initialized with error recovery');
    } catch (err) {
      this.error('[SWITCH-2G]  CRITICAL INIT ERROR:', err.message);
      this.error('[SWITCH-2G] Stack:', err.stack);
      // Don't throw - allow device to partially work
      this.setUnavailable('Driver initialization incomplete - try removing and re-pairing').catch(() => {});
    }
  }`;

content = content.replace(/async onNodeInit\(\{ zclNode \}\) \{[^}]+\n(?:[^}]+\n)*  \}/m, enhancement)      ;

fs.writeFileSync(deviceFile, content);
console.log(' Enhanced switch_2gang with error recovery');
