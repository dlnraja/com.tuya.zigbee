#!/usr/bin/env node
'use strict';

'use strict';

const { ZigBeeDevice } = require('homey-zigbeedriver');
const { CLUSTER } = require('zigbee-clusters');

// Constants for energy monitoring
const POWER_FACTOR = 1; // Default power factor if not provided
const VOLTAGE = 230; // Default voltage (V)
const MAX_POWER = 3680; // Maximum power in Watts

class TuyaZigbeePlugDevice extends ZigBeeDevice {
  
  // Energy monitor variables
  energy = {
    power: 0, // Current power in Watts
    voltage: VOLTAGE,
    current: 0,
    powerFactor: POWER_FACTOR,
    energy: 0, // Energy in Wh
    lastUpdate: Date.now(),
  };

  async onNodeInit({ zclNode }) {
    this.log('Tuya Zigbee Plug has been initialized');

    // Register capabilities
    await this.registerCapability('onoff', CLUSTER.ON_OFF, {
      get: 'onOff',
      set: 'setOnOff',
      setParser: value => ({
        onOff: value,
        time: 0, // Immediate
        effect: 'delayed_all_off',
        effectVariant: 'fade_to_off',
      }),
      report: 'onOff',
      reportParser: value => value === 1,
      reportOpts: {
        configureAttributeReporting: {
          minInterval: 0, // No minimum reporting interval
          maxInterval: 300, // Max reporting interval in seconds (5 minutes)
          minChange: 1, // Report any change
        },
      },
    });

    // Register measure_power capability if supported
    if (this.hasCapability('measure_power') === false) {
      await this.addCapability('measure_power').catch(this.error);
    }

    // Register meter_power capability if supported
    if (this.hasCapability('meter_power') === false) {
      await this.addCapability('meter_power').catch(this.error);
    }

    // Register measure_voltage capability if supported
    if (this.hasCapability('measure_voltage') === false) {
      await this.addCapability('measure_voltage').catch(this.error);
    }

    // Register measure_current capability if supported
    if (this.hasCapability('measure_current') === false) {
      await this.addCapability('measure_current').catch(this.error);
    }

    // Configure electrical measurement cluster
    if (zclNode.endpoints[1].clusters[CLUSTER.ELECTRICAL_MEASUREMENT.NAME]) {
      this.registerCapability('measure_power', CLUSTER.ELECTRICAL_MEASUREMENT, {
        get: 'activePower',
        getOpts: {
          getOnStart: true,
        },
        report: 'activePower',
        reportParser: value => {
          // Convert from 0.1W to W
          const power = value / 10;
          this.energy.power = power;
          this.updateEnergy();
          return power;
        },
        reportOpts: {
          configureAttributeReporting: {
            minInterval: 0,
            maxInterval: 300, // 5 minutes
            minChange: 5, // 0.5W
          },
        },
      });

      // Register for voltage measurement
      this.registerCapability('measure_voltage', CLUSTER.ELECTRICAL_MEASUREMENT, {
        get: 'rmsVoltage',
        getOpts: {
          getOnStart: true,
        },
        report: 'rmsVoltage',
        reportParser: value => {
          // Convert from V to V (already in correct unit)
          this.energy.voltage = value;
          this.updatePowerFactor();
          return value;
        },
        reportOpts: {
          configureAttributeReporting: {
            minInterval: 0,
            maxInterval: 300, // 5 minutes
            minChange: 1, // 1V
          },
        },
      });

      // Register for current measurement
      this.registerCapability('measure_current', CLUSTER.ELECTRICAL_MEASUREMENT, {
        get: 'rmsCurrent',
        getOpts: {
          getOnStart: true,
        },
        report: 'rmsCurrent',
        reportParser: value => {
          // Convert from 0.001kA to A
          const current = value * 1000;
          this.energy.current = current;
          this.updatePowerFactor();
          return current;
        },
        reportOpts: {
          configureAttributeReporting: {
            minInterval: 0,
            maxInterval: 300, // 5 minutes
            minChange: 10, // 0.01A
          },
        },
      });
    }

    // Configure metering cluster if available
    if (zclNode.endpoints[1].clusters[CLUSTER.METERING.NAME]) {
      this.registerCapability('meter_power', CLUSTER.METERING, {
        get: 'currentSummationDelivered',
        getOpts: {
          getOnStart: true,
        },
        report: 'currentSummationDelivered',
        reportParser: value => {
          // Convert from 0.001kWh to kWh
          return value / 1000;
        },
        reportOpts: {
          configureAttributeReporting: {
            minInterval: 0,
            maxInterval: 3600, // 1 hour
            minChange: 1, // 0.001kWh
          },
        },
      });
    }

    // Handle incoming reports
    zclNode.endpoints[1].clusters[CLUSTER.ON_OFF.NAME]
      .on('attr.onOff', this.onOnOffAttributeReport.bind(this));

    // Set up energy monitoring interval
    this.energyMonitorInterval = setInterval(() => {
      this.updateEnergy();
    }, 60000); // Update every minute

    // Enable debugging
    this.enableDebug();
    this.printNode();
  }

  /**
   * Update the power factor based on current, voltage and power
   */
  updatePowerFactor() {
    if (this.energy.current > 0 && this.energy.voltage > 0) {
      const apparentPower = this.energy.voltage * this.energy.current;
      if (apparentPower > 0) {
        this.energy.powerFactor = Math.min(1, this.energy.power / apparentPower);
      }
    }
  }

  /**
   * Update energy consumption based on power and time
   */
  updateEnergy() {
    const now = Date.now();
    const timeDiff = (now - this.energy.lastUpdate) / 3600000; // Convert ms to hours
    
    // Only update if time has passed and device is on
    if (timeDiff > 0 && this.getCapabilityValue('onoff')) {
      // Calculate energy in Wh
      const energyIncrement = this.energy.power * timeDiff;
      this.energy.energy += energyIncrement;
      
      // Update meter_power capability if supported
      if (this.hasCapability('meter_power')) {
        const currentEnergy = this.getCapabilityValue('meter_power') || 0;
        this.setCapabilityValue('meter_power', currentEnergy + (energyIncrement / 1000)) // Convert to kWh
          .catch(this.error);
      }
      
      this.energy.lastUpdate = now;
      this.log(`Energy update: +${energyIncrement.toFixed(2)}Wh (Total: ${this.energy.energy.toFixed(2)}Wh)`);
    }
  }

  /**
   * Handle on/off attribute reports from the device
   */
  onOnOffAttributeReport(value) {
    this.log('Received on/off report:', value);
    const isOn = value === 1;
    
    // If turning off, update energy before changing state
    if (!isOn && this.getCapabilityValue('onoff')) {
      this.updateEnergy();
    }
    
    // Update the onoff capability
    this.setCapabilityValue('onoff', isOn).catch(this.error);
    
    // If turning on, update lastUpdate time
    if (isOn) {
      this.energy.lastUpdate = Date.now();
    }
  }

  async onSettings({ oldSettings, newSettings, changedKeys }) {
    this.log('Settings changed:', changedKeys);
    // Handle settings changes if needed
  }

  onDeleted() {
    this.log('Device removed');
  }
}

module.exports = TuyaZigbeePlugDevice;
