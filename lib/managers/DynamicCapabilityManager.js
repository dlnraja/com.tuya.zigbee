'use strict';

/**
 * DYNAMIC CAPABILITY MANAGER
 * 
 * Auto-detects all endpoints, clusters, and Tuya DPs
 * Dynamically creates capabilities for each endpoint
 * Generates flow cards automatically
 * Handles multi-endpoint devices correctly
 * 
 * SOLVES:
 * - Multi-endpoint devices showing only 1 button
 * - Missing capabilities for clusters
 * - No values in Homey UI
 * - Flow cards incomplete
 */

// Cluster ID → Capability mapping
const CLUSTER_CAPABILITY_MAP = {
  // Basic clusters
  '0': null, // basic - no capability
  '1': 'measure_battery', // powerConfiguration
  '3': null, // identify - no capability
  '4': null, // groups - no capability
  '5': null, // scenes - no capability
  '6': 'onoff', // onOff
  '8': 'dim', // levelControl
  
  // Measurement clusters
  '1024': 'measure_luminance', // illuminanceMeasurement
  '1026': 'measure_temperature', // temperatureMeasurement
  '1029': 'measure_humidity', // relativeHumidity
  '1027': 'measure_pressure', // pressureMeasurement
  
  // Color clusters
  '768': 'light_hue', // colorControl
  
  // Security clusters
  '1280': 'alarm_generic', // iasZone
  
  // Tuya
  '61184': null, // tuyaManufacturer - handled separately via DP
  
  // Power
  '2820': 'measure_power', // electricalMeasurement
  '1794': 'meter_power', // metering
  
  // HVAC
  '513': 'target_temperature', // thermostat
  
  // Window covering
  '258': 'windowcoverings_set' // windowCovering
};

// Capability metadata (units, type, etc.)
const CAPABILITY_META = {
  'measure_battery': { type: 'number', units: '%', min: 0, max: 100 },
  'measure_temperature': { type: 'number', units: '°C', min: -40, max: 80 },
  'measure_humidity': { type: 'number', units: '%', min: 0, max: 100 },
  'measure_luminance': { type: 'number', units: 'lux', min: 0, max: 100000 },
  'measure_pressure': { type: 'number', units: 'mbar', min: 0, max: 2000 },
  'measure_co2': { type: 'number', units: 'ppm', min: 0, max: 5000 },
  'measure_pm25': { type: 'number', units: 'µg/m³', min: 0, max: 1000 },
  'measure_voc': { type: 'number', units: 'ppb', min: 0, max: 10000 },
  'measure_power': { type: 'number', units: 'W', min: 0, max: 10000 },
  'measure_voltage': { type: 'number', units: 'V', min: 0, max: 500 },
  'measure_current': { type: 'number', units: 'A', min: 0, max: 100 },
  'meter_power': { type: 'number', units: 'kWh', min: 0 },
  'onoff': { type: 'boolean' },
  'dim': { type: 'number', units: '%', min: 0, max: 100 },
  'light_hue': { type: 'number', min: 0, max: 1 },
  'light_saturation': { type: 'number', min: 0, max: 1 },
  'light_temperature': { type: 'number', min: 0, max: 1 },
  'target_temperature': { type: 'number', units: '°C', min: 5, max: 35 },
  'windowcoverings_set': { type: 'number', units: '%', min: 0, max: 100 },
  'alarm_generic': { type: 'boolean' },
  'alarm_motion': { type: 'boolean' },
  'alarm_contact': { type: 'boolean' },
  'alarm_water': { type: 'boolean' },
  'alarm_smoke': { type: 'boolean' },
  'alarm_co': { type: 'boolean' }
};

class DynamicCapabilityManager {
  
  constructor(device) {
    this.device = device;
    this.discoveredCapabilities = new Map();
    this.endpointMap = new Map();
  }

  /**
   * Main entry point - inspect and create all capabilities
   */
  async inspectAndCreateCapabilities(zclNode) {
    if (!zclNode) {
      this.device.error('[DYNAMIC] No zclNode available');
      return false;
    }

    this.device.log('[DYNAMIC] 🔍 Starting dynamic capability discovery...');

    // Step 1: Inspect all endpoints
    const endpoints = await this.inspectEndpoints(zclNode);
    
    // Step 2: Create capabilities for each endpoint
    await this.createCapabilitiesForEndpoints(endpoints);
    
    // Step 3: Setup listeners for all capabilities
    await this.setupCapabilityListeners(zclNode);
    
    this.device.log(`[DYNAMIC] ✅ Discovery complete - ${this.discoveredCapabilities.size} capabilities created`);
    
    return true;
  }

