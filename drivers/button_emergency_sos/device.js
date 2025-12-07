'use strict';

const { AutoAdaptiveDevice } = require('../../lib/dynamic');

/**
 * SOS Emergency Button Device - v5.5.34 FIXED
 *
 * Supported: TS0215A _TZ3000_0dumfk2z
 *
 * Sources:
 * - Z2M: Tuya TS0215A_sos
 * - Clusters: iasZone (zoneType=remoteControl)
 *
 * Protocol: IAS Zone for button press + Tuya DP 101 for battery
 *
 * DP Mapping:
 * - DP 1: button_press
 * - DP 101: battery_percentage
 *
 * v5.5.34: CRITICAL FIX
 * - NO polling on powerConfiguration (sleepy device = timeout errors)
 * - Battery ONLY via Tuya DP 101
 * - No Energy registration (battery device)
 * - Skip all ZCL battery reads
 */
class SosEmergencyButtonDevice extends AutoAdaptiveDevice {

  // Force battery powered (sleepy end device)
  get mainsPowered() { return false; }

  // v5.5.34: CRITICAL - Tell parent class to NOT use ZCL battery polling
  get usesTuyaDPBattery() { return true; }
  get skipZclBatteryPolling() { return true; }
  get skipEnergyRegistration() { return true; }

  async onNodeInit({ zclNode }) {
    this.log('═══════════════════════════════════════════════════');
    this.log('[SOS-BUTTON] v5.5.49 Initializing...');
    this.log('═══════════════════════════════════════════════════');

    // v5.5.49: CRITICAL - Ensure alarm_contact capability exists BEFORE init
    await this._ensureCapabilities();

    // Initialize base (auto power detection + dynamic capabilities)
    await super.onNodeInit({ zclNode }).catch(err => this.error(err));

    // Parse DP configuration from settings
    this._parseDPConfiguration();

    // Setup IAS Zone for button press detection
    await this.setupIasZone();

    // Setup Tuya DP listener for battery
    await this._setupTuyaDPListener();

    // v5.5.49: Initialize alarm_contact to false if null
    if (this.hasCapability('alarm_contact')) {
      const currentValue = this.getCapabilityValue('alarm_contact');
      if (currentValue === null || currentValue === undefined) {
        await this.setCapabilityValue('alarm_contact', false).catch(() => { });
        this.log('[SOS-BUTTON] ✅ alarm_contact initialized to false');
      }
    }

    this.log('[SOS-BUTTON] ✅ Initialized');
  }

  /**
   * v5.5.49: Ensure required capabilities exist
   */
  async _ensureCapabilities() {
    const requiredCaps = ['alarm_contact', 'measure_battery'];

    for (const cap of requiredCaps) {
      if (!this.hasCapability(cap)) {
        this.log(`[SOS-BUTTON] Adding missing capability: ${cap}`);
        await this.addCapability(cap).catch(err => {
          this.error(`[SOS-BUTTON] Failed to add ${cap}:`, err.message);
        });
      }
    }
  }

  /**
   * v5.5.50: Centralized IAS alarm handler
   * Debounced to prevent duplicate triggers from multiple listeners
   */
  _handleSOSAlarm(payload) {
    // Debounce: Ignore if we triggered in the last 2 seconds
    const now = Date.now();
    if (this._lastSOSTrigger && (now - this._lastSOSTrigger) < 2000) {
      this.log('[SOS] Debounced - already triggered recently');
      return;
    }
    this._lastSOSTrigger = now;

    this.log('[ZCL-DATA] SOS_button.zone_status raw=', JSON.stringify(payload));
    this.log('[ALARM] 🆘 SOS BUTTON PRESSED!');

    // Trigger flow card
    this._triggerSOSPressed();

    // Set alarm_contact capability
    if (this.hasCapability('alarm_contact')) {
      this.setCapabilityValue('alarm_contact', true).catch(this.error);

      // Auto-reset after 5 seconds
      if (this._alarmResetTimeout) {
        clearTimeout(this._alarmResetTimeout);
      }
      this._alarmResetTimeout = setTimeout(() => {
        this.setCapabilityValue('alarm_contact', false).catch(this.error);
        this.log('[SOS] alarm_contact reset to false');
      }, 5000);
    }

    // v5.5.50: Refresh battery while device is awake
    this._refreshBatteryOnWake();
  }

