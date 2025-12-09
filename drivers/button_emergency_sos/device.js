'use strict';

const { ZigBeeDevice } = require('homey-zigbeedriver');

/**
 * ╔══════════════════════════════════════════════════════════════════════════════╗
 * ║      SOS EMERGENCY BUTTON - v5.5.122 UNIVERSAL (ZCL + Tuya DP)               ║
 * ╠══════════════════════════════════════════════════════════════════════════════╣
 * ║                                                                              ║
 * ║  SUPPORTED PROTOCOLS:                                                        ║
 * ║  ┌─────────────┬──────────────┬────────────────────────────────┐             ║
 * ║  │ Model       │ Protocol     │ Event                          │             ║
 * ║  ├─────────────┼──────────────┼────────────────────────────────┤             ║
 * ║  │ TS0215A     │ IAS ACE      │ commandEmergency (cluster 1281)│             ║
 * ║  │ TS0218      │ IAS ACE      │ commandEmergency (cluster 1281)│             ║
 * ║  │ TS0601      │ Tuya DP      │ DP1/DP14 = true (cluster EF00) │             ║
 * ║  │ Any         │ IAS Zone     │ zoneStatusChange (cluster 1280)│             ║
 * ║  │ Any         │ genOnOff     │ on/off/toggle (cluster 6)      │             ║
 * ║  └─────────────┴──────────────┴────────────────────────────────┘             ║
 * ║                                                                              ║
 * ║  BATTERY:                                                                    ║
 * ║  - ZCL: powerConfiguration cluster (1) - batteryPercentageRemaining          ║
 * ║  - Tuya DP: DP4 or DP15 = battery percentage                                 ║
 * ║                                                                              ║
 * ║  Source: Tuya Developer Docs + Zigbee2MQTT converters                        ║
 * ║                                                                              ║
 * ╚══════════════════════════════════════════════════════════════════════════════╝
 */
class SosEmergencyButtonDevice extends ZigBeeDevice {

  async onNodeInit({ zclNode }) {
    this.log('');
    this.log('╔══════════════════════════════════════════════════════════════╗');
    this.log('║     SOS EMERGENCY BUTTON v5.5.122 - UNIVERSAL                ║');
    this.log('║   Supports: IAS ACE + IAS Zone + Tuya DP + genOnOff          ║');
    this.log('╚══════════════════════════════════════════════════════════════╝');

    this.zclNode = zclNode;

    // v5.5.120: Debug - show ALL available endpoints and clusters
    this._debugShowAllClusters();

    // v5.5.120: Setup GLOBAL listener for ALL traffic
    this._setupGlobalListeners();

    // Ensure capabilities
    await this._ensureCapabilities();

    // v5.5.121: Setup IAS ACE cluster - THIS IS THE MAIN FIX!
    // The TS0215A sends commandEmergency on ssIasAce (cluster 1281), NOT iasZone!
    await this._setupIasAce();

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

    // v5.5.122: Setup Tuya DP for TS0601 SOS buttons
    await this._setupTuyaDP();

    // Setup battery via ZCL powerConfiguration (passive only)
    await this._setupBattery();

    // v5.5.121: Setup heartbeat monitoring - detect "dead" device
    this._setupHeartbeatMonitor();

    this.log('[SOS] ✅ Device ready - Press button to test');
  }