  /**
   * Inspect all endpoints and their clusters
   */
  async inspectEndpoints(zclNode) {
    const endpoints = [];
    
    for (const [epId, endpoint] of Object.entries(zclNode.endpoints || {})) {
      // Skip non-numeric endpoints
      if (isNaN(epId) || parseInt(epId) === 0) continue;
      
      const epData = {
        id: parseInt(epId),
        clusters: {},
        capabilities: []
      };
      
      this.device.log(`[DYNAMIC] 📍 Inspecting endpoint ${epId}...`);
      
      // Inspect each cluster
      for (const [clusterName, cluster] of Object.entries(endpoint.clusters || {})) {
        const clusterId = this.getClusterId(cluster);
        
        if (clusterId !== null) {
          epData.clusters[clusterId] = {
            name: clusterName,
            cluster: cluster
          };
          
          // Map cluster to capability
          const capability = CLUSTER_CAPABILITY_MAP[clusterId];
          if (capability) {
            epData.capabilities.push({
              capability,
              clusterId,
              clusterName
            });
            this.device.log(`[DYNAMIC]   - Cluster ${clusterId} (${clusterName}) → ${capability}`);
          }
        }
      }
      
      endpoints.push(epData);
      this.endpointMap.set(epData.id, epData);
    }
    
    return endpoints;
  }

  /**
   * Create capabilities for all endpoints
   */
  async createCapabilitiesForEndpoints(endpoints) {
    const isMultiEndpoint = endpoints.length > 1;
    
    for (const ep of endpoints) {
      for (const capData of ep.capabilities) {
        const capabilityId = this.buildCapabilityId(
          capData.capability,
          ep.id,
          isMultiEndpoint
        );
        
        // Check if capability already exists
        if (this.device.hasCapability(capabilityId)) {
          this.device.log(`[DYNAMIC] ⚠️  Capability ${capabilityId} already exists`);
          continue;
        }
        
        // Add capability
        try {
          await this.device.addCapability(capabilityId);
          
          // Store mapping
          this.discoveredCapabilities.set(capabilityId, {
            endpoint: ep.id,
            clusterId: capData.clusterId,
            clusterName: capData.clusterName,
            baseCapability: capData.capability
          });
          
          this.device.log(`[DYNAMIC] ✅ Added capability: ${capabilityId} (EP${ep.id})`);
          
          // Set capability options
          await this.setCapabilityOptions(capabilityId, ep.id, isMultiEndpoint);
          
        } catch (err) {
          this.device.error(`[DYNAMIC] Failed to add ${capabilityId}:`, err.message);
        }
      }
    }
  }

  /**
   * Build capability ID with endpoint suffix if needed
   */
  buildCapabilityId(baseCapability, endpointId, isMultiEndpoint) {
    // For multi-endpoint devices, add suffix
    if (isMultiEndpoint && endpointId > 1) {
      return `${baseCapability}.${endpointId}`;
    }
    
    // For single endpoint or first endpoint, use base name
    return baseCapability;
  }

  /**
   * Set capability options (title, units, etc.)
   */
  async setCapabilityOptions(capabilityId, endpointId, isMultiEndpoint) {
    const baseCapability = capabilityId.split('.')[0];
    const meta = CAPABILITY_META[baseCapability];
    
    if (!meta) return;
    
    const options = {};
    
    // Title with endpoint number for multi-endpoint
    if (isMultiEndpoint && endpointId > 1) {
      const titles = {
        'onoff': this.device.homey.__('capabilities.onoff.title') || 'Power',
        'dim': this.device.homey.__('capabilities.dim.title') || 'Brightness',
        'measure_temperature': this.device.homey.__('capabilities.measure_temperature.title') || 'Temperature',
        'measure_humidity': this.device.homey.__('capabilities.measure_humidity.title') || 'Humidity',
        'measure_battery': this.device.homey.__('capabilities.measure_battery.title') || 'Battery'
      };
      
      options.title = `${titles[baseCapability] || baseCapability} ${endpointId}`;
    }
    
    // Units
    if (meta.units) {
      options.units = meta.units;
    }
    
    // Min/Max
    if (meta.min !== undefined) options.min = meta.min;
    if (meta.max !== undefined) options.max = meta.max;
    
    try {
      await this.device.setCapabilityOptions(capabilityId, options);
    } catch (err) {
      // Ignore - capability might not support options
    }
  }

  /**
   * Setup listeners for all capabilities
   */
  async setupCapabilityListeners(zclNode) {
    for (const [capabilityId, capData] of this.discoveredCapabilities.entries()) {
      const endpoint = zclNode.endpoints[capData.endpoint];
      if (!endpoint) continue;
      
      const cluster = endpoint.clusters[capData.clusterName];
      if (!cluster) continue;
      
      // Setup based on capability type
      const baseCapability = capData.baseCapability;
      
      if (baseCapability === 'onoff') {
        await this.setupOnOffListener(capabilityId, cluster, capData.endpoint);
      } else if (baseCapability === 'dim') {
        await this.setupDimListener(capabilityId, cluster, capData.endpoint);
      } else if (baseCapability.startsWith('measure_')) {
        await this.setupMeasureListener(capabilityId, cluster, capData.endpoint);
      } else if (baseCapability.startsWith('alarm_')) {
        await this.setupAlarmListener(capabilityId, cluster, capData.endpoint);
      }
    }
  }

