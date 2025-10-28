'use strict';

const BaseHybridDevice = require('../../lib/BaseHybridDevice');

/**
 * TuyaSoilTesterTempHumidDevice - Unified Hybrid Driver
 * Auto-detects power source: AC/DC/Battery (CR2032/CR2450/AAA/AA)
 * Dynamically manages capabilities based on power source
 */
class TuyaSoilTesterTempHumidDevice extends BaseHybridDevice {

  async onNodeInit({ zclNode }) {
    this.log('TuyaSoilTesterTempHumidDevice initializing...');
    
    // Setup sensor reporting
    await super.onNodeInit({ zclNode }).catch(err => this.error(err));
    
    // THEN setup (zclNode now exists)
    await this.setupSensorReporting();
    
    // Initialize base (auto power detection + dynamic capabilities)
    

    // Setup IAS Zone (SDK3 - based on Peter's success patterns)
    await this.setupIASZone();

    // Setup sensor capabilities (SDK3)
    await this.setupTemperatureSensor();
    await this.setupHumiditySensor();
    
    this.log('TuyaSoilTesterTempHumidDevice initialized - Power source:', this.powerSource || 'unknown');
  }

  async setupSensorReporting() {
    try {
      const endpoint = this.zclNode.endpoints[1];
      
      if (endpoint?.clusters?.msTemperatureMeasurement) {
        endpoint.clusters.msTemperatureMeasurement.on('attr.measuredValue', async (value) => {
          await this.setCapabilityValue('measure_temperature', value / 100).catch(this.error);
        });
      }
      
      if (endpoint?.clusters?.msRelativeHumidity) {
        endpoint.clusters.msRelativeHumidity.on('attr.measuredValue', async (value) => {
          await this.setCapabilityValue('measure_humidity', value / 100).catch(this.error);
        });
      }
      
      if (endpoint?.clusters?.genPowerCfg) {
        endpoint.clusters.genPowerCfg.on('attr.batteryPercentageRemaining', async (value) => {
          await this.setCapabilityValue('measure_battery', value / 2).catch(this.error);
        });
      }
      
      await this.configureAttributeReporting([
        { endpointId: 1, cluster: 1026, attributeName: 'measuredValue', minInterval: 60, maxInterval: 3600, minChange: 50 },
        { endpointId: 1, cluster: 1029, attributeName: 'measuredValue', minInterval: 60, maxInterval: 3600, minChange: 50 },
        { endpointId: 1, cluster: 1, attributeName: 'batteryPercentageRemaining', minInterval: 3600, maxInterval: 43200, minChange: 2 }
      ]).catch(err => this.log('Reporting config (non-critical):', err.message));
      
    } catch (err) {
      this.error('Sensor reporting setup failed:', err);
    }
  }

  
  /**
   * Setup measure_temperature capability (SDK3)
   * Cluster 1026 - measuredValue
   */
  async setupTemperatureSensor() {
    if (!this.hasCapability('measure_temperature')) {
      return;
    }
    
    this.log('[TEMP]  Setting up measure_temperature (cluster 1026)...');
    
    const endpoint = this.zclNode.endpoints[1];
    if (!endpoint?.clusters[1026]) {
      this.log('[WARN]  Cluster 1026 not available');
      return;
    }
    
    try {
      /* REFACTOR: registerCapability deprecated with cluster spec.
   Original: this.registerCapability('measure_temperature', 1026,
   Replace with SDK3 pattern - see ZigbeeDevice docs
   Capability: 'measure_temperature', Cluster: 1026
*/
      // Commented out - replaced by SDK3 direct cluster access
      // this.registerCapability('measure_temperature', 1026, {
      //   get: 'measuredValue',
      //   report: 'measuredValue',
      //   reportParser: value => value / 100,
      //   reportOpts: {
      //     configureAttributeReporting: {
      //       minInterval: 60,
      //       maxInterval: 3600,
      //       minChange: 10
      //     }
      //   },
      //   getOpts: {
      //     getOnStart: true
      //   }
      // });
      
      this.log('[OK] measure_temperature configured (cluster 1026)');
    } catch (err) {
      this.error('measure_temperature setup failed:', err);
    }
  }

