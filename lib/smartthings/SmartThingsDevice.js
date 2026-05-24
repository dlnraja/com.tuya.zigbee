'use strict';

const Homey = require('homey');
const SmartThingsClient = require('./SmartThingsClient');

class SmartThingsDevice extends Homey.Device {
  async onInit() {
    this.log(`[SmartThingsDevice] Init: ${this.getName()} (${this.getData().id})`);
    
    const store = this.getStore();
    if (!store.pat) {
      this.error('No Personal Access Token (PAT) found in device store.');
      this.setUnavailable('Missing authentication token');
      return;
    }

    this._client = new SmartThingsClient(store.pat);
    this._stDeviceId = this.getData().id;

    // Register capability listeners
    this._registerListeners();

    // Start polling status (since Webhooks require a public URL, polling is the standalone fallback)
    this._pollInterval = this.homey.setInterval(() => this._pollStatus(), 30000); // 30s
    
    // Initial fetch
    this._pollStatus();
  }

  onDeleted() {
    this.log(`[SmartThingsDevice] Deleted`);
    if (this._pollInterval) {
      this.homey.clearInterval(this._pollInterval);
    }
  }

  _registerListeners() {
    if (this.hasCapability('onoff')) {
      this.registerCapabilityListener('onoff', async (value) => {
        try {
          await this._client.executeCommand(
            this._stDeviceId, 
            'switch', 
            value ? 'on' : 'off'
          );
        } catch (err) {
          this.error('Error setting onoff:', err.message);
          throw err;
        }
      });
    }

    if (this.hasCapability('dim')) {
      this.registerCapabilityListener('dim', async (value) => {
        try {
          const level = Math.round(value * 100);
          await this._client.executeCommand(
            this._stDeviceId, 
            'switchLevel', 
            'setLevel',
            [level]
          );
        } catch (err) {
          this.error('Error setting dim:', err.message);
          throw err;
        }
      });
    }
  }

  async _pollStatus() {
    try {
      const status = await this._client.getDeviceStatus(this._stDeviceId);
      
      // Update capabilities based on components/main
      if (status && status.components && status.components.main) {
        const main = status.components.main;

        // Switch (onoff)
        if (this.hasCapability('onoff') && main.switch && main.switch.switch) {
          const isOn = main.switch.switch.value === 'on';
          if (this.getCapabilityValue('onoff') !== isOn) {
            this.setCapabilityValue('onoff', isOn).catch(this.error);
          }
        }

        // Dim (level)
        if (this.hasCapability('dim') && main.switchLevel && main.switchLevel.level) {
          const level = main.switchLevel.level.value / 100.0;
          if (this.getCapabilityValue('dim') !== level) {
            this.setCapabilityValue('dim', level).catch(this.error);
          }
        }

        // Temperature
        if (this.hasCapability('measure_temperature') && main.temperatureMeasurement && main.temperatureMeasurement.temperature) {
          const temp = main.temperatureMeasurement.temperature.value;
          if (this.getCapabilityValue('measure_temperature') !== temp) {
            this.setCapabilityValue('measure_temperature', temp).catch(this.error);
          }
        }

        // Humidity
        if (this.hasCapability('measure_humidity') && main.relativeHumidityMeasurement && main.relativeHumidityMeasurement.humidity) {
          const hum = main.relativeHumidityMeasurement.humidity.value;
          if (this.getCapabilityValue('measure_humidity') !== hum) {
            this.setCapabilityValue('measure_humidity', hum).catch(this.error);
          }
        }
      }

      this.setAvailable().catch(this.error);
    } catch (err) {
      this.error('Poll failed:', err.message);
      this.setUnavailable(`Offline: ${err.message}`).catch(this.error);
    }
  }
}

module.exports = SmartThingsDevice;
