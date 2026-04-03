'use strict';

const { ZigBeeDevice } = require('homey-zigbeedriver');
const { CLUSTER } = require('zigbee-clusters');

/**
 * ╔══════════════════════════════════════════════════════════════════════════════╗
 * ║     DIY CUSTOM ZIGBEE DEVICE - v5.5.719                                      ║
 * ╠══════════════════════════════════════════════════════════════════════════════╣
 * ║                                                                              ║
 * ║  SUPPORTED FIRMWARES & PLATFORMS:                                            ║
 * ║  ┌─────────────────────────────────────────────────────────────────────────┐ ║
 * ║  │ Platform         │ Chips                 │ Features                    │ ║
 * ║  ├─────────────────────────────────────────────────────────────────────────┤ ║
 * ║  │ PTVO Firmware    │ CC2530/CC2531/CC2652  │ 8 GPIO, sensors, UART, ADC  │ ║
 * ║  │ ESP Zigbee SDK   │ ESP32-H2, ESP32-C6    │ Custom clusters, ZCL 8      │ ║
 * ║  │ DIYRuZ           │ CC2530/CC2652         │ Geiger, AirSense, Flower    │ ║
 * ║  │ Tasmota Zigbee   │ ESP32 + CC2530        │ Bridge mode, Z2T            │ ║
 * ║  │ Z-Stack          │ CC26xx, CC13xx        │ TI reference firmware       │ ║
 * ║  │ SiLabs SDK       │ EFR32MG21/22          │ Silicon Labs Zigbee         │ ║
 * ║  │ nRF Connect      │ nRF52840              │ Nordic Zigbee               │ ║
 * ║  └─────────────────────────────────────────────────────────────────────────┘ ║
 * ║                                                                              ║
 * ║  PTVO FEATURES (up to 8 endpoints):                                          ║
 * ║  - GPIO inputs/outputs with pull-up/pull-down                                ║
 * ║  - Analog inputs (ADC)                                                       ║
 * ║  - I2C sensors (BME280, BH1750, SHT30, etc.)                                 ║
 * ║  - 1-Wire sensors (DS18B20, DHT22)                                           ║
 * ║  - UART/MODBUS sensors                                                       ║
 * ║  - PWM outputs                                                               ║
 * ║  - Pulse counter/generator                                                   ║
 * ║                                                                              ║
 * ║  ESP32-H2/C6 FEATURES:                                                       ║
 * ║  - Native Zigbee 3.0 support                                                 ║
 * ║  - Custom ZCL clusters                                                       ║
 * ║  - OTA updates                                                               ║
 * ║  - Low power modes                                                           ║
 * ║                                                                              ║
 * ╚══════════════════════════════════════════════════════════════════════════════╝
 */
class DiyCustomZigbeeDevice extends ZigBeeDevice {

  async onNodeInit({ zclNode }) {
    this.log('');
    this.log('╔══════════════════════════════════════════════════════════════╗');
    this.log('║     DIY CUSTOM ZIGBEE DEVICE v5.5.719                        ║');
    this.log('║   PTVO | ESP32-H2 | CC2530 | DIYRuZ | Custom ZCL             ║');
    this.log('╚══════════════════════════════════════════════════════════════╝');

    this.zclNode = zclNode;

    // Get device info
    const { manufacturerName, productId } = this.getData() || {};
    this.log(`[DIY] Manufacturer: ${manufacturerName}`);
    this.log(`[DIY] Product ID: ${productId}`);

    // Detect firmware type
    this._firmwareType = this._detectFirmwareType(manufacturerName, productId);
    this.log(`[DIY] Detected firmware type: ${this._firmwareType}`);

    // Update settings with device info
    await this._updateDeviceSettings();

    // Scan all endpoints and clusters
    await this._scanEndpointsAndClusters();

    // Setup capabilities based on detected clusters
    await this._setupCapabilities();

    // Setup cluster listeners
    await this._setupClusterListeners();

    this.log('[DIY] ✅ Device initialized successfully');
  }

  _detectFirmwareType(manufacturerName = '', productId = '') {
    const mfr = manufacturerName.toLowerCase();
    const pid = productId.toLowerCase();

    if (mfr.includes('ptvo') || pid.includes('ptvo')) return 'PTVO';
    if (mfr.includes('esp32') || mfr.includes('espressif')) return 'ESP32';
    if (mfr.includes('diyruz') || pid.includes('diyruz')) return 'DIYRuZ';
    if (mfr.includes('tasmota') || pid.includes('z2t') || pid.includes('zbbridge')) return 'Tasmota';
    if (mfr.includes('cc2530') || mfr.includes('cc2531') || mfr.includes('cc2652')) return 'TI_ZStack';
    if (mfr.includes('efr32') || mfr.includes('silabs') || mfr.includes('silicon')) return 'SiLabs';
    if (mfr.includes('nrf') || mfr.includes('nordic')) return 'Nordic';
    if (mfr.includes('conbee') || mfr.includes('raspbee') || mfr.includes('deconz')) return 'deCONZ';
    if (mfr.includes('zigstar') || mfr.includes('zzh') || mfr.includes('tube')) return 'Coordinator';
    
    return 'Unknown_DIY';
  }

