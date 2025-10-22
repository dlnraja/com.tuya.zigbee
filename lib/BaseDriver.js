// BaseDriver.js
class BaseDriver {
  constructor(deviceConfig) {
    this.deviceConfig = deviceConfig;
  }

  async onNodeInit({ zclNode }) {
    // Common initialization logic
  }

  // Other common methods and properties
}

module.exports = BaseDriver;