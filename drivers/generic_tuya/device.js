'use strict';

const { AutoAdaptiveDevice } = require('../../lib/dynamic');

/**
 * GENERIC TUYA DEVICE (TS0601) - v5.3.57
 *
 * Fallback driver for unknown Tuya TS0601 devices.
 * NOW USES AutoAdaptiveDevice for full auto-discovery!
 *
 * Features:
 * - Auto-discovery of Data Points (DPs)
 * - DYNAMIC capability creation from DPs
 * - DYNAMIC flow card registration
 * - Heuristic mapping of DPs to capabilities
 * - Passive listening (battery devices sleep)
 * - Default values to prevent null KPIs
 * - Self-learning: remembers discoveries across restarts
 *
 * Based on JohanBendz/com.tuya.zigbee analysis
 * Source: https://github.com/JohanBendz/com.tuya.zigbee
 */
class GenericTuyaDevice extends AutoAdaptiveDevice {

  async onNodeInit({ zclNode }) {
    this.log('');
    this.log('╔═══════════════════════════════════════════════════════════════════╗');
    this.log('║      GENERIC TUYA TS0601 - AUTO-ADAPTIVE v5.3.57                  ║');
    this.log('║      🔄 Dynamic Capability + Flow Card System                     ║');
    this.log('╚═══════════════════════════════════════════════════════════════════╝');

    // Mark as unknown device for special handling
    await this.setStoreValue('tuya_unknown', true).catch(() => { });
    await this.setStoreValue('discovery_mode', true).catch(() => { });

    // Initialize AutoAdaptiveDevice (handles Tuya EF00 + dynamic discovery)
    try {
      await super.onNodeInit({ zclNode }).catch(err => this.error('[GENERIC] Parent init error:', err));
    } catch (err) {
      this.error('[GENERIC] Await error:', err);
    }

    // Get device info
    const settings = this.getSettings() || {};
    const manufacturer = settings.zb_manufacturerName || 'unknown';
    const model = settings.zb_modelId || 'TS0601';

    this.log(`[GENERIC] Device: ${manufacturer} / ${model}`);
    this.log('[GENERIC] Mode: AUTO-ADAPTIVE + Dynamic Discovery');

    // Set default values to avoid null KPIs
    await this._setDefaultValues();

    // Legacy DP discovery (now handled by AutoAdaptiveDevice, but keep for compatibility)
    this._setupDPDiscovery();

    // Request common DPs after delay (for mains-powered devices)
    setTimeout(() => this._requestCommonDPs(), 5000);

    // Log auto-adaptive status
    const status = this.getAutoAdaptiveStatus();
    this.log('[GENERIC] 🔄 Auto-Adaptive Status:');
    this.log(`[GENERIC]    Discovered DPs: ${status.discoveries.length}`);
    this.log(`[GENERIC]    Capabilities: ${status.capabilities.join(', ')}`);

    this.log('[GENERIC] ✅ Initialization complete - auto-adapting to device data');
  }

  /**
   * Override: Handle device-specific DP processing
   */
  async _handleDeviceSpecificDP(dpId, value, mapping) {
    // Log discovery for unknown devices
    this.log(`[GENERIC] 📊 DP${dpId} → ${mapping.capability} = ${value}`);

    // Store discovery timestamp
    await this.setStoreValue(`dp_${dpId}_discovered`, Date.now()).catch(() => { });
  }

  /**
   * Set default capability values to prevent null KPIs in Insights
   */
  async _setDefaultValues() {
    this.log('[GENERIC] Setting default values for KPI...');

    const defaults = {
      'measure_battery': 100,  // Assume full until first report
      'measure_temperature': null,
      'measure_humidity': null,
      // SDK3: alarm_battery obsolète - utiliser measure_battery avec seuil
    };

    for (const [capability, defaultValue] of Object.entries(defaults)) {
      if (this.hasCapability(capability)) {
        const current = this.getCapabilityValue(capability);
        if (current === null || current === undefined) {
          await this.setCapabilityValue(capability, defaultValue).catch(() => { });
          this.log(`[GENERIC] Set default ${capability} = ${defaultValue}`);
        }
      }
    }
  }

  /**
   * Setup listener for DP discovery
   */
  _setupDPDiscovery() {
    this.log('[GENERIC] Setting up DP discovery listener...');

    // Track discovered DPs
    this._discoveredDPs = new Map();

    // Listen for Tuya DP reports
    this.on('tuya_dp', (data) => {
      this._handleDiscoveredDP(data);
    });

    // Also listen via dpReport event from TuyaEF00Manager
    if (this.tuyaEF00Manager) {
      this.tuyaEF00Manager.on('dpReport', (data) => {
        this._handleDiscoveredDP({
          dp: data.dpId,
          value: data.value,
          type: data.dpType
        });
      });
    }
  }