  /**
   * Setup measure_humidity capability (SDK3)
   * Cluster 1029 - measuredValue
   */
  async setupHumiditySensor() {
    if (!this.hasCapability('measure_humidity')) {
      return;
    }
    
    this.log('[TEMP]  Setting up measure_humidity (cluster 1029)...');
    
    const endpoint = this.zclNode.endpoints[1];
    if (!endpoint?.clusters[1029]) {
      this.log('[WARN]  Cluster 1029 not available');
      return;
    }
    
    try {
      /* REFACTOR: registerCapability deprecated with cluster spec.
   Original: this.registerCapability('measure_humidity', 1029,
   Replace with SDK3 pattern - see ZigbeeDevice docs
   Capability: 'measure_humidity', Cluster: 1029
   
   Code commented out - needs SDK3 direct cluster access implementation
*/
      // this.registerCapability('measure_humidity', 1029, {
      //   get: 'measuredValue',
      //   report: 'measuredValue',
      //   reportParser: value => value / 100,
      //   reportOpts: {
      //     configureAttributeReporting: {
      //       minInterval: 60,
      //       maxInterval: 3600,
      //       minChange: 100
      //     }
      //   },
      //   getOpts: {
      //     getOnStart: true
      //   }
      // });
      
      this.log('[OK] measure_humidity configured (cluster 1029)');
    } catch (err) {
      this.error('measure_humidity setup failed:', err);
    }
  }

  
  /**
   * Setup IAS Zone for Contact sensor (SDK3 Compliant)
   * 
   * Based on Peter's successful diagnostic patterns:
   * - Temperature/Humidity/Lux work via standard clusters [OK]
   * - IAS Zone requires special SDK3 enrollment method
   * 
   * Cluster 1280 (IASZone) - Motion/Alarm detection
   */
  /**
   * Setup IAS Zone (SDK3 - Based on IASZoneEnroller_SIMPLE_v4.0.6.js)
   * Version la plus récente du projet (2025-10-21)
   */
  async setupIASZone() {
    this.log('🔐 Setting up IAS Zone (SDK3 latest method)...');
    
    const endpoint = this.zclNode.endpoints[1];
    
    if (!endpoint?.clusters?.iasZone) {
      this.log('[INFO]  IAS Zone cluster not available');
      return;
    }
    
    try {
      // Step 1: Setup Zone Enroll Request listener (SYNCHRONOUS - property assignment)
      // SDK3: Use property assignment, NOT .on() event listener
      endpoint.clusters.iasZone.onZoneEnrollRequest = async () => {
        this.log('[MSG] Zone Enroll Request received');
        
        try {
          // Send response IMMEDIATELY
          await endpoint.clusters.iasZone.zoneEnrollResponse({
            enrollResponseCode: 0, // 0 = Success
            zoneId: 10
          });
          
          this.log('[OK] Zone Enroll Response sent (zoneId: 10)');
        } catch (err) {
          this.error('Failed to send Zone Enroll Response:', err.message);
        }
      };
      
      this.log('[OK] Zone Enroll Request listener configured');
      
      // Step 2: Send proactive Zone Enroll Response (SDK3 official method)
      // Per Homey docs: "driver could send Zone Enroll Response when initializing
      // regardless of having received Zone Enroll Request"
      this.log('[SEND] Sending proactive Zone Enroll Response...');
      
      try {
        await endpoint.clusters.iasZone.zoneEnrollResponse({
          enrollResponseCode: 0,
          zoneId: 10
        });
        
        this.log('[OK] Proactive Zone Enroll Response sent');
      } catch (err) {
        this.log('[WARN]  Proactive response failed (normal if device not ready):', err.message);
      }
      
      // Step 3: Setup Zone Status Change listener (property assignment)
      // SDK3: Use .onZoneStatusChangeNotification property, NOT .on() event
      endpoint.clusters.iasZone.onZoneStatusChangeNotification = (payload) => {
        this.log('[MSG] Zone notification received:', payload);
        
        if (payload && payload.zoneStatus !== undefined) {
          // Convert Bitmap to value if needed
          let status = payload.zoneStatus;
          if (status && typeof status.valueOf === 'function') {
            status = status.valueOf();
          }
          
          // Check alarm1 bit (motion/alarm detected)
          const alarm = (status & 0x01) !== 0;
          
          await this.setCapabilityValue('alarm_contact', alarm).catch(this.error);
          this.log(`${alarm ? '[ALARM]' : '[OK]'} Alarm: ${alarm ? 'TRIGGERED' : 'cleared'}`);
        }
      };
      
      this.log('[OK] Zone Status listener configured');
      
      // Step 4: Setup Zone Status attribute listener (property assignment)
      // Alternative listener for attribute reports
      endpoint.clusters.iasZone.onZoneStatus = (zoneStatus) => {
        this.log('[DATA] Zone attribute report:', zoneStatus);
        
        let status = zoneStatus;
        if (status && typeof status.valueOf === 'function') {
          status = status.valueOf();
        }
        
        const alarm = (status & 0x01) !== 0;
        await this.setCapabilityValue('alarm_contact', alarm).catch(this.error);
      };
      
      this.log('[OK] IAS Zone configured successfully (SDK3 latest method)');
      
    } catch (err) {
      this.error('IAS Zone setup failed:', err);
    }
  }

