class IKEATemperatureDriver extends Homey.Driver {
  async onInit() {
    this.log('IKEA Temperature Driver initialized');
  }

  async onPairListDevices() {
    return [
      {
        name: 'IKEA Temperature Sensor',
        data: {
          id: this.homey.uuid.generate(),
        },
    ];
  }

module.exports = IKEATemperatureDriver;
