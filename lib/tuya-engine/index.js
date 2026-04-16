'use strict';

/**
 * TUYA DP ENGINE - Production Ready
 * 
 * Moteur universel pour devices Tuya (TS0601 et autres)
 * Architecture:
 * - fingerprints.json: manufacturer+model → profile
 * - profiles.json: profile → capabilities + dpMap + options
 * - converters/: DP ↔ capability transformations
 * - traits/: Logic réutilisable par capability
 */

const fingerprints = require('./fingerprints.json');
const profiles = require('./profiles.json');
const converters = require('./converters');
const traits = require('./traits');

class TuyaEngine {
  /**
   * Get profile for device based on fingerprint
   */
  static async getProfile(zclNode) {
    const { manufacturerName, modelId } = zclNode;
    
    // Chercher fingerprint (case-insensitive)
    const mfrLower = (manufacturerName || '').toLowerCase();
    const modelLower = (modelId || '').toLowerCase();
    const fingerprint = fingerprints.find(fp => 
      (fp.manufacturerName || '').toLowerCase() === mfrLower &&
      (fp.modelId || '').toLowerCase() === modelLower
    );
    
    if (!fingerprint) {
      return null;
    }
    
    // Récupérer profile
    const profile = profiles[fingerprint.profile];
    if (!profile) {
      throw new Error(`Profile ${fingerprint.profile} not found in profiles.json`);
    }
    
    return {
      ...profile,
      profileId: fingerprint.profile,
      endpoint: fingerprint.endpoints[0] || 1
    };
  }

  /**
   * Apply traits to device based on profile
   */
  static async applyTraits(device, zclNode, profile) {
    const endpoint = zclNode.endpoints[profile.endpoint];
    if (!endpoint) {
      throw new Error(`Endpoint ${profile.endpoint} not found on device`);
    }

    device.log(`📋 Applying profile: ${profile.profileId}`);
    device.log(`[DATA] Capabilities: ${profile.capabilities.join(', ')}`);

    // Apply each capability trait
    for (const capability of profile.capabilities) {
      const traitName = this._getTraitName(capability);
      const Trait = traits[traitName];
      
      if (!Trait) {
        device.log(`[WARN]  No trait for capability: ${capability}`);
        continue;
      }

      try {
        const context = {
          endpoint,
          dpMap: profile.dpMap || {},
          options: profile.options || {},
          converters,
          logger: device.logger || device
        };
        
        await Trait(device, context).catch(err => this.error(err));
        
        device.log(`[OK] Trait applied: ${traitName} (${capability})`);
      } catch (err) {
        device.error(`[ERROR] Failed to apply trait ${traitName}:`, err);
      }
    }
    
    device.log('[OK] Profile applied successfully');
  }

  /**
   * Get trait name from capability
   * measure_temperature → Temperature
   * alarm_motion → Motion
   * onoff → OnOff
   */
  static _getTraitName(capability) {
    const parts = capability.split('_');
    return parts.map(p => p.charAt(0).toUpperCase() + p.slice(1)).join('');
  }

  /**
   * Discover compatible devices on network
   */
  static async discover(homey) {
    const devices = [];
    
    try {
      // Scan Zigbee network
      const nodes = await homey.zigbee.getNodes().catch(err => this.error(err));
      
      for (const node of nodes) {
        try {
          const profile = await this.getProfile(node).catch(err => this.error(err));
          if (profile) {
            devices.push({
              name: `${profile.name || node.modelId} (${node.ieeeAddress.slice(-8)})`,
              data: {
                ieeeAddress: node.ieeeAddress
              },
              profile: profile.profileId
            });
          }
        } catch (err) {
          // Device not supported or error, skip
        }
      }
    } catch (err) {
      throw new Error(`Failed to discover devices: ${err.message}`);
    }
    
    return devices;
  }

  /**
   * Get converter for capability
   */
  static getConverter(capability) {
    const converterName = this._getTraitName(capability);
    return converters[converterName] || converters[capability] || null;
  }

  /**
   * Register a new fingerprint (runtime)
   */
  static registerFingerprint(manufacturerName, modelId, profileId, endpoints = [1]) {
    fingerprints.push({
      manufacturerName,
      modelId,
      endpoints,
      profile: profileId
    });
  }

  /**
   * Register a new profile (runtime)
   */
  static registerProfile(profileId, capabilities, dpMap = {}, options = {}) {
    profiles[profileId] = {
      capabilities,
      dpMap,
      options
    };
  }
}

module.exports = TuyaEngine;
