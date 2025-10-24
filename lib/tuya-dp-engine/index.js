'use strict';

/**
 * Tuya DP Engine
 * Universal Data Point interpretation engine
 */

const fs = require('fs');
const path = require('path');

class TuyaDPEngine {
  constructor(device) {
    this.device = device;
    this.profile = null;
    this.fingerprint = null;
    this.converters = {};
    this.dpCache = new Map();
    
    // Load configuration
    this.loadConfiguration();
  }

  /**
   * Load configuration files
   */
  loadConfiguration() {
    try {
      const basePath = __dirname;
      
      // Load fingerprints
      this.fingerprints = JSON.parse(
        fs.readFileSync(path.join(basePath, 'fingerprints.json'), 'utf8')
      ).fingerprints;
      
      // Load profiles
      this.profiles = JSON.parse(
        fs.readFileSync(path.join(basePath, 'profiles.json'), 'utf8')
      ).profiles;
      
      // Load capability map
      this.capabilityMap = JSON.parse(
        fs.readFileSync(path.join(basePath, 'capability-map.json'), 'utf8')
      ).capabilities;
      
      this.device.log('DP Engine configuration loaded');
    } catch (err) {
      this.device.error('Failed to load DP Engine configuration:', err);
    }
  }

  /**
   * Initialize engine for device
   */
  async initialize() {
    try {
      // Detect device fingerprint
      await this.detectFingerprint().catch(err => this.error(err));
      
      // Load profile
      if (this.fingerprint && this.fingerprint.profile) {
        this.profile = this.profiles[this.fingerprint.profile];
        
        if (this.profile) {
          this.device.log('Loaded profile:', this.fingerprint.profile);
          
          // Setup capabilities
          await this.setupCapabilities().catch(err => this.error(err));
          
          // Setup DP listeners
          await this.setupDPListeners().catch(err => this.error(err));
          
          return true;
        }
      }
      
      this.device.log('No profile found, using fallback');
      return false;
      
    } catch (err) {
      this.device.error('Failed to initialize DP Engine:', err);
      return false;
    }
  }

  /**
   * Detect device fingerprint
   */
  async detectFingerprint() {
    try {
      // Get manufacturer ID from device
      const manufacturerId = await this.getManufacturerId().catch(err => this.error(err));
      
      if (!manufacturerId) {
        this.device.log('No manufacturer ID found');
        return null;
      }
      
      // Look up fingerprint
      this.fingerprint = this.fingerprints[manufacturerId];
      
      if (this.fingerprint) {
        this.device.log('Detected fingerprint:', manufacturerId);
        this.device.log('Profile:', this.fingerprint.profile);
        return this.fingerprint;
      }
      
      // Try fallback matching
      const prefix = manufacturerId.substring(0, 8);
      this.device.log('Trying fallback for prefix:', prefix);
      
      return null;
    } catch (err) {
      this.device.error('Failed to detect fingerprint:', err);
      return null;
    }
  }

  /**
   * Get manufacturer ID from device
   */
  async getManufacturerId() {
    try {
      if (this.device.zclNode && this.device.zclNode.endpoints[1]) {
        const basic = this.device.zclNode.endpoints[1].clusters.basic;
        if (basic) {
          const attrs = await basic.readAttributes(['manufacturerName']).catch(err => this.error(err));
          return attrs.manufacturerName;
        }
      }
      return null;
    } catch (err) {
      this.device.error('Failed to get manufacturer ID:', err);
      return null;
    }
  }

  /**
   * Setup capabilities based on profile
   */
  async setupCapabilities() {
    if (!this.profile || !this.profile.capabilities) {
      return;
    }
    
    for (const capability of this.profile.capabilities) {
      try {
        if (!this.device.hasCapability(capability)) {
          await this.device.addCapability(capability).catch(err => this.error(err));
          this.device.log('Added capability:', capability);
        }
        
        // Setup capability listener
        await this.setupCapabilityListener(capability).catch(err => this.error(err));
        
      } catch (err) {
        this.device.error(`Failed to setup capability ${capability}:`, err);
      }
    }
  }

  /**
   * Setup capability listener
   */
  async setupCapabilityListener(capability) {
    const dpConfig = this.profile.dp_mapping && this.profile.dp_mapping[capability];
    
    if (!dpConfig) {
      return;
    }
    
    // Register capability listener
    this.device.registerCapabilityListener(capability, async (value) => {
      return await this.setCapability(capability, value).catch(err => this.error(err));
    });
  }

  /**
   * Setup DP listeners
   */
  async setupDPListeners() {
    // Listen for DP reports
    if (this.device.zclNode && this.device.zclNode.endpoints[1]) {
      // Listen to Tuya cluster (0xEF00)
      // This would be implemented in the actual driver
      this.device.log('DP listeners ready');
    }
  }

  /**
   * Set capability value (Homey → Device)
   */
  async setCapability(capability, value) {
    try {
      const dpConfig = this.profile.dp_mapping && this.profile.dp_mapping[capability];
      
      if (!dpConfig) {
        this.device.log(`No DP mapping for capability: ${capability}`);
        return;
      }
      
      // Get converter
      const converter = this.getConverter(dpConfig.converter || capability);
      
      // Convert value
      const dpValue = converter.toDevice(value, dpConfig);
      
      // Send to device
      await this.sendDP(dpConfig.dp, dpValue, dpConfig.type).catch(err => this.error(err));
      
      this.device.log(`Set ${capability} to ${value} (DP${dpConfig.dp}=${dpValue})`);
      
    } catch (err) {
      this.device.error(`Failed to set capability ${capability}:`, err);
      throw err;
    }
  }

  /**
   * Handle DP report (Device → Homey)
   */
  async handleDPReport(dp, value, type) {
    try {
      // Find capability for this DP
      const capability = this.findCapabilityForDP(dp);
      
      if (!capability) {
        this.device.log(`No capability mapped to DP${dp}`);
        return;
      }
      
      const dpConfig = this.profile.dp_mapping[capability];
      
      // Get converter
      const converter = this.getConverter(dpConfig.converter || capability);
      
      // Convert value
      const homeyValue = converter.toHomey(value, dpConfig);
      
      // Update capability
      await this.device.setCapabilityValue(capability, homeyValue).catch(err => this.error(err));
      
      this.device.log(`DP${dp} → ${capability}: ${homeyValue}`);
      
    } catch (err) {
      this.device.error(`Failed to handle DP${dp} report:`, err);
    }
  }

  /**
   * Find capability for DP number
   */
  findCapabilityForDP(dp) {
    if (!this.profile || !this.profile.dp_mapping) {
      return null;
    }
    
    for (const [capability, config] of Object.entries(this.profile.dp_mapping)) {
      if (config.dp === dp) {
        return capability;
      }
    }
    
    return null;
  }

  /**
   * Get converter by name
   */
  getConverter(converterName) {
    // Check cache
    if (this.converters[converterName]) {
      return this.converters[converterName];
    }
    
    // Load converter
    try {
      const converterPath = path.join(__dirname, 'converters', `${converterName}.js`);
      this.converters[converterName] = require(converterPath);
      return this.converters[converterName];
    } catch (err) {
      // Fallback to passthrough converter
      this.device.log(`Converter ${converterName} not found, using passthrough`);
      return {
        toHomey: (v) => v,
        toDevice: (v) => v
      };
    }
  }

  /**
   * Send DP to device (stub - implement in driver)
   */
  async sendDP(dp, value, type) {
    // This would be implemented in the actual driver
    // using the Tuya cluster write
    this.device.log(`Sending DP${dp} = ${value} (${type})`);
  }
}

module.exports = TuyaDPEngine;
