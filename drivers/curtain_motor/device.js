'use strict';

// v5.5.295: Fix "Class extends value undefined" stderr error
// Use try-catch to handle potential circular dependency issues
let UnifiedCoverBase;
try {
  UnifiedCoverBase = require('../../lib/devices/UnifiedCoverBase');
} catch (error) {
  // Fallback to direct ZigBeeDevice if UnifiedCoverBase fails
  // UnifiedCoverBase load failed - using ZigBeeDevice fallback
  const { ZigBeeDevice } = require('homey-zigbeedriver');
  UnifiedCoverBase = ZigBeeDevice;
}

const VirtualButtonMixin = require('../../lib/mixins/VirtualButtonMixin');
const PhysicalButtonMixin = require('../../lib/mixins/PhysicalButtonMixin');
// v9.x (upstream PR #1431): split frames packing several DPs (Dooya DC1545R)
const { parseTuyaMultiDpFrame } = require('../../lib/TuyaDataPoints');
const { isBatteryCoverMfr } = require('../../lib/helpers/batteryPowerSource');
const SDK3BestPractices = require('../../lib/SDK3BestPractices');

/**
 * ╔══════════════════════════════════════════════════════════════════════════════╗
 * ║      CURTAIN / COVER MOTOR - v5.7.9 Enhanced Communication                  ║
 * ╠══════════════════════════════════════════════════════════════════════════════╣
 * ║  v5.7.9: Exponential backoff, wake-up ping, health monitoring              ║
 * ║  v5.6.0: Bidirectional physical/virtual button support                     ║
 * ║  DPs: 1-15,101-105 | ZCL: 258,6,8,EF00                                     ║
 * ║  Variants: GIRIER, Lonsonho, Zemismart, MOES, Longsam                      ║
 * ╚══════════════════════════════════════════════════════════════════════════════╝
 */
class CurtainMotorDevice extends PhysicalButtonMixin(VirtualButtonMixin(UnifiedCoverBase)) {

  // WHY(P2296): Homey battery-status — ZM16EL/ZM85EL are Battery EndDevices (DP13 %).
  // Never default to UnifiedCoverBase mains=true for those couples.
  get mainsPowered() {
    const powerSetting = this.getSetting('power_source');
    if (powerSetting === 'battery') {return false;}
    if (powerSetting === 'ac' || powerSetting === 'dc') {return true;}
    const mfr = this.getManufacturerName?.() || this.getSetting?.('zb_manufacturer_name') || '';
    if (isBatteryCoverMfr(mfr)) {return false;}
    // Auto-detect: assume battery if measure_battery capability exists
    return !this.hasCapability('measure_battery');
  }

  // WHY(P2304): Moes ZTS-EUR-C (`_TZE204_5slehgeo`+TS0601) uses DP3=calib, DP7=backlight,
  // DP8=motor reverse, DP10=calib seconds — not the generic cover lux/dim map.
  _isMoesZtsEurC() {
    const mfr = String(
      this.getManufacturerName?.()
      || this.getSetting?.('zb_manufacturer_name')
      || this.getData?.()?.manufacturerName
      || ''
    ).toLowerCase();
    // WHY(P2307): Moes Star Feather `_TZE284_upt8lzi0` shares ZTS DP family (1/2/3/7/8/10).
    return mfr.includes('5slehgeo')
      || mfr.includes('nhyj64w2')
      || mfr.includes('127x7wnl')
      || mfr.includes('upt8lzi0')
      || mfr.includes('i8sdouy0');
  }

