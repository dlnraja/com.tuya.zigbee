'use strict';

const { ZigBeeDevice } = require('homey-zigbeedriver');

/**
 * Tuya Smart Plug Device
 * Supports on/off control with power monitoring capabilities
 * Compatible with TS011F, TS0115, and energy monitoring plugs
 */
class TuyaSmartPlugDevice extends ZigBeeDevice {

  async onNodeInit({ zclNode }) {
    try {
      // Enable debugging for development
      this.enableDebug();
      this.printNode();
      
      this.log('Initializing Tuya Smart Plug...');

      // Register on/off capability with optimized reporting
      if (this.hasCapability('onoff')) {
        await this.registerCapability('onoff', 'genOnOff', {
          reportOpts: {
            configureAttributeReporting: {
              minInterval: 1,     // Immediate reporting
              maxInterval: 300,   // 5 minutes max
              minChange: 1,       // Any state change
            },
          },
        });
        this.log('On/Off capability registered');
      }

      // Register power measurement capability
      if (this.hasCapability('measure_power')) {
        await this.registerCapability('measure_power', 'haElectricalMeasurement', {
          reportOpts: {
            configureAttributeReporting: {
              minInterval: 10,    // 10 seconds minimum
              maxInterval: 300,   // 5 minutes maximum
              minChange: 1,       // 1W change threshold
            },
          },
        });
        this.log('Power measurement capability registered');
      }

      // Register energy meter capability
      if (this.hasCapability('meter_power')) {
        await this.registerCapability('meter_power', 'seMetering', {
          reportOpts: {
            configureAttributeReporting: {
              minInterval: 300,   // 5 minutes minimum
              maxInterval: 3600,  // 1 hour maximum
              minChange: 10,      // 0.01 kWh change
            },
          },
        });
        this.log('Energy meter capability registered');
      }

      // Add power change listener for flow triggers
      this.registerCapabilityListener('onoff', async (value) => {
        this.log('Plug state changed:', value ? 'ON' : 'OFF');
        if (value) {
          this.homey.flow.getDeviceTriggerCard('turned_on').trigger(this);
        } else {
          this.homey.flow.getDeviceTriggerCard('turned_off').trigger(this);
        }
      });

      this.log('Tuya Smart Plug successfully initialized');
    } catch (error) {
      this.error('Failed to initialize Tuya Smart Plug:', error);
      throw error;
    }
  }

  /**
   * Handle device removal cleanup
   */
  async onDeleted() {
    try {
      this.log('Tuya Smart Plug removed from Homey');
    } catch (error) {
      this.error('Error during device removal:', error);
    }
  }

}

module.exports = TuyaSmartPlugDevice;