  /**
   * Parse DP configuration from settings
   */
  _parseDPConfiguration() {
    try {
      const configJson = this.getSetting('tuya_dp_configuration') || '{}';
      this.dpConfig = JSON.parse(configJson);
      this.log('[SOS-BUTTON] 📋 DP Config:', this.dpConfig);
    } catch (err) {
      this.error('[SOS-BUTTON] Invalid tuya_dp_configuration JSON:', err.message);
      this.dpConfig = { '1': 'button_press', '101': 'battery_percentage' };
    }
  }

  /**
   * Setup Tuya DP listener for battery reports
   * v5.2.85: Enhanced with initial battery request
   */
  async _setupTuyaDPListener() {
    this.log('[SOS-BUTTON] Setting up Tuya DP listener...');

    // Listen for dpReport events from TuyaEF00Manager
    if (this.tuyaEF00Manager) {
      this.tuyaEF00Manager.on('dpReport', ({ dpId, value }) => {
        this._handleSOSDP(dpId, value);
      });

      // v5.2.85: Also listen to datapoint events
      this.tuyaEF00Manager.on('datapoint', ({ dp, value }) => {
        this._handleSOSDP(dp, value);
      });

      // v5.2.85: Listen to specific battery DPs
      [4, 15, 101, 33, 35].forEach(dp => {
        this.tuyaEF00Manager.on(`dp-${dp}`, (value) => {
          this.log(`[SOS-BUTTON] 🔋 Battery DP${dp} received: ${value}`);
          this._setBattery(value);
        });
      });

      this.log('[SOS-BUTTON] ✅ Using TuyaEF00Manager for DP handling');

      // v5.2.85: Request initial battery DP
      this._requestBatteryDP();
      return;
    }

    // Fallback: Direct cluster listener
    const endpoint = this.zclNode?.endpoints?.[1];
    if (!endpoint) return;

    const tuyaCluster = endpoint.clusters.tuya
      || endpoint.clusters.tuyaSpecific
      || endpoint.clusters[61184];

    if (tuyaCluster && typeof tuyaCluster.on === 'function') {
      tuyaCluster.on('dataReport', (data) => {
        if (data && data.dp !== undefined) {
          this._handleSOSDP(data.dp, data.value);
        }
      });
      this.log('[SOS-BUTTON] ✅ Direct Tuya cluster listener configured');
    }
  }

  /**
   * v5.2.85: Request battery DP from device
   */
  async _requestBatteryDP() {
    this.log('[SOS-BUTTON] 🔋 Requesting battery DP...');

    // Try to request common battery DPs
    const batteryDPs = [101, 4, 15, 33, 35];

    for (const dp of batteryDPs) {
      try {
        if (this.tuyaEF00Manager && typeof this.tuyaEF00Manager.getData === 'function') {
          await this.tuyaEF00Manager.getData(dp).catch(() => { });
          this.log(`[SOS-BUTTON] 📤 Requested DP${dp}`);
        }
      } catch (err) {
        // Silent fail - device might not respond immediately
      }
    }

    this.log('[SOS-BUTTON] ℹ️ Battery DPs requested (device may respond on next wake)');
  }

  /**
   * v5.5.6: Handle incoming Tuya DP with MASTER BLOCK logging
   */
  _handleSOSDP(dpId, value) {
    const mapping = this.dpConfig[String(dpId)];

    // v5.5.6: MASTER BLOCK format logging
    this.log(`[ZCL-DATA] SOS_button.dp${dpId} raw=${value} mapping=${mapping || 'default'}`);

    if (mapping === 'button_press' || dpId === 1) {
      this.log('[ZCL-DATA] SOS_button.button_press raw=1 converted=PRESSED');
      this._triggerButtonPress();
    } else if (mapping === 'battery_percentage' || dpId === 101 || dpId === 15 || dpId === 4) {
      this.log(`[ZCL-DATA] SOS_button.battery raw=${value} converted=${value}%`);
      this._setBattery(value);
    } else {
      this.log(`[ZCL-DATA] SOS_button.unknown_dp dp=${dpId} raw=${value}`);
    }
  }