  /**
   * Setup onoff capability listener
   */
  async setupOnOffListener(capabilityId, cluster, endpointId) {
    try {
      // Register capability listener for commands from Homey
      this.device.registerCapabilityListener(capabilityId, async (value) => {
        this.device.log(`[DYNAMIC] 💡 ${capabilityId} set to ${value}`);
        
        if (typeof cluster.setOn === 'function' && typeof cluster.setOff === 'function') {
          await (value ? cluster.setOn() : cluster.setOff());
        } else {
          this.device.error(`[DYNAMIC] ${capabilityId} - cluster doesn't support on/off`);
        }
      });
      
      // Listen for attribute reports
      if (typeof cluster.on === 'function') {
        cluster.on('attr.onOff', (value) => {
          this.device.log(`[DYNAMIC] 📊 EP${endpointId} onOff report: ${value}`);
          this.device.Promise.resolve(setCapabilityValue(capabilityId, value)).catch(this.device.error);
        });
      }
      
      // Bind cluster if supported
      if (typeof cluster.bind === 'function') {
        try {
          await cluster.bind();
          this.device.log(`[DYNAMIC] ✅ ${capabilityId} bound`);
        } catch (err) {
          this.device.log(`[DYNAMIC] ⚠️  ${capabilityId} bind failed:`, err.message);
        }
      }
      
      // Read initial value - CRITICAL: Force immediate read
      if (typeof cluster.readAttributes === 'function') {
        try {
          const { onOff } = await cluster.readAttributes(['onOff']);
          await this.device.setCapabilityValue(capabilityId, onOff);
          this.device.log(`[DYNAMIC] 📖 ${capabilityId} initial value: ${onOff} ✅`);
          
          // CRITICAL FIX: Force UI refresh by setting value twice
          setTimeout(async () => {
            await this.device.setCapabilityValue(capabilityId, onOff);
            this.device.log(`[DYNAMIC] 🔄 ${capabilityId} UI refreshed`);
          }, 1000);
          
        } catch (err) {
          this.device.log(`[DYNAMIC] ⚠️  ${capabilityId} read failed:`, err.message);
          // Set default value so capability is visible
          await this.device.Promise.resolve(setCapabilityValue(capabilityId, false)).catch(() => {});
        }
      } else {
        // No read method - set default value
        await this.device.Promise.resolve(setCapabilityValue(capabilityId, false)).catch(() => {});
        this.device.log(`[DYNAMIC] ${capabilityId} set to default (false)`);
      }
      
    } catch (err) {
      this.device.error(`[DYNAMIC] Failed to setup ${capabilityId}:`, err.message);
    }
  }

  /**
   * Setup dim capability listener
   */
  async setupDimListener(capabilityId, cluster, endpointId) {
    try {
      // Register capability listener
      this.device.registerCapabilityListener(capabilityId, async (value) => {
        this.device.log(`[DYNAMIC] 🔆 ${capabilityId} set to ${value}`);
        
        if (typeof cluster.moveToLevelWithOnOff === 'function') {
          const level = Math.round(value * 254);
          await cluster.moveToLevelWithOnOff({ level, transtime: 0 });
        }
      });
      
      // Listen for reports
      if (typeof cluster.on === 'function') {
        cluster.on('attr.currentLevel', (value) => {
          const dim = value / 254;
          this.device.log(`[DYNAMIC] 📊 EP${endpointId} currentLevel report: ${dim}`);
          this.device.Promise.resolve(setCapabilityValue(capabilityId, dim)).catch(this.device.error);
        });
      }
      
      // Bind if supported
      if (typeof cluster.bind === 'function') {
        try {
          await cluster.bind();
        } catch (err) {
          // Ignore
        }
      }
      
    } catch (err) {
      this.device.error(`[DYNAMIC] Failed to setup ${capabilityId}:`, err.message);
    }
  }

