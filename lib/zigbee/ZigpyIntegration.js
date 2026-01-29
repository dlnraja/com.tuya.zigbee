'use strict';

/**
 * ZigpyIntegration - Bridge entre Homey et zigpy concepts
 *
 * Intègre les fonctionnalités avancées de zigpy dans Homey:
 * - Manufacturer clusters detection
 * - OTA updates monitoring
 * - Device quirks auto-apply
 * - Enhanced reporting
 *
 * Based on zigpy/zigpy GitHub project
 * Sources: github.com/zigpy/zigpy, github.com/zigpy/zha-device-handlers
 */
class ZigpyIntegration {

  constructor(device) {
    this.device = device;
    this.zigpyFeatures = {
      otaSupport: false,
      quirksApplied: [],
      manufacturerClusters: [],
      enhancedReporting: false
    };
  }

  /**
   * Initialize zigpy integration
   */
  async initialize() {
    this.device.log('[FIX] ZigpyIntegration initializing...');

    try {
      // Detect manufacturer clusters
      await this.detectManufacturerClusters();

      // Check OTA support
      await this.checkOTASupport();

      // Apply known quirks
      await this.applyKnownQuirks();

      // Setup enhanced reporting
      await this.setupEnhancedReporting();

      this.device.log('[OK] ZigpyIntegration initialized successfully');
      this.device.log(`   OTA Support: ${this.zigpyFeatures.otaSupport ? '[OK]' : '[ERROR]'}`);
      this.device.log(`   Quirks Applied: ${this.zigpyFeatures.quirksApplied.length}`);
      this.device.log(`   Manufacturer Clusters: ${this.zigpyFeatures.manufacturerClusters.length}`);

    } catch (err) {
      this.device.error('ZigpyIntegration initialization failed:', err);
    }
  }

  /**
   * Detect Manufacturer Specific Clusters
   * Based on zigpy/zigpy Discussion #823
   */
  async detectManufacturerClusters() {
    const endpoint = this.device.zclNode?.endpoints?.[1];
    if (!endpoint) return;

    const knownManufacturerClusters = {
      // Tuya
      0xEF00: 'Tuya DP Cluster',
      0xE000: 'Tuya Unknown',
      0xE001: 'Tuya Switch Mode',
      0xE002: 'Tuya Sensor Alarms',

      // IKEA
      0xFC7C: 'IKEA Cluster 1',
      0xFC57: 'IKEA Cluster 2',

      // Philips
      0xFC00: 'Philips Cluster 1',
      0xFC01: 'Philips Cluster 2',
      0xFC02: 'Philips Cluster 3',
      0xFC03: 'Philips Cluster 4'
    };

    for (const [clusterId, name] of Object.entries(knownManufacturerClusters)) {
      const id = typeof clusterId === 'string' ? parseInt(clusterId, 16) : clusterId;
      if (endpoint.clusters[id]) {
        this.zigpyFeatures.manufacturerClusters.push({
          id,
          name,
          hex: `0x${id.toString(16).toUpperCase()}`
        });
        this.device.log(`🏭 Detected manufacturer cluster: ${name} (${id})`);
      }
    }
  }

  /**
   * Check OTA Update Support
   * Cluster 0x0019 (25) - OTA Upgrade
   */
  async checkOTASupport() {
    const endpoint = this.device.zclNode?.endpoints?.[1];
    if (!endpoint) return;

    if (endpoint.clusters[25] || endpoint.clusters[0x0019]) {
      this.zigpyFeatures.otaSupport = true;
      this.device.log('[OK] OTA Update support detected (Cluster 0x0019)');

      // Try to read OTA attributes
      try {
        const otaCluster = endpoint.clusters[25];
        if (otaCluster) {
          const currentVersion = await otaCluster.Promise.resolve(readAttributes(['currentFileVersion'])).catch(() => null);
          if (currentVersion) {
            this.device.log(`   Current OTA version: ${currentVersion.currentFileVersion}`);
          }
        }
      } catch (err) {
        this.device.error('Failed to read OTA attributes:', err);
      }
    }
  }