  /**
   * Trigger button press flow
   */
  /**
   * v5.2.61: Unified trigger for SOS button press
   */
  _triggerSOSPressed() {
    this.log('[SOS-BUTTON] 🆘 TRIGGERING FLOW CARD!');

    // Try driver-level trigger first
    if (this.driver.sosButtonPressedTrigger) {
      this.driver.sosButtonPressedTrigger.trigger(this, {}, {})
        .then(() => this.log('[FLOW] ✅ Triggered via driver'))
        .catch(err => this.log('[FLOW] ⚠️ Driver trigger failed:', err.message));
    }

    // Also try direct flow card access
    try {
      const trigger = this.homey.flow.getDeviceTriggerCard('button_emergency_sos_pressed');
      if (trigger) {
        trigger.trigger(this, {}, {})
          .then(() => this.log('[FLOW] ✅ Triggered via direct access'))
          .catch(err => this.log('[FLOW] ⚠️ Direct trigger failed:', err.message));
      }
    } catch (err) {
      this.log('[FLOW] Direct flow access error:', err.message);
    }
  }

  _triggerButtonPress() {
    this._triggerSOSPressed();

    // v5.5.5: Use alarm_contact (per MASTER BLOCK specs for zone activity)
    if (this.hasCapability('alarm_contact')) {
      this.setCapabilityValue('alarm_contact', true).catch(this.error);
      setTimeout(() => {
        this.setCapabilityValue('alarm_contact', false).catch(this.error);
      }, 5000);
    }

    // v5.5.26: Refresh battery while device is awake (best practice for sleepy devices)
    // Device just woke up to send button press, perfect time to read battery
    this._refreshBatteryOnWake();
  }

  /**
   * v5.5.34: Refresh battery via Tuya DP ONLY (no ZCL polling)
   * Called after button press when device is guaranteed to be awake
   */
  async _refreshBatteryOnWake() {
    this.log('[SOS-BUTTON] 🔋 Refreshing battery via Tuya DP (device is awake)...');

    try {
      // v5.5.34: ONLY use Tuya DP for battery - NO ZCL polling on sleepy device
      if (this.tuyaEF00Manager && typeof this.tuyaEF00Manager.getData === 'function') {
        await this.tuyaEF00Manager.getData(101).catch(() => { }); // Battery DP
        this.log('[SOS-BUTTON] 📤 Requested DP 101 (battery)');
      }
    } catch (err) {
      this.log('[SOS-BUTTON] Battery refresh failed:', err.message);
    }
  }

  /**
   * Set battery capability
   */
  _setBattery(value) {
    const battery = Math.min(100, Math.max(0, value));
    this.log(`[SOS-BUTTON] 🔋 Battery: ${battery}%`);

    if (this.hasCapability('measure_battery')) {
      this.setCapabilityValue('measure_battery', battery).catch(this.error);
    }
  }

