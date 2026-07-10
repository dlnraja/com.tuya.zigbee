'use strict';

/**
 * CentralizedDPRegistry - v1.0.0
 * Single source of truth for all Tuya DataPoint mappings
 *
 * Features:
 * - Consolidated DP definitions from multiple sources
 * - Priority-based conflict resolution
 * - Device type grouping
 * - Runtime query and lookup
 * - Version tracking for DP definitions
 */
class CentralizedDPRegistry {
  constructor() {
    this._registry = new Map();       // dpId -> definition
    this._byDeviceType = new Map();   // deviceType -> dpId[]
    this._byCapability = new Map();   // capability -> dpId[]
    this._conflicts = new Map();      // Track resolved conflicts
    this._version = '1.0.0';

    this._initializeCoreDPs();
  }

  /**
   * Initialize core DP definitions
   * @private
   */
  _initializeCoreDPs() {
    // ════════════════════════════════════════════════════════════════════════════════
    // SWITCH / RELAY DPs
    // ════════════════════════════════════════════════════════════════════════════════

    this.register({
      dpId: 1,
      name: 'on_off',
      capability: 'onoff',
      type: 1, // boolean
      deviceTypes: ['switch', 'plug', 'light', 'relay'],
      description: 'Main on/off control',
      priority: 100, // High priority
      source: 'core'
    });

    this.register({
      dpId: 2,
      name: 'mode',
      capability: null,
      type: 4, // enum
      deviceTypes: ['switch', 'dimmer'],
      description: 'Operating mode',
      valueMap: { 0: 'manual', 1: 'auto' },
      priority: 50,
      source: 'core'
    });

    // ════════════════════════════════════════════════════════════════════════════════
    // DIMMER DPs
    // ════════════════════════════════════════════════════════════════════════════════

    this.register({
      dpId: 3,
      name: 'bright_value',
      capability: 'dim',
      type: 2, // value
      deviceTypes: ['dimmer', 'light'],
      description: 'Brightness level (0-1000 -> 0-1)',
      scale: 1000,
      min: 0,
      max: 1,
      priority: 100,
      source: 'core'
    });

    // ════════════════════════════════════════════════════════════════════════════════
    // COLOR DPs
    // ════════════════════════════════════════════════════════════════════════════════

    this.register({
      dpId: 5,
      name: 'color_data',
      capability: null,
      type: 0, // raw
      deviceTypes: ['light_rgb', 'light_rgbw'],
      description: 'Color data (HS or RGB)',
      parser: 'parseColorData',
      priority: 100,
      source: 'core'
    });

    this.register({
      dpId: 6,
      name: 'color_temp',
      capability: 'light_temperature',
      type: 2, // value
      deviceTypes: ['light_tunable', 'light_rgbw'],
      description: 'Color temperature (0-1000 -> 0-1)',
      scale: 1000,
      min: 0,
      max: 1,
      priority: 100,
      source: 'core'
    });

    // ════════════════════════════════════════════════════════════════════════════════
    // SENSOR DPs
    // ════════════════════════════════════════════════════════════════════════════════

    this.register({
      dpId: 1,
      name: 'temp_current',
      capability: 'measure_temperature',
      type: 2, // value
      deviceTypes: ['temperature_sensor', 'climate_sensor'],
      description: 'Current temperature (scale: 10)',
      scale: 10,
      unit: '°C',
      priority: 100,
      source: 'core'
    });

    this.register({
      dpId: 2,
      name: 'humidity_current',
      capability: 'measure_humidity',
      type: 2, // value
      deviceTypes: ['humidity_sensor', 'climate_sensor'],
      description: 'Current humidity (scale: 10)',
      scale: 10,
      unit: '%',
      priority: 100,
      source: 'core'
    });

    this.register({
      dpId: 4,
      name: 'battery_percentage',
      capability: 'measure_battery',
      type: 2, // value
      deviceTypes: ['sensor', 'lock', 'remote'],
      description: 'Battery percentage',
      unit: '%',
      min: 0,
      max: 100,
      priority: 100,
      source: 'core'
    });

    this.register({
      dpId: 12,
      name: 'pir_status',
      capability: 'alarm_motion',
      type: 1, // boolean
      deviceTypes: ['motion_sensor', 'presence_sensor'],
      description: 'Motion detection',
      priority: 100,
      source: 'core'
    });

    this.register({
      dpId: 1,
      name: 'doorcontact_state',
      capability: 'alarm_contact',
      type: 1, // boolean
      deviceTypes: ['contact_sensor', 'door_sensor', 'window_sensor'],
      description: 'Door/window contact state',
      priority: 100,
      source: 'core'
    });

    // ════════════════════════════════════════════════════════════════════════════════
    // COVER / BLIND DPs
    // ════════════════════════════════════════════════════════════════════════════════

    this.register({
      dpId: 2,
      name: 'position',
      capability: 'windowcoverings_set',
      type: 2, // value
      deviceTypes: ['cover', 'blind', 'curtain'],
      description: 'Cover position (0=closed, 100=open)',
      min: 0,
      max: 100,
      priority: 100,
      source: 'core'
    });

    this.register({
      dpId: 1,
      name: 'control',
      capability: null,
      type: 4, // enum
      deviceTypes: ['cover', 'blind', 'curtain'],
      description: 'Motor control command',
      valueMap: { 0: 'open', 1: 'stop', 2: 'close' },
      writable: true,
      priority: 100,
      source: 'core'
    });

    // ════════════════════════════════════════════════════════════════════════════════
    // THERMOSTAT DPs
    // ════════════════════════════════════════════════════════════════════════════════

    this.register({
      dpId: 16,
      name: 'temp_set',
      capability: 'target_temperature',
      type: 2, // value
      deviceTypes: ['thermostat', 'trv'],
      description: 'Target temperature (scale: 10)',
      scale: 10,
      min: 5,
      max: 35,
      unit: '°C',
      priority: 100,
      source: 'core'
    });

    this.register({
      dpId: 24,
      name: 'temp_current',
      capability: 'measure_temperature',
      type: 2, // value
      deviceTypes: ['thermostat', 'trv'],
      description: 'Current temperature (scale: 10)',
      scale: 10,
      unit: '°C',
      priority: 90,
      source: 'core'
    });

    this.register({
      dpId: 35,
      name: 'battery_percentage',
      capability: 'measure_battery',
      type: 2, // value
      deviceTypes: ['thermostat', 'trv'],
      description: 'Battery percentage',
      unit: '%',
      min: 0,
      max: 100,
      priority: 100,
      source: 'core'
    });

    this.register({
      dpId: 40,
      name: 'child_lock',
      capability: 'child_lock',
      type: 1, // boolean
      deviceTypes: ['thermostat', 'trv'],
      description: 'Child lock',
      priority: 80,
      source: 'core'
    });

    // ════════════════════════════════════════════════════════════════════════════════
    // POWER MONITORING DPs
    // ════════════════════════════════════════════════════════════════════════════════

    this.register({
      dpId: 6,
      name: 'cur_power',
      capability: 'measure_power',
      type: 2, // value
      deviceTypes: ['plug_energy', 'switch_energy'],
      description: 'Current power consumption (W)',
      scale: 10,
      unit: 'W',
      priority: 100,
      source: 'core'
    });

    this.register({
      dpId: 17,
      name: 'add_ele',
      capability: 'meter_power',
      type: 2, // value
      deviceTypes: ['plug_energy', 'switch_energy'],
      description: 'Total energy consumption (kWh)',
      scale: 100,
      unit: 'kWh',
      priority: 100,
      source: 'core'
    });

    // ════════════════════════════════════════════════════════════════════════════════
    // TIME SYNC DPs
    // ════════════════════════════════════════════════════════════════════════════════

    this.register({
      dpId: 0x67,
      name: 'time_sync',
      capability: null,
      type: 0, // raw
      deviceTypes: ['thermostat', 'trv', 'switch'],
      description: 'Time synchronization',
      parser: 'parseTimeSync',
      writable: true,
      priority: 50,
      source: 'core'
    });

    // ════════════════════════════════════════════════════════════════════════════════
    // MULTI-GANG SWITCH DPs
    // ════════════════════════════════════════════════════════════════════════════════

    // Gang 1 (standard)
    this.register({
      dpId: 1,
      name: 'switch_1',
      capability: 'onoff',
      type: 1,
      deviceTypes: ['multi_switch'],
      description: 'Gang 1 on/off',
      gang: 1,
      priority: 100,
      source: 'core'
    });

    this.register({
      dpId: 2,
      name: 'switch_2',
      capability: 'onoff.2',
      type: 1,
      deviceTypes: ['multi_switch'],
      description: 'Gang 2 on/off',
      gang: 2,
      priority: 100,
      source: 'core'
    });

    this.register({
      dpId: 3,
      name: 'switch_3',
      capability: 'onoff.3',
      type: 1,
      deviceTypes: ['multi_switch'],
      description: 'Gang 3 on/off',
      gang: 3,
      priority: 100,
      source: 'core'
    });

    this.register({
      dpId: 4,
      name: 'switch_4',
      capability: 'onoff.4',
      type: 1,
      deviceTypes: ['multi_switch'],
      description: 'Gang 4 on/off',
      gang: 4,
      priority: 100,
      source: 'core'
    });
  }

