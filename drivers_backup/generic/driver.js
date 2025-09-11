const { ZigBeeDriver } = require('homey-zigbeedriver');

// Container driver - not meant to be used directly
class GenericContainerDriver extends ZigBeeDriver {
  async onInit() {
    this.log('Generic container driver initialized (hidden)');
  }

  async onPair(session) {
    // Redirect to appropriate sub-drivers
    throw new Error('Please use specific generic drivers (exotic_sensor or universal_fallback)');
  }
}

module.exports = GenericContainerDriver;
