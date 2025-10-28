'use strict';

const { ZigBeeDevice } = require('homey-zigbeedriver');
const TuyaDataPointParser = require('./TuyaDataPointParser');
const UniversalCapabilityDetector = require('./UniversalCapabilityDetector');

/**
 * TUYA SPECIFIC DEVICE
 * 
 * Base class UNIVERSELLE pour devices Tuya
 * 
 * Détecte AUTOMATIQUEMENT:
 * - Clusters Zigbee standards
 * - DataPoints Tuya custom (0xEF00)
 * - Energy capabilities
 * - Multi-endpoints
 * 
 * Combine TOUT intelligemment!
 */

class TuyaSpecificDevice extends ZigBeeDevice {

  async onNodeInit({ zclNode }) {
    this.printNode();

    // ═══════════════════════════════════════
    // UNIVERSAL AUTO-DETECTION
    // ═══════════════════════════════════════
    this.log('🔍 Starting universal capability detection...');
    
    const detection = await UniversalCapabilityDetector.detectAllCapabilities(zclNode);
    
    // Log rapport complet
    const fullReport = await UniversalCapabilityDetector.generateReport(zclNode);
    this.log(fullReport);

    // Store detection pour usage ultérieur
    this._detectedCapabilities = detection;

    const manufacturerId = detection.deviceInfo.manufacturerId;
    this.log('Manufacturer:', manufacturerId);
    this.log('Model:', detection.deviceInfo.modelId);

    // ═══════════════════════════════════════
    // SETUP TUYA CUSTOM (DataPoints)
    // ═══════════════════════════════════════
    const tuyaEndpoint = Object.values(zclNode.endpoints).find(ep => 
      ep.clusters.tuya || ep.clusters.tuyaSpecificCluster || ep.clusters[0xEF00]
    );

    if (tuyaEndpoint) {
      this.log('✓ Tuya cluster found on endpoint:', tuyaEndpoint.endpointId);
      await this.setupTuyaCluster(tuyaEndpoint, manufacturerId);
    } else {
      this.log('⚠ No Tuya cluster - using standard Zigbee only');
    }

    // ═══════════════════════════════════════
    // SETUP ZIGBEE STANDARD CLUSTERS
    // ═══════════════════════════════════════
    if (detection.zigbeeStandard.length > 0) {
      this.log('✓ Registering', detection.zigbeeStandard.length, 'standard capabilities');
      this.registerStandardClusters(zclNode, detection);
    }

    // ═══════════════════════════════════════
    // SETUP ENERGY MONITORING
    // ═══════════════════════════════════════
    if (detection.energy.length > 0) {
      this.log('✓ Energy monitoring available:', detection.energy.join(', '));
    }

    this.log('✅ Universal detection complete!');
  }

  /**
   * Setup Tuya cluster listener
   */
  async setupTuyaCluster(tuyaEndpoint, manufacturerId) {
    const tuyaCluster = tuyaEndpoint.clusters.tuya || 
                        tuyaEndpoint.clusters.tuyaSpecificCluster ||
                        tuyaEndpoint.clusters[0xEF00];

    try {
      // Listen for DataPoint updates
      tuyaCluster.on('datapoint', (data) => {
        this.log('📨 Raw DP data received:', data);
        this.handleDataPoint(data, manufacturerId);
      });

      tuyaCluster.on('reporting', (data) => {
        this.log('📊 Tuya reporting:', data);
        this.handleDataPoint(data, manufacturerId);
      });

      // Try reading datapoints attribute
      try {
        const datapoints = await tuyaCluster.readAttributes(['datapoints']);
        this.log('📖 Read datapoints:', datapoints);
        if (datapoints && datapoints.datapoints) {
          this.handleDataPoint(datapoints.datapoints, manufacturerId);
        }
      } catch (err) {
        this.log('Could not read datapoints attribute:', err.message);
      }
    } catch (err) {
      this.error('Error setting up Tuya cluster listener:', err);
    }
  }

  /**
   * Handle incoming DataPoint
   * @param {Buffer|Array} data - DP data
   * @param {String} manufacturerId - Manufacturer ID
   */
  handleDataPoint(data, manufacturerId) {
    try {
      let dataPoints = [];

      if (Buffer.isBuffer(data)) {
        dataPoints = TuyaDataPointParser.parseMultipleDataPoints(data);
      } else if (Array.isArray(data)) {
        dataPoints = data;
      } else if (typeof data === 'object' && data.dp !== undefined) {
        dataPoints = [data];
      }

      this.log(`✓ Parsed ${dataPoints.length} DataPoint(s)`);

      dataPoints.forEach(dp => {
        this.log(`  DP ${dp.dp}: ${JSON.stringify(dp.value)}`);

        // Convert to Homey capability
        const converted = TuyaDataPointParser.dpToCapability(
          dp.dp,
          dp.value,
          manufacturerId
        );

        if (converted && this.hasCapability(converted.capability)) {
          this.log(`  → ${converted.capability} = ${converted.value}`);
          this.setCapabilityValue(converted.capability, converted.value)
            .catch(err => this.error(`Failed to set ${converted.capability}:`, err));
        } else if (converted) {
          this.log(`  ⚠ ${converted.capability} not available (add to driver.compose.json)`);
        } else {
          this.log(`  ⚠ DP ${dp.dp} not mapped`);
        }
      });
    } catch (err) {
      this.error('Error handling DataPoint:', err);
    }
  }

