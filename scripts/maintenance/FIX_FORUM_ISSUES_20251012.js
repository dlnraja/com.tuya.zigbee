#!/usr/bin/env node

/**
 * FIX_FORUM_ISSUES_20251012.js
 * Fixe les problèmes critiques identifiés dans diagnostic 32546f72
 * 
 * Issues:
 * 1. SOS Button battery 1% au lieu de correct value
 * 2. HOBEIAN Multisensor no data (temp/humidity/lux/motion)
 */

const fs = require('fs');
const path = require('path');

console.log('╔════════════════════════════════════════════════════════╗');
console.log('║   🔧 FIX FORUM ISSUES - DIAGNOSTIC 32546f72           ║');
console.log('╚════════════════════════════════════════════════════════╝\n');

let fixesApplied = 0;

// ============================================================================
// FIX 1: SOS Button - Battery Calculation + IAS Zone
// ============================================================================

console.log('🔴 FIX 1: SOS Emergency Button\n');

const sosDevicePath = 'drivers/sos_emergency_button_cr2032/device.js';
let sosContent = fs.readFileSync(sosDevicePath, 'utf8');

const sosNewContent = `'use strict';

const { ZigBeeDevice } = require('homey-zigbeedriver');
const { CLUSTER } = require('zigbee-clusters');
const TuyaClusterHandler = require('../../utils/tuya-cluster-handler');

class SosEmergencyButtonCr2032Device extends ZigBeeDevice {

  async onNodeInit({ zclNode }) {
    this.log('sos_emergency_button_cr2032 initialized');

    // Call parent
    await super.onNodeInit({ zclNode });

    // Auto-detect device type and initialize Tuya cluster handler
    const deviceType = TuyaClusterHandler.detectDeviceType('sos_emergency_button_cr2032');
    const tuyaInitialized = await TuyaClusterHandler.init(this, zclNode, deviceType);
    
    if (tuyaInitialized) {
      this.log('✅ Tuya cluster handler initialized for type:', deviceType);
    } else {
      this.log('⚠️  No Tuya cluster found, using standard Zigbee');
      
      // Fallback to standard cluster handling
      await this.registerStandardCapabilities(zclNode);
    }

    // Mark device as available
    await this.setAvailable();
  }

  /**
   * Register standard Zigbee capabilities (fallback)
   */
  async registerStandardCapabilities(zclNode) {
    // Battery - IMPROVED calculation
    if (this.hasCapability('measure_battery')) {
      try {
        this.registerCapability('measure_battery', CLUSTER.POWER_CONFIGURATION, {
          get: 'batteryPercentageRemaining',
          report: 'batteryPercentageRemaining',
          reportParser: value => {
            this.log('Battery raw value:', value);
            // Smart calculation: check if value is already 0-100 or 0-200
            if (value <= 100) {
              // Already percentage (some Tuya devices)
              return Math.max(0, Math.min(100, value));
            } else {
              // Standard Zigbee 0-200 format
              return Math.max(0, Math.min(100, value / 2));
            }
          },
          getParser: value => {
            this.log('Battery raw value (get):', value);
            if (value <= 100) {
              return Math.max(0, Math.min(100, value));
            } else {
              return Math.max(0, Math.min(100, value / 2));
            }
          }
        });
        this.log('✅ Battery capability registered with smart calculation');
      } catch (err) {
        this.log('Could not register battery capability:', err.message);
      }
    }

    // IAS Zone for button events (alarm_contact)
    if (this.hasCapability('alarm_contact')) {
      try {
        this.registerCapability('alarm_contact', CLUSTER.IAS_ZONE, {
          get: 'zoneStatus',
          report: 'zoneStatus',
          reportParser: value => {
            this.log('IAS Zone status:', value);
            // Bit 0 = alarm1 (button pressed)
            return (value & 1) === 1;
          }
        });
        
        // Enroll to IAS Zone
        const endpoint = zclNode.endpoints[this.getClusterEndpoint(CLUSTER.IAS_ZONE)];
        if (endpoint && endpoint.clusters.iasZone) {
          await endpoint.clusters.iasZone.enrollResponse({
            enrollResponseCode: 0, // Success
            zoneId: 1
          });
          this.log('✅ IAS Zone enrolled successfully');
        }
      } catch (err) {
        this.log('IAS Zone setup failed:', err.message);
      }
    }
  }

  async onDeleted() {
    this.log('sos_emergency_button_cr2032 deleted');
  }

}

module.exports = SosEmergencyButtonCr2032Device;
`;

fs.writeFileSync(sosDevicePath, sosNewContent);
console.log('   ✅ SOS button device.js patched');
console.log('      • Smart battery calculation');
console.log('      • IAS Zone enrollment');
console.log('      • Enhanced logging\n');
fixesApplied++;

// ============================================================================
// FIX 2: HOBEIAN Multisensor - Auto-detect endpoint + Fallback clusters
// ============================================================================