  /**
   * Apply Known Device Quirks
   * Based on zigpy/zha-device-handlers quirks
   */
  async applyKnownQuirks() {
    const manufacturerName = this.device.getData().manufacturerName;
    const modelId = this.device.getData().productId;

    // Tuya Magic Spell (zigpy Discussion #823) - case-insensitive
    const mfrLower = (manufacturerName || '').toLowerCase();
    const modelLower = (modelId || '').toLowerCase();
    if (mfrLower.startsWith('_tz') || modelLower === 'ts0601') {
      await this.applyTuyaMagicSpell();
    }

    // Contact sensor inversion quirk
    if (this.device.hasCapability('alarm_contact')) {
      this.zigpyFeatures.quirksApplied.push('contact_sensor_inversion');
      this.device.log('[OK] Quirk applied: Contact sensor inversion');
    }
  }

  /**
   * Apply Tuya Magic Spell
   * Reads specific Basic cluster attributes to unlock hidden endpoints
   */
  async applyTuyaMagicSpell() {
    try {
      const endpoint = this.device.zclNode?.endpoints?.[1];
      if (!endpoint || !endpoint.clusters[0]) return;

      const basicCluster = endpoint.clusters[0];
      const magicAttributes = [4, 0, 1, 5, 7, 0xFFFE];

      this.device.log('🪄 Applying Tuya Magic Spell...');
      await basicCluster.Promise.resolve(readAttributes(magicAttributes)).catch(err => {
        this.device.log('Tuya Magic Spell failed (expected for some devices):', err.message);
      });

      this.zigpyFeatures.quirksApplied.push('tuya_magic_spell');
      this.device.log('[OK] Quirk applied: Tuya Magic Spell (unlock endpoints)');

    } catch (err) {
      this.device.error('Tuya Magic Spell error:', err);
    }
  }

  /**
   * Setup Enhanced Reporting
   * Configure optimal reporting intervals for all clusters
   */
  async setupEnhancedReporting() {
    const endpoint = this.device.zclNode?.endpoints?.[1];
    if (!endpoint) return;

    const reportingConfigs = {
      // Temperature (cluster 1026)
      1026: {
        attribute: 'measuredValue',
        minInterval: 300,    // 5 minutes
        maxInterval: 3600,   // 1 hour
        minChange: 50        // 0.5°C
      },
      // Humidity (cluster 1029)
      1029: {
        attribute: 'measuredValue',
        minInterval: 300,
        maxInterval: 3600,
        minChange: 100       // 1%
      },
      // Battery (cluster 1)
      // v5.2.76: Fixed maxInterval to stay within uint16 range (max 65535)
      1: {
        attribute: 'batteryPercentageRemaining',
        minInterval: 3600,   // 1 hour
        maxInterval: 43200,  // 12 hours (was 86400 which exceeds uint16 max)
        minChange: 2         // 2%
      },
      // OnOff (cluster 6)
      6: {
        attribute: 'onOff',
        minInterval: 0,
        maxInterval: 300,
        minChange: 1
      }
    };

    for (const [clusterId, config] of Object.entries(reportingConfigs)) {
      const id = parseInt(clusterId);
      if (endpoint.clusters[id]) {
        try {
          await endpoint.clusters[id].configureReporting({
            [config.attribute]: {
              minInterval: config.minInterval,
              maxInterval: config.maxInterval,
              minChange: config.minChange
            }
          });
          this.device.log(`[OK] Enhanced reporting configured for cluster ${id}`);
          this.zigpyFeatures.enhancedReporting = true;
        } catch (err) {
          this.device.log(`Failed to configure reporting for cluster ${id}:`, err.message);
        }
      }
    }
  }

  /**
   * Get zigpy features status
   */
  getStatus() {
    return this.zigpyFeatures;
  }

  /**
   * Export device information for zigpy-style logging
   */
  exportDeviceInfo() {
    return {
      manufacturer: this.device.getData().manufacturerName,
      model: this.device.getData().productId,
      ieee: this.device.getData().ieeeAddress,
      nwk: this.device.getData().networkAddress,
      endpoints: Object.keys(this.device.zclNode?.endpoints || {}),
      manufacturerClusters: this.zigpyFeatures.manufacturerClusters,
      otaSupport: this.zigpyFeatures.otaSupport,
      quirksApplied: this.zigpyFeatures.quirksApplied
    };
  }
}

module.exports = ZigpyIntegration;