  // v5.5.322: Extended DP mappings with lux sensor and button support
  get dpMappings() {
    if (this._isMoesZtsEurC()) {
      return {
        1: {
          capability: 'windowcoverings_state',
          transform: (v) => (v === 0 || v === 'open' ? 'up' : v === 2 || v === 'close' ? 'down' : 'idle'),
        },
        2: { capability: 'windowcoverings_set', transform: (v) => v / 100 },
        3: { capability: null, internal: 'calibration', writable: true },
        7: { capability: null, internal: 'backlight', writable: true },
        8: { capability: null, internal: 'reverse', writable: true },
        10: { capability: null, internal: 'open_time', writable: true },
      };
    }
    return {
      1: { capability: 'windowcoverings_state', transform: (v) => v === 0 || v === 'open' ? 'up' : v === 2 || v === 'close' ? 'down' : 'idle' },
      2: { capability: 'windowcoverings_set', transform: (v) => v / 100 },
      3: { capability: 'dim', transform: (v) => v / 100 },
      4: { capability: null, internal: 'mode', writable: true },
      5: { capability: null, internal: 'reverse', writable: true },
      6: { capability: null, internal: 'border' },
      7: { capability: null, internal: 'position_reached' },
      8: { capability: 'moving', transform: (v) => v === 1 || v === 2 || v === 'opening' || v === 'closing' },
      9: { capability: 'windowcoverings_tilt_set', transform: (v) => v / 100 },
      10: { capability: null, internal: 'speed', writable: true },
      12: { capability: null, internal: 'backlight', writable: true },
      13: { capability: 'measure_battery', divisor: 1 },
      // v9.0.400 (fork ErnieV, Quoya M515EGBZTN): DP16 border/limits —
      // 0=set upper, 1=set lower, 2=delete upper, 3=delete lower, 4=remove both
      16: { capability: null, internal: 'border_limits', writable: true },
      // v5.5.322: Luminance sensor (Eftychis #779 - curtain robot has lux sensor)
      14: { capability: 'measure_luminance', divisor: 1 },
      104: { capability: 'measure_luminance', divisor: 1 }, // Alternative DP for lux
      // v5.5.322: Button press detection (physical button on curtain robot)
      15: { capability: null, internal: 'button_press', handler: '_handleButtonPress' },
      105: { capability: null, internal: 'button_press', handler: '_handleButtonPress' }, // Alternative DP
      101: { capability: null, internal: 'open_time', writable: true },
      102: { capability: null, internal: 'close_time', writable: true }
    };
  }

  get gangCount() { return 1; }

  async onNodeInit({ zclNode }) {
    // WHY(P2296): Homey SDK — never both measure_battery + alarm_battery;
    // battery covers (ZM16EL) KEEP measure_battery; mains covers strip both.
    if (this.mainsPowered) {
      await this.removeCapability('measure_battery').catch(() => {});
      await this.removeCapability('alarm_battery').catch(() => {});
    } else {
      if (!this.hasCapability('measure_battery')) {
        await this.addCapability('measure_battery').catch(() => {});
      }
      // Prefer % UI over alarm (Homey best-practices/battery-status)
      await this.removeCapability('alarm_battery').catch(() => {});
    }
    // v5.6.0: Track state for physical button detection
    this._lastCoverState = null;

    // Parent handles ALL: cover listeners, Tuya DP, ZCL
    await super.onNodeInit({ zclNode });
    await SDK3BestPractices.ensureBatteryBestPractices(this).catch(() => {});
    this.log('[CURTAIN] v5.6.0 - DPs: 1-15,101-105 | ZCL: 258,6,8,EF00 | mains=', this.mainsPowered);

    // v5.5.322: Add luminance + button for Tuya DP curtains (Eftychis #779)
    // v5.8.40: Skip for TS130F ZCL curtains (Tbao forum: _TZ3000_bs93npae)
    const { protocol } = this._detectProtocol?.() || {};
    const moesZts = this._isMoesZtsEurC();
    // WHY(P2304): Moes ZTS-EUR-C wall switch — no lux/button robot extras
    if (protocol !== 'ZCL' && !moesZts) {
      if (!this.hasCapability('measure_luminance')) {
        try {
          await this.addCapability('measure_luminance');
          this.log('[CURTAIN] ✅ Added measure_luminance capability');
        } catch (e) { /* ignore */ }
      }
      if (!this.hasCapability('button')) {
        try {
          await this.addCapability('button');
          this.log('[CURTAIN] ✅ Added button capability');
        } catch (e) { /* ignore */ }
      }
    } else {
      const strip = protocol === 'ZCL'
        ? ['measure_luminance', 'button', 'measure_battery']
        : ['measure_luminance', 'button', 'dim', 'windowcoverings_tilt_set', 'measure_battery', 'alarm_battery'];
      for (const cap of strip) {
        if (this.hasCapability(cap)) {
          this.removeCapability(cap).catch(() => {});
          this.log(`[CURTAIN] 🗑️ Removed incorrect ${cap} from ${protocol === 'ZCL' ? 'ZCL' : 'Moes ZTS'} curtain`);
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
      this.log('[CURTAIN] ℹ️ ZCL device - skipping Tuya DP listener and calibration');
    }

    // v5.6.0: Initialize bidirectional button support
    await this.initPhysicalButtonDetection(zclNode);
    await this.initVirtualButtons();

    // v5.7.9: Start connection health monitor
    this._startHealthMonitor();

    this.log('[CURTAIN] v5.7.9 ✅ Ready with enhanced communication');
  }

  /**
   * v5.7.9: Monitor connection health and auto-recover
   * Checks every 5 minutes if device is responsive
   */
  _startHealthMonitor() {
    // Clear any existing interval
    if (this._healthInterval) {clearInterval(this._healthInterval);}

    this._healthInterval = this.homey.setInterval(async () => {
      if (this._destroyed) {return;}
      // Skip if device had recent successful communication
      if (Date.now() - (this._lastCommSuccess || 0) < 300000) {return;}
      
      // Skip if no failures tracked
      if (!this._commFailures || this._commFailures < 1) {return;}

      this.log('[CURTAIN] 🔍 Running health check...');
      try {
        await this._wakeUpDevice();
        // If wake-up succeeds, clear the warning
        if (this._commFailures > 0) {
          this._commFailures = 0;
          this.unsetWarning().catch(() => {});
          this.log('[CURTAIN] ✅ Health check passed - device responsive');
        }
      } catch (e) {
        this.log('[CURTAIN] ⚠️ Health check failed - device may be offline');
      }
    }, 300000); // Every 5 minutes
  }

  /**
   * v5.7.9: Cleanup on device removal
   */
  async onDeleted() {
    if (this._destroyed) {return;}
    this._destroyed = true;
    if (this._healthInterval) {clearInterval(this._healthInterval);}
    await super.onDeleted?.();
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
        this.log('[CURTAIN] ✅ Tuya DP listener registered');
      }
    } catch (err) {
      this.log('[CURTAIN] ⚠️ Tuya DP listener setup failed:', err.message);
    }
  }