console.log('🔴 FIX 2: HOBEIAN Multisensor\n');

const hobeianDevicePath = 'drivers/motion_temp_humidity_illumination_multi_battery/device.js';
let hobeianContent = fs.readFileSync(hobeianDevicePath, 'utf8');

const hobeianNewContent = `'use strict';

const { ZigBeeDevice } = require('homey-zigbeedriver');
const { CLUSTER } = require('zigbee-clusters');

class MotionTempHumidityIlluminationSensorDevice extends ZigBeeDevice {

  async onNodeInit({ zclNode }) {
    this.log('motion_temp_humidity_illumination_sensor device initialized');

    // Debug: Log all endpoints and clusters
    this.log('=== DEVICE DEBUG INFO ===');
    this.log('Node:', zclNode.ieeeAddr);
    this.log('Endpoints:', Object.keys(zclNode.endpoints));
    for (const [epId, endpoint] of Object.entries(zclNode.endpoints)) {
      const clusterIds = Object.keys(endpoint.clusters).map(id => \`\${id} (0x\${parseInt(id).toString(16)})\`);
      this.log(\`  Endpoint \${epId} clusters:\`, clusterIds.join(', '));
    }
    this.log('========================');

    // Call parent
    await super.onNodeInit({ zclNode });

    // Auto-detect Tuya cluster on any endpoint
    let tuyaCluster = null;
    let tuyaEndpoint = null;
    
    for (const [epId, endpoint] of Object.entries(zclNode.endpoints)) {
      if (endpoint.clusters[61184]) {
        tuyaCluster = endpoint.clusters[61184];
        tuyaEndpoint = epId;
        this.log(\`✅ Tuya cluster 61184 found on endpoint \${epId}\`);
        break;
      }
    }
    
    if (tuyaCluster) {
      // Tuya cluster found - use datapoint method
      this.log('Setting up Tuya datapoint listeners...');
      
      tuyaCluster.on('response', this._handleTuyaData.bind(this));
      tuyaCluster.on('reporting', this._handleTuyaData.bind(this));
      
      // Configure attribute reporting for Tuya cluster
      try {
        await tuyaCluster.configureReporting([{
          attributeId: 0, // dataPoints
          minimumReportInterval: 60, // 1 minute
          maximumReportInterval: 3600, // 1 hour
        }]);
        this.log('✅ Tuya reporting configured');
      } catch (err) {
        this.log('Tuya reporting configuration failed (might be OK):', err.message);
      }
      
      // Request initial data
      try {
        await tuyaCluster.read('dataPoints');
        this.log('✅ Initial Tuya data requested');
      } catch (err) {
        this.log('Initial Tuya data read failed:', err.message);
      }
    } else {
      // No Tuya cluster - use standard Zigbee clusters
      this.log('⚠️  No Tuya cluster found, using standard Zigbee clusters');
      await this.registerStandardClusters(zclNode);
    }

    // Battery from standard cluster (works with both modes)
    if (this.hasCapability('measure_battery')) {
      try {
        this.registerCapability('measure_battery', CLUSTER.POWER_CONFIGURATION, {
          get: 'batteryPercentageRemaining',
          report: 'batteryPercentageRemaining',
          reportParser: value => {
            this.log('Battery raw value:', value);
            if (value <= 100) {
              return Math.max(0, Math.min(100, value));
            } else {
              return Math.max(0, Math.min(100, value / 2));
            }
          }
        });
        this.log('✅ Battery capability registered');
      } catch (err) {
        this.log('Battery registration failed:', err.message);
      }
    }

    // Mark device as available
    await this.setAvailable();
  }

  /**
   * Register standard Zigbee clusters (fallback when no Tuya cluster)
   */
  async registerStandardClusters(zclNode) {
    this.log('Registering standard Zigbee clusters...');
    
    // Temperature Measurement
    if (this.hasCapability('measure_temperature')) {
      try {
        this.registerCapability('measure_temperature', CLUSTER.TEMPERATURE_MEASUREMENT);
        this.log('✅ Temperature cluster registered');
      } catch (err) {
        this.log('Temperature cluster failed:', err.message);
      }
    }
    
    // Relative Humidity Measurement
    if (this.hasCapability('measure_humidity')) {
      try {
        this.registerCapability('measure_humidity', CLUSTER.RELATIVE_HUMIDITY_MEASUREMENT);
        this.log('✅ Humidity cluster registered');
      } catch (err) {
        this.log('Humidity cluster failed:', err.message);
      }
    }
    
    // Illuminance Measurement
    if (this.hasCapability('measure_luminance')) {
      try {
        this.registerCapability('measure_luminance', CLUSTER.ILLUMINANCE_MEASUREMENT);
        this.log('✅ Illuminance cluster registered');
      } catch (err) {
        this.log('Illuminance cluster failed:', err.message);
      }
    }
    
    // Motion via IAS Zone
    if (this.hasCapability('alarm_motion')) {
      try {
        this.registerCapability('alarm_motion', CLUSTER.IAS_ZONE, {
          get: 'zoneStatus',
          report: 'zoneStatus',
          reportParser: value => {
            this.log('Motion IAS Zone status:', value);
            return (value & 1) === 1;
          }
        });
        
        // Enroll IAS Zone
        const endpoint = zclNode.endpoints[this.getClusterEndpoint(CLUSTER.IAS_ZONE)];
        if (endpoint && endpoint.clusters.iasZone) {
          await endpoint.clusters.iasZone.enrollResponse({
            enrollResponseCode: 0,
            zoneId: 1
          });
          this.log('✅ IAS Zone enrolled for motion');
        }
      } catch (err) {
        this.log('IAS Zone motion failed:', err.message);
      }
    }
  }

  /**
   * Handle Tuya datapoint reports
   * Based on Zigbee2MQTT converter for ZG-204ZV
   */
  _handleTuyaData(data) {
    this.log('📦 Tuya data received:', JSON.stringify(data));
    
    if (!data || !data.dataPoints) {
      this.log('⚠️  No dataPoints in Tuya data');
      return;
    }
    
    // Tuya datapoints for ZG-204ZV:
    // DP 1: motion (bool)
    // DP 2: battery (0-100)
    // DP 4: temperature (int, divide by 10)
    // DP 5: humidity (int)
    // DP 9: illuminance (int, lux)
    
    Object.entries(data.dataPoints).forEach(([dp, value]) => {
      this.log(\`Processing DP \${dp}:\`, value);
      
      switch(parseInt(dp)) {
        case 1: // Motion
          if (this.hasCapability('alarm_motion')) {
            this.setCapabilityValue('alarm_motion', value === true || value === 1).catch(this.error);
            this.log('✅ Motion:', value);
          }
          break;
          
        case 2: // Battery
          if (this.hasCapability('measure_battery')) {
            const battery = Math.max(0, Math.min(100, parseInt(value)));
            this.setCapabilityValue('measure_battery', battery).catch(this.error);
            this.log('✅ Battery:', battery + '%');
          }
          break;
          
        case 4: // Temperature
          if (this.hasCapability('measure_temperature')) {
            const temp = parseInt(value) / 10;
            this.setCapabilityValue('measure_temperature', temp).catch(this.error);
            this.log('✅ Temperature:', temp + '°C');
          }
          break;
          
        case 5: // Humidity
          if (this.hasCapability('measure_humidity')) {
            const humidity = Math.max(0, Math.min(100, parseInt(value)));
            this.setCapabilityValue('measure_humidity', humidity).catch(this.error);
            this.log('✅ Humidity:', humidity + '%');
          }
          break;
          
        case 9: // Illuminance (lux)
          if (this.hasCapability('measure_luminance')) {
            const lux = parseInt(value);
            this.setCapabilityValue('measure_luminance', lux).catch(this.error);
            this.log('✅ Luminance:', lux + ' lux');
          }
          break;
          
        default:
          this.log(\`⚠️  Unknown datapoint \${dp}:\`, value);
      }
    });
  }

  async onDeleted() {
    this.log('motion_temp_humidity_illumination_sensor device deleted');
  }

}

module.exports = MotionTempHumidityIlluminationSensorDevice;
`;

