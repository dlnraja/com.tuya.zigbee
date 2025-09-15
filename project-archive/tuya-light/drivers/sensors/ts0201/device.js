const BaseZigbeeDevice = require('../../common/BaseZigbeeDevice');
const { CLUSTER } = require('zigbee-clusters');

class TS0201Sensor extends BaseZigbeeDevice {
  /**
   * Register device capabilities
   */
  async registerCapabilities() {
    // Temperature measurement (in °C)
    this.registerCapability('measure_temperature', CLUSTER.TEMPERATURE_MEASUREMENT, {
      get: 'measuredValue',
      report: 'measuredValue',
      reportParser: value => {
        // Convert from 0.01°C to 1°C steps
        const temp = value / 100;
        this.log('Temperature report:', temp, '°C');
        return temp;
      },
      reportConfig: {
        minInterval: 0,      // No minimum reporting interval
        maxInterval: 300,    // 5 minutes
        minChange: 10,       // Report if changed by 0.1°C
      },
    });

    // Humidity measurement (in %)
    this.registerCapability('measure_humidity', CLUSTER.RELATIVE_HUMIDITY_MEASUREMENT, {
      get: 'measuredValue',
      report: 'measuredValue',
      reportParser: value => {
        // Convert from 0.01% to 1% steps
        const humidity = value / 100;
        this.log('Humidity report:', humidity, '%');
        return humidity;
      },
      reportConfig: {
        minInterval: 0,      // No minimum reporting interval
        maxInterval: 300,    // 5 minutes
        minChange: 10,       // Report if changed by 1%
      },
    });

    // Battery percentage
    this.registerCapability('measure_battery', CLUSTER.POWER_CONFIGURATION, {
      get: 'batteryPercentageRemaining',
      report: 'batteryPercentageRemaining',
      reportParser: value => {
        // Convert from 0-200 to 0-100%
        const battery = value / 2;
        this.log('Battery report:', battery, '%');
        return battery;
      },
      reportConfig: {
        minInterval: 0,      // No minimum reporting interval
        maxInterval: 3600,   // 1 hour
        minChange: 5,        // Report if changed by 5%
      },
    });
  }

  /**
   * Configure device reporting
   */
  async configureReporting() {
    // Configure temperature reporting
    await this.configureReportingForCapability('measure_temperature', CLUSTER.TEMPERATURE_MEASUREMENT, {
      report: 'measuredValue',
      reportParser: value => value / 100, // Convert to °C
    });

    // Configure humidity reporting
    await this.configureReportingForCapability('measure_humidity', CLUSTER.RELATIVE_HUMIDITY_MEASUREMENT, {
      report: 'measuredValue',
      reportParser: value => value / 100, // Convert to %
    });

    // Configure battery reporting
    await this.configureReportingForCapability('measure_battery', CLUSTER.POWER_CONFIGURATION, {
      report: 'batteryPercentageRemaining',
      reportParser: value => value / 2, // Convert to 0-100%
    });
  }

  /**
   * Additional device initialization
   */
  async initializeDevice() {
    // Set default polling intervals
    this.registerPolling({
      get: 'measure_temperature',
      fn: this.readTemperature.bind(this),
      interval: 300, // 5 minutes
      wait: null
    });

    this.registerPolling({
      get: 'measure_humidity',
      fn: this.readHumidity.bind(this),
      interval: 300, // 5 minutes
      wait: null
    });

    this.registerPolling({
      get: 'measure_battery',
      fn: this.readBattery.bind(this),
      interval: 3600, // 1 hour
      wait: null
    });
  }

  /**
   * Read temperature manually
   */
  async readTemperature() {
    try {
      const result = await this.safeReadAttributes(
        CLUSTER.TEMPERATURE_MEASUREMENT,
        ['measuredValue']
      );
      
      if (result && result.measuredValue !== undefined) {
        const temp = result.measuredValue / 100; // Convert to °C
        this.setCapabilityValue('measure_temperature', temp);
        return temp;
      }
    } catch (error) {
      this.error('Failed to read temperature:', error);
      throw error;
    }
  }

  /**
   * Read humidity manually
   */
  async readHumidity() {
    try {
      const result = await this.safeReadAttributes(
        CLUSTER.RELATIVE_HUMIDITY_MEASUREMENT,
        ['measuredValue']
      );
      
      if (result && result.measuredValue !== undefined) {
        const humidity = result.measuredValue / 100; // Convert to %
        this.setCapabilityValue('measure_humidity', humidity);
        return humidity;
      }
    } catch (error) {
      this.error('Failed to read humidity:', error);
      throw error;
    }
  }

  /**
   * Read battery level manually
   */
  async readBattery() {
    try {
      const result = await this.safeReadAttributes(
        CLUSTER.POWER_CONFIGURATION,
        ['batteryPercentageRemaining']
      );
      
      if (result && result.batteryPercentageRemaining !== undefined) {
        const battery = result.batteryPercentageRemaining / 2; // Convert to 0-100%
        this.setCapabilityValue('measure_battery', battery);
        return battery;
      }
    } catch (error) {
      this.error('Failed to read battery level:', error);
      throw error;
    }
  }
}

module.exports = TS0201Sensor;