  /**
   * IAS Zone Enrollment for SOS Emergency Button
   * CRITICAL: Required for button press detection
   */
  async setupIasZone() {
    try {
      this.log('[SOS] Setting up IAS Zone for SOS button (SDK3 latest)...');

      const endpoint = this.zclNode.endpoints[1];
      if (!endpoint?.clusters?.iasZone) {
        this.log('[INFO] IAS Zone cluster not available on this device');
        return;
      }

      // Setup Zone Enroll Request listener (SDK3 property assignment)
      endpoint.clusters.iasZone.onZoneEnrollRequest = async () => {
        this.log('[ENROLL] Zone Enroll Request received');

        try {
          await endpoint.clusters.iasZone.zoneEnrollResponse({
            enrollResponseCode: 0,
            zoneId: 10
          });
          this.log('[OK] Zone Enroll Response sent');
        } catch (err) {
          this.error('Zone enroll response failed:', err.message);
        }
      };

      // Send proactive Zone Enroll Response (SDK3 official method)
      try {
        await endpoint.clusters.iasZone.zoneEnrollResponse({
          enrollResponseCode: 0,
          zoneId: 10
        });
        this.log('[OK] Proactive Zone Enroll Response sent');
      } catch (err) {
        // v5.1.0: Detect "Zigbee is starting up" error and retry
        const errorMsg = String(err && err.message || err);
        if (errorMsg.includes('Zigbee is aan het opstarten') || errorMsg.includes('Zigbee is starting')) {
          this.log('[SOS] ⏰ Zigbee stack not ready, will retry in 30s...');
          this._iasRetryTimeout = setTimeout(() => {
            this.log('[SOS] 🔄 Retrying IAS Zone enrollment...');
            this.setupIasZone().catch(retryErr => {
              this.error('[SOS] ❌ Retry failed:', retryErr.message);
            });
          }, 30000);
        } else {
          this.log('[WARN] Proactive response failed (normal if device sleeping):', err.message);
        }
      }

      // v5.5.50: MULTI-METHOD IAS Zone listening for maximum reliability

      // Method 1: SDK3 property assignment (official method)
      endpoint.clusters.iasZone.onZoneStatusChangeNotification = (payload) => {
        this.log('[IAS-M1] 🆘 onZoneStatusChangeNotification:', JSON.stringify(payload));
        this._handleSOSAlarm(payload);
      };

      // Method 2: Attribute change listener via .on()
      if (typeof endpoint.clusters.iasZone.on === 'function') {
        endpoint.clusters.iasZone.on('attr.zoneStatus', (zoneStatus) => {
          this.log('[IAS-M2] 🆘 attr.zoneStatus:', zoneStatus);
          this._handleSOSAlarm({ zoneStatus });
        });

        endpoint.clusters.iasZone.on('zoneStatusChangeNotification', (payload) => {
          this.log('[IAS-M3] 🆘 zoneStatusChangeNotification event:', JSON.stringify(payload));
          this._handleSOSAlarm(payload);
        });
        this.log('[SOS-BUTTON] ✅ Multi-method IAS listeners registered');
      }

      // Method 3: SDK3 onZoneStatus property
      endpoint.clusters.iasZone.onZoneStatus = (zoneStatus) => {
        this.log('[IAS-M4] 🆘 onZoneStatus:', zoneStatus);
        this._handleSOSAlarm({ zoneStatus });
      };

      // v5.5.34: Listen for ZCL battery reports IF they arrive (passive only, no polling)
      if (endpoint?.clusters?.genPowerCfg) {
        endpoint.clusters.genPowerCfg.on('attr.batteryPercentageRemaining', async (value) => {
          const battery = Math.round(value / 2);
          this.log(`[ZCL-DATA] SOS_button.battery_zcl raw=${value} converted=${battery}%`);
          if (this.hasCapability('measure_battery')) {
            await this.setCapabilityValue('measure_battery', battery).catch(this.error);
          }
        });
        // v5.5.34: NO configureReporting - sleepy device won't respond
        // v5.5.34: NO readAttributes polling - causes timeout errors
        this.log('[SOS-BUTTON] ℹ️ ZCL battery listener passive (no polling)');
      }

      this.log('[OK] SOS Button IAS Zone configured - READY');

    } catch (err) {
      this.error('IAS Zone setup failed:', err);
    }
  }

  /**
   * v5.5.38: Proper cleanup on uninit (app restart/device removal)
   * Stops all timers to prevent "Missing Zigbee Node" errors
   */
  async onUninit() {
    this.log('[SOS-BUTTON] onUninit - cleaning up timers...');

    // Clear any battery polling interval
    if (this._batteryPollInterval) {
      this.homey.clearInterval(this._batteryPollInterval);
      this._batteryPollInterval = null;
    }

    // Clear any energy polling interval
    if (this._energyPollInterval) {
      this.homey.clearInterval(this._energyPollInterval);
      this._energyPollInterval = null;
    }

    // Clear IAS Zone retry timeout
    if (this._iasRetryTimeout) {
      this.homey.clearTimeout(this._iasRetryTimeout);
      this._iasRetryTimeout = null;
    }

    // Clear battery request timeout
    if (this._batteryRequestTimeout) {
      this.homey.clearTimeout(this._batteryRequestTimeout);
      this._batteryRequestTimeout = null;
    }

    // v5.5.54: Clear alarm reset timeout (from _handleSOSAlarm)
    if (this._alarmResetTimeout) {
      this.homey.clearTimeout(this._alarmResetTimeout);
      this._alarmResetTimeout = null;
    }

    // v5.5.54: Clear any battery wake refresh timers
    if (this._batteryWakeTimer) {
      this.homey.clearTimeout(this._batteryWakeTimer);
      this._batteryWakeTimer = null;
    }

    this.log('[SOS-BUTTON] ✅ All timers cleared');
  }

  async onDeleted() {
    this.log('SosEmergencyButtonDevice deleted');

    // Call onUninit for cleanup
    await this.onUninit();

    await super.onDeleted().catch(err => this.error(err));
  }
}

module.exports = SosEmergencyButtonDevice;