fs.writeFileSync(hobeianDevicePath, hobeianNewContent);
console.log('   ✅ HOBEIAN multisensor device.js patched');
console.log('      • Auto-detect Tuya cluster endpoint');
console.log('      • Fallback standard Zigbee clusters');
console.log('      • Configure attribute reporting');
console.log('      • Enhanced debug logging\n');
fixesApplied++;

// ============================================================================
// RÉSUMÉ
// ============================================================================

console.log('╔════════════════════════════════════════════════════════╗');
console.log('║                  FIX APPLIQUÉS                         ║');
console.log('╚════════════════════════════════════════════════════════╝\n');

console.log(`   ✅ Fixes appliqués: ${fixesApplied}/2\n`);

console.log('📋 DÉTAILS DES CORRECTIONS:\n');
console.log('   🔴 SOS Emergency Button:');
console.log('      • Smart battery calculation (0-100 vs 0-200)');
console.log('      • IAS Zone enrollment pour events');
console.log('      • Enhanced logging battery values');
console.log('');
console.log('   🔴 HOBEIAN Multisensor:');
console.log('      • Auto-detect Tuya cluster (any endpoint)');
console.log('      • Fallback clusters standards si pas Tuya');
console.log('      • Configure attribute reporting');
console.log('      • Debug log all endpoints/clusters');
console.log('');

console.log('⚡ PROCHAINES ÉTAPES:\n');
console.log('   1. homey app validate --level publish');
console.log('   2. Test avec devices réels');
console.log('   3. Version bump → v2.15.1');
console.log('   4. Réponse forum @Peter_van_Werkhoven');
console.log('   5. Publish App Store\n');

console.log('✅ Fixes prêts pour testing!\n');
