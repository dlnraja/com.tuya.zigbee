class PhilipsHueBulbDriver extends Homey.Driver {
  async onInit() {
    this.log('Philips Hue Bulb Driver initialized');
  }

  async onPairListDevices() {
    return [
      {
        name: 'Philips Hue Bulb',
        data: {
          id: this.homey.uuid.generate(),
        },
      },
    ];
  }
}

module.exports = PhilipsHueBulbDriver;
