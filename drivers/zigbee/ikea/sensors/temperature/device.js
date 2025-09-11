class IKEATemperatureDevice extends BaseZigbeeDevice.Device {
  async onInit() {
    this.log('IKEA Temperature Sensor initialized');
    this.registerCapabilityListener('measure_temperature', this.onCapabilityMeasureTemperature.bind(this));
  }

  async onCapabilityMeasureTemperature(value, opts) {
    this.log('Temperature measurement updated:', value);
  }

module.exports = IKEATemperatureDevice;
