'use strict';

const BaseHybridDevice = require('../../lib/devices/BaseHybridDevice');

/**
 * SOS Emergency Button Device - Enhanced
 *
 * Supported: TS0215A _TZ3000_0dumfk2z
 *
 * Protocol: IAS Zone for button press + Tuya DP or genPowerCfg for battery
 *
 * DP Mapping (from settings tuya_dp_configuration):
 * - DP 1: button_press
 * - DP 101: battery_percentage
 */
class SosEmergencyButtonDevice extends BaseHybridDevice {

  // Force battery powered
  get mainsPowered() { return false; }

  async onNodeInit({ zclNode }) {
    this.log('═══════════════════════════════════════════════════');
    this.log('[SOS-BUTTON] Initializing...');
    this.log('═══════════════════════════════════════════════════');

    // Initialize base (auto power detection + dynamic capabilities)
    await super.onNodeInit({ zclNode }).catch(err => this.error(err));

    // Parse DP configuration from settings
    this._parseDPConfiguration();

    // Setup IAS Zone for button press detection
    await this.setupIasZone();

    // Setup Tuya DP listener for battery
    await this._setupTuyaDPListener();

    this.log('[SOS-BUTTON] ✅ Initialized');
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
   * Handle incoming Tuya DP
   */
  _handleSOSDP(dpId, value) {
    const mapping = this.dpConfig[String(dpId)];
    this.log(`[SOS-BUTTON] 📊 DP${dpId} = ${value} (mapping: ${mapping || 'unknown'})`);

    if (mapping === 'button_press') {
      this.log('[SOS-BUTTON] 🆘 BUTTON PRESSED via DP!');
      this._triggerButtonPress();
    } else if (mapping === 'battery_percentage') {
      this._setBattery(value);
    } else {
      // Try default mappings
      if (dpId === 1) {
        this._triggerButtonPress();
      } else if (dpId === 101 || dpId === 15 || dpId === 4) {
        this._setBattery(value);
      }
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

    if (this.hasCapability('alarm_generic')) {
      this.setCapabilityValue('alarm_generic', true).catch(this.error);
      setTimeout(() => {
        this.setCapabilityValue('alarm_generic', false).catch(this.error);
      }, 5000);
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

      // Setup Zone Status Change listener (SDK3 property assignment)
      endpoint.clusters.iasZone.onZoneStatusChangeNotification = (payload) => {
        this.log('[ALARM] SOS BUTTON PRESSED!', payload);

        // Trigger flow card - v5.2.61: Use correct flow card ID
        this._triggerSOSPressed();

        // Update capability
        if (this.hasCapability('alarm_generic')) {
          this.setCapabilityValue('alarm_generic', true).catch(this.error);

          // Auto-reset after 5 seconds
          setTimeout(() => {
            this.setCapabilityValue('alarm_generic', false).catch(this.error);
          }, 5000);
        }
      };

      // Also setup attribute listener (SDK3 property assignment)
      endpoint.clusters.iasZone.onZoneStatus = (zoneStatus) => {
        this.log('[ALARM] SOS Zone Status Changed:', zoneStatus);
        this._triggerSOSPressed();
      };

      // Battery reporting
      if (endpoint?.clusters?.genPowerCfg) {
        endpoint.clusters.genPowerCfg.on('attr.batteryPercentageRemaining', async (value) => {
          const battery = value / 2;
          this.log('[BATTERY] Battery:', battery, '%');
          if (this.hasCapability('measure_battery')) {
            await (async () => {
              this.log(`📝 [DIAG] setCapabilityValue: ${'measure_battery'} = ${battery}`);
              try {
                await this.setCapabilityValue('measure_battery', battery);
                this.log(`✅ [DIAG] setCapabilityValue SUCCESS: ${'measure_battery'}`);
              } catch (err) {
                this.error(`❌ [DIAG] setCapabilityValue FAILED: ${'measure_battery'}`, err.message);
                throw err;
              }
            })().catch(this.error);
          }
        });

        // Configure battery reporting
        await this.configureAttributeReporting([
          { endpointId: 1, cluster: 1, attributeName: 'batteryPercentageRemaining', minInterval: 3600, maxInterval: 43200, minChange: 2 }
        ]).catch(err => this.log('Battery reporting config (non-critical):', err.message));
      }

      this.log('[OK] SOS Button IAS Zone configured - READY');

    } catch (err) {
      this.error('IAS Zone setup failed:', err);
    }
  }

  async onDeleted() {
    this.log('SosEmergencyButtonDevice deleted');

    // v5.1.0: Clear IAS Zone retry timeout
    if (this._iasRetryTimeout) {
      clearTimeout(this._iasRetryTimeout);
      this._iasRetryTimeout = null;
    }

    await super.onDeleted().catch(err => this.error(err));
  }
}

module.exports = SosEmergencyButtonDevice;
