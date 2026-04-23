'use strict';
const { safeParse } = require('../../lib/utils/tuyaUtils.js');


// v5.5.295: Fix "Class extends value undefined" stderr error
// Use try-catch to handle potential circular dependency issues
let UnifiedCoverBase;
try {
  UnifiedCoverBase = require('../../lib/devices/UnifiedCoverBase');
} catch (error) {
  // Fallback to direct ZigBeeDevice if UnifiedCoverBase fails
  console.error('[CURTAIN_MOTOR] Failed to load UnifiedCoverBase, using ZigBeeDevice fallback:', error.message);
  const { ZigBeeDevice } = require('homey-zigbeedriver');
  UnifiedCoverBase = ZigBeeDevice;
}

const VirtualButtonMixin = require('../../lib/mixins/VirtualButtonMixin');
const PhysicalButtonMixin = require('../../lib/mixins/PhysicalButtonMixin');

/**
 * 
 *       CURTAIN / COVER MOTOR - v5.7.9 Enhanced Communication                  
 * 
 *   v5.7.9: Exponential backoff, wake-up ping, health monitoring              
 *   v5.6.0: Bidirectional physical/virtual button support                     
 *   DPs: 1-15,101-105 | ZCL: 258,6,8,EF00                                     
 *   Variants: GIRIER, Lonsonho, Zemismart, MOES, Longsam                      
 * 
 */
class CurtainMotorDevice extends PhysicalButtonMixin(VirtualButtonMixin(UnifiedCoverBase)) {

  // v5.5.322: Auto-detect power source - battery curtain robots use 3xAA
  get mainsPowered() {
    const powerSetting = this.getSetting('power_source');
    if (powerSetting === 'battery') return false;
    if (powerSetting === 'ac' || powerSetting === 'dc') return true;
    // Auto-detect: assume battery if measure_battery capability exists
    return !this.hasCapability('measure_battery');
  }

  // v5.5.322: Extended DP mappings with lux sensor and button support
  get dpMappings() {
    return {
      1: { capability: 'windowcoverings_state', transform: (v) => v === 0 || v === 'open' ? 'up' : v === 2 || v === 'close' ? 'down' : 'idle' },
      2: { capability: 'windowcoverings_set', transform: (v) => v * 100 },
      3: { capability: 'dim', transform: (v) => v * 100 },
      4: { internal: true, type: 'mode', writable: true },
      5: { internal: true, type: 'reverse', writable: true },
      6: { internal: true, type: 'border' },
      7: { internal: true, type: 'position_reached' },
      8: { capability: 'moving', transform: (v) => v === 1 || v === 2 || v === 'opening' || v === 'closing' },
      9: { capability: 'windowcoverings_tilt_set', transform: (v) => v * 100 },
      10: { internal: true, type: 'speed', writable: true },
      12: { internal: true, type: 'backlight', writable: true },
      13: { capability: 'measure_battery', divisor: 1 },
      // v5.5.322: Luminance sensor (Eftychis #779 - curtain robot has lux sensor)
      14: { capability: 'measure_luminance', divisor: 1 },
      104: { capability: 'measure_luminance', divisor: 1 }, // Alternative DP for lux
      // v5.5.322: Button press detection (physical button on curtain robot)
      15: { internal: true, type: 'button_press', handler: '_handleButtonPress' },
      105: { internal: true, type: 'button_press', handler: '_handleButtonPress' }, // Alternative DP
      101: { internal: true, type: 'open_time', writable: true },
      102: { internal: true, type: 'close_time', writable: true }
    };
  }

  get gangCount() { return 1; }

