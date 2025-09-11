// Placeholder for temperature sensor driver

class TemperatureDriver extends Homey.Driver {
  async onInit() {
    this.log('Tuya Temperature Driver initialized');
  }

  async onPairListDevices() {
    return [
      {
        name: 'Tuya Temperature Sensor',
        data: {
          id: this.homey.uuid.generate(),
        },
    ];
  }

module.exports = TemperatureDriver;