  /**
   * v5.5.322: Handle incoming Tuya DP reports
   */
  _handleTuyaDP(data) {
    if (!data) {return;}

    // v9.x (upstream PR #1431): some curtain modules (Dooya DC1545R family)
    // pack SEVERAL datapoints into one report frame — split and process each,
    // otherwise trailing DPs (e.g. position feedback) are silently dropped.
    if (Buffer.isBuffer(data.data) && typeof data.length === 'number' && data.data.length > data.length) {
      for (const sub of parseTuyaMultiDpFrame(data)) {
        this._handleTuyaDP({ ...data, dp: sub.dp, datatype: sub.datatype, data: sub.data, length: sub.data.length });
      }
      return;
    }

    const dp = data.dp || data.datapoint;
    // v9.x: decode the full big-endian payload, not just the first byte
    const value = Buffer.isBuffer(data.data)
      ? data.data.reduce((acc, b) => (acc << 8) + b, 0)
      : (data.value ?? data.data?.[0]);

    this.log(`[CURTAIN] DP${dp} = ${value}`);

    // Luminance (lux) - DP14 or DP104
    if ((dp === 14 || dp === 104) && this.hasCapability('measure_luminance')) {
      const lux = typeof value === 'number' ? value : parseInt(value, 10) || 0;
      this.safeSetCapabilityValue('measure_luminance', parseFloat(lux)).catch(() => { });
      this.log(`[CURTAIN] 💡 Lux: ${lux}`);
    }

    // Battery - DP13
    if (dp === 13 && this.hasCapability('measure_battery')) {
      const battery = typeof value === 'number' ? value : parseInt(value, 10) || 0;
      this.safeSetCapabilityValue('measure_battery', parseFloat(Math.min(100, Math.max(0, battery)))).catch(() => { });
      this.log(`[CURTAIN] 🔋 Battery: ${battery}%`);
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
    if (this._destroyed) {return;}
    this.log(`[CURTAIN] 🔘 Button pressed: ${value}`);
    try {
      // Set button capability to trigger flows
      await this._safeSetCapability('button', true);
      // Reset after short delay
      this.homey.setTimeout(() => { if (this._destroyed) {return;} this._safeSetCapability('button', false); }, 500);

      // Trigger flow card if available
      const triggerCard = this.homey.flow.getDeviceTriggerCard('curtain_motor_button_pressed');
      if (triggerCard) {
        await triggerCard.trigger(this, { button: 1, scene: 'pressed' }).catch(() => { });
      }
    } catch (err) {
      this.log('[CURTAIN] ⚠️ Button trigger error:', err.message);
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
          if (reverse) {
            await wcCluster.writeAttributes({ motorReversal: reverse ? 'On' : 'Off' }).catch(e =>
              this.log('[CURTAIN] ZCL motorReversal:', e.message));
          }
          if (openTime > 0 || closeTime > 0) {
            const calTime = Math.max(openTime, closeTime);
            await wcCluster.writeAttributes({ calibrationTime: calTime }).catch(e =>
              this.log('[CURTAIN] ZCL calibrationTime:', e.message));
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
      this.log('[CURTAIN] ⚠️ Could not apply calibration:', err.message);
    }
  }

  /**
   * v5.5.321: Handle settings changes
   */
  async onSettings({ oldSettings, newSettings, changedKeys }) {
    try {
      await super.onSettings?.({ oldSettings, newSettings, changedKeys });

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
}

module.exports = CurtainMotorDevice;
