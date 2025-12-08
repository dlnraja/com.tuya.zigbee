'use strict';

const { ZigBeeDevice } = require('homey-zigbeedriver');

/**
 * ╔══════════════════════════════════════════════════════════════════════════════╗
 * ║            SOS EMERGENCY BUTTON - v5.5.107 ENHANCED IAS ZONE                 ║
 * ╠══════════════════════════════════════════════════════════════════════════════╣
 * ║                                                                              ║
 * ║  Device: TS0215A _TZ3000_0dumfk2z                                            ║
 * ║  Protocol: IAS Zone ONLY (NO Tuya DP - this is NOT a TS0601!)                ║
 * ║                                                                              ║
 * ║  Clusters:                                                                   ║
 * ║  - iasZone: Button press detection (zoneStatusChangeNotification)            ║
 * ║  - powerConfiguration: Battery percentage (ZCL standard)                     ║
 * ║                                                                              ║
 * ║  v5.5.102: BATTERY FIX                                                       ║
 * ║  - Enhanced battery reading with multiple retry strategies                   ║
 * ║  - Better error handling for sleepy devices                                  ║
 * ║  - Added batteryVoltage fallback                                             ║
 * ║                                                                              ║
 * ╚══════════════════════════════════════════════════════════════════════════════╝
 */
class SosEmergencyButtonDevice extends ZigBeeDevice {

  async onNodeInit({ zclNode }) {
    this.log('');
    this.log('╔══════════════════════════════════════════════════════════════╗');
    this.log('║         SOS EMERGENCY BUTTON v5.5.107 - ENHANCED IAS          ║');
    this.log('║   TS0215A _TZ3000_0dumfk2z - IMPROVED BINDING                 ║');
    this.log('╚══════════════════════════════════════════════════════════════╝');

    this.zclNode = zclNode;

    // Ensure capabilities
    await this._ensureCapabilities();

    // Initialize alarm_contact to false
    if (this.hasCapability('alarm_contact')) {
      await this.setCapabilityValue('alarm_contact', false).catch(() => { });
    }

    // v5.5.64: Register capability with CLUSTER.IAS_ZONE for automatic flow triggers
    try {
      this.registerCapability('alarm_contact', 'iasZone', {
        report: 'zoneStatus',
        reportParser: (zoneStatus) => {
          this.log('[SOS] 🆘 registerCapability zoneStatus:', zoneStatus);
          const alarm = (zoneStatus & 0x01) !== 0 || (zoneStatus & 0x02) !== 0;
          if (alarm) {
            this._handleAlarm({ zoneStatus });
          }
          return alarm;
        }
      });
      this.log('[SOS] ✅ Registered alarm_contact with iasZone cluster');
    } catch (e) {
      this.log('[SOS] registerCapability skipped:', e.message);
    }

    // Setup IAS Zone for button press (additional listeners)
    await this._setupIasZone();

    // Setup battery via ZCL powerConfiguration (passive only)
    await this._setupBattery();

    this.log('[SOS] ✅ Device ready - Press button to test');
  }

  async _ensureCapabilities() {
    const caps = ['alarm_contact', 'measure_battery'];
    for (const cap of caps) {
      if (!this.hasCapability(cap)) {
        await this.addCapability(cap).catch(() => { });
      }
    }
  }

