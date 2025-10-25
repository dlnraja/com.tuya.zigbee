'use strict';

const WallTouchDevice = require('../../lib/WallTouchDevice');

/**
 * Wall Touch Button 5 Gang - SDK3 Compliant
 * 
 * Features:
 * - 5-gang button control
 * - Button combination detection
 * - Temperature monitoring (if supported)
 * - Tamper detection (if supported)
 * - Battery vs AC auto-detection
 * - 100% SDK3 compliant (no deprecated APIs)
 */
class WallTouch5GangDevice extends WallTouchDevice {

  async onNodeInit() {
    this.log('🎨 WallTouch5Gang initializing...');
    
    // Set button count (required by base class)
    this.buttonCount = 5;
    
    // Initialize via SDK3 base class
    await super.onNodeInit();
    
    this.log('✅ WallTouch5Gang ready (SDK3)');
  }
}

module.exports = WallTouch5GangDevice;