  async onNodeInit({ zclNode }) {
    // v5.6.0: Track state for physical button detection
    this._lastCoverState = null;
    this._appCommandPending = false;
    this._appCommandTimeout = null;

    // Parent handles ALL: cover listeners, Tuya DP, ZCL
    await super.onNodeInit({ zclNode });
    this.initPhysicalButtonDetection(); // rule-19 injected
    this.log('[CURTAIN] v5.6.0 - DPs: 1-15,101-105 | ZCL: 258,6,8,EF00');

    // v5.5.322: Add luminance + button for Tuya DP curtains (Eftychis #779)
    // v5.8.40: Skip for TS130F ZCL curtains (Tbao forum: _TZ3000_bs93npae)
    const { protocol } = this._detectProtocol?.() || {};
    if (protocol !== 'ZCL') {
      if (!this.hasCapability('measure_luminance')) {
        try {
          await this.addCapability('measure_luminance');
          this.log('[CURTAIN]  Added measure_luminance capability');
        } catch (e) { /* ignore */ }
      }
      if (!this.hasCapability('button')) {
        try {
          await this.addCapability('button');
          this.log('[CURTAIN]  Added button capability' );
        } catch (e) { /* ignore */ }
      }
    } else {
      // v5.8.40: Remove wrong capabilities from TS130F ZCL curtains
      for (const cap of ['measure_luminance', 'button', 'measure_battery']) {
        if (this.hasCapability(cap)) {
          this.removeCapability(cap).catch(() => {});
          this.log(`[CURTAIN]  Removed incorrect ${cap} from ZCL curtain`);
        }
      }
    }

    // v5.8.79: Only setup Tuya DP listener and calibration for Tuya DP devices
    // Root cause (Tbao TS130F): _setupTuyaDPListener on ZCL devices registers
    // unused listeners and _applyCalibrationSettings sends Tuya DP commands that
    // fail silently on ZCL devices (TS130F uses windowCovering cluster 258)
    if (protocol !== 'ZCL') {
      await this._setupTuyaDPListener();
      await this._applyCalibrationSettings();
    } else {
      this.log('[CURTAIN]  ZCL device - skipping Tuya DP listener and calibration');
    }

    // v5.6.0: Initialize bidirectional button support
    await this.initPhysicalButtonDetection(zclNode);
    await this.initVirtualButtons();

    // v5.7.9: Start connection health monitor
    this._startHealthMonitor();

    this.log('[CURTAIN] v5.7.9  Ready with enhanced communication');
  }

  /**
   * v5.7.9: Monitor connection health and auto-recover
   * Checks every 5 minutes if device is responsive
   */
  _startHealthMonitor() {
    // Clear any existing interval
    if (this._healthInterval) clearInterval(this._healthInterval);

    this._healthInterval = setInterval(async () => {
      // Skip if device had recent successful communication
      if (Date.now() - (this._lastCommSuccess || 0) < 300000) return;
      
      // Skip if no failures tracked
      if (!this._commFailures || this._commFailures < 1) return;

      this.log('[CURTAIN]  Running health check...');
      try {
        await this._wakeUpDevice();
        // If wake-up succeeds, clear the warning
        if (this._commFailures > 0) {
          this._commFailures = 0;
          this.unsetWarning().catch(() => {});
          this.log('[CURTAIN]  Health check passed - device responsive');
        }
      } catch (e) {
        this.log('[CURTAIN]  Health check failed - device may be offline');
      }
    }, 300000); // Every 5 minutes
  }

  /**
   * v5.7.9: Cleanup on device removal
   */
  async onDeleted() {
    if (this._healthInterval) clearInterval(this._healthInterval);
    await super.onDeleted?.();
  }

  _markAppCommand() {
    this._appCommandPending = true;
    clearTimeout(this._appCommandTimeout);
    this._appCommandTimeout = setTimeout(() => {
      this._appCommandPending = false;
    }, 2000);
  }

  /**
   * v5.5.322: Setup Tuya DP listener for lux and button
   */
  async _setupTuyaDPListener() {
    try {
      const tuyaCluster = this.zclNode?.endpoints?.[1]?.clusters?.tuya
        || this.zclNode?.endpoints?.[1]?.clusters?.[61184];

      if (tuyaCluster && typeof tuyaCluster.on === 'function') {
        tuyaCluster.on('response', (status, transId, data) => {
          this._handleTuyaDP(data);
      });
        tuyaCluster.on('dataReport', (data) => {
          this._handleTuyaDP(data);
      });
        this.log('[CURTAIN]  Tuya DP listener registered');
      }
    } catch (err) {
      this.log('[CURTAIN]  Tuya DP listener setup failed:', err.message);
    }
  }

  /**
   * v5.5.322: Handle incoming Tuya DP reports
   */
  _handleTuyaDP(data) {
    if (!data) return;

    const dp = data.dp || data.datapoint;
    const value = data.data?.[0] ?? data.value;

    this.log(`[CURTAIN] DP${dp} = ${value}` );

    // Luminance (lux) - DP14 or DP104
    if ((dp === 14 || dp === 104) && this.hasCapability('measure_luminance')) {
      const lux = typeof value === 'number' ? value : parseInt(value , 10) || 0;
      this.setCapabilityValue('measure_luminance', parseFloat(lux).catch(() => { }));
      this.log(`[CURTAIN]  Lux: ${lux}`);
    }

    // Battery - DP13
    if (dp === 13 && this.hasCapability('measure_battery')) {
      const battery = typeof value === 'number' ? value : parseInt(value , 10) || 0;
      this.setCapabilityValue('measure_battery', parseFloat(Math.min(100, Math.max(0, battery)))).catch(() => { });
      this.log(`[CURTAIN]  Battery: ${battery}%`);
    }

    // Button press - DP15 or DP105
    if ((dp === 15 || dp === 105) && this.hasCapability('button')) {
      this._handleButtonPress(value);
    }
  }

