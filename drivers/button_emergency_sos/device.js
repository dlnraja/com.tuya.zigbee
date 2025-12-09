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
    this.log('║         SOS EMERGENCY BUTTON v5.5.118 - SMART BATTERY          ║');
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

    // v5.5.112: Setup alternative clusters (some SOS use genOnOff or scenes)
    await this._setupAlternativeClusters();

    // Setup battery via ZCL powerConfiguration (passive only)
    await this._setupBattery();

    this.log('[SOS] ✅ Device ready - Press button to test');
  }

  /**
   * v5.5.112: Setup alternative clusters for SOS buttons that don't use IAS Zone
   * Some devices use genOnOff, scenes, or even Tuya cluster
   */
  async _setupAlternativeClusters() {
    const ep1 = this.zclNode?.endpoints?.[1];
    if (!ep1) return;

    // Method A: genOnOff cluster (some SOS buttons use this)
    const onOffCluster = ep1.clusters?.onOff || ep1.clusters?.genOnOff;
    if (onOffCluster) {
      this.log('[SOS] 📡 Setting up genOnOff listener...');

      if (typeof onOffCluster.on === 'function') {
        onOffCluster.on('command', (cmd, payload) => {
          this.log('[SOS] 🆘 genOnOff command:', cmd, payload);
          this._handleAlarm({ source: 'onOff', command: cmd });
        });
      }

      // Also listen for toggle/on/off commands
      ['on', 'off', 'toggle'].forEach(cmd => {
        const handler = onOffCluster[`on${cmd.charAt(0).toUpperCase() + cmd.slice(1)}`];
        if (typeof handler === 'function') {
          onOffCluster[`on${cmd.charAt(0).toUpperCase() + cmd.slice(1)}`] = () => {
            this.log(`[SOS] 🆘 genOnOff.${cmd} received`);
            this._handleAlarm({ source: 'onOff', command: cmd });
          };
        }
      });

      this.log('[SOS] ✅ genOnOff listeners configured');
    }

    // Method B: Scenes cluster (some Tuya buttons use scenes.recall)
    const scenesCluster = ep1.clusters?.scenes || ep1.clusters?.genScenes;
    if (scenesCluster) {
      this.log('[SOS] 📡 Setting up scenes listener...');

      if (typeof scenesCluster.on === 'function') {
        scenesCluster.on('command', (cmd, payload) => {
          this.log('[SOS] 🆘 Scenes command:', cmd, payload);
          if (cmd === 'recall' || cmd === 'recallScene') {
            this._handleAlarm({ source: 'scenes', sceneId: payload?.sceneId });
          }
        });
      }

      this.log('[SOS] ✅ Scenes listeners configured');
    }

    // Method C: Basic cluster attribute changes
    const basicCluster = ep1.clusters?.basic || ep1.clusters?.genBasic;
    if (basicCluster && typeof basicCluster.on === 'function') {
      basicCluster.on('attr', (attr, value) => {
        this.log('[SOS] Basic attr change:', attr, value);
      });
    }
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

    // v5.5.107: Track enrollment status
    this._enrollmentPending = true;

    // Proactive enrollment (will likely fail if device is sleeping)
    try {
      await iasZone.zoneEnrollResponse({ enrollResponseCode: 0, zoneId: 10 });
      this.log('[SOS] ✅ Proactive enrollment sent');
      this._enrollmentPending = false;
    } catch (e) {
      this.log('[SOS] Enrollment pending - will retry when device wakes up');
      // v5.5.107: NO automatic retry - will retry in _handleAlarm when device wakes
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

    // v5.5.112: Listen for ANY command on IAS Zone cluster
    if (typeof iasZone.on === 'function') {
      iasZone.on('command', (cmd, payload) => {
        this.log('[SOS] 🆘 IAS Zone command:', cmd, JSON.stringify(payload));
        this._handleAlarm({ source: 'iasCommand', command: cmd, ...payload });
      });
    }

    this.log('[SOS] ✅ IAS Zone listeners registered');
  }

  /**
   * Handle alarm from IAS Zone
   * v5.5.112: Enhanced with source tracking
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

    // v5.5.107: Device is AWAKE NOW - try enrollment if pending
    if (this._enrollmentPending) {
      this._tryEnrollmentNow();
    }

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
   * v5.5.107: Try enrollment when device is awake (just sent a notification)
   */
  async _tryEnrollmentNow() {
    try {
      const ep1 = this.zclNode?.endpoints?.[1];
      const iasZone = ep1?.clusters?.iasZone;
      if (!iasZone) return;

      this.log('[SOS] 🔄 Device awake - attempting enrollment...');
      await iasZone.zoneEnrollResponse({ enrollResponseCode: 0, zoneId: 10 });
      this.log('[SOS] ✅ Enrollment successful (device was awake)');
      this._enrollmentPending = false;
    } catch (e) {
      this.log('[SOS] Enrollment attempt failed:', e.message);
      // Keep _enrollmentPending = true for next wake
    }
  }

  /**
   * v5.5.111: Trigger flow cards - both driver-specific AND generic
   */
  _triggerFlow() {
    this.log('[SOS] 📢 Triggering flow cards...');

    // Driver-level trigger
    if (this.driver?.sosButtonPressedTrigger) {
      this.driver.sosButtonPressedTrigger.trigger(this, {}, {}).catch(() => { });
      this.log('[SOS] ✅ Driver trigger fired');
    }

    // Direct flow card - driver specific
    try {
      const card = this.homey.flow.getDeviceTriggerCard('button_emergency_sos_pressed');
      if (card) {
        card.trigger(this, {}, {}).catch(() => { });
        this.log('[SOS] ✅ button_emergency_sos_pressed triggered');
      }
    } catch (e) {
      this.log('[SOS] ⚠️ button_emergency_sos_pressed failed:', e.message);
    }

    // v5.5.111: Also trigger generic sos_button_pressed
    try {
      const genericCard = this.homey.flow.getDeviceTriggerCard('sos_button_pressed');
      if (genericCard) {
        genericCard.trigger(this, {}, {}).catch(() => { });
        this.log('[SOS] ✅ sos_button_pressed (generic) triggered');
      }
    } catch (e) {
      this.log('[SOS] ⚠️ sos_button_pressed failed:', e.message);
    }
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
   * v5.5.117: Enhanced battery reading for sleepy devices
   * - Only read when device is AWAKE (after button press)
   * - Debounce to avoid spamming
   * - Keep previous value if read fails (device went back to sleep)
   * - Timeout to prevent hanging
   */
  async _readBatteryNow() {
    // v5.5.117: Debounce - don't read too often (max once per minute)
    const now = Date.now();
    const lastRead = this._lastBatteryRead || 0;
    if (now - lastRead < 60000) {
      this.log('[SOS] 🔋 Battery read skipped (debounce) - keeping previous value');
      return;
    }
    this._lastBatteryRead = now;

    const currentBattery = this.getCapabilityValue('measure_battery');
    this.log(`[SOS] 🔋 Current battery: ${currentBattery}% - attempting refresh while awake...`);

    try {
      const ep1 = this.zclNode?.endpoints?.[1];
      const powerCfg = ep1?.clusters?.powerConfiguration || ep1?.clusters?.genPowerCfg;

      if (!powerCfg?.readAttributes) {
        this.log('[SOS] ℹ️ No powerConfiguration cluster - keeping previous value');
        return;
      }

      // v5.5.117: Add timeout to prevent hanging on sleepy device
      const readWithTimeout = async (attrs) => {
        return Promise.race([
          powerCfg.readAttributes(attrs),
          new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout')), 2000))
        ]);
      };

      // Strategy 1: Try batteryPercentageRemaining (standard)
      try {
        const result = await readWithTimeout(['batteryPercentageRemaining']);
        if (result?.batteryPercentageRemaining !== undefined && result.batteryPercentageRemaining !== 255) {
          const percent = Math.round(result.batteryPercentageRemaining / 2);
          this.log(`[SOS] 🔋 Battery UPDATED: ${currentBattery}% → ${percent}%`);
          await this.setCapabilityValue('measure_battery', percent).catch(() => { });
          return; // Success
        }
      } catch (e) {
        this.log('[SOS] batteryPercentageRemaining failed, trying voltage...');
      }

      // Strategy 2: Try batteryVoltage (fallback)
      try {
        const result = await readWithTimeout(['batteryVoltage']);
        if (result?.batteryVoltage !== undefined && result.batteryVoltage > 0) {
          // CR2450: 3.0V = 100%, 2.0V = 0%
          const voltage = result.batteryVoltage / 10;
          const percent = Math.min(100, Math.max(0, Math.round((voltage - 2.0) * 100)));
          this.log(`[SOS] 🔋 Battery UPDATED (from voltage): ${currentBattery}% → ${percent}%`);
          await this.setCapabilityValue('measure_battery', percent).catch(() => { });
          return; // Success
        }
      } catch (e) {
        this.log('[SOS] batteryVoltage also failed');
      }

      // Strategy 3: Read all available attributes (last resort)
      try {
        const allAttrs = await readWithTimeout(['batteryPercentageRemaining', 'batteryVoltage', 'batteryAlarmState']);
        this.log('[SOS] 🔋 All battery attrs:', JSON.stringify(allAttrs));

        if (allAttrs?.batteryPercentageRemaining !== undefined && allAttrs.batteryPercentageRemaining !== 255) {
          const percent = Math.round(allAttrs.batteryPercentageRemaining / 2);
          this.log(`[SOS] 🔋 Battery UPDATED (strategy 3): ${currentBattery}% → ${percent}%`);
          await this.setCapabilityValue('measure_battery', percent).catch(() => { });
        } else {
          this.log(`[SOS] 🔋 Read failed - KEEPING previous value: ${currentBattery}%`);
        }
      } catch (e) {
        // Device went back to sleep - keep previous value
        this.log(`[SOS] 🔋 Device sleeping - KEEPING previous value: ${currentBattery}%`);
      }
    } catch (e) {
      // Device might have gone back to sleep - keep previous value
      this.log(`[SOS] 🔋 Error - KEEPING previous value: ${this.getCapabilityValue('measure_battery')}%`);
    }
  }

  /**
   * v5.5.109: Handle settings changes for maintenance actions
   */
  async onSettings({ oldSettings, newSettings, changedKeys }) {
    this.log('[SOS] Settings changed:', changedKeys);

    // Maintenance: Force battery read
    if (changedKeys.includes('refresh_battery') && newSettings.refresh_battery) {
      this.log('[SOS] 🔋 Maintenance: Force battery read requested');

      // Reset the toggle after a short delay
      this.homey.setTimeout(async () => {
        await this.setSettings({ refresh_battery: false }).catch(() => { });
      }, 1000);

      // Try to read battery
      try {
        await this._readBatteryNow();
        this.log('[SOS] ✅ Battery read completed');
      } catch (e) {
        this.log('[SOS] ⚠️ Battery read failed (device may be sleeping):', e.message);
      }
    }

    // Maintenance: Re-enroll IAS Zone
    if (changedKeys.includes('re_enroll') && newSettings.re_enroll) {
      this.log('[SOS] 📋 Maintenance: Re-enroll IAS Zone requested');

      // Reset the toggle after a short delay
      this.homey.setTimeout(async () => {
        await this.setSettings({ re_enroll: false }).catch(() => { });
      }, 1000);

      // Try to enroll
      try {
        await this._tryEnrollmentNow();
        this.log('[SOS] ✅ Enrollment attempt completed');
      } catch (e) {
        this.log('[SOS] ⚠️ Enrollment failed (device may be sleeping):', e.message);
      }
    }
  }

  async onUninit() {
    if (this._resetTimeout) this.homey.clearTimeout(this._resetTimeout);
  }

  async onDeleted() {
    await this.onUninit();
  }
}

module.exports = SosEmergencyButtonDevice;