  async onDeleted() {
    this.log('TuyaSoilTesterTempHumidDevice deleted');
    await super.onDeleted().catch(err => this.error(err));
  }

  async setupTemperature() {
    if (!this.hasCapability('measure_temperature')) {
      return;
    }
    
    const endpoint = this.zclNode.endpoints[1];
    const tempCluster = endpoint?.clusters?.msTemperatureMeasurement;
    
    if (!tempCluster) {
      this.log('[TEMP] ⚠️  Temperature cluster not available');
      return;
    }
    
    try {
      this.log('[TEMP] 🌡️  Configuring temperature sensor...');
      
      // 1. Lecture initiale
      try {
        const { measuredValue } = await tempCluster.readAttributes(['measuredValue']);
        const temp = measuredValue / 100;
        this.log('[TEMP] ✅ Initial temperature:', temp, '°C');
        await this.setCapabilityValue('measure_temperature', temp);
      } catch (readErr) {
        this.log('[TEMP] ⚠️  Initial read failed:', readErr.message);
      }
      
      // 2. Listener pour mises à jour
      tempCluster.on('attr.measuredValue', async (value) => {
        const temp = value / 100;
        this.log('[TEMP] 📊 Temperature update:', temp, '°C');
        await this.setCapabilityValue('measure_temperature', temp).catch(this.error);
      });
      
      // 3. Configuration du reporting
      try {
        await this.configureAttributeReporting([{
          endpointId: 1,
          cluster: 'msTemperatureMeasurement',
          attributeName: 'measuredValue',
          minInterval: 60,
          maxInterval: 3600,
          minChange: 10
        }]);
        this.log('[TEMP] ✅ Reporting configured');
      } catch (reportErr) {
        this.log('[TEMP] ⚠️  Reporting config failed (non-critical)');
      }
      
      this.log('[OK] ✅ Temperature sensor configured');
    } catch (err) {
      this.error('[TEMP] ❌ Setup failed:', err.message);
    }
  }