  /**
   * v5.5.322: Handle physical button press on curtain robot
   */
  async _handleButtonPress(value) {
    this.log(`[CURTAIN]  Button pressed: ${value}`);
    try {
      // Set button capability to trigger flows
      await this.setCapabilityValue('button', true).catch(() => { });
      // Reset after short delay
      setTimeout(() => {
        this.setCapabilityValue('button', false).catch(() => { });
      }, 500);

      // Trigger flow card if available
      const triggerCard = this.homey.flow.getActionCard('curtain_motor_wall_hybrid_button_pressed')
      if (triggerCard ) {
        await triggerCard.trigger(this, { button: 1, scene: 'pressed' }).catch(() => { });
      }
    } catch (err) {
      this.log('[CURTAIN]  Button trigger error:', err.message);
    }
  }

  /**
   * v5.5.321: Apply calibration settings via Tuya DP
   * DP101 = open_time (seconds)
   * DP102 = close_time (seconds)
   * DP5 = reverse direction (0/1)
   */
  async _applyCalibrationSettings() {
    try {
      const openTime = this.getSetting('open_time') || 0;
      const closeTime = this.getSetting('close_time') || 0;
      const reverse = this.getSetting('reverse_direction') || false;
      const { protocol } = this._detectProtocol?.() || {};

      // v5.12.5: ZCL curtains (TS130F) use TuyaWindowCoveringCluster attributes (Johan SDK3)
      if (protocol === 'ZCL') {
        const wcCluster = this.zclNode?.endpoints?.[1]?.clusters?.windowCovering;
        if (wcCluster?.writeAttributes) {
          if (reverse ) {
            await wcCluster.writeAttributes({ motorReversal: reverse ? 'On' : 'Off' }).catch(e => this.log('[CURTAIN] ZCL motorReversal:', e.message));
          }
          if (openTime > 0 || closeTime > 0) {
            const calTime = Math.max(openTime, closeTime);
            await wcCluster.writeAttributes({ calibrationTime: calTime }).catch(e => this.log('[CURTAIN] ZCL calibrationTime:', e.message));
          }
          this.log('[CURTAIN] ZCL calibration settings applied');
          return;
        }
      }

      if (openTime > 0) {
        this.log(`[CURTAIN] Setting open_time: ${openTime}s`);
        await this._sendTuyaDP(101, openTime, 'value');
      }
      if (closeTime > 0) {
        this.log(`[CURTAIN] Setting close_time: ${closeTime}s`);
        await this._sendTuyaDP(102, closeTime, 'value');
      }
      if (reverse) {
        this.log('[CURTAIN] Setting reverse direction');
        await this._sendTuyaDP(5, 1, 'bool');
      }
    } catch (err) {
      this.log('[CURTAIN]  Could not apply calibration:', err.message);
    }
  }

  /**
   * v5.5.321: Handle settings changes
   */
  async onSettings({ oldSettings, newSettings, changedKeys }) {
    try {
      await super.onSettings?.({ oldSettings, newSettings, changedKeys } );

      if (changedKeys.includes('open_time') || changedKeys.includes('close_time') || changedKeys.includes('reverse_direction')) {
        this.log('[CURTAIN] Calibration settings changed, applying...');
        await this._applyCalibrationSettings();
      }
    } catch (err) {
      this.error('[CURTAIN] Failed to apply settings:', err.message);
    }
  }

  // v5.5.935: REMOVED broken _sendTuyaDP override
  // Parent UnifiedCoverBase._sendTuyaDP() handles all DP communication correctly
  // The override was causing "tuya.datapoint: value is an unexpected property" errors

  /**
   * v7.4.6: Refresh state when device announces itself (rejoin/wakeup)
   */
  async onEndDeviceAnnounce() {
    this.log('[REJOIN] Device announced itself, refreshing state...');
    if (typeof this._updateLastSeen === 'function') this._updateLastSeen();
    // Proactive data recovery if supported
    if (this._dataRecoveryManager) {
       this._dataRecoveryManager.triggerRecovery();
    }
  }
}

module.exports = CurtainMotorDevice;