  /**
   * v5.5.122: Setup Tuya DP for TS0601 SOS buttons
   * Some SOS buttons use Tuya cluster (0xEF00) instead of IAS ACE
   * DP mappings:
   * - DP 1: Button press (bool) - most common
   * - DP 14: SOS alarm (bool) - some variants
   * - DP 4: Battery level (value 0-100)
   * - DP 101: Battery (some variants)
   */
  async _setupTuyaDP() {
    const ep1 = this.zclNode?.endpoints?.[1];
    if (!ep1) return;

    // Find Tuya cluster (different names in SDK)
    const tuyaCluster = ep1.clusters?.tuya ||
      ep1.clusters?.manuSpecificTuya ||
      ep1.clusters?.['61184'] ||
      ep1.clusters?.['0xEF00'];

    if (!tuyaCluster) {
      this.log('[SOS] Tuya cluster not found (normal for ZCL-only devices)');
      return;
    }

    this.log('[SOS] ✅ Tuya cluster found! Setting up DP listeners...');

    // Listen for Tuya datapoint reports
    if (typeof tuyaCluster.on === 'function') {
      // Method 1: datapoint event
      tuyaCluster.on('datapoint', (dp, value, data) => {
        this.log(`[SOS] 🔧 Tuya DP${dp} received:`, value, data);
        this._handleTuyaDP(dp, value);
      });

      // Method 2: response event
      tuyaCluster.on('response', (status, transId, dp, dataType, data) => {
        this.log(`[SOS] 🔧 Tuya response DP${dp}:`, data);
        this._handleTuyaDP(dp, data);
      });

      // Method 3: reporting event
      tuyaCluster.on('reporting', (frame) => {
        this.log('[SOS] 🔧 Tuya reporting:', JSON.stringify(frame));
        if (frame?.data?.dp !== undefined) {
          this._handleTuyaDP(frame.data.dp, frame.data.value);
        }
      });

      this.log('[SOS] ✅ Tuya DP listeners registered');
    }

    // Also set onDataReport handler if available
    if (typeof tuyaCluster.onDataReport === 'undefined') {
      tuyaCluster.onDataReport = (data) => {
        this.log('[SOS] 🔧 Tuya onDataReport:', JSON.stringify(data));
        if (data?.dp !== undefined) {
          this._handleTuyaDP(data.dp, data.value);
        }
      };
    }
  }

  /**
   * v5.5.122: Handle Tuya DP values
   */
  _handleTuyaDP(dp, value) {
    this.log(`[SOS] Processing DP${dp}:`, value);

    // SOS button press DPs
    if (dp === 1 || dp === 14 || dp === 101) {
      // Boolean true = button pressed
      if (value === true || value === 1 || value === 'true') {
        this.log('[SOS] 🆘🆘🆘 Tuya DP SOS detected!');
        this._handleAlarm({ source: 'tuya-dp', dp, value });
      }
    }

    // Battery DPs
    if (dp === 4 || dp === 101 || dp === 15) {
      const battery = typeof value === 'number' ? value : parseInt(value, 10);
      if (battery >= 0 && battery <= 100) {
        this.log(`[SOS] 🔋 Tuya DP battery: ${battery}%`);
        if (this.hasCapability('measure_battery')) {
          this.setCapabilityValue('measure_battery', battery).catch(() => { });
        }
      }
    }
  }

  /**
   * v5.5.121: Monitor device heartbeat - warn if device seems dead
   */
  _setupHeartbeatMonitor() {
    // Track last activity
    this._lastActivity = Date.now();

    // Check every hour if device is still alive
    this._heartbeatInterval = this.homey.setInterval(() => {
      const hoursSinceActivity = (Date.now() - this._lastActivity) / (1000 * 60 * 60);

      if (hoursSinceActivity > 24) {
        this.log('[SOS] ⚠️ WARNING: Device has not communicated for', Math.round(hoursSinceActivity), 'hours!');
        this.log('[SOS] ⚠️ Device may need to be re-paired or battery is dead');

        // Set unavailable after 48 hours of no communication
        if (hoursSinceActivity > 48 && this.getAvailable()) {
          this.setUnavailable('Device not responding - please re-pair or check battery')
            .catch(() => { });
        }
      } else {
        this.log('[SOS] ❤️ Heartbeat OK - last activity:', Math.round(hoursSinceActivity), 'hours ago');
      }
    }, 60 * 60 * 1000); // Every hour

    this.log('[SOS] ✅ Heartbeat monitor started');
  }

  /**
   * v5.5.121: Update last activity timestamp
   */
  _updateActivity() {
    this._lastActivity = Date.now();

    // If device was unavailable, make it available again
    if (!this.getAvailable()) {
      this.setAvailable().catch(() => { });
      this.log('[SOS] ✅ Device is now available again');
    }
  }