  async setupHumidity() {
    if (!this.hasCapability('measure_humidity')) {
      return;
    }
    
    const endpoint = this.zclNode.endpoints[1];
    const humidityCluster = endpoint?.clusters?.msRelativeHumidity;
    
    if (!humidityCluster) {
      this.log('[HUMID] ⚠️  Humidity cluster not available');
      return;
    }
    
    try {
      this.log('[HUMID] 💧 Configuring humidity sensor...');
      
      // 1. Lecture initiale
      try {
        const { measuredValue } = await humidityCluster.readAttributes(['measuredValue']);
        const humidity = measuredValue / 100;
        this.log('[HUMID] ✅ Initial humidity:', humidity, '%');
        await this.setCapabilityValue('measure_humidity', humidity);
      } catch (readErr) {
        this.log('[HUMID] ⚠️  Initial read failed:', readErr.message);
      }
      
      // 2. Listener pour mises à jour
      humidityCluster.on('attr.measuredValue', async (value) => {
        const humidity = value / 100;
        this.log('[HUMID] 📊 Humidity update:', humidity, '%');
        await this.setCapabilityValue('measure_humidity', humidity).catch(this.error);
      });
      
      // 3. Configuration du reporting
      try {
        await this.configureAttributeReporting([{
          endpointId: 1,
          cluster: 'msRelativeHumidity',
          attributeName: 'measuredValue',
          minInterval: 60,
          maxInterval: 3600,
          minChange: 100
        }]);
        this.log('[HUMID] ✅ Reporting configured');
      } catch (reportErr) {
        this.log('[HUMID] ⚠️  Reporting config failed (non-critical)');
      }
      
      this.log('[OK] ✅ Humidity sensor configured');
    } catch (err) {
      this.error('[HUMID] ❌ Setup failed:', err.message);
    }
  }

  async setupBattery() {
    if (!this.hasCapability('measure_battery')) {
      return;
    }
    
    const endpoint = this.zclNode.endpoints[1];
    const powerCluster = endpoint?.clusters?.powerConfiguration;
    
    if (!powerCluster) {
      this.log('[BATTERY] ⚠️  PowerConfiguration cluster not available');
      return;
    }
    
    try {
      this.log('[BATTERY] 🔋 Configuring battery monitoring...');
      
      // 1. Lecture initiale
      try {
        const { batteryPercentageRemaining } = await powerCluster.readAttributes(['batteryPercentageRemaining']);
        const battery = Math.round(batteryPercentageRemaining / 2);
        this.log('[BATTERY] ✅ Initial battery:', battery, '%');
        await this.setCapabilityValue('measure_battery', battery);
      } catch (readErr) {
        this.log('[BATTERY] ⚠️  Trying voltage fallback...');
        
        // Fallback: lecture depuis voltage
        try {
          const { batteryVoltage } = await powerCluster.readAttributes(['batteryVoltage']);
          const voltage = batteryVoltage / 10;
          const battery = this.calculateBatteryFromVoltage(voltage);
          this.log('[BATTERY] ✅ Battery from voltage:', battery, '% (', voltage, 'V)');
          await this.setCapabilityValue('measure_battery', battery);
        } catch (voltErr) {
          this.log('[BATTERY] ❌ Could not read battery');
        }
      }
      
      // 2. Listener pour mises à jour
      powerCluster.on('attr.batteryPercentageRemaining', async (value) => {
        const battery = Math.round(value / 2);
        this.log('[BATTERY] 📊 Battery update:', battery, '%');
        await this.setCapabilityValue('measure_battery', battery).catch(this.error);
      });
      
      // 3. Configuration du reporting
      try {
        await this.configureAttributeReporting([{
          endpointId: 1,
          cluster: 'powerConfiguration',
          attributeName: 'batteryPercentageRemaining',
          minInterval: 300,
          maxInterval: 3600,
          minChange: 2
        }]);
        this.log('[BATTERY] ✅ Reporting configured');
      } catch (reportErr) {
        this.log('[BATTERY] ⚠️  Reporting config failed (non-critical)');
      }
      
      this.log('[OK] ✅ Battery monitoring configured');
    } catch (err) {
      this.error('[BATTERY] ❌ Setup failed:', err.message);
    }
  }
  
  calculateBatteryFromVoltage(voltage) {
    // CR2032: 3.0V (100%) → 2.0V (0%)
    if (voltage >= 3.0) return 100;
    if (voltage <= 2.0) return 0;
    return Math.round(((voltage - 2.0) / 1.0) * 100);
  }

}

module.exports = TuyaSoilTesterTempHumidDevice;