  async _updateDeviceSettings() {
    try {
      const { manufacturerName, productId } = this.getData() || {};
      
      await this.setSettings({
        device_manufacturer: manufacturerName || 'Unknown DIY',
        device_model: productId || 'Custom'
      }).catch(() => {});
    } catch (e) {
      this.log('[DIY] Settings update skipped:', e.message);
    }
  }

  async _scanEndpointsAndClusters() {
    this.log('[DIY] Scanning endpoints and clusters...');
    
    this._detectedEndpoints = [];
    this._detectedClusters = {};

    try {
      const endpoints = this.zclNode?.endpoints || {};
      
      for (const [epId, endpoint] of Object.entries(endpoints)) {
        this._detectedEndpoints.push(parseInt(epId));
        this._detectedClusters[epId] = [];

        const clusters = endpoint.clusters || {};
        for (const [clusterId, cluster] of Object.entries(clusters)) {
          this._detectedClusters[epId].push(clusterId);
          this.log(`[DIY] Endpoint ${epId}: Cluster ${clusterId} (${this._getClusterName(clusterId)})`);
        }
      }

      // Update settings
      await this.setSettings({
        detected_endpoints: this._detectedEndpoints.join(', ') || '1',
        detected_clusters: JSON.stringify(this._detectedClusters).substring(0, 100) || 'None'
      }).catch(() => {});

      this.log(`[DIY] Found ${this._detectedEndpoints.length} endpoints`);
    } catch (e) {
      this.log('[DIY] Endpoint scan error:', e.message);
    }
  }

  _getClusterName(clusterId) {
    const clusterNames = {
      '0': 'Basic',
      '3': 'Identify',
      '4': 'Groups',
      '5': 'Scenes',
      '6': 'OnOff',
      '8': 'LevelControl',
      '768': 'ColorControl',
      '1024': 'Illuminance',
      '1026': 'Temperature',
      '1027': 'Pressure',
      '1029': 'Humidity',
      '1280': 'IasZone',
      '2820': 'ElectricalMeasurement',
      '2821': 'Diagnostics',
      '61184': 'TuyaSpecific',
      '64512': 'CustomCluster'
    };
    return clusterNames[clusterId] || `Custom(${clusterId})`;
  }

  async _setupCapabilities() {
    this.log('[DIY] Setting up capabilities based on detected clusters...');

    // Check for onOff cluster on any endpoint
    for (const epId of this._detectedEndpoints) {
      const clusters = this._detectedClusters[epId] || [];
      
      // OnOff capability
      if (clusters.includes('6') || clusters.includes('genOnOff')) {
        if (!this.hasCapability('onoff')) {
          await this.addCapability('onoff').catch(() => {});
        }
        await this._setupOnOffCapability(epId);
      }

      // Level control (dimming)
      if (clusters.includes('8') || clusters.includes('genLevelCtrl')) {
        if (!this.hasCapability('dim')) {
          await this.addCapability('dim').catch(() => {});
        }
        await this._setupDimCapability(epId);
      }

      // Temperature
      if (clusters.includes('1026') || clusters.includes('msTemperatureMeasurement')) {
        if (!this.hasCapability('measure_temperature')) {
          await this.addCapability('measure_temperature').catch(() => {});
        }
        await this._setupTemperatureCapability(epId);
      }

      // Humidity
      if (clusters.includes('1029') || clusters.includes('msRelativeHumidity')) {
        if (!this.hasCapability('measure_humidity')) {
          await this.addCapability('measure_humidity').catch(() => {});
        }
        await this._setupHumidityCapability(epId);
      }

      // Illuminance
      if (clusters.includes('1024') || clusters.includes('msIlluminanceMeasurement')) {
        if (!this.hasCapability('measure_luminance')) {
          await this.addCapability('measure_luminance').catch(() => {});
        }
        await this._setupIlluminanceCapability(epId);
      }
    }
  }

  async _setupOnOffCapability(endpointId = 1) {
    try {
      const endpoint = this.zclNode.endpoints[endpointId];
      if (!endpoint) return;

      this.registerCapability('onoff', CLUSTER.ON_OFF, {
        endpoint: endpointId,
        set: 'onOff',
        setParser: value => (value ? 'on' : 'off'),
        get: 'onOff',
        report: 'onOff',
        reportParser: value => value === true || value === 1 || value === 'on'
      });

      this.log(`[DIY] ✅ OnOff capability registered on endpoint ${endpointId}`);
    } catch (e) {
      this.log(`[DIY] OnOff setup error: ${e.message}`);
    }
  }