  /**
   * Register a DP definition
   * @param {Object} definition - DP definition
   * @returns {boolean} True if registered, false if conflict resolved
   */
  register(definition) {
    const { dpId, deviceTypes = [] } = definition;

    // Store in main registry
    const existing = this._registry.get(dpId);
    if (existing) {
      // Conflict resolution: higher priority wins
      if (definition.priority > (existing.priority || 0)) {
        this._conflicts.set(dpId, {
          winner: definition,
          loser: existing,
          timestamp: Date.now()
        });
        this._registry.set(dpId, definition);
      } else {
        this._conflicts.set(dpId, {
          winner: existing,
          loser: definition,
          timestamp: Date.now()
        });
        return false; // Existing wins
      }
    } else {
      this._registry.set(dpId, definition);
    }

    // Index by device type
    for (const deviceType of deviceTypes) {
      if (!this._byDeviceType.has(deviceType)) {
        this._byDeviceType.set(deviceType, []);
      }
      const dpIds = this._byDeviceType.get(deviceType);
      if (!dpIds.includes(dpId)) {
        dpIds.push(dpId);
      }
    }

    // Index by capability
    if (definition.capability) {
      if (!this._byCapability.has(definition.capability)) {
        this._byCapability.set(definition.capability, []);
      }
      const dpIds = this._byCapability.get(definition.capability);
      if (!dpIds.includes(dpId)) {
        dpIds.push(dpId);
      }
    }

    return true;
  }

