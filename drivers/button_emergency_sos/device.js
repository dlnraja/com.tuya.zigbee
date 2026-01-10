'use strict';

const { ZigBeeDevice } = require('homey-zigbeedriver');

// v5.5.145: Import IAS ACE cluster and BoundCluster for TS0215A SOS button
// The BoundCluster receives commandEmergency from the device
let IasAceBoundCluster = null;
try {
  const iasAce = require('../../lib/clusters/IasAceCluster');
  IasAceBoundCluster = iasAce.IasAceBoundCluster;
  console.log('[SOS] ✅ IasAceBoundCluster loaded successfully');
} catch (e) {
  console.log('[SOS] IasAceCluster import skipped:', e.message);
}

/**
 * ╔══════════════════════════════════════════════════════════════════════════════╗
 * ║      SOS EMERGENCY BUTTON - v5.5.146 UNIVERSAL (ZCL + Tuya DP)               ║
 * ╠══════════════════════════════════════════════════════════════════════════════╣
 * ║                                                                              ║
 * ║  SUPPORTED PROTOCOLS:                                                        ║
 * ║  ┌─────────────┬──────────────┬────────────────────────────────────┐         ║
 * ║  │ Model       │ Protocol     │ Event                              │         ║
 * ║  ├─────────────┼──────────────┼────────────────────────────────────┤         ║
 * ║  │ TS0215A     │ IAS ACE      │ commandEmergency (cluster 1281)    │         ║
 * ║  │ TS0218      │ IAS ACE      │ commandEmergency (cluster 1281)    │         ║
 * ║  │ TS0601      │ Tuya DP      │ DP1/DP14 = true (cluster EF00)     │         ║
 * ║  │ Any         │ IAS Zone     │ zoneStatusChange (cluster 1280)    │         ║
 * ║  │ Any         │ genOnOff     │ on/off/toggle (cluster 6)          │         ║
 * ║  └─────────────┴──────────────┴────────────────────────────────────┘         ║
 * ║                                                                              ║
 * ║  BATTERY (v5.5.146 - Fixed):                                                 ║
 * ║  - ZCL: powerConfiguration cluster (1) - batteryPercentageRemaining          ║
 * ║  - Tuya DP4: battery percentage (0-100) - MOST COMMON                        ║
 * ║  - Tuya DP15: battery percentage (0-100) - some variants                     ║
 * ║  - CR2032: 3.0V=100%, 2.5V=50%, 2.0V=0%                                       ║
 * ║                                                                              ║
 * ║  Source: Tuya Developer Docs + Zigbee2MQTT converters                        ║
 * ║                                                                              ║
 * ╚══════════════════════════════════════════════════════════════════════════════╝
 */
class SosEmergencyButtonDevice extends ZigBeeDevice {