  /**
   * v5.5.121: Setup IAS ACE cluster - THE MAIN FIX!
   * The TS0215A sends commandEmergency on ssIasAce (cluster 1281), NOT iasZone!
   * Source: Zigbee2MQTT TS0215A_sos converter
   */
  async _setupIasAce() {
    const ep1 = this.zclNode?.endpoints?.[1];
    if (!ep1) {
      this.error('[SOS] ❌ No endpoint 1 found!');
      return;
    }

    // Try multiple cluster names (Homey SDK uses different names)
    const iasAce = ep1.clusters?.iasAce ||
      ep1.clusters?.ssIasAce ||
      ep1.clusters?.['iasAce'] ||
      ep1.clusters?.['ssIasAce'];

    if (iasAce) {
      this.log('[SOS] ✅ IAS ACE cluster found! Setting up commandEmergency listener...');

      // Method 1: onEmergency handler
      if (typeof iasAce.onEmergency === 'undefined') {
        iasAce.onEmergency = () => {
          this.log('[SOS] 🆘🆘🆘 commandEmergency received via onEmergency!');
          this._handleAlarm({ source: 'iasAce-onEmergency' });
        };
        this.log('[SOS] ✅ onEmergency handler registered');
      }

      // Method 2: Command event listener
      if (typeof iasAce.on === 'function') {
        iasAce.on('command', (cmd, payload) => {
          this.log('[SOS] 🆘 IAS ACE command received:', cmd, JSON.stringify(payload));
          if (cmd === 'emergency' || cmd === 'commandEmergency' || cmd === 'Emergency') {
            this.log('[SOS] 🆘🆘🆘 EMERGENCY command detected!');
            this._handleAlarm({ source: 'iasAce-command', command: cmd });
          }
        });
        this.log('[SOS] ✅ IAS ACE command listener registered');
      }

      // Method 3: Specific emergency event
      if (typeof iasAce.on === 'function') {
        iasAce.on('emergency', (payload) => {
          this.log('[SOS] 🆘🆘🆘 emergency event received!', payload);
          this._handleAlarm({ source: 'iasAce-event' });
        });
      }

      // Bind the cluster
      try {
        await iasAce.bind();
        this.log('[SOS] ✅ IAS ACE cluster bound');
      } catch (e) {
        this.log('[SOS] IAS ACE bind (normal if already bound):', e.message);
      }

    } else {
      this.log('[SOS] ⚠️ IAS ACE cluster NOT found on endpoint 1');
      this.log('[SOS] ⚠️ Available clusters:', Object.keys(ep1.clusters || {}));
    }

    // Also try endpoint 2 (some devices use different endpoints)
    const ep2 = this.zclNode?.endpoints?.[2];
    if (ep2) {
      const iasAce2 = ep2.clusters?.iasAce || ep2.clusters?.ssIasAce;
      if (iasAce2) {
        this.log('[SOS] ✅ IAS ACE cluster also found on endpoint 2!');
        if (typeof iasAce2.on === 'function') {
          iasAce2.on('command', (cmd, payload) => {
            this.log('[SOS] 🆘 IAS ACE EP2 command:', cmd);
            if (cmd === 'emergency' || cmd === 'commandEmergency') {
              this._handleAlarm({ source: 'iasAce-ep2' });
            }
          });
        }
      }
    }
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
   * Handle alarm from IAS Zone/ACE
   * v5.5.121: Enhanced with heartbeat update
   */
  _handleAlarm(payload) {
    // v5.5.121: Update activity timestamp (heartbeat)
    this._updateActivity();

    // Debounce
    const now = Date.now();
    if (this._lastTrigger && (now - this._lastTrigger) < 2000) {
      this.log('[SOS] Debounced');
      return;
    }
    this._lastTrigger = now;

    this.log('[SOS] ════════════════════════════════════════');
    this.log('[SOS] 🆘 SOS BUTTON PRESSED!');
    this.log('[SOS] Payload:', JSON.stringify(payload));
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
    // Clean up timers
    if (this._resetTimeout) this.homey.clearTimeout(this._resetTimeout);
    if (this._heartbeatInterval) this.homey.clearInterval(this._heartbeatInterval);
  }

  async onDeleted() {
    await this.onUninit();
  }

  /**
   * v5.5.120: Debug - show ALL available endpoints and clusters
   */
  _debugShowAllClusters() {
    this.log('[SOS-DEBUG] ═══════════════════════════════════════════════════');
    this.log('[SOS-DEBUG] DEVICE CLUSTER MAP');
    this.log('[SOS-DEBUG] ═══════════════════════════════════════════════════');

    if (!this.zclNode?.endpoints) {
      this.log('[SOS-DEBUG] ❌ No endpoints found!');
      return;
    }

    for (const [epId, ep] of Object.entries(this.zclNode.endpoints)) {
      this.log(`[SOS-DEBUG] Endpoint ${epId}:`);

      if (!ep?.clusters) {
        this.log(`[SOS-DEBUG]   (no clusters)`);
        continue;
      }

      for (const [clusterName, cluster] of Object.entries(ep.clusters)) {
        const hasOn = typeof cluster?.on === 'function';
        const hasReadAttrs = typeof cluster?.readAttributes === 'function';
        this.log(`[SOS-DEBUG]   - ${clusterName} (on: ${hasOn}, read: ${hasReadAttrs})`);
      }
    }
    this.log('[SOS-DEBUG] ═══════════════════════════════════════════════════');
  }

  /**
   * v5.5.120: Setup GLOBAL listeners to capture ALL traffic from device
   */
  _setupGlobalListeners() {
    this.log('[SOS-DEBUG] Setting up GLOBAL listeners for ALL clusters...');

    if (!this.zclNode?.endpoints) return;

    for (const [epId, ep] of Object.entries(this.zclNode.endpoints)) {
      if (!ep?.clusters) continue;

      for (const [clusterName, cluster] of Object.entries(ep.clusters)) {
        if (typeof cluster?.on !== 'function') continue;

        // Listen for ALL events on this cluster
        cluster.on('attr', (attrName, value) => {
          this.log(`[SOS-GLOBAL] 📡 EP${epId}.${clusterName} ATTR: ${attrName} =`, value);
          // Auto-trigger alarm for any activity
          this._handleAlarm({ source: 'global-attr', cluster: clusterName, attr: attrName, value });
        });

        cluster.on('command', (cmd, payload) => {
          this.log(`[SOS-GLOBAL] 📡 EP${epId}.${clusterName} CMD: ${cmd}`, JSON.stringify(payload));
          this._handleAlarm({ source: 'global-cmd', cluster: clusterName, command: cmd, ...payload });
        });

        // Tuya cluster special handling
        if (clusterName === 'tuya' || clusterName.includes('EF00') || clusterName.includes('61184')) {
          this.log(`[SOS-DEBUG] 🔧 Tuya cluster found on EP${epId}!`);

          cluster.on('response', (cmd, data, payload) => {
            this.log(`[SOS-GLOBAL] 📡 Tuya response:`, cmd, data, payload);
            this._handleAlarm({ source: 'tuya', command: cmd, data, payload });
          });

          cluster.on('reporting', (data) => {
            this.log(`[SOS-GLOBAL] 📡 Tuya reporting:`, JSON.stringify(data));
            this._handleAlarm({ source: 'tuya-report', ...data });
          });

          cluster.on('datapoint', (dp, value) => {
            this.log(`[SOS-GLOBAL] 📡 Tuya DP${dp}:`, value);
            this._handleAlarm({ source: 'tuya-dp', dp, value });
          });
        }

        this.log(`[SOS-DEBUG] ✅ Global listeners on EP${epId}.${clusterName}`);
      }
    }

    this.log('[SOS-DEBUG] Global listeners setup complete');
  }
}

module.exports = SosEmergencyButtonDevice;
