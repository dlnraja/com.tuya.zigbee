class PhilipsHueBulbDevice extends BaseZigbeeDevice.Device {
  async onInit() {
    this.log('Philips Hue Bulb initialized');
    this.registerCapabilityListener('onoff', this.onCapabilityOnoff.bind(this));
    this.registerCapabilityListener('dim', this.onCapabilityDim.bind(this));
  }

  async onCapabilityOnoff(value, opts) {
    this.log('Light state changed to:', value);
  }

  async onCapabilityDim(value, opts) {
    this.log('Light dim level changed to:', value);
  }
}

module.exports = PhilipsHueBulbDevice;
