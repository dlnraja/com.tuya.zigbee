// Universal Device Template
class UniversalDevice {
  constructor(driver, device) {
    this.driver = driver;
    this.device = device;
  }

  // Standard methods
  onAdded() {
    this.log('Device added');
  }

  onSettings(oldSettings, newSettings, changedKeys) {
    // Handle settings changes
  }
}

module.exports = UniversalDevice;