  /**
   * Handle discovered DP and auto-map to capabilities
   */
  async _handleDiscoveredDP(data) {
    const { dp, value, type } = data;

    this.log(`[GENERIC] 📦 Discovered DP${dp} = ${JSON.stringify(value)} (type: ${type})`);

    // Track the DP
    this._discoveredDPs.set(dp, {
      value,
      type,
      timestamp: Date.now(),
      count: (this._discoveredDPs.get(dp)?.count || 0) + 1
    });

    // Update settings with discovered DPs
    const dpList = Array.from(this._discoveredDPs.keys()).sort((a, b) => a - b);
    await this.setSettings({
      discovered_dps: dpList.length > 0 ? `DPs: ${dpList.join(', ')}` : 'None'
    }).catch(() => { });

    // Auto-map DP to capability using heuristics
    await this._autoMapDP(dp, value, type);
  }

  /**
   * Auto-map DP to Homey capability using heuristics
   * Based on Zigbee2MQTT tuya.ts and LocalTuya mappings
   *
   * CONFIDENCE LEVELS:
   * - 0 = Official (Z2M/ZHA documented)
   * - 1 = Community (forum confirmed)
   * - 2 = Heuristic (guessed from value range)
   */
  async _autoMapDP(dp, value, type) {
    // DP -> Capability mapping with confidence
    const DP_MAP = {
      // Battery (CONFIDENCE: 0 - Official)
      4: { capability: 'measure_battery', parser: v => Math.min(100, Math.max(0, v)), confidence: 0 },
      10: { capability: 'measure_battery', parser: v => Math.min(100, Math.max(0, v)), confidence: 1 },
      14: { capability: null, internal: 'battery_low', parser: v => !!v, confidence: 0 }, // SDK3: alarm_battery obsolète
      15: { capability: 'measure_battery', parser: v => Math.min(100, Math.max(0, v)), confidence: 0 },
      101: { capability: 'measure_battery', parser: v => Math.min(100, Math.max(0, v)), confidence: 1 },
      105: { capability: 'measure_battery', parser: v => Math.min(100, Math.max(0, v)), confidence: 1 },

      // Temperature (CONFIDENCE: 0)
      1: { capability: 'measure_temperature', parser: v => v / 10, confidence: 1 }, // Some devices
      3: { capability: 'measure_temperature', parser: v => v / 10, confidence: 0 }, // Soil sensor

      // Humidity (CONFIDENCE: 0)
      2: { capability: 'measure_humidity', parser: v => v, confidence: 0 },
      5: { capability: 'measure_humidity', parser: v => v, confidence: 0 }, // Soil moisture

      // Motion/Presence (CONFIDENCE: 0)
      1: { capability: 'alarm_motion', parser: v => !!v, confidence: 0 },

      // Voltage (CONFIDENCE: 1 - USB/Mains devices)
      247: { capability: 'measure_voltage', parser: v => v / 1000, confidence: 1 },
    };

    const mapping = DP_MAP[dp];
    if (!mapping) {
      this.log(`[GENERIC] ℹ️ Unknown DP${dp} - stored for analysis (CONFIDENCE: 2)`);
      await this.setStoreValue(`unknown_dp_${dp}`, { value, type, timestamp: Date.now() }).catch(() => { });
      return;
    }

    const { capability, parser, confidence } = mapping;
    const confidenceLabel = ['Official', 'Community', 'Heuristic'][confidence];

    // Add capability if missing
    if (!this.hasCapability(capability)) {
      this.log(`[GENERIC] ➕ Adding capability ${capability} (CONFIDENCE: ${confidence} - ${confidenceLabel})`);
      await this.addCapability(capability).catch(err => {
        this.error(`[GENERIC] Cannot add ${capability}:`, err.message);
        return;
      });
    }

    // Parse and set value
    try {
      const parsedValue = parser(value);
      await this.setCapabilityValue(capability, parsedValue);
      this.log(`[GENERIC] ✅ DP${dp} → ${capability} = ${parsedValue} (CONFIDENCE: ${confidence})`);

      // Emit event for flow triggers
      this.homey.flow.getTriggerCard(`generic_tuya_${capability}_changed`)?.trigger(this, {
        [capability.replace('measure_', '').replace('alarm_', '')]: parsedValue
      }).catch(() => { });

    } catch (err) {
      this.error(`[GENERIC] Failed to set ${capability}:`, err.message);
    }
  }

  /**
   * Request common DPs for device discovery
   * Only for mains-powered devices (battery devices will report on wake)
   */
  async _requestCommonDPs() {
    if (!this.tuyaEF00Manager) {
      this.log('[GENERIC] TuyaEF00Manager not available, skipping active DP requests');
      return;
    }

    // Common DPs to query
    const commonDPs = [1, 2, 3, 4, 5, 10, 14, 15, 101, 102, 247];

    this.log(`[GENERIC] 🔍 Requesting common DPs: [${commonDPs.join(', ')}]`);

    for (const dp of commonDPs) {
      try {
        await this.tuyaEF00Manager.requestDP(dp);
        await new Promise(resolve => setTimeout(resolve, 300)); // Space requests
      } catch (err) {
        // Timeout is normal for battery devices
        this.log(`[GENERIC] DP${dp} timeout (normal for battery devices)`);
      }
    }

    this.log('[GENERIC] ✅ DP discovery requests sent');
  }

  /**
   * Override onDeleted to cleanup
   */
  async onDeleted() {
    this.log('[GENERIC] Device deleted, cleaning up...');
    this._discoveredDPs?.clear();
    await super.onDeleted();
  }
}

module.exports = GenericTuyaDevice;