  /**
   * Get DP definition by ID
   * @param {number} dpId - DataPoint ID
   * @returns {Object|null} DP definition
   */
  get(dpId) {
    return this._registry.get(dpId) || null;
  }

  /**
   * Get all DPs for a device type
   * @param {string} deviceType - Device type
   * @returns {Object[]} Array of DP definitions
   */
  getByDeviceType(deviceType) {
    const dpIds = this._byDeviceType.get(deviceType) || [];
    return dpIds.map(id => this._registry.get(id)).filter(Boolean);
  }

  /**
   * Get DP ID for a capability
   * @param {string} capability - Capability name
   * @returns {number|null} DP ID
   */
  getDPForCapability(capability) {
    const dpIds = this._byCapability.get(capability) || [];
    return dpIds.length > 0 ? dpIds[0] : null;
  }

  /**
   * Get all DPs for a capability (may be multiple for multi-gang)
   * @param {string} capability - Capability name
   * @returns {Object[]} Array of DP definitions
   */
  getAllDPsForCapability(capability) {
    const dpIds = this._byCapability.get(capability) || [];
    return dpIds.map(id => this._registry.get(id)).filter(Boolean);
  }

  /**
   * Check if a DP is registered
   * @param {number} dpId - DataPoint ID
   * @returns {boolean} True if registered
   */
  has(dpId) {
    return this._registry.has(dpId);
  }

  /**
   * Get all registered DP IDs
   * @returns {number[]} Array of DP IDs
   */
  getAllDPIds() {
    return [...this._registry.keys()];
  }

  /**
   * Get all registered device types
   * @returns {string[]} Array of device types
   */
  getAllDeviceTypes() {
    return [...this._byDeviceType.keys()];
  }

  /**
   * Get conflict history
   * @returns {Object[]} Array of resolved conflicts
   */
  getConflicts() {
    return [...this._conflicts.entries()].map(([dpId, conflict]) => ({
      dpId,
      winner: conflict.winner,
      loser: conflict.loser,
      timestamp: conflict.timestamp
    }));
  }

  /**
   * Get registry statistics
   * @returns {Object} Statistics
   */
  getStats() {
    const stats = {
      totalDPs: this._registry.size,
      byDeviceType: {},
      byCapability: {},
      conflicts: this._conflicts.size,
      version: this._version
    };

    for (const [deviceType, dpIds] of this._byDeviceType) {
      stats.byDeviceType[deviceType] = dpIds.length;
    }

    for (const [capability, dpIds] of this._byCapability) {
      stats.byCapability[capability] = dpIds.length;
    }

    return stats;
  }

  /**
   * Export registry as JSON
   * @returns {Object} Serialized registry
   */
  export() {
    const data = {
      version: this._version,
      timestamp: Date.now(),
      dps: {},
      deviceTypes: {},
      capabilities: {}
    };

    for (const [dpId, def] of this._registry) {
      data.dps[dpId] = def;
    }

    for (const [deviceType, dpIds] of this._byDeviceType) {
      data.deviceTypes[deviceType] = dpIds;
    }

    for (const [capability, dpIds] of this._byCapability) {
      data.capabilities[capability] = dpIds;
    }

    return data;
  }

  /**
   * Import registry from JSON
   * @param {Object} data - Serialized registry
   */
  import(data) {
    if (!data || !data.dps) {
      throw new Error('Invalid registry data');
    }

    // Clear existing
    this._registry.clear();
    this._byDeviceType.clear();
    this._byCapability.clear();
    this._conflicts.clear();

    // Import
    for (const [dpId, def] of Object.entries(data.dps)) {
      this.register({ ...def, dpId: Number(dpId) });
    }

    this._version = data.version || this._version;
  }
}

module.exports = CentralizedDPRegistry;
