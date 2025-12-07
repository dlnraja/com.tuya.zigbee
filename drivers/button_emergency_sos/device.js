'use strict';

const { ZigBeeDevice } = require('homey-zigbeedriver');

/**
 * ╔══════════════════════════════════════════════════════════════════════════════╗
 * ║            SOS EMERGENCY BUTTON - v5.5.61 PURE IAS ZONE                      ║
 * ╠══════════════════════════════════════════════════════════════════════════════╣
 * ║                                                                              ║
 * ║  Device: TS0215A _TZ3000_0dumfk2z                                            ║
 * ║  Protocol: IAS Zone ONLY (NO Tuya DP - this is NOT a TS0601!)                ║
 * ║                                                                              ║
 * ║  Clusters:                                                                   ║
 * ║  - iasZone: Button press detection (zoneStatusChangeNotification)            ║
 * ║  - powerConfiguration: Battery percentage (ZCL standard)                     ║
 * ║                                                                              ║
 * ║  v5.5.61: CRITICAL FIX                                                       ║
 * ║  - Removed ALL Tuya DP logic (this device has NO 0xEF00 cluster)             ║
 * ║  - Uses ONLY IAS Zone for button + powerConfiguration for battery            ║
 * ║  - Simplified class hierarchy (extends ZigBeeDevice directly)                ║
 * ║                                                                              ║
 * ╚══════════════════════════════════════════════════════════════════════════════╝
 */
class SosEmergencyButtonDevice extends ZigBeeDevice {

  async onNodeInit({ zclNode }) {
    this.log('');
    this.log('╔══════════════════════════════════════════════════════════════╗');
    this.log('║         SOS EMERGENCY BUTTON v5.5.61 - PURE IAS ZONE         ║');
    this.log('║   TS0215A _TZ3000_0dumfk2z - NO TUYA DP!                      ║');
    this.log('╚══════════════════════════════════════════════════════════════╝');

    this.zclNode = zclNode;

    // Ensure capabilities
    await this._ensureCapabilities();

    // Initialize alarm_contact to false
    if (this.hasCapability('alarm_contact')) {
      await this.setCapabilityValue('alarm_contact', false).catch(() => { });
    }

    // Setup IAS Zone for button press
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

    // Proactive enrollment
    try {
      await iasZone.zoneEnrollResponse({ enrollResponseCode: 0, zoneId: 10 });
      this.log('[SOS] ✅ Proactive enrollment sent');
    } catch (e) {
      if (e.message?.includes('Zigbee')) {
        this._iasRetryTimeout = this.homey.setTimeout(() => this._setupIasZone(), 30000);
      }
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
   * Try to read battery when device is awake (after button press)
   */
  async _readBatteryNow() {
    try {
      const ep1 = this.zclNode?.endpoints?.[1];
      const powerCfg = ep1?.clusters?.powerConfiguration || ep1?.clusters?.genPowerCfg;

      if (powerCfg?.readAttributes) {
        const result = await powerCfg.readAttributes(['batteryPercentageRemaining']).catch(() => ({}));
        if (result?.batteryPercentageRemaining !== undefined) {
          const percent = Math.round(result.batteryPercentageRemaining / 2);
          this.log(`[SOS] 🔋 Battery read: ${percent}%`);
          await this.setCapabilityValue('measure_battery', percent).catch(() => { });
        }
      }
    } catch (e) {
      // Silent - device might have gone back to sleep
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
