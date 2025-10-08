
class Cluster {
  constructor(id) {
    this.id = id;
    this.attributes = new Map();
    this.commands = new Map();
  }

  readAttributes(attributes) {
    const result = {};
    for (const attr of attributes) {
      result[attr] = Math.random() * 100; // Mock values
    }
    return Promise.resolve(result);
  }

  writeAttributes(attributes) {
    for (const [key, value] of Object.entries(attributes)) {
      this.attributes.set(key, value);
    }
    return Promise.resolve();
  }

  executeCommand(command, args = {}) {
    return Promise.resolve({ success: true, command, args });
  }
}

const CLUSTERS = {
  BASIC: new Cluster('basic'),
  ON_OFF: new Cluster('onOff'),
  LEVEL_CONTROL: new Cluster('levelControl'),
  COLOR_CONTROL: new Cluster('colorControl'),
  THERMOSTAT: new Cluster('thermostat'),
  DOOR_LOCK: new Cluster('doorLock'),
  WINDOW_COVERING: new Cluster('windowCovering'),
  ELECTRICAL_MEASUREMENT: new Cluster('electricalMeasurement'),
  METERING: new Cluster('metering'),
  TEMPERATURE_MEASUREMENT: new Cluster('temperatureMeasurement'),
  RELATIVE_HUMIDITY_MEASUREMENT: new Cluster('relativeHumidityMeasurement'),
  OCCUPANCY_SENSING: new Cluster('occupancySensing'),
  ILLUMINANCE_MEASUREMENT: new Cluster('illuminanceMeasurement')
};

module.exports = {
  Cluster,
  CLUSTERS,
  ...CLUSTERS
};