  async onNodeInit({ zclNode }) {
    this.log('');
    this.log('╔══════════════════════════════════════════════════════════════╗');
    this.log('║     SOS EMERGENCY BUTTON v5.5.146 - UNIVERSAL                ║');
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

    // Initialize alarm_generic to false
    if (this.hasCapability('alarm_generic')) {
      await this.setCapabilityValue('alarm_generic', false).catch(() => { });
    }

    // v5.5.64: Register capability with CLUSTER.IAS_ZONE for automatic flow triggers
    try {
      this.registerCapability('alarm_generic', 'iasZone', {
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
      this.log('[SOS] ✅ Registered alarm_generic with iasZone cluster');
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
   * v5.5.146: Handle Tuya DP values - FIXED battery/SOS conflict
   * BATTERY DPs (numeric 0-100): DP4, DP15
   * SOS DPs (boolean true): DP1, DP14
   * DP101 is context-dependent: boolean=SOS, number=battery
   */
  _handleTuyaDP(dp, value) {
    this.log(`[SOS] Processing DP${dp}:`, value, `(type: ${typeof value})`);

    // BATTERY DPs - check FIRST to avoid false SOS triggers
    // DP4 and DP15 are ALWAYS battery (numeric 0-100)
    if (dp === 4 || dp === 15) {
      const battery = typeof value === 'number' ? value : parseInt(value, 10);
      if (!isNaN(battery) && battery >= 0 && battery <= 100) {
        this.log(`[SOS] 🔋 Tuya DP${dp} battery: ${battery}%`);
        if (this.hasCapability('measure_battery')) {
          this.setCapabilityValue('measure_battery', parseFloat(battery)).catch(() => { });
        }
        return; // Don't process as SOS!
      }
    }

    // DP101: Context-dependent - numeric = battery, boolean = SOS
    if (dp === 101) {
      if (typeof value === 'number' && value >= 0 && value <= 100) {
        // Numeric value = battery percentage
        this.log(`[SOS] 🔋 Tuya DP101 battery: ${value}%`);
        if (this.hasCapability('measure_battery')) {
          this.setCapabilityValue('measure_battery', parseFloat(value)).catch(() => { });
        }
        return; // Don't process as SOS!
      }
      // Boolean true = SOS (fall through to SOS handling)
    }

    // SOS button press DPs: DP1, DP14, and DP101 (boolean only)
    if (dp === 1 || dp === 14 || dp === 101) {
      // Boolean true = button pressed
      if (value === true || value === 1 || value === 'true') {
        this.log('[SOS] 🆘🆘🆘 Tuya DP SOS detected!');
        this._handleAlarm({ source: 'tuya-dp', dp, value });

        // v5.5.146: Read battery when device is awake (button press wakes it)
        this.homey.setTimeout(() => this._readBatteryNow(), 200);
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
   * v5.5.145: Setup IAS ACE cluster - THE MAIN FIX!
   * The TS0215A sends commandEmergency on ssIasAce (cluster 1281 = 0x0501), NOT iasZone!
   * Source: Zigbee2MQTT TS0215A_sos converter
   * Debug: "Received Zigbee message from 'testbutton', type 'commandEmergency', cluster 'ssIasAce', data '{}'"
   *
   * CRITICAL: Uses BoundCluster to RECEIVE commands from the device!
   */
  async _setupIasAce() {
    const ep1 = this.zclNode?.endpoints?.[1];
    if (!ep1) {
      this.error('[SOS] ❌ No endpoint 1 found!');
      return;
    }

    // v5.5.145: Log ALL available clusters for debugging
    this.log('[SOS] 🔍 Searching for IAS ACE cluster (0x0501 = 1281)...');
    this.log('[SOS] 🔍 Available clusters on EP1:', Object.keys(ep1.clusters || {}));

    // METHOD 1: Use BoundCluster to receive commands (THE CORRECT WAY!)
    // This is how Zigbee2MQTT does it - bind the cluster to receive incoming commands
    if (IasAceBoundCluster && typeof ep1.bind === 'function') {
      try {
        this.log('[SOS] 🔗 Binding IasAceBoundCluster to receive emergency commands...');

        const boundCluster = new IasAceBoundCluster({
          onEmergency: () => {
            this.log('[SOS] 🆘🆘🆘 BOUND CLUSTER: commandEmergency received!');
            this._handleAlarm({ source: 'iasAce-bound-emergency' });
          },
          onFire: () => {
            this.log('[SOS] 🔥🔥🔥 BOUND CLUSTER: commandFire received!');
            this._handleAlarm({ source: 'iasAce-bound-fire' });
          },
          onPanic: () => {
            this.log('[SOS] 🚨🚨🚨 BOUND CLUSTER: commandPanic received!');
            this._handleAlarm({ source: 'iasAce-bound-panic' });
          }
        });

        // Bind to the iasAce cluster name
        ep1.bind('iasAce', boundCluster);
        this.log('[SOS] ✅ IasAceBoundCluster bound successfully on EP1!');

      } catch (e) {
        this.log('[SOS] ⚠️ BoundCluster bind failed:', e.message);
      }
    } else {
      this.log('[SOS] ⚠️ IasAceBoundCluster not available, using fallback listeners');
    }

    // METHOD 2: Try to find and setup listeners on existing cluster (fallback)
    const iasAce = ep1.clusters?.iasAce ||
      ep1.clusters?.iasACE ||
      ep1.clusters?.ssIasAce ||
      ep1.clusters?.['iasAce'] ||
      ep1.clusters?.['iasACE'] ||
      ep1.clusters?.['ssIasAce'] ||
      ep1.clusters?.['1281'] ||
      ep1.clusters?.[1281] ||
      ep1.clusters?.['0x0501'];

    if (iasAce) {
      this.log('[SOS] ✅ IAS ACE cluster found! Setting up additional listeners...');
      this._setupIasAceListeners(iasAce, 1);
    } else {
      this.log('[SOS] ⚠️ IAS ACE cluster NOT found by name on endpoint 1');

      // Try to find cluster by iterating and checking cluster ID
      for (const [name, cluster] of Object.entries(ep1.clusters || {})) {
        if (cluster?.ID === 1281 || cluster?.ID === 0x0501 || name.toLowerCase().includes('ace')) {
          this.log(`[SOS] ✅ Found IAS ACE cluster by ID scan: ${name} (ID: ${cluster?.ID})`);
          this._setupIasAceListeners(cluster, 1);
          break;
        }
      }
    }

    // METHOD 3: Also try endpoint 2 (some devices use different endpoints)
    const ep2 = this.zclNode?.endpoints?.[2];
    if (ep2?.clusters) {
      this.log('[SOS] 🔍 Checking endpoint 2...');

      // Try BoundCluster on EP2 too
      if (IasAceBoundCluster && typeof ep2.bind === 'function') {
        try {
          const boundCluster2 = new IasAceBoundCluster({
            onEmergency: () => {
              this.log('[SOS] 🆘🆘🆘 EP2 BOUND: commandEmergency received!');
              this._handleAlarm({ source: 'iasAce-bound-ep2-emergency' });
            },
            onFire: () => {
              this.log('[SOS] 🔥🔥🔥 EP2 BOUND: commandFire received!');
              this._handleAlarm({ source: 'iasAce-bound-ep2-fire' });
            },
            onPanic: () => {
              this.log('[SOS] 🚨🚨🚨 EP2 BOUND: commandPanic received!');
              this._handleAlarm({ source: 'iasAce-bound-ep2-panic' });
            }
          });
          ep2.bind('iasAce', boundCluster2);
          this.log('[SOS] ✅ IasAceBoundCluster bound on EP2!');
        } catch (e) {
          // Silent fail for EP2
        }
      }

      const iasAce2 = ep2.clusters?.iasAce || ep2.clusters?.iasACE || ep2.clusters?.ssIasAce;
      if (iasAce2) {
        this.log('[SOS] ✅ IAS ACE cluster also found on endpoint 2!');
        this._setupIasAceListeners(iasAce2, 2);
      }
    }
  }

  /**
   * v5.5.145: Setup all IAS ACE listeners on a cluster
   * Extracted to reuse for multiple endpoints
   *
   * IAS ACE Commands (from device to coordinator):
   * - 0x02: emergency (SOS button press)
   * - 0x03: fire
   * - 0x04: panic
   */
  _setupIasAceListeners(iasAce, epId) {
    this.log(`[SOS] Setting up IAS ACE listeners on EP${epId}...`);
    this.log(`[SOS] Cluster type: ${typeof iasAce}, has .on: ${typeof iasAce?.on === 'function'}`);

    // Method 1: Direct handler assignment (zigbee-clusters style)
    // The cluster calls these methods when it receives commands
    const emergencyHandler = () => {
      this.log(`[SOS] 🆘🆘🆘 EP${epId} EMERGENCY via handler!`);
      this._handleAlarm({ source: `iasAce-handler-EP${epId}` });
    };
    const panicHandler = () => {
      this.log(`[SOS] 🆘🆘🆘 EP${epId} PANIC via handler!`);
      this._handleAlarm({ source: `iasAce-panic-handler-EP${epId}` });
    };
    const fireHandler = () => {
      this.log(`[SOS] 🆘🆘🆘 EP${epId} FIRE via handler!`);
      this._handleAlarm({ source: `iasAce-fire-handler-EP${epId}` });
    };

    // Assign handlers to cluster
    iasAce.onEmergency = emergencyHandler;
    iasAce.onPanic = panicHandler;
    iasAce.onFire = fireHandler;
    this.log(`[SOS] ✅ EP${epId} Direct handlers assigned (onEmergency, onPanic, onFire)`);

    // Method 2: Event emitter style (if cluster supports .on())
    if (typeof iasAce.on === 'function') {
      // Catch-all command listener
      iasAce.on('command', (cmd, payload) => {
        this.log(`[SOS] 🆘 EP${epId} IAS ACE command:`, cmd, JSON.stringify(payload || {}));
        const cmdLower = (cmd || '').toString().toLowerCase();
        if (cmdLower.includes('emergency') || cmdLower.includes('panic') ||
          cmdLower.includes('fire') || cmdLower.includes('sos') || cmdLower === '02') {
          this.log(`[SOS] 🆘🆘🆘 EP${epId} ALARM command detected!`);
          this._handleAlarm({ source: `iasAce-command-EP${epId}`, command: cmd });
        }
      });

      // Specific event listeners
      ['emergency', 'panic', 'fire', 'commandEmergency', 'commandPanic', 'commandFire'].forEach(evt => {
        iasAce.on(evt, (payload) => {
          this.log(`[SOS] 🆘🆘🆘 EP${epId} '${evt}' event received!`, payload);
          this._handleAlarm({ source: `iasAce-${evt}-EP${epId}` });
        });
      });

      this.log(`[SOS] ✅ EP${epId} Event listeners registered`);
    }

    // Method 3: ZCL command handler (lower level)
    // This catches raw ZCL commands by command ID
    if (typeof iasAce.handleClusterSpecificCommand === 'undefined') {
      const originalHandler = iasAce.handleClusterSpecificCommand;
      iasAce.handleClusterSpecificCommand = (commandId, frame) => {
        this.log(`[SOS] 🆘 EP${epId} Raw cluster command ID: 0x${commandId.toString(16)}`, frame);

        // Command IDs for IAS ACE:
        // 0x02 = emergency, 0x03 = fire, 0x04 = panic
        if (commandId === 0x02 || commandId === 0x03 || commandId === 0x04) {
          const cmdName = commandId === 0x02 ? 'emergency' : (commandId === 0x03 ? 'fire' : 'panic');
          this.log(`[SOS] 🆘🆘🆘 EP${epId} RAW ${cmdName.toUpperCase()} command (0x${commandId.toString(16)})!`);
          this._handleAlarm({ source: `iasAce-raw-${cmdName}-EP${epId}`, commandId });
        }

        // Call original handler if exists
        if (typeof originalHandler === 'function') {
          return originalHandler.call(iasAce, commandId, frame);
        }
      };
      this.log(`[SOS] ✅ EP${epId} Raw command handler installed`);
    }

    // Method 4: Bind the cluster to ensure we receive reports
    if (typeof iasAce.bind === 'function') {
      iasAce.bind().then(() => {
        this.log(`[SOS] ✅ EP${epId} IAS ACE cluster bound`);
      }).catch((e) => {
        this.log(`[SOS] EP${epId} IAS ACE bind (normal if already bound):`, e.message);
      });
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
    const caps = ['alarm_generic', 'measure_battery'];
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
    this.setCapabilityValue('alarm_generic', true).catch(() => { });

    // Trigger flow card
    this._triggerFlow();

    // Auto-reset after 5s
    if (this._resetTimeout) clearTimeout(this._resetTimeout);
    this._resetTimeout = this.homey.setTimeout(() => {
      this.setCapabilityValue('alarm_generic', false).catch(() => { });
      this.log('[SOS] alarm_generic reset');
    }, 5000);

    // v5.5.137: Configure reporting AND read battery while device is awake
    // This is crucial - the device will go back to sleep in ~2 seconds!
    this._configureAndReadBattery();
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
   * v5.5.147: Trigger flow cards via driver (FIXED)
   */
  _triggerFlow() {
    this.log('[SOS] 📢 Triggering flow cards...');

    // v5.5.147: Use driver's triggerSOS method (properly registered)
    if (this.driver?.triggerSOS) {
      this.driver.triggerSOS(this, {}, {});
      this.log('[SOS] ✅ driver.triggerSOS() called');
    } else {
      this.log('[SOS] ⚠️ driver.triggerSOS not available, trying direct...');

      // Fallback: direct trigger
      try {
        const card = this.homey.flow.getDeviceTriggerCard('button_emergency_sos_pressed');
        if (card) {
          card.trigger(this, {}, {}).catch(e => this.log('[SOS] trigger error:', e.message));
          this.log('[SOS] ✅ button_emergency_sos_pressed triggered (direct)');
        }
      } catch (e) {
        this.log('[SOS] ⚠️ Direct trigger failed:', e.message);
      }
    }
  }

  /**
   * Setup battery via ZCL powerConfiguration
   * v5.5.138: ENHANCED - Multiple listener methods for 4-hour heartbeat capture
   * Tuya docs: Device reports battery every 4 hours via heartbeat
   * NO registerCapability/bind/configureReporting (causes errors on sleepy devices)
   */
  async _setupBattery() {
    const ep1 = this.zclNode?.endpoints?.[1];
    const powerCfg = ep1?.clusters?.powerConfiguration || ep1?.clusters?.genPowerCfg;

    if (!powerCfg) {
      this.log('[SOS] ℹ️ No powerConfiguration cluster');
      return;
    }

    this.log('[SOS] 🔋 Setting up battery listeners (Tuya 4h heartbeat)...');

    // Helper to update battery
    const updateBattery = (value, source) => {
      if (value === undefined || value === null || value === 255 || value === 0xff) return false;
      const percent = Math.round(value / 2);
      if (percent < 0 || percent > 100) return false;
      this.log(`[SOS] 🔋 Battery ${source}: ${percent}%`);
      this.setCapabilityValue('measure_battery', parseFloat(percent)).catch(() => { });
      this._updateActivity();
      return true;
    };

    // Helper to update from voltage - v5.5.146: Fixed formula for CR2032
    // CR2032: 3.0V=100%, 2.5V=50%, 2.0V=0% (linear mapping)
    const updateBatteryFromVoltage = (value, source) => {
      if (value === undefined || value === null || value === 0) return false;
      const voltage = value / 10; // ZCL reports in decivolts (30 = 3.0V)
      if (voltage < 1.5 || voltage > 4.5) return false;
      // CR2032: Map 2.0V-3.0V to 0-100%
      const percent = Math.min(100, Math.max(0, Math.round((voltage - 2.0) / 1.0 * 100)));
      this.log(`[SOS] 🔋 Battery ${source} (${voltage}V): ${percent}%`);
      this.setCapabilityValue('measure_battery', parseFloat(percent)).catch(() => { });
      this._updateActivity();
      return true;
    };

    // METHOD 1: Standard attr.* events (SDK default)
    if (typeof powerCfg.on === 'function') {
      powerCfg.on('attr.batteryPercentageRemaining', (v) => updateBattery(v, 'attr.%'));
      powerCfg.on('attr.batteryVoltage', (v) => updateBatteryFromVoltage(v, 'attr.V'));
      this.log('[SOS] ✅ Method 1: attr.* listeners');
    }

    // METHOD 2: Report event (for 4-hour heartbeat)
    if (typeof powerCfg.on === 'function') {
      powerCfg.on('report', (attrs) => {
        this.log('[SOS] 🔋 powerCfg REPORT received:', JSON.stringify(attrs));
        if (attrs?.batteryPercentageRemaining !== undefined) {
          updateBattery(attrs.batteryPercentageRemaining, 'report.%');
        }
        if (attrs?.batteryVoltage !== undefined) {
          updateBatteryFromVoltage(attrs.batteryVoltage, 'report.V');
        }
      });
      this.log('[SOS] ✅ Method 2: report listener (heartbeat)');
    }

    // METHOD 3: attributeReport callback (Homey specific)
    if (powerCfg.onAttributeReport === undefined) {
      powerCfg.onAttributeReport = (attrs) => {
        this.log('[SOS] 🔋 powerCfg attributeReport:', JSON.stringify(attrs));
        if (attrs?.batteryPercentageRemaining !== undefined) {
          updateBattery(attrs.batteryPercentageRemaining, 'attrReport.%');
        }
        if (attrs?.batteryVoltage !== undefined) {
          updateBatteryFromVoltage(attrs.batteryVoltage, 'attrReport.V');
        }
      };
      this.log('[SOS] ✅ Method 3: onAttributeReport callback');
    }

    // METHOD 4: Generic 'attr' event with attribute name
    if (typeof powerCfg.on === 'function') {
      powerCfg.on('attr', (name, value) => {
        this.log(`[SOS] 🔋 powerCfg attr: ${name} = ${value}`);
        if (name === 'batteryPercentageRemaining') updateBattery(value, 'attr.*');
        if (name === 'batteryVoltage') updateBatteryFromVoltage(value, 'attr.*');
      });
      this.log('[SOS] ✅ Method 4: generic attr listener');
    }

    this.log('[SOS] ✅ All battery listeners ready (waiting for 4h heartbeat or button press)');
  }

  /**
   * v5.5.138: Enhanced battery reading when device is awake
   * Try multiple attributes with quick timeout (device sleeps fast)
   */
  async _readBatteryNow() {
    try {
      const ep1 = this.zclNode?.endpoints?.[1];
      const powerCfg = ep1?.clusters?.powerConfiguration || ep1?.clusters?.genPowerCfg;

      if (!powerCfg?.readAttributes) {
        this.log('[SOS] 🔋 No readAttributes on powerCfg');
        return;
      }

      this.log('[SOS] 🔋 Reading battery while device is awake...');

      // Quick read with short timeout (device goes back to sleep in ~2s)
      const result = await Promise.race([
        powerCfg.readAttributes(['batteryPercentageRemaining', 'batteryVoltage']),
        new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout')), 1500))
      ]).catch((e) => {
        this.log('[SOS] 🔋 Read timeout (device sleeping):', e.message);
        return {};
      });

      this.log('[SOS] 🔋 Read result:', JSON.stringify(result));

      // Try percentage first
      if (result?.batteryPercentageRemaining !== undefined &&
        result.batteryPercentageRemaining !== 255 &&
        result.batteryPercentageRemaining !== 0xff) {
        const percent = Math.round(result.batteryPercentageRemaining / 2);
        if (percent >= 0 && percent <= 100) {
          this.log(`[SOS] 🔋 Battery: ${percent}%`);
          await this.setCapabilityValue('measure_battery', parseFloat(percent)).catch(() => { });
          return;
        }
      }

      // Fallback to voltage - v5.5.146: Fixed formula for CR2032
      if (result?.batteryVoltage !== undefined && result.batteryVoltage > 0) {
        const voltage = result.batteryVoltage / 10;
        // CR2032: Map 2.0V-3.0V to 0-100%
        const percent = Math.min(100, Math.max(0, Math.round((voltage - 2.0) / 1.0 * 100)));
        this.log(`[SOS] 🔋 Battery from voltage (${voltage}V): ${percent}%`);
        await this.setCapabilityValue('measure_battery', parseFloat(percent)).catch(() => { });
      }
    } catch (e) {
      this.log('[SOS] 🔋 Battery read error:', e.message);
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

  /**
   * v5.5.138: Called when sleepy device wakes up (End Device Announce)
   * THIS IS THE KEY MOMENT TO READ BATTERY!
   * The device is temporarily online and can respond to requests.
   */
  async onEndDeviceAnnounce() {
    this.log('[SOS] 📡 ════════════════════════════════════════');
    this.log('[SOS] 📡 END DEVICE ANNOUNCE - Device is AWAKE!');
    this.log('[SOS] 📡 ════════════════════════════════════════');

    // PERFECT moment to configure reporting and read battery!
    await this._configureAndReadBattery();
  }

  /**
   * v5.5.138: COMPREHENSIVE battery configuration when device is awake
   * Based on Zigbee2MQTT TS0215A implementation:
   * - Bind genPowerCfg cluster to coordinator
   * - Configure attribute reporting
   * - Read battery attributes
   */
  async _configureAndReadBattery() {
    // Debounce - only try once per wake cycle
    const now = Date.now();
    if (this._lastBatteryConfig && (now - this._lastBatteryConfig) < 5000) {
      return;
    }
    this._lastBatteryConfig = now;

    this.log('[SOS] 🔋 ════════════════════════════════════════');
    this.log('[SOS] 🔋 BATTERY CONFIGURATION - Device is AWAKE');
    this.log('[SOS] 🔋 ════════════════════════════════════════');

    const ep1 = this.zclNode?.endpoints?.[1];
    const powerCfg = ep1?.clusters?.powerConfiguration || ep1?.clusters?.genPowerCfg;

    if (!powerCfg) {
      this.log('[SOS] 🔋 ❌ No powerConfiguration cluster available');
      return;
    }

    // STEP 1: BIND - Critical for sleepy devices!
    // Zigbee2MQTT does: await reporting.bind(endpoint, coordinatorEndpoint, ['genPowerCfg']);
    if (!this._batteryBindComplete) {
      try {
        this.log('[SOS] 🔋 Step 1: Binding powerConfiguration cluster...');

        // Try bind via the cluster's bind method (if available)
        if (typeof powerCfg.bind === 'function') {
          await Promise.race([
            powerCfg.bind(),
            new Promise((_, r) => setTimeout(() => r(new Error('Bind timeout')), 2000))
          ]);
          this._batteryBindComplete = true;
          this.log('[SOS] 🔋 ✅ Bind successful!');
        } else {
          this.log('[SOS] 🔋 ℹ️ No bind() method, using driver.compose.json bindings');
          this._batteryBindComplete = true; // Assume bindings from manifest work
        }
      } catch (e) {
        this.log('[SOS] 🔋 ⚠️ Bind failed (normal for sleepy):', e.message);
      }
    }

    // STEP 2: CONFIGURE REPORTING
    if (!this._batteryReportingConfigured) {
      try {
        this.log('[SOS] 🔋 Step 2: Configuring attribute reporting...');

        // Method A: Direct configureReporting on cluster
        if (typeof powerCfg.configureReporting === 'function') {
          await Promise.race([
            powerCfg.configureReporting({
              batteryPercentageRemaining: {
                minInterval: 3600,   // 1 hour
                maxInterval: 14400,  // 4 hours (Tuya default heartbeat)
                minChange: 2         // 1% change (value 0-200)
              }
            }),
            new Promise((_, r) => setTimeout(() => r(new Error('ConfigReport timeout')), 2000))
          ]);
          this._batteryReportingConfigured = true;
          this.log('[SOS] 🔋 ✅ Reporting configured via cluster!');
        }
        // Method B: Use homey-zigbeedriver configureAttributeReporting
        else if (typeof this.configureAttributeReporting === 'function') {
          const { CLUSTER } = require('zigbee-clusters');
          await Promise.race([
            this.configureAttributeReporting([{
              endpointId: 1,
              cluster: CLUSTER.POWER_CONFIGURATION,
              attributeName: 'batteryPercentageRemaining',
              minInterval: 3600,
              maxInterval: 14400,
              minChange: 2
            }]),
            new Promise((_, r) => setTimeout(() => r(new Error('ConfigReport timeout')), 2000))
          ]);
          this._batteryReportingConfigured = true;
          this.log('[SOS] 🔋 ✅ Reporting configured via driver!');
        }
      } catch (e) {
        this.log('[SOS] 🔋 ⚠️ Configure reporting failed:', e.message);
      }
    }

    // STEP 3: READ BATTERY NOW (device is awake for ~2 seconds max!)
    this.log('[SOS] 🔋 Step 3: Reading battery attributes...');
    await this._readBatteryNow();

    this.log('[SOS] 🔋 ════════════════════════════════════════');
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
        this.log('[SOS-DEBUG]   (no clusters)');
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
   * v5.5.138: Setup GLOBAL listeners to capture ALL traffic from device
   * IMPORTANT: Also captures battery reports from 4-hour heartbeat!
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

          // v5.5.137: Handle battery attributes from ANY cluster
          if (attrName === 'batteryPercentageRemaining' && value !== 255 && value !== null) {
            const percent = Math.round(value / 2);
            if (percent >= 0 && percent <= 100) {
              this.log(`[SOS] 🔋 GLOBAL Battery: ${percent}%`);
              this.setCapabilityValue('measure_battery', parseFloat(percent)).catch(() => { });
            }
            return; // Don't trigger alarm for battery reports
          }
          if (attrName === 'batteryVoltage' && value > 0) {
            const voltage = value / 10;
            // CR2032: Map 2.0V-3.0V to 0-100%
            const percent = Math.min(100, Math.max(0, Math.round((voltage - 2.0) / 1.0 * 100)));
            this.log(`[SOS] 🔋 GLOBAL Battery (${voltage}V): ${percent}%`);
            this.setCapabilityValue('measure_battery', parseFloat(percent)).catch(() => { });
            return; // Don't trigger alarm for battery reports
          }

          // Trigger alarm for non-battery attributes (like zone status)
          this._handleAlarm({ source: 'global-attr', cluster: clusterName, attr: attrName, value });
        });

        // Listen for report events (4-hour heartbeat)
        cluster.on('report', (attrs) => {
          this.log(`[SOS-GLOBAL] 📡 EP${epId}.${clusterName} REPORT:`, JSON.stringify(attrs));
          if (attrs?.batteryPercentageRemaining !== undefined && attrs.batteryPercentageRemaining !== 255) {
            const percent = Math.round(attrs.batteryPercentageRemaining / 2);
            if (percent >= 0 && percent <= 100) {
              this.log(`[SOS] 🔋 HEARTBEAT Battery: ${percent}%`);
              this.setCapabilityValue('measure_battery', parseFloat(percent)).catch(() => { });
            }
          }
          if (attrs?.batteryVoltage !== undefined && attrs.batteryVoltage > 0) {
            const voltage = attrs.batteryVoltage / 10;
            // CR2032: Map 2.0V-3.0V to 0-100%
            const percent = Math.min(100, Math.max(0, Math.round((voltage - 2.0) / 1.0 * 100)));
            this.log(`[SOS] 🔋 HEARTBEAT Battery (${voltage}V): ${percent}%`);
            this.setCapabilityValue('measure_battery', parseFloat(percent)).catch(() => { });
          }
        });

        cluster.on('command', (cmd, payload) => {
          this.log(`[SOS-GLOBAL] 📡 EP${epId}.${clusterName} CMD: ${cmd}`, JSON.stringify(payload));
          this._handleAlarm({ source: 'global-cmd', cluster: clusterName, command: cmd, ...payload });
        });

        // Tuya cluster special handling
        if (clusterName === 'tuya' || clusterName.includes('EF00') || clusterName.includes('61184')) {
          this.log(`[SOS-DEBUG] 🔧 Tuya cluster found on EP${epId}!`);

          cluster.on('response', (cmd, data, payload) => {
            this.log('[SOS-GLOBAL] 📡 Tuya response:', cmd, data, payload);
            this._handleAlarm({ source: 'tuya', command: cmd, data, payload });
          });

          cluster.on('reporting', (data) => {
            this.log('[SOS-GLOBAL] 📡 Tuya reporting:', JSON.stringify(data));
            // Handle battery from Tuya DP4
            if (data?.dp === 4 && typeof data?.value === 'number') {
              const battery = data.value;
              if (battery >= 0 && battery <= 100) {
                this.log(`[SOS] 🔋 Tuya DP4 Battery: ${battery}%`);
                this.setCapabilityValue('measure_battery', parseFloat(battery)).catch(() => { });
              }
            }
            this._handleAlarm({ source: 'tuya-report', ...data });
          });

          cluster.on('datapoint', (dp, value) => {
            this.log(`[SOS-GLOBAL] 📡 Tuya DP${dp}:`, value, `(type: ${typeof value})`);
            // v5.5.146: Use _handleTuyaDP for proper battery/SOS separation
            this._handleTuyaDP(dp, value);
          });
        }

        this.log(`[SOS-DEBUG] ✅ Global listeners on EP${epId}.${clusterName}`);
      }
    }

    this.log('[SOS-DEBUG] Global listeners setup complete');
  }
}

module.exports = SosEmergencyButtonDevice;