  async _setupDimCapability(endpointId = 1) {
    try {
      this.registerCapability('dim', CLUSTER.LEVEL_CONTROL, {
        endpoint: endpointId,
        set: 'moveToLevel',
        setParser: value => ({
          level: Math.round(value * 254),
          transitionTime: 0
        }),
        get: 'currentLevel',
        report: 'currentLevel',
        reportParser: value => value / 254
      });

      this.log(`[DIY] ✅ Dim capability registered on endpoint ${endpointId}`);
    } catch (e) {
      this.log(`[DIY] Dim setup error: ${e.message}`);
    }
  }

  async _setupTemperatureCapability(endpointId = 1) {
    try {
      this.registerCapability('measure_temperature', CLUSTER.TEMPERATURE_MEASUREMENT, {
        endpoint: endpointId,
        get: 'measuredValue',
        report: 'measuredValue',
        reportParser: value => {
          if (value === null || value === undefined || value === -32768) return null;
          return Math.round(value / 100 * 10) / 10;
        }
      });

      this.log(`[DIY] ✅ Temperature capability registered on endpoint ${endpointId}`);
    } catch (e) {
      this.log(`[DIY] Temperature setup error: ${e.message}`);
    }
  }

  async _setupHumidityCapability(endpointId = 1) {
    try {
      this.registerCapability('measure_humidity', CLUSTER.RELATIVE_HUMIDITY_MEASUREMENT, {
        endpoint: endpointId,
        get: 'measuredValue',
        report: 'measuredValue',
        reportParser: value => {
          if (value === null || value === undefined) return null;
          return Math.round(value / 100);
        }
      });

      this.log(`[DIY] ✅ Humidity capability registered on endpoint ${endpointId}`);
    } catch (e) {
      this.log(`[DIY] Humidity setup error: ${e.message}`);
    }
  }

  async _setupIlluminanceCapability(endpointId = 1) {
    try {
      this.registerCapability('measure_luminance', CLUSTER.ILLUMINANCE_MEASUREMENT, {
        endpoint: endpointId,
        get: 'measuredValue',
        report: 'measuredValue',
        reportParser: value => {
          if (value === null || value === undefined || value === 0) return 0;
          return Math.pow(10, (value - 1) / 10000);
        }
      });

      this.log(`[DIY] ✅ Illuminance capability registered on endpoint ${endpointId}`);
    } catch (e) {
      this.log(`[DIY] Illuminance setup error: ${e.message}`);
    }
  }

  async _setupClusterListeners() {
    this.log('[DIY] Setting up cluster listeners...');

    // Listen for all attribute reports
    try {
      for (const epId of this._detectedEndpoints) {
        const endpoint = this.zclNode.endpoints[epId];
        if (!endpoint) continue;

        // Generic listener for all clusters
        for (const [clusterId, cluster] of Object.entries(endpoint.clusters || {})) {
          if (cluster && typeof cluster.on === 'function') {
            cluster.on('attr', (attrName, value) => {
              this.log(`[DIY] Endpoint ${epId} Cluster ${clusterId} Attr ${attrName}: ${JSON.stringify(value)}`);
              this._handleAttributeReport(epId, clusterId, attrName, value);
            });
          }
        }
      }
    } catch (e) {
      this.log('[DIY] Cluster listener setup error:', e.message);
    }
  }

  _handleAttributeReport(endpointId, clusterId, attrName, value) {
    // Handle specific attributes
    if (clusterId === '6' || clusterId === 'genOnOff') {
      if (attrName === 'onOff') {
        const isOn = value === true || value === 1 || value === 'on';
        this.setCapabilityValue('onoff', isOn).catch(() => {});
      }
    }

    if (clusterId === '1026' || clusterId === 'msTemperatureMeasurement') {
      if (attrName === 'measuredValue' && value !== -32768) {
        const temp = Math.round(value / 100 * 10) / 10;
        this.setCapabilityValue('measure_temperature', temp).catch(() => {});
      }
    }

    if (clusterId === '1029' || clusterId === 'msRelativeHumidity') {
      if (attrName === 'measuredValue') {
        const humidity = Math.round(value / 100);
        this.setCapabilityValue('measure_humidity', humidity).catch(() => {});
      }
    }
  }

  async onSettings({ oldSettings, newSettings, changedKeys }) {
    this.log('[DIY] Settings changed:', changedKeys);

    if (changedKeys.includes('force_device_type')) {
      this.log(`[DIY] Device type forced to: ${newSettings.force_device_type}`);
    }

    if (changedKeys.includes('enable_debug_logging')) {
      this._debugLogging = newSettings.enable_debug_logging;
    }
  }

  onDeleted() {
    this.log('[DIY] Device deleted');
  }
}

module.exports = DiyCustomZigbeeDevice;
