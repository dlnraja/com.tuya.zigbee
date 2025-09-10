#!/usr/bin/env node
'use strict';

'use strict';

const { ZigbeeDevice } = require('homey-meshdriver');
const TuyaDpMapper = require('../../../lib/tuya');

class TuyaSensorTempHumTS0201 extends ZigbeeDevice {

  async onNodeInit({ zclNode }) {
    // Initialize Tuya DP mapper
    this.tuyaMapper = new TuyaDpMapper();
    
    // Configure settings
    this.tuyaDpLog = this.getSetting('tuya_dp_log') || false;
    this.tempOffset = this.getSetting('temp_offset') || 0;
    this.humidityOffset = this.getSetting('humidity_offset') || 0;
    this.updateInterval = this.getSetting('update_interval') || 5;
    
    // Discover endpoints safely
    await this.discoverEndpointsSafe(zclNode);
    
    // Setup sensor listeners
    this.setupSensorListeners();
    
    // Initial read
    await this._initialReadSafe();
    
    // Setup periodic updates
    this.setupPeriodicUpdates();
    
    // Log initialization
    this.log('Tuya Sensor Temp/Hum TS0201 initialized successfully');
  }

  setupSensorListeners() {
    // Listen for temperature changes
    this.registerCapabilityListener('measure_temperature', async (value) => {
      await this._updateTemperature(value);
    });

    // Listen for humidity changes
    this.registerCapabilityListener('measure_humidity', async (value) => {
      await this._updateHumidity(value);
    });

    // Listen for battery changes
    this.registerCapabilityListener('measure_battery', async (value) => {
      await this._updateBattery(value);
    });
  }

  async _updateTemperature(temperature) {
    try {
      // Apply offset
      const adjustedTemp = temperature + this.tempOffset;
      
      // Update capability
      await this.setCapabilityValue('measure_temperature', adjustedTemp);
      
      // Trigger flow
      this.triggerFlow('temperature_changed', { temperature: adjustedTemp });
      
      if (this.tuyaDpLog) {
        this.log(`Temperature updated: ${adjustedTemp}°C (raw: ${temperature}°C, offset: ${this.tempOffset}°C)`);
      }
      
    } catch (error) {
      this.error('Failed to update temperature:', error);
    }
  }

  async _updateHumidity(humidity) {
    try {
      // Apply offset
      const adjustedHumidity = humidity + this.humidityOffset;
      
      // Clamp to valid range
      const clampedHumidity = Math.max(0, Math.min(100, adjustedHumidity));
      
      // Update capability
      await this.setCapabilityValue('measure_humidity', clampedHumidity);
      
      // Trigger flow
      this.triggerFlow('humidity_changed', { humidity: clampedHumidity });
      
      if (this.tuyaDpLog) {
        this.log(`Humidity updated: ${clampedHumidity}% (raw: ${humidity}%, offset: ${this.humidityOffset}%)`);
      }
      
    } catch (error) {
      this.error('Failed to update humidity:', error);
    }
  }

  async _updateBattery(battery) {
    try {
      // Update capability
      await this.setCapabilityValue('measure_battery', battery);
      
      // Check if battery is low
      if (battery <= 20) {
        this.triggerFlow('battery_low', { battery: battery });
        this.log(`Battery low: ${battery}%`);
      }
      
      if (this.tuyaDpLog) {
        this.log(`Battery updated: ${battery}%`);
      }
      
    } catch (error) {
      this.error('Failed to update battery:', error);
    }
  }

  async _onTuyaReport(data) {
    try {
      const { dpId, value } = data;
      
      if (this.tuyaDpLog) {
        this.log(`Tuya report: DP${dpId} = ${value}`);
      }
      
      // Handle different DPs
      await this._handleTuyaDp(dpId, value);
      
    } catch (error) {
      this.error('Error handling Tuya report:', error);
    }
  }

  async _handleTuyaDp(dpId, value) {
    try {
      // Map Tuya DP to capability
      const mapping = this.tuyaMapper.mapTuyaDpToCapability(dpId, 'sensor');
      
      if (mapping) {
        const { capability, transform } = mapping;
        
        // Transform value if needed
        let transformedValue = value;
        if (transform) {
          transformedValue = transform(value);
        }
        
        // Update appropriate capability
        if (capability === 'measure_temperature') {
          await this._updateTemperature(transformedValue);
        } else if (capability === 'measure_humidity') {
          await this._updateHumidity(transformedValue);
        } else if (capability === 'measure_battery') {
          await this._updateBattery(transformedValue);
        }
        
        if (this.tuyaDpLog) {
          this.log(`Updated ${capability} to ${transformedValue} from DP${dpId}`);
        }
      }
      
    } catch (error) {
      this.error(`Error handling DP${dpId}:`, error);
    }
  }

