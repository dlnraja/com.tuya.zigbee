class BoschThermostatDriver extends Homey.Driver {
  async onInit() {
    this.log('Bosch Thermostat Driver initialized');
  }

  async onPairListDevices() {
    return [
      {
        name: 'Bosch Thermostat',
        data: {
          id: this.homey.uuid.generate(),
        },
      },
    ];
  }
}

module.exports = BoschThermostatDriver;
