'use strict';

const WallTouchDevice = require('../../lib/WallTouchDevice');

/**
 * Wall Touch Button 6 Gang - SDK3 Compliant
 * 
 * Features:
 * - 6-gang button control
 * - Button combination detection
 * - Temperature monitoring (if supported)
 * - Tamper detection (if supported)
 * - Battery vs AC auto-detection
 * - 100% SDK3 compliant (no deprecated APIs)
 */
class WallTouch6GangDevice extends WallTouchDevice {

  async onNodeInit() {
    this.log('🎨 WallTouch6Gang initializing...');
    
    // Set button count (required by base class)
    this.buttonCount = 6;
    
    // Initialize via SDK3 base class
    await super.onNodeInit();
    
    this.log('✅ WallTouch6Gang ready (SDK3)');
  }
}

module.exports = WallTouch6GangDevice;