  async discoverEndpointsSafe(zclNode) {
    try {
      const endpoints = await zclNode.endpoints;
      this.log(`Discovered ${endpoints.length} endpoints`);
      
      // Find sensor clusters
      for (const endpoint of endpoints) {
        const clusters = await endpoint.clusters;
        if (clusters.msTemperatureMeasurement) {
          this.tempEndpoint = endpoint;
          this.log('Found temperature cluster on endpoint', endpoint.id);
        }
        if (clusters.msRelativeHumidity) {
          this.humidityEndpoint = endpoint;
          this.log('Found humidity cluster on endpoint', endpoint.id);
        }
        if (clusters.genPowerCfg) {
          this.batteryEndpoint = endpoint;
          this.log('Found battery cluster on endpoint', endpoint.id);
        }
      }
      
    } catch (error) {
      this.error('Error discovering endpoints:', error);
    }
  }

  async getTempCluster() {
    if (this.tempEndpoint) {
      return this.tempEndpoint.clusters.msTemperatureMeasurement;
    }
    return null;
  }

  async getHumidityCluster() {
    if (this.humidityEndpoint) {
      return this.humidityEndpoint.clusters.msRelativeHumidity;
    }
    return null;
  }

  async getBatteryCluster() {
    if (this.batteryEndpoint) {
      return this.batteryEndpoint.clusters.genPowerCfg;
    }
    return null;
  }

  async _initialReadSafe() {
    try {
      // Read initial temperature if available
      const tempCluster = await this.getTempCluster();
      if (tempCluster) {
        const temp = await tempCluster.read('measuredValue');
        if (temp && temp.value !== undefined) {
          const temperature = temp.value / 100; // Convert from 0.01°C units
          await this._updateTemperature(temperature);
          this.log(`Initial temperature: ${temperature}°C`);
        }
      }
      
      // Read initial humidity if available
      const humidityCluster = await this.getHumidityCluster();
      if (humidityCluster) {
        const hum = await humidityCluster.read('measuredValue');
        if (hum && hum.value !== undefined) {
          const humidity = hum.value / 100; // Convert from 0.01% units
          await this._updateHumidity(humidity);
          this.log(`Initial humidity: ${humidity}%`);
        }
      }
      
      // Read initial battery if available
      const batteryCluster = await this.getBatteryCluster();
      if (batteryCluster) {
        const bat = await batteryCluster.read('batteryPercentageRemaining');
        if (bat && bat.value !== undefined) {
          await this._updateBattery(bat.value);
          this.log(`Initial battery: ${bat.value}%`);
        }
      }
      
    } catch (error) {
      this.log('Could not read initial sensor values:', error.message);
    }
  }

  setupPeriodicUpdates() {
    // Convert minutes to milliseconds
    const intervalMs = this.updateInterval * 60 * 1000;
    
    this.updateTimer = setInterval(async () => {
      try {
        await this._readAllSensors();
      } catch (error) {
        this.error('Error during periodic sensor read:', error);
      }
    }, intervalMs);
    
    this.log(`Periodic updates set to ${this.updateInterval} minutes`);
  }

  async _readAllSensors() {
    try {
      // Read temperature
      const tempCluster = await this.getTempCluster();
      if (tempCluster) {
        const temp = await tempCluster.read('measuredValue');
        if (temp && temp.value !== undefined) {
          const temperature = temp.value / 100;
          await this._updateTemperature(temperature);
        }
      }
      
      // Read humidity
      const humidityCluster = await this.getHumidityCluster();
      if (humidityCluster) {
        const hum = await humidityCluster.read('measuredValue');
        if (hum && hum.value !== undefined) {
          const humidity = hum.value / 100;
          await this._updateHumidity(humidity);
        }
      }
      
      // Read battery
      const batteryCluster = await this.getBatteryCluster();
      if (batteryCluster) {
        const bat = await batteryCluster.read('batteryPercentageRemaining');
        if (bat && bat.value !== undefined) {
          await this._updateBattery(bat.value);
        }
      }
      
    } catch (error) {
      this.error('Error reading all sensors:', error);
    }
  }

  async onSettingsChanged(oldSettings, newSettings) {
    this.tuyaDpLog = newSettings.tuya_dp_log || false;
    this.tempOffset = newSettings.temp_offset || 0;
    this.humidityOffset = newSettings.humidity_offset || 0;
    this.updateInterval = newSettings.update_interval || 5;
    
    // Restart periodic updates with new interval
    if (this.updateTimer) {
      clearInterval(this.updateTimer);
    }
    this.setupPeriodicUpdates();
    
    this.log('Settings updated:', { 
      tuyaDpLog: this.tuyaDpLog, 
      tempOffset: this.tempOffset, 
      humidityOffset: this.humidityOffset, 
      updateInterval: this.updateInterval 
    });
  }

  async onFlowAction_tuya_dp_send(args) {
    try {
      const { dp_id, value } = args;
      
      await this.tuyaMapper.sendTuyaDp(this, dp_id, value, {
        debounce: false,
        retry: 1
      });
      
      this.log(`Sent custom Tuya DP${dp_id} = ${value}`);
      
    } catch (error) {
      this.error('Failed to send custom Tuya DP:', error);
      throw error;
    }
  }

  onDeleted() {
    if (this.updateTimer) {
      clearInterval(this.updateTimer);
    }
    this.log('Tuya Sensor Temp/Hum TS0201 deleted');
  }
}

module.exports = TuyaSensorTempHumTS0201;