  /**
   * Setup IAS Zone - THE ONLY WAY this button communicates
   */
  async _setupIasZone() {
    const ep1 = this.zclNode?.endpoints?.[1];
    const iasZone = ep1?.clusters?.iasZone;

    if (!iasZone) {
      this.error('[SOS] ❌ No IAS Zone cluster found!');
      return;
    }

    this.log('[SOS] Setting up IAS Zone listeners...');

    // ═══════════════════════════════════════════════════════════════════════
    // IAS Zone Enrollment (required for button to work)
    // ═══════════════════════════════════════════════════════════════════════
    iasZone.onZoneEnrollRequest = async () => {
      this.log('[SOS] 📋 Zone Enroll Request received');
      try {
        await iasZone.zoneEnrollResponse({ enrollResponseCode: 0, zoneId: 10 });
        this.log('[SOS] ✅ Enroll Response sent');
      } catch (e) {
        this.error('[SOS] Enroll failed:', e.message);
      }
    };

    // v5.5.107: Write CIE Address FIRST (required for some devices)
    try {
      const ieeeAddress = this.homey.zigbee?.ieeeAddress || '0x00124b0000000000';
      this.log('[SOS] Writing CIE Address:', ieeeAddress);
      await iasZone.writeAttributes({ iasCieAddr: ieeeAddress }).catch(() => { });
    } catch (e) {
      this.log('[SOS] CIE address write (normal if not supported):', e.message);
    }

    // Proactive enrollment
    try {
      await iasZone.zoneEnrollResponse({ enrollResponseCode: 0, zoneId: 10 });
      this.log('[SOS] ✅ Proactive enrollment sent');
    } catch (e) {
      this.log('[SOS] Enrollment response (device may be sleeping):', e.message);
      // Retry later
      this._iasRetryTimeout = this.homey.setTimeout(() => {
        this._retryEnrollment();
      }, 30000);
    }

    // v5.5.107: Bind the cluster to receive reports
    try {
      await iasZone.bind();
      this.log('[SOS] ✅ IAS Zone bound');
    } catch (e) {
      this.log('[SOS] Binding (normal if already bound):', e.message);
    }

    // ═══════════════════════════════════════════════════════════════════════
    // Zone Status Change Notification - THE BUTTON PRESS EVENT
    // ═══════════════════════════════════════════════════════════════════════

    // Method 1: SDK3 onZoneStatusChangeNotification
    iasZone.onZoneStatusChangeNotification = (payload) => {
      this.log('[SOS] 🆘 onZoneStatusChangeNotification:', JSON.stringify(payload));
      this._handleAlarm(payload);
    };

    // Method 2: Event listener
    if (typeof iasZone.on === 'function') {
      iasZone.on('attr.zoneStatus', (status) => {
        this.log('[SOS] 🆘 attr.zoneStatus:', status);
        this._handleAlarm({ zoneStatus: status });
      });

      iasZone.on('zoneStatusChangeNotification', (payload) => {
        this.log('[SOS] 🆘 zoneStatusChangeNotification:', JSON.stringify(payload));
        this._handleAlarm(payload);
      });
    }

    // Method 3: onZoneStatus property
    iasZone.onZoneStatus = (status) => {
      this.log('[SOS] 🆘 onZoneStatus:', status);
      this._handleAlarm({ zoneStatus: status });
    };

    this.log('[SOS] ✅ IAS Zone listeners registered');
  }

  /**
   * Handle alarm from IAS Zone
   */
  _handleAlarm(payload) {
    // Debounce
    const now = Date.now();
    if (this._lastTrigger && (now - this._lastTrigger) < 2000) {
      this.log('[SOS] Debounced');
      return;
    }
    this._lastTrigger = now;

    this.log('[SOS] ════════════════════════════════════════');
    this.log('[SOS] 🆘 SOS BUTTON PRESSED!');
    this.log('[SOS] ════════════════════════════════════════');

    // Set capability
    this.setCapabilityValue('alarm_contact', true).catch(() => { });

    // Trigger flow card
    this._triggerFlow();

    // Auto-reset after 5s
    if (this._resetTimeout) clearTimeout(this._resetTimeout);
    this._resetTimeout = this.homey.setTimeout(() => {
      this.setCapabilityValue('alarm_contact', false).catch(() => { });
      this.log('[SOS] alarm_contact reset');
    }, 5000);

    // Try to read battery while device is awake
    this._readBatteryNow();
  }

  /**
   * Trigger flow card
   */
  _triggerFlow() {
    // Driver-level trigger
    if (this.driver?.sosButtonPressedTrigger) {
      this.driver.sosButtonPressedTrigger.trigger(this, {}, {}).catch(() => { });
    }

    // Direct flow card
    try {
      const card = this.homey.flow.getDeviceTriggerCard('button_emergency_sos_pressed');
      if (card) card.trigger(this, {}, {}).catch(() => { });
    } catch (e) { }
  }

