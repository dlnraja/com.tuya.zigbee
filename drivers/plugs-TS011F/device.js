'use strict';

const Homey = require('homey');

class TuyaTS011FDevice extends Homey.Device {
  
  async onInit() {
    this.log('Tuya TS011F device initialized');
    
    // Register capabilities
    this.registerCapability('onoff', 'BASIC', {
      get: 'on',
      set: 'on',
      setParser: this.setParserOnOff,
      reportParser: this.reportParserOnOff,
      report: 'on',
    });
    
    this.registerCapability('measure_power', 'METERING', {
      get: 'instantaneousDemand',
      report: 'instantaneousDemand',
      reportParser: this.reportParserPower,
    });
    
    // Set up polling for power measurements
    this._pollMeasurements();
  }
  
  // Parser for on/off state
  setParserOnOff(value) {
    return {
      value: value ? 1 : 0,
    };
  }
  
  reportParserOnOff(report) {
    return report['value'] === 1;
  }
  
  // Parser for power measurement
  reportParserPower(value) {
    // Convert from W to kW if needed
    return value / 1000;
  }
  
  // Method to poll for measurements
  _pollMeasurements() {
    this._measurementInterval = setInterval(() => {
      this.getClusterCapabilityValue('measure_power', 'METERING', 'instantaneousDemand')
        .catch(err => this.error('Error getting power measurement:', err));
    }, 10000); // Poll every 10 seconds
  }
  
  onDeleted() {
    if (this._measurementInterval) {
      clearInterval(this._measurementInterval);
    }
  }
}

module.exports = TuyaTS011FDevice;
