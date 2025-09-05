class BoschThermostatDevice extends Homey.Device {
  async onInit() {
    this.log('Bosch Thermostat initialized');
    this.registerCapabilityListener('measure_temperature', this.onCapabilityMeasureTemperature.bind(this));
    this.registerCapabilityListener('target_temperature', this.onCapabilityTargetTemperature.bind(this));
  }

  async onCapabilityMeasureTemperature(value, opts) {
    this.log('Current temperature:', value);
  }

  async onCapabilityTargetTemperature(value, opts) {
    this.log('Target temperature set to:', value);
  }
}

module.exports = BoschThermostatDevice;