  /**
   * Setup battery via ZCL powerConfiguration (passive listener only)
   */
  async _setupBattery() {
    const ep1 = this.zclNode?.endpoints?.[1];
    const powerCfg = ep1?.clusters?.powerConfiguration || ep1?.clusters?.genPowerCfg;

    if (!powerCfg) {
      this.log('[SOS] ℹ️ No powerConfiguration cluster');
      return;
    }

    // Passive listener for battery reports
    if (typeof powerCfg.on === 'function') {
      powerCfg.on('attr.batteryPercentageRemaining', (value) => {
        const percent = Math.round(value / 2); // ZCL: 0-200 = 0-100%
        this.log(`[SOS] 🔋 Battery: ${percent}%`);
        this.setCapabilityValue('measure_battery', percent).catch(() => { });
      });
      this.log('[SOS] ✅ Battery listener registered (passive)');
    }

    // NO polling - device is sleepy, will timeout
  }

  /**
   * v5.5.102: Enhanced battery reading with multiple strategies
   * Try to read battery when device is awake (after button press)
   */
  async _readBatteryNow() {
    try {
      const ep1 = this.zclNode?.endpoints?.[1];
      const powerCfg = ep1?.clusters?.powerConfiguration || ep1?.clusters?.genPowerCfg;

      if (!powerCfg?.readAttributes) {
        this.log('[SOS] ⚠️ No powerConfiguration cluster available');
        return;
      }

      // Strategy 1: Try batteryPercentageRemaining (standard)
      try {
        const result = await powerCfg.readAttributes(['batteryPercentageRemaining']);
        if (result?.batteryPercentageRemaining !== undefined && result.batteryPercentageRemaining !== 255) {
          const percent = Math.round(result.batteryPercentageRemaining / 2);
          this.log(`[SOS] 🔋 Battery (percentage): ${percent}%`);
          await this.setCapabilityValue('measure_battery', percent).catch(() => { });
          return; // Success
        }
      } catch (e) {
        this.log('[SOS] batteryPercentageRemaining failed, trying voltage...');
      }

      // Strategy 2: Try batteryVoltage (fallback)
      try {
        const result = await powerCfg.readAttributes(['batteryVoltage']);
        if (result?.batteryVoltage !== undefined && result.batteryVoltage > 0) {
          // CR2450: 3.0V = 100%, 2.0V = 0%
          const voltage = result.batteryVoltage / 10;
          const percent = Math.min(100, Math.max(0, Math.round((voltage - 2.0) * 100)));
          this.log(`[SOS] 🔋 Battery (voltage): ${voltage}V → ${percent}%`);
          await this.setCapabilityValue('measure_battery', percent).catch(() => { });
          return; // Success
        }
      } catch (e) {
        this.log('[SOS] batteryVoltage also failed');
      }

      // Strategy 3: Read all available attributes
      try {
        const allAttrs = await powerCfg.readAttributes(['batteryPercentageRemaining', 'batteryVoltage', 'batteryAlarmState']);
        this.log('[SOS] 🔋 All battery attrs:', JSON.stringify(allAttrs));

        if (allAttrs?.batteryPercentageRemaining !== undefined && allAttrs.batteryPercentageRemaining !== 255) {
          const percent = Math.round(allAttrs.batteryPercentageRemaining / 2);
          await this.setCapabilityValue('measure_battery', percent).catch(() => { });
        }
      } catch (e) {
        // Silent - device went back to sleep
      }
    } catch (e) {
      // Silent - device might have gone back to sleep
    }
  }

  /**
   * v5.5.107: Retry enrollment when device wakes up
   */
  async _retryEnrollment() {
    try {
      const ep1 = this.zclNode?.endpoints?.[1];
      const iasZone = ep1?.clusters?.iasZone;
      if (!iasZone) return;

      this.log('[SOS] 🔄 Retrying enrollment...');
      await iasZone.zoneEnrollResponse({ enrollResponseCode: 0, zoneId: 10 });
      this.log('[SOS] ✅ Enrollment retry successful');
    } catch (e) {
      this.log('[SOS] Enrollment retry failed (device sleeping):', e.message);
      // Schedule another retry
      this._iasRetryTimeout = this.homey.setTimeout(() => {
        this._retryEnrollment();
      }, 60000);
    }
  }

  async onUninit() {
    if (this._resetTimeout) this.homey.clearTimeout(this._resetTimeout);
    if (this._iasRetryTimeout) this.homey.clearTimeout(this._iasRetryTimeout);
  }

  async onDeleted() {
    await this.onUninit();
  }
}

module.exports = SosEmergencyButtonDevice;
