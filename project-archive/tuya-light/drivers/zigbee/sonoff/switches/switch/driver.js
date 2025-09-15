class SonoffSwitchDriver extends Homey.Driver {
  async onInit() {
    this.log('Sonoff Switch Driver initialized');
  }

  async onPairListDevices() {
    return [
      {
        name: 'Sonoff Switch',
        data: {
          id: this.homey.uuid.generate(),
        },
      },
    ];
  }
}

module.exports = SonoffSwitchDriver;