  /**
   * Register standard Zigbee clusters
   * @param {Object} zclNode - ZCL Node
   * @param {Object} detection - Detection result
   */
  registerStandardClusters(zclNode, detection) {
    detection.zigbeeStandard.forEach(capInfo => {
      if (!this.hasCapability(capInfo.capability)) {
        this.log(`⚠ Capability ${capInfo.capability} not in driver, skipping`);
        return;
      }

      try {
        switch (capInfo.cluster) {
          case 'onOff':
            this.registerCapability(capInfo.capability, 'onOff', {
              endpoint: capInfo.endpoint,
              get: 'onOff',
              set: 'onOff',
              setParser: value => ({ value }),
              report: 'onOff',
              reportParser: value => value
            });
            break;

          case 'levelControl':
            this.registerCapability('dim', 'levelControl', {
              endpoint: capInfo.endpoint,
              get: 'currentLevel',
              set: 'moveToLevelWithOnOff',
              setParser: value => ({
                level: Math.round(value * 254),
                transitionTime: 0
              }),
              report: 'currentLevel',
              reportParser: value => value / 254
            });
            break;

          case 'temperatureMeasurement':
            this.registerCapability('measure_temperature', 'temperatureMeasurement', {
              endpoint: capInfo.endpoint,
              get: 'measuredValue',
              reportParser: value => Math.round(value / 100 * 10) / 10,
              report: 'measuredValue'
            });
            break;

          case 'relativeHumidity':
            this.registerCapability('measure_humidity', 'relativeHumidity', {
              endpoint: capInfo.endpoint,
              get: 'measuredValue',
              reportParser: value => Math.round(value / 100),
              report: 'measuredValue'
            });
            break;

          case 'illuminanceMeasurement':
            this.registerCapability('measure_luminance', 'illuminanceMeasurement', {
              endpoint: capInfo.endpoint,
              get: 'measuredValue',
              reportParser: value => Math.round(Math.pow(10, (value - 1) / 10000)),
              report: 'measuredValue'
            });
            break;

          case 'iasZone':
            this.registerCapability('alarm_motion', 'iasZone', {
              endpoint: capInfo.endpoint,
              get: 'zoneStatus',
              reportParser: value => (value & 1) === 1,
              report: 'zoneStatus'
            });
            break;

          case 'powerConfiguration':
            this.registerCapability('measure_battery', 'powerConfiguration', {
              endpoint: capInfo.endpoint,
              get: 'batteryPercentageRemaining',
              reportParser: value => Math.round(value / 2),
              report: 'batteryPercentageRemaining'
            });
            break;

          default:
            this.log(`⚠ No registration handler for cluster: ${capInfo.cluster}`);
        }

        this.log(`✓ Registered ${capInfo.capability} [${capInfo.cluster}]`);
      } catch (err) {
        this.error(`Failed to register ${capInfo.capability}:`, err.message);
      }
    });
  }

  /**
   * Send DataPoint command
   * @param {Number} dp - DP ID
   * @param {Number} datatype - DP type
   * @param {*} value - Value
   */
  async sendDataPoint(dp, datatype, value) {
    try {
      const buffer = TuyaDataPointParser.encodeDataPoint(dp, datatype, value);
      
      const tuyaEndpoint = Object.values(this.zclNode.endpoints).find(ep => 
        ep.clusters.tuya || ep.clusters.tuyaSpecificCluster || ep.clusters[0xEF00]
      );

      if (!tuyaEndpoint) {
        throw new Error('No Tuya cluster available');
      }

      const tuyaCluster = tuyaEndpoint.clusters.tuya || 
                          tuyaEndpoint.clusters.tuyaSpecificCluster ||
                          tuyaEndpoint.clusters[0xEF00];

      await tuyaCluster.write('datapoints', buffer);
      this.log(`✓ Sent DP ${dp}:`, value);
    } catch (err) {
      this.error('Failed to send DataPoint:', err);
      throw err;
    }
  }

  /**
   * Get detected capabilities
   * @returns {Object} Detection result
   */
  getDetectedCapabilities() {
    return this._detectedCapabilities;
  }
}

module.exports = TuyaSpecificDevice;