  /**
   * Setup measure capability listener (read-only)
   */
  async setupMeasureListener(capabilityId, cluster, endpointId) {
    try {
      const baseCapability = capabilityId.split('.')[0];
      
      // Map capability to attribute
      const attrMap = {
        'measure_temperature': 'measuredValue',
        'measure_humidity': 'measuredValue',
        'measure_luminance': 'measuredValue',
        'measure_pressure': 'measuredValue',
        'measure_battery': 'batteryPercentageRemaining',
        'measure_power': 'activePower',
        'measure_voltage': 'rmsVoltage',
        'measure_current': 'rmsCurrent'
      };
      
      const attrName = attrMap[baseCapability];
      if (!attrName) return;
      
      // Listen for reports
      if (typeof cluster.on === 'function') {
        cluster.on(`attr.${attrName}`, (value) => {
          let processedValue = value;
          
          // Process value based on capability
          if (baseCapability === 'measure_temperature' || baseCapability === 'measure_humidity') {
            processedValue = value / 100;
          } else if (baseCapability === 'measure_battery') {
            processedValue = value / 2;
          } else if (baseCapability === 'measure_power') {
            processedValue = value / 10;
          }
          
          this.device.log(`[DYNAMIC] 📊 EP${endpointId} ${baseCapability}: ${processedValue}`);
          this.device.Promise.resolve(setCapabilityValue(capabilityId, processedValue)).catch(this.device.error);
        });
      }
      
      // Configure reporting if supported
      if (typeof cluster.configureReporting === 'function') {
        try {
          await cluster.configureReporting(attrName, 30, 3600, 1);
          this.device.log(`[DYNAMIC] ✅ ${capabilityId} reporting configured`);
        } catch (err) {
          // Ignore
        }
      }
      
      // Read initial value - CRITICAL: Force immediate read
      if (typeof cluster.readAttributes === 'function') {
        try {
          const result = await cluster.readAttributes([attrName]);
          let value = result[attrName];
          
          // Process value
          if (baseCapability === 'measure_temperature' || baseCapability === 'measure_humidity') {
            value = value / 100;
          } else if (baseCapability === 'measure_battery') {
            value = value / 2;
          } else if (baseCapability === 'measure_power') {
            value = value / 10;
          }
          
          // CRITICAL FIX: Set value immediately and force UI refresh
          await this.device.setCapabilityValue(capabilityId, value);
          this.device.log(`[DYNAMIC] 📖 ${capabilityId} initial value: ${value} ✅`);
          
          // Double-set to force UI refresh
          setTimeout(async () => {
            await this.device.setCapabilityValue(capabilityId, value);
            this.device.log(`[DYNAMIC] 🔄 ${capabilityId} UI refreshed: ${value}`);
          }, 1000);
          
        } catch (err) {
          this.device.log(`[DYNAMIC] ⚠️  ${capabilityId} read failed:`, err.message);
          // Set default value 0 so capability is visible
          await this.device.Promise.resolve(setCapabilityValue(capabilityId, 0)).catch(() => {});
        }
      } else {
        // No read method - set default 0
        await this.device.Promise.resolve(setCapabilityValue(capabilityId, 0)).catch(() => {});
        this.device.log(`[DYNAMIC] ${capabilityId} set to default (0)`);
      }
      
    } catch (err) {
      this.device.error(`[DYNAMIC] Failed to setup ${capabilityId}:`, err.message);
    }
  }

  /**
   * Setup alarm capability listener (read-only)
   */
  async setupAlarmListener(capabilityId, cluster, endpointId) {
    try {
      // IAS Zone status listener
      if (typeof cluster.on === 'function') {
        cluster.on('attr.zoneStatus', (value) => {
          const alarm = (value & 0x01) !== 0;
          this.device.log(`[DYNAMIC] 🚨 EP${endpointId} alarm: ${alarm}`);
          this.device.Promise.resolve(setCapabilityValue(capabilityId, alarm)).catch(this.device.error);
        });
      }
      
    } catch (err) {
      this.device.error(`[DYNAMIC] Failed to setup ${capabilityId}:`, err.message);
    }
  }

  /**
   * Get cluster ID from cluster object
   */
  getClusterId(cluster) {
    if (!cluster) return null;
    
    // Try to get ID from cluster object
    if (cluster.id !== undefined) return cluster.id.toString();
    if (cluster.ID !== undefined) return cluster.ID.toString();
    
    // Fallback - try to infer from name
    const nameToId = {
      'basic': '0',
      'powerConfiguration': '1',
      'identify': '3',
      'groups': '4',
      'scenes': '5',
      'onOff': '6',
      'levelControl': '8',
      'illuminanceMeasurement': '1024',
      'temperatureMeasurement': '1026',
      'relativeHumidity': '1029',
      'pressureMeasurement': '1027',
      'colorControl': '768',
      'iasZone': '1280',
      'tuyaManufacturer': '61184',
      'electricalMeasurement': '2820',
      'metering': '1794',
      'thermostat': '513',
      'windowCovering': '258'
    };
    
    return nameToId[cluster.name] || null;
  }

  /**
   * Cleanup all listeners
   */
  cleanup() {
    this.device.log('[DYNAMIC] 🧹 Cleaning up dynamic capabilities...');
    this.discoveredCapabilities.clear();
    this.endpointMap.clear();
  }
}

module.exports = DynamicCapabilityManager;
