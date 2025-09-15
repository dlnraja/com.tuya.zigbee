class XiaomiTemperatureDriver extends Homey.Driver {
  async onInit() {
    this.log('Xiaomi Temperature Driver initialized');
  }

  async onPairListDevices() {
    return [
      {
        name: 'Xiaomi Temperature Sensor',
        data: {
          id: this.homey.uuid.generate(),
        },
    ];
  }

module.exports = XiaomiTemperatureDriver;
